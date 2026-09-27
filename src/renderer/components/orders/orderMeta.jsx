import React from 'react'
import Badge from '../ui/Badge'

export const TYPE_LABEL = { 'dine-in': 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery', 'drive-through': 'Drive-thru' }

const STATUS = {
  completed: { tone: 'green', label: 'Completed' },
  refunded:  { tone: 'amber', label: 'Refunded' },
  void:      { tone: 'red',   label: 'Void' },
}
const PAY = { cash: 'Cash', card: 'Card', split: 'Split' }

export function OrderStatusBadge({ status }) {
  const s = STATUS[status] || { tone: 'neutral', label: status }
  return <Badge tone={s.tone} dot>{s.label}</Badge>
}

export function PaymentBadge({ method }) {
  return <Badge tone="neutral">{PAY[method] || method}</Badge>
}

export const statusLabel = (s) => STATUS[s]?.label || s
