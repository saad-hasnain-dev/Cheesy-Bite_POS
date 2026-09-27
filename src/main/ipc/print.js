const { ipcMain, BrowserWindow, app } = require('electron')
const { db } = require('../database/db')
const QRCode = require('qrcode')
const fs = require('fs')
const path = require('path')
const os = require('os')

let _builtinLogoDataUrl = null
function getBuiltinLogoDataUrl() {
  if (_builtinLogoDataUrl) return _builtinLogoDataUrl
  try {
    const svgPath = path.join(__dirname, '..', 'assets', 'logo.svg')
    const svgContent = fs.readFileSync(svgPath, 'utf-8')
    _builtinLogoDataUrl = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`
  } catch (_) { _builtinLogoDataUrl = '' }
  return _builtinLogoDataUrl
}

function getLogoDataUrl(settings) {
  const customPath = settings.receipt_logo_path || settings.app_logo_path || ''
  if (customPath) {
    try {
      const ext = path.extname(customPath).toLowerCase().slice(1)
      const mimeMap = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
      const mime = mimeMap[ext] || 'image/png'
      const data = fs.readFileSync(customPath)
      const enc = ext === 'svg' ? Buffer.from(data).toString('base64') : data.toString('base64')
      return `data:${mime};base64,${enc}`
    } catch (_) {}
  }
  return getBuiltinLogoDataUrl()
}

async function buildReceiptHTML(order, settings, lang) {
  const isAr = lang === 'ar'
  const dir = isAr ? 'rtl' : 'ltr'
  const cur = settings.currency || 'SAR'
  const items = order.items || []
  const paperWidthMm = parseInt(settings.receipt_paper_width || '80')

  const rows = items.map(i => `
    <tr>
      <td style="padding:2px 0">${isAr ? i.name_ar : i.name_en}</td>
      <td style="text-align:center;padding:2px 4px">${i.qty}</td>
      <td style="text-align:right">${Number(i.unit_price).toFixed(2)}</td>
      <td style="text-align:right">${Number(i.total_price).toFixed(2)}</td>
    </tr>`).join('')

  // Customer info line
  const customerName = order.customer_name || ''
  const customerPhone = order.customer_phone || ''
  const deliveryAddress = order.delivery_address || ''
  const customerSection = (customerName || customerPhone || deliveryAddress) ? `
<div class="d"></div>
${customerName ? `<p>${isAr?'الاسم':'Name'}: <b>${customerName}</b></p>` : ''}
${customerPhone ? `<p>${isAr?'هاتف':'Phone'}: ${customerPhone}</p>` : ''}
${deliveryAddress ? `<p>${isAr?'العنوان':'Address'}: ${deliveryAddress}</p>` : ''}` : ''

  // QR code
  let qrSection = ''
  const bankName = settings.bank_name || ''
  const bankIban = settings.bank_iban || ''
  const bankAccount = settings.bank_account || ''
  const qrUrl = settings.bank_qr_url || ''
  if (qrUrl || bankIban) {
    const qrData = qrUrl || [bankName, bankIban ? `IBAN: ${bankIban}` : '', bankAccount ? `Acct: ${bankAccount}` : ''].filter(Boolean).join('\n')
    try {
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 110, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      qrSection = `
<div class="d"></div>
<div class="c">
<p style="font-size:10px;margin-bottom:3px;font-weight:700">${isAr ? 'الدفع البنكي' : 'Bank Payment'}</p>
<img src="${qrDataUrl}" width="100" style="display:block;margin:0 auto" />
${bankName ? `<p style="font-size:9px;margin-top:2px">${bankName}</p>` : ''}
${bankIban ? `<p style="font-size:9px">IBAN: ${bankIban}</p>` : ''}
</div>`
    } catch (_) {}
  }

  const logoDataUrl = getLogoDataUrl(settings)
  const logoBgHex  = (settings.logo_bg_color || '#000000').replace('#', '')
  const logoBgR    = parseInt(logoBgHex.slice(0,2),16)
  const logoBgG    = parseInt(logoBgHex.slice(2,4),16)
  const logoBgB    = parseInt(logoBgHex.slice(4,6),16)
  const logoBgA    = settings.logo_bg_opacity ?? 1
  const logoBg     = `rgba(${logoBgR},${logoBgG},${logoBgB},${logoBgA})`
  const logoRad    = (settings.logo_border_radius ?? 8) + 'px'
  const logoHtml   = logoDataUrl
    ? `<div class="c" style="margin-bottom:4px"><div style="display:inline-block;background:${logoBg};border-radius:${logoRad};overflow:hidden;line-height:0"><img src="${logoDataUrl}" width="60" height="60" style="object-fit:contain" /></div></div>`
    : ''

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${lang}">
<head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI','Arial','Tahoma',sans-serif;font-size:11px;width:${paperWidthMm}mm;padding:3mm;direction:${dir}}
.c{text-align:center}.b{font-weight:700}.d{border-top:1px dashed #000;margin:4px 0}
table{width:100%;border-collapse:collapse}th{font-size:10px;border-bottom:1px solid #000;padding:2px 0}
.tot{font-size:13px;font-weight:700}
@media print{@page{margin:0;size:${paperWidthMm}mm auto}body{padding:0}}
</style></head>
<body>
${logoHtml}
<p class="c b" style="font-size:15px">${isAr ? (settings.restaurant_name_ar||'') : (settings.restaurant_name_en||'Cheesy Bite')}</p>
<p class="c">${isAr ? (settings.address_ar||'') : (settings.address_en||'')}</p>
${settings.vat_number ? `<p class="c">${isAr?'رقم الضريبة':'VAT No'}: ${settings.vat_number}</p>` : ''}
${settings.phone ? `<p class="c">${isAr?'هاتف':'Tel'}: ${settings.phone}</p>` : ''}
<div class="d"></div>
<p>${isAr?'رقم الطلب':'Order'}: <b>${order.order_number}</b></p>
<p>${isAr?'التاريخ':'Date'}: ${new Date(String(order.created_at).replace(' ', 'T') + 'Z').toLocaleString(isAr?'ar-SA':'en-US')}</p>
<p>${isAr?'نوع الطلب':'Type'}: ${order.order_type}${order.table_number?' | '+(isAr?'طاولة':'Table')+' '+order.table_number:''}</p>
<p>${isAr?'الدفع':'Payment'}: ${order.payment_method}</p>
${customerSection}
<div class="d"></div>
<table>
<tr>
  <th style="text-align:${isAr?'right':'left'}">${isAr?'الصنف':'Item'}</th>
  <th>${isAr?'كمية':'Qty'}</th>
  <th style="text-align:right">${isAr?'سعر':'Price'}</th>
  <th style="text-align:right">${isAr?'مجموع':'Total'}</th>
</tr>
${rows}
</table>
<div class="d"></div>
<table>
<tr><td>${isAr?'المجموع الجزئي':'Subtotal'}</td><td style="text-align:right">${Number(order.subtotal).toFixed(2)} ${cur}</td></tr>
${order.discount_amount>0?`<tr><td>${isAr?'خصم':'Discount'}</td><td style="text-align:right">-${Number(order.discount_amount).toFixed(2)} ${cur}</td></tr>`:''}
<tr><td>${isAr?'ضريبة القيمة المضافة':'VAT'} ${Math.round((order.vat_rate ?? 0.15) * 100)}%</td><td style="text-align:right">${Number(order.vat_amount).toFixed(2)} ${cur}</td></tr>
<tr class="d"><td></td><td></td></tr>
<tr class="tot"><td>${isAr?'الإجمالي':'TOTAL'}</td><td style="text-align:right">${Number(order.total).toFixed(2)} ${cur}</td></tr>
${order.amount_tendered?`<tr><td>${isAr?'المدفوع':'Tendered'}</td><td style="text-align:right">${Number(order.amount_tendered).toFixed(2)} ${cur}</td></tr>`:''}
${order.change_due>0?`<tr><td>${isAr?'الباقي':'Change'}</td><td style="text-align:right">${Number(order.change_due).toFixed(2)} ${cur}</td></tr>`:''}
</table>
${qrSection}
<div class="d"></div>
<p class="c">${isAr?(settings.receipt_footer_ar||''):(settings.receipt_footer_en||'Thank you!')}</p>
</body></html>`
}

const VIRTUAL_KEYWORDS = ['pdf', 'xps', 'fax', 'onenote', 'send to', 'microsoft print', 'adobe', 'bullzip', 'dopdf', 'cutepdf', 'foxit', 'print to file']

function isVirtual(name) {
  if (!name) return false
  const l = name.toLowerCase()
  return VIRTUAL_KEYWORDS.some(k => l.includes(k))
}

// Works with Electron 22+ (getPrintersAsync) and older (getPrinters sync/async)
async function listPrinters(webContents) {
  try {
    if (typeof webContents.getPrintersAsync === 'function') {
      return await webContents.getPrintersAsync()
    }
    if (typeof webContents.getPrinters === 'function') {
      const r = webContents.getPrinters()
      return Array.isArray(r) ? r : await r
    }
  } catch (_) {}
  return []
}

// Find best real printer: preferred name → first non-virtual → null (all virtual)
function pickPrinter(printers, preferredName) {
  if (preferredName) {
    const p = printers.find(p => p.name === preferredName)
    if (p && !isVirtual(p.name)) return p.name
  }
  const real = printers.find(p => !isVirtual(p.name))
  if (real) return real.name
  return null // no real printer found
}

module.exports = registerPrintHandlers
module.exports.buildReceiptHTML = buildReceiptHTML

function registerPrintHandlers() {
  ipcMain.handle('print:receipt', async (event, { orderId, lang = 'en' }) => {
    try {
      const order = db.prepare('SELECT * FROM orders WHERE id=@id').get({ id: orderId })
      if (!order) return { error: 'Order not found' }
      order.items = db.prepare('SELECT * FROM order_items WHERE order_id=@order_id').all({ order_id: orderId })

      const settingsRows = db.prepare('SELECT key, value FROM settings').all()
      const settings = {}
      for (const r of settingsRows) settings[r.key] = r.value

      const preferredPrinter = settings.default_printer || ''
      const copies = Math.max(1, parseInt(settings.print_copies || '1'))

      // ── Resolve the printer name to use ─────────────────────────────────
      // Priority: 1) user-configured printer  2) first real printer found
      //           3) system default (app.getDefaultPrinterName)
      let deviceName = ''
      const allPrinters = await listPrinters(event.sender)

      if (preferredPrinter && !isVirtual(preferredPrinter)) {
        deviceName = preferredPrinter
      } else {
        const real = allPrinters.find(p => !isVirtual(p.name))
        if (real) {
          deviceName = real.name
        } else {
          const sysDefault = typeof app.getDefaultPrinterName === 'function'
            ? (app.getDefaultPrinterName() || '')
            : ''
          deviceName = isVirtual(sysDefault) ? '' : sysDefault
        }
      }
      // ────────────────────────────────────────────────────────────────────

      // Also send the receipt silently to the customer's WhatsApp (queued, never blocks printing)
      const waPromise = (settings.whatsapp_auto_send !== '0' && order.customer_phone && order.whatsapp_status !== 'sent')
        ? require('./whatsapp').enqueueReceipt(order.id, order.customer_phone, lang).catch(() => 'failed')
        : Promise.resolve('off')

      const html = await buildReceiptHTML(order, settings, lang)
      const tmpFile = path.join(os.tmpdir(), `cb-receipt-${Date.now()}.html`)
      fs.writeFileSync(tmpFile, html, 'utf-8')

      const printResult = await new Promise((resolve) => {
        // Positioned off-screen (x: -10000) so the compositor sees it (required
        // for Windows printing) but it never appears on the user's visible desktop.
        // skipTaskbar + frame:false make it truly invisible to the user.
        const win = new BrowserWindow({
          width: 600, height: 400,
          x: -10000, y: 0,
          show: true,
          frame: false,
          skipTaskbar: true,
          focusable: false,
          webPreferences: { nodeIntegration: false, contextIsolation: true }
        })

        let settled = false
        const finish = (result) => {
          if (settled) return
          settled = true
          try { win.destroy() } catch (_) {}
          try { fs.unlinkSync(tmpFile) } catch (_) {}
          resolve(result)
        }

        win.loadFile(tmpFile)

        win.webContents.once('did-finish-load', () => {
          setTimeout(() => {
            win.webContents.print(
              {
                // Always silent — no Windows print dialog ever shown.
                // If deviceName is empty the OS default printer is used.
                silent: true,
                deviceName: deviceName || '',
                copies,
                printBackground: true,
              },
              (success, errorType) => finish(success ? { data: true } : { error: errorType || 'Print failed' })
            )
          }, 500)
        })

        // 60s timeout — enough time for a user to interact with the print dialog
        setTimeout(() => finish({ error: 'timeout' }), 60000)
      })
      const whatsapp = await waPromise
      return { ...printResult, whatsapp }
    } catch (e) { return { error: e.message } }
  })
}
