import { create } from 'zustand';
import { SetoranHafalan, HafalanConfig, RiwayatSetoranRawRow } from '@/types/setoran';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { DEFAULT_HAFALAN_WAJIB, convertRawToSetoran, convertSetoranToRaw } from '@/lib/utils/setoranHelper';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';

export const KEY_DB_RIWAYAT_MUHAFADZOH = 'RIWAYAT_MUHAFADZOH_DATA';
export const KEY_DB_HAFALAN_CONFIG = 'MUHAFADZOH_HAFALAN_CONFIG';
export const LS_RIWAYAT_MUHAFADZOH = 'MADIN_RIWAYAT_MUHAFADZOH';
export const LS_HAFALAN_CONFIG = 'MADIN_HAFALAN_CONFIG';

// Fallback legacy keys
export const KEY_DB_MUHAFADZOH_LEGACY = 'KEY_DB_MUHAFADZOH';
export const KEY_DB_HAFALAN_CONFIG_LEGACY = 'KEY_DB_HAFALAN_CONFIG';

const DEFAULT_CONFIG: HafalanConfig = {
  hafWajib: DEFAULT_HAFALAN_WAJIB,
  hafSunnah: {},
  hafKitab: {},
  penjagaBebas: [],
};

interface MuhafadzohState {
  setoranList: SetoranHafalan[];
  rawRows: RiwayatSetoranRawRow[];
  config: HafalanConfig;
  isLoading: boolean;
  isSettingsOpen: boolean;
  editingRecord: SetoranHafalan | null;
  editOldKey: { noInduk: string; tglSetor: string; hafalan: string } | null;

  fetchSetoranData: () => Promise<void>;
  addSetoran: (entry: SetoranHafalan, skipHistory?: boolean) => Promise<boolean>;
  updateSetoran: (
    entry: SetoranHafalan,
    oldKey: { noInduk: string; tglSetor: string; hafalan: string },
    skipHistory?: boolean
  ) => Promise<boolean>;
  deleteSetoran: (
    idOrKey: string | { noInduk: string; tglSetor: string; hafalan: string },
    skipHistory?: boolean
  ) => Promise<boolean>;
  bulkDeleteSetoran: (noIndukList: string[], skipHistory?: boolean) => Promise<boolean>;
  restoreSetoranList: (targetList: SetoranHafalan[], logDesc?: string) => Promise<boolean>;
  saveConfig: (cfg: HafalanConfig, skipHistory?: boolean) => Promise<boolean>;

  openSettings: () => void;
  closeSettings: () => void;
  setEditingRecord: (
    rec: SetoranHafalan | null,
    oldKey?: { noInduk: string; tglSetor: string; hafalan: string } | null
  ) => void;
}

export const useMuhafadzohStore = create<MuhafadzohState>((set, get) => ({
  setoranList: [],
  rawRows: [],
  config: DEFAULT_CONFIG,
  isLoading: false,
  isSettingsOpen: false,
  editingRecord: null,
  editOldKey: null,

  fetchSetoranData: async () => {
    set({ isLoading: true });

    // 1. Muat dari localStorage terlebih dahulu
    try {
      if (typeof window !== 'undefined') {
        const rawMuh = localStorage.getItem(LS_RIWAYAT_MUHAFADZOH);
        if (rawMuh) {
          const parsed = JSON.parse(rawMuh);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const list: SetoranHafalan[] = parsed.map((item: any) =>
              Array.isArray(item) ? convertRawToSetoran(item) : item
            );
            set({ setoranList: list });
          }
        }

        const rawCfg = localStorage.getItem(LS_HAFALAN_CONFIG);
        if (rawCfg) {
          const parsedCfg = JSON.parse(rawCfg);
          if (parsedCfg && typeof parsedCfg === 'object') {
            const pb = Array.isArray(parsedCfg.penjagaBebas)
              ? parsedCfg.penjagaBebas
              : String(parsedCfg.penjagaBebas || '').split(',').map((s: string) => s.trim()).filter(Boolean);

            set({
              config: {
                hafWajib: parsedCfg.hafWajib && Object.keys(parsedCfg.hafWajib).length > 0
                  ? parsedCfg.hafWajib
                  : DEFAULT_HAFALAN_WAJIB,
                hafSunnah: parsedCfg.hafSunnah || {},
                hafKitab: parsedCfg.hafKitab || {},
                penjagaBebas: pb,
              },
            });
          }
        }
      }
    } catch (e) {
      console.warn('Gagal memuat cache local setoran:', e);
    }

    // 2. Tarik data dari Supabase
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          KEY_DB_RIWAYAT_MUHAFADZOH,
          KEY_DB_HAFALAN_CONFIG,
          KEY_DB_MUHAFADZOH_LEGACY,
          KEY_DB_HAFALAN_CONFIG_LEGACY,
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        let loadedList: SetoranHafalan[] | null = null;
        let loadedConfig: HafalanConfig | null = null;

        data.forEach((row) => {
          let val = row.value;
          if (typeof val === 'string') {
            try {
              val = JSON.parse(val);
            } catch (e) {}
          }

          if (
            (row.key === KEY_DB_RIWAYAT_MUHAFADZOH || (!loadedList && row.key === KEY_DB_MUHAFADZOH_LEGACY)) &&
            Array.isArray(val)
          ) {
            loadedList = val.map((item: any) =>
              Array.isArray(item) ? convertRawToSetoran(item) : item
            );
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem(LS_RIWAYAT_MUHAFADZOH, JSON.stringify(val));
              }
            } catch (e) {}
          } else if (
            (row.key === KEY_DB_HAFALAN_CONFIG || (!loadedConfig && row.key === KEY_DB_HAFALAN_CONFIG_LEGACY)) &&
            val &&
            typeof val === 'object'
          ) {
            const pb = Array.isArray(val.penjagaBebas)
              ? val.penjagaBebas
              : String(val.penjagaBebas || '').split(',').map((s: string) => s.trim()).filter(Boolean);

            loadedConfig = {
              hafWajib: val.hafWajib && Object.keys(val.hafWajib).length > 0 ? val.hafWajib : DEFAULT_HAFALAN_WAJIB,
              hafSunnah: val.hafSunnah || {},
              hafKitab: val.hafKitab || {},
              penjagaBebas: pb,
            };
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem(LS_HAFALAN_CONFIG, JSON.stringify(val));
              }
            } catch (e) {}
          }
        });

        if (loadedList) {
          set({ setoranList: loadedList });
        }
        if (loadedConfig) {
          set({ config: loadedConfig });
        }
      }
    } catch (err: any) {
      console.error('Fetch setoran error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  setEditingRecord: (rec, oldKey = null) => {
    set({
      editingRecord: rec,
      editOldKey: oldKey || (rec ? { noInduk: rec.no_induk, tglSetor: rec.tanggal, hafalan: rec.item_hafalan } : null),
    });
  },

  restoreSetoranList: async (targetList: SetoranHafalan[], logDesc?: string) => {
    try {
      set({ setoranList: targetList });
      const rawPayload = targetList.map(convertSetoranToRaw);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_RIWAYAT_MUHAFADZOH, JSON.stringify(rawPayload));
      }

      await supabase
        .from('app_settings')
        .upsert(
          [
            { key: KEY_DB_RIWAYAT_MUHAFADZOH, value: rawPayload },
            { key: KEY_DB_MUHAFADZOH_LEGACY, value: targetList },
          ],
          { onConflict: 'key' }
        );

      if (logDesc) {
        await logActivity('UNDO/REDO MUHAFADZOH', logDesc);
      }
      return true;
    } catch (err: any) {
      console.error('Gagal memulihkan setoran muhafadzoh:', err);
      return false;
    }
  },

  addSetoran: async (newEntry, skipHistory = false) => {
    try {
      const prevList = [...get().setoranList];
      const updatedList = [newEntry, ...prevList];
      set({ setoranList: updatedList });

      // Simpan ke localStorage & Supabase
      const rawPayload = updatedList.map(convertSetoranToRaw);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_RIWAYAT_MUHAFADZOH, JSON.stringify(rawPayload));
      }

      await supabase
        .from('app_settings')
        .upsert(
          [
            { key: KEY_DB_RIWAYAT_MUHAFADZOH, value: rawPayload },
            { key: KEY_DB_MUHAFADZOH_LEGACY, value: updatedList }
          ],
          { onConflict: 'key' }
        );

      await logActivity(
        'INPUT SETORAN MUHAFADZOH',
        `Mencatat setoran [${newEntry.item_hafalan}] santri: ${newEntry.nama} (Penjaga: ${newEntry.penjaga})`
      );

      if (!skipHistory) {
        useUndoRedoStore.getState().recordAction({
          module: 'muhafadzoh',
          title: `Tambah Setoran: ${newEntry.nama} (${newEntry.item_hafalan})`,
          undo: async () => {
            return await get().deleteSetoran(
              {
                noInduk: newEntry.no_induk,
                tglSetor: newEntry.tanggal,
                hafalan: newEntry.item_hafalan,
              },
              true
            );
          },
          redo: async () => {
            return await get().addSetoran(newEntry, true);
          },
        });
      }

      return true;
    } catch (err: any) {
      console.error('Gagal menyimpan setoran:', err);
      alert('Gagal menyimpan setoran: ' + err.message);
      return false;
    }
  },

  updateSetoran: async (entry, oldKey, skipHistory = false) => {
    try {
      const prevList = [...get().setoranList];
      const idx = prevList.findIndex(
        (r) =>
          String(r.no_induk).trim() === String(oldKey.noInduk).trim() &&
          String(r.tanggal).trim() === String(oldKey.tglSetor).trim() &&
          String(r.item_hafalan).trim() === String(oldKey.hafalan).trim()
      );

      let updatedList = [...prevList];
      if (idx !== -1) {
        updatedList[idx] = entry;
      } else {
        updatedList.unshift(entry);
      }
      set({ setoranList: updatedList, editingRecord: null, editOldKey: null });

      const rawPayload = updatedList.map(convertSetoranToRaw);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_RIWAYAT_MUHAFADZOH, JSON.stringify(rawPayload));
      }

      await supabase
        .from('app_settings')
        .upsert(
          [
            { key: KEY_DB_RIWAYAT_MUHAFADZOH, value: rawPayload },
            { key: KEY_DB_MUHAFADZOH_LEGACY, value: updatedList }
          ],
          { onConflict: 'key' }
        );

      await logActivity(
        'UPDATE SETORAN',
        `Mengubah setoran santri: ${entry.nama} dari [${oldKey.hafalan}] ke [${entry.item_hafalan}]`
      );

      if (!skipHistory) {
        const prevItem = idx !== -1 ? prevList[idx] : null;
        useUndoRedoStore.getState().recordAction({
          module: 'muhafadzoh',
          title: `Update Setoran: ${entry.nama} (${entry.item_hafalan})`,
          undo: async () => {
            if (prevItem) {
              return await get().updateSetoran(
                prevItem,
                {
                  noInduk: entry.no_induk,
                  tglSetor: entry.tanggal,
                  hafalan: entry.item_hafalan,
                },
                true
              );
            }
            return false;
          },
          redo: async () => {
            return await get().updateSetoran(entry, oldKey, true);
          },
        });
      }

      return true;
    } catch (err: any) {
      console.error('Gagal memperbarui setoran:', err);
      alert('Gagal memperbarui setoran: ' + err.message);
      return false;
    }
  },

  deleteSetoran: async (idOrKey, skipHistory = false) => {
    try {
      const prevList = [...get().setoranList];
      let updatedList: SetoranHafalan[];
      let targetItem: SetoranHafalan | undefined;

      if (typeof idOrKey === 'string') {
        targetItem = prevList.find((s) => s.id === idOrKey || s.no_induk === idOrKey);
        updatedList = prevList.filter((s) => s.id !== idOrKey && s.no_induk !== idOrKey);
      } else {
        targetItem = prevList.find(
          (r) =>
            String(r.no_induk).trim() === String(idOrKey.noInduk).trim() &&
            String(r.tanggal).trim() === String(idOrKey.tglSetor).trim() &&
            String(r.item_hafalan).trim() === String(idOrKey.hafalan).trim()
        );
        updatedList = prevList.filter(
          (r) =>
            !(
              String(r.no_induk).trim() === String(idOrKey.noInduk).trim() &&
              String(r.tanggal).trim() === String(idOrKey.tglSetor).trim() &&
              String(r.item_hafalan).trim() === String(idOrKey.hafalan).trim()
            )
        );
      }

      set({ setoranList: updatedList });

      const rawPayload = updatedList.map(convertSetoranToRaw);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_RIWAYAT_MUHAFADZOH, JSON.stringify(rawPayload));
      }

      await supabase
        .from('app_settings')
        .upsert(
          [
            { key: KEY_DB_RIWAYAT_MUHAFADZOH, value: rawPayload },
            { key: KEY_DB_MUHAFADZOH_LEGACY, value: updatedList }
          ],
          { onConflict: 'key' }
        );

      await logActivity('HAPUS SETORAN', `Menghapus rekaman setoran`);

      if (!skipHistory && targetItem) {
        const itemLabel = `${targetItem.nama} (${targetItem.item_hafalan})`;
        useUndoRedoStore.getState().recordAction({
          module: 'muhafadzoh',
          title: `Hapus Setoran: ${itemLabel}`,
          undo: async () => {
            return await get().addSetoran(targetItem, true);
          },
          redo: async () => {
            return await get().deleteSetoran(idOrKey, true);
          },
        });
      }

      return true;
    } catch (err: any) {
      console.error('Gagal menghapus setoran:', err);
      alert('Gagal menghapus setoran: ' + err.message);
      return false;
    }
  },

  bulkDeleteSetoran: async (noIndukList, skipHistory = false) => {
    try {
      const setDelete = new Set(noIndukList.map((s) => String(s).trim()));
      const prevList = [...get().setoranList];
      const updatedList = prevList.filter((r) => !setDelete.has(String(r.no_induk).trim()));

      set({ setoranList: updatedList });

      const rawPayload = updatedList.map(convertSetoranToRaw);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_RIWAYAT_MUHAFADZOH, JSON.stringify(rawPayload));
      }

      await supabase
        .from('app_settings')
        .upsert(
          [
            { key: KEY_DB_RIWAYAT_MUHAFADZOH, value: rawPayload },
            { key: KEY_DB_MUHAFADZOH_LEGACY, value: updatedList }
          ],
          { onConflict: 'key' }
        );

      await logActivity('HAPUS RIWAYAT SETORAN', `Menghapus riwayat setoran untuk ${noIndukList.length} santri terpilih`);

      if (!skipHistory) {
        useUndoRedoStore.getState().recordAction({
          module: 'muhafadzoh',
          title: `Hapus Setoran ${noIndukList.length} Santri`,
          undo: async () => {
            await get().restoreSetoranList(prevList, `Undo: Kembalikan hapus setoran ${noIndukList.length} santri`);
          },
          redo: async () => {
            await get().restoreSetoranList(updatedList, `Redo: Hapus setoran ${noIndukList.length} santri`);
          },
        });
      }

      return true;
    } catch (err: any) {
      console.error('Gagal menghapus riwayat terpilih:', err);
      alert('Gagal menghapus setoran: ' + err.message);
      return false;
    }
  },

  saveConfig: async (newConfig, skipHistory = false) => {
    try {
      const prevConfig = { ...get().config };
      set({ config: newConfig });

      const payload = {
        hafWajib: newConfig.hafWajib,
        hafSunnah: newConfig.hafSunnah,
        hafKitab: newConfig.hafKitab,
        penjagaBebas: newConfig.penjagaBebas.join(', '),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_HAFALAN_CONFIG, JSON.stringify(payload));
      }

      await supabase
        .from('app_settings')
        .upsert(
          [
            { key: KEY_DB_HAFALAN_CONFIG, value: payload },
            { key: KEY_DB_HAFALAN_CONFIG_LEGACY, value: newConfig },
          ],
          { onConflict: 'key' }
        );

      await logActivity('SIMPAN PENGATURAN HAFALAN', 'Memperbarui konfigurasi target muhafadzoh & akses penjaga');

      if (!skipHistory) {
        useUndoRedoStore.getState().recordAction({
          module: 'muhafadzoh',
          title: 'Ubah Target/Pengaturan Hafalan',
          undo: async () => {
            await get().saveConfig(prevConfig, true);
          },
          redo: async () => {
            await get().saveConfig(newConfig, true);
          },
        });
      }

      return true;
    } catch (err: any) {
      alert('Gagal menyimpan target hafalan: ' + err.message);
      return false;
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useMuhafadzohStore = useMuhafadzohStore;
}
