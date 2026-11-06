import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import {
  useAbsensiStore,
  KEY_DB_LIBUR,
  LS_CACHE_LIBUR,
} from '@/stores/useAbsensiStore';
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

export const KEY_DB_KALENDER = 'MADIN_KALENDER_KEGIATAN_V1';
export const LS_CACHE_KALENDER = 'MADIN_KALENDER_KEGIATAN_CACHE_V1';

function buildDefaultAturanLibur(): Record<KodeKegiatanKalender, boolean> {
  const map = {} as Record<KodeKegiatanKalender, boolean>;
  (Object.keys(KATALOG_ATURAN_KEGIATAN) as KodeKegiatanKalender[]).forEach(
    (k) => {
      map[k] = KATALOG_ATURAN_KEGIATAN[k].defaultIsLiburKbm;
    }
  );
  return map;
}

function buildInitialAgendaMapByTA(
  aturanLibur: Record<KodeKegiatanKalender, boolean>,
  offsets: Record<string, number> = {}
): Record<string, Record<string, AgendaKalenderItem>> {
  const result: Record<string, Record<string, AgendaKalenderItem>> = {};
  DAFTAR_TAHUN_AJARAN_KALENDER.forEach((cfg) => {
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
      info?.diinputOleh === 'Kalender Kegiatan'
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
          diinputOleh: actorName || 'Sinkron Kalender Kegiatan',
        };
        syncedCount++;
      } else {
        // Jika tanggal tersebut sebelumnya ada di liburMap dari sinkron kalender dan kini diubah menjadi Masuk, pastikan terhapus
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
  activeTahunAjaran: '2025/2026',
  hijriOffsetByTA: {
    '2025/2026': 0,
    '2026/2027': 0,
    '2027/2028': 0,
    '2028/2029': 0,
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
    const { agendaMapByTA, aturanLiburByKode, hijriOffsetByTA } = get();
    const nextAgendaByTA = { ...agendaMapByTA };

    if (!nextAgendaByTA[taMasehi]) {
      const cfg =
        DAFTAR_TAHUN_AJARAN_KALENDER.find(
          (c) => c.tahunAjaranMasehi === taMasehi
        ) || DAFTAR_TAHUN_AJARAN_KALENDER[0];
      const offset = hijriOffsetByTA[taMasehi] ?? 0;
      nextAgendaByTA[taMasehi] = generateAgendaTahunAjaran(
        { ...cfg, hijriOffsetDays: offset },
        aturanLiburByKode
      );
    }

    set({
      activeTahunAjaran: taMasehi,
      agendaMapByTA: nextAgendaByTA,
    });
  },

  getCurrentTAConfig: () => {
    const { activeTahunAjaran, hijriOffsetByTA } = get();
    const base =
      DAFTAR_TAHUN_AJARAN_KALENDER.find(
        (c) => c.tahunAjaranMasehi === activeTahunAjaran
      ) || DAFTAR_TAHUN_AJARAN_KALENDER[0];
    return {
      ...base,
      hijriOffsetDays: hijriOffsetByTA[activeTahunAjaran] ?? 0,
    };
  },

  getCurrentAgendaMap: () => {
    const { activeTahunAjaran, agendaMapByTA } = get();
    const cfg = get().getCurrentTAConfig();
    const minDate = `${cfg.startYearMasehi}-05-20`;
    const maxDate = `${cfg.startYearMasehi + 1}-07-05`;

    const baseMap = { ...(agendaMapByTA[activeTahunAjaran] || {}) };

    // Gabungkan juga hari libur manual yang diinput langsung dari halaman Absensi Asatidz (Gambar 3) pada rentang TA aktif
    const liburMap = useAbsensiStore.getState().liburMapByDate || {};
    Object.entries(liburMap).forEach(([tgl, info]) => {
      if (!info) return;
      if (tgl < minDate || tgl > maxDate) return;
      if (info.diinputOleh === 'Sinkron Kalender Kegiatan') return;
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
    set({ isLoading: true });
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

    const mergedAturan: Record<KodeKegiatanKalender, boolean> = {
      ...buildDefaultAturanLibur(),
      ...(loaded?.aturanLiburByKode || {}),
    };

    const mergedOffsets: Record<string, number> = {
      '2025/2026': 0,
      '2026/2027': 0,
      '2027/2028': 0,
      '2028/2029': 0,
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

    // Pastikan setiap TA di DAFTAR_TAHUN_AJARAN_KALENDER terisi
    DAFTAR_TAHUN_AJARAN_KALENDER.forEach((cfg) => {
      if (
        !mergedAgendaByTA[cfg.tahunAjaranMasehi] ||
        Object.keys(mergedAgendaByTA[cfg.tahunAjaranMasehi]).length === 0
      ) {
        mergedAgendaByTA[cfg.tahunAjaranMasehi] =
          defaultAgendaByTA[cfg.tahunAjaranMasehi];
      }
    });

    const activeTA = loaded?.activeTahunAjaran || '2025/2026';

    set({
      activeTahunAjaran: activeTA,
      hijriOffsetByTA: mergedOffsets,
      aturanLiburByKode: mergedAturan,
      agendaMapByTA: mergedAgendaByTA,
      isLoading: false,
    });

    // Pastikan data absensi libur langsung tersinkron
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
    const prev = get();
    const currentTAMap = {
      ...(prev.agendaMapByTA[prev.activeTahunAjaran] || {}),
    };
    delete currentTAMap[tanggalYMD];

    const nextAgendaByTA = {
      ...prev.agendaMapByTA,
      [prev.activeTahunAjaran]: currentTAMap,
    };

    set({ agendaMapByTA: nextAgendaByTA });

    // Hapus juga dari liburMapByDate di useAbsensiStore bila ada
    await useAbsensiStore.getState().setHariLibur(tanggalYMD, null, actorName, true);

    await persistKalenderState({
      activeTahunAjaran: prev.activeTahunAjaran,
      hijriOffsetByTA: prev.hijriOffsetByTA,
      aturanLiburByKode: prev.aturanLiburByKode,
      agendaMapByTA: nextAgendaByTA,
    });
    await pushAgendaLiburToAbsensiStore(nextAgendaByTA, actorName);
    set({ lastSyncedAt: formatWaktuSekarangWIB() });
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

    // Perbarui status isLiburKbm pada seluruh agenda sesuai aturan baru
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

    // Jika koreksi hilal (hijriOffsetDays) pada TA aktif berubah, sesuaikan tanggal otomatis TA aktif
    if (
      (prev.hijriOffsetByTA[prev.activeTahunAjaran] ?? 0) !== nextHijriOffset
    ) {
      const cfg =
        DAFTAR_TAHUN_AJARAN_KALENDER.find(
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
    const cfg =
      DAFTAR_TAHUN_AJARAN_KALENDER.find(
        (c) => c.tahunAjaranMasehi === taMasehi
      ) || DAFTAR_TAHUN_AJARAN_KALENDER[0];

    const generated = generateAgendaTahunAjaran(
      { ...cfg, hijriOffsetDays },
      prev.aturanLiburByKode
    );

    const nextOffsets = {
      ...prev.hijriOffsetByTA,
      [taMasehi]: hijriOffsetDays,
    };

    const nextAgendaByTA = {
      ...prev.agendaMapByTA,
      [taMasehi]: generated,
    };

    set({
      activeTahunAjaran: taMasehi,
      hijriOffsetByTA: nextOffsets,
      agendaMapByTA: nextAgendaByTA,
    });

    await persistKalenderState({
      activeTahunAjaran: taMasehi,
      hijriOffsetByTA: nextOffsets,
      aturanLiburByKode: prev.aturanLiburByKode,
      agendaMapByTA: nextAgendaByTA,
    });

    await pushAgendaLiburToAbsensiStore(nextAgendaByTA, actorName);
    set({ lastSyncedAt: formatWaktuSekarangWIB() });

    await logActivity(
      'GENERATE_KALENDER_TA_BARU',
      `Menyesuaikan otomatis Kalender Kegiatan Tahun Ajaran ${taMasehi} (Koreksi Hilal: ${hijriOffsetDays} hari)`
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
