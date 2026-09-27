import React from 'react'
import { cn } from './cn'

const TONES = {
  neutral: 'bg-muted text-ink-2 ring-line',
  green:   'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  red:     'bg-red-50 text-red-700 ring-red-600/15',
  amber:   'bg-amber-50 text-amber-800 ring-amber-600/20',
  blue:    'bg-blue-50 text-blue-700 ring-blue-600/15',
  violet:  'bg-violet-50 text-violet-700 ring-violet-600/15',
  dark:    'bg-ink text-white ring-ink',
}
// Older color names
TONES.gray = TONES.neutral; TONES.yellow = TONES.amber; TONES.orange = TONES.amber; TONES.purple = TONES.violet

const DOTS = {
  neutral: 'bg-ink-3', green: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500',
  blue: 'bg-blue-500', violet: 'bg-violet-500', dark: 'bg-white',
}

export default function Badge({ children, tone, color, dot = false, icon, className }) {
  const t = tone || color || 'neutral'
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      TONES[t] || TONES.neutral, className
    )}>
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[t] || DOTS.neutral)} />}
      {icon}
      {children}
    </span>
  )
}
