/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import {
  LIST_HARI,
  HariKbm,
  TeacherJadwalRow,
  ClipboardKGState,
  ContextKGState,
  KelasKbmItem,
} from '@/types/jadwal';
import {
  HARI_KEYS_LOWER,
  deteksiHariIniKBM,
  normalisasiNamaKelas,
  removeSlotFromGuruObj,
  addSlotToGuruObj,
  syncGuruMengajarAndTotalObj,
} from '@/lib/utils/jadwalHelper';
import { Asatidz } from '@/types/asatidz';

export const KEY_DB_JADWAL_ASATIDZ = 'JADWAL_MENGAJAR_ASATIDZ';
export const LS_JADWAL_ASATIDZ = 'MADIN_JADWAL_MENGAJAR_ASATIDZ';
export { LIST_HARI };
export type { HariKbm };

interface JadwalState {
  jadwalMap: Record<string, TeacherJadwalRow>;
  isLoading: boolean;
  activeHari: HariKbm;
  switchModeKbm: 'semua' | 'reguler' | 'unggulan';
  viewModeHariKbm: 'table' | 'card';

  // Mode Pindah (Cut & Paste) & Context Menu KG
  stateClipboardKG: ClipboardKGState | null;
  stateContextKG: ContextKGState | null;
  isContextMenuOpen: boolean;
  contextMenuPos: { x: number; y: number };

  // Modals state
  isModalDetailKelasOpen: boolean;
  selectedDetailKelasKey: string | null;
  isModalInputJadwalOpen: boolean;
  selectedInputKelasKey: string | null;
  selectedInputJamFokus: 1 | 2;
  isModalAksiKGOpen: boolean;

  // Actions
  fetchJadwal: (forceRefresh?: boolean) => Promise<void>;
  setActiveHari: (hari: HariKbm) => void;
  setSwitchModeKbm: (mode: 'semua' | 'reguler' | 'unggulan') => void;
  setViewModeHariKbm: (mode: 'table' | 'card') => void;

  // Modal toggles
  openModalDetailKelas: (kelasKey: string) => void;
  closeModalDetailKelas: () => void;
  openModalInputJadwal: (kelasKey: string, jamFokus?: 1 | 2) => void;
  closeModalInputJadwal: () => void;
  openModalAksiKG: (state: ContextKGState) => void;
  closeModalAksiKG: () => void;

  // Context Menu & Mode Pindah (Cut & Paste)
  openContextMenuKG: (state: ContextKGState, pos: { x: number; y: number }) => void;
  closeContextMenuKG: () => void;
  mulaiModePindahKG: () => void;
  batalkanModePindahKG: () => void;

  // Core Data Mutations
  simpanBatchJadwalAsatidz: (
    mapPerubahan: Record<string, TeacherJadwalRow>,
    logDesc?: string
  ) => Promise<boolean>;

  simpanJadwalDariKelas: (
    kelasKey: string,
    k: KelasKbmItem,
    jam1Entries: Record<string, { asatidz: string; fan: string }>,
    jam2Entries: Record<string, { asatidz: string; fan: string }>,
    asatidzList: Asatidz[]
  ) => Promise<boolean>;

  hapusJadwalJamKelas: (
    kelasKey: string,
    k: KelasKbmItem,
    targetJam: 1 | 2,
    asatidzList: Asatidz[]
  ) => Promise<boolean>;

  eksekusiTempelKG: (
    mode: 'langsung_pindah' | 'tukar' | 'timpa',
    targetHari: string,
    targetJam: number,
    targetKelasKey: string,
    targetClassObj: KelasKbmItem,
    targetGuru: string,
    targetFan: string,
    asatidzList: Asatidz[]
  ) => Promise<boolean>;

  // Legacy single-slot helper for backward compat
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
  activeHari: deteksiHariIniKBM(),
  switchModeKbm: 'semua',
  viewModeHariKbm: 'table',

  stateClipboardKG: null,
  stateContextKG: null,
  isContextMenuOpen: false,
  contextMenuPos: { x: 0, y: 0 },

  isModalDetailKelasOpen: false,
  selectedDetailKelasKey: null,
  isModalInputJadwalOpen: false,
  selectedInputKelasKey: null,
  selectedInputJamFokus: 1,
  isModalAksiKGOpen: false,

  fetchJadwal: async (forceRefresh = false) => {
    // 1. Fallback instan dari localStorage
    if (!forceRefresh) {
      try {
        const rawLs = typeof window !== 'undefined' ? localStorage.getItem(LS_JADWAL_ASATIDZ) : null;
        if (rawLs) {
          const parsed = JSON.parse(rawLs);
          if (parsed && typeof parsed === 'object') {
            set({ jadwalMap: parsed });
          }
        }
      } catch {}
    }

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
          try {
            val = JSON.parse(val);
          } catch {}
        }
        if (val && typeof val === 'object') {
          set({ jadwalMap: val });
          try {
            localStorage.setItem(LS_JADWAL_ASATIDZ, JSON.stringify(val));
          } catch {}
        }
      }
    } catch (err: any) {
      console.warn('Fetch jadwal error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveHari: (hari) => set({ activeHari: hari }),
  setSwitchModeKbm: (mode) => set({ switchModeKbm: mode }),
  setViewModeHariKbm: (mode) => set({ viewModeHariKbm: mode }),

  openModalDetailKelas: (kelasKey) =>
    set({ isModalDetailKelasOpen: true, selectedDetailKelasKey: kelasKey }),
  closeModalDetailKelas: () =>
    set({ isModalDetailKelasOpen: false, selectedDetailKelasKey: null }),

  openModalInputJadwal: (kelasKey, jamFokus = 1) =>
    set({
      isModalInputJadwalOpen: true,
      selectedInputKelasKey: kelasKey,
      selectedInputJamFokus: jamFokus,
    }),
  closeModalInputJadwal: () =>
    set({
      isModalInputJadwalOpen: false,
      selectedInputKelasKey: null,
    }),

  openModalAksiKG: (state) =>
    set({ isModalAksiKGOpen: true, stateContextKG: state, isContextMenuOpen: false }),
  closeModalAksiKG: () =>
    set({ isModalAksiKGOpen: false }),

  openContextMenuKG: (state, pos) =>
    set({ stateContextKG: state, contextMenuPos: pos, isContextMenuOpen: true }),
  closeContextMenuKG: () =>
    set({ isContextMenuOpen: false }),

  mulaiModePindahKG: () => {
    const cur = get().stateContextKG;
    if (!cur || !cur.guru) return;
    set({
      stateClipboardKG: { ...cur },
      isContextMenuOpen: false,
    });
  },

  batalkanModePindahKG: () => {
    set({ stateClipboardKG: null, isContextMenuOpen: false });
  },

  simpanBatchJadwalAsatidz: async (mapPerubahan, logDesc = '') => {
    const currentMap = { ...get().jadwalMap };

    Object.keys(mapPerubahan).forEach((k) => {
      const keyUpper = String(k || '').trim().toUpperCase();
      if (!keyUpper) return;
      currentMap[keyUpper] = {
        ...currentMap[keyUpper],
        ...mapPerubahan[k],
        nama_asatidz: mapPerubahan[k].nama_asatidz || keyUpper,
      };
    });

    set({ jadwalMap: currentMap });
    try {
      localStorage.setItem(LS_JADWAL_ASATIDZ, JSON.stringify(currentMap));
    } catch {}

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_JADWAL_ASATIDZ, value: currentMap }], { onConflict: 'key' });
      if (error) throw error;

      if (logDesc) {
        await logActivity('UPDATE JADWAL KBM', logDesc);
      }
      return true;
    } catch (err: any) {
      console.error('Simpan batch jadwal error:', err.message);
      return false;
    }
  },

  simpanJadwalDariKelas: async (kelasKey, k, jam1Entries, jam2Entries, asatidzList) => {
    const currentMap = get().jadwalMap;
    const genderTag = k.papi ? `(${k.papi})` : '';
    const namaKelasLengkap = `${k.kls} ${k.bag} ${k.tingkat} ${genderTag}`.trim();
    const klsTanpaGender = `${k.kls} ${k.bag} ${k.tingkat}`.trim();
    const klsNormUtama = normalisasiNamaKelas(namaKelasLengkap);
    const klsNormTanpaGen = normalisasiNamaKelas(klsTanpaGender);

    const mapPerubahan: Record<string, TeacherJadwalRow> = {};

    const ambilJdwMutasi = (namaGuru: string): TeacherJadwalRow => {
      const gUpper = namaGuru.trim().toUpperCase();
      if (!mapPerubahan[gUpper]) {
        const existing = currentMap[gUpper];
        mapPerubahan[gUpper] = {
          nama_asatidz: existing?.nama_asatidz || namaGuru.trim(),
          mengajar: existing?.mengajar || '',
          sabtu: existing?.sabtu || '',
          ahad: existing?.ahad || '',
          senin: existing?.senin || '',
          selasa: existing?.selasa || '',
          rabu: existing?.rabu || '',
          kamis: existing?.kamis || '',
          totalJam: existing?.totalJam || 0,
        };
      }
      return mapPerubahan[gUpper];
    };

    // 1. Kumpulkan seluruh guru yang sebelumnya mengajar di kelas ini untuk jam 1 dan jam 2
    const guruLamaSet = new Set<string>();
    LIST_HARI.forEach((hari) => {
      [1, 2].forEach((j) => {
        const sesiList = k.jadwal[hari]?.[j as 1 | 2] || [];
        sesiList.forEach((s) => {
          if (s.guru && s.guru !== '-') guruLamaSet.add(s.guru);
        });
      });
    });

    // Hapus seluruh slot kelas ini dari guru lama
    guruLamaSet.forEach((namaGuru) => {
      const obj = ambilJdwMutasi(namaGuru);
      LIST_HARI.forEach((hari) => {
        [1, 2].forEach((jamNum) => {
          removeSlotFromGuruObj(obj, hari, jamNum, klsNormUtama);
          if (klsNormTanpaGen) {
            removeSlotFromGuruObj(obj, hari, jamNum, klsNormTanpaGen);
          }
        });
      });
    });

    // 2. Terapkan input baru Jam 1 dan Jam 2
    const lokasiRuang = k.lokal && k.lokal !== '-' ? k.lokal : '';
    const formatLokasiGabungan = lokasiRuang
      ? `${namaKelasLengkap} (${lokasiRuang})`
      : namaKelasLengkap;

    [1, 2].forEach((jamNum) => {
      const entries = jamNum === 1 ? jam1Entries : jam2Entries;
      LIST_HARI.forEach((hari) => {
        const data = entries[hari];
        const rawGuru = (data?.asatidz || '').trim();
        const cleanGuru = rawGuru.replace(/^\[TERPAKAI di [^\]]+\]\s*/i, '').trim();
        const fan = (data?.fan || '').trim();

        if (cleanGuru && fan) {
          const objGuru = ambilJdwMutasi(cleanGuru);
          addSlotToGuruObj(objGuru, hari, jamNum, fan, formatLokasiGabungan);
        }
      });
    });

    // 3. Sinkronkan total jam dan kelas mengajar untuk seluruh guru yang terpengaruh
    Object.keys(mapPerubahan).forEach((gUpper) => {
      syncGuruMengajarAndTotalObj(mapPerubahan[gUpper], asatidzList);
    });

    const success = await get().simpanBatchJadwalAsatidz(
      mapPerubahan,
      `Memperbarui Jadwal Jam 1 & 2 Kelas ${namaKelasLengkap}`
    );

    if (success) {
      get().closeModalInputJadwal();
    }
    return success;
  },

  hapusJadwalJamKelas: async (kelasKey, k, targetJam, asatidzList) => {
    const currentMap = get().jadwalMap;
    const genderTag = k.papi ? `(${k.papi})` : '';
    const namaKelasLengkap = `${k.kls} ${k.bag} ${k.tingkat} ${genderTag}`.trim();
    const klsTanpaGender = `${k.kls} ${k.bag} ${k.tingkat}`.trim();
    const klsNormUtama = normalisasiNamaKelas(namaKelasLengkap);
    const klsNormTanpaGen = normalisasiNamaKelas(klsTanpaGender);

    const asatidzAffected = new Set<string>();
    LIST_HARI.forEach((hari) => {
      const sesiList = k.jadwal[hari]?.[targetJam] || [];
      sesiList.forEach((s) => {
        if (s.guru && s.guru !== '-') asatidzAffected.add(s.guru);
      });
    });

    if (asatidzAffected.size === 0) return true;

    const mapPerubahan: Record<string, TeacherJadwalRow> = {};

    asatidzAffected.forEach((namaGuru) => {
      const gUpper = namaGuru.trim().toUpperCase();
      const existing = currentMap[gUpper];
      const mutasi: TeacherJadwalRow = {
        nama_asatidz: existing?.nama_asatidz || namaGuru.trim(),
        mengajar: existing?.mengajar || '',
        sabtu: existing?.sabtu || '',
        ahad: existing?.ahad || '',
        senin: existing?.senin || '',
        selasa: existing?.selasa || '',
        rabu: existing?.rabu || '',
        kamis: existing?.kamis || '',
        totalJam: existing?.totalJam || 0,
      };

      LIST_HARI.forEach((hari) => {
        removeSlotFromGuruObj(mutasi, hari, targetJam, klsNormUtama);
        if (klsNormTanpaGen) {
          removeSlotFromGuruObj(mutasi, hari, targetJam, klsNormTanpaGen);
        }
      });

      syncGuruMengajarAndTotalObj(mutasi, asatidzList);
      mapPerubahan[gUpper] = mutasi;
    });

    return get().simpanBatchJadwalAsatidz(
      mapPerubahan,
      `Mengosongkan Jadwal Jam ${targetJam} Kelas ${namaKelasLengkap}`
    );
  },

  eksekusiTempelKG: async (
    mode,
    targetHari,
    targetJam,
    targetKelasKey,
    targetClassObj,
    targetGuru,
    targetFan,
    asatidzList
  ) => {
    const src = get().stateClipboardKG;
    if (!src || !src.guru) return false;

    const currentMap = get().jadwalMap;
    const mapPerubahan: Record<string, TeacherJadwalRow> = {};

    const ambilMutasi = (namaGuru: string): TeacherJadwalRow => {
      const gUpper = namaGuru.trim().toUpperCase();
      if (!mapPerubahan[gUpper]) {
        const existing = currentMap[gUpper];
        mapPerubahan[gUpper] = {
          nama_asatidz: existing?.nama_asatidz || namaGuru.trim(),
          mengajar: existing?.mengajar || '',
          sabtu: existing?.sabtu || '',
          ahad: existing?.ahad || '',
          senin: existing?.senin || '',
          selasa: existing?.selasa || '',
          rabu: existing?.rabu || '',
          kamis: existing?.kamis || '',
          totalJam: existing?.totalJam || 0,
        };
      }
      return mapPerubahan[gUpper];
    };

    const srcK = src.classObj;
    const srcGenderTag = srcK.papi ? `(${srcK.papi})` : '';
    const srcKlsFull = `${srcK.kls} ${srcK.bag} ${srcK.tingkat} ${srcGenderTag}`.trim();
    const srcKlsTanpaGen = `${srcK.kls} ${srcK.bag} ${srcK.tingkat}`.trim();
    const srcNormUtama = normalisasiNamaKelas(srcKlsFull);
    const srcNormTanpaGen = normalisasiNamaKelas(srcKlsTanpaGen);
    const srcLokasi = srcK.lokal && srcK.lokal !== '-' ? srcK.lokal : '';
    const srcFormatLokasi = srcLokasi ? `${srcKlsFull} (${srcLokasi})` : srcKlsFull;

    const tgtK = targetClassObj;
    const tgtGenderTag = tgtK.papi ? `(${tgtK.papi})` : '';
    const tgtKlsFull = `${tgtK.kls} ${tgtK.bag} ${tgtK.tingkat} ${tgtGenderTag}`.trim();
    const tgtKlsTanpaGen = `${tgtK.kls} ${tgtK.bag} ${tgtK.tingkat}`.trim();
    const tgtNormUtama = normalisasiNamaKelas(tgtKlsFull);
    const tgtNormTanpaGen = normalisasiNamaKelas(tgtKlsTanpaGen);
    const tgtLokasi = tgtK.lokal && tgtK.lokal !== '-' ? tgtK.lokal : '';
    const tgtFormatLokasi = tgtLokasi ? `${tgtKlsFull} (${tgtLokasi})` : tgtKlsFull;

    // 1. Hapus slot sumber dari guru sumber
    const srcGuruObj = ambilMutasi(src.guru);
    removeSlotFromGuruObj(srcGuruObj, src.hari, src.jam, srcNormUtama);
    if (srcNormTanpaGen) removeSlotFromGuruObj(srcGuruObj, src.hari, src.jam, srcNormTanpaGen);

    if (mode === 'tukar' && targetGuru) {
      // Tukar: Guru target pindah ke slot sumber, guru sumber pindah ke slot target
      const tgtGuruObj = ambilMutasi(targetGuru);
      removeSlotFromGuruObj(tgtGuruObj, targetHari, targetJam, tgtNormUtama);
      if (tgtNormTanpaGen) removeSlotFromGuruObj(tgtGuruObj, targetHari, targetJam, tgtNormTanpaGen);

      addSlotToGuruObj(srcGuruObj, targetHari, targetJam, src.fan, tgtFormatLokasi);
      addSlotToGuruObj(tgtGuruObj, src.hari, src.jam, targetFan || '-', srcFormatLokasi);
    } else {
      // Langsung pindah atau timpa: Hapus slot target lama jika ada guru target
      if (targetGuru) {
        const tgtGuruObj = ambilMutasi(targetGuru);
        removeSlotFromGuruObj(tgtGuruObj, targetHari, targetJam, tgtNormUtama);
        if (tgtNormTanpaGen) removeSlotFromGuruObj(tgtGuruObj, targetHari, targetJam, tgtNormTanpaGen);
      }
      addSlotToGuruObj(srcGuruObj, targetHari, targetJam, src.fan, tgtFormatLokasi);
    }

    Object.keys(mapPerubahan).forEach((gUpper) => {
      syncGuruMengajarAndTotalObj(mapPerubahan[gUpper], asatidzList);
    });

    const success = await get().simpanBatchJadwalAsatidz(
      mapPerubahan,
      `Pindah Jadwal: ${src.guru} ke ${tgtKlsFull} ${targetHari} Jam ${targetJam}`
    );

    if (success) {
      get().batalkanModePindahKG();
    }
    return success;
  },

  // Legacy single-slot helper for backward compat
  updateJadwalSlot: async (hari, jam, kelas, fan, asatidz) => {
    const map = { ...get().jadwalMap };
    const dayIdx = LIST_HARI.findIndex((h) => h.toLowerCase() === hari.toLowerCase());
    if (dayIdx === -1) return false;
    const hKey = HARI_KEYS_LOWER[dayIdx];

    // Remove old slot in this class from all teachers
    Object.keys(map).forEach((k) => {
      const row = { ...map[k] };
      const dayStr = row[hKey] || '';
      if (dayStr) {
        removeSlotFromGuruObj(row, hari, jam, normalisasiNamaKelas(kelas));
        map[k] = row;
      }
    });

    if (asatidz) {
      const gUpper = asatidz.trim().toUpperCase();
      const row = map[gUpper] || {
        nama_asatidz: asatidz.trim(),
      };
      addSlotToGuruObj(row, hari, jam, fan, kelas);
      syncGuruMengajarAndTotalObj(row);
      map[gUpper] = row;
    }

    set({ jadwalMap: map });
    try {
      await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_JADWAL_ASATIDZ, value: map }], { onConflict: 'key' });
      return true;
    } catch {
      return false;
    }
  },

  deleteJadwalSlot: async (hari, jam, kelas) => {
    return get().updateJadwalSlot(hari, jam, kelas, '', '');
  },
}));
