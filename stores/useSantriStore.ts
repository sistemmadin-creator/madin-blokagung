import { create } from 'zustand';
import { Santri } from '@/types/santri';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

interface SantriState {
  santriList: Santri[];
  isLoading: boolean;
  searchKeyword: string;
  filterValues: Record<string, string>;
  hiddenColumns: string[];
  selectedSantri: Santri | null;
  editSantriData: Santri | null;
  
  // Modals state
  isInputModalOpen: boolean;
  isFilterModalOpen: boolean;
  isHideModalOpen: boolean;
  isDetailModalOpen: boolean;

  // Pagination
  page: number;
  pageSize: number;

  // Actions
  fetchSantri: () => Promise<void>;
  setSearchKeyword: (keyword: string) => void;
  setFilterValue: (key: string, value: string) => void;
  resetFilters: () => void;
  toggleColumn: (key: string) => void;
  hideAllColumns: (keys: string[]) => void;
  showAllColumns: () => void;
  setPage: (page: number) => void;
  
  // Modal toggles
  openInputModal: (santriToEdit?: Santri | null) => void;
  closeInputModal: () => void;
  openFilterModal: () => void;
  closeFilterModal: () => void;
  openHideModal: () => void;
  closeHideModal: () => void;
  openDetailModal: (santri: Santri) => void;
  closeDetailModal: () => void;

  // CRUD
  saveSantri: (data: Santri, isEdit: boolean, oldNoInduk?: string) => Promise<boolean>;
  deleteSantri: (no_induk: string) => Promise<boolean>;
}

export const useSantriStore = create<SantriState>((set, get) => ({
  santriList: [],
  isLoading: false,
  searchKeyword: '',
  filterValues: {},
  hiddenColumns: [],
  selectedSantri: null,
  editSantriData: null,
  
  isInputModalOpen: false,
  isFilterModalOpen: false,
  isHideModalOpen: false,
  isDetailModalOpen: false,

  page: 1,
  pageSize: 50,

  fetchSantri: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('*')
        .order('no_induk', { ascending: true });
      if (error) throw error;
      set({ santriList: data || [] });
    } catch (err: any) {
      console.error('Fetch santri error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword, page: 1 }),
  
  setFilterValue: (key, value) =>
    set((state) => {
      const newFilters = { ...state.filterValues };
      if (!value) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return { filterValues: newFilters, page: 1 };
    }),

  resetFilters: () => set({ filterValues: {}, searchKeyword: '', page: 1 }),

  toggleColumn: (key) =>
    set((state) => ({
      hiddenColumns: state.hiddenColumns.includes(key)
        ? state.hiddenColumns.filter((c) => c !== key)
        : [...state.hiddenColumns, key],
    })),

  hideAllColumns: (keys) => set({ hiddenColumns: keys.filter(k => k !== 'nama') }),
  showAllColumns: () => set({ hiddenColumns: [] }),

  setPage: (page) => set({ page }),

  openInputModal: (santriToEdit = null) =>
    set({ isInputModalOpen: true, editSantriData: santriToEdit }),
  closeInputModal: () => set({ isInputModalOpen: false, editSantriData: null }),

  openFilterModal: () => set({ isFilterModalOpen: true }),
  closeFilterModal: () => set({ isFilterModalOpen: false }),

  openHideModal: () => set({ isHideModalOpen: true }),
  closeHideModal: () => set({ isHideModalOpen: false }),

  openDetailModal: (santri) =>
    set({ isDetailModalOpen: true, selectedSantri: santri }),
  closeDetailModal: () => set({ isDetailModalOpen: false, selectedSantri: null }),

  saveSantri: async (data, isEdit, oldNoInduk) => {
    try {
      if (isEdit && oldNoInduk) {
        const { error } = await supabase
          .from('santri')
          .update(data)
          .eq('no_induk', oldNoInduk);
        if (error) throw error;
        await logActivity('EDIT DATA SANTRI', `Memperbarui santri No. Induk: ${data.no_induk} (${data.nama})`);
      } else {
        const { error } = await supabase
          .from('santri')
          .insert([data]);
        if (error) throw error;
        await logActivity('TAMBAH SANTRI', `Menambahkan santri baru No. Induk: ${data.no_induk} (${data.nama})`);
      }
      await get().fetchSantri();
      return true;
    } catch (err: any) {
      console.error('Save santri error:', err.message);
      alert('Gagal menyimpan santri: ' + err.message);
      return false;
    }
  },

  deleteSantri: async (no_induk) => {
    if (!confirm(`Yakin ingin menghapus santri dengan No. Induk: ${no_induk}?`)) return false;
    try {
      const { error } = await supabase
        .from('santri')
        .delete()
        .eq('no_induk', no_induk);
      if (error) throw error;
      await logActivity('HAPUS DATA SANTRI', `Menghapus santri No. Induk: ${no_induk}`);
      await get().fetchSantri();
      return true;
    } catch (err: any) {
      console.error('Delete santri error:', err.message);
      alert('Gagal menghapus santri: ' + err.message);
      return false;
    }
  },
}));
