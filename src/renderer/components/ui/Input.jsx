import React, { forwardRef, useId } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from './cn'

export const controlCls =
  'w-full rounded-md border border-line bg-surface text-sm text-ink placeholder:text-ink-3 ' +
  'transition-colors hover:border-line-strong focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 ' +
  'disabled:bg-muted disabled:text-ink-3'

/** Label + control + hint/error wrapper. Wires up ids for accessibility. */
export function Field({ label, hint, error, required, htmlFor, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
          {label}{required && <span className="text-red-600"> *</span>}
        </label>
      )}
      {children}
      {error
        ? <p className="text-xs text-red-600" role="alert">{error}</p>
        : hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  )
}

const Input = forwardRef(function Input({ label, hint, error, required, icon, className, inputClassName, id, ...props }, ref) {
  const autoId = useId()
  const fieldId = id || autoId
  const control = (
    <div className="relative">
      {icon && <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink-3">{icon}</span>}
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        required={required}
        className={cn(controlCls, 'h-9 px-3', icon && 'ps-9', error && 'border-red-400 focus:border-red-500 focus:ring-red-500/10', inputClassName)}
        {...props}
      />
    </div>
  )
  if (!label && !hint && !error) return <div className={className}>{control}</div>
  return <Field label={label} hint={hint} error={error} required={required} htmlFor={fieldId} className={className}>{control}</Field>
})

export default Input

export const Textarea = forwardRef(function Textarea({ label, hint, error, required, className, id, rows = 3, ...props }, ref) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fieldId} className={className}>
      <textarea
        ref={ref} id={fieldId} rows={rows} aria-invalid={!!error}
        className={cn(controlCls, 'px-3 py-2 resize-none leading-relaxed', error && 'border-red-400')}
        {...props}
      />
    </Field>
  )
})

export const Select = forwardRef(function Select({ label, hint, error, required, className, id, children, ...props }, ref) {
  const autoId = useId()
  const fieldId = id || autoId
  return (
    <Field label={label} hint={hint} error={error} required={required} htmlFor={fieldId} className={className}>
      <select ref={ref} id={fieldId} className={cn(controlCls, 'h-9 px-2.5 cursor-pointer')} {...props}>
        {children}
      </select>
    </Field>
  )
})

/** Search box with a clear button. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className, autoFocus, onClear, id }) {
  return (
    <div className={cn('relative', className)}>
      <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-3" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoFocus={autoFocus}
        className={cn(controlCls, 'h-9 ps-9 pe-8 [&::-webkit-search-cancel-button]:hidden')}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { onChange(''); onClear?.() }}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:bg-muted hover:text-ink"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
