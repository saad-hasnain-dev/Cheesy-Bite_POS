import React from 'react'
import { Plus } from 'lucide-react'
import { cn } from '../ui/cn'

// Soft, deterministic tint per item so text-only menus still scan quickly
const TINTS = [
  'bg-amber-50 text-amber-700', 'bg-sky-50 text-sky-700', 'bg-emerald-50 text-emerald-700',
  'bg-fuchsia-50 text-fuchsia-700', 'bg-rose-50 text-rose-700', 'bg-teal-50 text-teal-700',
  'bg-orange-50 text-orange-700', 'bg-violet-50 text-violet-700',
]
export function itemTint(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i)
  return TINTS[Math.abs(h) % TINTS.length]
}

function Thumb({ item, className, textClass = 'text-sm' }) {
  const hasImage = !!(item.image_path && item.image_path.trim())
  if (hasImage) {
    return <img src={`file://${item.image_path}`} alt="" className={cn('object-cover', className)} loading="lazy" />
  }
  return (
    <div className={cn('flex items-center justify-center font-semibold', itemTint(item.name_en), className)}>
      <span className={textClass}>{(item.name_en || ' ')[0].toUpperCase()}</span>
    </div>
  )
}

function QtyBadge({ qty }) {
  if (!qty) return null
  return (
    <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-semibold text-white tabular shadow-xs">
      {qty}
    </span>
  )
}

/**
 * One menu item in the POS. `variant`: 'grid' (compact), 'image' (photo card), 'list' (row).
 * `qty` shows how many are already in the cart.
 */
export default function MenuItemCard({ item, variant = 'grid', onAdd, isAr, fmt, qty = 0 }) {
  const name = isAr ? item.name_ar : item.name_en
  const label = `Add ${item.name_en}, ${fmt(item.price)}`

  if (variant === 'list') {
    return (
      <button
        type="button" onClick={() => onAdd(item)} aria-label={label}
        className="group relative flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-2.5 text-start transition-colors hover:border-line-strong hover:bg-muted/50"
      >
        <Thumb item={item} className="h-10 w-10 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{name}</p>
          <p className="truncate text-xs text-ink-3">{isAr ? item.cat_ar : item.cat_en}</p>
        </div>
        {qty > 0 && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white tabular">×{qty}</span>}
        <span className="shrink-0 text-sm font-semibold text-ink tabular">{fmt(item.price)}</span>
      </button>
    )
  }

  if (variant === 'image') {
    return (
      <button
        type="button" onClick={() => onAdd(item)} aria-label={label}
        className="group relative flex w-full flex-col overflow-hidden rounded-lg border border-line bg-surface text-start shadow-xs transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Thumb item={item} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" textClass="text-3xl" />
        </div>
        <div className="flex items-center gap-2 p-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-medium text-ink">{name}</p>
            <p className="mt-0.5 text-sm font-semibold text-ink tabular">{fmt(item.price)}</p>
          </div>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-ink transition-colors group-hover:bg-ink group-hover:text-white">
            <Plus size={16} />
          </span>
        </div>
        {qty > 0 && <span className="absolute end-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white tabular">×{qty}</span>}
      </button>
    )
  }

  return (
    <button
      type="button" onClick={() => onAdd(item)} aria-label={label}
      className={cn(
        'group relative flex w-full flex-col gap-3 rounded-lg border bg-surface p-3 text-start transition-all hover:shadow-card',
        qty > 0 ? 'border-ink/60' : 'border-line hover:border-line-strong'
      )}
    >
      <div className="flex items-start gap-2.5">
        {item.image_path?.trim() && <Thumb item={item} className="h-10 w-10 shrink-0 rounded-md" />}
        <p className="line-clamp-2 min-h-[2.5em] min-w-0 flex-1 text-[13px] font-medium leading-snug text-ink">{name}</p>
      </div>
      <div className="mt-auto flex w-full items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-ink tabular">{fmt(item.price)}</span>
        <span className="ms-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-ink-2 transition-colors group-hover:bg-ink group-hover:text-white">
          <Plus size={14} />
        </span>
      </div>
      <QtyBadge qty={qty} />
    </button>
  )
}
