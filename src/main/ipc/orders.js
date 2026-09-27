const { ipcMain } = require('electron')
const { db } = require('../database/db')

// Order numbers never repeat, even after an order is deleted: the last issued
// number is kept in the meta table and only ever goes up.
function nextOrderNumber() {
  const meta = db.prepare("SELECT value FROM meta WHERE key='last_order_seq'").get()
  const maxRow = db.prepare(
    "SELECT MAX(CAST(REPLACE(order_number, 'CB-', '') AS INTEGER)) AS n FROM orders"
  ).get()
  const n = Math.max(Number(meta?.value) || 0, Number(maxRow?.n) || 0) + 1
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('last_order_seq', @v)").run({ v: String(n) })
  return `CB-${String(n).padStart(5, '0')}`
}

// Prepared outside transaction for performance (parsed once, reused)
const stmtInsertOrder = db.prepare(
  `INSERT INTO orders (order_number, order_type, table_number, delivery_address,
   customer_id, customer_name, customer_phone,
   subtotal, discount_pct, discount_amount, vat_rate, vat_amount, total,
   payment_method, amount_tendered, change_due, status, notes, cashier_name)
   VALUES (@order_number, @order_type, @table_number, @delivery_address,
   @customer_id, @customer_name, @customer_phone,
   @subtotal, @discount_pct, @discount_amount, @vat_rate, @vat_amount, @total,
   @payment_method, @amount_tendered, @change_due, 'completed', @notes, @cashier_name)`
)

const stmtInsertItem = db.prepare(
  `INSERT INTO order_items (order_id, menu_item_id, name_en, name_ar, qty, unit_price, discount_pct, total_price)
   VALUES (@order_id, @menu_item_id, @name_en, @name_ar, @qty, @unit_price, @discount_pct, @total_price)`
)

const doCreateOrder = db.transaction((order, items) => {
  const orderNumber = nextOrderNumber()
  const result = stmtInsertOrder.run({ ...order, order_number: orderNumber })
  // Convert BigInt → Number (better-sqlite3 v9+ may return BigInt)
  const orderId = Number(result.lastInsertRowid)
  if (!orderId) throw new Error('Order insert returned invalid ID')
  for (const item of items) {
    stmtInsertItem.run({
      order_id: orderId,
      menu_item_id: item.menu_item_id ?? null,
      name_en: item.name_en, name_ar: item.name_ar,
      qty: item.qty, unit_price: item.unit_price,
      discount_pct: item.discount_pct ?? 0,
      total_price: item.total_price,
    })
  }
  return { orderId, orderNumber }
})

module.exports = function registerOrderHandlers() {
  ipcMain.handle('orders:create', (_, payload) => {
    try {
      const { items, ...order } = payload
      if (!Array.isArray(items) || items.length === 0) {
        return { error: 'No items in order' }
      }
      return { data: doCreateOrder(order, items) }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('orders:list', (_, { from, to, status, page = 1, limit = 50 } = {}) => {
    try {
      const offset = (page - 1) * limit
      const dateFrom = from || '2000-01-01'
      const dateTo = to || '2099-12-31'
      let sql = `SELECT o.*,
        COALESCE(o.customer_name, c.name) as customer_name,
        COALESCE(o.customer_phone, c.phone) as customer_phone
        FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
        WHERE date(o.created_at,'localtime') BETWEEN @from AND @to`
      const params = { from: dateFrom, to: dateTo, limit, offset }
      if (status) { sql += ' AND o.status = @status'; params.status = status }
      sql += ' ORDER BY o.created_at DESC LIMIT @limit OFFSET @offset'
      return { data: db.prepare(sql).all(params) }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('orders:get', (_, { id }) => {
    try {
      const order = db.prepare('SELECT * FROM orders WHERE id=@id').get({ id })
      if (!order) return { error: 'Order not found' }
      const items = db.prepare('SELECT * FROM order_items WHERE order_id=@order_id').all({ order_id: id })
      return { data: { ...order, items } }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('orders:update-status', (_, { id, status }) => {
    try {
      db.prepare('UPDATE orders SET status=@status WHERE id=@id').run({ id, status })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('orders:update-details', (_, { id, customer_name, customer_phone, table_number, delivery_address, notes }) => {
    try {
      db.prepare(`UPDATE orders SET
        customer_name=@customer_name, customer_phone=@customer_phone,
        table_number=@table_number, delivery_address=@delivery_address, notes=@notes
        WHERE id=@id`).run({ id, customer_name: customer_name || null, customer_phone: customer_phone || null, table_number: table_number || null, delivery_address: delivery_address || null, notes: notes || null })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('orders:delete', (_, { id }) => {
    try {
      db.transaction(() => {
        db.prepare('DELETE FROM order_items WHERE order_id=@id').run({ id })
        db.prepare('DELETE FROM orders WHERE id=@id').run({ id })
      })()
      return { data: true }
    } catch (e) { return { error: e.message } }
  })
}
