import { create } from 'zustand';
import { FanItem } from '@/types/fan';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

const KEY_DB_FAN_CONFIG = 'KEY_DB_FAN_CONFIG';
const KEY_DB_FAN_DETAIL = 'KEY_DB_FAN_DETAIL';
const KEY_DB_GRUP_ASAL = 'KEY_DB_GRUP_ASAL';

const DEFAULT_FAN_ITEMS: FanItem[] = [
  { id: '1', nama: 'FIQIH', kitab: 'Fathul Qorib / Mabadi Fiqhiyyah', tingkat: 'Ula', jamMS: 2, jamMB: 2, grupAsal: 'Al-Anwar' },
  { id: '2', nama: 'NAHWU', kitab: 'Jurumiyyah / Imrithi / Alfiyah', tingkat: 'Ula', jamMS: 2, jamMB: 2, grupAsal: 'Lirboyo' },
  { id: '3', nama: 'SHOROF', kitab: 'Amtsilah Tashrifiyyah / Qowaidush Shorfi', tingkat: 'Ula', jamMS: 2, jamMB: 1, grupAsal: 'Ploso' },
  { id: '4', nama: 'TAJWID', kitab: 'Hidayatush Shibyan / Tuhfatul Athfal', tingkat: 'Ula', jamMS: 1, jamMB: 1, grupAsal: 'Blokagung' },
  { id: '5', nama: 'TAUHID', kitab: 'Aqidatul Awwam / Tijanud Darori', tingkat: 'Ula', jamMS: 1, jamMB: 1, grupAsal: 'Sidogiri' },
  { id: '6', nama: 'AKHLAQ', kitab: 'Taisirul Khollaq / Akhlaqul Banin', tingkat: 'Ula', jamMS: 1, jamMB: 1, grupAsal: 'Sarangan' },
  { id: '7', nama: 'TARIKH', kitab: 'Khulashoh Nurul Yaqin', tingkat: 'Ula', jamMS: 1, jamMB: 1, grupAsal: 'Blokagung' },
  { id: '8', nama: 'FAROIDH', kitab: 'Idhohul Ghawamid / Rahbiyyah', tingkat: 'Wustho', jamMS: 2, jamMB: 1, grupAsal: 'Lirboyo' },
  { id: '9', nama: 'USHUL FIQIH', kitab: 'Al-Waraqat / Lathoiful Isyarat', tingkat: 'Wustho', jamMS: 2, jamMB: 1, grupAsal: 'Ploso' },
  { id: '10', nama: 'BALAGHOH', kitab: 'Jauharul Maknun', tingkat: 'Ulya', jamMS: 2, jamMB: 2, grupAsal: 'Lirboyo' },
];

interface FanState {
  fanItems: FanItem[];
  grupAsalList: string[];
  pengajarMap: Record<string, string[]>; // fanId -> [asatidzNames]
  isLoading: boolean;
  isModalFanOpen: boolean;
  isModalGrupOpen: boolean;
  selectedFan: FanItem | null;

  fetchFanData: () => Promise<void>;
  saveFanItem: (item: FanItem, isEdit: boolean) => Promise<boolean>;
  deleteFanItem: (id: string) => Promise<boolean>;
  setPengajarFan: (fanNama: string, asatidzNames: string[]) => Promise<boolean>;
  saveGrupAsalList: (grups: string[]) => Promise<boolean>;

  openModalFan: (fan?: FanItem | null) => void;
  closeModalFan: () => void;
  openModalGrup: () => void;
  closeModalGrup: () => void;
}

export const useFanStore = create<FanState>((set, get) => ({
  fanItems: DEFAULT_FAN_ITEMS,
  grupAsalList: ['Blokagung', 'Lirboyo', 'Ploso', 'Sidogiri', 'Al-Anwar', 'Sarangan'],
  pengajarMap: {},
  isLoading: false,
  isModalFanOpen: false,
  isModalGrupOpen: false,
  selectedFan: null,

  fetchFanData: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [KEY_DB_FAN_CONFIG, KEY_DB_FAN_DETAIL, KEY_DB_GRUP_ASAL]);

      if (error) throw error;

      if (data && data.length > 0) {
        data.forEach((row) => {
          let val = row.value;
          if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch (e) {}
          }

          if (row.key === KEY_DB_FAN_CONFIG && Array.isArray(val) && val.length > 0) {
            set({ fanItems: val });
          } else if (row.key === KEY_DB_FAN_DETAIL && val && typeof val === 'object') {
            set({ pengajarMap: val.item || val || {} });
          } else if (row.key === KEY_DB_GRUP_ASAL && Array.isArray(val)) {
            set({ grupAsalList: val });
          }
        });
      }
    } catch (err: any) {
      console.error('Fetch fan data error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  openModalFan: (fan = null) => set({ isModalFanOpen: true, selectedFan: fan }),
  closeModalFan: () => set({ isModalFanOpen: false, selectedFan: null }),
  openModalGrup: () => set({ isModalGrupOpen: true }),
  closeModalGrup: () => set({ isModalGrupOpen: false }),

  saveFanItem: async (item, isEdit) => {
    try {
      const current = get().fanItems;
      let updated: FanItem[];
      if (isEdit) {
        updated = current.map((f) => (f.id === item.id ? item : f));
      } else {
        const newItem = { ...item, id: String(Date.now()) };
        updated = [...current, newItem];
      }

      set({ fanItems: updated });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_FAN_CONFIG, value: updated }], { onConflict: 'key' });

      await logActivity('UPDATE FAN PELAJARAN', `${isEdit ? 'Mengubah' : 'Menambah'} Fan: ${item.nama}`);
      return true;
    } catch (err: any) {
      alert('Gagal menyimpan fan: ' + err.message);
      return false;
    }
  },

  deleteFanItem: async (id) => {
    if (!confirm('Yakin ingin menghapus Fan Pelajaran ini?')) return false;
    try {
      const updated = get().fanItems.filter((f) => f.id !== id);
      set({ fanItems: updated });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_FAN_CONFIG, value: updated }], { onConflict: 'key' });

      await logActivity('HAPUS FAN PELAJARAN', `Menghapus fan ID: ${id}`);
      return true;
    } catch (err: any) {
      alert('Gagal menghapus fan: ' + err.message);
      return false;
    }
  },

  setPengajarFan: async (fanNama, asatidzNames) => {
    try {
      const newMap = { ...get().pengajarMap, [fanNama]: asatidzNames };
      set({ pengajarMap: newMap });

      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_FAN_DETAIL, value: { item: newMap } }], { onConflict: 'key' });

      await logActivity('UPDATE PENGAJAR FAN', `Memperbarui dewan pengajar Fan: ${fanNama}`);
      return true;
    } catch (err: any) {
      alert('Gagal menyimpan pengajar fan: ' + err.message);
      return false;
    }
  },

  saveGrupAsalList: async (grups) => {
    try {
      set({ grupAsalList: grups });
      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_GRUP_ASAL, value: grups }], { onConflict: 'key' });
      await logActivity('UPDATE GRUP ASAL', 'Memperbarui master grup asal dewan asatidz');
      return true;
    } catch (err: any) {
      alert('Gagal menyimpan grup asal: ' + err.message);
      return false;
    }
  },
}));
