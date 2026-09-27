import { create } from 'zustand'

function readCollapsed() {
  try { return localStorage.getItem('sidebar-collapsed') === '1' } catch { return false }
}

export const useUiStore = create((set) => ({
  // Mobile navigation drawer
  navOpen: false,
  openNav: () => set({ navOpen: true }),
  closeNav: () => set({ navOpen: false }),
  // Desktop sidebar collapsed to icons (remembered per machine)
  sidebarCollapsed: readCollapsed(),
  toggleSidebar: () => set((s) => {
    const next = !s.sidebarCollapsed
    try { localStorage.setItem('sidebar-collapsed', next ? '1' : '0') } catch {}
    return { sidebarCollapsed: next }
  }),
}))
