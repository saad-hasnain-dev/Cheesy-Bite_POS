import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Phone, Users, Download, CalendarDays, StickyNote, Armchair, Check, X, RotateCcw } from 'lucide-react'
import dayjs from 'dayjs'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button, { IconButton } from '../components/ui/Button'
import SegmentedControl from '../components/ui/SegmentedControl'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { Select, SearchInput } from '../components/ui/Input'
import { cn } from '../components/ui/cn'
import ReservationForm from '../components/reservations/ReservationForm'
import { RES_STATUS, ReservationStatusBadge, Avatar } from '../components/reservations/reservationMeta'
import { useToast } from '../components/ui/Toast'

function dayHeading(d) {
  const day = dayjs(d).startOf('day')
  const today = dayjs().startOf('day')
  const diff = day.diff(today, 'day')
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return day.format('dddd, D MMMM')
}

function ReservationRow({ r, onEdit, onDelete, onStatus }) {
  const when = dayjs(r.reserved_at)
  const mins = when.diff(dayjs(), 'minute')
  const soon = r.status === 'confirmed' && mins >= 0 && mins <= 60
  const late = r.status === 'confirmed' && mins < 0 && mins > -180

  return (
    <li className={cn('flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5', r.status === 'cancelled' && 'opacity-60')}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="w-14 shrink-0 text-center">
          <p className="text-base font-semibold text-ink tabular">{when.format('HH:mm')}</p>
          {soon && <p className="text-[11px] font-medium text-amber-700">in {mins} min</p>}
          {late && <p className="text-[11px] font-medium text-red-600">late</p>}
        </div>
        <Avatar name={r.customer_name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-ink">{r.customer_name}</p>
            <ReservationStatusBadge status={r.status} />
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1"><Users size={12} /> {r.guest_count} {r.guest_count === 1 ? 'guest' : 'guests'}</span>
            {r.table_number && <span className="inline-flex items-center gap-1"><Armchair size={12} /> Table {r.table_number}</span>}
            {r.phone && <span className="inline-flex items-center gap-1 tabular"><Phone size={12} /> {r.phone}</span>}
          </p>
          {r.notes && <p className="mt-1 flex items-start gap-1 text-xs text-ink-2"><StickyNote size={12} className="mt-0.5 shrink-0" /> {r.notes}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 ps-[4.25rem] sm:ps-0">
        {r.status === 'confirmed' && <Button size="sm" variant="secondary" leftIcon={<Armchair size={14} />} onClick={() => onStatus('seated')}>Seat</Button>}
        {r.status === 'seated' && <Button size="sm" variant="secondary" leftIcon={<Check size={14} />} onClick={() => onStatus('completed')}>Complete</Button>}
        {['confirmed', 'seated'].includes(r.status) && (
          <IconButton size="sm" label={`Cancel reservation for ${r.customer_name}`} icon={<X size={15} />} onClick={() => onStatus('cancelled')} />
        )}
        {r.status === 'cancelled' && <Button size="sm" variant="ghost" leftIcon={<RotateCcw size={14} />} onClick={() => onStatus('confirmed')}>Restore</Button>}
        <IconButton size="sm" label={`Edit reservation for ${r.customer_name}`} icon={<Pencil size={15} />} onClick={onEdit} />
        <IconButton size="sm" label={`Delete reservation for ${r.customer_name}`} icon={<Trash2 size={15} />} className="hover:bg-red-50 hover:text-red-600" onClick={onDelete} />
      </div>
    </li>
  )
}

export default function ReservationsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [reservations, setReservations] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [view, setView] = useState('upcoming')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const res = await window.api.invoke('reservations:list')
    if (res.data) setReservations(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const changeStatus = async (id, s) => {
    const res = await window.api.invoke('reservations:update-status', { id, status: s })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Marked as ${RES_STATUS[s]?.label.toLowerCase() || s}`, 'success')
    load()
  }

  const del = async (r) => {
    if (!confirm(`Delete the reservation for ${r.customer_name}?`)) return
    const res = await window.api.invoke('reservations:delete', { id: r.id })
    if (res?.error) { toast(res.error, 'error'); return }
    toast('Reservation deleted', 'success')
    load()
  }

  const exportCsv = async () => {
    const res = await window.api.invoke('export:reservations-csv')
    if (res.data) toast(`Exported to ${res.data}`, 'success')
    else toast(res.error || 'Export cancelled', 'info')
  }

  const startOfToday = dayjs().startOf('day')
  const todays = reservations.filter(r => dayjs(r.reserved_at).isSame(dayjs(), 'day') && r.status !== 'cancelled')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = reservations
      .filter(r => view === 'all' || (view === 'upcoming' ? !dayjs(r.reserved_at).isBefore(startOfToday) : dayjs(r.reserved_at).isBefore(startOfToday)))
      .filter(r => !status || r.status === status)
      .filter(r => !q || [r.customer_name, r.phone, r.email, r.table_number].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => view === 'past'
        ? dayjs(b.reserved_at).valueOf() - dayjs(a.reserved_at).valueOf()
        : dayjs(a.reserved_at).valueOf() - dayjs(b.reserved_at).valueOf())
    const map = new Map()
    list.forEach(r => {
      const key = dayjs(r.reserved_at).format('YYYY-MM-DD')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(r)
    })
    return [...map.entries()]
  }, [reservations, view, status, query])

  const openNew = () => { setEditItem(null); setShowForm(true) }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header
        title={t('reservations.title')}
        actions={
          <>
            <IconButton variant="secondary" label="Export CSV" icon={<Download size={16} />} onClick={exportCsv} />
            <Button leftIcon={<Plus size={16} />} onClick={openNew}>
              <span className="hidden sm:inline">{t('reservations.add')}</span><span className="sm:hidden">New</span>
            </Button>
          </>
        }
      />

      <div className="shrink-0 border-b border-line bg-surface px-3 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            ariaLabel="Show"
            value={view}
            onChange={setView}
            options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }, { value: 'all', label: 'All' }]}
          />
          <Select aria-label="Status" value={status} onChange={e => setStatus(e.target.value)} className="w-36">
            <option value="">All statuses</option>
            {Object.entries(RES_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <SearchInput className="w-full sm:ms-auto sm:w-64" value={query} onChange={setQuery} placeholder="Search guest, phone, table" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-5 p-3 sm:p-6">
          {/* Today at a glance */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Today', value: todays.length },
              { label: 'Guests today', value: todays.reduce((s, r) => s + (Number(r.guest_count) || 0), 0) },
              { label: 'Seated now', value: reservations.filter(r => r.status === 'seated').length },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-line bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-xs text-ink-3">{s.label}</p>
                <p className="mt-0.5 text-lg font-semibold text-ink tabular">{s.value}</p>
              </div>
            ))}
          </div>

          {loading && reservations.length === 0 ? (
            <div className="flex justify-center py-16 text-ink-3"><Spinner size={22} /></div>
          ) : groups.length === 0 ? (
            <Card>
              <EmptyState
                icon={<CalendarDays size={20} />}
                title={query || status ? 'No matching reservations' : view === 'past' ? 'No past reservations' : 'No upcoming reservations'}
                description={!query && !status && view !== 'past' ? 'Bookings you add will show here, grouped by day.' : undefined}
                action={!query && !status && view !== 'past' && <Button leftIcon={<Plus size={16} />} onClick={openNew}>New reservation</Button>}
              />
            </Card>
          ) : (
            groups.map(([day, list]) => (
              <section key={day} aria-labelledby={`day-${day}`}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 id={`day-${day}`} className="text-sm font-semibold text-ink">{dayHeading(day)}</h2>
                  <span className="text-xs text-ink-3">
                    {list.length} booking{list.length !== 1 ? 's' : ''} · {list.filter(r => r.status !== 'cancelled').reduce((s, r) => s + (Number(r.guest_count) || 0), 0)} guests
                  </span>
                </div>
                <Card className="overflow-hidden">
                  <ul className="divide-y divide-line">
                    {list.map(r => (
                      <ReservationRow
                        key={r.id} r={r}
                        onEdit={() => { setEditItem(r); setShowForm(true) }}
                        onDelete={() => del(r)}
                        onStatus={(s) => changeStatus(r.id, s)}
                      />
                    ))}
                  </ul>
                </Card>
              </section>
            ))
          )}
        </div>
      </div>

      <ReservationForm open={showForm} onClose={() => setShowForm(false)} initial={editItem} existing={reservations} onSaved={load} />
    </div>
  )
}
