import React, { useEffect, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input, { Select, Textarea } from '../ui/Input'
import Switch from '../ui/Switch'
import { useToast } from '../ui/Toast'

const BLANK = {
  name_en: '', name_ar: '', description_en: '', description_ar: '',
  price: '', category_id: '', image_path: '',
  discount_pct: 0, discount_fixed: 0, vat_exempt: 0,
  is_available: 1, sort_order: 0,
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
      {children}
    </section>
  )
}

export default function ItemModal({ open, onClose, initial, categories, currency = 'SAR', onSaved, onDelete }) {
  const toast = useToast()
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const sf = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

  useEffect(() => {
    if (!open) return
    setErrors({})
    setForm(initial ? {
      ...BLANK, ...initial,
      discount_pct: Number(initial.discount_pct || 0),
      discount_fixed: Number(initial.discount_fixed || 0),
    } : { ...BLANK, category_id: categories[0]?.id || '' })
  }, [open, initial, categories])

  const pickImage = async () => {
    const res = await window.api.invoke('menu-items:pick-image')
    if (res.data?.path) sf('image_path', res.data.path)
  }

  const base = parseFloat(form.price) || 0
  const effective = Math.max(0, Math.max(0, base - (Number(form.discount_fixed) || 0)) * (1 - (Number(form.discount_pct) || 0) / 100))
  const hasDiscount = form.discount_pct > 0 || form.discount_fixed > 0

  const save = async (e) => {
    e?.preventDefault()
    const errs = {}
    if (!form.name_en.trim()) errs.name_en = 'Name is required'
    if (!form.category_id) errs.category_id = 'Choose a category'
    if (form.price === '' || isNaN(+form.price) || +form.price < 0) errs.price = 'Enter a valid price'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const ch = form.id ? 'menu-items:update' : 'menu-items:create'
      const res = await window.api.invoke(ch, {
        ...form,
        price: +form.price,
        discount_pct: Number(form.discount_pct) || 0,
        discount_fixed: Number(form.discount_fixed) || 0,
        vat_exempt: form.vat_exempt ? 1 : 0,
      })
      if (res.error) { toast(res.error, 'error'); return }
      toast(form.id ? 'Item updated' : 'Item added', 'success')
      onSaved?.(); onClose?.()
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.id ? 'Edit menu item' : 'Add menu item'}
      width="max-w-2xl"
      footer={
        <>
          {form.id && onDelete && <Button variant="danger-soft" onClick={() => onDelete(form)} className="sm:me-auto">Delete item</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{form.id ? 'Save changes' : 'Add item'}</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="shrink-0">
            <div className="relative h-24 w-24">
              <button
                type="button"
                onClick={pickImage}
                aria-label={form.image_path ? 'Change image' : 'Upload image'}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 border-dashed border-line-strong bg-muted text-ink-3 transition-colors hover:border-ink hover:text-ink"
              >
                {form.image_path
                  ? <img src={`file://${form.image_path}`} alt="" className="h-full w-full object-cover" />
                  : <><ImagePlus size={20} /><span className="text-xs font-medium">Image</span></>}
              </button>
              {form.image_path && (
                <button
                  type="button" onClick={() => sf('image_path', '')} aria-label="Remove image"
                  className="absolute -end-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink-2 shadow-xs hover:text-red-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <Input label="Name (English)" required autoFocus placeholder="e.g. Cheesy Burger" value={form.name_en} error={errors.name_en} onChange={e => sf('name_en', e.target.value)} />
            <Input label="الاسم بالعربي" dir="rtl" placeholder="مثال: برجر بالجبن" value={form.name_ar} onChange={e => sf('name_ar', e.target.value)} />
            <Select label="Category" required value={form.category_id} error={errors.category_id} onChange={e => sf('category_id', +e.target.value)}>
              <option value="">Select category…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
            </Select>
            <Input label={`Price (${currency})`} required type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00"
              value={form.price} error={errors.price} onChange={e => sf('price', e.target.value)} />
          </div>
        </div>

        <Section title="Discount">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Percent off" type="number" inputMode="decimal" min="0" max="100" step="0.1" placeholder="0"
              value={form.discount_pct || ''} onChange={e => sf('discount_pct', Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
            <Input label={`Amount off (${currency})`} type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00"
              value={form.discount_fixed || ''} onChange={e => sf('discount_fixed', Math.max(0, Number(e.target.value) || 0))} />
          </div>
          {hasDiscount && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-2.5 text-sm">
              <span className="text-emerald-800">Selling price</span>
              <span className="font-semibold text-emerald-800 tabular">
                {effective.toFixed(2)} {currency}
                {base > 0 && <span className="ms-2 font-normal text-emerald-700/70 line-through">{base.toFixed(2)}</span>}
              </span>
            </div>
          )}
        </Section>

        <Section title="Description">
          <div className="grid gap-3 sm:grid-cols-2">
            <Textarea label="English" rows={2} placeholder="e.g. Double beef patty with melted cheddar" value={form.description_en || ''} onChange={e => sf('description_en', e.target.value)} />
            <Textarea label="عربي" rows={2} dir="rtl" placeholder="مثال: باتي لحم مضاعف مع جبن شيدر" value={form.description_ar || ''} onChange={e => sf('description_ar', e.target.value)} />
          </div>
        </Section>

        <Section title="Availability & tax">
          <div className="space-y-4 rounded-lg border border-line p-4">
            <Switch label="Available on POS" description="Turn off when an item is sold out" checked={!!form.is_available} onChange={v => sf('is_available', v ? 1 : 0)} />
            <Switch label="VAT exempt" description="No VAT is charged on this item" checked={!!form.vat_exempt} onChange={v => sf('vat_exempt', v ? 1 : 0)} />
            <Input label="Sort order" type="number" hint="Lower numbers show first" value={form.sort_order} onChange={e => sf('sort_order', +e.target.value)} className="max-w-[160px]" />
          </div>
        </Section>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
