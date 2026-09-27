import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
  ShoppingCart, LayoutDashboard, ClipboardList, UtensilsCrossed,
  CalendarDays, Users, Settings, PanelLeftClose, PanelLeftOpen, X, Globe, UserRound,
} from 'lucide-react'
import logoUrl from '../../assets/logo.svg'
import { useSettingsStore, hexToRgba } from '../../store/settingsStore'
import { useUiStore } from '../../store/uiStore'
import { setLanguage } from '../../i18n/index'
import { cn } from '../ui/cn'

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''

// Order here defines the Alt+1…7 keyboard shortcuts
export const NAV_ITEMS = [
  { to: '/pos',          icon: ShoppingCart,    key: 'pos',          group: 'sales' },
  { to: '/orders',       icon: ClipboardList,   key: 'orders',       group: 'sales' },
  { to: '/dashboard',    icon: LayoutDashboard, key: 'dashboard',    group: 'sales' },
  { to: '/pricing',      icon: UtensilsCrossed, key: 'pricing',      group: 'manage' },
  { to: '/customers',    icon: Users,           key: 'customers',    group: 'manage' },
  { to: '/reservations', icon: CalendarDays,    key: 'reservations', group: 'manage' },
  { to: '/settings',     icon: Settings,        key: 'settings',     group: 'system' },
]

const GROUPS = [
  { id: 'sales',  label: { en: 'Sales',  ar: 'المبيعات' } },
  { id: 'manage', label: { en: 'Manage', ar: 'الإدارة' } },
]

/** Count of today's reservations that are still to arrive; refreshed every minute. */
function useUpcomingReservations() {
  const [count, setCount] = useState(0)
  const location = useLocation()
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await window.api.invoke('reservations:list')
        if (!alive || !res?.data) return
        const now = dayjs()
        setCount(res.data.filter(r => r.status === 'confirmed' && dayjs(r.reserved_at).isSame(now, 'day') && dayjs(r.reserved_at).isAfter(now.subtract(30, 'minute'))).length)
      } catch (_) {}
    }
    load()
    const id = setInterval(load, 60000)
    return () => { alive = false; clearInterval(id) }
  }, [location.pathname])
  return count
}

function Brand({ collapsed }) {
  const restaurantName   = useSettingsStore(s => s.restaurantName)
  const appLogoPath      = useSettingsStore(s => s.appLogoPath)
  const logoBgColor      = useSettingsStore(s => s.logoBgColor)
  const logoBorderRadius = useSettingsStore(s => s.logoBorderRadius)
  const logoBgOpacity    = useSettingsStore(s => s.logoBgOpacity)
  const logoSrc = appLogoPath ? `file://${appLogoPath}` : logoUrl

  return (
    <div className={cn('flex h-16 shrink-0 items-center gap-3', collapsed ? 'justify-center px-0' : 'px-4')}>
      <div
        className="h-9 w-9 shrink-0 overflow-hidden"
        style={{ borderRadius: logoBorderRadius, background: hexToRgba(logoBgColor, logoBgOpacity) }}
      >
        <img src={logoSrc} alt="" className="h-9 w-9 object-contain" onError={e => { e.currentTarget.src = logoUrl }} />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: 'var(--sidebar-fg)' }}>{restaurantName}</p>
          <p className="text-[11px]" style={{ color: 'var(--sidebar-text)' }}>Restaurant POS</p>
        </div>
      )}
    </div>
  )
}

function NavItem({ item, index, collapsed, badge, onNavigate }) {
  const { t } = useTranslation()
  const Icon = item.icon
  const label = t(`nav.${item.key}`)
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? `${label}${badge ? ` (${badge})` : ''} · Alt+${index + 1}` : `Alt+${index + 1}`}
      aria-label={badge ? `${label}, ${badge} today` : undefined}
      className={({ isActive }) => cn(
        'relative flex h-10 items-center gap-3 rounded-md text-sm font-medium transition-colors',
        collapsed ? 'justify-center' : 'px-3',
        isActive ? 'bg-accent text-accent-ink' : 'hover:bg-white/[0.07] hover:text-white'
      )}
      style={({ isActive }) => (isActive ? undefined : { color: 'var(--sidebar-text)' })}
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className="shrink-0" />
          {!collapsed && <span className="flex-1 truncate">{label}</span>}
          {badge > 0 && (
            collapsed
              ? <span className="absolute end-2 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2" style={{ '--tw-ring-color': 'var(--sidebar-bg)' }} />
              : <span className={cn('min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular', isActive ? 'bg-black/10' : 'bg-amber-400 text-black')}>{badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

function NavList({ collapsed, onNavigate }) {
  const { i18n } = useTranslation()
  const upcoming = useUpcomingReservations()
  const lang = i18n.language === 'ar' ? 'ar' : 'en'
  const badgeFor = (key) => (key === 'reservations' ? upcoming : 0)

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col overflow-y-auto px-2 py-2">
      {GROUPS.map((g, gi) => (
        <div key={g.id} className={cn(gi > 0 && 'mt-4')}>
          {collapsed
            ? gi > 0 && <div className="mx-3 mb-3 border-t border-white/[0.08]" aria-hidden="true" />
            : <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--sidebar-text)', opacity: 0.7 }}>{g.label[lang]}</p>}
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item, i) => item.group === g.id && (
              <NavItem key={item.key} item={item} index={i} collapsed={collapsed} badge={badgeFor(item.key)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
      <div className="mt-auto pt-4">
        {NAV_ITEMS.map((item, i) => item.group === 'system' && (
          <NavItem key={item.key} item={item} index={i} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  )
}

function FooterButton({ collapsed, icon, label, onClick, trailing, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || (collapsed ? label : undefined)}
      aria-label={collapsed ? label : undefined}
      className={cn('flex h-9 w-full items-center gap-3 rounded-md text-sm hover:bg-white/[0.07] hover:text-white', collapsed ? 'justify-center' : 'px-3')}
      style={{ color: 'var(--sidebar-text)' }}
    >
      {icon}
      {!collapsed && <span className="flex-1 truncate text-start">{label}</span>}
      {!collapsed && trailing}
    </button>
  )
}

function SidebarFooter({ collapsed, onToggle }) {
  const { i18n } = useTranslation()
  const cashierName = useSettingsStore(s => s.cashierName)
  const isAr = i18n.language === 'ar'
  return (
    <div className="pb-safe space-y-0.5 border-t border-white/[0.08] p-2">
      {!collapsed && (
        <div className="mb-1 flex items-center gap-2.5 rounded-md px-3 py-2" style={{ color: 'var(--sidebar-text)' }}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10"><UserRound size={15} /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium" style={{ color: 'var(--sidebar-fg)' }}>{cashierName || 'Cashier'}</p>
            <p className="flex items-center gap-1.5 text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Offline-ready
            </p>
          </div>
        </div>
      )}
      <FooterButton
        collapsed={collapsed}
        icon={<Globe size={17} className="shrink-0" />}
        label={isAr ? 'English' : 'العربية'}
        title={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
        onClick={() => setLanguage(isAr ? 'en' : 'ar')}
      />
      {onToggle && (
        <FooterButton
          collapsed={collapsed}
          icon={collapsed ? <PanelLeftOpen size={17} className="rtl-flip shrink-0" /> : <PanelLeftClose size={17} className="rtl-flip shrink-0" />}
          label={collapsed ? 'Expand sidebar' : 'Collapse'}
          onClick={onToggle}
          trailing={APP_VERSION && <span className="text-[11px] opacity-70">v{APP_VERSION}</span>}
        />
      )}
    </div>
  )
}

/** Desktop sidebar (lg and up). */
export default function Sidebar() {
  const collapsed = useUiStore(s => s.sidebarCollapsed)
  const toggle = useUiStore(s => s.toggleSidebar)

  return (
    <aside
      className={cn('hidden shrink-0 flex-col transition-[width] duration-200 lg:flex', collapsed ? 'w-[68px]' : 'w-60')}
      style={{ background: 'var(--sidebar-bg)' }}
    >
      <Brand collapsed={collapsed} />
      <NavList collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} onToggle={toggle} />
    </aside>
  )
}

/** Slide-out navigation for phones and tablets (below lg). */
export function MobileNav() {
  const open = useUiStore(s => s.navOpen)
  const close = useUiStore(s => s.closeNav)
  const location = useLocation()

  useEffect(() => { close() }, [location.pathname, close])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={close} aria-hidden="true" />
      <aside
        className="animate-drawer-in absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col shadow-pop"
        style={{ background: 'var(--sidebar-bg)' }}
      >
        <div className="flex items-center justify-between pe-2">
          <Brand collapsed={false} />
          <button
            type="button" onClick={close} aria-label="Close menu"
            className="rounded-md p-2 hover:bg-white/10" style={{ color: 'var(--sidebar-text)' }}
          >
            <X size={20} />
          </button>
        </div>
        <NavList collapsed={false} onNavigate={close} />
        <SidebarFooter collapsed={false} />
      </aside>
    </div>
  )
}
