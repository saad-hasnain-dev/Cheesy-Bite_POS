const { ipcMain, app, dialog } = require('electron')
const { db } = require('../database/db')
const fs = require('fs')
const path = require('path')

module.exports = function registerMenuItemHandlers() {
  ipcMain.handle('menu-items:list', (_, { category_id } = {}) => {
    try {
      let sql = 'SELECT m.*, c.name_en as category_name_en, c.name_ar as category_name_ar FROM menu_items m LEFT JOIN categories c ON c.id = m.category_id'
      const params = {}
      if (category_id) { sql += ' WHERE m.category_id = @category_id'; params.category_id = category_id }
      sql += ' ORDER BY m.sort_order, m.name_en'
      return { data: db.prepare(sql).all(params) }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('menu-items:list-available', () => {
    try {
      const rows = db.prepare(
        `SELECT m.*, c.name_en as cat_en, c.name_ar as cat_ar
         FROM menu_items m JOIN categories c ON c.id = m.category_id
         WHERE m.is_available = 1 AND c.is_active = 1
         ORDER BY c.sort_order, m.sort_order, m.name_en`
      ).all()
      return { data: rows }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('menu-items:create', (_, payload) => {
    try {
      const { lastInsertRowid } = db.prepare(
        `INSERT INTO menu_items (category_id, name_en, name_ar, description_en, description_ar,
         price, discount_pct, discount_fixed, vat_exempt, image_path, is_available, sort_order)
         VALUES (@category_id, @name_en, @name_ar, @description_en, @description_ar,
         @price, @discount_pct, @discount_fixed, @vat_exempt, @image_path, @is_available, @sort_order)`
      ).run({
        discount_pct: 0, discount_fixed: 0, vat_exempt: 0,
        ...payload,
      })
      return { data: { id: Number(lastInsertRowid) } }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('menu-items:update', (_, { id, ...payload }) => {
    try {
      db.prepare(
        `UPDATE menu_items SET category_id=@category_id, name_en=@name_en, name_ar=@name_ar,
         description_en=@description_en, description_ar=@description_ar, price=@price,
         discount_pct=@discount_pct, discount_fixed=@discount_fixed, vat_exempt=@vat_exempt,
         image_path=@image_path, is_available=@is_available, sort_order=@sort_order,
         updated_at=datetime('now') WHERE id=@id`
      ).run({ discount_pct: 0, discount_fixed: 0, vat_exempt: 0, ...payload, id })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('menu-items:bulk-assign-category', (_, { ids, category_id }) => {
    try {
      const stmt = db.prepare('UPDATE menu_items SET category_id=@category_id WHERE id=@id')
      const tx = db.transaction((ids) => { for (const id of ids) stmt.run({ category_id, id }) })
      tx(ids)
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('menu-items:delete', (_, { id }) => {
    try {
      db.prepare('DELETE FROM menu_items WHERE id=@id').run({ id })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('menu-items:upload-image', async (event, { sourcePath }) => {
    try {
      const imagesDir = path.join(app.getPath('userData'), 'images')
      if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
      const ext = path.extname(sourcePath)
      const dest = path.join(imagesDir, `${Date.now()}${ext}`)
      fs.copyFileSync(sourcePath, dest)
      return { data: { path: dest } }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('menu-items:pick-image', async (event) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select Item Image',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp'] }],
        properties: ['openFile']
      })
      if (canceled || !filePaths.length) return { data: null }
      const sourcePath = filePaths[0]
      const imagesDir = path.join(app.getPath('userData'), 'images')
      if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true })
      const ext = path.extname(sourcePath)
      const dest = path.join(imagesDir, `${Date.now()}${ext}`)
      fs.copyFileSync(sourcePath, dest)
      return { data: { path: dest } }
    } catch (e) { return { error: e.message } }
  })
}
