import React from 'react'
import { createPortal } from 'react-dom'
import { Printer, MessageCircle, Mail, Check } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import WhatsAppBadge from '../orders/WhatsAppBadge'

/** Shown while the receipt is sent to the printer. */
export function PrintingOverlay() {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in" role="alertdialog" aria-live="assertive" aria-label="Printing receipt">
      <div className="w-full max-w-xs rounded-xl bg-surface p-8 text-center shadow-pop animate-pop-in">
        <div className="relative mx-auto mb-5 inline-block">
          <Printer size={48} strokeWidth={1.4} className="text-ink" />
          <div
            className="absolute -bottom-px left-1/2 w-6 -translate-x-1/2 overflow-hidden"
            style={{ height: 0, animation: 'receipt-emerge 3s cubic-bezier(.05,0,.2,1) .3s forwards' }}
          >
            <div className="space-y-1 border border-t-0 border-line bg-muted px-1 py-1">
              {[100, 70, 85, 55, 90, 60].map((w, i) => <div key={i} className="h-0.5 rounded bg-line-strong" style={{ width: `${w}%` }} />)}
            </div>
          </div>
        </div>
        <p className="text-sm font-semibold text-ink">Printing receipt</p>
        <p className="mt-1 text-xs text-ink-3">
          Please wait
          {[0, .2, .4].map((d, i) => <span key={i} style={{ animation: `dot-pulse 1.4s ease-in-out ${d}s infinite` }}>.</span>)}
        </p>
      </div>
    </div>,
    document.body
  )
}

/** Confirmation after an order is placed, with receipt delivery status and resend buttons. */
export function OrderSuccessDialog({ order, leaving, onDismiss, onResendWhatsApp, onResendEmail }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1 }}
      onClick={onDismiss}
    >
      <div
        role="alertdialog" aria-labelledby="order-success-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl bg-surface p-6 text-center shadow-pop animate-pop-in sm:p-8"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          <Check size={28} strokeWidth={2.5} className="text-accent-ink animate-pop-in" aria-hidden="true" />
        </div>
        <h2 id="order-success-title" className="text-lg font-semibold text-ink">Order placed</h2>
        <p className="mt-0.5 text-sm text-ink-3 tabular">#{order.orderNumber}</p>

        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          <Badge tone={order.printOk ? 'green' : 'neutral'} icon={<Printer size={12} />}>{order.printOk ? 'Printed' : 'Not printed'}</Badge>
          {order.phone && <WhatsAppBadge status={order.whatsappStatus} />}
          {order.email && <Badge tone={order.emailSent ? 'blue' : 'neutral'} icon={<Mail size={12} />}>{order.emailSent ? 'Email opened' : 'Email not sent'}</Badge>}
        </div>

        {(order.phone || order.email) && (
          <div className="mt-5 flex justify-center gap-2">
            {order.phone && ['sent', 'failed', 'timeout', 'send-failed', 'needs-login'].includes(order.whatsappStatus) && <Button variant="secondary" size="sm" leftIcon={<MessageCircle size={14} />} onClick={() => onResendWhatsApp(order)}>{order.whatsappStatus === 'sent' ? 'Send again' : 'Retry WhatsApp'}</Button>}
            {order.email && <Button variant="secondary" size="sm" leftIcon={<Mail size={14} />} onClick={() => onResendEmail(order)}>Resend email</Button>}
          </div>
        )}

        <Button block className="mt-6" leftIcon={<Check size={16} />} onClick={onDismiss}>New order</Button>
      </div>
    </div>,
    document.body
  )
}
