import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, UserPlus, Mail, MessageCircle, Pencil, Trash2, Users, ReceiptText } from 'lucide-react'
import Header from '../components/layout/Header'
import Modal from '../components/ui/Modal'
import Card from '../components/ui/Card'
import Button, { IconButton } from '../components/ui/Button'
import Input, { Select, Textarea, SearchInput } from '../components/ui/Input'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { Avatar } from '../components/reservations/reservationMeta'
import { OrderStatusBadge, TYPE_LABEL } from '../components/orders/orderMeta'
import { useSettingsStore } from '../store/settingsStore'
import { useToast } from '../components/ui/Toast'
import { dbDate } from '../utils/dates'

const SORTS = {
  name:   { label: 'Name (A–Z)',    fn: (a, b) => a.name.localeCompare(b.name) },
  spent:  { label: 'Top spenders',  fn: (a, b) => (b.total_spent || 0) - (a.total_spent || 0) },
  orders: { label: 'Most orders',   fn: (a, b) => (b.total_orders || 0) - (a.total_orders || 0) },
  newest: { label: 'Newest',        fn: (a, b) => String(b.created_at).localeCompare(String(a.created_at)) },
}

function waNumber(phone) {
  let p = (phone || '').replace(/\D/g, '')
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('0')) p = '966' + p.slice(1)
  if (p.length <= 9) p = '966' + p
  return p
}

export default function CustomersPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const currency = useSettingsStore(s => s.currency)

  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editCust, setEditCust] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const searchTimer = useRef(null)

  const fmt = (n) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`

  const load = async (q = search) => {
    setLoading(true)
    const res = await window.api.invoke('customers:list', { search: q || undefined })
    if (res.data) setCustomers(res.data)
    setLoading(false)
  }

  useEffect(() => { load('') }, [])

  // Search after the user pauses typing
  const onSearch = (v) => {
    setSearch(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(v), 250)
  }

  const sorted = useMemo(() => [...customers].sort(SORTS[sort].fn), [customers, sort])
  const repeat = customers.filter(c => (c.total_orders || 0) > 1).length
  const lifetime = customers.reduce((s, c) => s + (c.total_spent || 0), 0)

  const openDetail = async (c) => {
    const res = await window.api.invoke('customers:get', { id: c.id })
    if (res.data) setDetail({ ...res.data, total_orders: c.total_orders, total_spent: c.total_spent })
  }

  const openEdit = (c) => {
    setEditCust(c || null)
    setForm({ name: c?.name || '', phone: c?.phone || '', email: c?.email || '', notes: c?.notes || '' })
    setFormError('')
    setShowForm(true)
  }

  const saveCustomer = async (e) => {
    e?.preventDefault()
    if (!form.name.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    try {
      const ch = editCust?.id ? 'customers:update' : 'customers:create'
      const payload = editCust?.id ? { id: editCust.id, ...form } : form
      const res = await window.api.invoke(ch, payload)
      if (res.error) { toast(res.error, 'error'); return }
      if (res.data?.existed) { toast('A customer with this phone number already exists', 'info'); return }
      toast(editCust ? 'Customer updated' : 'Customer added', 'success')
      setShowForm(false)
      if (detail && editCust?.id === detail.id) setDetail(d => ({ ...d, ...form }))
      load()
    } finally { setSaving(false) }
  }

  const deleteCustomer = async (c) => {
    if (!confirm(`Delete ${c.name}? Their order history will remain.`)) return
    const res = await window.api.invoke('customers:delete', { id: c.id })
    if (res.error) { toast(res.error, 'error'); return }
    toast('Customer deleted', 'success')
    if (detail?.id === c.id) setDetail(null)
    load()
  }

  const openWhatsApp = (phone) => phone && window.api.invoke('shell:open-external', `https://wa.me/${waNumber(phone)}`)
  const openGmail = (email, name) => {
    if (!email) return
    const subject = encodeURIComponent('Hello from Cheesy Bite')
    const body = encodeURIComponent(`Dear ${name || 'Valued Customer'},\n\nThank you for visiting us!\n\nBest regards,\nCheesy Bite Team`)
    window.api.invoke('shell:open-external', `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`)
  }

  const exportCsv = async () => {
    const res = await window.api.invoke('export:customers-csv')
    if (res.data) toast(`Exported to ${res.data}`, 'success')
    else toast(res.error || 'Export cancelled', 'info')
  }

  const rowActions = (c) => (
    <div className="flex shrink-0 justify-end gap-0.5" onClick={e => e.stopPropagation()}>
      {c.phone && <IconButton size="sm" label={`WhatsApp ${c.name}`} icon={<MessageCircle size={15} />} className="hover:bg-emerald-50 hover:text-emerald-700" onClick={() => openWhatsApp(c.phone)} />}
      <IconButton size="sm" label={`Edit ${c.name}`} icon={<Pencil size={15} />} onClick={() => openEdit(c)} />
      <IconButton size="sm" label={`Delete ${c.name}`} icon={<Trash2 size={15} />} className="hover:bg-red-50 hover:text-red-600" onClick={() => deleteCustomer(c)} />
    </div>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header
        title={t('customers.title')}
        actions={
          <>
            <IconButton variant="secondary" label={t('customers.export')} icon={<Download size={16} />} onClick={exportCsv} />
            <Button leftIcon={<UserPlus size={16} />} onClick={() => openEdit(null)}>
              <span className="hidden sm:inline">{t('customers.add')}</span><span className="sm:hidden">Add</span>
            </Button>
          </>
        }
      />

      <div className="shrink-0 border-b border-line bg-surface px-3 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput className="w-full sm:w-80" value={search} onChange={onSearch} placeholder="Search name, phone or email" />
          {loading && <Spinner size={14} className="text-ink-3" />}
          <Select aria-label="Sort by" value={sort} onChange={e => setSort(e.target.value)} className="ms-auto w-44">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-4 p-3 sm:p-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: search ? 'Matching' : 'Customers', value: customers.length },
              { label: 'Repeat customers', value: repeat },
              { label: 'Lifetime sales', value: fmt(lifetime) },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-line bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-xs text-ink-3">{s.label}</p>
                <p className="mt-0.5 break-words text-sm font-semibold leading-tight text-ink tabular sm:text-base">{s.value}</p>
              </div>
            ))}
          </div>

          <Card className="overflow-hidden">
            {sorted.length === 0 && !loading ? (
              <EmptyState
                icon={<Users size={20} />}
                title={search ? `No customers match “${search}”` : 'No customers yet'}
                description={search ? undefined : 'Customers are added automatically when you enter a phone number at checkout.'}
                action={!search && <Button leftIcon={<UserPlus size={16} />} onClick={() => openEdit(null)}>Add customer</Button>}
              />
            ) : (
              <>
                <table className="hidden w-full text-sm md:table">
                  <thead className="border-b border-line bg-muted/60 text-xs text-ink-3">
                    <tr>
                      <th scope="col" className="px-5 py-2.5 text-start font-medium">Customer</th>
                      <th scope="col" className="px-4 py-2.5 text-start font-medium">Contact</th>
                      <th scope="col" className="px-4 py-2.5 text-end font-medium">Orders</th>
                      <th scope="col" className="px-4 py-2.5 text-end font-medium">Total spent</th>
                      <th scope="col" className="hidden px-4 py-2.5 text-start font-medium lg:table-cell">Joined</th>
                      <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {sorted.map(c => (
                      <tr key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(c)}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">{c.name}</p>
                              {c.notes && <p className="max-w-[220px] truncate text-xs text-ink-3">{c.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-ink-2 tabular">{c.phone || '—'}</p>
                          {c.email && <p className="max-w-[220px] truncate text-xs text-ink-3">{c.email}</p>}
                        </td>
                        <td className="px-4 py-3 text-end text-ink tabular">{c.total_orders || 0}</td>
                        <td className="px-4 py-3 text-end font-medium text-ink tabular">{fmt(c.total_spent)}</td>
                        <td className="hidden px-4 py-3 text-ink-3 tabular lg:table-cell">{dbDate(c.created_at).format('D MMM YYYY')}</td>
                        <td className="px-3 py-2">{rowActions(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <ul className="divide-y divide-line md:hidden">
                  {sorted.map(c => (
                    <li key={c.id}>
                      <button type="button" onClick={() => openDetail(c)} className="flex w-full items-center gap-3 px-4 py-3 text-start active:bg-muted">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                          <p className="truncate text-xs text-ink-3 tabular">{c.phone || c.email || 'No contact'}</p>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="text-sm font-medium text-ink tabular">{fmt(c.total_spent)}</p>
                          <p className="text-xs text-ink-3 tabular">{c.total_orders || 0} orders</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Customer profile */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Customer"
        width="max-w-lg"
        footer={detail && (
          <>
            <Button variant="danger-soft" leftIcon={<Trash2 size={15} />} onClick={() => deleteCustomer(detail)} className="sm:me-auto">Delete</Button>
            {detail.email && <Button variant="secondary" leftIcon={<Mail size={15} />} onClick={() => openGmail(detail.email, detail.name)}>Email</Button>}
            {detail.phone && <Button variant="secondary" leftIcon={<MessageCircle size={15} />} onClick={() => openWhatsApp(detail.phone)}>WhatsApp</Button>}
            <Button leftIcon={<Pencil size={15} />} onClick={() => openEdit(detail)}>Edit</Button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={detail.name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-ink">{detail.name}</p>
                <p className="text-sm text-ink-3 tabular">{[detail.phone, detail.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
              </div>
            </div>
            {detail.notes && <p className="rounded-lg bg-muted px-3 py-2.5 text-sm text-ink-2">{detail.notes}</p>}

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Orders', value: detail.total_orders ?? detail.orders?.length ?? 0 },
                { label: 'Total spent', value: fmt(detail.total_spent) },
                { label: 'Customer since', value: dbDate(detail.created_at).format('MMM YYYY') },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-line px-3 py-2.5">
                  <p className="text-xs text-ink-3">{s.label}</p>
                  <p className="mt-0.5 break-words text-sm font-semibold text-ink tabular">{s.value}</p>
                </div>
              ))}
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-ink">Recent orders</h3>
              {!detail.orders?.length ? (
                <EmptyState icon={<ReceiptText size={18} />} title="No orders yet" className="py-8" />
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {detail.orders.map(o => (
                    <li key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink tabular">{o.order_number}</p>
                        <p className="text-xs text-ink-3">{dbDate(o.created_at).format('D MMM YYYY, HH:mm')} · {TYPE_LABEL[o.order_type] || o.order_type}</p>
                      </div>
                      <OrderStatusBadge status={o.status} />
                      <span className="w-24 text-end text-sm font-medium text-ink tabular">{fmt(o.total)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal>

      {/* Add / edit */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editCust ? 'Edit customer' : 'Add customer'}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={saving} onClick={saveCustomer}>{editCust ? 'Save changes' : 'Add customer'}</Button>
          </>
        }
      >
        <form onSubmit={saveCustomer} className="space-y-4">
          <Input label="Full name" required autoFocus placeholder="e.g. Saad Hasnain" value={form.name} error={formError}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError('') }} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Phone" type="tel" inputMode="tel" placeholder="05XXXXXXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" type="email" placeholder="name@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <Textarea label="Notes" rows={2} placeholder="Preferences, allergies…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <button type="submit" hidden />
        </form>
      </Modal>
    </div>
  )
}
