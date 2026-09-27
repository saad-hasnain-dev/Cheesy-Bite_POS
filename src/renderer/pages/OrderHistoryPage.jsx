import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet, Eye, Pencil, Trash2, RotateCcw, XCircle, Info, ClipboardList, Save, Printer, MessageCircle } from 'lucide-react'
import WhatsAppBadge from '../components/orders/WhatsAppBadge'
import dayjs from 'dayjs'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import Button, { IconButton } from '../components/ui/Button'
import Input, { Select, Textarea, SearchInput } from '../components/ui/Input'
import SegmentedControl from '../components/ui/SegmentedControl'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { cn } from '../components/ui/cn'
import { TYPE_LABEL, OrderStatusBadge, PaymentBadge, statusLabel } from '../components/orders/orderMeta'
import { useSettingsStore } from '../store/settingsStore'
import { useToast } from '../components/ui/Toast'
import { dbDate } from '../utils/dates'

const PAGE_SIZE = 50
const today = () => dayjs().format('YYYY-MM-DD')
const PRESETS = [
  { value: 'today',     label: 'Today',     range: () => [today(), today()] },
  { value: 'yesterday', label: 'Yesterday', range: () => { const d = dayjs().subtract(1, 'day').format('YYYY-MM-DD'); return [d, d] } },
  { value: '7d',        label: '7 days',    range: () => [dayjs().subtract(6, 'day').format('YYYY-MM-DD'), today()] },
  { value: '30d',       label: '30 days',   range: () => [dayjs().subtract(29, 'day').format('YYYY-MM-DD'), today()] },
]

function Line({ label, value, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-1.5 text-sm', className)}>
      <span className="text-ink-3">{label}</span>
      <span className="text-end font-medium text-ink tabular">{value}</span>
    </div>
  )
}

export default function OrderHistoryPage() {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const currency = useSettingsStore(s => s.currency)

  const [orders, setOrders] = useState([])
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [preset, setPreset] = useState('today')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exporting, setExporting] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ customer_name: '', customer_phone: '', table_number: '', delivery_address: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)

  const fetchPage = useCallback(async (p) => {
    const res = await window.api.invoke('orders:list', {
      from, to: to || from, status: status || undefined, page: p, limit: PAGE_SIZE,
    })
    if (res.error) { toast(res.error, 'error'); return null }
    return res.data || []
  }, [from, to, status])

  const load = useCallback(async () => {
    setLoading(true)
    const rows = await fetchPage(1)
    if (rows) { setOrders(rows); setPage(1); setHasMore(rows.length === PAGE_SIZE) }
    setLoading(false)
  }, [fetchPage])

  const loadMore = async () => {
    setLoadingMore(true)
    const rows = await fetchPage(page + 1)
    if (rows) { setOrders(o => [...o, ...rows]); setPage(page + 1); setHasMore(rows.length === PAGE_SIZE) }
    setLoadingMore(false)
  }

  // Filters apply immediately
  useEffect(() => { load() }, [load])

  const applyPreset = (v) => {
    const p = PRESETS.find(x => x.value === v)
    setPreset(v)
    const [f, tt] = p.range()
    setFrom(f); setTo(tt)
  }
  const handleFromChange = (v) => { setPreset(''); setFrom(v); if (to && v > to) setTo(v) }
  const handleToChange = (v) => { setPreset(''); setTo(v) }

  const openDetail = async (id) => {
    setEditOpen(false)
    const res = await window.api.invoke('orders:get', { id })
    if (res.data) setDetail(res.data)
  }

  const openEdit = (order) => {
    setEditForm({
      customer_name:    order.customer_name    || '',
      customer_phone:   order.customer_phone   || '',
      table_number:     order.table_number     || '',
      delivery_address: order.delivery_address || '',
      notes:            order.notes            || '',
    })
    setEditOpen(true)
  }

  const openDetailEdit = async (id) => {
    const res = await window.api.invoke('orders:get', { id })
    if (!res.data) return
    setDetail(res.data)
    openEdit(res.data)
  }

  const saveDetails = async () => {
    setSaving(true)
    try {
      const res = await window.api.invoke('orders:update-details', { id: detail.id, ...editForm })
      if (res.error) { toast(res.error, 'error'); return }
      toast('Order updated', 'success')
      setEditOpen(false)
      const fresh = await window.api.invoke('orders:get', { id: detail.id })
      if (fresh.data) setDetail(fresh.data)
      load()
    } finally { setSaving(false) }
  }

  const deleteOrder = async (id) => {
    if (!confirm('Permanently delete this order? This cannot be undone.')) return
    const res = await window.api.invoke('orders:delete', { id })
    if (res.error) { toast(res.error, 'error'); return }
    toast('Order deleted', 'success')
    setDetail(null)
    load()
  }

  const updateStatus = async (id, s) => {
    const res = await window.api.invoke('orders:update-status', { id, status: s })
    if (res?.error) { toast(res.error, 'error'); return }
    toast(`Marked as ${statusLabel(s).toLowerCase()}`, 'success')
    if (detail) setDetail({ ...detail, status: s })
    load()
  }

  // Reprint; the desktop app also sends the receipt to WhatsApp if it wasn't delivered yet
  const reprint = async () => {
    setPrinting(true)
    try {
      const res = await window.api.invoke('print:receipt', { orderId: detail.id, lang: i18n.language })
      if (res?.error) toast(`Print: ${res.error}`, 'error')
      else toast('Receipt sent to printer', 'success')
      if (res?.whatsapp && res.whatsapp !== 'off') setDetail(d => d && d.id === detail.id ? { ...d, whatsapp_status: res.whatsapp } : d)
      if (res?.whatsapp === 'needs-login') toast('WhatsApp is not connected — receipt not sent.', 'warning')
    } finally { setPrinting(false) }
  }

  const sendWhatsApp = async () => {
    const res = await window.api.invoke('whatsapp:send-receipt', { orderId: detail.id, phone: detail.customer_phone, lang: i18n.language })
    if (res?.error === 'needs-login') { toast('WhatsApp is not connected. Connect it in Settings → WhatsApp.', 'warning'); return }
    if (res?.error) { toast(res.error === 'no-phone' ? 'This order has no phone number' : res.error, 'error'); return }
    setDetail(d => ({ ...d, whatsapp_status: 'queued' }))
    toast('Receipt queued for WhatsApp', 'info')
  }

  // Live WhatsApp delivery updates
  useEffect(() => window.api.on?.('whatsapp:receipt-status', ({ orderId, status }) => {
    setDetail(d => d && d.id === orderId ? { ...d, whatsapp_status: status } : d)
    setOrders(list => list.map(o => o.id === orderId ? { ...o, whatsapp_status: status } : o))
  }), [])

  const doExport = async (type) => {
    setExporting(type)
    const channel = type === 'csv' ? 'export:orders-csv' : 'export:orders-excel'
    const res = await window.api.invoke(channel, { from, to })
    if (res.data) toast(`Exported to ${res.data}`, 'success')
    else toast(res.error || 'Export cancelled', 'info')
    setExporting('')
  }

  const fmt = (n) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orders
    return orders.filter(o => [o.order_number, o.customer_name, o.customer_phone, o.table_number && `table ${o.table_number}`]
      .some(v => (v || '').toLowerCase().includes(q)))
  }, [orders, query])

  const completed = visible.filter(o => o.status === 'completed')
  const revenue = completed.reduce((s, o) => s + Number(o.total || 0), 0)
  const customerLabel = (o) => o.customer_name || (o.table_number ? `Table ${o.table_number}` : null)

  const exportButtons = (
    <>
      <Button variant="secondary" size="sm" loading={exporting === 'csv'} onClick={() => doExport('csv')} leftIcon={<Download size={14} />}>
        <span className="hidden md:inline">CSV</span>
      </Button>
      <Button variant="secondary" size="sm" loading={exporting === 'excel'} onClick={() => doExport('excel')} leftIcon={<FileSpreadsheet size={14} />}>
        <span className="hidden md:inline">Excel</span>
      </Button>
    </>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header title={t('orders.title')} actions={exportButtons} />

      {/* Filters */}
      <div className="shrink-0 space-y-3 border-b border-line bg-surface px-3 py-3 sm:px-6">
        <div className="flex flex-wrap items-end gap-2">
          <div className="no-scrollbar -mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 sm:mx-0 sm:w-auto sm:px-0">
            <SegmentedControl ariaLabel="Date range" options={PRESETS} value={preset} onChange={applyPreset} />
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Input type="date" aria-label={t('orders.from')} value={from} onChange={e => handleFromChange(e.target.value)} inputClassName="sm:w-40" />
            <Input type="date" aria-label={t('orders.to')} value={to} min={from} onChange={e => handleToChange(e.target.value)} inputClassName="sm:w-40" />
          </div>
          <Select aria-label={t('orders.status')} value={status} onChange={e => setStatus(e.target.value)} className="w-full sm:w-36">
            <option value="">All statuses</option>
            <option value="completed">{t('orders.completed')}</option>
            <option value="refunded">{t('orders.refunded')}</option>
            <option value="void">{t('orders.void')}</option>
          </Select>
          <SearchInput className="w-full lg:ms-auto lg:w-64" value={query} onChange={setQuery} placeholder="Search order, customer, phone" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Orders', value: visible.length + (hasMore && !query ? '+' : '') },
              { label: 'Completed', value: completed.length },
              { label: 'Revenue', value: fmt(revenue) },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-line bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-xs text-ink-3">{s.label}</p>
                <p className="mt-0.5 break-words text-sm font-semibold leading-tight text-ink tabular sm:text-base">{s.value}</p>
              </div>
            ))}
          </div>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-3"><Spinner /> {t('common.loading')}</div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={20} />}
                title="No orders found"
                description={query ? 'No orders match your search.' : 'Try a different date range or status.'}
              />
            ) : (
              <>
                {/* Table — tablet and desktop */}
                <table className="hidden w-full text-sm md:table">
                  <thead className="border-b border-line bg-muted/60 text-start text-xs font-medium text-ink-3">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('orders.orderNo')}</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('orders.customer')}</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-start font-medium lg:table-cell">{t('orders.type')}</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('orders.date')}</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-start font-medium lg:table-cell">{t('orders.payment')}</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">{t('orders.status')}</th>
                      <th scope="col" className="px-4 py-2.5 text-end font-medium">{t('orders.total')}</th>
                      <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map(o => (
                      <tr key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(o.id)}>
                        <td className="px-4 py-3 font-medium text-ink tabular">{o.order_number}</td>
                        <td className="px-4 py-3 text-ink-2">{customerLabel(o) || <span className="text-ink-3">—</span>}</td>
                        <td className="hidden px-4 py-3 text-ink-2 lg:table-cell">{TYPE_LABEL[o.order_type] || o.order_type}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-ink-2 tabular">
                          {dbDate(o.created_at).format('DD MMM')} <span className="text-ink-3">{dbDate(o.created_at).format('HH:mm')}</span>
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell"><PaymentBadge method={o.payment_method} /></td>
                        <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                        <td className="px-4 py-3 text-end font-semibold text-ink tabular">{fmt(o.total)}</td>
                        <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-0.5">
                            <IconButton size="sm" label={`View ${o.order_number}`} icon={<Eye size={15} />} onClick={() => openDetail(o.id)} />
                            <IconButton size="sm" label={`Edit ${o.order_number}`} icon={<Pencil size={15} />} onClick={() => openDetailEdit(o.id)} />
                            <IconButton size="sm" label={`Delete ${o.order_number}`} icon={<Trash2 size={15} />} className="hover:bg-red-50 hover:text-red-600" onClick={() => deleteOrder(o.id)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Cards — phones */}
                <ul className="divide-y divide-line md:hidden">
                  {visible.map(o => (
                    <li key={o.id}>
                      <button type="button" onClick={() => openDetail(o.id)} className="flex w-full items-start gap-3 px-4 py-3 text-start active:bg-muted">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink tabular">{o.order_number}</span>
                            <OrderStatusBadge status={o.status} />
                          </div>
                          <p className="mt-1 truncate text-xs text-ink-3">
                            {dbDate(o.created_at).format('DD MMM, HH:mm')} · {TYPE_LABEL[o.order_type] || o.order_type}
                            {customerLabel(o) ? ` · ${customerLabel(o)}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-ink tabular">{fmt(o.total)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {hasMore && !loading && (
            <div className="flex justify-center">
              <Button variant="secondary" loading={loadingMore} onClick={loadMore}>Load more orders</Button>
            </div>
          )}
        </div>
      </div>

      {/* Order detail */}
      <Modal
        open={!!detail}
        onClose={() => { setDetail(null); setEditOpen(false) }}
        title={detail ? `Order ${detail.order_number}` : ''}
        description={detail ? dbDate(detail.created_at).format('dddd, DD MMM YYYY · HH:mm') : ''}
        width="max-w-xl"
        footer={detail && !editOpen && (
          <>
            <Button variant="secondary" leftIcon={<Pencil size={15} />} onClick={() => openEdit(detail)}>Edit</Button>
            <Button leftIcon={<Printer size={15} />} loading={printing} onClick={reprint}>Print receipt</Button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-1.5">
              <OrderStatusBadge status={detail.status} />
              <PaymentBadge method={detail.payment_method} />
              <WhatsAppBadge status={detail.whatsapp_status} />
              <span className="text-sm text-ink-3">· {TYPE_LABEL[detail.order_type] || detail.order_type}</span>
            </div>

            {!editOpen && (
              <div className="flex flex-wrap gap-2">
                {detail.customer_phone && (
                  <Button size="sm" variant="secondary" leftIcon={<MessageCircle size={14} />} onClick={sendWhatsApp}
                    disabled={['queued', 'sending'].includes(detail.whatsapp_status)}>
                    {detail.whatsapp_status === 'sent' ? 'Send WhatsApp again' : 'Send on WhatsApp'}
                  </Button>
                )}
                {detail.status === 'completed' && (
                  <>
                    <Button size="sm" variant="secondary" leftIcon={<RotateCcw size={14} />} onClick={() => updateStatus(detail.id, 'refunded')}>{t('orders.markRefunded')}</Button>
                    <Button size="sm" variant="secondary" leftIcon={<XCircle size={14} />} onClick={() => updateStatus(detail.id, 'void')}>{t('orders.markVoid')}</Button>
                  </>
                )}
                <Button size="sm" variant="danger-soft" leftIcon={<Trash2 size={14} />} onClick={() => deleteOrder(detail.id)}>Delete</Button>
              </div>
            )}

            {detail.status !== 'completed' && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                <Info size={16} /> This order is marked as {statusLabel(detail.status).toLowerCase()} and is excluded from sales totals.
              </div>
            )}

            {editOpen ? (
              <section className="space-y-3 rounded-lg border border-line p-4">
                <h3 className="text-sm font-semibold text-ink">Edit order details</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Customer name" value={editForm.customer_name} onChange={e => setEditForm(f => ({ ...f, customer_name: e.target.value }))} />
                  <Input label="Phone" type="tel" value={editForm.customer_phone} onChange={e => setEditForm(f => ({ ...f, customer_phone: e.target.value }))} />
                  <Input label="Table number" value={editForm.table_number} onChange={e => setEditForm(f => ({ ...f, table_number: e.target.value }))} />
                  <Input label="Delivery address" value={editForm.delivery_address} onChange={e => setEditForm(f => ({ ...f, delivery_address: e.target.value }))} />
                </div>
                <Textarea label="Notes" rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button loading={saving} onClick={saveDetails} leftIcon={<Save size={15} />}>Save changes</Button>
                </div>
              </section>
            ) : (
              (detail.table_number || detail.customer_name || detail.customer_phone || detail.delivery_address || detail.notes) && (
                <section className="divide-y divide-line rounded-lg bg-muted px-4 py-1">
                  {detail.table_number && <Line label="Table" value={detail.table_number} />}
                  {detail.customer_name && <Line label="Customer" value={detail.customer_name} />}
                  {detail.customer_phone && <Line label="Phone" value={detail.customer_phone} />}
                  {detail.delivery_address && <Line label="Address" value={detail.delivery_address} />}
                  {detail.notes && <Line label="Notes" value={detail.notes} />}
                </section>
              )
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold text-ink">{t('orders.items')}</h3>
              <ul className="divide-y divide-line rounded-lg border border-line">
                {(detail.items || []).map((item, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-8 shrink-0 text-ink-3 tabular">{item.qty}×</span>
                    <span className="min-w-0 flex-1 text-ink">{item.name_en}</span>
                    <span className="hidden text-xs text-ink-3 tabular sm:inline">{fmt(item.unit_price)}</span>
                    <span className="w-24 text-end font-medium text-ink tabular">{fmt(item.total_price)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="px-1">
              <Line label="Subtotal" value={fmt(detail.subtotal)} />
              {Number(detail.discount_amount) > 0 && <Line label="Discount" value={`−${fmt(detail.discount_amount)}`} className="[&>span:last-child]:text-red-600" />}
              <Line label={`VAT ${Math.round((detail.vat_rate ?? 0.15) * 100)}%`} value={fmt(detail.vat_amount)} />
              <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-base font-semibold text-ink">
                <span>Total</span><span className="tabular">{fmt(detail.total)}</span>
              </div>
              {Number(detail.amount_tendered) > 0 && <Line label="Received" value={fmt(detail.amount_tendered)} />}
              {Number(detail.change_due) > 0 && <Line label="Change" value={fmt(detail.change_due)} />}
            </section>
          </div>
        )}
      </Modal>
    </div>
  )
}
