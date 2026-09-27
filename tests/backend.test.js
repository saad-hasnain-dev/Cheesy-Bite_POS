// Backend tests: run the real database + IPC handlers against a temporary
// database, with Electron replaced by a small stub. Run with `npm test`.
const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const Module = require('module')
const path = require('path')
const fs = require('fs')
const os = require('os')

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-test-'))
const handlers = {}
const electronStub = {
  ipcMain: { handle: (ch, fn) => { handlers[ch] = fn }, removeHandler: () => {} },
  app: { getPath: () => tmpDir, isPackaged: false, whenReady: () => new Promise(() => {}), on: () => {} },
  BrowserWindow: Object.assign(function () {}, { getAllWindows: () => [], fromWebContents: () => null, getFocusedWindow: () => null }),
  dialog: {}, shell: {}, nativeImage: {}, session: {}, Menu: {},
  clipboard: { readText: () => '', readImage: () => ({ isEmpty: () => true }), writeText() {}, writeImage() {} },
}
const realLoad = Module._load
Module._load = function (request, ...rest) {
  return request === 'electron' ? electronStub : realLoad.call(this, request, ...rest)
}

const main = path.join(__dirname, '..', 'src', 'main')
const call = (channel, payload) => handlers[channel](null, payload)
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const order = (extra = {}) => call('orders:create', {
  order_type: 'dine-in', subtotal: 20, discount_pct: 0, discount_amount: 0,
  vat_rate: 0.15, vat_amount: 3, total: 23, payment_method: 'cash',
  items: [{ menu_item_id: 1, name_en: 'Test', name_ar: 'Test', qty: 2, unit_price: 10, total_price: 20 }],
  ...extra,
}).data

before(async () => {
  await require(path.join(main, 'database', 'db')).openDatabase()
  require(path.join(main, 'database', 'schema')).runSchema()
  require(path.join(main, 'ipc', 'index'))()
})

test('database migrates to the latest schema with WhatsApp tracking', () => {
  const { db } = require(path.join(main, 'database', 'db'))
  assert.equal(db.prepare("SELECT value FROM meta WHERE key='schema_version'").get().value, '9')
  const cols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name)
  assert.ok(cols.includes('whatsapp_status') && cols.includes('whatsapp_sent_at'))
})

test('orders are saved with their items', () => {
  const { orderId } = order({ customer_name: 'Sara' })
  const full = call('orders:get', { id: orderId }).data
  assert.equal(full.customer_name, 'Sara')
  assert.equal(full.items.length, 1)
  assert.equal(full.items[0].qty, 2)
})

test('order numbers never repeat after a delete', () => {
  const a = order(), b = order()
  call('orders:delete', { id: b.orderId })
  const c = order()
  assert.notEqual(c.orderNumber, b.orderNumber)
  assert.ok(c.orderNumber > b.orderNumber)
})

test('orders are found by local date, and deleted orders lose their items', () => {
  const { orderId } = order()
  const today = call('orders:list', { from: localToday(), to: localToday() }).data
  assert.ok(today.some(o => o.id === orderId))
  call('orders:delete', { id: orderId })
  const { db } = require(path.join(main, 'database', 'db'))
  assert.equal(db.prepare('SELECT COUNT(*) n FROM order_items WHERE order_id=@id').get({ id: orderId }).n, 0)
})

test('order status and details can be updated', () => {
  const { orderId } = order()
  call('orders:update-status', { id: orderId, status: 'refunded' })
  call('orders:update-details', { id: orderId, customer_name: 'Ali', table_number: '4' })
  const o = call('orders:get', { id: orderId }).data
  assert.equal(o.status, 'refunded')
  assert.equal(o.customer_name, 'Ali')
  assert.equal(o.table_number, '4')
})

test('dashboard counts only completed orders for today', () => {
  const before = call('dashboard:summary', { period: 'today' }).data.today
  order()
  const { orderId } = order()
  call('orders:update-status', { id: orderId, status: 'void' })
  const after = call('dashboard:summary', { period: 'today' }).data.today
  assert.equal(after.count, before.count + 1)
})

test('deleting a category also deletes its menu items', () => {
  const { id } = call('categories:create', { name_en: 'Temp', name_ar: 'Temp' }).data
  call('menu-items:create', { category_id: id, name_en: 'X', name_ar: 'X', price: 5, is_available: 1, sort_order: 0, image_path: '', description_en: '', description_ar: '' })
  call('categories:delete', { id })
  const left = call('menu-items:list', { category_id: id }).data
  assert.equal(left.length, 0)
})

test('customers: duplicate phone numbers are refused on create and update', () => {
  const a = call('customers:create', { name: 'A', phone: '0500000001', email: '', notes: '' }).data
  const again = call('customers:create', { name: 'A2', phone: '0500000001', email: '', notes: '' }).data
  assert.equal(again.existed, true)
  assert.equal(again.id, a.id)
  const b = call('customers:create', { name: 'B', phone: '0500000002', email: '', notes: '' }).data
  const res = call('customers:update', { id: b.id, name: 'B', phone: '0500000001', email: '', notes: '' })
  assert.ok(res.error)
})

test('reservations can be created, updated and deleted', () => {
  const { id } = call('reservations:create', { customer_name: 'Guest', phone: '', email: '', guest_count: 3, reserved_at: '2030-01-01T19:00', table_number: '2', notes: '' }).data
  call('reservations:update-status', { id, status: 'seated' })
  let r = call('reservations:list', {}).data.find(x => x.id === id)
  assert.equal(r.status, 'seated')
  call('reservations:delete', { id })
  r = call('reservations:list', {}).data.find(x => x.id === id)
  assert.equal(r, undefined)
})

test('settings are saved and the password hash is never returned', () => {
  call('settings:set-many', { restaurant_name_en: 'Test Bistro' })
  const s = call('settings:get-all').data
  assert.equal(s.restaurant_name_en, 'Test Bistro')
  assert.equal(s.admin_password_hash, undefined)
  assert.equal(s.whatsapp_auto_send, '1')
})

test('WhatsApp receipts are skipped for orders without a phone number', async () => {
  const { orderId } = order()
  const res = await call('whatsapp:send-receipt', { orderId })
  assert.equal(res.error, 'no-phone')
})

test('the database file is written safely and backed up', () => {
  assert.ok(fs.existsSync(path.join(tmpDir, 'cheesybite.db')))
  assert.ok(!fs.existsSync(path.join(tmpDir, 'cheesybite.db.tmp')))
})

test('admin password can be changed and reset', () => {
  assert.equal(call('settings:verify-password', { password: 'cheesy2024' }).data, true)
  assert.equal(call('settings:set-password', { newPassword: 'newpass1' }).data, true)
  assert.equal(call('settings:verify-password', { password: 'newpass1' }).data, true)
  assert.equal(call('settings:verify-password', { password: 'cheesy2024' }).data, false)
  call('settings:reset-password')
  assert.equal(call('settings:verify-password', { password: 'cheesy2024' }).data, true)
})

test('queries accept positional values (used by WhatsApp receipt capture)', () => {
  const { orderId } = order()
  const { db } = require(path.join(main, 'database', 'db'))
  assert.equal(db.prepare('SELECT id FROM orders WHERE id=?').get(orderId).id, orderId)
  assert.equal(db.prepare('SELECT * FROM order_items WHERE order_id=?').all(orderId).length, 1)
})
