import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input, { Textarea } from '../ui/Input'
import Switch from '../ui/Switch'
import { useToast } from '../ui/Toast'

const BLANK = { name_en: '', name_ar: '', icon: '', description_en: '', description_ar: '', sort_order: 0, is_active: 1 }

export default function CategoryModal({ open, onClose, initial, onSaved }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open) { setForm(initial ? { ...BLANK, ...initial } : BLANK); setError('') }
  }, [open, initial])

  const save = async (e) => {
    e?.preventDefault()
    if (!form.name_en.trim()) { setError('English name is required'); return }
    setSaving(true)
    try {
      const ch = form.id ? 'categories:update' : 'categories:create'
      const res = await window.api.invoke(ch, form)
      if (res.error) { toast(res.error, 'error'); return }
      toast(form.id ? 'Category updated' : 'Category added', 'success')
      onSaved?.(); onClose?.()
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={form.id ? 'Edit category' : t('pricing.addCategory')}
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('pricing.cancel')}</Button>
          <Button loading={saving} onClick={save}>{form.id ? 'Save changes' : 'Add category'}</Button>
        </>
      }
    >
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('pricing.nameEn')} required autoFocus value={form.name_en} error={error}
            onChange={e => { sf('name_en', e.target.value); setError('') }} />
          <Input label={t('pricing.nameAr')} dir="rtl" value={form.name_ar} onChange={e => sf('name_ar', e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Textarea label="Description (English)" rows={2} value={form.description_en || ''} onChange={e => sf('description_en', e.target.value)} />
          <Textarea label="الوصف (عربي)" rows={2} dir="rtl" value={form.description_ar || ''} onChange={e => sf('description_ar', e.target.value)} />
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-2">
          <Input label={t('pricing.sortOrder')} type="number" hint="Lower numbers show first" value={form.sort_order}
            onChange={e => sf('sort_order', +e.target.value)} />
          <Switch
            label="Visible on POS"
            description="Hidden categories don't appear at the till"
            checked={form.is_active === 1}
            onChange={v => sf('is_active', v ? 1 : 0)}
            className="pb-1"
          />
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
