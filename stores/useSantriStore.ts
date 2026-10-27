import { create } from 'zustand';
import { Santri } from '@/types/santri';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import { calculateFieldDelta } from '@/lib/utils/deltaHelper';

interface SantriState {
  santriList: Santri[];
  isLoading: boolean;
  searchKeyword: string;
  filterValues: Record<string, string>;
  hiddenColumns: string[];
  selectedSantri: Santri | null;
  editSantriData: Santri | null;
  selectedNoInduk: string[];
  
  // Modals state
  isInputModalOpen: boolean;
  isFilterModalOpen: boolean;
  isHideModalOpen: boolean;
  isDetailModalOpen: boolean;

  // Pagination & Sorting
  page: number;
  pageSize: number;
  sortKey: string | null;
  sortDirection: 'asc' | 'desc';

  // Actions
  fetchSantri: () => Promise<void>;
  setSearchKeyword: (keyword: string) => void;
  setFilterValue: (key: string, value: string) => void;
  resetFilters: () => void;
  toggleColumn: (key: string) => void;
  hideAllColumns: (keys: string[]) => void;
  showAllColumns: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (key: string) => void;
  toggleSelectRow: (noInduk: string) => void;
  toggleSelectAll: (keys: string[]) => void;
  clearSelection: () => void;
  
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
  saveSantri: (
    data: Santri,
    isEdit: boolean,
    oldNoInduk?: string,
    skipHistory?: boolean
  ) => Promise<boolean>;
  deleteSantri: (no_induk: string, skipHistory?: boolean) => Promise<boolean>;
  deleteSelectedSantri: (skipHistory?: boolean) => Promise<boolean>;
  deleteAllSantri: () => Promise<boolean>;
  handleRealtimeSantri: (payload: { eventType: string; new?: any; old?: any }) => void;
}

export const useSantriStore = create<SantriState>((set, get) => ({
  santriList: [],
  isLoading: false,
  searchKeyword: '',
  filterValues: {},
  hiddenColumns: [],
  selectedSantri: null,
  editSantriData: null,
  selectedNoInduk: [],
  
  isInputModalOpen: false,
  isFilterModalOpen: false,
  isHideModalOpen: false,
  isDetailModalOpen: false,

  page: 1,
  pageSize: 25,
  sortKey: 'no_induk',
  sortDirection: 'asc',

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
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  setSort: (key) =>
    set((state) => {
      if (state.sortKey === key) {
        return {
          sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        sortKey: key,
        sortDirection: 'asc',
      };
    }),

  toggleSelectRow: (noInduk) =>
    set((state) => ({
      selectedNoInduk: state.selectedNoInduk.includes(noInduk)
        ? state.selectedNoInduk.filter((id) => id !== noInduk)
        : [...state.selectedNoInduk, noInduk],
    })),

  toggleSelectAll: (keys) =>
    set((state) => {
      const allSelected = keys.every((k) => state.selectedNoInduk.includes(k));
      if (allSelected) {
        return {
          selectedNoInduk: state.selectedNoInduk.filter((id) => !keys.includes(id)),
        };
      }
      return {
        selectedNoInduk: Array.from(new Set([...state.selectedNoInduk, ...keys])),
      };
    }),

  clearSelection: () => set({ selectedNoInduk: [] }),

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

  saveSantri: async (data, isEdit, oldNoInduk, skipHistory = false) => {
    try {
      const prevSantri = isEdit
        ? get().santriList.find((s) => s.no_induk === (oldNoInduk || data.no_induk))
        : null;

      if (isEdit && oldNoInduk) {
        const { error } = await supabase
          .from('santri')
          .update(data)
          .eq('no_induk', oldNoInduk);
        if (error) throw error;
        await logActivity('EDIT DATA SANTRI', `Memperbarui santri No. Induk: ${data.no_induk} (${data.nama})`);

        if (!skipHistory && prevSantri) {
          const { prevDelta, nextDelta, hasChanges } = calculateFieldDelta(prevSantri, data);
          if (hasChanges) {
            useUndoRedoStore.getState().recordAction({
              module: 'santri',
              title: `Edit Santri: ${data.nama}`,
              undo: async () => {
                const { data: existRow } = await supabase
                  .from('santri')
                  .select('*')
                  .eq('no_induk', data.no_induk)
                  .maybeSingle();

                if (!existRow) {
                  console.warn(`[UNDO SANTRI] Gagal: Santri ${data.no_induk} tidak ditemukan.`);
                  await get().fetchSantri();
                  return false;
                }

                // Deteksi konflik OCC: jika field yang kita ubah di nextDelta ternyata sudah diubah lagi oleh orang lain di server
                const conflictingKeys = Object.keys(nextDelta).filter(
                  (k) => (existRow as any)[k] !== (nextDelta as any)[k]
                );

                if (conflictingKeys.length > 0) {
                  const serverValuesStr = conflictingKeys
                    .map((k) => `${k}: "${(existRow as any)[k]}"`)
                    .join(', ');
                  const undoValuesStr = conflictingKeys
                    .map((k) => `${k}: "${(prevDelta as any)[k]}"`)
                    .join(', ');

                  const proceed = await useUndoRedoStore.getState().requestConflictResolution({
                    title: 'Peringatan Konflik Data Santri',
                    entityName: `${existRow.nama || data.nama} (No. Induk: ${data.no_induk})`,
                    message: `Kolom [${conflictingKeys.join(', ')}] telah diubah oleh pengguna lain di server sejak aksi Anda disimpan.`,
                    currentServerState: serverValuesStr,
                    proposedUndoState: undoValuesStr,
                  });

                  if (!proceed) {
                    await get().fetchSantri();
                    return false;
                  }
                }

                await supabase.from('santri').update(prevDelta).eq('no_induk', data.no_induk);
                await get().fetchSantri();
                return true;
              },
              redo: async () => {
                const targetKey = (prevDelta.no_induk as string) || data.no_induk;
                const { data: existRow } = await supabase
                  .from('santri')
                  .select('no_induk')
                  .eq('no_induk', targetKey)
                  .maybeSingle();

                if (!existRow) {
                  console.warn(`[REDO SANTRI] Gagal: Santri ${targetKey} tidak ditemukan.`);
                  await get().fetchSantri();
                  return false;
                }

                await supabase.from('santri').update(nextDelta).eq('no_induk', targetKey);
                await get().fetchSantri();
                return true;
              },
            });
          }
        }
      } else {
        const { error } = await supabase
          .from('santri')
          .insert([data]);
        if (error) throw error;
        await logActivity('TAMBAH SANTRI', `Menambahkan santri baru No. Induk: ${data.no_induk} (${data.nama})`);

        if (!skipHistory) {
          useUndoRedoStore.getState().recordAction({
            module: 'santri',
            title: `Tambah Santri: ${data.nama}`,
            undo: async () => {
              await supabase.from('santri').delete().eq('no_induk', data.no_induk);
              await get().fetchSantri();
              return true;
            },
            redo: async () => {
              const { data: existRow } = await supabase
                .from('santri')
                .select('no_induk')
                .eq('no_induk', data.no_induk)
                .maybeSingle();

              if (!existRow) {
                await supabase.from('santri').insert([data]);
              }
              await get().fetchSantri();
              return true;
            },
          });
        }
      }
      await get().fetchSantri();
      return true;
    } catch (err: any) {
      console.error('Save santri error:', err.message);
      alert('Gagal menyimpan santri: ' + err.message);
      return false;
    }
  },

  deleteSantri: async (no_induk, skipHistory = false) => {
    const targetSantri = get().santriList.find((s) => s.no_induk === no_induk);
    if (!confirm(`Yakin ingin menghapus santri dengan No. Induk: ${no_induk}?`)) return false;
    try {
      const { error } = await supabase
        .from('santri')
        .delete()
        .eq('no_induk', no_induk);
      if (error) throw error;
      await logActivity('HAPUS DATA SANTRI', `Menghapus santri No. Induk: ${no_induk}`);

      if (!skipHistory && targetSantri) {
        useUndoRedoStore.getState().recordAction({
          module: 'santri',
          title: `Hapus Santri: ${targetSantri.nama || no_induk}`,
          undo: async () => {
            const { data: existRow } = await supabase
              .from('santri')
              .select('no_induk')
              .eq('no_induk', no_induk)
              .maybeSingle();

            if (!existRow) {
              await supabase.from('santri').insert([targetSantri]);
            }
            await get().fetchSantri();
            return true;
          },
          redo: async () => {
            await supabase.from('santri').delete().eq('no_induk', no_induk);
            await get().fetchSantri();
            return true;
          },
        });
      }

      await get().fetchSantri();
      return true;
    } catch (err: any) {
      console.error('Delete santri error:', err.message);
      alert('Gagal menghapus santri: ' + err.message);
      return false;
    }
  },

  deleteSelectedSantri: async (skipHistory = false) => {
    const selected = get().selectedNoInduk;
    if (selected.length === 0) return false;
    const deletedList = get().santriList.filter((s) => selected.includes(s.no_induk));
    try {
      const { error } = await supabase
        .from('santri')
        .delete()
        .in('no_induk', selected);
      if (error) throw error;
      await logActivity('HAPUS BANYAK SANTRI', `Menghapus ${selected.length} santri terpilih`);

      if (!skipHistory && deletedList.length > 0) {
        useUndoRedoStore.getState().recordAction({
          module: 'santri',
          title: `Hapus ${deletedList.length} Santri Terpilih`,
          undo: async () => {
            const { data: existingRows } = await supabase
              .from('santri')
              .select('no_induk')
              .in('no_induk', selected);
            const existingKeys = new Set((existingRows || []).map((r) => r.no_induk));
            const toInsert = deletedList.filter((s) => !existingKeys.has(s.no_induk));
            if (toInsert.length > 0) {
              await supabase.from('santri').insert(toInsert);
            }
            await get().fetchSantri();
            return true;
          },
          redo: async () => {
            await supabase.from('santri').delete().in('no_induk', selected);
            await get().fetchSantri();
            return true;
          },
        });
      }

      set({ selectedNoInduk: [] });
      await get().fetchSantri();
      return true;
    } catch (err: any) {
      console.error('Delete selected error:', err.message);
      alert('Gagal menghapus santri terpilih: ' + err.message);
      return false;
    }
  },

  deleteAllSantri: async () => {
    try {
      const { error } = await supabase
        .from('santri')
        .delete()
        .neq('no_induk', '');
      if (error) throw error;
      await logActivity('KOSONGKAN DATABASE SANTRI', 'Menghapus SELURUH data santri di Database');
      set({ selectedNoInduk: [], page: 1 });
      await get().fetchSantri();
      return true;
    } catch (err: any) {
      console.error('Delete all error:', err.message);
      alert('Gagal mengosongkan database santri: ' + err.message);
      return false;
    }
  },

  handleRealtimeSantri: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const currentList = get().santriList;

    if (eventType === 'INSERT' && newRecord) {
      const exists = currentList.some((s) => s.no_induk === newRecord.no_induk);
      if (!exists) {
        set({ santriList: [newRecord, ...currentList] });
      }
    } else if (eventType === 'UPDATE' && newRecord) {
      const updatedList = currentList.map((s) =>
        s.no_induk === newRecord.no_induk ? { ...s, ...newRecord } : s
      );
      set({ santriList: updatedList });
    } else if (eventType === 'DELETE' && oldRecord) {
      const filteredList = currentList.filter(
        (s) => s.no_induk !== oldRecord.no_induk
      );
      set({ santriList: filteredList });
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useSantriStore = useSantriStore;
}
