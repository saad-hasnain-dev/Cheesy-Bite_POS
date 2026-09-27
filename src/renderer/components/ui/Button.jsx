import React, { forwardRef } from 'react'
import { cn } from './cn'
import Spinner from './Spinner'

const VARIANTS = {
  primary:   'bg-ink text-white hover:bg-black/85 shadow-xs',
  secondary: 'bg-surface text-ink border border-line hover:bg-muted shadow-xs',
  ghost:     'bg-transparent text-ink-2 hover:bg-muted hover:text-ink',
  danger:    'bg-red-600 text-white hover:bg-red-700 shadow-xs',
  'danger-soft': 'bg-red-50 text-red-700 hover:bg-red-100',
  success:   'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs',
  accent:    'bg-accent text-accent-ink hover:bg-accent-hover',
}
// Older names kept so existing call sites keep working
VARIANTS.outline = VARIANTS.secondary
VARIANTS.aloe = VARIANTS.success

const SIZES = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
}

const ICON_SIZES = { xs: 'h-7 w-7', sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-11 w-11' }

const BASE = 'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none'

const Button = forwardRef(function Button({
  children, variant = 'primary', size = 'md', block = false,
  loading = false, disabled, leftIcon, rightIcon, className, type = 'button', ...rest
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(BASE, VARIANTS[variant] || VARIANTS.primary, SIZES[size] || SIZES.md, block && 'w-full', className)}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

export default Button

/** Square icon-only button. `label` is required for screen readers and shows as a tooltip. */
export const IconButton = forwardRef(function IconButton({
  icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...rest
}, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(BASE, VARIANTS[variant] || VARIANTS.ghost, ICON_SIZES[size] || ICON_SIZES.md, className)}
      {...rest}
    >
      {icon}
    </button>
  )
})
