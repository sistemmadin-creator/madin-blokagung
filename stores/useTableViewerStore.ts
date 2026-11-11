import { create } from 'zustand';

export type ZoomMode = 'fit' | '100' | 'custom';

interface TableViewerState {
  // Floating Toolbar Visibility
  isFloatingToolsVisible: boolean;
  toggleFloatingTools: () => void;
  setFloatingToolsVisible: (visible: boolean) => void;

  // Table Zoom State
  zoomScale: number; // e.g. 1.0 = 100%, 1.25 = 125%
  zoomMode: ZoomMode;
  setZoomScale: (scale: number) => void;
  setZoomMode: (mode: ZoomMode) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setFitToScreen: () => void;

  // Table Search State
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalMatches: number;
  activeMatchIndex: number; // 0-based
  setMatchesInfo: (total: number, activeIndex: number) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  matchNavigationTrigger: number; // incremental counter to signal scroll to active match
}

export const useTableViewerStore = create<TableViewerState>((set) => ({
  isFloatingToolsVisible: false,
  toggleFloatingTools: () =>
    set((state) => ({ isFloatingToolsVisible: !state.isFloatingToolsVisible })),
  setFloatingToolsVisible: (visible) => set({ isFloatingToolsVisible: visible }),

  zoomScale: 1,
  zoomMode: 'fit',
  setZoomScale: (scale) =>
    set({
      zoomScale: Math.max(0.2, Math.min(2.5, Number(scale.toFixed(2)))),
      zoomMode: 'custom',
    }),
  setZoomMode: (mode) => set({ zoomMode: mode }),
  zoomIn: () =>
    set((state) => {
      const current = state.zoomMode === 'fit' ? Math.max(state.zoomScale, 0.5) : state.zoomScale;
      const next = Math.min(2.5, Number((current + 0.15).toFixed(2)));
      return { zoomScale: next, zoomMode: 'custom' };
    }),
  zoomOut: () =>
    set((state) => {
      const next = Math.max(0.25, Number((state.zoomScale - 0.15).toFixed(2)));
      return { zoomScale: next, zoomMode: 'custom' };
    }),
  resetZoom: () => set({ zoomScale: 1, zoomMode: '100' }),
  setFitToScreen: () => set({ zoomMode: 'fit' }),

  searchQuery: '',
  setSearchQuery: (query) =>
    set({ searchQuery: query, totalMatches: 0, activeMatchIndex: 0 }),
  totalMatches: 0,
  activeMatchIndex: 0,
  setMatchesInfo: (total, activeIndex) =>
    set({ totalMatches: total, activeMatchIndex: activeIndex }),
  nextMatch: () =>
    set((state) => {
      if (state.totalMatches <= 0) return state;
      const nextIndex = (state.activeMatchIndex + 1) % state.totalMatches;
      return {
        activeMatchIndex: nextIndex,
        matchNavigationTrigger: state.matchNavigationTrigger + 1,
      };
    }),
  prevMatch: () =>
    set((state) => {
      if (state.totalMatches <= 0) return state;
      const prevIndex =
        (state.activeMatchIndex - 1 + state.totalMatches) % state.totalMatches;
      return {
        activeMatchIndex: prevIndex,
        matchNavigationTrigger: state.matchNavigationTrigger + 1,
      };
    }),
  matchNavigationTrigger: 0,
}));
