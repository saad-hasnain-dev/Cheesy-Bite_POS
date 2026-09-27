import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const CONFIG = {
  success: { Icon: CheckCircle2,  icon: 'text-emerald-600', bar: 'bg-emerald-500' },
  error:   { Icon: XCircle,       icon: 'text-red-600',     bar: 'bg-red-500' },
  warning: { Icon: AlertTriangle, icon: 'text-amber-600',   bar: 'bg-amber-500' },
  info:    { Icon: Info,          icon: 'text-blue-600',    bar: 'bg-blue-500' },
}

function ToastItem({ toast, onRemove }) {
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)
  const cfg = CONFIG[toast.type] || CONFIG.info

  const dismiss = useCallback(() => onRemove(toast.id), [toast.id, onRemove])

  useEffect(() => {
    if (paused) return
    timerRef.current = setTimeout(dismiss, toast.duration)
    return () => clearTimeout(timerRef.current)
  }, [paused, dismiss, toast.duration])

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="animate-toast-in pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border border-line bg-surface py-3 pe-3 ps-4 shadow-pop sm:w-[360px]"
    >
      <cfg.Icon size={18} className={`mt-px shrink-0 ${cfg.icon}`} />
      <p className="flex-1 break-words text-sm text-ink">{toast.message}</p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="-me-1 -mt-0.5 rounded p-1 text-ink-3 hover:bg-muted hover:text-ink"
      >
        <X size={14} />
      </button>
      <div className="absolute bottom-0 start-0 h-0.5 w-full bg-muted">
        <div
          className={`h-full opacity-60 ${cfg.bar}`}
          style={{ animation: `toast-progress ${toast.duration}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
        />
      </div>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)

  const show = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++counterRef.current
    setToasts(prev => [...prev.slice(-3), { id, message, type, duration }])
  }, [])

  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:end-4 sm:top-4 sm:items-end"
      >
        {toasts.map(t => <ToastItem key={t.id} toast={t} onRemove={remove} />)}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
