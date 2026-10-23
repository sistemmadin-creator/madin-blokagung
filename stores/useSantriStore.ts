import { create } from 'zustand';
import { Santri } from '@/types/santri';
import { supabase } from '@/lib/supabase/client';

interface SantriState {
  santriList: Santri[];
  isLoading: boolean;
  filterValues: Record<string, string>;
  hiddenColumns: string[];
  selectedSantri: Santri | null;
  fetchSantri: () => Promise<void>;
  setFilterValue: (key: string, value: string) => void;
  resetFilters: () => void;
  toggleColumn: (key: string) => void;
  setSelectedSantri: (santri: Santri | null) => void;
}

export const useSantriStore = create<SantriState>((set, get) => ({
  santriList: [],
  isLoading: false,
  filterValues: {},
  hiddenColumns: [],
  selectedSantri: null,
  fetchSantri: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .order('no_induk', { ascending: true });
      if (error) throw error;
      set({ santriList: data || [] });
    } catch (err) {
      console.error('Fetch santri error:', err);
    } finally {
      set({ isLoading: false });
    }
  },
  setFilterValue: (key, value) =>
    set((state) => ({ filterValues: { ...state.filterValues, [key]: value } })),
  resetFilters: () => set({ filterValues: {} }),
  toggleColumn: (key) =>
    set((state) => ({
      hiddenColumns: state.hiddenColumns.includes(key)
        ? state.hiddenColumns.filter((c) => c !== key)
        : [...state.hiddenColumns, key],
    })),
  setSelectedSantri: (santri) => set({ selectedSantri: santri }),
}));
