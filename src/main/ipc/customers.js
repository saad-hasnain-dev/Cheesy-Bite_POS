const { ipcMain } = require('electron')
const { db } = require('../database/db')

module.exports = function registerCustomerHandlers() {
  ipcMain.handle('customers:list', (_, { search } = {}) => {
    try {
      let sql = `SELECT c.*,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status='completed' THEN o.total ELSE 0 END), 0) as total_spent
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id`
      const params = {}
      if (search) {
        sql += ' WHERE c.name LIKE @search OR c.phone LIKE @search OR c.email LIKE @search'
        params.search = `%${search}%`
      }
      sql += ' GROUP BY c.id ORDER BY c.name LIMIT 200'
      return { data: db.prepare(sql).all(params) }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('customers:get', (_, { id }) => {
    try {
      const customer = db.prepare('SELECT * FROM customers WHERE id=@id').get({ id })
      const orders = db.prepare(
        'SELECT * FROM orders WHERE customer_id=@customer_id ORDER BY created_at DESC LIMIT 20'
      ).all({ customer_id: id })
      return { data: { ...customer, orders } }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('customers:find-by-phone', (_, { phone }) => {
    try {
      const customer = db.prepare('SELECT * FROM customers WHERE phone=@phone').get({ phone })
      return { data: customer || null }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('customers:create', (_, payload) => {
    try {
      const existing = payload.phone
        ? db.prepare('SELECT id FROM customers WHERE phone=@phone').get({ phone: payload.phone })
        : null
      if (existing) return { data: { id: existing.id, existed: true } }
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO customers (name, phone, email, notes) VALUES (@name, @phone, @email, @notes)'
      ).run(payload)
      return { data: { id: lastInsertRowid, existed: false } }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('customers:update', (_, { id, ...payload }) => {
    try {
      if (payload.phone) {
        const dup = db.prepare('SELECT id FROM customers WHERE phone=@phone AND id<>@id').get({ phone: payload.phone, id })
        if (dup) return { error: 'Another customer already has this phone number' }
      }
      db.prepare('UPDATE customers SET name=@name, phone=@phone, email=@email, notes=@notes WHERE id=@id').run({ ...payload, id })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('customers:delete', (_, { id }) => {
    try {
      db.prepare('DELETE FROM customers WHERE id=@id').run({ id })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })
}
