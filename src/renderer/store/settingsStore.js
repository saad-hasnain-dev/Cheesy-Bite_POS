import { create } from 'zustand'
import { setLanguage } from '../i18n/index'

/** Returns #000 or #fff depending on which has better contrast against hex bg */
export function contrastText(hex = '#000000') {
  const h = (hex || '#000000').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const lin = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return L > 0.179 ? '#000000' : '#ffffff'
}

/** Convert hex + opacity to rgba string */
export function hexToRgba(hex = '#000000', alpha = 1) {
  const h = (hex || '#000000').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Darken a hex color by pct (0–1) */
function darken(hex = '#c1fbd4', pct = 0.12) {
  const h = (hex || '#c1fbd4').replace('#', '')
  const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - pct)))
  const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - pct)))
  const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - pct)))
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function applyCssVars(accent, sidebarBg) {
  const root = document.documentElement
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-hover', darken(accent))
  root.style.setProperty('--accent-text', contrastText(accent))
  root.style.setProperty('--sidebar-bg', sidebarBg)
  root.style.setProperty('--sidebar-fg', contrastText(sidebarBg))
  root.style.setProperty('--sidebar-text', contrastText(sidebarBg) === '#ffffff' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)')
  root.style.setProperty('--sidebar-active-text', contrastText(accent))
}

export const useSettingsStore = create((set) => ({
  settings: {},
  adminUnlocked: false,
  loaded: false,
  currency: 'SAR',
  restaurantName: 'Cheesy Bite',
  accentColor: '#c1fbd4',
  sidebarColor: '#000000',
  appLogoPath: '',
  receiptLogoPath: '',
  logoBgColor: '#000000',
  logoBorderRadius: 8,
  logoBgOpacity: 1,
  // POS behavior
  defaultOrderType: 'dine-in',
  cashierName: '',
  autoPrintReceipt: true,
  autoClearCart: true,
  quickDiscounts: [5, 10, 15, 20],

  load: async () => {
    const res = await window.api.invoke('settings:get-all')
    if (res.data) {
      const s = res.data
      const accent  = s.accent_color  || '#c1fbd4'
      const sidebar = s.sidebar_color || '#000000'
      applyCssVars(accent, sidebar)
      const rawDiscounts = s.quick_discounts || '5,10,15,20'
      const quickDiscounts = rawDiscounts.split(',').map(v => Number(v.trim())).filter(n => n > 0 && n <= 100)
      set({
        settings: s,
        loaded: true,
        currency: s.currency || 'SAR',
        restaurantName: s.restaurant_name_en || 'Cheesy Bite',
        accentColor: accent,
        sidebarColor: sidebar,
        appLogoPath: s.app_logo_path || '',
        receiptLogoPath: s.receipt_logo_path || '',
        logoBgColor: s.logo_bg_color || '#000000',
        logoBorderRadius: Number(s.logo_border_radius ?? 8),
        logoBgOpacity: Number(s.logo_bg_opacity ?? 1),
        defaultOrderType: s.default_order_type || 'dine-in',
        cashierName: s.cashier_name || '',
        autoPrintReceipt: s.auto_print_receipt !== '0',
        autoClearCart: s.auto_clear_cart !== '0',
        quickDiscounts,
      })
      setLanguage(s.default_language || 'en')
    }
  },

  setAdminUnlocked: (v) => set({ adminUnlocked: v }),

  updateSetting: (key, value) => set((s) => ({
    settings: { ...s.settings, [key]: value },
    ...(key === 'currency'           ? { currency: value }                        : {}),
    ...(key === 'restaurant_name_en' ? { restaurantName: value }                  : {}),
    ...(key === 'accent_color'       ? { accentColor: value }                     : {}),
    ...(key === 'sidebar_color'      ? { sidebarColor: value }                    : {}),
    ...(key === 'app_logo_path'      ? { appLogoPath: value }                     : {}),
    ...(key === 'receipt_logo_path'  ? { receiptLogoPath: value }                 : {}),
    ...(key === 'logo_bg_color'      ? { logoBgColor: value }                     : {}),
    ...(key === 'logo_border_radius' ? { logoBorderRadius: Number(value) }        : {}),
    ...(key === 'logo_bg_opacity'    ? { logoBgOpacity: Number(value) }           : {}),
  })),

  applyBranding: (accent, sidebar) => {
    applyCssVars(accent, sidebar)
    set({ accentColor: accent, sidebarColor: sidebar })
  },
}))
