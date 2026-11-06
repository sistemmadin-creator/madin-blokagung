import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import {
  useAbsensiStore,
  KEY_DB_LIBUR,
  LS_CACHE_LIBUR,
} from '@/stores/useAbsensiStore';
import { useTahunAjaranStore } from '@/stores/useTahunAjaranStore';
import { HariLiburInfo } from '@/types/absensi';
import {
  formatWaktuSekarangWIB,
  getNamaHariDariTgl,
} from '@/lib/utils/absensiHelper';
import {
  AgendaKalenderItem,
  KATALOG_ATURAN_KEGIATAN,
  KategoriLiburAbsensi,
  KodeKegiatanKalender,
  ModeKalender,
  TahunAjaranKalenderConfig,
} from '@/types/kalender';
import {
  addDaysYMD,
  DAFTAR_TAHUN_AJARAN_KALENDER,
  generateAgendaTahunAjaran,
} from '@/lib/utils/kalenderHijriyahHelper';

export const KEY_DB_KALENDER = 'MADIN_KALENDER_KEGIATAN_V3';
export const LS_CACHE_KALENDER = 'MADIN_KALENDER_KEGIATAN_CACHE_V3';

function buildDefaultAturanLibur(): Record<KodeKegiatanKalender, boolean> {
  const map = {} as Record<KodeKegiatanKalender, boolean>;
  (Object.keys(KATALOG_ATURAN_KEGIATAN) as KodeKegiatanKalender[]).forEach(
    (k) => {
      map[k] = KATALOG_ATURAN_KEGIATAN[k].defaultIsLiburKbm;
    }
  );
  return map;
}

function getAllKnownTahunAjaranConfigs(): TahunAjaranKalenderConfig[] {
  const globalList = useTahunAjaranStore.getState().daftarTahunAjaran;
  if (Array.isArray(globalList) && globalList.length > 0) {
    return globalList;
  }
  return DAFTAR_TAHUN_AJARAN_KALENDER;
}

function sanitizeTahunAjaranMasehi(rawTA?: string): string {
  if (!rawTA || rawTA === '2025/2026' || rawTA === '2024/2025') {
    return '2026/2027';
  }
  return rawTA;
}

function buildInitialAgendaMapByTA(
  aturanLibur: Record<KodeKegiatanKalender, boolean>,
  offsets: Record<string, number> = {}
): Record<string, Record<string, AgendaKalenderItem>> {
  const result: Record<string, Record<string, AgendaKalenderItem>> = {};
  getAllKnownTahunAjaranConfigs().forEach((cfg) => {
    const offset = offsets[cfg.tahunAjaranMasehi] ?? cfg.hijriOffsetDays;
    result[cfg.tahunAjaranMasehi] = generateAgendaTahunAjaran(
      { ...cfg, hijriOffsetDays: offset },
      aturanLibur
    );
  });
  return result;
}

interface KalenderPersistedPayload {
  activeTahunAjaran: string;
  hijriOffsetByTA: Record<string, number>;
  aturanLiburByKode: Record<KodeKegiatanKalender, boolean>;
  agendaMapByTA: Record<string, Record<string, AgendaKalenderItem>>;
}

interface KalenderState {
  modeKalender: ModeKalender;
  activeTahunAjaran: string;
  hijriOffsetByTA: Record<string, number>;
  aturanLiburByKode: Record<KodeKegiatanKalender, boolean>;
  agendaMapByTA: Record<string, Record<string, AgendaKalenderItem>>;
  isLoading: boolean;
  isSyncingAbsensi: boolean;
  lastSyncedAt?: string;

  setModeKalender: (mode: ModeKalender) => void;
  setActiveTahunAjaran: (taMasehi: string) => void;
  fetchKalenderData: () => Promise<void>;

  getCurrentTAConfig: () => TahunAjaranKalenderConfig;
  getCurrentAgendaMap: () => Record<string, AgendaKalenderItem>;

  upsertRentangAgenda: (params: {
    startYMD: string;
    endYMD: string;
    kode: KodeKegiatanKalender;
    namaKegiatan?: string;
    isLiburKbm: boolean;
    kategoriLibur: KategoriLiburAbsensi;
    catatan?: string;
    actorName?: string;
  }) => Promise<void>;

  deleteAgendaTanggal: (tanggalYMD: string, actorName?: string) => Promise<void>;
  deleteMultipleAgendaTanggal: (
    tanggalYMDList: string[],
    actorName?: string
  ) => Promise<void>;
  clearAllAgendaTahunAjaran: (
    taMasehi?: string,
    actorName?: string
  ) => Promise<void>;

  updateAturanLiburKode: (
    nextAturan: Record<KodeKegiatanKalender, boolean>,
    nextHijriOffset: number,
    actorName?: string
  ) => Promise<void>;

  regenerateTahunAjaranOtomatis: (
    taMasehi: string,
    hijriOffsetDays: number,
    actorName?: string
  ) => Promise<void>;

  syncKalenderToAbsensiLibur: (actorName?: string) => Promise<number>;
}

const initialAturan = buildDefaultAturanLibur();
const initialAgendaByTA = buildInitialAgendaMapByTA(initialAturan, {});
let localMutationCounter = 0;

async function persistKalenderState(payload: KalenderPersistedPayload) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_CACHE_KALENDER, JSON.stringify(payload));
    } catch {
      // Abaikan kuota LocalStorage
    }
  }
  try {
    await supabase
      .from('app_settings')
      .upsert(
        { key: KEY_DB_KALENDER, value: payload },
        { onConflict: 'key' }
      );
  } catch {
    // Offline fallback ke LocalStorage
  }
}

/**
 * Menyinkronkan seluruh agenda yang berstatus isLiburKbm === true
 * ke dalam liburMapByDate milik useAbsensiStore (PENGATURAN_LIBUR_MADIN)
 */
async function pushAgendaLiburToAbsensiStore(
  agendaMapByTA: Record<string, Record<string, AgendaKalenderItem>>,
  actorName = 'Kalender Kegiatan'
): Promise<number> {
  const absensiState = useAbsensiStore.getState();
  const currentLiburMap: Record<string, HariLiburInfo> = {
    ...(absensiState.liburMapByDate || {}),
  };

  // Bersihkan entri lama yang berasal dari sinkronisasi otomatis Kalender Kegiatan
  Object.keys(currentLiburMap).forEach((tgl) => {
    const info = currentLiburMap[tgl];
    if (
      info?.diinputOleh === 'Sinkron Kalender Kegiatan' ||
      info?.diinputOleh === 'Kalender Kegiatan' ||
      info?.diinputOleh === 'PKM. Kurikulum'
    ) {
      delete currentLiburMap[tgl];
    }
  });

  let syncedCount = 0;
  const waktu = formatWaktuSekarangWIB();

  Object.values(agendaMapByTA).forEach((taMap) => {
    Object.values(taMap || {}).forEach((item) => {
      if (!item || !item.tanggalMasehi) return;
      if (item.isLiburKbm) {
        currentLiburMap[item.tanggalMasehi] = {
          tanggal: item.tanggalMasehi,
          hari: getNamaHariDariTgl(item.tanggalMasehi),
          kategori: item.kategoriLibur || 'Libur Pondok',
          keterangan: `[${item.kode}] ${item.namaKegiatan}${
            item.catatan ? ` - ${item.catatan}` : ''
          }`,
          waktuUpdate: waktu,
          diinputOleh: 'Sinkron Kalender Kegiatan',
        };
        syncedCount++;
      } else {
        if (currentLiburMap[item.tanggalMasehi]) {
          delete currentLiburMap[item.tanggalMasehi];
        }
      }
    });
  });

  useAbsensiStore.setState({ liburMapByDate: currentLiburMap });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_CACHE_LIBUR, JSON.stringify(currentLiburMap));
    } catch {
      // Abaikan
    }
  }

  try {
    await supabase
      .from('app_settings')
      .upsert(
        { key: KEY_DB_LIBUR, value: currentLiburMap },
        { onConflict: 'key' }
      );
  } catch {
    // Abaikan jika sedang offline
  }

  return syncedCount;
}

export const useKalenderStore = create<KalenderState>((set, get) => ({
  modeKalender: 'MASEHI',
  activeTahunAjaran: '2026/2027',
  hijriOffsetByTA: {
    '2026/2027': 0,
    '2027/2028': 0,
    '2028/2029': 0,
    '2029/2030': 0,
  },
  aturanLiburByKode: initialAturan,
  agendaMapByTA: initialAgendaByTA,
  isLoading: false,
  isSyncingAbsensi: false,
  lastSyncedAt: undefined,

  setModeKalender: (mode) => {
    set({ modeKalender: mode });
  },

  setActiveTahunAjaran: (taMasehi) => {
    localMutationCounter++;
    const cleanTA = sanitizeTahunAjaranMasehi(taMasehi);
    const { agendaMapByTA, aturanLiburByKode, hijriOffsetByTA } = get();
    const nextAgendaByTA = { ...agendaMapByTA };

    if (!nextAgendaByTA[cleanTA]) {
      const allConfigs = getAllKnownTahunAjaranConfigs();
      const [startStr] = cleanTA.split('/');
      const startYr = parseInt(startStr, 10) || 2026;
      const startHijri = startYr - 579;
      const cfg = allConfigs.find((c) => c.tahunAjaranMasehi === cleanTA) || {
        tahunAjaranMasehi: cleanTA,
        tahunAjaranHijriyah: `${startHijri}/${startHijri + 1}`,
        startYearMasehi: startYr,
        startYearHijriyah: startHijri,
        hijriOffsetDays: 0,
      };
      const offset = hijriOffsetByTA[cleanTA] ?? 0;
      nextAgendaByTA[cleanTA] = generateAgendaTahunAjaran(
        { ...cfg, hijriOffsetDays: offset },
        aturanLiburByKode
      );
    }

    set({
      activeTahunAjaran: cleanTA,
      agendaMapByTA: nextAgendaByTA,
    });

    // Sinkronkan juga ke useTahunAjaranStore global
    if (useTahunAjaranStore.getState().activeTahunAjaran !== cleanTA) {
      void useTahunAjaranStore.getState().setGlobalTahunAjaran({
        activeTahunAjaran: cleanTA,
        actorName: 'Kalender Kegiatan',
      });
    }

    void persistKalenderState({
      activeTahunAjaran: cleanTA,
      hijriOffsetByTA,
      aturanLiburByKode,
      agendaMapByTA: nextAgendaByTA,
    });
  },

  getCurrentTAConfig: () => {
    const { activeTahunAjaran, hijriOffsetByTA } = get();
    const cleanTA = sanitizeTahunAjaranMasehi(activeTahunAjaran);
    const allConfigs = getAllKnownTahunAjaranConfigs();
    const [startStr] = cleanTA.split('/');
    const startYr = parseInt(startStr, 10) || 2026;
    const startHijri = startYr - 579;

    const base = allConfigs.find((c) => c.tahunAjaranMasehi === cleanTA) || {
      tahunAjaranMasehi: cleanTA,
      tahunAjaranHijriyah: `${startHijri}/${startHijri + 1}`,
      startYearMasehi: startYr,
      startYearHijriyah: startHijri,
      hijriOffsetDays: 0,
    };
    return {
      ...base,
      hijriOffsetDays: hijriOffsetByTA[cleanTA] ?? 0,
    };
  },

  getCurrentAgendaMap: () => {
    const { activeTahunAjaran, agendaMapByTA } = get();
    const cleanTA = sanitizeTahunAjaranMasehi(activeTahunAjaran);
    const cfg = get().getCurrentTAConfig();
    const minDate = `${cfg.startYearMasehi}-05-20`;
    const maxDate = `${cfg.startYearMasehi + 1}-07-05`;

    const baseMap = { ...(agendaMapByTA[cleanTA] || {}) };

    // Gabungkan juga hari libur manual yang diinput langsung dari halaman Absensi Asatidz pada rentang TA aktif
    const liburMap = useAbsensiStore.getState().liburMapByDate || {};
    Object.entries(liburMap).forEach(([tgl, info]) => {
      if (!info) return;
      if (tgl < minDate || tgl > maxDate) return;
      if (
        info.diinputOleh === 'Sinkron Kalender Kegiatan' ||
        info.diinputOleh === 'Kalender Kegiatan' ||
        info.diinputOleh === 'PKM. Kurikulum'
      ) {
        return;
      }
      if (!baseMap[tgl]) {
        baseMap[tgl] = {
          tanggalMasehi: tgl,
          kode: 'CUSTOM',
          namaKegiatan: info.keterangan || info.kategori || 'Hari Libur KBM',
          isLiburKbm: true,
          kategoriLibur:
            (info.kategori as KategoriLiburAbsensi) || 'Libur Pondok',
          catatan: 'Diinput dari Pengaturan Libur Absensi',
          updatedBy: info.diinputOleh,
        };
      }
    });

    return baseMap;
  },

  fetchKalenderData: async () => {
    const fetchStartMutationCount = localMutationCounter;
    set({ isLoading: true });
    await useTahunAjaranStore.getState().fetchGlobalTahunAjaran();
    const globalTAState = useTahunAjaranStore.getState();

    let loaded: Partial<KalenderPersistedPayload> | null = null;

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LS_CACHE_KALENDER);
        if (cached) {
          loaded = JSON.parse(cached);
        }
      } catch {
        // Abaikan
      }
    }

    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', KEY_DB_KALENDER)
        .maybeSingle();

      if (data?.value) {
        const parsed =
          typeof data.value === 'string'
            ? JSON.parse(data.value)
            : (data.value as Partial<KalenderPersistedPayload>);
        if (parsed && typeof parsed === 'object') {
          loaded = parsed;
        }
      }
    } catch {
      // Gunakan fallback cache / default
    }

    // Jika pengguna sudah melakukan aksi hapus/ubah saat fetch sedang berlangsung, jangan timpa state terbaru
    if (localMutationCounter !== fetchStartMutationCount) {
      set({ isLoading: false, lastSyncedAt: formatWaktuSekarangWIB() });
      return;
    }

    const mergedAturan: Record<KodeKegiatanKalender, boolean> = {
      ...buildDefaultAturanLibur(),
      ...(loaded?.aturanLiburByKode || {}),
    };

    const mergedOffsets: Record<string, number> = {
      '2026/2027': 0,
      '2027/2028': 0,
      '2028/2029': 0,
      '2029/2030': 0,
      ...(loaded?.hijriOffsetByTA || {}),
    };

    const defaultAgendaByTA = buildInitialAgendaMapByTA(
      mergedAturan,
      mergedOffsets
    );
    const mergedAgendaByTA: Record<
      string,
      Record<string, AgendaKalenderItem>
    > = {
      ...defaultAgendaByTA,
      ...(loaded?.agendaMapByTA || {}),
    };

    // Hapus kunci lama 2025/2026 agar tidak mencemari sinkronisasi
    delete mergedAgendaByTA['2025/2026'];

    getAllKnownTahunAjaranConfigs().forEach((cfg) => {
      if (
        !mergedAgendaByTA[cfg.tahunAjaranMasehi] &&
        loaded?.agendaMapByTA?.[cfg.tahunAjaranMasehi] === undefined
      ) {
        mergedAgendaByTA[cfg.tahunAjaranMasehi] =
          defaultAgendaByTA[cfg.tahunAjaranMasehi];
      }
    });

    // Prioritaskan Tahun Ajaran Global dari Pengaturan (dan koreksi paksa 2025/2026 ke 2026/2027)
    const activeTA = sanitizeTahunAjaranMasehi(
      globalTAState.activeTahunAjaran || loaded?.activeTahunAjaran
    );

    set({
      activeTahunAjaran: activeTA,
      hijriOffsetByTA: mergedOffsets,
      aturanLiburByKode: mergedAturan,
      agendaMapByTA: mergedAgendaByTA,
      isLoading: false,
    });

    await pushAgendaLiburToAbsensiStore(
      mergedAgendaByTA,
      'Sinkron Kalender Kegiatan'
    );
    set({ lastSyncedAt: formatWaktuSekarangWIB() });
  },

  upsertRentangAgenda: async ({
    startYMD,
    endYMD,
    kode,
    namaKegiatan,
    isLiburKbm,
    kategoriLibur,
    catatan,
    actorName = 'PKM. Kurikulum',
  }) => {
    localMutationCounter++;
    const prev = get();
    const prevSnapshot: KalenderPersistedPayload = {
      activeTahunAjaran: prev.activeTahunAjaran,
      hijriOffsetByTA: { ...prev.hijriOffsetByTA },
      aturanLiburByKode: { ...prev.aturanLiburByKode },
      agendaMapByTA: JSON.parse(JSON.stringify(prev.agendaMapByTA)),
    };

    const meta = KATALOG_ATURAN_KEGIATAN[kode];
    const currentTAMap = {
      ...(prev.agendaMapByTA[prev.activeTahunAjaran] || {}),
    };

    const actualStart = startYMD <= endYMD ? startYMD : endYMD;
    const actualEnd = startYMD <= endYMD ? endYMD : startYMD;

    let curr = actualStart;
    while (curr <= actualEnd) {
      currentTAMap[curr] = {
        tanggalMasehi: curr,
        kode,
        namaKegiatan: namaKegiatan?.trim() || meta.namaKegiatan,
        isLiburKbm,
        kategoriLibur,
        catatan: catatan?.trim() || undefined,
        isAutoGenerated: false,
        updatedAt: new Date().toISOString(),
        updatedBy: actorName,
      };
      curr = addDaysYMD(curr, 1);
    }

    const nextAgendaByTA = {
      ...prev.agendaMapByTA,
      [prev.activeTahunAjaran]: currentTAMap,
    };

    const nextSnapshot: KalenderPersistedPayload = {
      activeTahunAjaran: prev.activeTahunAjaran,
      hijriOffsetByTA: prev.hijriOffsetByTA,
      aturanLiburByKode: prev.aturanLiburByKode,
      agendaMapByTA: nextAgendaByTA,
    };

    set({ agendaMapByTA: nextAgendaByTA });
    await persistKalenderState(nextSnapshot);
    await pushAgendaLiburToAbsensiStore(nextAgendaByTA, actorName);
    set({ lastSyncedAt: formatWaktuSekarangWIB() });

    useUndoRedoStore.getState().recordAction({
      module: 'umum',
      title: `Simpan Agenda Kalender ${kode} (${actualStart})`,
      undo: async () => {
        set({
          activeTahunAjaran: prevSnapshot.activeTahunAjaran,
          hijriOffsetByTA: prevSnapshot.hijriOffsetByTA,
          aturanLiburByKode: prevSnapshot.aturanLiburByKode,
          agendaMapByTA: prevSnapshot.agendaMapByTA,
        });
        await persistKalenderState(prevSnapshot);
        await pushAgendaLiburToAbsensiStore(prevSnapshot.agendaMapByTA, actorName);
        return true;
      },
      redo: async () => {
        set({
          activeTahunAjaran: nextSnapshot.activeTahunAjaran,
          hijriOffsetByTA: nextSnapshot.hijriOffsetByTA,
          aturanLiburByKode: nextSnapshot.aturanLiburByKode,
          agendaMapByTA: nextSnapshot.agendaMapByTA,
        });
        await persistKalenderState(nextSnapshot);
        await pushAgendaLiburToAbsensiStore(nextSnapshot.agendaMapByTA, actorName);
        return true;
      },
    });

    await logActivity(
      'UPDATE_KALENDER_KEGIATAN',
      `Menyimpan agenda [${kode}] ${
        namaKegiatan || meta.namaKegiatan
      } pada ${actualStart} s/d ${actualEnd} (Libur KBM: ${
        isLiburKbm ? 'Ya' : 'Tidak'
      })`
    );
  },

  deleteAgendaTanggal: async (tanggalYMD, actorName = 'PKM. Kurikulum') => {
    await get().deleteMultipleAgendaTanggal([tanggalYMD], actorName);
  },

  deleteMultipleAgendaTanggal: async (
    tanggalYMDList,
    actorName = 'PKM. Kurikulum'
  ) => {
    if (!Array.isArray(tanggalYMDList) || tanggalYMDList.length === 0) return;
    localMutationCounter++;
    const prev = get();
    const prevSnapshot: KalenderPersistedPayload = {
      activeTahunAjaran: prev.activeTahunAjaran,
      hijriOffsetByTA: { ...prev.hijriOffsetByTA },
      aturanLiburByKode: { ...prev.aturanLiburByKode },
      agendaMapByTA: JSON.parse(JSON.stringify(prev.agendaMapByTA)),
    };

    const currentTAMap = {
      ...(prev.agendaMapByTA[prev.activeTahunAjaran] || {}),
    };

    for (const tgl of tanggalYMDList) {
      delete currentTAMap[tgl];
      await useAbsensiStore.getState().setHariLibur(tgl, null, actorName, true);
    }

    const nextAgendaByTA = {
      ...prev.agendaMapByTA,
      [prev.activeTahunAjaran]: currentTAMap,
    };

    const nextSnapshot: KalenderPersistedPayload = {
      activeTahunAjaran: prev.activeTahunAjaran,
      hijriOffsetByTA: prev.hijriOffsetByTA,
      aturanLiburByKode: prev.aturanLiburByKode,
      agendaMapByTA: nextAgendaByTA,
    };

    set({ agendaMapByTA: nextAgendaByTA });
    await persistKalenderState(nextSnapshot);
    await pushAgendaLiburToAbsensiStore(nextAgendaByTA, actorName);
    set({ lastSyncedAt: formatWaktuSekarangWIB() });

    useUndoRedoStore.getState().recordAction({
      module: 'umum',
      title: `Hapus ${tanggalYMDList.length} Agenda Kalender`,
      undo: async () => {
        set({
          activeTahunAjaran: prevSnapshot.activeTahunAjaran,
          hijriOffsetByTA: prevSnapshot.hijriOffsetByTA,
          aturanLiburByKode: prevSnapshot.aturanLiburByKode,
          agendaMapByTA: prevSnapshot.agendaMapByTA,
        });
        await persistKalenderState(prevSnapshot);
        await pushAgendaLiburToAbsensiStore(prevSnapshot.agendaMapByTA, actorName);
        return true;
      },
      redo: async () => {
        set({
          activeTahunAjaran: nextSnapshot.activeTahunAjaran,
          hijriOffsetByTA: nextSnapshot.hijriOffsetByTA,
          aturanLiburByKode: nextSnapshot.aturanLiburByKode,
          agendaMapByTA: nextSnapshot.agendaMapByTA,
        });
        await persistKalenderState(nextSnapshot);
        await pushAgendaLiburToAbsensiStore(nextSnapshot.agendaMapByTA, actorName);
        return true;
      },
    });
  },

  clearAllAgendaTahunAjaran: async (
    taMasehi,
    actorName = 'PKM. Kurikulum'
  ) => {
    localMutationCounter++;
    const prev = get();
    const targetTA = taMasehi || prev.activeTahunAjaran;
    const prevSnapshot: KalenderPersistedPayload = {
      activeTahunAjaran: prev.activeTahunAjaran,
      hijriOffsetByTA: { ...prev.hijriOffsetByTA },
      aturanLiburByKode: { ...prev.aturanLiburByKode },
      agendaMapByTA: JSON.parse(JSON.stringify(prev.agendaMapByTA)),
    };

    const existingDates = Object.keys(prev.agendaMapByTA[targetTA] || {});
    for (const tgl of existingDates) {
      await useAbsensiStore.getState().setHariLibur(tgl, null, actorName, true);
    }

    const nextAgendaByTA = {
      ...prev.agendaMapByTA,
      [targetTA]: {},
    };

    const nextSnapshot: KalenderPersistedPayload = {
      activeTahunAjaran: prev.activeTahunAjaran,
      hijriOffsetByTA: prev.hijriOffsetByTA,
      aturanLiburByKode: prev.aturanLiburByKode,
      agendaMapByTA: nextAgendaByTA,
    };

    set({ agendaMapByTA: nextAgendaByTA });
    await persistKalenderState(nextSnapshot);
    await pushAgendaLiburToAbsensiStore(nextAgendaByTA, actorName);
    set({ lastSyncedAt: formatWaktuSekarangWIB() });

    useUndoRedoStore.getState().recordAction({
      module: 'umum',
      title: `Hapus Semua Agenda Kalender TA ${targetTA}`,
      undo: async () => {
        set({
          activeTahunAjaran: prevSnapshot.activeTahunAjaran,
          hijriOffsetByTA: prevSnapshot.hijriOffsetByTA,
          aturanLiburByKode: prevSnapshot.aturanLiburByKode,
          agendaMapByTA: prevSnapshot.agendaMapByTA,
        });
        await persistKalenderState(prevSnapshot);
        await pushAgendaLiburToAbsensiStore(prevSnapshot.agendaMapByTA, actorName);
        return true;
      },
      redo: async () => {
        set({
          activeTahunAjaran: nextSnapshot.activeTahunAjaran,
          hijriOffsetByTA: nextSnapshot.hijriOffsetByTA,
          aturanLiburByKode: nextSnapshot.aturanLiburByKode,
          agendaMapByTA: nextSnapshot.agendaMapByTA,
        });
        await persistKalenderState(nextSnapshot);
        await pushAgendaLiburToAbsensiStore(nextSnapshot.agendaMapByTA, actorName);
        return true;
      },
    });

    await logActivity(
      'CLEAR_ALL_KALENDER_TA',
      `Menghapus seluruh agenda Kalender Kegiatan pada Tahun Ajaran ${targetTA}`
    );
  },

  updateAturanLiburKode: async (
    nextAturan,
    nextHijriOffset,
    actorName = 'PKM. Kurikulum'
  ) => {
    const prev = get();
    const nextOffsets = {
      ...prev.hijriOffsetByTA,
      [prev.activeTahunAjaran]: nextHijriOffset,
    };

    const nextAgendaByTA: Record<
      string,
      Record<string, AgendaKalenderItem>
    > = {};

    Object.entries(prev.agendaMapByTA).forEach(([ta, taMap]) => {
      const updatedMap: Record<string, AgendaKalenderItem> = {};
      Object.entries(taMap).forEach(([tgl, item]) => {
        const shouldLibur =
          typeof nextAturan[item.kode] === 'boolean'
            ? nextAturan[item.kode]
            : item.isLiburKbm;
        updatedMap[tgl] = {
          ...item,
          isLiburKbm: shouldLibur,
        };
      });
      nextAgendaByTA[ta] = updatedMap;
    });

    if (
      (prev.hijriOffsetByTA[prev.activeTahunAjaran] ?? 0) !== nextHijriOffset
    ) {
      const cfg =
        getAllKnownTahunAjaranConfigs().find(
          (c) => c.tahunAjaranMasehi === prev.activeTahunAjaran
        ) || DAFTAR_TAHUN_AJARAN_KALENDER[0];
      nextAgendaByTA[prev.activeTahunAjaran] = generateAgendaTahunAjaran(
        { ...cfg, hijriOffsetDays: nextHijriOffset },
        nextAturan
      );
    }

    set({
      aturanLiburByKode: nextAturan,
      hijriOffsetByTA: nextOffsets,
      agendaMapByTA: nextAgendaByTA,
    });

    await persistKalenderState({
      activeTahunAjaran: prev.activeTahunAjaran,
      hijriOffsetByTA: nextOffsets,
      aturanLiburByKode: nextAturan,
      agendaMapByTA: nextAgendaByTA,
    });

    await pushAgendaLiburToAbsensiStore(nextAgendaByTA, actorName);
    set({ lastSyncedAt: formatWaktuSekarangWIB() });
  },

  regenerateTahunAjaranOtomatis: async (
    taMasehi,
    hijriOffsetDays,
    actorName = 'PKM. Kurikulum'
  ) => {
    const prev = get();
    const cleanTA = sanitizeTahunAjaranMasehi(taMasehi);
    const [startStr] = cleanTA.split('/');
    const startYr = parseInt(startStr, 10) || 2026;
    const startHijri = startYr - 579;
    const cfg = getAllKnownTahunAjaranConfigs().find(
      (c) => c.tahunAjaranMasehi === cleanTA
    ) || {
      tahunAjaranMasehi: cleanTA,
      tahunAjaranHijriyah: `${startHijri}/${startHijri + 1}`,
      startYearMasehi: startYr,
      startYearHijriyah: startHijri,
      hijriOffsetDays,
    };

    const generated = generateAgendaTahunAjaran(
      { ...cfg, hijriOffsetDays },
      prev.aturanLiburByKode
    );

    const nextOffsets = {
      ...prev.hijriOffsetByTA,
      [cleanTA]: hijriOffsetDays,
    };

    const nextAgendaByTA = {
      ...prev.agendaMapByTA,
      [cleanTA]: generated,
    };

    set({
      activeTahunAjaran: cleanTA,
      hijriOffsetByTA: nextOffsets,
      agendaMapByTA: nextAgendaByTA,
    });

    await persistKalenderState({
      activeTahunAjaran: cleanTA,
      hijriOffsetByTA: nextOffsets,
      aturanLiburByKode: prev.aturanLiburByKode,
      agendaMapByTA: nextAgendaByTA,
    });

    await pushAgendaLiburToAbsensiStore(nextAgendaByTA, actorName);
    set({ lastSyncedAt: formatWaktuSekarangWIB() });

    await logActivity(
      'GENERATE_KALENDER_TA_BARU',
      `Menyesuaikan otomatis Kalender Kegiatan Tahun Ajaran ${cleanTA} (Koreksi Hilal: ${hijriOffsetDays} hari)`
    );
  },

  syncKalenderToAbsensiLibur: async (actorName = 'PKM. Kurikulum') => {
    set({ isSyncingAbsensi: true });
    const count = await pushAgendaLiburToAbsensiStore(
      get().agendaMapByTA,
      actorName
    );
    set({
      isSyncingAbsensi: false,
      lastSyncedAt: formatWaktuSekarangWIB(),
    });
    return count;
  },
}));
