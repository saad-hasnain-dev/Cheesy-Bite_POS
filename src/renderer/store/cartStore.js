import { create } from 'zustand'

/** Effective unit price after per-item discounts */
export function itemEffectivePrice(item) {
  const base = Number(item.price) || 0
  const afterFixed = Math.max(0, base - (Number(item.discount_fixed) || 0))
  return Math.max(0, afterFixed * (1 - (Number(item.discount_pct) || 0) / 100))
}

function derived(items, discountPct, vatEnabled, vatRate) {
  const vr = Number.isFinite(Number(vatRate)) ? Number(vatRate) : 0.15

  // Subtotal using effective (post-item-discount) prices
  const subtotal = items.reduce((s, i) => s + itemEffectivePrice(i) * i.qty, 0)

  // Order-level discount
  const discountAmount = subtotal * ((Number(discountPct) || 0) / 100)
  const afterDiscount  = subtotal - discountAmount

  // VAT: only on non-exempt items, proportional to order discount
  let vatAmount = 0
  if (vatEnabled) {
    const taxableSubtotal = items.reduce((s, i) => {
      if (i.vat_exempt) return s
      return s + itemEffectivePrice(i) * i.qty
    }, 0)
    // Apply same order-level discount ratio to taxable portion
    const taxableShare = subtotal > 0 ? taxableSubtotal / subtotal : 1
    const taxableAfterDiscount = afterDiscount * taxableShare
    vatAmount = taxableAfterDiscount * vr
  }

  // Money is kept to 2 decimals so what is saved matches what is printed
  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100
  const sub = r2(subtotal), disc = r2(discountAmount), vat = r2(vatAmount)
  const total     = r2(sub - disc + vat)
  const itemCount = items.reduce((s, i) => s + i.qty, 0)
  return { subtotal: sub, discountAmount: disc, taxable: r2(sub - disc), vatAmount: vat, total, itemCount }
}

export const useCartStore = create((set) => ({
  items: [],
  discountPct: 0,
  vatEnabled: true,
  vatRate: 0.15,
  orderType: 'dine-in',
  tableNumber: '',
  deliveryAddress: '',
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerId: null,
  notes: '',
  subtotal: 0, discountAmount: 0, taxable: 0, vatAmount: 0, total: 0, itemCount: 0,

  setVatSettings: (enabled, rate) => set((s) => ({
    vatEnabled: enabled,
    vatRate: rate,
    ...derived(s.items, s.discountPct, enabled, rate),
  })),

  addItem: (item) => set((s) => {
    const ex = s.items.find(i => i.id === item.id)
    const items = ex
      ? s.items.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      : [...s.items, { ...item, qty: 1 }]
    return { items, ...derived(items, s.discountPct, s.vatEnabled, s.vatRate) }
  }),

  removeItem: (id) => set((s) => {
    const items = s.items.filter(i => i.id !== id)
    return { items, ...derived(items, s.discountPct, s.vatEnabled, s.vatRate) }
  }),

  updateQty: (id, qty) => set((s) => {
    const items = qty <= 0
      ? s.items.filter(i => i.id !== id)
      : s.items.map(i => i.id === id ? { ...i, qty } : i)
    return { items, ...derived(items, s.discountPct, s.vatEnabled, s.vatRate) }
  }),

  setDiscount: (pct) => set((s) => {
    const discountPct = Math.min(100, Math.max(0, Number(pct) || 0))
    return { discountPct, ...derived(s.items, discountPct, s.vatEnabled, s.vatRate) }
  }),

  setOrderType:       (t)  => set({ orderType: t }),
  setTableNumber:     (v)  => set({ tableNumber: v }),
  setDeliveryAddress: (v)  => set({ deliveryAddress: v }),
  setCustomerName:    (v)  => set({ customerName: v }),
  setCustomerPhone:   (v)  => set({ customerPhone: v }),
  setCustomerEmail:   (v)  => set({ customerEmail: v }),
  setCustomerId:      (id) => set({ customerId: id }),
  setNotes:           (v)  => set({ notes: v }),

  clearCart: () => set((s) => ({
    items: [], discountPct: 0,
    tableNumber: '', deliveryAddress: '',
    customerName: '', customerPhone: '', customerEmail: '', customerId: null, notes: '',
    ...derived([], 0, s.vatEnabled, s.vatRate),
  })),
}))
