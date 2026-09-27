const { ipcMain, BrowserWindow, app, clipboard } = require('electron')
const path   = require('path')
const os     = require('os')
const fs     = require('fs')
const { db } = require('../database/db')
const { buildReceiptHTML } = require('./print')

const WA_UA      = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const WA_URL     = 'https://web.whatsapp.com'

// In packaged builds wa-preload.js is in app.asar.unpacked (not inside the asar archive)
// because BrowserWindow preloads for external windows must be on the real filesystem.
// In dev builds __dirname is the real src/main/ipc/ folder, so the relative path still works.
function getPreloadPath() {
  const rel = path.join(__dirname, '../wa-preload.js')
  // When packaged, electron-builder puts asarUnpack files next to app.asar as app.asar.unpacked/
  if (app.isPackaged) {
    return rel.replace('app.asar', 'app.asar.unpacked')
  }
  return rel
}
const PRELOAD = getPreloadPath()

// ── Helpers ───────────────────────────────────────────────────────────────────
const delay = ms => new Promise(r => setTimeout(r, ms))

async function jsEval(win, code) {
  try { return await win.webContents.executeJavaScript(code) } catch (_) { return null }
}

async function poll(fn, maxMs, step = 900) {
  const end = Date.now() + maxMs
  while (Date.now() < end) {
    const v = await fn()
    if (v && v !== 'waiting') return v
    await delay(step)
  }
  return null
}

// Returns 'logged-in' | 'logged-out' | 'loading'
async function waStatus(win) {
  return jsEval(win, `(function(){
    if (document.querySelector('[data-ref]')) return 'logged-out';
    if (document.querySelector('#side') ||
        document.querySelector('[data-testid="chat-list"]')) return 'logged-in';
    return 'loading';
  })()`)
}

function normPhone(phone) {
  let p = (phone || '').replace(/\D/g, '')
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('0'))  p = '966' + p.slice(1)
  if (p.length <= 9)      p = '966' + p
  return p
}

// Shared webPreferences for all WA windows
function waPrefs() {
  return {
    partition: 'persist:whatsapp',
    contextIsolation: false,  // required so preload can override navigator.*
    nodeIntegration: false,
    preload: PRELOAD,
  }
}

// ── Background sender window ──────────────────────────────────────────────────
// show:true + x:-10000 so Windows compositor renders DOM (needed for JS execution)
// contextIsolation:false + preload hides Electron fingerprint from WA
let waWin = null

function ensureSenderWindow() {
  if (waWin && !waWin.isDestroyed()) return waWin
  waWin = new BrowserWindow({
    width: 960, height: 700,
    x: -10000, y: 0,
    show: true, frame: false, skipTaskbar: true, focusable: false,
    title: ' ',
    webPreferences: waPrefs(),
  })
  waWin.webContents.setUserAgent(WA_UA)
  waWin.webContents.session.setUserAgent(WA_UA)
  waWin.on('closed', () => { waWin = null })
  waWin.on('page-title-updated', e => e.preventDefault())
  return waWin
}

// ── Setup window (QR scan) ────────────────────────────────────────────────────
// Separate visible window — shown BEFORE loading WA so canvas renders properly
let setupWin = null

async function openSetupWindow() {
  if (setupWin && !setupWin.isDestroyed()) { setupWin.focus(); return setupWin }

  setupWin = new BrowserWindow({
    width: 1000, height: 760,
    show: false,    // shown below BEFORE URL loads
    title: 'Connect WhatsApp — Cheesy Bite POS',
    webPreferences: waPrefs(),
  })
  setupWin.webContents.setUserAgent(WA_UA)
  setupWin.webContents.session.setUserAgent(WA_UA)
  setupWin.on('closed', () => { setupWin = null })

  // IMPORTANT: show & center BEFORE loading URL so canvas renders correctly
  setupWin.center()
  setupWin.show()
  setupWin.focus()

  await setupWin.loadURL(WA_URL)
  return setupWin
}


// ── Capture receipt as an image ───────────────────────────────────────────────
async function captureReceiptImage(orderId, lang) {
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId)
  if (!order) throw new Error('Order not found')
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(orderId)

  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = {}
  for (const r of rows) settings[r.key] = r.value

  const html = await buildReceiptHTML(order, settings, lang)
  const tmpHtml = path.join(os.tmpdir(), `wa-cap-${Date.now()}.html`)
  fs.writeFileSync(tmpHtml, html, 'utf-8')

  const capWin = new BrowserWindow({
    width: 400, height: 900,
    x: -12000, y: 0,
    show: true, frame: false, skipTaskbar: true, focusable: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })

  try {
    await capWin.loadFile(tmpHtml)
    await delay(600)
    const h = await jsEval(capWin, 'document.body.scrollHeight') || 800
    capWin.setSize(400, Math.min(h + 40, 3500))
    await delay(200)
    return await capWin.webContents.capturePage()
  } finally {
    capWin.destroy()
    try { fs.unlinkSync(tmpHtml) } catch (_) {}
  }
}

// Wait until the chat for the number is open (compose box present), or report why not.
// Returns 'ready' | 'needs-login' | 'invalid-number' | null (timed out)
function waitForChat(win, maxMs = 30000) {
  return poll(async () => jsEval(win, `(function(){
    if (document.querySelector('[data-ref]')) return 'needs-login';
    const txt = (document.body && document.body.innerText) || '';
    if (/phone number shared via url is invalid|رقم الهاتف .*غير صالح/i.test(txt)) return 'invalid-number';
    const SELS = ['[data-testid="conversation-compose-box-input"]','footer div[contenteditable="true"]','div[data-tab][contenteditable="true"]'];
    for (const s of SELS) { if (document.querySelector(s)) return 'ready'; }
    return 'waiting';
  })()`), maxMs, 700)
}

// ── Click the send button ─────────────────────────────────────────────────────
async function clickSend(win, maxMs = 12000) {
  return poll(async () => jsEval(win, `(function(){
    if (document.querySelector('[data-ref]')) return 'needs-login';
    const SELS = ['[data-testid="send"]','button[aria-label="Send"]','button[aria-label="إرسال"]','div[aria-label="Send"]'];
    for (const s of SELS) {
      const btn = document.querySelector(s);
      if (btn && !btn.disabled) { btn.click(); return 'sent'; }
    }
    const icon = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]');
    if (icon) { const btn = icon.closest('button,[role="button"]'); if (btn && !btn.disabled) { btn.click(); return 'sent'; } }
    return 'waiting';
  })()`), maxMs, 600)
}

// Put the image on the clipboard, paste it, then restore whatever the cashier had copied.
async function pasteImage(win, img) {
  const saved = { text: clipboard.readText(), image: clipboard.readImage() }
  try {
    clipboard.writeImage(img)
    await jsEval(win, `(function(){
      const SELS = ['[data-testid="conversation-compose-box-input"]','footer div[contenteditable="true"]','div[data-tab][contenteditable="true"]'];
      for (const s of SELS) { const el = document.querySelector(s); if (el) { el.focus(); return; } }
    })()`)
    await delay(250)
    win.webContents.paste()
    await delay(1800)
  } finally {
    try {
      if (!saved.image.isEmpty()) clipboard.writeImage(saved.image)
      else clipboard.writeText(saved.text || '')
    } catch (_) {}
  }
}

async function sendReceiptOnce(phone, orderId, lang) {
  const win = ensureSenderWindow()
  const [img] = await Promise.all([
    captureReceiptImage(orderId, lang),
    win.loadURL(`${WA_URL}/send?phone=${normPhone(phone)}&app_absent=0`).catch(() => {}),
  ])
  const chat = await waitForChat(win)
  if (chat !== 'ready') return chat || 'timeout'
  await pasteImage(win, img)
  const result = await clickSend(win)
  if (result === 'sent') { await delay(1500); return 'sent' }
  return result || 'send-failed'
}

// ── Receipt queue: one send at a time, so orders placed close together don't collide ──
const queue = []
let busy = false

function broadcast(orderId, status) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (w !== waWin && w !== setupWin && !w.isDestroyed()) w.webContents.send('whatsapp:receipt-status', { orderId, status })
  }
}

function recordStatus(orderId, status) {
  try {
    db.prepare(`UPDATE orders SET whatsapp_status=@s, whatsapp_sent_at=CASE WHEN @s='sent' THEN datetime('now') ELSE whatsapp_sent_at END WHERE id=@id`)
      .run({ s: status, id: orderId })
  } catch (_) {}
  broadcast(orderId, status)
}

async function drain() {
  if (busy) return
  busy = true
  while (queue.length) {
    const job = queue.shift()
    recordStatus(job.orderId, 'sending')
    let status
    try {
      status = await sendReceiptOnce(job.phone, job.orderId, job.lang)
      // One retry for transient problems (slow load, send button not ready)
      if (status === 'timeout' || status === 'send-failed') {
        await delay(2000)
        status = await sendReceiptOnce(job.phone, job.orderId, job.lang)
      }
    } catch (e) { console.error('[whatsapp] receipt send failed:', e.message); status = 'failed' }
    recordStatus(job.orderId, status === 'sent' ? 'sent' : status)
    try { if (waWin && !waWin.isDestroyed()) waWin.loadURL(WA_URL).catch(() => {}) } catch (_) {}
  }
  busy = false
}

/**
 * Queue a receipt to be sent silently to the customer's WhatsApp.
 * Returns the initial status: 'queued' | 'needs-login' | 'no-phone'.
 */
async function enqueueReceipt(orderId, phone, lang = 'en') {
  if (!phone || !String(phone).replace(/\D/g, '')) return 'no-phone'
  // Fail fast if we already know WhatsApp isn't linked
  if (waWin && !waWin.isDestroyed() && waWin.webContents.getURL().includes('web.whatsapp.com')) {
    // Bounded: never let a slow WhatsApp page hold anything up
    const s = await Promise.race([waStatus(waWin), delay(1500).then(() => 'loading')])
    if (s === 'logged-out') { recordStatus(orderId, 'needs-login'); return 'needs-login' }
  }
  if (!queue.some(j => j.orderId === orderId)) queue.push({ orderId, phone, lang })
  recordStatus(orderId, 'queued')
  drain()
  return 'queued'
}

// ── Module ────────────────────────────────────────────────────────────────────
function registerWhatsAppHandlers() {
  // Pre-warm sender window so first real send is faster
  app.whenReady().then(() => {
    try {
      const win = ensureSenderWindow()
      setTimeout(() => win.loadURL(WA_URL).catch(() => {}), 800)
    } catch (_) {}
  })

  // Send (or resend) an order's receipt image. Uses the queue.
  ipcMain.handle('whatsapp:send-receipt', async (_, { phone, orderId, lang = 'en' }) => {
    try {
      const order = db.prepare('SELECT customer_phone FROM orders WHERE id=@id').get({ id: orderId })
      const status = await enqueueReceipt(orderId, phone || order?.customer_phone, lang)
      if (status === 'no-phone') return { error: 'no-phone' }
      if (status === 'needs-login') return { error: 'needs-login' }
      return { data: status }
    } catch (e) { return { error: e.message } }
  })

  // ── Text-only send (Resend button fallback) ───────────────────────────────
  ipcMain.handle('whatsapp:send', async (_, { phone, text }) => {
    try {
      const p = normPhone(phone)
      const win = ensureSenderWindow()
      await win.loadURL(`${WA_URL}/send?phone=${p}&text=${encodeURIComponent(text)}&app_absent=0`).catch(() => {})
      const chat = await waitForChat(win)
      if (chat === 'needs-login') return { error: 'needs-login' }
      if (chat === 'invalid-number') return { error: 'invalid-number' }
      const result = await clickSend(win, 15000)
      if (result === 'sent') { await delay(600); win.loadURL(WA_URL).catch(() => {}); return { data: true } }
      if (result === 'needs-login') return { error: 'needs-login' }
      return { error: 'timeout' }
    } catch (e) { return { error: e.message } }
  })

  // ── Open QR setup window ──────────────────────────────────────────────────
  ipcMain.handle('whatsapp:open-setup', async () => {
    try { await openSetupWindow(); return { data: true } }
    catch (e) { return { error: e.message } }
  })

  ipcMain.handle('whatsapp:close-setup', async () => {
    if (setupWin && !setupWin.isDestroyed()) setupWin.close()
    // Reload the background sender so it picks up the new login session
    try { if (waWin && !waWin.isDestroyed()) waWin.loadURL(WA_URL).catch(() => {}) } catch (_) {}
    return { data: true }
  })

  // ── Status ────────────────────────────────────────────────────────────────
  ipcMain.handle('whatsapp:status', async () => {
    try {
      const win = ensureSenderWindow()
      if (!win.webContents.getURL().includes('web.whatsapp.com')) {
        win.loadURL(WA_URL).catch(() => {})
        return { data: 'loading' }
      }
      const s = await Promise.race([waStatus(win), delay(2000).then(() => 'loading')])
      return { data: s || 'loading' }
    } catch (_) { return { data: 'loading' } }
  })
}

module.exports = registerWhatsAppHandlers
module.exports.enqueueReceipt = enqueueReceipt
