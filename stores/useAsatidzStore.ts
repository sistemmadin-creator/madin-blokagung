/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { Asatidz } from '@/types/asatidz';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import { calculateFieldDelta } from '@/lib/utils/deltaHelper';
import { CascadeAsatidzService, CascadeDeleteSnapshot } from '@/lib/services/cascadeAsatidzService';
import { StorageService } from '@/lib/services/storageService';
import { OfflineSyncService } from '@/lib/services/offlineSyncService';

interface AsatidzState {
  asatidzList: Asatidz[];
  isLoading: boolean;
  searchKeyword: string;
  filterValues: Record<string, string>;
  selectedAsatidz: Asatidz | null;
  editAsatidzData: Asatidz | null;

  // Multi-row selection & Column visibility
  selectedKodeGuruList: string[];
  hiddenColumns: string[];

  // Modals state
  isInputModalOpen: boolean;
  isFilterModalOpen: boolean;
  isDetailModalOpen: boolean;
  isImportModalOpen: boolean;
  isHideModalOpen: boolean;
  isFotoZoomOpen: boolean;
  zoomFotoData: { url: string; nama: string; kodeGuru?: string } | null;

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
  openFotoZoom: (url: string, nama: string, kodeGuru?: string) => void;
  closeFotoZoom: () => void;

  // Helper Kode Guru (KG) generator
  generateNextKodeGuru: (prefix: string) => string;

  // CRUD
  saveAsatidz: (
    data: Asatidz,
    isEdit: boolean,
    oldKodeGuru?: string,
    skipHistory?: boolean
  ) => Promise<boolean>;
  deleteAsatidz: (kodeGuru: string, skipHistory?: boolean) => Promise<boolean>;
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

  selectedKodeGuruList: [],
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
      // Simpan ke offline cache IndexedDB
      if (data) OfflineSyncService.cacheTableData('asatidz', data).catch(() => {});
    } catch (err: any) {
      console.error('Fetch asatidz error:', err.message);
      // Fallback: Ambil dari cache offline jika koneksi gagal
      const cached = await OfflineSyncService.getCachedTableData<Asatidz>('asatidz');
      if (cached && cached.length > 0) {
        set({ asatidzList: cached });
      }
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

  toggleSelectRow: (kodeGuru) =>
    set((state) => {
      const exists = state.selectedKodeGuruList.includes(kodeGuru);
      return {
        selectedKodeGuruList: exists
          ? state.selectedKodeGuruList.filter((item) => item !== kodeGuru)
          : [...state.selectedKodeGuruList, kodeGuru],
      };
    }),

  toggleSelectAll: (keys) =>
    set((state) => {
      const allSelected = keys.every((k) => state.selectedKodeGuruList.includes(k));
      if (allSelected) {
        return {
          selectedKodeGuruList: state.selectedKodeGuruList.filter((k) => !keys.includes(k)),
        };
      } else {
        const setUnion = new Set([...state.selectedKodeGuruList, ...keys]);
        return { selectedKodeGuruList: Array.from(setUnion) };
      }
    }),

  clearSelection: () => set({ selectedKodeGuruList: [] }),

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

  openFotoZoom: (url, nama, kodeGuru) =>
    set({ isFotoZoomOpen: true, zoomFotoData: { url, nama, kodeGuru } }),
  closeFotoZoom: () => set({ isFotoZoomOpen: false, zoomFotoData: null }),

  generateNextKodeGuru: (prefix: string) => {
    const list = get().asatidzList;
    const cleanPrefix = String(prefix || '').trim().toUpperCase();
    if (!cleanPrefix) return '';

    let maxNum = 0;
    list.forEach((row) => {
      const kg = String(row.kode_guru || '').trim().toUpperCase();
      if (kg.length > cleanPrefix.length && kg.startsWith(cleanPrefix)) {
        const num = parseInt(kg.substring(cleanPrefix.length), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    const nextNum = maxNum + 1;
    return `${cleanPrefix}${nextNum}`;
  },

  saveAsatidz: async (data, isEdit, oldKodeGuru, skipHistory = false) => {
    try {
      const prevAsatidz = isEdit
        ? get().asatidzList.find((a) => a.kode_guru === (oldKodeGuru || data.kode_guru))
        : null;

      const payload: Record<string, any> = { ...data };
      delete payload.id; // Let supabase handle primary key or update
      payload.status = payload.status || 'aktif';
      if (payload.nama_asatidz) {
        payload.nama_asatidz = String(payload.nama_asatidz).toUpperCase();
      }

      // Optimasi Storage: Jika ada foto base64 baru, upload ke Storage dengan fallback Base64
      if (payload.foto_asatidz && payload.foto_asatidz.startsWith('data:image')) {
        const uploadedUrl = await StorageService.uploadPhoto(
          payload.foto_asatidz,
          'asatidz',
          payload.kode_guru || oldKodeGuru || 'asatidz'
        );
        if (uploadedUrl) {
          payload.foto_asatidz = uploadedUrl;
        }
      }

      if (isEdit && oldKodeGuru) {
        const { error } = await supabase
          .from('asatidz')
          .update(payload)
          .eq('kode_guru', oldKodeGuru);
        if (error) throw error;

        // Cascade rename ke Fan Pelajaran, Jadwal KBM, Formasi, & Konsorsium jika nama asatidz berhasil diupdate
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

        await logActivity('EDIT DEWAN ASATIDZ', `Memperbarui asatidz: ${data.nama_asatidz} (KG: ${data.kode_guru})`);

        if (!skipHistory && prevAsatidz) {
          const prevPayload = { ...prevAsatidz };
          delete prevPayload.id;
          const { prevDelta, nextDelta, hasChanges } = calculateFieldDelta(prevPayload, payload);

          if (hasChanges) {
            useUndoRedoStore.getState().recordAction({
              module: 'asatidz',
              title: `Edit Asatidz: ${data.nama_asatidz}`,
              undo: async () => {
                const { data: existRow, error: fetchErr } = await supabase
                  .from('asatidz')
                  .select('*')
                  .eq('kode_guru', data.kode_guru)
                  .maybeSingle();

                if (fetchErr) throw fetchErr;
                if (!existRow) {
                  console.warn(`[UNDO ASATIDZ] Gagal: Asatidz ${data.kode_guru} tidak ditemukan.`);
                  await get().fetchAsatidz();
                  return false;
                }

                // Deteksi konflik OCC dengan normalisasi nilai agar null vs '' tidak memicu konflik palsu
                const conflictingKeys = Object.keys(nextDelta).filter((k) => {
                  const vServer = (existRow as any)[k];
                  const vExpected = (nextDelta as any)[k];
                  const normServer = vServer === null || vServer === undefined ? '' : String(vServer).trim();
                  const normExpected = vExpected === null || vExpected === undefined ? '' : String(vExpected).trim();
                  return normServer !== normExpected;
                });

                if (conflictingKeys.length > 0) {
                  const serverValuesStr = conflictingKeys
                    .map((k) => `${k}: "${(existRow as any)[k]}"`)
                    .join(', ');
                  const undoValuesStr = conflictingKeys
                    .map((k) => `${k}: "${(prevDelta as any)[k]}"`)
                    .join(', ');

                  const proceed = await useUndoRedoStore.getState().requestConflictResolution({
                    title: 'Peringatan Konflik Data Asatidz',
                    entityName: `${existRow.nama_asatidz || data.nama_asatidz} (KG: ${data.kode_guru})`,
                    message: `Kolom [${conflictingKeys.join(', ')}] telah diubah oleh pengguna lain di server sejak aksi Anda disimpan.`,
                    currentServerState: serverValuesStr,
                    proposedUndoState: undoValuesStr,
                  });

                  if (!proceed) {
                    await get().fetchAsatidz();
                    return false;
                  }
                }

                const { error: undoErr } = await supabase
                  .from('asatidz')
                  .update(prevDelta)
                  .eq('kode_guru', data.kode_guru);
                if (undoErr) throw undoErr;

                // Rollback relasional jika nama asatidz diubah
                if (prevDelta.nama_asatidz && nextDelta.nama_asatidz) {
                  await CascadeAsatidzService.cascadeRenameAsatidz(
                    String(nextDelta.nama_asatidz),
                    String(prevDelta.nama_asatidz)
                  );
                }

                await get().fetchAsatidz();
                return true;
              },
              redo: async () => {
                const targetKey = (prevDelta.kode_guru as string) || data.kode_guru;
                const { data: existRow, error: fetchErr } = await supabase
                  .from('asatidz')
                  .select('kode_guru')
                  .eq('kode_guru', targetKey)
                  .maybeSingle();

                if (fetchErr) throw fetchErr;
                if (!existRow) {
                  console.warn(`[REDO ASATIDZ] Gagal: Asatidz ${targetKey} tidak ditemukan.`);
                  await get().fetchAsatidz();
                  return false;
                }

                const { error: redoErr } = await supabase
                  .from('asatidz')
                  .update(nextDelta)
                  .eq('kode_guru', targetKey);
                if (redoErr) throw redoErr;

                // Terapkan kembali relasional rename jika nama asatidz diubah
                if (prevDelta.nama_asatidz && nextDelta.nama_asatidz) {
                  await CascadeAsatidzService.cascadeRenameAsatidz(
                    String(prevDelta.nama_asatidz),
                    String(nextDelta.nama_asatidz)
                  );
                }

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
        await logActivity('TAMBAH ASATIDZ', `Menambahkan asatidz baru: ${data.nama_asatidz} (KG: ${data.kode_guru})`);

        if (!skipHistory) {
          useUndoRedoStore.getState().recordAction({
            module: 'asatidz',
            title: `Tambah Asatidz: ${data.nama_asatidz}`,
            undo: async () => {
              const { error: undoErr } = await supabase
                .from('asatidz')
                .delete()
                .eq('kode_guru', data.kode_guru);
              if (undoErr) throw undoErr;
              await get().fetchAsatidz();
              return true;
            },
            redo: async () => {
              const { data: existRow } = await supabase
                .from('asatidz')
                .select('kode_guru')
                .eq('kode_guru', data.kode_guru)
                .maybeSingle();

              if (!existRow) {
                const { error: redoErr } = await supabase
                  .from('asatidz')
                  .insert([payload]);
                if (redoErr) throw redoErr;
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

  deleteAsatidz: async (kodeGuru, skipHistory = false) => {
    const targetAsatidz = get().asatidzList.find((a) => a.kode_guru === kodeGuru);
    try {
      // 1. Eksekusi cascade deletion ke Fan Pelajaran, Jadwal KBM, dan Formasi Kelas
      let cascadeSnapshot: CascadeDeleteSnapshot | null = null;
      if (targetAsatidz) {
        cascadeSnapshot = await CascadeAsatidzService.cascadeDeleteAsatidz([targetAsatidz]);
      }

      const { error } = await supabase
        .from('asatidz')
        .delete()
        .eq('kode_guru', kodeGuru);
      if (error) throw error;
      await logActivity('HAPUS DEWAN ASATIDZ', `Menghapus asatidz KG: ${kodeGuru}`);

      if (!skipHistory && targetAsatidz) {
        const restorePayload = { ...targetAsatidz };
        delete restorePayload.id;
        useUndoRedoStore.getState().recordAction({
          module: 'asatidz',
          title: `Hapus Asatidz: ${targetAsatidz.nama_asatidz || kodeGuru}`,
          undo: async () => {
            const { data: existRow, error: fetchErr } = await supabase
              .from('asatidz')
              .select('kode_guru')
              .eq('kode_guru', kodeGuru)
              .maybeSingle();

            if (fetchErr) throw fetchErr;

            if (!existRow) {
              const { error: insertErr } = await supabase.from('asatidz').insert([restorePayload]);
              if (insertErr) throw insertErr;
            }
            if (cascadeSnapshot) {
              await CascadeAsatidzService.restoreSnapshot(cascadeSnapshot);
            }
            await get().fetchAsatidz();
            return true;
          },
          redo: async () => {
            const { error: delErr } = await supabase.from('asatidz').delete().eq('kode_guru', kodeGuru);
            if (delErr) throw delErr;
            if (targetAsatidz) {
              await CascadeAsatidzService.cascadeDeleteAsatidz([targetAsatidz]);
            }
            await get().fetchAsatidz();
            return true;
          },
        });
      }

      set((state) => ({
        selectedKodeGuruList: state.selectedKodeGuruList.filter((k) => k !== kodeGuru),
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
    const selected = get().selectedKodeGuruList;
    if (selected.length === 0) return false;
    const deletedList = get().asatidzList.filter((a) => selected.includes(a.kode_guru));

    try {
      // 1. Eksekusi cascade deletion ke Fan Pelajaran, Jadwal KBM, dan Formasi Kelas
      let cascadeSnapshot: CascadeDeleteSnapshot | null = null;
      if (deletedList.length > 0) {
        cascadeSnapshot = await CascadeAsatidzService.cascadeDeleteAsatidz(deletedList);
      }

      const { error } = await supabase
        .from('asatidz')
        .delete()
        .in('kode_guru', selected);
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
            const { data: existingRows, error: fetchErr } = await supabase
              .from('asatidz')
              .select('kode_guru')
              .in('kode_guru', selected);

            if (fetchErr) throw fetchErr;

            const existingKeys = new Set((existingRows || []).map((r) => r.kode_guru));
            const toInsert = restoreList.filter((a) => !existingKeys.has(a.kode_guru));
            if (toInsert.length > 0) {
              const { error: insertErr } = await supabase.from('asatidz').insert(toInsert);
              if (insertErr) throw insertErr;
            }
            if (cascadeSnapshot) {
              await CascadeAsatidzService.restoreSnapshot(cascadeSnapshot);
            }
            await get().fetchAsatidz();
            return true;
          },
          redo: async () => {
            const { error: delErr } = await supabase.from('asatidz').delete().in('kode_guru', selected);
            if (delErr) throw delErr;
            if (deletedList.length > 0) {
              await CascadeAsatidzService.cascadeDeleteAsatidz(deletedList);
            }
            await get().fetchAsatidz();
            return true;
          },
        });
      }

      set({ selectedKodeGuruList: [] });
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
      const exists = currentList.some((a) => a.kode_guru === newRecord.kode_guru);
      if (!exists) {
        set({ asatidzList: [newRecord, ...currentList] });
      }
    } else if (eventType === 'UPDATE' && newRecord) {
      const updatedList = currentList.map((a) =>
        a.kode_guru === newRecord.kode_guru ? { ...a, ...newRecord } : a
      );
      set({ asatidzList: updatedList });
    } else if (eventType === 'DELETE' && oldRecord) {
      const filteredList = currentList.filter((a) => {
        if (oldRecord.kode_guru) return a.kode_guru !== oldRecord.kode_guru;
        if (oldRecord.id) return a.id !== oldRecord.id;
        return true;
      });
      set({ asatidzList: filteredList });
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useAsatidzStore = useAsatidzStore;
}
