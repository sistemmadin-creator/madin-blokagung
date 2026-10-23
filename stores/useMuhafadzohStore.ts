import { create } from 'zustand';
import { SetoranHafalan, HafalanConfig } from '@/types/setoran';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

export const KEY_DB_MUHAFADZOH = 'KEY_DB_MUHAFADZOH';
export const KEY_DB_HAFALAN_CONFIG = 'KEY_DB_HAFALAN_CONFIG';

const DEFAULT_CONFIG: HafalanConfig = {
  hafWajib: {
    'Nadhom Imrithi': 254,
    'Alfiyah Ibnu Malik Jilid 1': 500,
    'Alfiyah Ibnu Malik Jilid 2': 502,
    'Nadhom Maqsud': 150,
    'Jauharul Maknun': 291,
  },
  hafSunnah: {
    'Hidayatush Shibyan': 40,
    'Tuhfatul Athfal': 61,
    'Mandhumah Baiquniyyah': 34,
    "Ro'sun Sirah": 100,
    'Amtsilah Tashrifiyyah': 120,
  },
  hafKitab: {
    'Mabadi Fiqhiyyah Juz 1': 30,
    'Mabadi Fiqhiyyah Juz 2': 45,
    'Aqidatul Awwam': 57,
    'Taisirul Khollaq': 50,
  },
  penjagaBebas: ['Ust. Ahmad', 'Ust. Zaid', 'Ust. Sholih', 'Ust. Mansur'],
};

interface MuhafadzohState {
  setoranList: SetoranHafalan[];
  config: HafalanConfig;
  isLoading: boolean;
  isSettingsOpen: boolean;

  fetchSetoranData: () => Promise<void>;
  addSetoran: (setoran: SetoranHafalan) => Promise<boolean>;
  deleteSetoran: (id: string) => Promise<boolean>;
  saveConfig: (cfg: HafalanConfig) => Promise<boolean>;

  openSettings: () => void;
  closeSettings: () => void;
}

export const useMuhafadzohStore = create<MuhafadzohState>((set, get) => ({
  setoranList: [],
  config: DEFAULT_CONFIG,
  isLoading: false,
  isSettingsOpen: false,

  fetchSetoranData: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [KEY_DB_MUHAFADZOH, KEY_DB_HAFALAN_CONFIG]);

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach((row) => {
          let val = row.value;
          if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch (e) {}
          }

          if (row.key === KEY_DB_MUHAFADZOH && Array.isArray(val)) {
            set({ setoranList: val });
          } else if (row.key === KEY_DB_HAFALAN_CONFIG && val && typeof val === 'object') {
            set({ config: { ...DEFAULT_CONFIG, ...val } });
          }
        });
      }
    } catch (err: any) {
      console.error('Fetch setoran error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  addSetoran: async (newEntry) => {
    try {
      const entryWithId = {
        ...newEntry,
        id: newEntry.id || `set_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      };

      const currentList = get().setoranList;
      const updated = [entryWithId, ...currentList];
      set({ setoranList: updated });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_MUHAFADZOH, value: updated }], { onConflict: 'key' });

      await logActivity('INPUT SETORAN MUHAFADZOH', `Setoran santri: ${newEntry.nama} (${newEntry.item_hafalan} - Capaian: ${newEntry.capaian})`);
      return true;
    } catch (err: any) {
      alert('Gagal menyimpan setoran: ' + err.message);
      return false;
    }
  },

  deleteSetoran: async (id) => {
    if (!confirm('Hapus riwayat setoran ini?')) return false;
    try {
      const updated = get().setoranList.filter((s) => s.id !== id);
      set({ setoranList: updated });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_MUHAFADZOH, value: updated }], { onConflict: 'key' });

      await logActivity('HAPUS SETORAN', `Menghapus setoran ID: ${id}`);
      return true;
    } catch (err: any) {
      alert('Gagal menghapus setoran: ' + err.message);
      return false;
    }
  },

  saveConfig: async (newConfig) => {
    try {
      set({ config: newConfig });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_HAFALAN_CONFIG, value: newConfig }], { onConflict: 'key' });

      await logActivity('PENGATURAN TARGET HAFALAN', 'Memperbarui konfigurasi target muhafadzoh');
      return true;
    } catch (err: any) {
      alert('Gagal menyimpan target hafalan: ' + err.message);
      return false;
    }
  },
}));
