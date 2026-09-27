import React from 'react'
import { MessageCircle } from 'lucide-react'
import Badge from '../ui/Badge'

const STATES = {
  queued:           { tone: 'blue',    label: 'WhatsApp queued' },
  sending:          { tone: 'blue',    label: 'Sending WhatsApp…' },
  sent:             { tone: 'green',   label: 'WhatsApp sent' },
  'needs-login':    { tone: 'amber',   label: 'WhatsApp not connected' },
  'invalid-number': { tone: 'red',     label: 'Not a WhatsApp number' },
  'no-phone':       { tone: 'neutral', label: 'No phone number' },
  off:              { tone: 'neutral', label: 'WhatsApp auto-send off' },
}

/** Delivery status of an order's WhatsApp receipt. Unknown/failed states show as "not sent". */
export default function WhatsAppBadge({ status }) {
  if (!status) return null
  const s = STATES[status] || { tone: 'red', label: 'WhatsApp not sent' }
  return <Badge tone={s.tone} icon={<MessageCircle size={12} />}>{s.label}</Badge>
}

export const whatsappIsFinal = (s) => !['queued', 'sending'].includes(s)
