import React, { useId } from 'react'
import { cn } from './cn'

/** Toggle switch with optional label and description, laid out as a settings row. */
export default function Switch({ checked, onChange, label, description, disabled, className }) {
  const id = useId()
  const control = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label ? undefined : 'Toggle'}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-ink' : 'bg-line-strong'
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-[18px] rtl:-translate-x-[18px]' : 'translate-x-0.5 rtl:-translate-x-0.5'
      )} />
    </button>
  )
  if (!label) return control
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-3">{description}</span>}
      </label>
      {control}
    </div>
  )
}
