import React from 'react'
import { cn } from './cn'

/**
 * Pill-style single choice (tabs, filters, view toggles).
 * options: [{ value, label, icon?, count? }]
 */
export default function SegmentedControl({ options, value, onChange, size = 'md', block = false, className, ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('inline-flex rounded-lg bg-muted p-0.5', block && 'flex w-full', className)}
    >
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.ariaLabel}
            title={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
              block && 'flex-1',
              active ? 'bg-surface text-ink shadow-xs' : 'text-ink-3 hover:text-ink'
            )}
          >
            {opt.icon}
            {opt.label}
            {opt.count != null && (
              <span className={cn('rounded-full px-1.5 text-[11px] tabular', active ? 'bg-muted text-ink-2' : 'text-ink-3')}>{opt.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
