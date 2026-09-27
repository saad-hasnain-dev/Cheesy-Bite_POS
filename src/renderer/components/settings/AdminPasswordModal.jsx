import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Button from '../ui/Button'
import { useSettingsStore } from '../../store/settingsStore'

export default function AdminPasswordModal({ open, onClose, onUnlocked }) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAdminUnlocked = useSettingsStore(s => s.setAdminUnlocked)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await window.api.invoke('settings:verify-password', { password })
      if (res.data) {
        setAdminUnlocked(true)
        setPassword('')
        onUnlocked?.()
        onClose?.()
      } else {
        setError(t('common.wrongPassword'))
      }
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('common.adminRequired')} width="max-w-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-ink-2">
          <ShieldCheck size={22} />
        </div>
        <p className="text-center text-sm text-ink-3">{t('common.enterPassword')}</p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <Input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            error={error}
            autoFocus
          />
          <Button type="submit" loading={loading} block>{t('common.unlock')}</Button>
        </form>
      </div>
    </Modal>
  )
}
