import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer, Banknote, CreditCard, Shuffle, Receipt as ReceiptIcon, ChevronDown } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { cn } from '../ui/cn'
import logoUrl from '../../assets/logo.svg'
import { itemEffectivePrice } from '../../store/cartStore'
import { ORDER_LABELS } from './CartPanel'

// Paper-receipt mock-up: styled inline on purpose so it mirrors the printed receipt.
function ReceiptLogo({ settings }) {
  const logoSrc = settings.receipt_logo_path
    ? `file://${settings.receipt_logo_path}`
    : settings.app_logo_path
      ? `file://${settings.app_logo_path}`
      : logoUrl
  const bgColor = settings.logo_bg_color || '#000000'
  const radius  = Number(settings.logo_border_radius ?? 8)
  const opacity = Number(settings.logo_bg_opacity ?? 1)
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
  const bg = `rgba(${r},${g},${b},${opacity})`
  return (
    <div style={{ textAlign: 'center', marginBottom: 8 }}>
      <div style={{
        width: 56, height: 56, borderRadius: radius + 'px',
        background: bg, overflow: 'hidden',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <img src={logoSrc} alt="Logo" style={{ width: 56, height: 56, objectFit: 'contain' }}
          onError={e => { e.target.src = logoUrl }} />
      </div>
    </div>
  )
}

function ReceiptPreview({ cart, settings, payMethod, tendered, qrDataUrl, isAr }) {
  const cur = settings.currency || 'SAR'
  const changeDue = payMethod === 'cash' && tendered
    ? Math.max(0, Number(tendered) - cart.total)
    : 0

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(16,24,40,0.08)',
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: 11,
      lineHeight: 1.5,
    }}>
      <div style={{ padding: '18px 16px' }}>

        {/* Header: logo + restaurant info */}
        <ReceiptLogo settings={settings} />
        <div style={{ textAlign: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'sans-serif' }}>
            {settings.restaurant_name_en || 'Cheesy Bite'}
          </div>
          {settings.restaurant_name_ar && (
            <div dir="rtl" style={{ fontSize: 11, color: '#52525b', fontFamily: 'sans-serif' }}>
              {settings.restaurant_name_ar}
            </div>
          )}
          {settings.address_en && (
            <div style={{ fontSize: 10, color: '#71717a', marginTop: 2 }}>{settings.address_en}</div>
          )}
          {settings.address_ar && (
            <div dir="rtl" style={{ fontSize: 10, color: '#71717a' }}>{settings.address_ar}</div>
          )}
          {settings.phone && (
            <div style={{ fontSize: 10, color: '#71717a' }}>Tel: {settings.phone}</div>
          )}
          {settings.vat_number && (
            <div style={{ fontSize: 10, color: '#71717a' }}>VAT No: {settings.vat_number}</div>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />

        {/* Order info */}
        <div style={{ fontSize: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#71717a' }}>Date</span>
            <span>{new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#71717a' }}>Type</span>
            <span>{ORDER_LABELS[cart.orderType]}{cart.tableNumber ? ` · T${cart.tableNumber}` : ''}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#71717a' }}>Payment</span>
            <span style={{ textTransform: 'capitalize' }}>{payMethod}</span>
          </div>
          {cart.customerName && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#71717a' }}>Customer</span>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cart.customerName}</span>
            </div>
          )}
          {cart.customerPhone && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#71717a' }}>Phone</span>
              <span>{cart.customerPhone}</span>
            </div>
          )}
          {cart.deliveryAddress && (
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ color: '#71717a', flexShrink: 0 }}>Address</span>
              <span style={{ textAlign: 'right' }}>{cart.deliveryAddress}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />

        {/* Items table */}
        <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e4e4e7' }}>
              <th style={{ textAlign: 'left', paddingBottom: 4, color: '#52525b', fontWeight: 600 }}>Item</th>
              <th style={{ textAlign: 'center', paddingBottom: 4, color: '#52525b', fontWeight: 600 }}>Qty</th>
              <th style={{ textAlign: 'right', paddingBottom: 4, color: '#52525b', fontWeight: 600 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {cart.items.map(item => (
              <tr key={item.id}>
                <td style={{ paddingTop: 3, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isAr ? item.name_ar : item.name_en}
                </td>
                <td style={{ textAlign: 'center', paddingTop: 3 }}>{item.qty}</td>
                <td style={{ textAlign: 'right', paddingTop: 3 }}>{(itemEffectivePrice(item) * item.qty).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />

        {/* Totals */}
        <div style={{ fontSize: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#71717a' }}>Subtotal</span>
            <span>{Number(cart.subtotal).toFixed(2)} {cur}</span>
          </div>
          {cart.discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
              <span>Discount ({cart.discountPct}%)</span>
              <span>-{Number(cart.discountAmount).toFixed(2)} {cur}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#71717a' }}>VAT {Math.round((cart.vatRate ?? 0.15) * 100)}%</span>
            <span>{Number(cart.vatAmount).toFixed(2)} {cur}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, marginTop: 4, paddingTop: 4, borderTop: '2px solid #000' }}>
            <span>TOTAL</span>
            <span>{Number(cart.total).toFixed(2)} {cur}</span>
          </div>
          {payMethod === 'cash' && tendered && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', marginTop: 2 }}>
                <span>Tendered</span><span>{Number(tendered).toFixed(2)} {cur}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 600 }}>
                <span>Change</span><span>{changeDue.toFixed(2)} {cur}</span>
              </div>
            </>
          )}
        </div>

        {/* QR Code */}
        {qrDataUrl && (
          <>
            <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, color: '#71717a', fontFamily: 'sans-serif' }}>
                Bank Payment
              </div>
              <img src={qrDataUrl} width="84" style={{ display: 'block', margin: '0 auto', borderRadius: 4 }} />
              {settings.bank_name && (
                <div style={{ fontSize: 9, marginTop: 3, color: '#71717a' }}>{settings.bank_name}</div>
              )}
              {settings.bank_iban && (
                <div style={{ fontSize: 9, color: '#71717a' }}>IBAN: {settings.bank_iban}</div>
              )}
              {settings.bank_account && (
                <div style={{ fontSize: 9, color: '#71717a' }}>Acct: {settings.bank_account}</div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 10, color: '#71717a', fontFamily: 'sans-serif' }}>
          {settings.receipt_footer_en || 'Thank you for your visit!'}
        </div>
        {settings.receipt_footer_ar && (
          <div dir="rtl" style={{ textAlign: 'center', fontSize: 10, color: '#71717a', fontFamily: 'sans-serif' }}>
            {settings.receipt_footer_ar}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, strong, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3', strong ? 'text-base font-semibold text-ink' : 'text-sm text-ink-3', className)}>
      <span>{label}</span><span className="tabular">{value}</span>
    </div>
  )
}

export default function ConfirmPrintModal({ open, onClose, cart, onConfirm, placing }) {
  const { i18n } = useTranslation()
  const isAr = i18n.language === 'ar'

  const [payMethod, setPayMethod] = useState('cash')
  const [tendered, setTendered] = useState('')
  const [settings, setSettings] = useState({})
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!open) return
    setPayMethod('cash')
    setTendered('')
    setQrDataUrl('')
    setShowPreview(false)
    loadSettings()
  }, [open])

  const loadSettings = async () => {
    const res = await window.api.invoke('settings:get-all')
    if (!res.data) return
    const s = res.data
    setSettings(s)
    const qrUrl = s.bank_qr_url || ''
    const bankIban = s.bank_iban || ''
    const bankName = s.bank_name || ''
    if (qrUrl || bankIban) {
      const qrData = qrUrl || [bankName, bankIban ? `IBAN: ${bankIban}` : ''].filter(Boolean).join('\n')
      try {
        const QRCode = (await import('qrcode')).default
        const url = await QRCode.toDataURL(qrData, { width: 96, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        setQrDataUrl(url)
      } catch (_) {}
    }
  }

  const cur = settings.currency || 'SAR'
  const fmt = (n) => `${Number(n || 0).toFixed(2)} ${cur}`
  const changeDue = payMethod === 'cash' && tendered
    ? Math.max(0, Number(tendered) - cart.total)
    : 0
  const short = payMethod === 'cash' && tendered !== '' && Number(tendered) < cart.total

  // Quick cash amounts: exact, then the next round notes above the total
  const quickCash = [...new Set([
    Number(cart.total.toFixed(2)),
    Math.ceil(cart.total / 10) * 10,
    Math.ceil(cart.total / 50) * 50,
    Math.ceil(cart.total / 100) * 100,
  ])].filter(v => v >= cart.total).slice(0, 4)

  const confirm = () => onConfirm({ payMethod, tendered, changeDue, print: true })
  const typeLabel = `${ORDER_LABELS[cart.orderType]}${cart.tableNumber ? ` · Table ${cart.tableNumber}` : ''}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Checkout"
      description={`${cart.items.reduce((a, i) => a + i.qty, 0)} items · ${typeLabel}`}
      width="max-w-4xl"
      bodyClassName="p-0"
      footer={
        <>
          <Button variant="secondary" size="lg" onClick={onClose} className="sm:w-32">Cancel</Button>
          <Button
            size="lg"
            loading={placing}
            disabled={placing || !cart.items.length || short}
            onClick={confirm}
            leftIcon={<Printer size={16} />}
            className="sm:min-w-[220px]"
          >
            {placing ? 'Processing…' : `Confirm & pay ${fmt(cart.total)}`}
          </Button>
        </>
      }
    >
      <div className="grid md:grid-cols-[1fr_320px]">
        {/* Payment */}
        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-2 text-[13px] font-medium text-ink-2">Payment method</h3>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
              {[
                { id: 'cash', label: 'Cash', Icon: Banknote },
                { id: 'card', label: 'Card', Icon: CreditCard },
                { id: 'split', label: 'Split', Icon: Shuffle },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={payMethod === id}
                  onClick={() => setPayMethod(id)}
                  className={cn(
                    'flex h-16 flex-col items-center justify-center gap-1 rounded-lg border text-sm font-medium transition-colors',
                    payMethod === id ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
                  )}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </section>

          {payMethod === 'cash' && (
            <section className="space-y-3">
              <Input
                label="Amount received"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder={cart.total.toFixed(2)}
                value={tendered}
                onChange={e => setTendered(e.target.value)}
                error={short ? `Amount is less than the total (${fmt(cart.total)})` : undefined}
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                {quickCash.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTendered(String(v))}
                    className={cn(
                      'h-8 rounded-md border px-3 text-[13px] font-medium tabular transition-colors',
                      Number(tendered) === v ? 'border-ink bg-ink text-white' : 'border-line text-ink-2 hover:border-line-strong hover:text-ink'
                    )}
                  >
                    {v === Number(cart.total.toFixed(2)) ? 'Exact' : v.toFixed(0)}
                  </button>
                ))}
              </div>
              {tendered && !short && (
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800">
                  <span className="text-sm font-medium">Change due</span>
                  <span className="text-lg font-semibold tabular">{fmt(changeDue)}</span>
                </div>
              )}
            </section>
          )}

          {(cart.customerName || cart.customerPhone || cart.deliveryAddress) && (
            <section className="rounded-lg bg-muted px-4 py-3 text-sm">
              <h3 className="mb-1.5 text-[13px] font-medium text-ink-2">Customer</h3>
              {cart.customerName && <p className="font-medium text-ink">{cart.customerName}</p>}
              {cart.customerPhone && <p className="text-ink-2 tabular">{cart.customerPhone}</p>}
              {cart.deliveryAddress && <p className="text-ink-2">{cart.deliveryAddress}</p>}
            </section>
          )}

          <section className="space-y-1.5 border-t border-line pt-4">
            <SummaryRow label="Subtotal" value={fmt(cart.subtotal)} />
            {cart.discountAmount > 0 && (
              <SummaryRow label={`Discount (${cart.discountPct}%)`} value={`−${fmt(cart.discountAmount)}`} className="text-red-600" />
            )}
            {cart.vatEnabled && <SummaryRow label={`VAT ${Math.round((cart.vatRate ?? 0.15) * 100)}%`} value={fmt(cart.vatAmount)} />}
            <SummaryRow strong label="Total" value={fmt(cart.total)} className="pt-2 text-lg" />
          </section>

          <button
            type="button"
            onClick={() => setShowPreview(v => !v)}
            aria-expanded={showPreview}
            className="flex w-full items-center justify-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink md:hidden"
          >
            <ReceiptIcon size={14} /> {showPreview ? 'Hide' : 'Show'} receipt preview
            <ChevronDown size={14} className={cn('transition-transform', showPreview && 'rotate-180')} />
          </button>
        </div>

        {/* Receipt preview */}
        <div className={cn('border-line bg-muted p-5 md:block md:border-s', showPreview ? 'block border-t' : 'hidden')}>
          <p className="mb-3 text-[13px] font-medium text-ink-2">Receipt preview</p>
          <ReceiptPreview
            cart={cart}
            settings={settings}
            payMethod={payMethod}
            tendered={tendered}
            qrDataUrl={qrDataUrl}
            isAr={isAr}
          />
        </div>
      </div>
    </Modal>
  )
}
