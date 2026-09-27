import React from 'react'
import { cn } from './cn'

/** KPI tile: label, big value, optional sub-line and icon. */
export default function StatCard({ label, value, sub, icon, highlight = false, className }) {
  return (
    <div className={cn(
      'rounded-lg border p-4 shadow-card',
      highlight ? 'border-ink bg-ink text-white' : 'border-line bg-surface',
      className
    )}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn('text-xs font-medium', highlight ? 'text-white/70' : 'text-ink-3')}>{label}</p>
        {icon && <span className={highlight ? 'text-white/70' : 'text-ink-3'}>{icon}</span>}
      </div>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight tabular sm:text-2xl">{value}</p>
      {sub && <p className={cn('mt-1 text-xs', highlight ? 'text-white/60' : 'text-ink-3')}>{sub}</p>}
    </div>
  )
}
