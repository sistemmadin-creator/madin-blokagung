import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { JamKbm, RecordSesiAbsensi, StatusAbsensi, HariLiburInfo } from '@/types/absensi';
import { logActivity } from '@/lib/utils/audit';

export const KEY_DB_ABSENSI = 'KEY_DB_ABSENSI';
export const KEY_DB_LIBUR = 'KEY_DB_LIBUR';

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface AbsensiState {
  absensiMapByDate: Record<string, Record<JamKbm, RecordSesiAbsensi[]>>;
  liburMapByDate: Record<string, HariLiburInfo>;
  selectedDate: string;
  selectedJam: JamKbm;
  isLoading: boolean;

  fetchAbsensi: () => Promise<void>;
  setSelectedDate: (date: string) => void;
  setSelectedJam: (jam: JamKbm) => void;

  saveSessionRecords: (date: string, jam: JamKbm, records: RecordSesiAbsensi[]) => Promise<boolean>;
  setHariLibur: (date: string, info: HariLiburInfo) => Promise<boolean>;
  hapusHariLibur: (date: string) => Promise<boolean>;
}

export const useAbsensiStore = create<AbsensiState>((set, get) => ({
  absensiMapByDate: {},
  liburMapByDate: {},
  selectedDate: getTodayString(),
  selectedJam: 1,
  isLoading: false,

  fetchAbsensi: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [KEY_DB_ABSENSI, KEY_DB_LIBUR]);

      if (error) throw error;

      if (data && data.length > 0) {
        let absMap = {};
        let libMap = {};

        data.forEach((row) => {
          let val = row.value;
          if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch (e) {}
          }

          if (row.key === KEY_DB_ABSENSI && val && typeof val === 'object') {
            absMap = val;
          } else if (row.key === KEY_DB_LIBUR && val && typeof val === 'object') {
            libMap = val;
          }
        });

        set({ absensiMapByDate: absMap, liburMapByDate: libMap });
      }
    } catch (err: any) {
      console.error('Fetch absensi error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedJam: (jam) => set({ selectedJam: jam }),

  saveSessionRecords: async (date, jam, records) => {
    try {
      const currentMap = { ...get().absensiMapByDate };
      if (!currentMap[date]) {
        currentMap[date] = { 1: [], 2: [], 3: [], 4: [] };
      }
      currentMap[date][jam] = records;

      set({ absensiMapByDate: currentMap });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_ABSENSI, value: currentMap }], { onConflict: 'key' });

      await logActivity('INPUT ABSENSI ASATIDZ', `Menyimpan presensi Jam ${jam} tanggal ${date} (${records.length} pengajar)`);
      return true;
    } catch (err: any) {
      alert('Gagal menyimpan presensi: ' + err.message);
      return false;
    }
  },

  setHariLibur: async (date, info) => {
    try {
      const currentLib = { ...get().liburMapByDate, [date]: info };
      set({ liburMapByDate: currentLib });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_LIBUR, value: currentLib }], { onConflict: 'key' });

      await logActivity('ATUR HARI LIBUR', `Menetapkan libur tanggal ${date}: ${info.kategori} - ${info.keterangan}`);
      return true;
    } catch (err: any) {
      alert('Gagal menyimpan status libur: ' + err.message);
      return false;
    }
  },

  hapusHariLibur: async (date) => {
    try {
      const currentLib = { ...get().liburMapByDate };
      delete currentLib[date];
      set({ liburMapByDate: currentLib });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_LIBUR, value: currentLib }], { onConflict: 'key' });

      await logActivity('HAPUS HARI LIBUR', `Menghapus status libur tanggal ${date}`);
      return true;
    } catch (err: any) {
      alert('Gagal menghapus status libur: ' + err.message);
      return false;
    }
  },
}));
