import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { TahunAjaranKalenderConfig } from '@/types/kalender';
import { DAFTAR_TAHUN_AJARAN_KALENDER } from '@/lib/utils/kalenderHijriyahHelper';

export const KEY_DB_GLOBAL_TA = 'MADIN_GLOBAL_TAHUN_AJARAN_V1';
export const LS_CACHE_GLOBAL_TA = 'MADIN_GLOBAL_TAHUN_AJARAN_CACHE_V1';

export type SemesterMadin =
  | 'Semester Ganjil (Daur Awwal)'
  | 'Semester Genap (Daur Tsani)';

export interface GlobalTahunAjaranPayload {
  activeTahunAjaran: string;
  semesterAktif: SemesterMadin;
  hijriOffsetDays: number;
  customTahunAjaranList: TahunAjaranKalenderConfig[];
  updatedAt?: string;
  updatedBy?: string;
}

interface TahunAjaranState {
  activeTahunAjaran: string;
  semesterAktif: SemesterMadin;
  hijriOffsetDays: number;
  daftarTahunAjaran: TahunAjaranKalenderConfig[];
  isLoading: boolean;
  lastSavedAt?: string;

  fetchGlobalTahunAjaran: () => Promise<void>;
  setGlobalTahunAjaran: (params: {
    activeTahunAjaran: string;
    semesterAktif?: SemesterMadin;
    hijriOffsetDays?: number;
    actorName?: string;
  }) => Promise<void>;
  addTahunAjaranBaru: (
    startYearMasehi: number,
    activateImmediately?: boolean,
    actorName?: string
  ) => Promise<TahunAjaranKalenderConfig>;
  getActiveConfig: () => TahunAjaranKalenderConfig;
  getFormattedHeaderBanner: () => string;
}

function normalizeActiveTA(
  rawTA: string | undefined,
  list: TahunAjaranKalenderConfig[]
): string {
  if (!rawTA || rawTA === '2025/2026' || rawTA === '2024/2025') {
    return '2026/2027';
  }
  const found = list.some((c) => c.tahunAjaranMasehi === rawTA);
  return found ? rawTA : '2026/2027';
}

function mergeTahunAjaranList(
  customList: TahunAjaranKalenderConfig[] = []
): TahunAjaranKalenderConfig[] {
  const map = new Map<string, TahunAjaranKalenderConfig>();
  DAFTAR_TAHUN_AJARAN_KALENDER.forEach((item) => {
    map.set(item.tahunAjaranMasehi, item);
  });
  customList.forEach((item) => {
    if (
      item &&
      item.tahunAjaranMasehi &&
      item.tahunAjaranMasehi !== '2025/2026' &&
      item.tahunAjaranMasehi !== '2024/2025'
    ) {
      map.set(item.tahunAjaranMasehi, item);
    }
  });
  return Array.from(map.values()).sort(
    (a, b) => a.startYearMasehi - b.startYearMasehi
  );
}

async function persistGlobalTahunAjaran(payload: GlobalTahunAjaranPayload) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LS_CACHE_GLOBAL_TA, JSON.stringify(payload));
    } catch {
      // Abaikan kuota LocalStorage
    }
  }
  try {
    await supabase
      .from('app_settings')
      .upsert(
        { key: KEY_DB_GLOBAL_TA, value: payload },
        { onConflict: 'key' }
      );
  } catch {
    // Fallback offline ke LocalStorage
  }
}

export const useTahunAjaranStore = create<TahunAjaranState>((set, get) => ({
  activeTahunAjaran: '2026/2027',
  semesterAktif: 'Semester Ganjil (Daur Awwal)',
  hijriOffsetDays: 0,
  daftarTahunAjaran: DAFTAR_TAHUN_AJARAN_KALENDER,
  isLoading: false,
  lastSavedAt: undefined,

  fetchGlobalTahunAjaran: async () => {
    set({ isLoading: true });
    let loaded: Partial<GlobalTahunAjaranPayload> | null = null;

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LS_CACHE_GLOBAL_TA);
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
        .eq('key', KEY_DB_GLOBAL_TA)
        .maybeSingle();

      if (data?.value) {
        const parsed =
          typeof data.value === 'string'
            ? JSON.parse(data.value)
            : (data.value as Partial<GlobalTahunAjaranPayload>);
        if (parsed && typeof parsed === 'object') {
          loaded = parsed;
        }
      }
    } catch {
      // Gunakan fallback cache / default
    }

    const mergedList = mergeTahunAjaranList(loaded?.customTahunAjaranList);
    const activeTA = normalizeActiveTA(loaded?.activeTahunAjaran, mergedList);
    const semester: SemesterMadin =
      loaded?.semesterAktif === 'Semester Genap (Daur Tsani)'
        ? 'Semester Genap (Daur Tsani)'
        : 'Semester Ganjil (Daur Awwal)';
    const offset =
      typeof loaded?.hijriOffsetDays === 'number' ? loaded.hijriOffsetDays : 0;

    set({
      activeTahunAjaran: activeTA,
      semesterAktif: semester,
      hijriOffsetDays: offset,
      daftarTahunAjaran: mergedList,
      isLoading: false,
      lastSavedAt: loaded?.updatedAt,
    });
  },

  setGlobalTahunAjaran: async ({
    activeTahunAjaran,
    semesterAktif,
    hijriOffsetDays,
    actorName = 'Administrator Pengaturan',
  }) => {
    const state = get();
    const nextList = state.daftarTahunAjaran;
    const cleanTA = normalizeActiveTA(activeTahunAjaran, nextList);
    const nextSemester = semesterAktif || state.semesterAktif;
    const nextOffset =
      typeof hijriOffsetDays === 'number'
        ? hijriOffsetDays
        : state.hijriOffsetDays;
    const nowISO = new Date().toISOString();

    set({
      activeTahunAjaran: cleanTA,
      semesterAktif: nextSemester,
      hijriOffsetDays: nextOffset,
      lastSavedAt: nowISO,
    });

    await persistGlobalTahunAjaran({
      activeTahunAjaran: cleanTA,
      semesterAktif: nextSemester,
      hijriOffsetDays: nextOffset,
      customTahunAjaranList: nextList,
      updatedAt: nowISO,
      updatedBy: actorName,
    });

    await logActivity(
      'UPDATE_TAHUN_AJARAN_GLOBAL',
      `Menetapkan Tahun Ajaran Aktif Global menjadi ${cleanTA} (${nextSemester}) oleh ${actorName}`
    );
  },

  addTahunAjaranBaru: async (
    startYearMasehi,
    activateImmediately = true,
    actorName = 'Administrator Pengaturan'
  ) => {
    const endYearMasehi = startYearMasehi + 1;
    const startYearHijriyah = startYearMasehi - 579;
    const endYearHijriyah = startYearHijriyah + 1;
    const newConfig: TahunAjaranKalenderConfig = {
      tahunAjaranMasehi: `${startYearMasehi}/${endYearMasehi}`,
      tahunAjaranHijriyah: `${startYearHijriyah}/${endYearHijriyah}`,
      startYearMasehi,
      startYearHijriyah,
      hijriOffsetDays: 0,
    };

    const state = get();
    const mergedList = mergeTahunAjaranList([
      ...state.daftarTahunAjaran,
      newConfig,
    ]);
    const nextActive = activateImmediately
      ? newConfig.tahunAjaranMasehi
      : state.activeTahunAjaran;
    const nowISO = new Date().toISOString();

    set({
      daftarTahunAjaran: mergedList,
      activeTahunAjaran: nextActive,
      lastSavedAt: nowISO,
    });

    await persistGlobalTahunAjaran({
      activeTahunAjaran: nextActive,
      semesterAktif: state.semesterAktif,
      hijriOffsetDays: state.hijriOffsetDays,
      customTahunAjaranList: mergedList,
      updatedAt: nowISO,
      updatedBy: actorName,
    });

    await logActivity(
      'ADD_TAHUN_AJARAN_BARU',
      `Menambahkan Tahun Ajaran baru ${newConfig.tahunAjaranMasehi} (${newConfig.tahunAjaranHijriyah} H)`
    );

    return newConfig;
  },

  getActiveConfig: () => {
    const { activeTahunAjaran, daftarTahunAjaran, hijriOffsetDays } = get();
    const found =
      daftarTahunAjaran.find((c) => c.tahunAjaranMasehi === activeTahunAjaran) ||
      daftarTahunAjaran[0] ||
      DAFTAR_TAHUN_AJARAN_KALENDER[0];
    return {
      ...found,
      hijriOffsetDays,
    };
  },

  getFormattedHeaderBanner: () => {
    const cfg = get().getActiveConfig();
    const masehiDash = cfg.tahunAjaranMasehi.replace('/', '-');
    const hijriDash = cfg.tahunAjaranHijriyah.replace('/', '-');
    return `TAHUN AJARAN ${masehiDash} M / ${hijriDash} H`;
  },
}));
