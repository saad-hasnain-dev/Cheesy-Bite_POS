import React, { useState } from 'react'
import { Minus, Plus, Trash2, ShoppingBag, ChevronDown, User, Phone, Mail, MapPin, Hash, X } from 'lucide-react'
import { itemEffectivePrice } from '../../store/cartStore'
import SegmentedControl from '../ui/SegmentedControl'
import Button, { IconButton } from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Input from '../ui/Input'
import { cn } from '../ui/cn'

export const ORDER_TYPES = ['dine-in', 'takeaway', 'delivery', 'drive-through']
export const ORDER_LABELS = { 'dine-in': 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery', 'drive-through': 'Drive-thru' }
export const ORDER_LABELS_AR = { 'dine-in': 'في المطعم', takeaway: 'سفري', delivery: 'توصيل', 'drive-through': 'درايف ثرو' }

function QtyStepper({ qty, onDec, onInc, name }) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border border-line bg-surface">
      <button type="button" onClick={onDec} aria-label={`Decrease ${name}`} className="flex h-full w-8 items-center justify-center text-ink-2 hover:bg-muted hover:text-ink rounded-s-md">
        <Minus size={14} />
      </button>
      <span className="min-w-[28px] text-center text-sm font-semibold tabular" aria-live="polite">{qty}</span>
      <button type="button" onClick={onInc} aria-label={`Increase ${name}`} className="flex h-full w-8 items-center justify-center text-ink-2 hover:bg-muted hover:text-ink rounded-e-md">
        <Plus size={14} />
      </button>
    </div>
  )
}

function CartLine({ item, isAr, fmt, cart }) {
  const name = isAr ? item.name_ar : item.name_en
  const unit = itemEffectivePrice(item)
  return (
    <li className="flex flex-col gap-2 py-3 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-ink">{name}</p>
        <span className="shrink-0 text-sm font-semibold text-ink tabular">{fmt(unit * item.qty)}</span>
      </div>
      <div className="flex items-center gap-2">
        <QtyStepper
          qty={item.qty} name={item.name_en}
          onDec={() => cart.updateQty(item.id, item.qty - 1)}
          onInc={() => cart.addItem(item)}
        />
        <span className="flex-1 text-xs text-ink-3 tabular">
          {fmt(unit)} each{unit < Number(item.price) && <span className="ms-1 line-through">{fmt(item.price)}</span>}
        </span>
        <IconButton
          size="sm" label={`Remove ${item.name_en}`}
          icon={<Trash2 size={15} />}
          className="text-ink-3 hover:bg-red-50 hover:text-red-600"
          onClick={() => cart.removeItem(item.id)}
        />
      </div>
    </li>
  )
}

function Row({ label, value, className }) {
  return (
    <div className={cn('flex items-center justify-between text-sm', className)}>
      <span>{label}</span><span className="tabular">{value}</span>
    </div>
  )
}

/**
 * The current order: order type, customer, line items, discount, totals and checkout.
 * Used as the desktop side panel and inside the mobile bottom sheet.
 */
export default function CartPanel({ cart, isAr, fmt, quickDiscounts, onCheckout, onClose, className }) {
  const hasCustomer = !!(cart.customerName || cart.customerPhone || cart.customerEmail || cart.deliveryAddress)
  const [showCustomer, setShowCustomer] = useState(hasCustomer)
  const itemCount = cart.items.reduce((s, i) => s + i.qty, 0)
  const labels = isAr ? ORDER_LABELS_AR : ORDER_LABELS

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-surface', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Current order</h2>
          <p className="text-xs text-ink-3">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1">
          {cart.items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={cart.clearCart} className="text-ink-3 hover:text-red-600">Clear</Button>
          )}
          {onClose && <IconButton label="Close order" icon={<X size={18} />} onClick={onClose} />}
        </div>
      </div>

      {/* Order type + customer */}
      <div className="space-y-3 border-b border-line px-4 py-3">
        <SegmentedControl
          block size="sm" ariaLabel="Order type"
          value={cart.orderType} onChange={cart.setOrderType}
          options={ORDER_TYPES.map(t => ({ value: t, label: labels[t] }))}
        />
        {cart.orderType === 'dine-in' && (
          <Input icon={<Hash size={14} />} placeholder="Table number" aria-label="Table number" inputMode="numeric"
            value={cart.tableNumber} onChange={e => cart.setTableNumber(e.target.value)} />
        )}
        {cart.orderType === 'delivery' && (
          <Input icon={<MapPin size={14} />} placeholder="Delivery address" aria-label="Delivery address"
            value={cart.deliveryAddress} onChange={e => cart.setDeliveryAddress(e.target.value)} />
        )}
        <button
          type="button"
          onClick={() => setShowCustomer(v => !v)}
          aria-expanded={showCustomer}
          className="flex w-full items-center gap-2 text-start text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          <User size={14} />
          <span className="flex-1 truncate">
            {cart.customerName || cart.customerPhone ? (cart.customerName || cart.customerPhone) : 'Add customer (optional)'}
          </span>
          <ChevronDown size={15} className={cn('transition-transform', showCustomer && 'rotate-180')} />
        </button>
        {showCustomer && (
          <div className="grid grid-cols-1 gap-2 animate-fade-in xs:grid-cols-2">
            <Input icon={<User size={14} />} placeholder="Name" aria-label="Customer name" autoComplete="off"
              value={cart.customerName} onChange={e => cart.setCustomerName(e.target.value)} />
            <Input icon={<Phone size={14} />} placeholder="Phone" aria-label="Customer phone" type="tel" inputMode="tel"
              value={cart.customerPhone} onChange={e => cart.setCustomerPhone(e.target.value)} />
            <Input icon={<Mail size={14} />} placeholder="Email for receipt" aria-label="Customer email" type="email"
              className="xs:col-span-2"
              value={cart.customerEmail} onChange={e => cart.setCustomerEmail(e.target.value)} />
          </div>
        )}
      </div>

      {/* Items */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {cart.items.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={20} />} title="No items yet" description="Tap a menu item to add it to this order." />
        ) : (
          <ul className="divide-y divide-line">
            {cart.items.map(item => <CartLine key={item.id} item={item} isAr={isAr} fmt={fmt} cart={cart} />)}
          </ul>
        )}
      </div>

      {/* Totals + checkout */}
      <div className="pb-safe space-y-3 border-t border-line bg-surface px-4 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="me-1 text-xs font-medium text-ink-3">Discount</span>
          {quickDiscounts.map(pct => (
            <button
              key={pct} type="button"
              onClick={() => cart.setDiscount(cart.discountPct === pct ? 0 : pct)}
              aria-pressed={cart.discountPct === pct}
              className={cn(
                'h-7 rounded-md px-2.5 text-xs font-medium tabular transition-colors',
                cart.discountPct === pct ? 'bg-ink text-white' : 'bg-muted text-ink-2 hover:bg-line'
              )}
            >{pct}%</button>
          ))}
          <label className="ms-auto flex h-7 items-center rounded-md border border-line px-2 focus-within:border-ink">
            <span className="sr-only">Custom discount percent</span>
            <input
              type="number" min="0" max="100" inputMode="decimal"
              value={cart.discountPct || ''}
              placeholder="0"
              onChange={e => cart.setDiscount(e.target.value)}
              className="w-9 bg-transparent text-end text-xs font-medium tabular outline-none"
            />
            <span className="text-xs text-ink-3">%</span>
          </label>
        </div>

        <div className="space-y-1 text-ink-3">
          <Row label="Subtotal" value={fmt(cart.subtotal)} />
          {cart.discountAmount > 0 && <Row label={`Discount (${cart.discountPct}%)`} value={`−${fmt(cart.discountAmount)}`} className="text-red-600" />}
          {cart.vatEnabled && <Row label={`VAT (${Math.round((cart.vatRate ?? 0.15) * 100)}%)`} value={fmt(cart.vatAmount)} />}
        </div>

        <Button
          size="lg" block
          disabled={!cart.items.length}
          onClick={onCheckout}
          className="h-12 justify-between text-base"
        >
          <span>Charge</span>
          <span className="tabular">{fmt(cart.total)}</span>
        </Button>
      </div>
    </div>
  )
}
