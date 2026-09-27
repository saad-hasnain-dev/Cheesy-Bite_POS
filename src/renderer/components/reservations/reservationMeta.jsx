import React from 'react'
import Badge from '../ui/Badge'

export const RES_STATUS = {
  confirmed: { tone: 'blue',    label: 'Confirmed' },
  seated:    { tone: 'amber',   label: 'Seated' },
  completed: { tone: 'green',   label: 'Completed' },
  cancelled: { tone: 'neutral', label: 'Cancelled' },
}

export function ReservationStatusBadge({ status }) {
  const s = RES_STATUS[status] || { tone: 'neutral', label: status }
  return <Badge tone={s.tone} dot>{s.label}</Badge>
}

const AVATAR_TINTS = [
  'bg-sky-100 text-sky-800', 'bg-pink-100 text-pink-800', 'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800',
  'bg-violet-100 text-violet-800', 'bg-rose-100 text-rose-800', 'bg-teal-100 text-teal-800', 'bg-orange-100 text-orange-800',
]

/** Round initials avatar with a stable colour per name. */
export function Avatar({ name, size = 'md' }) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  const initials = (name || '?').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sz = size === 'lg' ? 'h-12 w-12 text-base' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sz} ${AVATAR_TINTS[h % AVATAR_TINTS.length]}`}>
      {initials}
    </span>
  )
}
