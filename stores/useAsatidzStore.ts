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

  // Modals state
  isInputModalOpen: boolean;
  isFilterModalOpen: boolean;
  isDetailModalOpen: boolean;

  // Pagination
  page: number;
  pageSize: number;

  // Actions
  fetchAsatidz: () => Promise<void>;
  setSearchKeyword: (keyword: string) => void;
  setFilterValue: (key: string, value: string) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;

  // Modal toggles
  openInputModal: (asatidzToEdit?: Asatidz | null) => void;
  closeInputModal: () => void;
  openFilterModal: () => void;
  closeFilterModal: () => void;
  openDetailModal: (asatidz: Asatidz) => void;
  closeDetailModal: () => void;

  // Helper NIA generator
  generateNextNIA: (prefix: string) => string;

  // CRUD
  saveAsatidz: (data: Asatidz, isEdit: boolean, oldNia?: string) => Promise<boolean>;
  deleteAsatidz: (nia: string) => Promise<boolean>;
}

export const useAsatidzStore = create<AsatidzState>((set, get) => ({
  asatidzList: [],
  isLoading: false,
  searchKeyword: '',
  filterValues: {},
  selectedAsatidz: null,
  editAsatidzData: null,

  isInputModalOpen: false,
  isFilterModalOpen: false,
  isDetailModalOpen: false,

  page: 1,
  pageSize: 50,

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

  openInputModal: (asatidzToEdit = null) =>
    set({ isInputModalOpen: true, editAsatidzData: asatidzToEdit }),
  closeInputModal: () => set({ isInputModalOpen: false, editAsatidzData: null }),

  openFilterModal: () => set({ isFilterModalOpen: true }),
  closeFilterModal: () => set({ isFilterModalOpen: false }),

  openDetailModal: (asatidz) =>
    set({ isDetailModalOpen: true, selectedAsatidz: asatidz }),
  closeDetailModal: () => set({ isDetailModalOpen: false, selectedAsatidz: null }),

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
    return `${cleanPrefix}${String(nextNum).padStart(3, '0')}`;
  },

  saveAsatidz: async (data, isEdit, oldNia) => {
    try {
      if (isEdit && oldNia) {
        const { error } = await supabase
          .from('asatidz')
          .update(data)
          .eq('nia', oldNia);
        if (error) throw error;
        await logActivity('EDIT DEWAN ASATIDZ', `Memperbarui asatidz: ${data.nama_asatidz} (NIA: ${data.nia})`);
      } else {
        const { error } = await supabase
          .from('asatidz')
          .insert([data]);
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
    if (!confirm(`Yakin ingin menghapus asatidz dengan NIA: ${nia}?`)) return false;
    try {
      const { error } = await supabase
        .from('asatidz')
        .delete()
        .eq('nia', nia);
      if (error) throw error;
      await logActivity('HAPUS DEWAN ASATIDZ', `Menghapus asatidz NIA: ${nia}`);
      await get().fetchAsatidz();
      return true;
    } catch (err: any) {
      console.error('Delete asatidz error:', err.message);
      alert('Gagal menghapus asatidz: ' + err.message);
      return false;
    }
  },
}));
