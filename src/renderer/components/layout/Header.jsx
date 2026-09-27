import React, { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import dayjs from 'dayjs'
import { useSettingsStore } from '../../store/settingsStore'
import { useUiStore } from '../../store/uiStore'

function Clock() {
  const [now, setNow] = useState(dayjs())
  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000 * 15)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="hidden text-end leading-tight xl:block">
      <p className="text-sm font-medium text-ink tabular">{now.format('HH:mm')}</p>
      <p className="text-xs text-ink-3">{now.format('ddd, DD MMM')}</p>
    </div>
  )
}

/**
 * Page header used by every screen: menu button on small screens,
 * title + optional subtitle, and page actions on the right.
 */
export default function Header({ title, subtitle, actions }) {
  const restaurantName = useSettingsStore(s => s.restaurantName)
  const openNav = useUiStore(s => s.openNav)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:h-16 sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={openNav}
        aria-label="Open menu"
        className="-ms-1 rounded-md p-2 text-ink-2 hover:bg-muted hover:text-ink lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-ink sm:text-lg">{title || restaurantName}</h1>
        {subtitle && <p className="hidden truncate text-xs text-ink-3 sm:block">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {actions}
        <Clock />
      </div>
    </header>
  )
}
