import React, { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from './cn'

const WIDTHS = {
  'max-w-sm': 'sm:max-w-sm', 'max-w-md': 'sm:max-w-md', 'max-w-lg': 'sm:max-w-lg',
  'max-w-xl': 'sm:max-w-xl', 'max-w-2xl': 'sm:max-w-2xl', 'max-w-3xl': 'sm:max-w-3xl',
  'max-w-4xl': 'sm:max-w-4xl', 'max-w-5xl': 'sm:max-w-5xl',
}

/**
 * Accessible dialog. Bottom sheet on phones, centred card on larger screens.
 * `footer` renders a sticky action bar.
 */
export default function Modal({ open, onClose, title, description, children, footer, width = 'max-w-lg', bodyClassName }) {
  const panelRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    // Move focus into the dialog unless a child already took it (autoFocus)
    requestAnimationFrame(() => {
      if (panelRef.current && !panelRef.current.contains(document.activeElement)) panelRef.current.focus()
    })
    return () => {
      window.removeEventListener('keydown', onKey)
      prevFocus?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col bg-surface shadow-pop',
          'rounded-t-2xl animate-sheet-up sm:rounded-xl sm:animate-pop-in',
          WIDTHS[width] || width
        )}
      >
        {/* Drag handle hint on phones */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
        {title && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-ink">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-m-1.5 rounded-md p-1.5 text-ink-3 hover:bg-muted hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={cn('flex-1 overflow-y-auto', bodyClassName ?? 'px-5 py-5')}>{children}</div>
        {footer && (
          <div className="pb-safe flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface px-5 pt-3 sm:flex-row sm:justify-end sm:pb-3 sm:rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
