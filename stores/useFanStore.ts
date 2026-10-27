/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import {
  FanConfigMap,
  FanPelajaranDetail,
  GrupAsalItem,
  FanItem,
} from '@/types/fan';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { Asatidz } from '@/types/asatidz';
import { Formasi } from '@/types/formasi';
import {
  isKelasUnggulan,
  getMustahiqByScope,
  getDaftarBagUnggulanTingkatKls,
} from '@/lib/utils/fanHelper';

const KEY_DB_FAN_CONFIG = 'FAN_CONFIG';
const KEY_DB_FAN_DETAIL = 'FAN_PELAJARAN_DETAIL';
const KEY_DB_GRUP_ASAL = 'GRUP_ASAL_ASATIDZ';

const LS_FAN_CONFIG = 'MADIN_FAN_CONFIG';
const LS_FAN_DETAIL = 'MADIN_FAN_PELAJARAN_DETAIL';
const LS_GRUP_ASAL = 'MADIN_GRUP_ASAL_ASATIDZ';

const DEFAULT_FAN_CONFIG: FanConfigMap = {
  '1 ULA': [
    '(Fiqih) Mabadi Fiqih Juz I',
    '(Tajwid) Hidayatush Shibyan',
    '(Nahwu) Jurumiyyah Dasar',
    '(Akhlaq) Akhlaqul Banin',
    '(Tauhid) Aqidatul Awwam',
    '(Tarikh) Khulashoh Nurul Yaqin I',
  ],
  '2 ULA': [
    '(Fiqih) Mabadi Fiqih Juz II',
    '(Tajwid) Tuhfatul Athfal',
    '(Nahwu) Al-Jurumiyyah',
    '(Shorof) Amtsilah Tashrifiyyah I',
    '(Tauhid) Tijanud Darori',
    '(Akhlaq) Taisirul Khollaq',
  ],
  '3 ULA': [
    '(Fiqih) Mabadi Fiqih Juz III',
    '(Nahwu) Al-Imrithi',
    '(Shorof) Amtsilah Tashrifiyyah II',
    '(Hadits) Arba\'in Nawawiyyah',
    '(Tarikh) Khulashoh Nurul Yaqin II',
  ],
  '4 ULA': [
    '(Fiqih) Safinatun Najah',
    '(Nahwu) Imrithi Lanjutan',
    '(Shorof) Qowaidush Shorfi',
    '(Faroidh) Al-Mawarits',
  ],
  '1 WUSTHO': [
    '(Fiqih) Fathul Qorib Al-Mujib I',
    '(Nahwu) Alfiyyah Ibnu Malik I',
    '(Ushul Fiqih) Al-Waraqat',
    '(Hadits) Bulughul Maram I',
  ],
  '2 WUSTHO': [
    '(Fiqih) Fathul Qorib Al-Mujib II',
    '(Nahwu) Alfiyyah Ibnu Malik II',
    '(Balaghoh) Durusul Balaghah',
  ],
  '3 WUSTHO': [
    '(Fiqih) Fathul Mu\'in I',
    '(Balaghoh) Jauharul Maknun',
    '(Ushul Fiqih) Ghayatul Wushul',
  ],
};

let autoSaveTimer: NodeJS.Timeout | null = null;

interface FanState {
  fanConfig: FanConfigMap;
  fanDetail: FanPelajaranDetail;
  masterGrupAsal: GrupAsalItem[];
  grupAsalList: string[]; // List of group names for backward compat
  isLoading: boolean;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  switchMode: 'semua' | 'reguler' | 'unggulan';
  keywordCariFan: string;

  // Modal controls
  isModalConfigOpen: boolean;
  isModalAturFanMSOpen: boolean;
  isModalPilihAsatidzOpen: boolean;
  selectedItemKeyForAsatidz: string | null;
  isModalGrupAsalOpen: boolean;

  // Legacy for backward compat
  fanItems: FanItem[];
  pengajarMap: Record<string, string[]>;
  isModalFanOpen: boolean;
  isModalGrupOpen: boolean;
  selectedFan: FanItem | null;

  // Actions
  fetchFanData: () => Promise<void>;
  setSwitchMode: (mode: 'semua' | 'reguler' | 'unggulan') => void;
  setKeywordCariFan: (keyword: string) => void;

  // Modal Toggles
  openModalConfig: () => void;
  closeModalConfig: () => void;
  openModalAturFanMS: () => void;
  closeModalAturFanMS: () => void;
  openModalPilihAsatidz: (itemKey: string) => void;
  closeModalPilihAsatidz: () => void;
  openModalGrupAsal: () => void;
  closeModalGrupAsal: () => void;

  // Legacy modal methods
  openModalFan: (fan?: FanItem | null) => void;
  closeModalFan: () => void;
  openModalGrup: () => void;
  closeModalGrup: () => void;
  saveFanItem: (item: FanItem, isEdit: boolean) => Promise<boolean>;
  deleteFanItem: (id: string) => Promise<boolean>;
  setPengajarFan: (fanNama: string, asatidzNames: string[]) => Promise<boolean>;
  saveGrupAsalList: (grups: string[]) => Promise<boolean>;

  // Data persistence & Debounced Autosave
  saveFanConfig: (newConfig: FanConfigMap) => Promise<boolean>;
  triggerAutoSaveFanDetail: () => void;
  updateJamItem: (itemKey: string, jam: string) => void;
  updatePengajarItem: (itemKey: string, pengajar: string) => void;
  updateAsatidzItem: (itemKey: string, asatidzNames: string[], pengajarVal?: string) => Promise<boolean>;
  updateKeteranganKelas: (kelasKey: string, keterangan: string) => void;

  // Bulk actions
  bulkClearJam: () => Promise<boolean>;
  bulkClearPengajar: () => Promise<boolean>;

  // Grup Asal actions
  saveMasterGrupAsal: (newList: GrupAsalItem[]) => Promise<boolean>;
  deleteGrupAsal: (idx: number) => Promise<boolean>;
  reorderGrupAsal: (srcIdx: number, targetIdx: number) => Promise<boolean>;

  // Batch setup MS
  applyBatchFanMS: (
    tingkat: string,
    kls: string,
    selectedItems: string[],
    asatidzList: Asatidz[],
    formasiList: Formasi[],
    scope?: 'reguler' | 'unggulan' | 'semua',
    selectedBagUg?: string
  ) => Promise<boolean>;

  bersihkanMustahiqUnggulanDariReguler: (
    asatidzList: Asatidz[],
    formasiList: Formasi[]
  ) => Promise<{ cleanedCount: number; affectedTeachers: string[] }>;
}

export const useFanStore = create<FanState>((set, get) => ({
  fanConfig: DEFAULT_FAN_CONFIG,
  fanDetail: { kelas: {}, item: {} },
  masterGrupAsal: [
    { namaGrup: 'PONDOK INDUK', anggota: [] },
    { namaGrup: 'BLOK A', anggota: [] },
    { namaGrup: 'BLOK B', anggota: [] },
    { namaGrup: 'BLOK C', anggota: [] },
    { namaGrup: 'BLOK D', anggota: [] },
    { namaGrup: 'BLOK E', anggota: [] },
  ],
  grupAsalList: ['PONDOK INDUK', 'BLOK A', 'BLOK B', 'BLOK C', 'BLOK D', 'BLOK E'],
  isLoading: false,
  autoSaveStatus: 'idle',
  switchMode: 'semua',
  keywordCariFan: '',

  isModalConfigOpen: false,
  isModalAturFanMSOpen: false,
  isModalPilihAsatidzOpen: false,
  selectedItemKeyForAsatidz: null,
  isModalGrupAsalOpen: false,

  // Legacy fields
  fanItems: [],
  pengajarMap: {},
  isModalFanOpen: false,
  isModalGrupOpen: false,
  selectedFan: null,

  fetchFanData: async () => {
    // 1. Muat instan dari localStorage sebagai fallback instan
    try {
      const lsCfg = typeof window !== 'undefined' ? localStorage.getItem(LS_FAN_CONFIG) : null;
      if (lsCfg) {
        const parsedCfg = JSON.parse(lsCfg);
        if (parsedCfg && typeof parsedCfg === 'object') set({ fanConfig: parsedCfg });
      }
    } catch {}

    try {
      const lsDet = typeof window !== 'undefined' ? localStorage.getItem(LS_FAN_DETAIL) : null;
      if (lsDet) {
        const parsedDet = JSON.parse(lsDet);
        if (parsedDet && typeof parsedDet === 'object') {
          set({
            fanDetail: {
              kelas: parsedDet.kelas || {},
              item: parsedDet.item || {},
            },
          });
        }
      }
    } catch {}

    try {
      const lsGrup = typeof window !== 'undefined' ? localStorage.getItem(LS_GRUP_ASAL) : null;
      if (lsGrup) {
        const parsedGrup = JSON.parse(lsGrup);
        if (Array.isArray(parsedGrup)) {
          const list = parsedGrup.map((g: any) =>
            typeof g === 'string' ? { namaGrup: g, anggota: [] } : g
          );
          set({ masterGrupAsal: list, grupAsalList: list.map((g) => g.namaGrup) });
        }
      }
    } catch {}

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
            try {
              val = JSON.parse(val);
            } catch {}
          }

          if (row.key === KEY_DB_FAN_CONFIG && val && typeof val === 'object') {
            set({ fanConfig: val });
            try {
              localStorage.setItem(LS_FAN_CONFIG, JSON.stringify(val));
            } catch {}
          } else if (row.key === KEY_DB_FAN_DETAIL && val && typeof val === 'object') {
            const detailObj: FanPelajaranDetail = {
              kelas: val.kelas || {},
              item: val.item || {},
            };
            set({ fanDetail: detailObj });
            try {
              localStorage.setItem(LS_FAN_DETAIL, JSON.stringify(detailObj));
            } catch {}
          } else if (row.key === KEY_DB_GRUP_ASAL && Array.isArray(val)) {
            const list: GrupAsalItem[] = val.map((g: any) =>
              typeof g === 'string' ? { namaGrup: g, anggota: [] } : g
            );
            set({ masterGrupAsal: list, grupAsalList: list.map((g) => g.namaGrup) });
            try {
              localStorage.setItem(LS_GRUP_ASAL, JSON.stringify(list));
            } catch {}
          }
        });
      }
    } catch (err: any) {
      console.warn('Gagal memuat Fan Data dari Supabase:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  setSwitchMode: (mode) => set({ switchMode: mode }),
  setKeywordCariFan: (keyword) => set({ keywordCariFan: keyword }),

  openModalConfig: () => set({ isModalConfigOpen: true }),
  closeModalConfig: () => set({ isModalConfigOpen: false }),
  openModalAturFanMS: () => set({ isModalAturFanMSOpen: true }),
  closeModalAturFanMS: () => set({ isModalAturFanMSOpen: false }),
  openModalPilihAsatidz: (itemKey) =>
    set({ isModalPilihAsatidzOpen: true, selectedItemKeyForAsatidz: itemKey }),
  closeModalPilihAsatidz: () =>
    set({ isModalPilihAsatidzOpen: false, selectedItemKeyForAsatidz: null }),
  openModalGrupAsal: () => set({ isModalGrupAsalOpen: true }),
  closeModalGrupAsal: () => set({ isModalGrupAsalOpen: false }),

  // Legacy methods
  openModalFan: (fan = null) => set({ isModalFanOpen: true, selectedFan: fan }),
  closeModalFan: () => set({ isModalFanOpen: false, selectedFan: null }),
  openModalGrup: () => set({ isModalGrupOpen: true }),
  closeModalGrup: () => set({ isModalGrupOpen: false }),
  saveFanItem: async () => true,
  deleteFanItem: async () => true,
  setPengajarFan: async () => true,
  saveGrupAsalList: async () => true,

  saveFanConfig: async (newConfig: FanConfigMap) => {
    const prevConfig = get().fanConfig;
    const currentDetail = JSON.parse(JSON.stringify(get().fanDetail)) as FanPelajaranDetail;
    if (!currentDetail.item) currentDetail.item = {};

    // Migrasi detail item jika ada item yang diubah namanya
    const norm = (arr: string[]) => (arr || []).map((s) => String(s).trim()).filter(Boolean);
    let adaMigrasi = false;

    Object.keys(newConfig).forEach((key) => {
      const lama = norm(prevConfig[key]);
      const baru = norm(newConfig[key]);
      const dihapus = lama.filter((x) => !baru.includes(x));
      if (dihapus.length === 0) return;

      const ditambah = baru.filter((x) => !lama.includes(x));
      const pasangan = new Map<string, string>();
      const dipakai = new Set<string>();

      if (lama.length === baru.length) {
        lama.forEach((x, i) => {
          if (dihapus.includes(x) && ditambah.includes(baru[i]) && !dipakai.has(baru[i])) {
            pasangan.set(x, baru[i]);
            dipakai.add(baru[i]);
          }
        });
      }

      dihapus.forEach((itemLama) => {
        const oldKey = `${key}||${itemLama}`;
        const itemBaru = pasangan.get(itemLama);
        if (itemBaru) {
          const newKey = `${key}||${itemBaru}`;
          if (currentDetail.item![oldKey] && !currentDetail.item![newKey]) {
            currentDetail.item![newKey] = currentDetail.item![oldKey];
          }
        }
        if (currentDetail.item![oldKey]) {
          delete currentDetail.item![oldKey];
          adaMigrasi = true;
        }
      });
    });

    set({ fanConfig: newConfig });
    try {
      localStorage.setItem(LS_FAN_CONFIG, JSON.stringify(newConfig));
    } catch {}

    try {
      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_FAN_CONFIG, value: newConfig }], { onConflict: 'key' });
      await logActivity('UPDATE FAN CONFIG', 'Memperbarui konfigurasi item mata pelajaran');

      if (adaMigrasi) {
        set({ fanDetail: currentDetail });
        try {
          localStorage.setItem(LS_FAN_DETAIL, JSON.stringify(currentDetail));
        } catch {}
        await supabase
          .from('app_settings')
          .upsert([{ key: KEY_DB_FAN_DETAIL, value: currentDetail }], { onConflict: 'key' });
      }

      return true;
    } catch (err: any) {
      console.error('Error saving fan config:', err.message);
      return false;
    }
  },

  triggerAutoSaveFanDetail: () => {
    const detail = get().fanDetail;
    try {
      localStorage.setItem(LS_FAN_DETAIL, JSON.stringify(detail));
    } catch {}

    set({ autoSaveStatus: 'saving' });
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    autoSaveTimer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('app_settings')
          .upsert([{ key: KEY_DB_FAN_DETAIL, value: detail }], { onConflict: 'key' });
        if (error) throw error;
        set({ autoSaveStatus: 'saved' });
        setTimeout(() => {
          if (get().autoSaveStatus === 'saved') set({ autoSaveStatus: 'idle' });
        }, 2500);
      } catch (err) {
        console.error('AutoSave Fan Detail error:', err);
        set({ autoSaveStatus: 'error' });
      }
    }, 500);
  },

  updateJamItem: (itemKey: string, jam: string) => {
    let cleanVal = parseInt(jam, 10);
    let strVal = '';
    if (!isNaN(cleanVal) && cleanVal >= 0) {
      if (cleanVal > 6) cleanVal = 6;
      strVal = String(cleanVal);
    }

    const detail = { ...get().fanDetail };
    if (!detail.item) detail.item = {};
    if (!detail.item[itemKey]) detail.item[itemKey] = {};
    detail.item[itemKey].jam = strVal;

    set({ fanDetail: detail });
    get().triggerAutoSaveFanDetail();
  },

  updatePengajarItem: (itemKey: string, pengajar: string) => {
    const detail = { ...get().fanDetail };
    if (!detail.item) detail.item = {};
    if (!detail.item[itemKey]) detail.item[itemKey] = {};
    detail.item[itemKey].pengajar = pengajar;

    set({ fanDetail: detail });
    get().triggerAutoSaveFanDetail();
  },

  updateAsatidzItem: async (itemKey: string, asatidzNames: string[], pengajarVal?: string) => {
    const detail = { ...get().fanDetail };
    if (!detail.item) detail.item = {};
    if (!detail.item[itemKey]) detail.item[itemKey] = {};

    detail.item[itemKey].asatidz = asatidzNames;
    if (pengajarVal !== undefined) {
      detail.item[itemKey].pengajar = pengajarVal;
    }

    set({ fanDetail: detail });
    get().triggerAutoSaveFanDetail();
    await logActivity('UPDATE PENGAJAR FAN ITEM', `Menetapkan pengajar untuk ${itemKey}`);
    return true;
  },

  updateKeteranganKelas: (kelasKey: string, keterangan: string) => {
    const detail = { ...get().fanDetail };
    if (!detail.kelas) detail.kelas = {};
    if (!detail.kelas[kelasKey]) detail.kelas[kelasKey] = {};
    detail.kelas[kelasKey].keterangan = keterangan;

    set({ fanDetail: detail });
    get().triggerAutoSaveFanDetail();
  },

  bulkClearJam: async () => {
    const detail = { ...get().fanDetail };
    if (!detail.item) detail.item = {};
    Object.keys(detail.item).forEach((key) => {
      if (detail.item![key].jam !== undefined) {
        delete detail.item![key].jam;
      }
    });

    set({ fanDetail: detail });
    try {
      localStorage.setItem(LS_FAN_DETAIL, JSON.stringify(detail));
      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_FAN_DETAIL, value: detail }], { onConflict: 'key' });
      await logActivity('HAPUS MASSAL JAM FAN', 'Mengosongkan seluruh jam pada Fan Pelajaran');
      return true;
    } catch (err: any) {
      console.error('Bulk clear jam error:', err.message);
      return false;
    }
  },

  bulkClearPengajar: async () => {
    const detail = { ...get().fanDetail };
    if (!detail.item) detail.item = {};
    Object.keys(detail.item).forEach((key) => {
      detail.item![key].pengajar = '';
      detail.item![key].asatidz = [];
    });

    set({ fanDetail: detail });
    try {
      localStorage.setItem(LS_FAN_DETAIL, JSON.stringify(detail));
      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_FAN_DETAIL, value: detail }], { onConflict: 'key' });
      await logActivity('HAPUS MASSAL PENGAJAR FAN', 'Mengosongkan seluruh pengajar pada Fan Pelajaran');
      return true;
    } catch (err: any) {
      console.error('Bulk clear pengajar error:', err.message);
      return false;
    }
  },

  saveMasterGrupAsal: async (newList: GrupAsalItem[]) => {
    const cleanList = JSON.parse(JSON.stringify(newList || []));
    set({
      masterGrupAsal: cleanList,
      grupAsalList: cleanList.map((g: any) => g.namaGrup),
    });
    try {
      localStorage.setItem(LS_GRUP_ASAL, JSON.stringify(cleanList));
      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_GRUP_ASAL, value: cleanList }], { onConflict: 'key' });
      await logActivity('UPDATE MASTER GRUP ASAL', 'Menyimpan konfigurasi master grup asal');
      return true;
    } catch (err: any) {
      console.error('Save master grup asal error:', err.message);
      return false;
    }
  },

  deleteGrupAsal: async (idx: number) => {
    const list = [...get().masterGrupAsal];
    list.splice(idx, 1);
    return get().saveMasterGrupAsal(list);
  },

  reorderGrupAsal: async (srcIdx: number, targetIdx: number) => {
    const list = [...get().masterGrupAsal];
    const [moved] = list.splice(srcIdx, 1);
    list.splice(targetIdx, 0, moved);
    return get().saveMasterGrupAsal(list);
  },

  applyBatchFanMS: async (
    tingkat: string,
    kls: string,
    selectedItems: string[],
    asatidzList: Asatidz[],
    formasiList: Formasi[],
    scope: 'reguler' | 'unggulan' | 'semua' = 'reguler',
    selectedBagUg?: string
  ) => {
    const tktUpper = String(tingkat || '').trim().toUpperCase();
    const klsStr = String(kls || '').trim();
    const keyReguler = `${klsStr} ${tktUpper}`;
    const cfg = get().fanConfig;
    const detail = { ...get().fanDetail };
    if (!detail.item) detail.item = {};

    const daftarBagUg = getDaftarBagUnggulanTingkatKls(tktUpper, klsStr, formasiList);

    // 1. Cakupan REGULER (Hanya terapkan ke key reguler, mengecualikan Mustahiq Unggulan)
    if (scope === 'reguler' || scope === 'semua') {
      const mustahiqReguler = getMustahiqByScope(
        { tingkat: tktUpper, dinKls: klsStr, scope: 'reguler' },
        asatidzList,
        formasiList
      );
      const itemsReguler = cfg[keyReguler] || [];

      itemsReguler.forEach((rawItem) => {
        const itemKeyReg = `${keyReguler}||${rawItem}`;
        if (!detail.item![itemKeyReg]) detail.item![itemKeyReg] = {};

        if (selectedItems.includes(rawItem)) {
          detail.item![itemKeyReg].pengajar = 'MS';
          // Pastikan hanya mustahiq reguler (bersihkan mustahiq unggulan)
          detail.item![itemKeyReg].asatidz = [...mustahiqReguler];
        } else if (detail.item![itemKeyReg].pengajar === 'MS') {
          detail.item![itemKeyReg].pengajar = '';
          detail.item![itemKeyReg].asatidz = [];
        }
      });
    }

    // 2. Cakupan UNGGULAN (Hanya terapkan ke key Unggulan, tanpa mengotori key Reguler)
    if (scope === 'unggulan' || scope === 'semua') {
      const targetBags =
        selectedBagUg && selectedBagUg !== 'ALL'
          ? [selectedBagUg.toUpperCase()]
          : daftarBagUg;

      targetBags.forEach((bag) => {
        const namaKelas = `${klsStr} ${bag} ${tktUpper}`;
        const keyUg = `${namaKelas} (Ug)`;
        const itemsUg = cfg[keyUg] || cfg[keyReguler] || [];

        const mustahiqBag = getMustahiqByScope(
          { tingkat: tktUpper, dinKls: klsStr, scope: 'unggulan', selectedBag: bag },
          asatidzList,
          formasiList
        );

        itemsUg.forEach((rawItem) => {
          const itemKeyUg = `${keyUg}||${rawItem}`;
          if (!detail.item![itemKeyUg]) detail.item![itemKeyUg] = {};

          if (selectedItems.includes(rawItem)) {
            detail.item![itemKeyUg].pengajar = 'MS';
            detail.item![itemKeyUg].asatidz = [...mustahiqBag];
          } else if (detail.item![itemKeyUg].pengajar === 'MS') {
            detail.item![itemKeyUg].pengajar = '';
            detail.item![itemKeyUg].asatidz = [];
          }
        });
      });
    }

    set({ fanDetail: detail });
    try {
      localStorage.setItem(LS_FAN_DETAIL, JSON.stringify(detail));
      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_FAN_DETAIL, value: detail }], { onConflict: 'key' });
      await logActivity(
        'BATCH SETUP FAN MS',
        `Menetapkan ${selectedItems.length} Fan MS untuk kelas ${klsStr} ${tktUpper} (Scope: ${scope})`
      );
      return true;
    } catch (err: any) {
      console.error('Batch setup fan MS error:', err.message);
      return false;
    }
  },

  bersihkanMustahiqUnggulanDariReguler: async (
    asatidzList: Asatidz[],
    formasiList: Formasi[]
  ) => {
    const detail = { ...get().fanDetail };
    if (!detail.item) detail.item = {};

    let cleanedCount = 0;
    const affectedTeachers = new Set<string>();

    Object.keys(detail.item).forEach((itemKey) => {
      const idx = itemKey.indexOf('||');
      if (idx < 0) return;
      const kelasKey = itemKey.substring(0, idx).trim();
      // Hanya periksa key reguler (bukan yang berakhir dengan (Ug))
      if (/\(Ug\)\s*$/i.test(kelasKey)) return;

      const parts = kelasKey.split(/\s+/);
      const klsStr = parts[0];
      const tktUpper = parts[parts.length - 1]?.toUpperCase();

      const mustahiqUg = getMustahiqByScope(
        { tingkat: tktUpper, dinKls: klsStr, scope: 'unggulan' },
        asatidzList,
        formasiList
      );
      if (mustahiqUg.length === 0) return;

      const itemDet = detail.item![itemKey];
      const currentList = Array.isArray(itemDet.asatidz) ? itemDet.asatidz : [];

      const filteredList = currentList.filter((g) => {
        const isUg = mustahiqUg.some(
          (u) => u.trim().toUpperCase() === String(g).trim().toUpperCase()
        );
        if (isUg) {
          affectedTeachers.add(String(g).trim());
        }
        return !isUg;
      });

      if (filteredList.length !== currentList.length) {
        detail.item![itemKey].asatidz = filteredList;
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      set({ fanDetail: detail });
      try {
        localStorage.setItem(LS_FAN_DETAIL, JSON.stringify(detail));
        await supabase
          .from('app_settings')
          .upsert([{ key: KEY_DB_FAN_DETAIL, value: detail }], { onConflict: 'key' });
        await logActivity(
          'CLEANUP MUSTAHIQ UNGGULAN DARI REGULER',
          `Membersihkan ${cleanedCount} item fan reguler dari mustahiq unggulan: ${Array.from(affectedTeachers).join(', ')}`
        );
      } catch (err: any) {
        console.error('Error saat cleanup mustahiq unggulan dari reguler:', err);
      }
    }

    return { cleanedCount, affectedTeachers: Array.from(affectedTeachers) };
  },
}));
