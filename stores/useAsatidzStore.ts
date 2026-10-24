/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { Asatidz } from '@/types/asatidz';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

interface AsatidzState {
  asatidzList: Asatidz[];
  isLoading: boolean;
  searchKeyword: string;
  filterValues: Record<string, string>;
  selectedAsatidz: Asatidz | null;
  editAsatidzData: Asatidz | null;

  // Multi-row selection & Column visibility
  selectedNiaList: string[];
  hiddenColumns: string[];

  // Modals state
  isInputModalOpen: boolean;
  isFilterModalOpen: boolean;
  isDetailModalOpen: boolean;
  isImportModalOpen: boolean;
  isHideModalOpen: boolean;
  isFotoZoomOpen: boolean;
  zoomFotoData: { url: string; nama: string; nia?: string } | null;

  // Pagination & Sorting
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: 'asc' | 'desc';

  // Actions
  fetchAsatidz: () => Promise<void>;
  setSearchKeyword: (keyword: string) => void;
  setFilterValue: (key: string, value: string) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (key: string) => void;

  // Selection Actions
  toggleSelectRow: (nia: string) => void;
  toggleSelectAll: (keys: string[]) => void;
  clearSelection: () => void;

  // Column Visibility Actions
  toggleColumn: (key: string) => void;
  hideAllColumns: (keys: string[]) => void;
  showAllColumns: () => void;

  // Modal toggles
  openInputModal: (asatidzToEdit?: Asatidz | null) => void;
  closeInputModal: () => void;
  openFilterModal: () => void;
  closeFilterModal: () => void;
  openDetailModal: (asatidz: Asatidz) => void;
  closeDetailModal: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  openHideModal: () => void;
  closeHideModal: () => void;
  openFotoZoom: (url: string, nama: string, nia?: string) => void;
  closeFotoZoom: () => void;

  // Helper NIA generator
  generateNextNIA: (prefix: string) => string;

  // CRUD
  saveAsatidz: (data: Asatidz, isEdit: boolean, oldNia?: string) => Promise<boolean>;
  deleteAsatidz: (nia: string) => Promise<boolean>;
  deleteSelectedAsatidz: () => Promise<boolean>;
}

export const useAsatidzStore = create<AsatidzState>((set, get) => ({
  asatidzList: [],
  isLoading: false,
  searchKeyword: '',
  filterValues: {},
  selectedAsatidz: null,
  editAsatidzData: null,

  selectedNiaList: [],
  hiddenColumns: ['alamat_asal'],

  isInputModalOpen: false,
  isFilterModalOpen: false,
  isDetailModalOpen: false,
  isImportModalOpen: false,
  isHideModalOpen: false,
  isFotoZoomOpen: false,
  zoomFotoData: null,

  page: 1,
  pageSize: 25,
  sortKey: 'nama_asatidz',
  sortDirection: 'asc',

  fetchAsatidz: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('asatidz')
        .select('*')
        .order('nama_asatidz', { ascending: true });
      if (error) throw error;
      set({ asatidzList: data || [] });
    } catch (err: any) {
      console.error('Fetch asatidz error:', err.message);
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

  setPage: (page) => set({ page }),

  setPageSize: (size) => set({ pageSize: size, page: 1 }),

  setSort: (key) =>
    set((state) => {
      if (state.sortKey === key) {
        return {
          sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
          page: 1,
        };
      }
      return { sortKey: key, sortDirection: 'asc', page: 1 };
    }),

  toggleSelectRow: (nia) =>
    set((state) => {
      const exists = state.selectedNiaList.includes(nia);
      return {
        selectedNiaList: exists
          ? state.selectedNiaList.filter((item) => item !== nia)
          : [...state.selectedNiaList, nia],
      };
    }),

  toggleSelectAll: (keys) =>
    set((state) => {
      const allSelected = keys.every((k) => state.selectedNiaList.includes(k));
      if (allSelected) {
        return {
          selectedNiaList: state.selectedNiaList.filter((k) => !keys.includes(k)),
        };
      } else {
        const setUnion = new Set([...state.selectedNiaList, ...keys]);
        return { selectedNiaList: Array.from(setUnion) };
      }
    }),

  clearSelection: () => set({ selectedNiaList: [] }),

  toggleColumn: (key) =>
    set((state) => {
      const isHidden = state.hiddenColumns.includes(key);
      return {
        hiddenColumns: isHidden
          ? state.hiddenColumns.filter((k) => k !== key)
          : [...state.hiddenColumns, key],
      };
    }),

  hideAllColumns: (keys) => set({ hiddenColumns: keys }),

  showAllColumns: () => set({ hiddenColumns: [] }),

  openInputModal: (asatidzToEdit = null) =>
    set({ isInputModalOpen: true, editAsatidzData: asatidzToEdit }),
  closeInputModal: () => set({ isInputModalOpen: false, editAsatidzData: null }),

  openFilterModal: () => set({ isFilterModalOpen: true }),
  closeFilterModal: () => set({ isFilterModalOpen: false }),

  openDetailModal: (asatidz) =>
    set({ isDetailModalOpen: true, selectedAsatidz: asatidz }),
  closeDetailModal: () => set({ isDetailModalOpen: false, selectedAsatidz: null }),

  openImportModal: () => set({ isImportModalOpen: true }),
  closeImportModal: () => set({ isImportModalOpen: false }),

  openHideModal: () => set({ isHideModalOpen: true }),
  closeHideModal: () => set({ isHideModalOpen: false }),

  openFotoZoom: (url, nama, nia) =>
    set({ isFotoZoomOpen: true, zoomFotoData: { url, nama, nia } }),
  closeFotoZoom: () => set({ isFotoZoomOpen: false, zoomFotoData: null }),

  generateNextNIA: (prefix: string) => {
    const list = get().asatidzList;
    const cleanPrefix = String(prefix || '').trim().toUpperCase();
    if (!cleanPrefix) return '';

    let maxNum = 0;
    list.forEach((row) => {
      const nia = String(row.nia || '').trim().toUpperCase();
      if (nia.length > cleanPrefix.length && nia.startsWith(cleanPrefix)) {
        const num = parseInt(nia.substring(cleanPrefix.length), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    return `${cleanPrefix}${nextNum}`;
  },

  saveAsatidz: async (data, isEdit, oldNia) => {
    try {
      const payload: Record<string, any> = { ...data };
      delete payload.id; // Let supabase handle primary key or update
      if (payload.nama_asatidz) {
        payload.nama_asatidz = String(payload.nama_asatidz).toUpperCase();
      }

      if (isEdit && oldNia) {
        const { error } = await supabase
          .from('asatidz')
          .update(payload)
          .eq('nia', oldNia);
        if (error) throw error;
        await logActivity('EDIT DEWAN ASATIDZ', `Memperbarui asatidz: ${data.nama_asatidz} (NIA: ${data.nia})`);
      } else {
        const { error } = await supabase
          .from('asatidz')
          .insert([payload]);
        if (error) throw error;
        await logActivity('TAMBAH ASATIDZ', `Menambahkan asatidz baru: ${data.nama_asatidz} (NIA: ${data.nia})`);
      }
      await get().fetchAsatidz();
      return true;
    } catch (err: any) {
      console.error('Save asatidz error:', err.message);
      alert('Gagal menyimpan asatidz: ' + err.message);
      return false;
    }
  },

  deleteAsatidz: async (nia) => {
    try {
      const { error } = await supabase
        .from('asatidz')
        .delete()
        .eq('nia', nia);
      if (error) throw error;
      await logActivity('HAPUS DEWAN ASATIDZ', `Menghapus asatidz NIA: ${nia}`);
      set((state) => ({
        selectedNiaList: state.selectedNiaList.filter((n) => n !== nia),
      }));
      await get().fetchAsatidz();
      return true;
    } catch (err: any) {
      console.error('Delete asatidz error:', err.message);
      alert('Gagal menghapus asatidz: ' + err.message);
      return false;
    }
  },

  deleteSelectedAsatidz: async () => {
    const selected = get().selectedNiaList;
    if (selected.length === 0) return false;

    try {
      const { error } = await supabase
        .from('asatidz')
        .delete()
        .in('nia', selected);
      if (error) throw error;
      await logActivity('HAPUS BANYAK ASATIDZ', `Menghapus ${selected.length} asatidz terpilih`);
      set({ selectedNiaList: [] });
      await get().fetchAsatidz();
      return true;
    } catch (err: any) {
      console.error('Delete bulk asatidz error:', err.message);
      alert('Gagal menghapus asatidz terpilih: ' + err.message);
      return false;
    }
  },
}));
