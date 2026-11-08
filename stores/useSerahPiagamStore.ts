import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { SerahPiagamRecord, StatusFilterSerahPiagam } from '@/types/serah-piagam';

const STORAGE_KEY = 'madin_serah_piagam_cache';

interface SerahPiagamState {
  records: Record<string, SerahPiagamRecord>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSyncTime: string | null;

  // Filter & Search
  filterStatus: StatusFilterSerahPiagam;
  searchKeyword: string;
  filterTingkat: string;
  filterKelas: string;
  filterGender: string;
  tahun: number;

  // Actions
  fetchRecords: () => Promise<void>;
  toggleMenerima: (
    santri: {
      no_induk: string;
      nama: string;
      tingkat?: string;
      din_kls?: string;
      din_bag?: string;
    },
    forcedStatus?: boolean
  ) => Promise<boolean>;
  batchSetKelasMenerima: (
    students: Array<{
      no_induk: string;
      nama: string;
      tingkat?: string;
      din_kls?: string;
      din_bag?: string;
    }>,
    status: boolean
  ) => Promise<boolean>;
  setFilterStatus: (status: StatusFilterSerahPiagam) => void;
  setSearchKeyword: (keyword: string) => void;
  setFilterTingkat: (tingkat: string) => void;
  setFilterKelas: (kelas: string) => void;
  setFilterGender: (gender: string) => void;
  setTahun: (tahun: number) => void;
  resetFilters: () => void;
}

function loadLocalCache(): Record<string, SerahPiagamRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, SerahPiagamRecord>;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

function saveLocalCache(records: Record<string, SerahPiagamRecord>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore quota errors
  }
}

export const useSerahPiagamStore = create<SerahPiagamState>((set, get) => ({
  records: typeof window !== 'undefined' ? loadLocalCache() : {},
  isLoading: false,
  isSaving: false,
  error: null,
  lastSyncTime: null,

  filterStatus: 'all',
  searchKeyword: '',
  filterTingkat: 'ALL',
  filterKelas: 'ALL',
  filterGender: 'ALL',
  tahun: 2026,

  fetchRecords: async () => {
    const { tahun } = get();
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('serah_piagam')
        .select('*')
        .eq('tahun', tahun);

      if (error) {
        console.warn('Gagal memuat serah_piagam dari Supabase, menggunakan cache lokal:', error.message);
        set({ isLoading: false });
        return;
      }

      if (data && Array.isArray(data)) {
        const nextMap: Record<string, SerahPiagamRecord> = { ...get().records };
        data.forEach((row: any) => {
          const key = `${row.no_induk}_${row.tahun}`;
          nextMap[key] = {
            id: row.id,
            no_induk: row.no_induk,
            nama_santri: row.nama_santri,
            kelas_id: row.kelas_id,
            tingkat: row.tingkat,
            tahun: row.tahun,
            is_menerima: Boolean(row.is_menerima),
            tanggal_serah: row.tanggal_serah,
            diserahkan_oleh: row.diserahkan_oleh,
            catatan: row.catatan,
            created_at: row.created_at,
            updated_at: row.updated_at,
          };
        });

        saveLocalCache(nextMap);
        set({
          records: nextMap,
          isLoading: false,
          lastSyncTime: new Date().toISOString(),
        });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      console.warn('Fetch records exception:', err?.message);
      set({ isLoading: false, error: err?.message || 'Gagal memuat data' });
    }
  },

  toggleMenerima: async (santri, forcedStatus) => {
    const { tahun, records } = get();
    const key = `${santri.no_induk}_${tahun}`;
    const existing = records[key];
    const newStatus = forcedStatus !== undefined ? forcedStatus : !(existing?.is_menerima ?? false);
    const nowIso = newStatus ? new Date().toISOString() : null;
    const kelasId = `${santri.din_kls || '1'}_${santri.tingkat || 'ULA'}_${santri.din_bag || 'A'}`;

    const updatedRecord: SerahPiagamRecord = {
      id: existing?.id || `sp-${santri.no_induk}-${tahun}`,
      no_induk: santri.no_induk,
      nama_santri: santri.nama,
      kelas_id: kelasId,
      tingkat: santri.tingkat || 'ULA',
      tahun,
      is_menerima: newStatus,
      tanggal_serah: nowIso,
      diserahkan_oleh: 'Pengurus Muhafadzoh',
      updated_at: new Date().toISOString(),
    };

    // 1. Optimistic update
    const nextMap = {
      ...records,
      [key]: updatedRecord,
    };
    set({ records: nextMap, isSaving: true });
    saveLocalCache(nextMap);

    // 2. Persist to Supabase
    try {
      const { error } = await supabase.from('serah_piagam').upsert(
        {
          id: updatedRecord.id,
          no_induk: updatedRecord.no_induk,
          nama_santri: updatedRecord.nama_santri,
          kelas_id: updatedRecord.kelas_id,
          tingkat: updatedRecord.tingkat,
          tahun: updatedRecord.tahun,
          is_menerima: updatedRecord.is_menerima,
          tanggal_serah: updatedRecord.tanggal_serah,
          diserahkan_oleh: updatedRecord.diserahkan_oleh,
          updated_at: updatedRecord.updated_at,
        },
        { onConflict: 'no_induk,tahun' }
      );

      if (error) {
        console.warn('Upsert serah_piagam warning (tersimpan di cache lokal):', error.message);
      } else {
        void logActivity(
          'SERAH PIAGAM',
          `Santri ${santri.nama} (${santri.no_induk}) ditandai ${
            newStatus ? 'SUDAH MENERIMA' : 'BELUM MENERIMA'
          } piagam tahun ${tahun}`
        );
      }
    } catch (err: any) {
      console.warn('Gagal sinkronisasi ke remote Supabase:', err?.message);
    } finally {
      set({ isSaving: false });
    }

    return true;
  },

  batchSetKelasMenerima: async (students, status) => {
    const { tahun, records } = get();
    if (!students || students.length === 0) return false;

    const nowIso = status ? new Date().toISOString() : null;
    const nextMap = { ...records };
    const payloadUpsert: any[] = [];

    students.forEach((s) => {
      const key = `${s.no_induk}_${tahun}`;
      const existing = records[key];
      const kelasId = `${s.din_kls || '1'}_${s.tingkat || 'ULA'}_${s.din_bag || 'A'}`;

      const rec: SerahPiagamRecord = {
        id: existing?.id || `sp-${s.no_induk}-${tahun}`,
        no_induk: s.no_induk,
        nama_santri: s.nama,
        kelas_id: kelasId,
        tingkat: s.tingkat || 'ULA',
        tahun,
        is_menerima: status,
        tanggal_serah: nowIso,
        diserahkan_oleh: 'Pengurus Muhafadzoh',
        updated_at: new Date().toISOString(),
      };

      nextMap[key] = rec;
      payloadUpsert.push({
        id: rec.id,
        no_induk: rec.no_induk,
        nama_santri: rec.nama_santri,
        kelas_id: rec.kelas_id,
        tingkat: rec.tingkat,
        tahun: rec.tahun,
        is_menerima: rec.is_menerima,
        tanggal_serah: rec.tanggal_serah,
        diserahkan_oleh: rec.diserahkan_oleh,
        updated_at: rec.updated_at,
      });
    });

    // Optimistic
    set({ records: nextMap, isSaving: true });
    saveLocalCache(nextMap);

    try {
      const { error } = await supabase
        .from('serah_piagam')
        .upsert(payloadUpsert, { onConflict: 'no_induk,tahun' });

      if (error) {
        console.warn('Batch upsert serah_piagam warning:', error.message);
      } else {
        void logActivity(
          'SERAH PIAGAM',
          `Batch update ${students.length} santri ditandai ${
            status ? 'SUDAH MENERIMA' : 'BELUM MENERIMA'
          } piagam tahun ${tahun}`
        );
      }
    } catch (err: any) {
      console.warn('Gagal batch update remote:', err?.message);
    } finally {
      set({ isSaving: false });
    }

    return true;
  },

  setFilterStatus: (status) => set({ filterStatus: status }),
  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setFilterTingkat: (tingkat) => set({ filterTingkat: tingkat }),
  setFilterKelas: (kelas) => set({ filterKelas: kelas }),
  setFilterGender: (gender) => set({ filterGender: gender }),
  setTahun: (tahun) => {
    set({ tahun });
    get().fetchRecords();
  },
  resetFilters: () =>
    set({
      filterStatus: 'all',
      searchKeyword: '',
      filterTingkat: 'ALL',
      filterKelas: 'ALL',
      filterGender: 'ALL',
    }),
}));
