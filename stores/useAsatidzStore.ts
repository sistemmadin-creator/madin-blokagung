/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { Asatidz } from '@/types/asatidz';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import { calculateFieldDelta } from '@/lib/utils/deltaHelper';
import { CascadeAsatidzService, CascadeDeleteSnapshot } from '@/lib/services/cascadeAsatidzService';

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
  saveAsatidz: (
    data: Asatidz,
    isEdit: boolean,
    oldNia?: string,
    skipHistory?: boolean
  ) => Promise<boolean>;
  deleteAsatidz: (nia: string, skipHistory?: boolean) => Promise<boolean>;
  deleteSelectedAsatidz: (skipHistory?: boolean) => Promise<boolean>;
  handleRealtimeAsatidz: (payload: { eventType: string; new?: any; old?: any }) => void;
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

  saveAsatidz: async (data, isEdit, oldNia, skipHistory = false) => {
    try {
      const prevAsatidz = isEdit
        ? get().asatidzList.find((a) => a.nia === (oldNia || data.nia))
        : null;

      const payload: Record<string, any> = { ...data };
      delete payload.id; // Let supabase handle primary key or update
      if (payload.nama_asatidz) {
        payload.nama_asatidz = String(payload.nama_asatidz).toUpperCase();
      }

      if (isEdit && oldNia) {
        // Cascade rename ke Fan Pelajaran, Jadwal KBM & Formasi jika nama asatidz berubah
        if (
          prevAsatidz &&
          prevAsatidz.nama_asatidz &&
          payload.nama_asatidz &&
          prevAsatidz.nama_asatidz.trim().toUpperCase() !== payload.nama_asatidz.trim().toUpperCase()
        ) {
          await CascadeAsatidzService.cascadeRenameAsatidz(
            prevAsatidz.nama_asatidz,
            payload.nama_asatidz
          );
        }

        const { error } = await supabase
          .from('asatidz')
          .update(payload)
          .eq('nia', oldNia);
        if (error) throw error;
        await logActivity('EDIT DEWAN ASATIDZ', `Memperbarui asatidz: ${data.nama_asatidz} (NIA: ${data.nia})`);

        if (!skipHistory && prevAsatidz) {
          const prevPayload = { ...prevAsatidz };
          delete prevPayload.id;
          const { prevDelta, nextDelta, hasChanges } = calculateFieldDelta(prevPayload, payload);

          if (hasChanges) {
            useUndoRedoStore.getState().recordAction({
              module: 'asatidz',
              title: `Edit Asatidz: ${data.nama_asatidz}`,
              undo: async () => {
                const { data: existRow } = await supabase
                  .from('asatidz')
                  .select('*')
                  .eq('nia', data.nia)
                  .maybeSingle();

                if (!existRow) {
                  console.warn(`[UNDO ASATIDZ] Gagal: Asatidz ${data.nia} tidak ditemukan.`);
                  await get().fetchAsatidz();
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
                    title: 'Peringatan Konflik Data Asatidz',
                    entityName: `${existRow.nama_asatidz || data.nama_asatidz} (NIA: ${data.nia})`,
                    message: `Kolom [${conflictingKeys.join(', ')}] telah diubah oleh pengguna lain di server sejak aksi Anda disimpan.`,
                    currentServerState: serverValuesStr,
                    proposedUndoState: undoValuesStr,
                  });

                  if (!proceed) {
                    await get().fetchAsatidz();
                    return false;
                  }
                }

                await supabase.from('asatidz').update(prevDelta).eq('nia', data.nia);
                await get().fetchAsatidz();
                return true;
              },
              redo: async () => {
                const targetKey = (prevDelta.nia as string) || data.nia;
                const { data: existRow } = await supabase
                  .from('asatidz')
                  .select('nia')
                  .eq('nia', targetKey)
                  .maybeSingle();

                if (!existRow) {
                  console.warn(`[REDO ASATIDZ] Gagal: Asatidz ${targetKey} tidak ditemukan.`);
                  await get().fetchAsatidz();
                  return false;
                }

                await supabase.from('asatidz').update(nextDelta).eq('nia', targetKey);
                await get().fetchAsatidz();
                return true;
              },
            });
          }
        }
      } else {
        const { error } = await supabase
          .from('asatidz')
          .insert([payload]);
        if (error) throw error;
        await logActivity('TAMBAH ASATIDZ', `Menambahkan asatidz baru: ${data.nama_asatidz} (NIA: ${data.nia})`);

        if (!skipHistory) {
          useUndoRedoStore.getState().recordAction({
            module: 'asatidz',
            title: `Tambah Asatidz: ${data.nama_asatidz}`,
            undo: async () => {
              await supabase.from('asatidz').delete().eq('nia', data.nia);
              await get().fetchAsatidz();
              return true;
            },
            redo: async () => {
              const { data: existRow } = await supabase
                .from('asatidz')
                .select('nia')
                .eq('nia', data.nia)
                .maybeSingle();

              if (!existRow) {
                await supabase.from('asatidz').insert([payload]);
              }
              await get().fetchAsatidz();
              return true;
            },
          });
        }
      }
      await get().fetchAsatidz();
      return true;
    } catch (err: any) {
      console.error('Save asatidz error:', err.message);
      alert('Gagal menyimpan asatidz: ' + err.message);
      return false;
    }
  },

  deleteAsatidz: async (nia, skipHistory = false) => {
    const targetAsatidz = get().asatidzList.find((a) => a.nia === nia);
    try {
      // 1. Eksekusi cascade deletion ke Fan Pelajaran, Jadwal KBM, dan Formasi Kelas
      let cascadeSnapshot: CascadeDeleteSnapshot | null = null;
      if (targetAsatidz) {
        cascadeSnapshot = await CascadeAsatidzService.cascadeDeleteAsatidz([targetAsatidz]);
      }

      const { error } = await supabase
        .from('asatidz')
        .delete()
        .eq('nia', nia);
      if (error) throw error;
      await logActivity('HAPUS DEWAN ASATIDZ', `Menghapus asatidz NIA: ${nia}`);

      if (!skipHistory && targetAsatidz) {
        const restorePayload = { ...targetAsatidz };
        delete restorePayload.id;
        useUndoRedoStore.getState().recordAction({
          module: 'asatidz',
          title: `Hapus Asatidz: ${targetAsatidz.nama_asatidz || nia}`,
          undo: async () => {
            const { data: existRow } = await supabase
              .from('asatidz')
              .select('nia')
              .eq('nia', nia)
              .maybeSingle();

            if (!existRow) {
              await supabase.from('asatidz').insert([restorePayload]);
            }
            if (cascadeSnapshot) {
              await CascadeAsatidzService.restoreSnapshot(cascadeSnapshot);
            }
            await get().fetchAsatidz();
            return true;
          },
          redo: async () => {
            await supabase.from('asatidz').delete().eq('nia', nia);
            if (targetAsatidz) {
              await CascadeAsatidzService.cascadeDeleteAsatidz([targetAsatidz]);
            }
            await get().fetchAsatidz();
            return true;
          },
        });
      }

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

  deleteSelectedAsatidz: async (skipHistory = false) => {
    const selected = get().selectedNiaList;
    if (selected.length === 0) return false;
    const deletedList = get().asatidzList.filter((a) => selected.includes(a.nia));

    try {
      // 1. Eksekusi cascade deletion ke Fan Pelajaran, Jadwal KBM, dan Formasi Kelas
      let cascadeSnapshot: CascadeDeleteSnapshot | null = null;
      if (deletedList.length > 0) {
        cascadeSnapshot = await CascadeAsatidzService.cascadeDeleteAsatidz(deletedList);
      }

      const { error } = await supabase
        .from('asatidz')
        .delete()
        .in('nia', selected);
      if (error) throw error;
      await logActivity('HAPUS BANYAK ASATIDZ', `Menghapus ${selected.length} asatidz terpilih`);

      if (!skipHistory && deletedList.length > 0) {
        const restoreList = deletedList.map((item) => {
          const c = { ...item };
          delete c.id;
          return c;
        });
        useUndoRedoStore.getState().recordAction({
          module: 'asatidz',
          title: `Hapus ${deletedList.length} Asatidz Terpilih`,
          undo: async () => {
            const { data: existingRows } = await supabase
              .from('asatidz')
              .select('nia')
              .in('nia', selected);
            const existingKeys = new Set((existingRows || []).map((r) => r.nia));
            const toInsert = restoreList.filter((a) => !existingKeys.has(a.nia));
            if (toInsert.length > 0) {
              await supabase.from('asatidz').insert(toInsert);
            }
            if (cascadeSnapshot) {
              await CascadeAsatidzService.restoreSnapshot(cascadeSnapshot);
            }
            await get().fetchAsatidz();
            return true;
          },
          redo: async () => {
            await supabase.from('asatidz').delete().in('nia', selected);
            if (deletedList.length > 0) {
              await CascadeAsatidzService.cascadeDeleteAsatidz(deletedList);
            }
            await get().fetchAsatidz();
            return true;
          },
        });
      }

      set({ selectedNiaList: [] });
      await get().fetchAsatidz();
      return true;
    } catch (err: any) {
      console.error('Delete bulk asatidz error:', err.message);
      alert('Gagal menghapus asatidz terpilih: ' + err.message);
      return false;
    }
  },

  handleRealtimeAsatidz: (payload) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const currentList = get().asatidzList;

    if (eventType === 'INSERT' && newRecord) {
      const exists = currentList.some((a) => a.nia === newRecord.nia);
      if (!exists) {
        set({ asatidzList: [newRecord, ...currentList] });
      }
    } else if (eventType === 'UPDATE' && newRecord) {
      const updatedList = currentList.map((a) =>
        a.nia === newRecord.nia ? { ...a, ...newRecord } : a
      );
      set({ asatidzList: updatedList });
    } else if (eventType === 'DELETE' && oldRecord) {
      const filteredList = currentList.filter(
        (a) => a.nia !== oldRecord.nia
      );
      set({ asatidzList: filteredList });
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useAsatidzStore = useAsatidzStore;
}
