import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import {
  DatabaseTahunAjaranRekap,
  RekapPerKelasTA,
  RekapRingkasanUmumTA,
} from '@/types/database-ta';
import { sortSnapshotsByTA } from '@/lib/utils/databaseTahunAjaranHelper';

const KEY_DB_TA_REKAP = 'MADIN_DB_TA_REKAP_V1';
const LS_CACHE_DB_TA_REKAP = 'MADIN_DB_TA_REKAP_CACHE_V1';

interface DatabaseTahunAjaranState {
  snapshots: DatabaseTahunAjaranRekap[];
  isLoading: boolean;
  isSaving: boolean;
  errorMsg: string | null;

  fetchSnapshots: () => Promise<void>;
  captureSnapshot: (payload: {
    tahun_ajaran_masehi: string;
    tahun_ajaran_hijriyah: string;
    ringkasan_umum: RekapRingkasanUmumTA;
    rekap_per_kelas: RekapPerKelasTA[];
    catatan_evaluasi?: string;
    actorName?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  toggleLockSnapshot: (
    tahunAjaranMasehi: string,
    actorName?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  updateCatatanEvaluasi: (
    tahunAjaranMasehi: string,
    catatan: string,
    actorName?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteSnapshot: (
    tahunAjaranMasehi: string,
    actorName?: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

function readLocalCache(): DatabaseTahunAjaranRekap[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_CACHE_DB_TA_REKAP);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortSnapshotsByTA(parsed) : [];
  } catch {
    return [];
  }
}

function writeLocalCache(snapshots: DatabaseTahunAjaranRekap[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_CACHE_DB_TA_REKAP, JSON.stringify(snapshots));
  } catch {
    // Abaikan kuota LocalStorage
  }
}

async function persistFallbackAppSettings(snapshots: DatabaseTahunAjaranRekap[]) {
  try {
    await supabase
      .from('app_settings')
      .upsert(
        { key: KEY_DB_TA_REKAP, value: snapshots },
        { onConflict: 'key' }
      );
  } catch {
    // Offline fallback sudah disimpan di LocalStorage
  }
}

export const useDatabaseTahunAjaranStore = create<DatabaseTahunAjaranState>((set, get) => ({
  snapshots: typeof window !== 'undefined' ? readLocalCache() : [],
  isLoading: false,
  isSaving: false,
  errorMsg: null,

  fetchSnapshots: async () => {
    const cached = readLocalCache();
    if (cached.length > 0 && get().snapshots.length === 0) {
      set({ snapshots: cached });
    }
    set({ isLoading: true, errorMsg: null });

    try {
      const { data, error } = await supabase
        .from('database_tahun_ajaran_rekap' as never)
        .select('*')
        .order('tahun_ajaran_masehi', { ascending: true });

      if (!error && Array.isArray(data)) {
        const sorted = sortSnapshotsByTA(data as DatabaseTahunAjaranRekap[]);
        writeLocalCache(sorted);
        set({ snapshots: sorted, isLoading: false });
        return;
      }

      // Fallback ke app_settings bila tabel relasional belum dimigrasi
      const { data: settingRow } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', KEY_DB_TA_REKAP)
        .maybeSingle();

      if (settingRow && Array.isArray(settingRow.value)) {
        const sorted = sortSnapshotsByTA(settingRow.value as DatabaseTahunAjaranRekap[]);
        writeLocalCache(sorted);
        set({ snapshots: sorted, isLoading: false });
        return;
      }
    } catch (err) {
      console.warn('DatabaseTahunAjaran fetch fallback:', err);
    }

    set({ isLoading: false });
  },

  captureSnapshot: async ({
    tahun_ajaran_masehi,
    tahun_ajaran_hijriyah,
    ringkasan_umum,
    rekap_per_kelas,
    catatan_evaluasi,
    actorName = 'Administrator',
  }) => {
    const existing = get().snapshots.find(
      (s) => s.tahun_ajaran_masehi === tahun_ajaran_masehi
    );
    if (existing?.status_arsip === 'terkunci') {
      return {
        ok: false,
        error: `Arsip TA ${tahun_ajaran_masehi} sudah terkunci. Buka kunci di halaman Arsip & Ekspor sebelum memperbarui.`,
      };
    }

    set({ isSaving: true, errorMsg: null });
    const nowIso = new Date().toISOString();

    const record: DatabaseTahunAjaranRekap = {
      id: existing?.id,
      tahun_ajaran_masehi,
      tahun_ajaran_hijriyah,
      status_arsip: existing?.status_arsip || 'draf',
      ringkasan_umum,
      rekap_per_kelas,
      catatan_evaluasi: catatan_evaluasi ?? existing?.catatan_evaluasi ?? '',
      dibuat_oleh: existing?.dibuat_oleh || actorName,
      diperbarui_oleh: actorName,
      created_at: existing?.created_at || nowIso,
      updated_at: nowIso,
    };

    const nextList = sortSnapshotsByTA([
      ...get().snapshots.filter((s) => s.tahun_ajaran_masehi !== tahun_ajaran_masehi),
      record,
    ]);
    set({ snapshots: nextList });
    writeLocalCache(nextList);

    try {
      const { data, error } = await supabase
        .from('database_tahun_ajaran_rekap' as never)
        .upsert(
          {
            tahun_ajaran_masehi: record.tahun_ajaran_masehi,
            tahun_ajaran_hijriyah: record.tahun_ajaran_hijriyah,
            status_arsip: record.status_arsip,
            ringkasan_umum: record.ringkasan_umum,
            rekap_per_kelas: record.rekap_per_kelas,
            catatan_evaluasi: record.catatan_evaluasi,
            dibuat_oleh: record.dibuat_oleh,
            diperbarui_oleh: record.diperbarui_oleh,
            updated_at: nowIso,
          } as never,
          { onConflict: 'tahun_ajaran_masehi' }
        )
        .select('*')
        .maybeSingle();

      if (!error && data) {
        const merged = sortSnapshotsByTA([
          ...get().snapshots.filter((s) => s.tahun_ajaran_masehi !== tahun_ajaran_masehi),
          data as DatabaseTahunAjaranRekap,
        ]);
        set({ snapshots: merged });
        writeLocalCache(merged);
      } else {
        await persistFallbackAppSettings(nextList);
      }

      void logActivity(
        'DATABASE TAHUN AJARAN',
        `${existing ? 'Memperbarui' : 'Merekam'} rekap snapshot TA ${tahun_ajaran_masehi} (1-4 ULA, 1-2 WUSTHO, 1-2 ULYA) oleh ${actorName}`
      );
    } catch {
      await persistFallbackAppSettings(nextList);
    } finally {
      set({ isSaving: false });
    }

    return { ok: true };
  },

  toggleLockSnapshot: async (tahunAjaranMasehi, actorName = 'Administrator') => {
    const existing = get().snapshots.find(
      (s) => s.tahun_ajaran_masehi === tahunAjaranMasehi
    );
    if (!existing) {
      return { ok: false, error: 'Snapshot Tahun Ajaran belum ditemukan.' };
    }

    const nextStatus = existing.status_arsip === 'terkunci' ? 'draf' : 'terkunci';
    const nowIso = new Date().toISOString();
    const updated: DatabaseTahunAjaranRekap = {
      ...existing,
      status_arsip: nextStatus,
      diperbarui_oleh: actorName,
      updated_at: nowIso,
    };

    const nextList = sortSnapshotsByTA([
      ...get().snapshots.filter((s) => s.tahun_ajaran_masehi !== tahunAjaranMasehi),
      updated,
    ]);
    set({ snapshots: nextList, isSaving: true });
    writeLocalCache(nextList);

    try {
      const { error } = await supabase
        .from('database_tahun_ajaran_rekap' as never)
        .update({
          status_arsip: nextStatus,
          diperbarui_oleh: actorName,
          updated_at: nowIso,
        } as never)
        .eq('tahun_ajaran_masehi', tahunAjaranMasehi);

      if (error) {
        await persistFallbackAppSettings(nextList);
      }

      void logActivity(
        'DATABASE TAHUN AJARAN',
        `${nextStatus === 'terkunci' ? 'Mengunci' : 'Membuka kunci'} arsip TA ${tahunAjaranMasehi} oleh ${actorName}`
      );
    } catch {
      await persistFallbackAppSettings(nextList);
    } finally {
      set({ isSaving: false });
    }

    return { ok: true };
  },

  updateCatatanEvaluasi: async (
    tahunAjaranMasehi,
    catatan,
    actorName = 'Administrator'
  ) => {
    const existing = get().snapshots.find(
      (s) => s.tahun_ajaran_masehi === tahunAjaranMasehi
    );
    if (!existing) {
      return { ok: false, error: 'Snapshot Tahun Ajaran belum direkam.' };
    }

    const nowIso = new Date().toISOString();
    const updated: DatabaseTahunAjaranRekap = {
      ...existing,
      catatan_evaluasi: catatan,
      diperbarui_oleh: actorName,
      updated_at: nowIso,
    };

    const nextList = sortSnapshotsByTA([
      ...get().snapshots.filter((s) => s.tahun_ajaran_masehi !== tahunAjaranMasehi),
      updated,
    ]);
    set({ snapshots: nextList, isSaving: true });
    writeLocalCache(nextList);

    try {
      const { error } = await supabase
        .from('database_tahun_ajaran_rekap' as never)
        .update({
          catatan_evaluasi: catatan,
          diperbarui_oleh: actorName,
          updated_at: nowIso,
        } as never)
        .eq('tahun_ajaran_masehi', tahunAjaranMasehi);

      if (error) {
        await persistFallbackAppSettings(nextList);
      }

      void logActivity(
        'DATABASE TAHUN AJARAN',
        `Memperbarui catatan evaluasi TA ${tahunAjaranMasehi} oleh ${actorName}`
      );
    } catch {
      await persistFallbackAppSettings(nextList);
    } finally {
      set({ isSaving: false });
    }

    return { ok: true };
  },

  deleteSnapshot: async (tahunAjaranMasehi, actorName = 'Administrator') => {
    const existing = get().snapshots.find(
      (s) => s.tahun_ajaran_masehi === tahunAjaranMasehi
    );
    if (!existing) {
      return { ok: false, error: 'Snapshot tidak ditemukan.' };
    }
    if (existing.status_arsip === 'terkunci') {
      return {
        ok: false,
        error: 'Arsip yang terkunci tidak dapat dihapus sebelum dibuka kuncinya.',
      };
    }

    const nextList = get().snapshots.filter(
      (s) => s.tahun_ajaran_masehi !== tahunAjaranMasehi
    );
    set({ snapshots: nextList, isSaving: true });
    writeLocalCache(nextList);

    try {
      const { error } = await supabase
        .from('database_tahun_ajaran_rekap' as never)
        .delete()
        .eq('tahun_ajaran_masehi', tahunAjaranMasehi);

      if (error) {
        await persistFallbackAppSettings(nextList);
      }

      void logActivity(
        'DATABASE TAHUN AJARAN',
        `Menghapus draf snapshot TA ${tahunAjaranMasehi} oleh ${actorName}`
      );
    } catch {
      await persistFallbackAppSettings(nextList);
    } finally {
      set({ isSaving: false });
    }

    return { ok: true };
  },
}));
