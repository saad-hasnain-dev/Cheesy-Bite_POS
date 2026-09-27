const { ipcMain } = require('electron')
const { db } = require('../database/db')

module.exports = function registerCategoryHandlers() {
  ipcMain.handle('categories:list', () => {
    try {
      const rows = db.prepare('SELECT * FROM categories ORDER BY sort_order, name_en').all()
      return { data: rows }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('categories:create', (_, payload) => {
    try {
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO categories (name_en, name_ar, icon, description_en, description_ar, sort_order, is_active) VALUES (@name_en, @name_ar, @icon, @description_en, @description_ar, @sort_order, 1)'
      ).run({
        name_en: payload.name_en || '',
        name_ar: payload.name_ar || '',
        icon: payload.icon || '',
        description_en: payload.description_en || '',
        description_ar: payload.description_ar || '',
        sort_order: payload.sort_order || 0,
      })
      return { data: { id: lastInsertRowid } }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('categories:update', (_, { id, name_en, name_ar, icon, description_en, description_ar, sort_order, is_active }) => {
    try {
      db.prepare(
        'UPDATE categories SET name_en=@name_en, name_ar=@name_ar, icon=@icon, description_en=@description_en, description_ar=@description_ar, sort_order=@sort_order, is_active=@is_active WHERE id=@id'
      ).run({ id, name_en: name_en||'', name_ar: name_ar||'', icon: icon||'', description_en: description_en||'', description_ar: description_ar||'', sort_order: sort_order||0, is_active: is_active??1 })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('categories:delete', (_, { id }) => {
    try {
      // Remove the category's items too, so none are left orphaned
      // (hidden from the POS but still listed without a category)
      db.transaction(() => {
        db.prepare('DELETE FROM menu_items WHERE category_id=@id').run({ id })
        db.prepare('DELETE FROM categories WHERE id=@id').run({ id })
      })()
      return { data: true }
    } catch (e) { return { error: e.message } }
  })
}
