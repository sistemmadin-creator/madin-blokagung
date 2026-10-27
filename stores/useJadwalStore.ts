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
  ModeTempelKG,
  ActionTypeModalKG,
  SyncPlanFanKBM,
} from '@/types/jadwal';
import {
  HARI_KEYS_LOWER,
  deteksiHariIniKBM,
  normalisasiNamaKelas,
  namaKelasLengkapDariObj,
  parseInfoKelasNorm,
  buatPetaGenderGuru,
  isInfoKelasCocok,
  removeSlotFromGuruObj,
  addSlotToGuruObj,
  syncGuruMengajarAndTotalObj,
  getJadwalGuruFromMap,
  buildMasterStrukturKelasKBM,
  ambilNamaFanSingkat,
  parseJadwalCell_Client,
  dapatkanKelasKeyFanDariObj,
  cariRawItemFanPadaKelasKey,
  cekFanMSuntukKelas,
  dapatkanBatasJamFan,
  cekBentrokFisikHariJamKBM,
  hitungLabelPengajarDariListAsatidz,
} from '@/lib/utils/jadwalHelper';
import { parseFanItemString } from '@/lib/utils/fanHelper';
import { Asatidz } from '@/types/asatidz';
import { Formasi } from '@/types/formasi';
import { FanConfigMap } from '@/types/fan';
import { useFanStore } from '@/stores/useFanStore';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';

export const KEY_DB_JADWAL_ASATIDZ = 'JADWAL_MENGAJAR_ASATIDZ';
export const LS_JADWAL_ASATIDZ = 'MADIN_JADWAL_MENGAJAR_ASATIDZ';
export { LIST_HARI };
export type { HariKbm };

interface JadwalState {
  jadwalMap: Record<string, TeacherJadwalRow>;
  masterStrukturKelasKBM: KelasKbmItem[];
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
  actionTypeModalKG: ActionTypeModalKG | null;

  // Actions
  fetchJadwal: (forceRefresh?: boolean) => Promise<void>;
  rebuildMasterStrukturKelas: (
    formasiList: Formasi[],
    asatidzList: Asatidz[],
    fanConfig?: FanConfigMap
  ) => KelasKbmItem[];
  setActiveHari: (hari: HariKbm) => void;
  setSwitchModeKbm: (mode: 'semua' | 'reguler' | 'unggulan') => void;
  setViewModeHariKbm: (mode: 'table' | 'card') => void;

  // Modal toggles
  openModalDetailKelas: (kelasKey: string) => void;
  closeModalDetailKelas: () => void;
  openModalInputJadwal: (kelasKey: string, jamFokus?: 1 | 2) => void;
  closeModalInputJadwal: () => void;
  openModalAksiKG: (actionTypeOrState: ActionTypeModalKG | ContextKGState) => void;
  closeModalAksiKG: () => void;

  // Context Menu & Mode Pindah (Cut & Paste)
  openContextMenuKG: (state: ContextKGState, pos: { x: number; y: number }) => void;
  closeContextMenuKG: () => void;
  mulaiModePindahKG: () => void;
  batalkanModePindahKG: () => void;

  // Core Data Mutations
  simpanBatchJadwalAsatidz: (
    mapPerubahan: Record<string, TeacherJadwalRow>,
    logDesc?: string,
    skipHistory?: boolean
  ) => Promise<boolean>;

  simpanJadwalDariKelas: (
    kelasKey: string,
    k: KelasKbmItem,
    jam1Entries: Record<string, { asatidz: string; fan: string }>,
    jam2Entries: Record<string, { asatidz: string; fan: string }>,
    asatidzList: Asatidz[],
    formasiList?: Formasi[]
  ) => Promise<boolean>;

  hapusJadwalJamKelas: (
    kelasKey: string,
    k: KelasKbmItem,
    targetJam: 1 | 2,
    asatidzList: Asatidz[]
  ) => Promise<boolean>;

  analisisSinkronisasiTempelKG: (
    mode: ModeTempelKG,
    targetHari: string,
    targetJam: number,
    targetKelasKey: string,
    targetClassObj: KelasKbmItem,
    targetGuru: string,
    targetFan: string,
    asatidzList: Asatidz[],
    formasiList?: Formasi[]
  ) => {
    ok: boolean;
    errorMsg?: string;
    syncPlan?: SyncPlanFanKBM;
    srcAfter?: { guru: string; fan: string };
    tgtAfter?: { guru: string; fan: string };
  };

  eksekusiTempelKG: (
    mode: ModeTempelKG,
    targetHari: string,
    targetJam: number,
    targetKelasKey: string,
    targetClassObj: KelasKbmItem,
    targetGuru: string,
    targetFan: string,
    asatidzList: Asatidz[],
    formasiList?: Formasi[],
    pilihanMSMap?: Record<string, 'use_ms' | 'keep_guru'>
  ) => Promise<{ ok: boolean; errorMsg?: string }>;

  eksekusiAksiKlikKananKG: (
    payload: {
      actionType: ActionTypeModalKG;
      targetKelasKey?: string;
      targetHari?: string;
      targetJam?: 1 | 2;
      guruBaru?: string;
      fanBaru?: string;
    },
    asatidzList: Asatidz[],
    formasiList?: Formasi[]
  ) => Promise<{ ok: boolean; errorMsg?: string }>;

  // Legacy single-slot helper for backward compat
  updateJadwalSlot: (
    hari: HariKbm,
    jam: 1 | 2 | 3 | 4,
    kelas: string,
    fan: string,
    asatidz: string
  ) => Promise<boolean>;
  deleteJadwalSlot: (hari: HariKbm, jam: 1 | 2 | 3 | 4, kelas: string) => Promise<boolean>;
  handleRealtimeJadwal: (newValue: any) => void;
}

export const useJadwalStore = create<JadwalState>((set, get) => ({
  jadwalMap: {},
  masterStrukturKelasKBM: [],
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
  actionTypeModalKG: null,

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

  rebuildMasterStrukturKelas: (formasiList, asatidzList, fanConfig) => {
    const cfg = fanConfig || useFanStore.getState().fanConfig;
    const list = buildMasterStrukturKelasKBM(formasiList, asatidzList, get().jadwalMap, cfg);
    set({ masterStrukturKelasKBM: list });
    return list;
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

  openModalAksiKG: (actionTypeOrState) => {
    if (typeof actionTypeOrState === 'string') {
      const cur = get().stateContextKG;
      if (!cur) return;
      set({
        isModalAksiKGOpen: true,
        actionTypeModalKG: actionTypeOrState,
        stateContextKG: { ...cur, actionType: actionTypeOrState },
        isContextMenuOpen: false,
      });
    } else {
      set({
        isModalAksiKGOpen: true,
        actionTypeModalKG: actionTypeOrState.actionType || 'asatidz',
        stateContextKG: actionTypeOrState,
        isContextMenuOpen: false,
      });
    }
  },
  closeModalAksiKG: () =>
    set({ isModalAksiKGOpen: false, actionTypeModalKG: null }),

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

  simpanBatchJadwalAsatidz: async (mapPerubahan, logDesc = '', skipHistory = false) => {
    const currentMap = { ...get().jadwalMap };

    // Simpan snapshot sebelum dan sesudah untuk undo & redo
    const prevTeachers: Record<string, TeacherJadwalRow> = {};
    const nextTeachers: Record<string, TeacherJadwalRow> = {};

    Object.keys(mapPerubahan).forEach((k) => {
      const keyUpper = String(k || '').trim().toUpperCase();
      if (!keyUpper) return;

      if (currentMap[keyUpper]) {
        prevTeachers[keyUpper] = JSON.parse(JSON.stringify(currentMap[keyUpper]));
      } else {
        prevTeachers[keyUpper] = { nama_asatidz: keyUpper } as TeacherJadwalRow;
      }

      nextTeachers[keyUpper] = JSON.parse(
        JSON.stringify({
          ...currentMap[keyUpper],
          ...mapPerubahan[k],
          nama_asatidz: mapPerubahan[k].nama_asatidz || keyUpper,
        })
      );

      currentMap[keyUpper] = nextTeachers[keyUpper];
    });

    set({ jadwalMap: currentMap });
    try {
      localStorage.setItem(LS_JADWAL_ASATIDZ, JSON.stringify(currentMap));
    } catch {}

    try {
      // Ambil data server terbaru bila tersedia untuk menjaga agar guru lain yang diedit concurrent user tidak tertimpa
      let finalMapToSave = currentMap;
      try {
        const { data: dbData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', KEY_DB_JADWAL_ASATIDZ)
          .maybeSingle();
        if (dbData?.value) {
          const parsed = typeof dbData.value === 'string' ? JSON.parse(dbData.value) : dbData.value;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            finalMapToSave = { ...parsed };
            Object.keys(mapPerubahan).forEach((k) => {
              const keyUpper = String(k || '').trim().toUpperCase();
              if (keyUpper && nextTeachers[keyUpper]) {
                finalMapToSave[keyUpper] = nextTeachers[keyUpper];
              }
            });
          }
        }
      } catch {}

      const { error } = await supabase
        .from('app_settings')
        .upsert([{ key: KEY_DB_JADWAL_ASATIDZ, value: finalMapToSave }], { onConflict: 'key' });
      if (error) throw error;

      if (logDesc) {
        await logActivity('UPDATE JADWAL KBM', logDesc);
      }

      // Rekam aksi ke useUndoRedoStore jika bukan panggilan dari Undo/Redo
      if (!skipHistory && Object.keys(prevTeachers).length > 0) {
        useUndoRedoStore.getState().recordAction({
          module: 'jadwal',
          title: logDesc || 'Perubahan Jadwal KBM',
          undo: async () => {
            // Cek apakah ada jadwal guru yang disentuh ternyata sudah dimodifikasi orang lain di server
            try {
              const { data: dbData } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', KEY_DB_JADWAL_ASATIDZ)
                .maybeSingle();

              if (dbData?.value) {
                const parsed = typeof dbData.value === 'string' ? JSON.parse(dbData.value) : dbData.value;
                if (parsed && typeof parsed === 'object') {
                  const conflictingGuru = Object.keys(nextTeachers).filter((g) => {
                    const serverRow = parsed[g];
                    const myRow = nextTeachers[g];
                    if (!serverRow || !myRow) return false;
                    return ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'].some(
                      (h) => (serverRow[h] || '') !== (myRow[h] || '')
                    );
                  });

                  if (conflictingGuru.length > 0) {
                    const proceed = await useUndoRedoStore.getState().requestConflictResolution({
                      title: 'Peringatan Konflik Jadwal KBM',
                      entityName: `Guru: ${conflictingGuru.slice(0, 3).join(', ')}${conflictingGuru.length > 3 ? '...' : ''}`,
                      message: `Jadwal mengajar untuk ${conflictingGuru.length} guru telah dimodifikasi oleh admin lain di server sejak aksi Anda disimpan.`,
                      currentServerState: `${conflictingGuru.length} guru memiliki jadwal baru di server`,
                      proposedUndoState: `Kembalikan slot mengajar ${conflictingGuru.length} guru ke waktu sebelum aksi Anda`,
                    });

                    if (!proceed) return false;
                  }
                }
              }
            } catch {}

            const res = await get().simpanBatchJadwalAsatidz(prevTeachers, `[UNDO] ${logDesc}`, true);
            const formasi = useFormasiStore.getState().formasiList;
            const asatidz = useAsatidzStore.getState().asatidzList;
            if (formasi && formasi.length > 0) {
              get().rebuildMasterStrukturKelas(formasi, asatidz);
            }
            return res;
          },
          redo: async () => {
            const res = await get().simpanBatchJadwalAsatidz(nextTeachers, `[REDO] ${logDesc}`, true);
            const formasi = useFormasiStore.getState().formasiList;
            const asatidz = useAsatidzStore.getState().asatidzList;
            if (formasi && formasi.length > 0) {
              get().rebuildMasterStrukturKelas(formasi, asatidz);
            }
            return res;
          },
        });
      }

      return true;
    } catch (err: any) {
      console.error('Simpan batch jadwal error:', err.message);
      return false;
    }
  },

  simpanJadwalDariKelas: async (kelasKey, k, jam1Entries, jam2Entries, asatidzList, formasiList) => {
    const currentMap = get().jadwalMap;
    const namaKelasLengkap = namaKelasLengkapDariObj(k);
    const targetInfo = parseInfoKelasNorm(namaKelasLengkap);
    const genderGuruMap = buatPetaGenderGuru(asatidzList);

    const mapPerubahan: Record<string, TeacherJadwalRow> = {};

    const ambilJdwMutasi = (namaGuru: string): TeacherJadwalRow => {
      const gUpper = namaGuru.trim().toUpperCase();
      if (!mapPerubahan[gUpper]) {
        const existing = getJadwalGuruFromMap(namaGuru, currentMap);
        mapPerubahan[gUpper] = {
          nama_asatidz: existing.nama_asatidz || namaGuru.trim(),
          mengajar: existing.mengajar || '',
          sabtu: existing.sabtu || '',
          ahad: existing.ahad || '',
          senin: existing.senin || '',
          selasa: existing.selasa || '',
          rabu: existing.rabu || '',
          kamis: existing.kamis || '',
          totalJam: existing.totalJam || 0,
        };
      }
      return mapPerubahan[gUpper];
    };

    // 1. Kumpulkan seluruh guru yang sebelumnya mengajar di kelas ini untuk jam 1 dan jam 2
    //    (peka gender: guru kelas "1 A ULA (PA)" tidak ikut terjaring saat menyimpan "1 A ULA (PI)")
    const guruLamaSet = new Set<string>();
    LIST_HARI.forEach((hari) => {
      [1, 2].forEach((j) => {
        const sesiList = k.jadwal[hari]?.[j as 1 | 2] || [];
        sesiList.forEach((s) => {
          if (s.guru && s.guru !== '-') guruLamaSet.add(s.guru);
        });
      });
    });

    Object.keys(currentMap).forEach((namaKey) => {
      const jObj = currentMap[namaKey];
      if (!jObj) return;
      const namaGuru = jObj.nama_asatidz || namaKey;
      const gGuru = genderGuruMap[String(namaGuru).trim().toUpperCase()] || '';
      LIST_HARI.forEach((hari) => {
        const hKey = hari.toLowerCase();
        const slots = parseJadwalCell_Client(jObj[hKey] || '');
        const hasSlotInClass = slots.some(
          (s) =>
            (s.jam === 1 || s.jam === 2) &&
            isInfoKelasCocok(parseInfoKelasNorm(s.lokasi), targetInfo, gGuru)
        );
        if (hasSlotInClass) {
          guruLamaSet.add(namaGuru);
        }
      });
    });

    // Hapus seluruh slot kelas ini (hanya kelas dengan gender yang sama) dari guru lama
    guruLamaSet.forEach((namaGuru) => {
      const obj = ambilJdwMutasi(namaGuru);
      const gGuru = genderGuruMap[String(namaGuru).trim().toUpperCase()] || '';
      LIST_HARI.forEach((hari) => {
        [1, 2].forEach((jamNum) => {
          removeSlotFromGuruObj(obj, hari, jamNum, namaKelasLengkap, gGuru);
        });
      });
    });

    // 2. Terapkan input baru Jam 1 dan Jam 2
    const lokasiRuang = k.lokal && k.lokal !== '-' ? k.lokal : '';
    const formatLokasiGabungan = lokasiRuang
      ? `${namaKelasLengkap} (${lokasiRuang})`
      : namaKelasLengkap;

    const fanState = useFanStore.getState();
    const keyInfo = dapatkanKelasKeyFanDariObj(k, formasiList, fanState.fanConfig);
    let needSaveFanDetail = false;
    const updatedFanDetail = JSON.parse(JSON.stringify(fanState.fanDetail));
    if (!updatedFanDetail.item) updatedFanDetail.item = {};

    [1, 2].forEach((jamNum) => {
      const entries = jamNum === 1 ? jam1Entries : jam2Entries;
      LIST_HARI.forEach((hari) => {
        const data = entries[hari];
        const rawGuru = (data?.asatidz || '').trim();
        const cleanGuru = rawGuru
          .replace(/^\[TERPAKAI di [^\]]+\]\s*/i, '')
          .replace(/^⭐\s*\[MUSTAHIQ KELAS\]\s*/i, '')
          .trim();
        const fan = (data?.fan || '').trim();

        if (cleanGuru && (fan || cleanGuru)) {
          const objGuru = ambilJdwMutasi(cleanGuru);
          addSlotToGuruObj(objGuru, hari, jamNum, fan || '-', formatLokasiGabungan);

          // Sinkronkan guru ke daftar pengajar Fan di fanDetail bila fan sudah ada di config
          if (fan && fan !== '-') {
            const rawItem =
              cariRawItemFanPadaKelasKey(keyInfo.primaryKey, fan, fanState.fanConfig) ||
              (keyInfo.isUg
                ? cariRawItemFanPadaKelasKey(keyInfo.fallbackKey, fan, fanState.fanConfig)
                : null);
            if (rawItem) {
              const targetKelasKey = cariRawItemFanPadaKelasKey(
                keyInfo.primaryKey,
                fan,
                fanState.fanConfig
              )
                ? keyInfo.primaryKey
                : keyInfo.fallbackKey;
              const itemKey = `${targetKelasKey}||${rawItem}`;
              if (!updatedFanDetail.item[itemKey]) {
                updatedFanDetail.item[itemKey] = { pengajar: '', asatidz: [] };
              }
              const det = updatedFanDetail.item[itemKey];
              if (!Array.isArray(det.asatidz)) det.asatidz = [];
              if (
                !det.asatidz.some(
                  (g: string) => String(g).trim().toUpperCase() === cleanGuru.toUpperCase()
                )
              ) {
                det.asatidz.push(cleanGuru);
                det.pengajar = hitungLabelPengajarDariListAsatidz(
                  det.asatidz,
                  asatidzList,
                  det.pengajar
                );
                needSaveFanDetail = true;
              }
            }
          }
        }
      });
    });

    // 3. Sinkronkan total jam dan kelas mengajar untuk seluruh guru yang terpengaruh
    Object.keys(mapPerubahan).forEach((gUpper) => {
      syncGuruMengajarAndTotalObj(mapPerubahan[gUpper], asatidzList);
    });

    if (needSaveFanDetail) {
      useFanStore.setState({ fanDetail: updatedFanDetail });
      useFanStore.getState().triggerAutoSaveFanDetail();
    }

    const success = await get().simpanBatchJadwalAsatidz(
      mapPerubahan,
      `Memperbarui Jadwal Jam 1 & 2 Kelas ${namaKelasLengkap}`
    );

    if (success) {
      if (formasiList && formasiList.length > 0) {
        get().rebuildMasterStrukturKelas(formasiList, asatidzList);
      }
      get().closeModalInputJadwal();
    }
    return success;
  },

  hapusJadwalJamKelas: async (kelasKey, k, targetJam, asatidzList) => {
    const currentMap = get().jadwalMap;
    const namaKelasLengkap = namaKelasLengkapDariObj(k);
    const targetInfo = parseInfoKelasNorm(namaKelasLengkap);
    const petaGenderGuru = buatPetaGenderGuru(asatidzList);

    const asatidzAffected = new Set<string>();
    LIST_HARI.forEach((hari) => {
      const sesiList = k.jadwal[hari]?.[targetJam] || [];
      sesiList.forEach((s) => {
        if (s.guru && s.guru !== '-') asatidzAffected.add(s.guru);
      });
    });

    Object.keys(currentMap).forEach((keyUpper) => {
      const jdw = getJadwalGuruFromMap(keyUpper, currentMap);
      const gGender = petaGenderGuru[String(jdw.nama_asatidz || keyUpper).trim().toUpperCase()];
      for (const hari of LIST_HARI) {
        const slots = parseJadwalCell_Client(jdw[hari.toLowerCase()]);
        const match = slots.some((s) => {
          if (s.jam !== targetJam) return false;
          return isInfoKelasCocok(parseInfoKelasNorm(s.lokasi), targetInfo, gGender);
        });
        if (match) {
          asatidzAffected.add(jdw.nama_asatidz || keyUpper);
          break;
        }
      }
    });

    if (asatidzAffected.size === 0) return true;

    const mapPerubahan: Record<string, TeacherJadwalRow> = {};

    asatidzAffected.forEach((namaGuru) => {
      const gUpper = namaGuru.trim().toUpperCase();
      const existing = getJadwalGuruFromMap(namaGuru, currentMap);
      const gGender = petaGenderGuru[gUpper];
      const mutasi: TeacherJadwalRow = {
        nama_asatidz: existing.nama_asatidz || namaGuru.trim(),
        mengajar: existing.mengajar || '',
        sabtu: existing.sabtu || '',
        ahad: existing.ahad || '',
        senin: existing.senin || '',
        selasa: existing.selasa || '',
        rabu: existing.rabu || '',
        kamis: existing.kamis || '',
        totalJam: existing.totalJam || 0,
      };

      LIST_HARI.forEach((hari) => {
        removeSlotFromGuruObj(mutasi, hari, targetJam, namaKelasLengkap, gGender);
      });

      syncGuruMengajarAndTotalObj(mutasi, asatidzList);
      mapPerubahan[gUpper] = mutasi;
    });

    return get().simpanBatchJadwalAsatidz(
      mapPerubahan,
      `Mengosongkan Jadwal Jam ${targetJam} Kelas ${namaKelasLengkap}`
    );
  },

  analisisSinkronisasiTempelKG: (
    mode,
    targetHari,
    targetJam,
    targetKelasKey,
    targetClassObj,
    targetGuru,
    targetFan,
    asatidzList,
    formasiList
  ) => {
    const src = get().stateClipboardKG;
    if (!src || !src.guru) {
      return { ok: false, errorMsg: 'Data clipboard jadwal tidak ditemukan.' };
    }

    let srcAfter = { guru: src.guru, fan: src.fan };
    let tgtAfter = { guru: targetGuru, fan: targetFan };

    if (mode === 'langsung_pindah' || mode === 'timpa' || mode === 'pindah_hapus') {
      srcAfter = { guru: '', fan: '-' };
      tgtAfter = { guru: src.guru, fan: src.fan };
    } else if (mode === 'tukar' || mode === 'tukar_semua') {
      srcAfter = { guru: targetGuru, fan: targetFan };
      tgtAfter = { guru: src.guru, fan: src.fan };
    } else if (mode === 'tukar_asatidz') {
      srcAfter = { guru: targetGuru, fan: src.fan };
      tgtAfter = { guru: src.guru, fan: targetFan };
    } else if (mode === 'tukar_fan') {
      srcAfter = { guru: src.guru, fan: targetFan };
      tgtAfter = { guru: targetGuru, fan: src.fan };
    } else if (mode === 'ganti_asatidz') {
      srcAfter = { guru: '', fan: '-' };
      tgtAfter = { guru: src.guru, fan: targetFan };
    } else if (mode === 'ganti_fan') {
      srcAfter = { guru: src.guru, fan: src.fan };
      tgtAfter = { guru: targetGuru, fan: src.fan };
    }

    const masterKls = get().masterStrukturKelasKBM;

    // Validasi Bentrok Fisik Hari & Jam pada slot Target
    const excludeForTgt = [{ kelasKey: targetKelasKey, hari: targetHari, jam: targetJam }];
    if ((srcAfter.guru || '').trim().toUpperCase() !== (tgtAfter.guru || '').trim().toUpperCase()) {
      excludeForTgt.push({ kelasKey: src.kelasKey, hari: src.hari, jam: src.jam });
    }
    if (tgtAfter.guru) {
      const bentrokTgt = cekBentrokFisikHariJamKBM(
        tgtAfter.guru,
        targetHari,
        targetJam,
        masterKls,
        excludeForTgt
      );
      if (bentrokTgt) {
        return {
          ok: false,
          errorMsg: `BENTROK JADWAL FISIK!\nAsatidz ${tgtAfter.guru} sudah tercatat mengajar di kelas ${bentrokTgt} pada hari ${targetHari} Jam Ke-${targetJam}.`,
        };
      }
    }

    // Validasi Bentrok Fisik Hari & Jam pada slot Sumber (bila ada pertukaran)
    const excludeForSrc = [{ kelasKey: src.kelasKey, hari: src.hari, jam: src.jam }];
    if ((srcAfter.guru || '').trim().toUpperCase() !== (tgtAfter.guru || '').trim().toUpperCase()) {
      excludeForSrc.push({ kelasKey: targetKelasKey, hari: targetHari, jam: targetJam });
    }
    if (srcAfter.guru && srcAfter.guru !== src.guru) {
      const bentrokSrc = cekBentrokFisikHariJamKBM(
        srcAfter.guru,
        src.hari,
        src.jam,
        masterKls,
        excludeForSrc
      );
      if (bentrokSrc) {
        return {
          ok: false,
          errorMsg: `BENTROK JADWAL FISIK!\nAsatidz ${srcAfter.guru} sudah tercatat mengajar di kelas ${bentrokSrc} pada hari ${src.hari} Jam Ke-${src.jam}.`,
        };
      }
    }

    const fanState = useFanStore.getState();
    const fanConfig = fanState.fanConfig;
    const fanDetail = fanState.fanDetail;

    const syncPlan: SyncPlanFanKBM = {
      hasChanges: false,
      addFanItems: [],
      msPrompts: [],
      registerAsatidz: [],
      updateJamQuotas: [],
    };

    const slotsToInspect = [
      {
        id: 'tgt',
        labelSlot: `Target (${targetClassObj.kls} ${targetClassObj.bag} ${targetClassObj.tingkat} • ${targetHari} J${targetJam})`,
        classObj: targetClassObj,
        hari: targetHari,
        jam: targetJam,
        guru: tgtAfter.guru,
        fan: tgtAfter.fan,
      },
      {
        id: 'src',
        labelSlot: `Asal (${src.classObj.kls} ${src.classObj.bag} ${src.classObj.tingkat} • ${src.hari} J${src.jam})`,
        classObj: src.classObj,
        hari: src.hari,
        jam: src.jam,
        guru: srcAfter.guru,
        fan: srcAfter.fan,
      },
    ];

    slotsToInspect.forEach((sItem) => {
      if (!sItem.guru || !sItem.fan || sItem.fan === '-') return;
      const k = sItem.classObj;
      const keyInfo = dapatkanKelasKeyFanDariObj(k, formasiList, fanConfig);
      const kelasKey = keyInfo.effectiveKey;

      let rawItem =
        cariRawItemFanPadaKelasKey(keyInfo.primaryKey, sItem.fan, fanConfig) ||
        (keyInfo.isUg ? cariRawItemFanPadaKelasKey(keyInfo.fallbackKey, sItem.fan, fanConfig) : null);

      const fanShort = ambilNamaFanSingkat(sItem.fan, k.tingkat, k.kls, fanConfig);

      // Poin 1: Cek apakah Fan sudah ada di fanConfig kelas ini
      if (!rawItem) {
        const pTest = parseFanItemString(sItem.fan);
        rawItem = pTest.fan !== '-' ? sItem.fan : `(${fanShort}) ${sItem.fan}`;
        if (!syncPlan.addFanItems.some((a) => a.kelasKey === kelasKey && a.rawItem === rawItem)) {
          syncPlan.addFanItems.push({
            slotId: sItem.id,
            kelasKey,
            rawItem,
            fanShort,
          });
          syncPlan.hasChanges = true;
        }
      }

      const itemKey = `${kelasKey}||${rawItem}`;
      const itemDet = (fanDetail && fanDetail.item && fanDetail.item[itemKey]) || {
        pengajar: '',
        asatidz: [],
      };

      // Poin 2: Cek apakah Fan berstatus khusus Mustahiq (MS)
      const isFanMS = cekFanMSuntukKelas(keyInfo.primaryKey, keyInfo.fallbackKey, rawItem, fanDetail);
      const namaMS = k.mustahiqNama && k.mustahiqNama !== '-' ? k.mustahiqNama.trim() : '';
      let triggeredMSPrompt = false;

      if (isFanMS && namaMS && sItem.guru.trim().toUpperCase() !== namaMS.toUpperCase()) {
        triggeredMSPrompt = true;
        syncPlan.msPrompts.push({
          slotId: sItem.id,
          labelSlot: sItem.labelSlot,
          classObj: k,
          hari: sItem.hari,
          jam: sItem.jam,
          kelasKey,
          itemKey,
          rawItem,
          fanShort,
          currentGuru: sItem.guru,
          mustahiqNama: namaMS,
        });
        syncPlan.hasChanges = true;
      }

      // Poin 3: Cek apakah Asatidz sudah terdaftar di daftar PENGAJAR Fan
      const currentAsatidzList = Array.isArray(itemDet.asatidz) ? itemDet.asatidz : [];
      const sudahTerdaftar = currentAsatidzList.some(
        (g) => String(g || '').trim().toUpperCase() === sItem.guru.trim().toUpperCase()
      );
      if (!sudahTerdaftar && !triggeredMSPrompt) {
        const mergedList = [...currentAsatidzList, sItem.guru];
        const newLabel = hitungLabelPengajarDariListAsatidz(
          mergedList,
          asatidzList,
          itemDet.pengajar
        );
        if (
          !syncPlan.registerAsatidz.some(
            (r) => r.itemKey === itemKey && r.guru.toUpperCase() === sItem.guru.toUpperCase()
          )
        ) {
          syncPlan.registerAsatidz.push({
            slotId: sItem.id,
            itemKey,
            kelasKey,
            rawItem,
            fanShort,
            guru: sItem.guru,
            newPengajarLabel: newLabel,
          });
          syncPlan.hasChanges = true;
        }
      }

      // Poin 4: Cek kuota jam mingguan Fan
      const batasInfo =
        dapatkanBatasJamFan(keyInfo.primaryKey, rawItem, fanConfig, fanDetail) ||
        (keyInfo.isUg
          ? dapatkanBatasJamFan(keyInfo.fallbackKey, rawItem, fanConfig, fanDetail)
          : null);
      let maxJam = batasInfo && batasInfo.maxJam !== null ? batasInfo.maxJam : null;
      if (maxJam === null && itemDet.jam !== undefined && itemDet.jam !== '') {
        const parsedJam = parseInt(String(itemDet.jam), 10);
        if (!isNaN(parsedJam)) maxJam = parsedJam;
      }

      if (maxJam !== null) {
        let totalPakaiMingguan = 0;
        const targetParsed = parseFanItemString(rawItem);
        const targetShortLower = (
          targetParsed.fan !== '-' ? targetParsed.fan : targetParsed.mapel
        ).toLowerCase();

        LIST_HARI.forEach((h) => {
          ([1, 2] as const).forEach((j) => {
            let fVal = '';
            if (k.key === targetKelasKey && h === targetHari && j === parseInt(String(targetJam), 10)) {
              fVal = tgtAfter.guru ? tgtAfter.fan || '' : '';
            } else if (k.key === src.kelasKey && h === src.hari && j === parseInt(String(src.jam), 10)) {
              fVal = srcAfter.guru ? srcAfter.fan || '' : '';
            } else {
              const sArr = (k.jadwal && k.jadwal[h] && k.jadwal[h][j]) || [];
              if (sArr.length > 0 && sArr[0].guru && sArr[0].guru !== '-') {
                fVal = sArr[0].fanAsli || sArr[0].fan || '';
              }
            }

            if (fVal && fVal !== '-') {
              const matchedRaw = cariRawItemFanPadaKelasKey(kelasKey, fVal, fanConfig);
              const fShortLower = ambilNamaFanSingkat(fVal, k.tingkat, k.kls, fanConfig).toLowerCase();
              if (matchedRaw === rawItem || fShortLower === targetShortLower) {
                totalPakaiMingguan++;
              }
            }
          });
        });

        if (totalPakaiMingguan > maxJam) {
          const newQuota = Math.min(6, totalPakaiMingguan);
          if (newQuota > maxJam && !syncPlan.updateJamQuotas.some((u) => u.itemKey === itemKey)) {
            syncPlan.updateJamQuotas.push({
              itemKey,
              kelasKey,
              rawItem,
              fanShort,
              oldJam: maxJam,
              newJam: newQuota,
              totalPakai: totalPakaiMingguan,
            });
            syncPlan.hasChanges = true;
          }
        }
      }
    });

    return { ok: true, syncPlan, srcAfter, tgtAfter };
  },

  eksekusiTempelKG: async (
    mode,
    targetHari,
    targetJam,
    targetKelasKey,
    targetClassObj,
    targetGuru,
    targetFan,
    asatidzList,
    formasiList,
    pilihanMSMap = {}
  ) => {
    const src = get().stateClipboardKG;
    if (!src || !src.guru) return { ok: false, errorMsg: 'Clipboard kosong.' };

    const analisis = get().analisisSinkronisasiTempelKG(
      mode,
      targetHari,
      targetJam,
      targetKelasKey,
      targetClassObj,
      targetGuru,
      targetFan,
      asatidzList,
      formasiList
    );

    if (!analisis.ok || !analisis.syncPlan || !analisis.srcAfter || !analisis.tgtAfter) {
      return { ok: false, errorMsg: analisis.errorMsg || 'Gagal memvalidasi jadwal.' };
    }

    const { syncPlan, srcAfter, tgtAfter } = analisis;
    const fanState = useFanStore.getState();
    const updatedFanConfig = JSON.parse(JSON.stringify(fanState.fanConfig)) as FanConfigMap;
    const updatedFanDetail = JSON.parse(JSON.stringify(fanState.fanDetail));
    if (!updatedFanDetail.item) updatedFanDetail.item = {};

    let needSaveFanConfig = false;
    let needSaveFanDetail = false;

    syncPlan.addFanItems.forEach((a) => {
      if (!Array.isArray(updatedFanConfig[a.kelasKey])) updatedFanConfig[a.kelasKey] = [];
      if (!updatedFanConfig[a.kelasKey].includes(a.rawItem)) {
        updatedFanConfig[a.kelasKey].push(a.rawItem);
        needSaveFanConfig = true;
      }
    });

    for (const mp of syncPlan.msPrompts) {
      const choice = pilihanMSMap[mp.slotId] || 'use_ms';
      if (!updatedFanDetail.item[mp.itemKey]) {
        updatedFanDetail.item[mp.itemKey] = { pengajar: 'MS', asatidz: [] };
      }
      const det = updatedFanDetail.item[mp.itemKey];
      if (!Array.isArray(det.asatidz)) det.asatidz = [];

      if (choice === 'use_ms') {
        const excludeMS = [
          { kelasKey: targetKelasKey, hari: targetHari, jam: targetJam },
          { kelasKey: src.kelasKey, hari: src.hari, jam: src.jam },
        ];
        const bentrokMS = cekBentrokFisikHariJamKBM(
          mp.mustahiqNama,
          mp.hari,
          mp.jam,
          get().masterStrukturKelasKBM,
          excludeMS
        );
        if (bentrokMS) {
          return {
            ok: false,
            errorMsg: `Mustahiq ${mp.mustahiqNama} sudah mengajar di ${bentrokMS} pada ${mp.hari} Jam Ke-${mp.jam}.`,
          };
        }
        if (mp.slotId === 'tgt') tgtAfter.guru = mp.mustahiqNama;
        if (mp.slotId === 'src') srcAfter.guru = mp.mustahiqNama;

        if (!det.asatidz.some((g: string) => String(g).trim().toUpperCase() === mp.mustahiqNama.toUpperCase())) {
          det.asatidz.push(mp.mustahiqNama);
        }
        det.pengajar = hitungLabelPengajarDariListAsatidz(det.asatidz, asatidzList, det.pengajar || 'MS');
        needSaveFanDetail = true;
      } else {
        if (!det.asatidz.some((g: string) => String(g).trim().toUpperCase() === mp.currentGuru.toUpperCase())) {
          det.asatidz.push(mp.currentGuru);
        }
        det.pengajar = hitungLabelPengajarDariListAsatidz(det.asatidz, asatidzList, det.pengajar);
        needSaveFanDetail = true;
      }
    }

    syncPlan.registerAsatidz.forEach((r) => {
      if (!updatedFanDetail.item[r.itemKey]) {
        updatedFanDetail.item[r.itemKey] = { pengajar: '', asatidz: [] };
      }
      const det = updatedFanDetail.item[r.itemKey];
      if (!Array.isArray(det.asatidz)) det.asatidz = [];
      if (!det.asatidz.some((g: string) => String(g).trim().toUpperCase() === r.guru.toUpperCase())) {
        det.asatidz.push(r.guru);
      }
      det.pengajar = hitungLabelPengajarDariListAsatidz(det.asatidz, asatidzList, det.pengajar);
      needSaveFanDetail = true;
    });

    syncPlan.updateJamQuotas.forEach((u) => {
      if (!updatedFanDetail.item[u.itemKey]) {
        updatedFanDetail.item[u.itemKey] = { pengajar: '', asatidz: [] };
      }
      updatedFanDetail.item[u.itemKey].jam = String(Math.min(6, u.newJam));
      needSaveFanDetail = true;
    });

    if (needSaveFanConfig) {
      await useFanStore.getState().saveFanConfig(updatedFanConfig);
    }
    if (needSaveFanDetail) {
      useFanStore.setState({ fanDetail: updatedFanDetail });
      useFanStore.getState().triggerAutoSaveFanDetail();
    }

    const currentMap = get().jadwalMap;
    const mapPerubahan: Record<string, TeacherJadwalRow> = {};

    const ambilMutasi = (namaGuru: string): TeacherJadwalRow => {
      const gUpper = namaGuru.trim().toUpperCase();
      if (!mapPerubahan[gUpper]) {
        const existing = getJadwalGuruFromMap(namaGuru, currentMap);
        mapPerubahan[gUpper] = {
          nama_asatidz: existing.nama_asatidz || namaGuru.trim(),
          mengajar: existing.mengajar || '',
          sabtu: existing.sabtu || '',
          ahad: existing.ahad || '',
          senin: existing.senin || '',
          selasa: existing.selasa || '',
          rabu: existing.rabu || '',
          kamis: existing.kamis || '',
          totalJam: existing.totalJam || 0,
        };
      }
      return mapPerubahan[gUpper];
    };

    const petaGenderGuru = buatPetaGenderGuru(asatidzList);

    const srcK = src.classObj;
    const srcKlsFull = namaKelasLengkapDariObj(srcK);
    const srcLokasi = srcK.lokal && srcK.lokal !== '-' ? srcK.lokal : '';
    const srcFormatLokasi = srcLokasi ? `${srcKlsFull} (${srcLokasi})` : srcKlsFull;

    const tgtK = targetClassObj;
    const tgtKlsFull = namaKelasLengkapDariObj(tgtK);
    const tgtLokasi = tgtK.lokal && tgtK.lokal !== '-' ? tgtK.lokal : '';
    const tgtFormatLokasi = tgtLokasi ? `${tgtKlsFull} (${tgtLokasi})` : tgtKlsFull;

    // 1. Hapus slot lama dari guru asal dan guru tujuan
    if (src.guru) {
      const gOldSrc = ambilMutasi(src.guru);
      const gOldSrcGender = petaGenderGuru[String(src.guru).trim().toUpperCase()];
      removeSlotFromGuruObj(gOldSrc, src.hari, src.jam, srcKlsFull, gOldSrcGender);
    }
    if (targetGuru) {
      const gOldTgt = ambilMutasi(targetGuru);
      const gOldTgtGender = petaGenderGuru[String(targetGuru).trim().toUpperCase()];
      removeSlotFromGuruObj(gOldTgt, targetHari, targetJam, tgtKlsFull, gOldTgtGender);
    }

    // 2. Tambahkan slot baru sesuai srcAfter dan tgtAfter
    if (srcAfter.guru) {
      const gNewSrc = ambilMutasi(srcAfter.guru);
      addSlotToGuruObj(gNewSrc, src.hari, src.jam, srcAfter.fan || '-', srcFormatLokasi);
    }
    if (tgtAfter.guru) {
      const gNewTgt = ambilMutasi(tgtAfter.guru);
      addSlotToGuruObj(gNewTgt, targetHari, targetJam, tgtAfter.fan || '-', tgtFormatLokasi);
    }

    Object.keys(mapPerubahan).forEach((gUpper) => {
      syncGuruMengajarAndTotalObj(mapPerubahan[gUpper], asatidzList);
    });

    const success = await get().simpanBatchJadwalAsatidz(
      mapPerubahan,
      `Mode Pindah/Tukar KG (${mode}): ${srcKlsFull} -> ${tgtKlsFull}`
    );

    if (success) {
      if (formasiList && formasiList.length > 0) {
        get().rebuildMasterStrukturKelas(formasiList, asatidzList);
      }
      get().batalkanModePindahKG();
      return { ok: true };
    }
    return { ok: false, errorMsg: 'Gagal menyimpan jadwal ke server.' };
  },

  eksekusiAksiKlikKananKG: async (payload, asatidzList, formasiList) => {
    const ctx = get().stateContextKG;
    if (!ctx) return { ok: false, errorMsg: 'Konteks sel tidak ditemukan.' };

    const { actionType } = payload;
    const srcClass = ctx.classObj;
    const srcKelasMurni = namaKelasLengkapDariObj(srcClass);
    const srcLokasiGabungan =
      srcClass.lokal && srcClass.lokal !== '-' ? `${srcKelasMurni} (${srcClass.lokal})` : srcKelasMurni;

    const srcHari = ctx.hari;
    const srcJam = ctx.jam;
    const srcGuru = ctx.guru;
    const srcFan = ctx.fan || '-';

    const petaGenderGuru = buatPetaGenderGuru(asatidzList);
    const srcGuruGender = petaGenderGuru[String(srcGuru || '').trim().toUpperCase()];

    const currentMap = get().jadwalMap;
    const mapPerubahan: Record<string, TeacherJadwalRow> = {};

    const ambilObjGuruWork = (nama: string): TeacherJadwalRow => {
      const clean = String(nama || '').trim();
      const key = clean.toUpperCase();
      if (!mapPerubahan[key]) {
        const existing = getJadwalGuruFromMap(clean, currentMap);
        mapPerubahan[key] = {
          nama_asatidz: existing.nama_asatidz || clean,
          mengajar: existing.mengajar || '',
          sabtu: existing.sabtu || '',
          ahad: existing.ahad || '',
          senin: existing.senin || '',
          selasa: existing.selasa || '',
          rabu: existing.rabu || '',
          kamis: existing.kamis || '',
          totalJam: existing.totalJam || 0,
        };
      }
      return mapPerubahan[key];
    };

    if (actionType === 'asatidz') {
      const rawGuruBaru = String(payload.guruBaru || '')
        .replace(/^\[TERPAKAI di [^\]]+\]\s*/i, '')
        .replace(/^⭐\s*\[MUSTAHIQ KELAS\]\s*/i, '')
        .trim();
      const fanInput = String(payload.fanBaru || '').trim();

      let guruBaru = '';
      if (rawGuruBaru) {
        const rowMaster = (asatidzList || []).find(
          (a) => String(a.nama_asatidz || '').trim().toUpperCase() === rawGuruBaru.toUpperCase()
        );
        if (!rowMaster) {
          return {
            ok: false,
            errorMsg: `Nama "${rawGuruBaru}" tidak ditemukan pada Database Asatidz.`,
          };
        }
        guruBaru = String(rowMaster.nama_asatidz).trim();

        const kelasBentrok = cekBentrokFisikHariJamKBM(
          guruBaru,
          srcHari,
          srcJam,
          get().masterStrukturKelasKBM,
          [{ kelasKey: ctx.kelasKey, hari: srcHari, jam: srcJam }]
        );
        if (kelasBentrok) {
          return {
            ok: false,
            errorMsg: `${guruBaru} sudah memiliki jadwal mengajar di ${kelasBentrok} pada hari ${srcHari} Jam ${srcJam}.`,
          };
        }
      }

      if (!guruBaru && !srcGuru) {
        return { ok: false, errorMsg: 'Silakan isi Asatidz terlebih dahulu.' };
      }

      if (srcGuru) {
        const gOld = ambilObjGuruWork(srcGuru);
        removeSlotFromGuruObj(gOld, srcHari, srcJam, srcKelasMurni, srcGuruGender);
      }

      if (guruBaru) {
        const gNew = ambilObjGuruWork(guruBaru);
        addSlotToGuruObj(gNew, srcHari, srcJam, fanInput || '-', srcLokasiGabungan);
      }
    } else {
      const targetKelasKey =
        actionType === 'kelas' && payload.targetKelasKey ? payload.targetKelasKey : ctx.kelasKey;
      const targetHari = payload.targetHari || srcHari;
      const targetJam = (payload.targetJam || srcJam) as 1 | 2;

      const targetKlsObj = (get().masterStrukturKelasKBM || []).find(
        (c) => c.key === targetKelasKey
      );
      if (!targetKlsObj) {
        return { ok: false, errorMsg: 'Kelas tujuan tidak ditemukan.' };
      }

      const tgtKelasMurni = namaKelasLengkapDariObj(targetKlsObj);
      const tgtLokasiGabungan =
        targetKlsObj.lokal && targetKlsObj.lokal !== '-'
          ? `${tgtKelasMurni} (${targetKlsObj.lokal})`
          : tgtKelasMurni;

      const sesiTarget = targetKlsObj.jadwal[targetHari]?.[targetJam] || [];
      const targetGuru =
        sesiTarget.length > 0 && sesiTarget[0].guru && sesiTarget[0].guru !== '-'
          ? sesiTarget[0].guru
          : '';
      const targetFan =
        sesiTarget.length > 0 ? sesiTarget[0].fanAsli || sesiTarget[0].fan || '-' : '-';

      // Validasi bentrok fisik guru asal pada hari & jam target
      const excludeSlots = [
        { kelasKey: ctx.kelasKey, hari: srcHari, jam: srcJam },
        { kelasKey: targetKelasKey, hari: targetHari, jam: targetJam },
      ];
      if (srcGuru) {
        const bentrokSrc = cekBentrokFisikHariJamKBM(
          srcGuru,
          targetHari,
          targetJam,
          get().masterStrukturKelasKBM,
          excludeSlots
        );
        if (bentrokSrc) {
          return {
            ok: false,
            errorMsg: `${srcGuru} sudah mengajar di ${bentrokSrc} pada ${targetHari} Jam ${targetJam}.`,
          };
        }
      }
      if (targetGuru) {
        const bentrokTgt = cekBentrokFisikHariJamKBM(
          targetGuru,
          srcHari,
          srcJam,
          get().masterStrukturKelasKBM,
          excludeSlots
        );
        if (bentrokTgt) {
          return {
            ok: false,
            errorMsg: `${targetGuru} sudah mengajar di ${bentrokTgt} pada ${srcHari} Jam ${srcJam}.`,
          };
        }
      }

      if (srcGuru) {
        const gSrc = ambilObjGuruWork(srcGuru);
        removeSlotFromGuruObj(gSrc, srcHari, srcJam, srcKelasMurni, srcGuruGender);
        addSlotToGuruObj(gSrc, targetHari, targetJam, srcFan, tgtLokasiGabungan);
      }

      if (targetGuru) {
        const gTgt = ambilObjGuruWork(targetGuru);
        const tgtGuruGender = petaGenderGuru[String(targetGuru).trim().toUpperCase()];
        removeSlotFromGuruObj(gTgt, targetHari, targetJam, tgtKelasMurni, tgtGuruGender);
        addSlotToGuruObj(gTgt, srcHari, srcJam, targetFan, srcLokasiGabungan);
      }
    }

    Object.values(mapPerubahan).forEach((gObj) => {
      syncGuruMengajarAndTotalObj(gObj, asatidzList);
    });

    const success = await get().simpanBatchJadwalAsatidz(
      mapPerubahan,
      `Aksi cepat KG (${actionType}) pada kelas ${srcKelasMurni} (${srcHari} Jam ${srcJam})`
    );

    if (success) {
      if (formasiList && formasiList.length > 0) {
        get().rebuildMasterStrukturKelas(formasiList, asatidzList);
      }
      get().closeModalAksiKG();
      return { ok: true };
    }

    return { ok: false, errorMsg: 'Gagal menyimpan perubahan jadwal.' };
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

  handleRealtimeJadwal: (newValue) => {
    try {
      const parsed = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        set({ jadwalMap: parsed });
        try {
          localStorage.setItem(LS_JADWAL_ASATIDZ, JSON.stringify(parsed));
        } catch {}
        const formasi = useFormasiStore.getState().formasiList;
        const asatidz = useAsatidzStore.getState().asatidzList;
        if (formasi && formasi.length > 0) {
          get().rebuildMasterStrukturKelas(formasi, asatidz);
        }
      }
    } catch (err) {
      console.error('Handle realtime jadwal error:', err);
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useJadwalStore = useJadwalStore;
}
