import { create } from 'zustand';
import { AppSettingsGlobal } from '@/types/settings';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  activePage: string;
  setActivePage: (page: string) => void;
  settings: AppSettingsGlobal;
  setSettings: (settings: Partial<AppSettingsGlobal>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
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
