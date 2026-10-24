import { create } from 'zustand';
import { AppSettingsGlobal } from '@/types/settings';

interface AppState {
  // Mobile drawer state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Desktop collapsible state (88px collapsed vs 260px expanded)
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  activePage: string;
  setActivePage: (page: string) => void;
  settings: AppSettingsGlobal;
  setSettings: (settings: Partial<AppSettingsGlobal>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Default expanded (260px) as seen in Gambar 1
  isSidebarCollapsed: false,
  toggleSidebarCollapse: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  activePage: 'santri',
  setActivePage: (page) => set({ activePage: page }),
  settings: {
    tree1: {},
    tree2: {},
    tree3: {},
  },
  setSettings: (newSettings) =>
    set((state) => ({ settings: { ...state.settings, ...newSettings } })),
}));
