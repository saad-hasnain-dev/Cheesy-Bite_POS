import React, { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { useSettingsStore } from './store/settingsStore'
import Sidebar, { MobileNav, NAV_ITEMS } from './components/layout/Sidebar'
import POSPage from './pages/POSPage'
import DashboardPage from './pages/DashboardPage'
import PricingPage from './pages/PricingPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import ReservationsPage from './pages/ReservationsPage'
import CustomersPage from './pages/CustomersPage'
import SettingsPage from './pages/SettingsPage'

function AppLayout() {
  const load = useSettingsStore(s => s.load)

  useEffect(() => { load() }, [])

  // Alt+1…7 jumps between pages (same order as the sidebar)
  const navigate = useNavigate()
  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      const n = Number(e.key)
      if (n >= 1 && n <= NAV_ITEMS.length) { e.preventDefault(); navigate(NAV_ITEMS[n - 1].to) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar />
      <MobileNav />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {window.__DEMO__ && (
          <div role="status" className="shrink-0 bg-amber-100 px-3 py-1.5 text-center text-xs font-medium text-amber-900">
            <span className="sm:hidden">Demo data — not saved to the restaurant database.</span>
            <span className="hidden sm:inline">Browser preview with demo data — nothing here is saved to the restaurant's database. Use the desktop app for real orders.</span>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<OrderHistoryPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </HashRouter>
  )
}
