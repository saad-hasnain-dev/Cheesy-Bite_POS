import React, { useEffect, useState } from 'react'
import { Minus, Plus, AlertTriangle } from 'lucide-react'
import dayjs from 'dayjs'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input, { Field, Textarea } from '../ui/Input'
import { useToast } from '../ui/Toast'

const blank = () => ({
  customer_name: '', phone: '', email: '', guest_count: 2,
  reserved_at: dayjs().add(1, 'hour').startOf('hour').format('YYYY-MM-DDTHH:mm'),
  table_number: '', notes: '',
})

function GuestStepper({ value, onChange, min = 1, max = 50 }) {
  return (
    <div className="inline-flex h-9 items-center rounded-md border border-line bg-surface">
      <button type="button" aria-label="Fewer guests" onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-full w-9 items-center justify-center rounded-s-md text-ink-2 hover:bg-muted"><Minus size={15} /></button>
      <span className="w-10 text-center text-sm font-semibold tabular" aria-live="polite">{value}</span>
      <button type="button" aria-label="More guests" onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-full w-9 items-center justify-center rounded-e-md text-ink-2 hover:bg-muted"><Plus size={15} /></button>
    </div>
  )
}

/**
 * Create / edit a reservation. `existing` is the full list, used to warn about
 * the same table being booked within two hours.
 */
export default function ReservationForm({ open, onClose, initial, existing = [], onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const sf = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  useEffect(() => {
    if (open) { setForm(initial ? { ...initial } : blank()); setErrors({}) }
  }, [open, initial])

  // Fill in a known customer's details from their phone number
  const lookupPhone = async () => {
    const phone = (form.phone || '').trim()
    if (!phone || form.customer_name) return
    const res = await window.api.invoke('customers:find-by-phone', { phone })
    if (res?.data) setForm(f => ({ ...f, customer_name: res.data.name || f.customer_name, email: f.email || res.data.email || '' }))
  }

  const clash = form.table_number && form.reserved_at
    ? existing.find(r => r.id !== form.id && ['confirmed', 'seated'].includes(r.status) &&
        String(r.table_number).trim() === String(form.table_number).trim() &&
        Math.abs(dayjs(r.reserved_at).diff(dayjs(form.reserved_at), 'minute')) < 120)
    : null
  const inPast = form.reserved_at && !form.id && dayjs(form.reserved_at).isBefore(dayjs().subtract(5, 'minute'))

  const save = async (e) => {
    e?.preventDefault()
    const errs = {}
    if (!form.customer_name?.trim()) errs.customer_name = 'Guest name is required'
    if (!form.reserved_at) errs.reserved_at = 'Choose a date and time'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const res = await window.api.invoke(form.id ? 'reservations:update' : 'reservations:create', form)
      if (res.error) { toast(res.error, 'error'); return }
      toast(form.id ? 'Reservation updated' : 'Reservation created', 'success')
      onSaved?.(); onClose?.()
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.id ? 'Edit reservation' : 'New reservation'}
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{form.id ? 'Save changes' : 'Create reservation'}</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Phone" type="tel" inputMode="tel" placeholder="05XXXXXXXX" value={form.phone || ''}
            hint="Existing customers fill in automatically" onChange={e => sf('phone', e.target.value)} onBlur={lookupPhone} />
          <Input label="Guest name" required autoFocus placeholder="Full name" value={form.customer_name || ''}
            error={errors.customer_name} onChange={e => sf('customer_name', e.target.value)} />
        </div>
        <Input label="Email" type="email" placeholder="name@example.com" value={form.email || ''} onChange={e => sf('email', e.target.value)} />

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input label="Date & time" required type="datetime-local" value={form.reserved_at || ''}
            error={errors.reserved_at} onChange={e => sf('reserved_at', e.target.value)} />
          <Field label="Guests">
            <GuestStepper value={Number(form.guest_count) || 2} onChange={v => sf('guest_count', v)} />
          </Field>
        </div>
        <Input label="Table" placeholder="e.g. 7" value={form.table_number || ''} onChange={e => sf('table_number', e.target.value)} className="sm:max-w-[200px]" />

        {clash && (
          <div role="alert" className="flex gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Table {form.table_number} is already booked for <strong>{clash.customer_name}</strong> at {dayjs(clash.reserved_at).format('HH:mm, D MMM')}.</span>
          </div>
        )}
        {inPast && (
          <div role="alert" className="flex gap-2.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> This time is in the past.
          </div>
        )}

        <Textarea label="Notes" rows={2} placeholder="Dietary needs, occasion, seating preference…" value={form.notes || ''} onChange={e => sf('notes', e.target.value)} />
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
