const { app, BrowserWindow, shell, Menu, session } = require('electron')
const path = require('path')
const { openDatabase } = require('./database/db')
const { runSchema } = require('./database/schema')
const registerIpc = require('./ipc/index')

// Remove the application menu bar globally (File / Edit / View / Window / Help)
Menu.setApplicationMenu(null)

let mainWindow = null

function getRendererPath() {
  return path.join(__dirname, '../../out/renderer/index.html')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    title: 'Cheesy Bite POS',
    backgroundColor: '#f4f6fa',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false
  })

  mainWindow.loadFile(getRendererPath())

  // ── Keyboard shortcuts (local to this window, not global) ──────────────────
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const ctrl = input.control || input.meta

    if (ctrl && !input.shift && input.key.toLowerCase() === 'r') {
      event.preventDefault()
      mainWindow.webContents.reload()
    }
    if (ctrl && input.shift && input.key.toLowerCase() === 'r') {
      event.preventDefault()
      mainWindow.webContents.reloadIgnoringCache()
    }
    if (ctrl && (input.key === '=' || input.key === '+')) {
      mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5)
    }
    if (ctrl && input.key === '-') {
      mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5)
    }
    if (ctrl && input.key === '0') {
      mainWindow.webContents.setZoomLevel(0)
    }
    // DevTools: F12 or Ctrl+Shift+I (dev builds only)
    if (!app.isPackaged) {
      if (input.key === 'F12') mainWindow.webContents.openDevTools({ mode: 'detach' })
      if (ctrl && input.shift && input.key.toLowerCase() === 'i') mainWindow.webContents.toggleDevTools()
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  // Clear Chromium's disk cache on every launch so updates always show immediately.
  // Without this, Chromium re-serves cached old JS/HTML even after a new app.asar is installed.
  try { await session.defaultSession.clearCache() } catch (_) {}

  await openDatabase()
  runSchema()
  registerIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
