import React from 'react'
import { cn } from './cn'

export default function Card({ as: Tag = 'div', className, padded = false, children, ...rest }) {
  return (
    <Tag className={cn('rounded-lg border border-line bg-surface shadow-card', padded && 'p-4 sm:p-5', className)} {...rest}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, description, actions, className }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5', className)}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('p-4 sm:p-5', className)}>{children}</div>
}
