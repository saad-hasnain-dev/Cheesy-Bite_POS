import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Save, Lock, Printer, CreditCard, Palette, ImagePlus, X, Store,
  ReceiptText, RotateCcw, Zap, ShieldCheck, Database, Receipt,
  Percent, Eye, EyeOff, MessageCircle, Wifi, WifiOff, KeyRound,
} from 'lucide-react'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Switch from '../components/ui/Switch'
import Input, { Field, Select } from '../components/ui/Input'
import { cn } from '../components/ui/cn'
import { useSettingsStore, hexToRgba } from '../store/settingsStore'
import { useToast } from '../components/ui/Toast'
import { setLanguage } from '../i18n/index'
import logoUrl from '../assets/logo.svg'

const SECTIONS = [
  { id: 'restaurant', label: 'Restaurant',     icon: Store },
  { id: 'pos',        label: 'POS behaviour',  icon: Zap },
  { id: 'tax',        label: 'Tax & charges',  icon: Percent },
  { id: 'printing',   label: 'Printing',       icon: Printer },
  { id: 'receipt',    label: 'Receipt',        icon: Receipt },
  { id: 'payment',    label: 'Bank & payment', icon: CreditCard },
  { id: 'whatsapp',   label: 'WhatsApp',       icon: MessageCircle },
  { id: 'branding',   label: 'Branding',       icon: Palette },
  { id: 'security',   label: 'Security',       icon: ShieldCheck },
  { id: 'data',       label: 'Data & backup',  icon: Database },
]

function Section({ id, title, description, icon: Icon, children, badge }) {
  return (
    <Card as="section" id={`settings-${id}`} aria-labelledby={`settings-${id}-title`} className="scroll-mt-4">
      <div className="flex items-start gap-3 border-b border-line px-4 py-4 sm:px-6">
        {Icon && <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-ink-2"><Icon size={16} /></span>}
        <div className="min-w-0 flex-1">
          <h2 id={`settings-${id}-title`} className="flex items-center gap-2 text-sm font-semibold text-ink">{title}{badge}</h2>
          {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
        </div>
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </Card>
  )
}

/** Label + description on the left, control on the right; stacks on phones. */
function Row({ label, hint, children, inactive }) {
  return (
    <div className={cn('flex flex-col gap-2 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6', inactive && 'opacity-60')}>
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">{label}{inactive && <Badge tone="neutral">Not active yet</Badge>}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-3">{hint}</p>}
      </div>
      <div className="shrink-0 sm:min-w-[180px] sm:text-end">{children}</div>
    </div>
  )
}

function Rows({ children }) {
  return <div className="divide-y divide-line">{children}</div>
}

function Note({ children }) {
  return <p className="mt-4 rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-ink-2">{children}</p>
}

function LogoUpload({ label, hint, value, onChange }) {
  const [preview, setPreview] = useState(value ? `file://${value}` : null)
  useEffect(() => { setPreview(value ? `file://${value}` : null) }, [value])
  const pick = async () => {
    const res = await window.api.invoke('settings:pick-logo')
    if (res.data) onChange(res.data)
  }
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-muted">
          {preview ? <img src={preview} alt="" className="h-14 w-14 object-contain" onError={() => setPreview(null)} /> : <ImagePlus size={18} className="text-ink-3" />}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={pick}>{preview ? 'Replace' : 'Choose image'}</Button>
          {preview && <Button size="sm" variant="ghost" onClick={() => onChange('')} leftIcon={<X size={14} />}>Remove</Button>}
        </div>
      </div>
    </Field>
  )
}

function ColorField({ label, hint, value, onChange }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <label className="relative h-9 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line">
          <span className="sr-only">{label}</span>
          <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] cursor-pointer" />
        </label>
        <code className="text-xs font-medium text-ink-2">{value}</code>
      </div>
    </Field>
  )
}

function Range({ label, value, min, max, step = 1, unit = '', onChange }) {
  return (
    <Field label={<span className="flex justify-between"><span>{label}</span><span className="text-ink tabular">{value}{unit}</span></span>}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} className="w-full cursor-pointer accent-[#18181b]" aria-label={label} />
    </Field>
  )
}

function PasswordInput({ value, onChange, placeholder, onEnter, label }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} aria-label={label || placeholder} placeholder={placeholder} value={value}
        onChange={onChange} onKeyDown={e => e.key === 'Enter' && onEnter?.()} inputClassName="pe-10" />
      <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink">
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const loadSettings  = useSettingsStore(s => s.load)
  const applyBranding = useSettingsStore(s => s.applyBranding)

  const [settings,       setSettings]     = useState({})
  const [printers,       setPrinters]     = useState([])
  const [saving,         setSaving]       = useState(false)
  const [newPass,        setNewPass]      = useState('')
  const [confirmPass,    setConfirmPass]  = useState('')
  const [showNewPass,    setShowNewPass]  = useState(false)
  const [changingPass,   setChangingPass] = useState(false)
  const [resettingPass,  setResettingPass]= useState(false)
  const [stats,          setStats]        = useState({ orderCount: 0, revenue: 0, itemCount: 0 })
  const [backingUp,      setBackingUp]    = useState(false)
  // Branding lock — only this section requires password
  const [brandingLocked, setBrandingLocked] = useState(true)
  const [brandingPass,   setBrandingPass]   = useState('')
  const [brandingErr,    setBrandingErr]    = useState('')
  const [checkingPass,   setCheckingPass]   = useState(false)
  // WhatsApp
  const [waStatus,       setWaStatus]       = useState('loading')
  const [waConnecting,   setWaConnecting]   = useState(false)
  const [dirty,          setDirty]          = useState(false)

  const load = async () => {
    const [res, pRes, stRes] = await Promise.all([
      window.api.invoke('settings:get-all'),
      window.api.invoke('printers:list'),
      window.api.invoke('settings:get-stats'),
    ])
    if (res.data)   { setSettings(res.data); setDirty(false) }
    if (pRes.data)  setPrinters(pRes.data)
    if (stRes.data) setStats(stRes.data)
    // Check WhatsApp status in background
    window.api.invoke('whatsapp:status').then(r => {
      if (r?.data) setWaStatus(r.data)
    })
  }

  const connectWhatsApp = async () => {
    setWaConnecting(true)
    await window.api.invoke('whatsapp:open-setup')
    // Poll for login status
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const r = await window.api.invoke('whatsapp:status')
      if (r?.data === 'logged-in') {
        setWaStatus('logged-in')
        setWaConnecting(false)
        await window.api.invoke('whatsapp:close-setup')
        clearInterval(poll)
        toast('WhatsApp connected! Receipts will be sent automatically.', 'success')
      }
      if (attempts >= 120) { // 2 minutes timeout
        setWaConnecting(false)
        clearInterval(poll)
      }
    }, 1000)
  }

  const disconnectWhatsApp = async () => {
    setWaStatus('loading')
    await window.api.invoke('whatsapp:close-setup')
    setWaStatus('logged-out')
    toast('WhatsApp disconnected', 'info')
  }

  const unlockBranding = async () => {
    if (!brandingPass) { setBrandingErr('Enter the admin password'); return }
    setCheckingPass(true); setBrandingErr('')
    try {
      const res = await window.api.invoke('settings:verify-password', { password: brandingPass })
      if (res.data) { setBrandingLocked(false); setBrandingPass('') }
      else setBrandingErr('Incorrect password')
    } finally { setCheckingPass(false) }
  }

  const backupDb = async () => {
    setBackingUp(true)
    try {
      const res = await window.api.invoke('settings:backup-db')
      if (res.data) toast(`Backup saved to ${res.data}`, 'success')
      else if (res.error) toast(res.error, 'error')
    } finally { setBackingUp(false) }
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => { setSettings(s => ({ ...s, [k]: v })); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try {
      const res = await window.api.invoke('settings:set-many', settings)
      if (res.error) { toast(res.error, 'error'); return }
      toast(t('settings.saved'), 'success')
      setDirty(false)
      setLanguage(settings.default_language || 'en')
      applyBranding(settings.accent_color || '#c1fbd4', settings.sidebar_color || '#000000')
      await window.api.invoke('settings:set-window-title', settings.restaurant_name_en || 'Cheesy Bite POS')
      if (settings.app_logo_path) await window.api.invoke('settings:update-app-icon', settings.app_logo_path)
      loadSettings()
    } finally { setSaving(false) }
  }

  const changePassword = async () => {
    if (!newPass) { toast('Enter a new password', 'error'); return }
    if (newPass.length < 4) { toast('Password must be at least 4 characters', 'error'); return }
    if (newPass !== confirmPass) { toast('Passwords do not match', 'error'); return }
    setChangingPass(true)
    try {
      const res = await window.api.invoke('settings:set-password', { newPassword: newPass })
      if (res.error) { toast(res.error, 'error'); return }
      toast('Password changed!', 'success')
      setNewPass(''); setConfirmPass('')
    } finally { setChangingPass(false) }
  }

  const resetPassword = async () => {
    if (!confirm('Reset password to default "cheesy2024"?')) return
    setResettingPass(true)
    try {
      const res = await window.api.invoke('settings:reset-password')
      if (res.error) { toast(res.error, 'error'); return }
      toast('Password reset to "cheesy2024"', 'success')
    } finally { setResettingPass(false) }
  }

  const toggle = (key, onWhenNotZero = true) => onWhenNotZero
    ? { checked: settings[key] !== '0', onChange: v => set(key, v ? '1' : '0') }
    : { checked: settings[key] === '1', onChange: v => set(key, v ? '1' : '0') }
  const cur = settings.currency || 'SAR'
  const jump = (id) => document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header title={t('settings.title')} />

      {/* Section tabs — phones and tablets */}
      <nav aria-label="Settings sections" className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b border-line bg-surface px-3 py-2.5 lg:hidden">
        {SECTIONS.map(s => (
          <button key={s.id} type="button" onClick={() => jump(s.id)}
            className="h-8 shrink-0 whitespace-nowrap rounded-full bg-muted px-3 text-[13px] font-medium text-ink-2 hover:text-ink">
            {s.label}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-6xl gap-8 p-3 sm:p-6">
          {/* Section menu — desktop */}
          <nav aria-label="Settings sections" className="sticky top-0 hidden h-fit w-52 shrink-0 space-y-0.5 lg:block">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => jump(id)}
                className="flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-start text-sm text-ink-2 hover:bg-surface hover:text-ink">
                <Icon size={16} className="text-ink-3" /> {label}
              </button>
            ))}
          </nav>

          <div className={cn('min-w-0 flex-1 space-y-4 sm:space-y-5', dirty && 'pb-24')}>
            {/* Restaurant */}
            <Section id="restaurant" icon={Store} title={t('settings.restaurant')} description="Shown in the app and printed on every receipt.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('settings.nameEn')} value={settings.restaurant_name_en || ''} onChange={e => set('restaurant_name_en', e.target.value)} />
                <Input label={t('settings.nameAr')} dir="rtl" value={settings.restaurant_name_ar || ''} onChange={e => set('restaurant_name_ar', e.target.value)} />
                <Input label={t('settings.vatNumber')} inputMode="numeric" value={settings.vat_number || ''} onChange={e => set('vat_number', e.target.value)} />
                <Input label={t('settings.currency')} placeholder="SAR" value={settings.currency || ''} onChange={e => set('currency', e.target.value)} />
                <Input label={t('settings.phone')} type="tel" value={settings.phone || ''} onChange={e => set('phone', e.target.value)} />
                <Input label={t('settings.email')} type="email" value={settings.email || ''} onChange={e => set('email', e.target.value)} />
                <Input label={t('settings.addressEn')} value={settings.address_en || ''} onChange={e => set('address_en', e.target.value)} />
                <Input label={t('settings.addressAr')} dir="rtl" value={settings.address_ar || ''} onChange={e => set('address_ar', e.target.value)} />
                <Input label={t('settings.footerEn')} value={settings.receipt_footer_en || ''} onChange={e => set('receipt_footer_en', e.target.value)} />
                <Input label={t('settings.footerAr')} dir="rtl" value={settings.receipt_footer_ar || ''} onChange={e => set('receipt_footer_ar', e.target.value)} />
                <Select label={t('settings.language')} value={settings.default_language || 'en'} onChange={e => set('default_language', e.target.value)}>
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </Select>
              </div>
            </Section>

            {/* POS behaviour */}
            <Section id="pos" icon={Zap} title="POS behaviour" description="Defaults applied every time the POS opens.">
              <Rows>
                <Row label="Default order type" hint="Pre-selected at the till; staff can still change it.">
                  <Select aria-label="Default order type" value={settings.default_order_type || 'dine-in'} onChange={e => set('default_order_type', e.target.value)}>
                    <option value="dine-in">Dine-in</option>
                    <option value="takeaway">Takeaway</option>
                    <option value="delivery">Delivery</option>
                    <option value="drive-through">Drive-through</option>
                  </Select>
                </Row>
                <Row label="Cashier name" hint="Saved with each order for your records.">
                  <Input aria-label="Cashier name" placeholder="e.g. Ahmed" value={settings.cashier_name || ''} onChange={e => set('cashier_name', e.target.value)} />
                </Row>
                <Row label="Quick discount buttons" hint="Comma-separated percentages shown in the order panel.">
                  <Input aria-label="Quick discount buttons" placeholder="5,10,15,20" value={settings.quick_discounts || '5,10,15,20'} onChange={e => set('quick_discounts', e.target.value)} />
                </Row>
                <Row label="Clear order after checkout" hint="Start a fresh order automatically." inactive>
                  <Switch disabled {...toggle('auto_clear_cart')} />
                </Row>
                <Row label="Round the total" hint="Round the final amount to simplify change." inactive>
                  <Select aria-label="Total rounding" disabled value={settings.total_rounding || '0'} onChange={e => set('total_rounding', e.target.value)}>
                    <option value="0">No rounding</option>
                    <option value="0.5">Nearest 0.5 {cur}</option>
                    <option value="1">Nearest 1 {cur}</option>
                    <option value="5">Nearest 5 {cur}</option>
                  </Select>
                </Row>
              </Rows>
            </Section>

            {/* Tax */}
            <Section id="tax" icon={Percent} title="Tax & charges" description="Individual items can also be marked VAT-exempt on the Menu page.">
              <Rows>
                <Row label="Charge VAT" hint="When off, no tax is added to any order.">
                  <Switch {...toggle('vat_enabled')} />
                </Row>
                {settings.vat_enabled !== '0' && (
                  <Row label="VAT rate" hint="Saudi Arabia standard rate is 15%.">
                    <div className="flex items-center gap-2 sm:justify-end">
                      <Input aria-label="VAT rate percent" type="number" inputMode="decimal" min="0" max="100" step="0.1" inputClassName="w-24 text-end"
                        value={Math.round(parseFloat(settings.vat_rate ?? '0.15') * 1000) / 10}
                        onChange={e => set('vat_rate', String(Number(e.target.value) / 100))} />
                      <span className="text-sm text-ink-3">%</span>
                    </div>
                  </Row>
                )}
                <Row label="Service charge" hint="Adds a percentage on top of the subtotal." inactive>
                  <Switch disabled {...toggle('service_charge_enabled', false)} />
                </Row>
              </Rows>
            </Section>

            {/* Printing */}
            <Section id="printing" icon={Printer} title="Printing">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label={t('settings.printer')} value={settings.default_printer || ''} onChange={e => set('default_printer', e.target.value)} className="sm:col-span-2">
                  <option value="">System default printer</option>
                  {printers.map(p => <option key={p.name} value={p.name}>{p.name}{p.isDefault ? ' (default)' : ''}</option>)}
                </Select>
                <Input label={t('settings.copies')} type="number" min="1" max="5" value={settings.print_copies || '1'} onChange={e => set('print_copies', e.target.value)} />
                <Select label="Paper width" value={settings.receipt_paper_width || '80'} onChange={e => set('receipt_paper_width', e.target.value)}>
                  <option value="80">80 mm (standard)</option>
                  <option value="58">58 mm (narrow)</option>
                </Select>
              </div>
              <div className="mt-5 border-t border-line pt-4">
                <Switch label="Print receipt automatically" description="Send to the printer as soon as an order is confirmed." {...toggle('auto_print_receipt')} />
              </div>
            </Section>

            {/* Receipt */}
            <Section id="receipt" icon={Receipt} title="Receipt content">
              <Rows>
                <Row label="Show cashier name" inactive><Switch disabled {...toggle('receipt_show_cashier')} /></Row>
                <Row label="Show customer phone" inactive><Switch disabled {...toggle('receipt_show_phone')} /></Row>
                <Row label="Show payment QR code" inactive><Switch disabled {...toggle('receipt_show_qr')} /></Row>
              </Rows>
              <Note>These options are saved but the printed receipt doesn't use them yet. The QR code currently appears whenever bank details are filled in.</Note>
            </Section>

            {/* Payment */}
            <Section id="payment" icon={CreditCard} title="Bank & payment" description="Adds a payment QR code to printed receipts.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Bank name" placeholder="e.g. Al Rajhi Bank" value={settings.bank_name || ''} onChange={e => set('bank_name', e.target.value)} />
                <Input label="IBAN" placeholder="SA00 0000 0000 …" value={settings.bank_iban || ''} onChange={e => set('bank_iban', e.target.value)} />
                <Input label="Account number" placeholder="Optional" value={settings.bank_account || ''} onChange={e => set('bank_account', e.target.value)} />
                <Input label="Payment link for QR" placeholder="https://…" value={settings.bank_qr_url || ''} onChange={e => set('bank_qr_url', e.target.value)} />
              </div>
              <Note>The payment link is used for the QR code if set; otherwise the IBAN is. Leave both empty to hide the QR code.</Note>
            </Section>

            {/* WhatsApp */}
            <Section id="whatsapp" icon={MessageCircle} title="WhatsApp receipts" description="Send the receipt to the customer's WhatsApp after each order.">
              <div className="flex flex-col gap-3 rounded-lg border border-line p-4 sm:flex-row sm:items-center">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', waStatus === 'logged-in' ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-ink-3')}>
                  {waStatus === 'logged-in' ? <Wifi size={17} /> : <WifiOff size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{waStatus === 'logged-in' ? 'Connected' : waStatus === 'loading' ? 'Checking…' : 'Not connected'}</p>
                  <p className="text-xs text-ink-3">{waStatus === 'logged-in' ? 'Receipts are sent automatically when a phone number is entered.' : 'Scan a QR code once with your phone to connect.'}</p>
                </div>
                {waStatus === 'logged-in'
                  ? <Button variant="secondary" size="sm" onClick={disconnectWhatsApp}>Disconnect</Button>
                  : <Button size="sm" loading={waConnecting} onClick={connectWhatsApp} leftIcon={<MessageCircle size={15} />} className="bg-[#25D366] text-white hover:bg-[#1fb857]">{waConnecting ? 'Waiting for scan…' : 'Connect WhatsApp'}</Button>}
              </div>
              <div className="mt-4">
                <Switch
                  label="Send receipt automatically"
                  description="Whenever a receipt prints for an order with a phone number, the same receipt is sent to that number in the background."
                  {...toggle('whatsapp_auto_send')}
                />
              </div>
              <Note>Uses WhatsApp Web on this computer. Keep this computer online and the linked phone connected. Messages go from the linked WhatsApp account.</Note>
            </Section>

            {/* Branding */}
            <Section id="branding" icon={Palette} title="Branding" description="Logos and colours. Protected by the admin password."
              badge={!brandingLocked && <Badge tone="green" dot>Unlocked</Badge>}>
              {brandingLocked ? (
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-2 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-ink-3"><Lock size={18} /></span>
                  <p className="text-sm text-ink-2">Enter the admin password to edit branding.</p>
                  <div className="w-full space-y-2">
                    <PasswordInput label="Admin password" placeholder="Admin password" value={brandingPass}
                      onChange={e => { setBrandingPass(e.target.value); setBrandingErr('') }} onEnter={unlockBranding} />
                    {brandingErr && <p className="text-start text-xs text-red-600" role="alert">{brandingErr}</p>}
                    <Button block loading={checkingPass} onClick={unlockBranding} leftIcon={<KeyRound size={15} />}>Unlock</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <LogoUpload label="App logo" hint="Shown in the sidebar." value={settings.app_logo_path || ''} onChange={v => set('app_logo_path', v)} />
                    <LogoUpload label="Receipt logo" hint="Printed at the top of receipts." value={settings.receipt_logo_path || ''} onChange={v => set('receipt_logo_path', v)} />
                  </div>
                  <div className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
                    <ColorField label="Accent colour" hint="Active menu item and highlights." value={settings.accent_color || '#c1fbd4'} onChange={v => set('accent_color', v)} />
                    <ColorField label="Sidebar colour" value={settings.sidebar_color || '#0a0a0a'} onChange={v => set('sidebar_color', v)} />
                    <ColorField label="Logo background" value={settings.logo_bg_color || '#000000'} onChange={v => set('logo_bg_color', v)} />
                    <div className="flex items-end gap-3">
                      <div className="h-12 w-12 overflow-hidden border border-line" style={{ borderRadius: Number(settings.logo_border_radius ?? 8), background: hexToRgba(settings.logo_bg_color || '#000000', settings.logo_bg_opacity ?? 1) }}>
                        <img src={settings.app_logo_path ? `file://${settings.app_logo_path}` : logoUrl} alt="" className="h-12 w-12 object-contain" />
                      </div>
                      <div className="flex h-12 flex-1 items-center gap-2 rounded-lg px-3" style={{ background: settings.sidebar_color || '#0a0a0a' }}>
                        <span className="h-6 flex-1 rounded-md" style={{ background: settings.accent_color || '#c1fbd4' }} />
                      </div>
                    </div>
                    <Range label="Logo corner radius" value={settings.logo_border_radius ?? 8} min={0} max={28} unit="px" onChange={v => set('logo_border_radius', v)} />
                    <Range label="Logo background opacity" value={settings.logo_bg_opacity ?? 1} min={0} max={1} step={0.05} onChange={v => set('logo_bg_opacity', v)} />
                  </div>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" leftIcon={<Lock size={14} />} onClick={() => setBrandingLocked(true)}>Lock again</Button>
                  </div>
                </div>
              )}
            </Section>

            {/* Security */}
            <Section id="security" icon={ShieldCheck} title="Security">
              <Rows>
                <Row label="Auto-lock when idle" hint="Ask for the admin password after inactivity." inactive>
                  <Select aria-label="Auto-lock when idle" disabled value={settings.idle_lock_minutes || '0'} onChange={e => set('idle_lock_minutes', e.target.value)}>
                    <option value="0">Never</option>
                    <option value="5">After 5 minutes</option>
                    <option value="10">After 10 minutes</option>
                    <option value="15">After 15 minutes</option>
                    <option value="30">After 30 minutes</option>
                  </Select>
                </Row>
                <Row label="Require PIN to void or refund" inactive><Switch disabled {...toggle('require_pin_void', false)} /></Row>
                <Row label="Hide prices until unlocked" inactive><Switch disabled {...toggle('hide_prices_locked', false)} /></Row>
              </Rows>

              <div className="mt-6 border-t border-line pt-5">
                <h3 className="mb-3 text-sm font-semibold text-ink">{t('settings.password')}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <PasswordInput label="New password" placeholder="New password (min 4 characters)" value={newPass} onChange={e => setNewPass(e.target.value)} />
                  <PasswordInput label="Confirm new password" placeholder="Confirm new password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} onEnter={changePassword} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button loading={changingPass} onClick={changePassword} leftIcon={<Lock size={15} />}>Set new password</Button>
                  <Button variant="ghost" loading={resettingPass} onClick={resetPassword} leftIcon={<RotateCcw size={15} />}>Reset to default</Button>
                </div>
              </div>
            </Section>

            {/* Data */}
            <Section id="data" icon={Database} title="Data & backup" description="All data is stored on this computer.">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { label: 'Orders', value: Number(stats.orderCount).toLocaleString('en-US') },
                  { label: 'Revenue', value: `${Number(stats.revenue).toLocaleString('en-US', { maximumFractionDigits: 0 })} ${cur}` },
                  { label: 'Menu items', value: stats.itemCount },
                ].map(s => (
                  <div key={s.label} className="rounded-lg border border-line px-3 py-2.5">
                    <p className="text-xs text-ink-3">{s.label}</p>
                    <p className="mt-0.5 break-words text-sm font-semibold text-ink tabular sm:text-base">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button variant="secondary" loading={backingUp} onClick={backupDb} leftIcon={<Database size={15} />}>Back up now</Button>
                <p className="text-xs text-ink-3">Saves a copy of the database wherever you choose. A daily copy is also kept automatically for 14 days.</p>
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* Unsaved changes bar */}
      {dirty && (
        <div className="pb-safe fixed inset-x-3 bottom-3 z-30 mx-auto flex max-w-2xl items-center gap-3 rounded-xl bg-ink px-4 pt-3 text-white shadow-pop animate-fade-in-up lg:start-[calc(15rem+1.5rem)]">
          <p className="flex-1 text-sm">You have unsaved changes</p>
          <Button size="sm" variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={load}>Discard</Button>
          <Button size="sm" variant="accent" loading={saving} onClick={save} leftIcon={<Save size={15} />}>{t('settings.save')}</Button>
        </div>
      )}
    </div>
  )
}
