const { ipcMain, dialog, BrowserWindow, nativeImage, shell, app } = require('electron')
const { db, getDbPath } = require('../database/db')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

module.exports = function registerSettingsHandlers() {
  ipcMain.handle('settings:get-all', () => {
    try {
      const rows = db.prepare('SELECT key, value FROM settings').all()
      const settings = {}
      for (const r of rows) settings[r.key] = r.value
      delete settings.admin_password_hash
      return { data: settings }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:set', (_, { key, value }) => {
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)').run({ key, value })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:set-many', (_, pairs) => {
    try {
      const setMany = db.transaction((pairs) => {
        for (const [key, value] of Object.entries(pairs)) {
          db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)').run({ key, value })
        }
      })
      setMany(pairs)
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:verify-password', (_, { password }) => {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key=@key').get({ key: 'admin_password_hash' })
      const match = row && row.value === sha256(password)
      return { data: match }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:change-password', (_, { current, next }) => {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key=@key').get({ key: 'admin_password_hash' })
      if (!row || row.value !== sha256(current)) return { error: 'Current password incorrect' }
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)').run({
        key: 'admin_password_hash', value: sha256(next)
      })
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('printers:list', async (event) => {
    try {
      let printers = []
      if (typeof event.sender.getPrintersAsync === 'function') {
        printers = await event.sender.getPrintersAsync()
      } else if (typeof event.sender.getPrinters === 'function') {
        const raw = event.sender.getPrinters()
        printers = Array.isArray(raw) ? raw : await raw
      }
      return { data: printers.map(p => ({ name: p.name, isDefault: p.isDefault })) }
    } catch (e) { return { data: [] } }
  })

  ipcMain.handle('settings:reset-password', () => {
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('admin_password_hash', sha256('cheesy2024'))
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:set-password', (_, { newPassword }) => {
    try {
      if (!newPassword || newPassword.length < 4) return { error: 'Password must be at least 4 characters' }
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('admin_password_hash', sha256(newPassword))
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:pick-logo', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win, {
        title: 'Choose Logo Image',
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }],
        properties: ['openFile'],
      })
      if (result.canceled || !result.filePaths.length) return { data: null }
      return { data: result.filePaths[0] }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:set-window-title', (event, title) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win) win.setTitle(title)
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('shell:open-external', (_, url) => {
    try { shell.openExternal(url); return { data: true } }
    catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:update-app-icon', (event, logoPath) => {
    try {
      if (!logoPath) return { data: false }
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { data: false }
      const img = nativeImage.createFromPath(logoPath)
      if (!img.isEmpty()) {
        win.setIcon(img)
        win.setOverlayIcon(null, '')
      }
      return { data: true }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:backup-db', async (event) => {
    try {
      const dbPath = getDbPath()
      if (!dbPath) return { error: 'Database not initialized yet' }
      const win = BrowserWindow.fromWebContents(event.sender)
      const today = new Date().toISOString().slice(0, 10)
      const result = await dialog.showSaveDialog(win, {
        title: 'Backup Database',
        defaultPath: `cheesybite-backup-${today}.db`,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      })
      if (result.canceled || !result.filePath) return { data: null }
      fs.copyFileSync(dbPath, result.filePath)
      return { data: result.filePath }
    } catch (e) { return { error: e.message } }
  })

  ipcMain.handle('settings:get-stats', () => {
    try {
      const orderCount = db.prepare('SELECT COUNT(*) as c FROM orders').get()
      const revenue    = db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status='completed'").get()
      const itemCount  = db.prepare('SELECT COUNT(*) as c FROM menu_items').get()
      return { data: { orderCount: orderCount?.c || 0, revenue: revenue?.r || 0, itemCount: itemCount?.c || 0 } }
    } catch (e) { return { error: e.message } }
  })
}
