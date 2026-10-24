import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

export const KEY_DB_JADWAL_ASATIDZ = 'JADWAL_MENGAJAR_ASATIDZ';
export const LIST_HARI = ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis'] as const;
export type HariKbm = (typeof LIST_HARI)[number];

export interface SlotJadwal {
  jam: 1 | 2 | 3 | 4;
  kelas: string; // e.g. "Ula 1A"
  fan: string;   // e.g. "FIQIH"
  asatidz: string; // e.g. "Ust. Ahmad"
}

export interface TeacherJadwalRow {
  nama_asatidz: string;
  mengajar?: string;
  sabtu?: string;
  ahad?: string;
  senin?: string;
  selasa?: string;
  rabu?: string;
  kamis?: string;
  totalJam?: number;
}

interface JadwalState {
  jadwalMap: Record<string, TeacherJadwalRow>;
  isLoading: boolean;
  activeHari: HariKbm;

  fetchJadwal: () => Promise<void>;
  setActiveHari: (hari: HariKbm) => void;
  updateJadwalSlot: (
    hari: HariKbm,
    jam: 1 | 2 | 3 | 4,
    kelas: string,
    fan: string,
    asatidz: string
  ) => Promise<boolean>;
  deleteJadwalSlot: (hari: HariKbm, jam: 1 | 2 | 3 | 4, kelas: string) => Promise<boolean>;
}

export const useJadwalStore = create<JadwalState>((set, get) => ({
  jadwalMap: {},
  isLoading: false,
  activeHari: 'Sabtu',

  fetchJadwal: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', KEY_DB_JADWAL_ASATIDZ)
        .maybeSingle();

      if (error) throw error;
      if (data && data.value) {
        let val = data.value;
        if (typeof val === 'string') {
          try { val = JSON.parse(val); } catch (e) {}
        }
        set({ jadwalMap: val || {} });
      }
    } catch (err: any) {
      console.error('Fetch jadwal error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveHari: (hari) => set({ activeHari: hari }),

  updateJadwalSlot: async (hari, jam, kelas, fan, asatidz) => {
    try {
      const map = { ...get().jadwalMap };
      const hariKey = hari.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';

      // 1. Remove any previous assignment in this class slot from all teachers
      Object.keys(map).forEach((teacherKey) => {
        const row = { ...map[teacherKey] };
        const dayStr = row[hariKey] || '';
        if (dayStr) {
          const lines = dayStr.split(';;').map((s) => s.trim()).filter(Boolean);
          const filtered = lines.filter((l) => {
            const parts = l.split('|').map((s) => s.trim());
            const slotJam = parseInt((parts[0] || '').replace(/\D/g, ''), 10);
            const slotKelas = parts[1] || '';
            return !(slotJam === jam && slotKelas.toLowerCase() === kelas.toLowerCase());
          });
          row[hariKey] = filtered.join(' ;; ');
          map[teacherKey] = row;
        }
      });

      // 2. Add to new teacher if asatidz is given
      if (asatidz) {
        const teacherKey = asatidz.trim().toUpperCase();
        const currentTeacherRow = map[teacherKey] || {
          nama_asatidz: asatidz.trim(),
          mengajar: fan,
        };

        const existingDayStr = currentTeacherRow[hariKey] || '';
        const lines = existingDayStr ? existingDayStr.split(';;').map((s) => s.trim()) : [];
        lines.push(`Jam ${jam} | ${kelas} | ${fan}`);
        currentTeacherRow[hariKey] = lines.join(' ;; ');
        map[teacherKey] = currentTeacherRow;
      }

      set({ jadwalMap: map });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_JADWAL_ASATIDZ, value: map }], { onConflict: 'key' });

      await logActivity('UPDATE JADWAL KBM', `Memperbarui jadwal ${hari} Jam ${jam} Kelas ${kelas}: ${fan} (${asatidz})`);
      return true;
    } catch (err: any) {
      alert('Gagal memperbarui jadwal: ' + err.message);
      return false;
    }
  },

  deleteJadwalSlot: async (hari, jam, kelas) => {
    return get().updateJadwalSlot(hari, jam, kelas, '', '');
  },
}));
