// In-browser stand-in for the Electron backend, used only when the UI is opened
// in a normal browser (e.g. `vite` on localhost). Data lives in memory and is
// kept in localStorage so a refresh doesn't lose it. The desktop app never loads this.

const KEY = 'cb-demo-db-v1'
const pad = (n) => String(n).padStart(2, '0')
const utcStamp = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
const localDate = (s) => { const d = new Date(String(s).replace(' ', 'T') + 'Z'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

const CATS = [
  ['Burgers', 'برجر'], ['Sandwiches', 'سندويشات'], ['Sides', 'مقبلات'], ['Beverages', 'مشروبات'], ['Desserts', 'حلويات'],
]
const ITEMS = [
  [1, 'Classic Cheesy Burger', 'برجر تشيزي كلاسيك', 29.99], [1, 'Double Smash Burger', 'دابل سماش برجر', 39.99],
  [1, 'BBQ Bacon Burger', 'برجر بي بي كيو', 35.99], [1, 'Mushroom Swiss Burger', 'برجر مشروم', 33.99],
  [2, 'Crispy Chicken Sandwich', 'ساندوتش دجاج كريسبي', 24.99], [2, 'Grilled Chicken Wrap', 'راب دجاج مشوي', 22.99],
  [2, 'Philly Steak Sandwich', 'ساندوتش فيلي ستيك', 31.99], [3, 'Loaded Fries', 'بطاطس محملة', 14.99],
  [3, 'Onion Rings', 'حلقات بصل', 12.99], [3, 'Coleslaw', 'كول سلو', 9.99], [3, 'Mozzarella Sticks', 'أصابع موزاريلا', 16.99],
  [4, 'Fresh Lemonade', 'ليمون طازج', 12.99], [4, 'Soft Drink', 'مشروب غازي', 8.99], [4, 'Water', 'ماء', 4.99],
  [4, 'Iced Latte', 'لاتيه مثلج', 15.99], [5, 'Cheesecake Slice', 'شريحة تشيز كيك', 19.99], [5, 'Chocolate Brownie', 'براوني شوكولاتة', 15.99],
]
const NAMES = ['Ahmed Al-Harbi', 'Sara Al-Qahtani', 'Mohammed Al-Otaibi', 'Noura Al-Shehri', 'Khalid Al-Dosari', 'Reem Al-Mutairi', 'Faisal Al-Zahrani', 'Lama Al-Ghamdi']
const TYPES = ['dine-in', 'dine-in', 'takeaway', 'delivery', 'drive-through']
const PAYS = ['cash', 'card', 'card', 'split']

function seed() {
  const db = {
    seq: { categories: 0, menu_items: 0, orders: 0, order_items: 0, customers: 0, reservations: 0 },
    categories: [], menu_items: [], orders: [], order_items: [], customers: [], reservations: [],
    settings: {
      restaurant_name_en: 'Cheesy Bite Restaurant', restaurant_name_ar: 'مطعم تشيزي بايت',
      address_en: 'Riyadh, KSA', address_ar: 'الرياض، المملكة العربية السعودية', phone: '+966 11 000 0000',
      email: '', vat_number: '300000000000003', currency: 'SAR', default_language: 'en',
      receipt_footer_en: 'Thank you for visiting Cheesy Bite!', receipt_footer_ar: 'شكراً لزيارتكم مطعم تشيزي بايت!',
      vat_enabled: '1', vat_rate: '0.15', accent_color: '#c1fbd4', sidebar_color: '#0a0a0a',
      logo_bg_color: '#000000', logo_border_radius: '8', logo_bg_opacity: '1', print_copies: '1', default_printer: '',
      receipt_paper_width: '80', auto_print_receipt: '1', default_order_type: 'dine-in', cashier_name: 'Demo',
      auto_clear_cart: '1', whatsapp_auto_send: '1', quick_discounts: '5,10,15,20', bank_name: '', bank_iban: '', bank_account: '', bank_qr_url: '',
      app_logo_path: '', receipt_logo_path: '',
    },
    password: 'cheesy2024',
  }
  const ins = (t, row) => { const id = ++db.seq[t]; db[t].push({ id, ...row }); return id }
  CATS.forEach(([en, ar], i) => ins('categories', { name_en: en, name_ar: ar, icon: '', description_en: '', description_ar: '', sort_order: i + 1, is_active: 1, created_at: utcStamp(new Date()) }))
  ITEMS.forEach(([c, en, ar, p], i) => ins('menu_items', { category_id: c, name_en: en, name_ar: ar, description_en: '', description_ar: '', price: p, discount_pct: 0, discount_fixed: 0, vat_exempt: 0, image_path: '', is_available: 1, sort_order: i, created_at: utcStamp(new Date()), updated_at: utcStamp(new Date()) }))
  NAMES.forEach((n, i) => ins('customers', { name: n, phone: `05${String(10000000 + i * 1234567).slice(0, 8)}`, email: i % 3 === 0 ? `${n.split(' ')[0].toLowerCase()}@example.com` : '', notes: '', created_at: utcStamp(new Date(Date.now() - (60 - i * 5) * 864e5)) }))

  // ~30 days of orders, more at lunch and dinner
  let rnd = 7
  const r = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647 }
  for (let day = 29; day >= 0; day--) {
    const count = 4 + Math.floor(r() * 9)
    for (let k = 0; k < count; k++) {
      const d = new Date(); d.setDate(d.getDate() - day)
      d.setHours([12, 13, 13, 14, 19, 20, 20, 21, 17][Math.floor(r() * 9)], Math.floor(r() * 60), 0, 0)
      if (d > new Date()) continue
      const lines = 1 + Math.floor(r() * 3)
      const items = []
      for (let l = 0; l < lines; l++) {
        const it = db.menu_items[Math.floor(r() * db.menu_items.length)]
        const qty = 1 + Math.floor(r() * 2)
        items.push({ menu_item_id: it.id, name_en: it.name_en, name_ar: it.name_ar, qty, unit_price: it.price, discount_pct: 0, total_price: +(it.price * qty).toFixed(2) })
      }
      const subtotal = +items.reduce((s, i) => s + i.total_price, 0).toFixed(2)
      const vat = +(subtotal * 0.15).toFixed(2)
      const cust = r() < 0.4 ? db.customers[Math.floor(r() * db.customers.length)] : null
      const type = TYPES[Math.floor(r() * TYPES.length)]
      const id = ins('orders', {
        order_number: `CB-${pad(db.seq.orders + 1).padStart(5, '0')}`, order_type: type,
        table_number: type === 'dine-in' ? String(1 + Math.floor(r() * 12)) : null,
        delivery_address: type === 'delivery' ? 'Olaya St, Riyadh' : null,
        customer_id: cust?.id ?? null, customer_name: cust?.name ?? null, customer_phone: cust?.phone ?? null,
        subtotal, discount_pct: 0, discount_amount: 0, vat_rate: 0.15, vat_amount: vat, total: +(subtotal + vat).toFixed(2),
        payment_method: PAYS[Math.floor(r() * PAYS.length)], amount_tendered: null, change_due: null,
        status: r() < 0.05 ? 'refunded' : 'completed', notes: null, cashier_name: 'Demo', created_at: utcStamp(d),
      })
      items.forEach(i => ins('order_items', { order_id: id, ...i }))
    }
  }
  const at = (days, h) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:00` }
  ;[[0, 19, 4, '5', 'confirmed'], [0, 21, 2, '8', 'confirmed'], [1, 20, 6, '3', 'confirmed'], [-1, 20, 3, '2', 'completed'], [2, 13, 2, '', 'confirmed'], [-2, 19, 5, '6', 'cancelled']]
    .forEach(([d, h, g, tbl, st], i) => ins('reservations', { customer_name: NAMES[i], phone: db.customers[i].phone, email: '', guest_count: g, reserved_at: at(d, h), table_number: tbl, notes: i === 0 ? 'Window seat please' : '', status: st, created_at: utcStamp(new Date()) }))
  return db
}

let db
try { db = JSON.parse(localStorage.getItem(KEY)) } catch { db = null }
if (!db) db = seed()
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch {} }
const nextId = (t) => ++db.seq[t]
const ok = (data) => ({ data })
const byId = (t, id) => db[t].find(r => r.id === Number(id))

function orderTotals(o) {
  return { ...o, items: db.order_items.filter(i => i.order_id === o.id) }
}

function summary(period) {
  const now = new Date()
  const done = db.orders.filter(o => o.status === 'completed')
  const when = (o) => new Date(o.created_at.replace(' ', 'T') + 'Z')
  const sum = (list) => ({ revenue: +list.reduce((s, o) => s + o.total, 0).toFixed(2), count: list.length })
  const today = localDate(utcStamp(now))
  const inDays = (o, n) => (now - when(o)) <= n * 864e5
  const sameMonth = (o) => { const d = when(o); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }
  const sameYear = (o) => when(o).getFullYear() === now.getFullYear()

  const filters = { today: o => localDate(o.created_at) === today, '7days': o => inDays(o, 7), '30days': o => inDays(o, 30), month: sameMonth, year: sameYear }
  const f = filters[period] || filters['30days']
  const inPeriod = done.filter(f)
  const label = (o) => {
    const d = when(o)
    if (period === 'today') return `${pad(d.getHours())}:00`
    if (period === 'year') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    return localDate(o.created_at)
  }
  const groups = {}
  inPeriod.forEach(o => { const k = label(o); groups[k] = groups[k] || { label: k, revenue: 0, count: 0 }; groups[k].revenue += o.total; groups[k].count++ })
  const chartData = Object.values(groups).sort((a, b) => a.label.localeCompare(b.label)).map(g => ({ ...g, revenue: +g.revenue.toFixed(2) }))
  const ids = new Set(inPeriod.map(o => o.id))
  const top = {}
  db.order_items.filter(i => ids.has(i.order_id)).forEach(i => { top[i.name_en] = top[i.name_en] || { name_en: i.name_en, name_ar: i.name_ar, total_qty: 0, total_revenue: 0 }; top[i.name_en].total_qty += i.qty; top[i.name_en].total_revenue += i.total_price })
  const types = {}
  inPeriod.forEach(o => { types[o.order_type] = types[o.order_type] || { order_type: o.order_type, count: 0, revenue: 0 }; types[o.order_type].count++; types[o.order_type].revenue += o.total })
  return {
    today: sum(done.filter(filters.today)), week: sum(done.filter(o => inDays(o, 7))),
    month: sum(done.filter(sameMonth)), year: sum(done.filter(sameYear)),
    chartData, topItems: Object.values(top).sort((a, b) => b.total_qty - a.total_qty).slice(0, 8),
    orderTypes: Object.values(types),
  }
}

const handlers = {
  'settings:get-all': () => ok({ ...db.settings }),
  'settings:set': ({ key, value }) => { db.settings[key] = value; return ok(true) },
  'settings:set-many': (pairs) => { Object.assign(db.settings, pairs); return ok(true) },
  'settings:verify-password': ({ password }) => ok(password === db.password),
  'settings:set-password': ({ newPassword }) => { db.password = newPassword; return ok(true) },
  'settings:reset-password': () => { db.password = 'cheesy2024'; return ok(true) },
  'settings:change-password': ({ current, next }) => current === db.password ? (db.password = next, ok(true)) : { error: 'Current password incorrect' },
  'settings:get-stats': () => ok({ orderCount: db.orders.length, revenue: db.orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0), itemCount: db.menu_items.length }),
  'settings:backup-db': () => ({ error: 'Backups are only available in the desktop app' }),
  'settings:pick-logo': () => ok(null),
  'settings:set-window-title': (t) => { document.title = t; return ok(true) },
  'settings:update-app-icon': () => ok(true),
  'printers:list': () => ok([{ name: 'Demo Receipt Printer', isDefault: true }]),
  'print:receipt': ({ orderId }) => new Promise(r => setTimeout(() => {
    const o = byId('orders', orderId)
    const whatsapp = o?.customer_phone && db.settings.whatsapp_auto_send !== '0' ? 'needs-login' : 'off'
    if (o && whatsapp !== 'off') o.whatsapp_status = whatsapp
    r({ data: true, whatsapp })
  }, 600)),
  'shell:open-external': (url) => { window.open(url, '_blank', 'noopener'); return ok(true) },
  'whatsapp:status': () => ok('logged-out'),
  'whatsapp:open-setup': () => ({ error: 'WhatsApp is only available in the desktop app' }),
  'whatsapp:close-setup': () => ok(true),
  'whatsapp:send': () => ({ error: 'needs-login' }),
  'whatsapp:send-receipt': () => ({ error: 'needs-login' }),
  'export:orders-csv': () => ({ error: 'Export is only available in the desktop app' }),
  'export:orders-excel': () => ({ error: 'Export is only available in the desktop app' }),
  'export:customers-csv': () => ({ error: 'Export is only available in the desktop app' }),
  'export:reservations-csv': () => ({ error: 'Export is only available in the desktop app' }),

  'categories:list': () => ok([...db.categories].sort((a, b) => a.sort_order - b.sort_order)),
  'categories:create': (p) => { const id = nextId('categories'); db.categories.push({ id, is_active: 1, icon: '', description_en: '', description_ar: '', sort_order: 0, ...p }); return ok({ id }) },
  'categories:update': (p) => { Object.assign(byId('categories', p.id), p); return ok(true) },
  'categories:delete': ({ id }) => { db.categories = db.categories.filter(c => c.id !== id); db.menu_items = db.menu_items.filter(m => m.category_id !== id); return ok(true) },

  'menu-items:list': ({ category_id } = {}) => ok(db.menu_items.filter(m => !category_id || m.category_id === category_id).map(m => { const c = byId('categories', m.category_id); return { ...m, category_name_en: c?.name_en, category_name_ar: c?.name_ar } })),
  'menu-items:list-available': () => ok(db.menu_items.filter(m => m.is_available && byId('categories', m.category_id)?.is_active).map(m => { const c = byId('categories', m.category_id); return { ...m, cat_en: c.name_en, cat_ar: c.name_ar } })),
  'menu-items:create': (p) => { const id = nextId('menu_items'); db.menu_items.push({ discount_pct: 0, discount_fixed: 0, vat_exempt: 0, ...p, id }); return ok({ id }) },
  'menu-items:update': (p) => { Object.assign(byId('menu_items', p.id), p); return ok(true) },
  'menu-items:delete': ({ id }) => { db.menu_items = db.menu_items.filter(m => m.id !== id); return ok(true) },
  'menu-items:bulk-assign-category': ({ ids, category_id }) => { ids.forEach(id => { byId('menu_items', id).category_id = category_id }); return ok(true) },
  'menu-items:pick-image': () => ok(null),

  'orders:create': ({ items, ...o }) => {
    const id = nextId('orders')
    const n = Math.max(0, ...db.orders.map(x => +x.order_number.replace('CB-', ''))) + 1
    const orderNumber = `CB-${String(n).padStart(5, '0')}`
    db.orders.push({ ...o, id, order_number: orderNumber, status: 'completed', created_at: utcStamp(new Date()) })
    items.forEach(i => db.order_items.push({ ...i, id: nextId('order_items'), order_id: id }))
    return ok({ orderId: id, orderNumber })
  },
  'orders:list': ({ from, to, status, page = 1, limit = 50 } = {}) => {
    const list = db.orders
      .filter(o => (!from || localDate(o.created_at) >= from) && (!to || localDate(o.created_at) <= to) && (!status || o.status === status))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return ok(list.slice((page - 1) * limit, page * limit))
  },
  'orders:get': ({ id }) => { const o = byId('orders', id); return o ? ok(orderTotals(o)) : { error: 'Order not found' } },
  'orders:update-status': ({ id, status }) => { byId('orders', id).status = status; return ok(true) },
  'orders:update-details': ({ id, ...p }) => { Object.assign(byId('orders', id), p); return ok(true) },
  'orders:delete': ({ id }) => { db.orders = db.orders.filter(o => o.id !== id); db.order_items = db.order_items.filter(i => i.order_id !== id); return ok(true) },

  'customers:list': ({ search } = {}) => {
    const q = (search || '').toLowerCase()
    return ok(db.customers
      .filter(c => !q || [c.name, c.phone, c.email].some(v => (v || '').toLowerCase().includes(q)))
      .map(c => { const os = db.orders.filter(o => o.customer_id === c.id); return { ...c, total_orders: os.length, total_spent: os.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0) } })
      .sort((a, b) => a.name.localeCompare(b.name)))
  },
  'customers:get': ({ id }) => ok({ ...byId('customers', id), orders: db.orders.filter(o => o.customer_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20) }),
  'customers:find-by-phone': ({ phone }) => ok(db.customers.find(c => c.phone === phone) || null),
  'customers:create': (p) => {
    const ex = p.phone && db.customers.find(c => c.phone === p.phone)
    if (ex) return ok({ id: ex.id, existed: true })
    const id = nextId('customers'); db.customers.push({ ...p, id, created_at: utcStamp(new Date()) }); return ok({ id, existed: false })
  },
  'customers:update': ({ id, ...p }) => { Object.assign(byId('customers', id), p); return ok(true) },
  'customers:delete': ({ id }) => { db.customers = db.customers.filter(c => c.id !== id); return ok(true) },

  'reservations:list': () => ok([...db.reservations].sort((a, b) => a.reserved_at.localeCompare(b.reserved_at))),
  'reservations:create': (p) => { const id = nextId('reservations'); db.reservations.push({ ...p, id, status: 'confirmed', created_at: utcStamp(new Date()) }); return ok({ id }) },
  'reservations:update': ({ id, ...p }) => { Object.assign(byId('reservations', id), p); return ok(true) },
  'reservations:update-status': ({ id, status }) => { byId('reservations', id).status = status; return ok(true) },
  'reservations:delete': ({ id }) => { db.reservations = db.reservations.filter(r => r.id !== id); return ok(true) },

  'dashboard:summary': ({ period } = {}) => ok(summary(period)),
}

window.api = {
  invoke: async (channel, payload) => {
    const h = handlers[channel]
    if (!h) { console.warn('[demo api] unhandled channel', channel); return { error: `Not available in browser preview: ${channel}` } }
    const res = await h(payload ?? {})
    persist()
    return JSON.parse(JSON.stringify(res))
  },
  on: () => () => {},
}
window.__DEMO__ = true
console.info('[Cheesy Bite] Browser preview — using demo data. Run the desktop app for real data.')
