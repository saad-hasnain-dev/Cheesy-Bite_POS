const { ipcMain } = require('electron')
const { db } = require('../database/db')

module.exports = function registerReservationHandlers() {
  ipcMain.handle('reservations:list', (_, { from, to, status } = {}) => {
    try {
      let sql = 'SELECT * FROM reservations WHERE 1=1'
      const params = {}
      if (from) { sql += ' AND date(reserved_at) >= @from'; params.from = from }
      if (to) { sql += ' AND date(reserved_at) <= @to'; params.to = to }
      if (status) { sql += ' AND status = @status'; params.status = status }
      sql += ' ORDER BY reserved_at ASC'
      return { data: db.prepare(sql).all(params) }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('reservations:create', (_, payload) => {
    try {
      const { lastInsertRowid } = db.prepare(
        `INSERT INTO reservations (customer_name, phone, email, guest_count, reserved_at, table_number, notes, status)
         VALUES (@customer_name, @phone, @email, @guest_count, @reserved_at, @table_number, @notes, 'confirmed')`
      ).run(payload)
      return { data: { id: lastInsertRowid } }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('reservations:update-status', (_, { id, status }) => {
    try {
      db.prepare('UPDATE reservations SET status=@status WHERE id=@id').run({ id, status })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('reservations:update', (_, { id, ...payload }) => {
    try {
      db.prepare(
        `UPDATE reservations SET customer_name=@customer_name, phone=@phone, email=@email,
         guest_count=@guest_count, reserved_at=@reserved_at, table_number=@table_number,
         notes=@notes WHERE id=@id`
      ).run({ ...payload, id })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('reservations:delete', (_, { id }) => {
    try {
      db.prepare('DELETE FROM reservations WHERE id=@id').run({ id })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })
}
