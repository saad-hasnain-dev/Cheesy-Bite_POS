import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, List, Image, SearchX } from 'lucide-react'
import Header from '../components/layout/Header'
import { useCartStore, itemEffectivePrice } from '../store/cartStore'
import { useSettingsStore } from '../store/settingsStore'
import { useToast } from '../components/ui/Toast'
import { SearchInput } from '../components/ui/Input'
import SegmentedControl from '../components/ui/SegmentedControl'
import EmptyState from '../components/ui/EmptyState'
import { cn } from '../components/ui/cn'
import ConfirmPrintModal from '../components/pos/ConfirmPrintModal'
import MenuItemCard from '../components/pos/MenuItemCard'
import CartPanel from '../components/pos/CartPanel'
import { PrintingOverlay, OrderSuccessDialog } from '../components/pos/OrderOverlays'

function readViewMode() {
  try { return localStorage.getItem('pos-view') || 'grid' } catch { return 'grid' }
}

export default function POSPage() {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language === 'ar'
  const toast = useToast()
  const currency         = useSettingsStore(s => s.currency)
  const stSettings       = useSettingsStore(s => s.settings)
  const stLoaded         = useSettingsStore(s => s.loaded)
  const defaultOrderType = useSettingsStore(s => s.defaultOrderType)
  const cashierName      = useSettingsStore(s => s.cashierName)
  const autoPrintReceipt = useSettingsStore(s => s.autoPrintReceipt)
  const quickDiscounts   = useSettingsStore(s => s.quickDiscounts)
  const setVatSettings   = useCartStore(s => s.setVatSettings)

  // Push VAT settings into cart whenever they change in Settings
  useEffect(() => {
    if (!stLoaded) return
    const vatEnabled = stSettings.vat_enabled !== '0'
    const vatRate    = parseFloat(stSettings.vat_rate || '0.15')
    setVatSettings(vatEnabled, vatRate)
  }, [stLoaded, stSettings.vat_enabled, stSettings.vat_rate, setVatSettings])

  // Apply default order type on first settings load
  const appliedDefaultRef = useRef(false)
  useEffect(() => {
    if (!stLoaded || appliedDefaultRef.current) return
    appliedDefaultRef.current = true
    const ORDER_TYPES_LIST = ['dine-in', 'takeaway', 'delivery', 'drive-through']
    if (defaultOrderType && ORDER_TYPES_LIST.includes(defaultOrderType)) {
      cart.setOrderType(defaultOrderType)
    }
  }, [stLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const cart = useCartStore()
  const [categories, setCategories] = useState([])
  const [allItems, setAllItems] = useState([])
  const [activeCat, setActiveCat] = useState(null)
  const [search, setSearch] = useState('')
  const [viewMode, setViewModeState] = useState(readViewMode)
  const setViewMode = (v) => { setViewModeState(v); try { localStorage.setItem('pos-view', v) } catch {} }
  const [payModal, setPayModal] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null) // { orderNumber, printOk }
  const [successLeaving, setSuccessLeaving] = useState(false)

  useEffect(() => {
    if (!orderSuccess) return
    const hasContact = orderSuccess.phone || orderSuccess.email
    const displayMs = hasContact ? 5000 : 2200
    const leaveTimer  = setTimeout(() => setSuccessLeaving(true), displayMs)
    const removeTimer = setTimeout(() => { setOrderSuccess(null); setSuccessLeaving(false) }, displayMs + 350)
    return () => { clearTimeout(leaveTimer); clearTimeout(removeTimer) }
  }, [orderSuccess])

  const buildReceiptText = (o) => {
    const restName = stSettings.restaurant_name_en || 'Cheesy Bite'
    const cur = stSettings.currency || 'SAR'
    const divider = '━'.repeat(24)
    const lines = o.items.map(i => `  • ${i.name_en} ×${i.qty}  →  ${(itemEffectivePrice(i) * i.qty).toFixed(2)} ${cur}`).join('\n')
    const bankLines = []
    if (stSettings.bank_name)    bankLines.push(`🏦 ${stSettings.bank_name}`)
    if (stSettings.bank_iban)    bankLines.push(`IBAN: ${stSettings.bank_iban}`)
    if (stSettings.bank_account) bankLines.push(`Acct: ${stSettings.bank_account}`)
    return [
      `🧾 *${restName}*`,
      `Order *#${o.orderNumber}*`,
      divider,
      lines,
      divider,
      `Subtotal:  ${o.subtotal.toFixed(2)} ${cur}`,
      ...(o.discount > 0 ? [`Discount:  -${o.discount.toFixed(2)} ${cur}`] : []),
      `VAT ${Math.round((cart.vatRate ?? 0.15) * 100)}%:   ${o.vat.toFixed(2)} ${cur}`,
      `*TOTAL:    ${o.total.toFixed(2)} ${cur}*`,
      ...(bankLines.length ? [divider, '💳 *Bank Payment*', ...bankLines] : []),
      divider,
      `Thank you for visiting ${restName}! 🙏`,
    ].join('\n')
  }

  // Resend: queue the receipt image again. If WhatsApp isn't linked, fall back to opening wa.me with a text receipt.
  const openWhatsApp = async (o) => {
    const res = await window.api.invoke('whatsapp:send-receipt', { phone: o.phone, orderId: o.orderId, lang: i18n.language })
    if (res?.error === 'needs-login') {
      let phone = (o.phone || '').replace(/\D/g, '')
      if (phone.startsWith('00')) phone = phone.slice(2)
      if (phone.startsWith('0'))  phone = '966' + phone.slice(1)
      if (phone.length <= 9)      phone = '966' + phone
      await window.api.invoke('shell:open-external', `https://wa.me/${phone}?text=${encodeURIComponent(buildReceiptText(o))}`)
    } else if (res?.data) {
      setOrderSuccess(prev => prev && prev.orderId === o.orderId ? { ...prev, whatsappStatus: 'queued' } : prev)
      toast('Receipt queued for WhatsApp', 'info')
    }
    return res
  }

  // Live WhatsApp delivery updates for the order on screen
  useEffect(() => window.api.on?.('whatsapp:receipt-status', ({ orderId, status }) => {
    setOrderSuccess(prev => prev && prev.orderId === orderId ? { ...prev, whatsappStatus: status } : prev)
  }), [])

  const openGmail = async (o) => {
    const restName = stSettings.restaurant_name_en || 'Cheesy Bite'
    const lines = o.items.map(i => `${i.name_en} ×${i.qty} = ${(itemEffectivePrice(i) * i.qty).toFixed(2)} ${currency}`).join('\n')
    const body = [
      `Order #${o.orderNumber} — ${restName}`,
      '',
      lines,
      '',
      `Subtotal: ${o.subtotal.toFixed(2)} ${currency}`,
      ...(o.discount > 0 ? [`Discount: -${o.discount.toFixed(2)} ${currency}`] : []),
      `VAT: ${o.vat.toFixed(2)} ${currency}`,
      `TOTAL: ${o.total.toFixed(2)} ${currency}`,
      '',
      `Thank you for your visit!`,
    ].join('\n')
    const subject = `Your Receipt – ${restName} #${o.orderNumber}`
    // Open Gmail compose (works in browser; falls back to mail app)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(o.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    await window.api.invoke('shell:open-external', gmailUrl)
  }

  const load = useCallback(async () => {
    const [catRes, itemRes] = await Promise.all([
      window.api.invoke('categories:list'),
      window.api.invoke('menu-items:list-available')
    ])
    if (catRes.data) setCategories(catRes.data)
    if (itemRes.data) setAllItems(itemRes.data)
  }, [])

  useEffect(() => { load() }, [load])

  // Keyboard: "/" focuses the search box
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault()
        document.getElementById('pos-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Quantity already in the cart, keyed by menu item id
  const qtyById = Object.fromEntries(cart.items.map(i => [i.id, i.qty]))

  const filteredItems = allItems.filter(item => {
    const matchCat = !activeCat || item.category_id === activeCat
    const q = search.toLowerCase()
    const matchSearch = !q || item.name_en.toLowerCase().includes(q) || item.name_ar.includes(q)
    return matchCat && matchSearch
  })

  const fmt = (n) => `${Number(n).toFixed(2)} ${currency}`

  const handlePlace = async ({ payMethod, tendered, changeDue, print: forcePrint = false }) => {
    if (!cart.items.length) return
    setPlacing(true)
    try {
      const { subtotal, discountAmount, vatAmount, total, discountPct } = cart

      const payload = {
        order_type: cart.orderType,
        table_number: cart.tableNumber || null,
        delivery_address: cart.deliveryAddress || null,
        customer_name: cart.customerName || null,
        customer_phone: cart.customerPhone || null,
        customer_id: cart.customerId || null,
        subtotal, discount_pct: discountPct,
        discount_amount: discountAmount,
        vat_rate: cart.vatEnabled ? cart.vatRate : 0, vat_amount: vatAmount, total,
        payment_method: payMethod,
        amount_tendered: payMethod === 'cash' ? (Number(tendered) || total) : null,
        change_due: changeDue || null,
        notes: cart.notes || null,
        cashier_name: cashierName || null,
        // Save the discounted unit price so line totals add up to the subtotal
        items: cart.items.map(i => {
          const unit = itemEffectivePrice(i)
          return {
            menu_item_id: i.id,
            name_en: i.name_en, name_ar: i.name_ar,
            qty: i.qty, unit_price: unit,
            discount_pct: Number(i.discount_pct) || 0, total_price: unit * i.qty
          }
        })
      }

      if (cart.customerPhone && !cart.customerId) {
        const cRes = await window.api.invoke('customers:create', {
          name: cart.customerName || 'Customer',
          phone: cart.customerPhone,
          email: null, notes: null
        })
        if (cRes.data) payload.customer_id = cRes.data.id
      }

      const res = await window.api.invoke('orders:create', payload)
      if (res.error) { toast(res.error, 'error'); return }

      let printRes = { data: true }
      if (forcePrint || autoPrintReceipt) {
        setPayModal(false)
        setPrinting(true)
        const t0 = Date.now()
        printRes = await window.api.invoke('print:receipt', { orderId: res.data.orderId, lang: i18n.language })
        // Keep animation visible for at least 1.5s so user knows something happened
        const elapsed = Date.now() - t0
        if (elapsed < 1500) await new Promise(r => setTimeout(r, 1500 - elapsed))
        setPrinting(false)
        if (printRes?.error) toast(`Print: ${printRes.error}`, 'error')
      }

      // Snapshot cart before clearing
      const orderId = res.data.orderId
      const snap = {
        orderId,
        orderNumber: res.data.orderNumber,
        printOk: !printRes?.error,
        phone: cart.customerPhone,
        email: cart.customerEmail,
        name: cart.customerName,
        items: [...cart.items],
        total: cart.total,
        vat: cart.vatAmount,
        subtotal: cart.subtotal,
        discount: cart.discountAmount,
        // 'queued' | 'sending' | 'sent' | 'needs-login' | 'invalid-number' | 'failed' | 'off'
        whatsappStatus: cart.customerPhone ? (printRes?.whatsapp || 'off') : null,
        emailSent: false,
      }

      setPayModal(false)
      setCartOpen(false)
      cart.clearCart()

      // Show success overlay immediately — don't wait for WhatsApp
      setOrderSuccess({ ...snap })

      // WhatsApp receipt is queued by the desktop app when the receipt prints
      if (snap.phone && !(forcePrint || autoPrintReceipt)) {
        window.api.invoke('whatsapp:send-receipt', { phone: snap.phone, orderId, lang: i18n.language })
          .then(r => setOrderSuccess(prev => prev && prev.orderId === orderId ? { ...prev, whatsappStatus: r?.data || r?.error || 'failed' } : prev))
      }
      if (snap.whatsappStatus === 'needs-login') {
        toast('WhatsApp is not connected — receipt not sent. Connect it in Settings → WhatsApp.', 'warning')
      }

      // Auto-open Gmail if email provided
      if (snap.email) {
        await new Promise(r => setTimeout(r, 400))
        try { await openGmail(snap); snap.emailSent = true } catch (_) {}
      }
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setPrinting(false)
      setPlacing(false)
    }
  }

  const dismissSuccess = () => {
    setSuccessLeaving(true)
    setTimeout(() => { setOrderSuccess(null); setSuccessLeaving(false) }, 300)
  }

  const itemCount = cart.items.reduce((s, i) => s + i.qty, 0)
  const activeCategories = categories.filter(c => c.is_active)
  const layout = viewMode === 'big' ? 'image' : viewMode
  const gridCls = {
    grid:  'grid grid-cols-2 gap-2.5 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 content-start',
    image: 'grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 content-start',
    list:  'grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3 content-start',
  }[layout]

  return (
    <div className="flex h-full min-h-0">
      {/* Menu */}
      <section aria-label="Menu" className="flex min-w-0 flex-1 flex-col">
        <Header title={t('pos.title')} />

        <div className="shrink-0 space-y-3 border-b border-line bg-surface px-3 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <SearchInput
              className="flex-1"
              value={search}
              onChange={setSearch}
              placeholder={t('pos.search')}
              id="pos-search"
            />
            <SegmentedControl
              className="hidden sm:inline-flex"
              ariaLabel="Menu layout"
              value={layout}
              onChange={setViewMode}
              options={[
                { value: 'grid',  icon: <LayoutGrid size={15} />, ariaLabel: 'Compact grid' },
                { value: 'image', icon: <Image size={15} />,      ariaLabel: 'Photo cards' },
                { value: 'list',  icon: <List size={15} />,       ariaLabel: 'List' },
              ]}
            />
          </div>
          <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:-mx-6 sm:px-6" role="tablist" aria-label="Categories">
            {[{ id: null, name_en: t('pos.all'), name_ar: t('pos.all') }, ...activeCategories].map(c => {
              const active = activeCat === c.id
              return (
                <button
                  key={c.id ?? 'all'}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveCat(c.id)}
                  className={cn(
                    'h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors',
                    active ? 'bg-ink text-white' : 'bg-muted text-ink-2 hover:bg-line hover:text-ink'
                  )}
                >
                  {isAr ? c.name_ar : c.name_en}
                </button>
              )
            })}
          </div>
        </div>

        <div className={cn('min-h-0 flex-1 overflow-y-auto p-3 sm:p-6', cart.items.length > 0 && 'pb-24 lg:pb-6')}>
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<SearchX size={20} />}
              title={search ? 'No items match your search' : 'No items in this category'}
              description={search ? 'Try a different name.' : 'Add items from the Menu page.'}
            />
          ) : (
            <div className={gridCls}>
              {filteredItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  variant={layout}
                  onAdd={cart.addItem}
                  isAr={isAr}
                  fmt={fmt}
                  qty={qtyById[item.id]}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Order panel — desktop */}
      <aside aria-label="Current order" className="hidden w-[360px] shrink-0 border-s border-line lg:flex xl:w-[400px]">
        <CartPanel
          className="w-full"
          cart={cart} isAr={isAr} fmt={fmt} quickDiscounts={quickDiscounts}
          onCheckout={() => setPayModal(true)}
        />
      </aside>

      {/* Order bar + sheet — phones and tablets */}
      {cart.items.length > 0 && !cartOpen && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-3 pt-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex h-12 w-full items-center gap-3 rounded-lg bg-ink px-4 text-white shadow-pop"
          >
            <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full bg-white/15 px-2 text-sm font-semibold tabular">{itemCount}</span>
            <span className="flex-1 text-start text-sm font-medium">Review order</span>
            <span className="text-base font-semibold tabular">{fmt(cart.total)}</span>
          </button>
        </div>
      )}
      {cartOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Current order">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setCartOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 top-8 overflow-hidden rounded-t-2xl shadow-pop animate-sheet-up sm:inset-y-0 sm:start-auto sm:end-0 sm:top-0 sm:w-[420px] sm:rounded-none">
            <CartPanel
              cart={cart} isAr={isAr} fmt={fmt} quickDiscounts={quickDiscounts}
              onCheckout={() => setPayModal(true)}
              onClose={() => setCartOpen(false)}
            />
          </div>
        </div>
      )}

      <ConfirmPrintModal
        open={payModal}
        onClose={() => setPayModal(false)}
        cart={cart}
        onConfirm={handlePlace}
        placing={placing}
      />

      {printing && <PrintingOverlay />}

      {orderSuccess && (
        <OrderSuccessDialog
          order={orderSuccess}
          leaving={successLeaving}
          onDismiss={dismissSuccess}
          onResendWhatsApp={openWhatsApp}
          onResendEmail={openGmail}
        />
      )}
    </div>
  )
}
