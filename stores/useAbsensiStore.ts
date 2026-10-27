/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import {
  JamKbm,
  StatusAbsensi,
  RecordSesiAbsensi,
  HariLiburInfo,
  SesiJadwalHarian,
  StatusSesiData,
  RiwayatAbsensiItem,
  BucketAbsensiCompact,
} from '@/types/absensi';
import { Asatidz } from '@/types/asatidz';
import { Formasi } from '@/types/formasi';
import { FanConfigMap } from '@/types/fan';
import { TeacherJadwalRow, KelasKbmItem } from '@/types/jadwal';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import {
  getDefaultTanggalAbsensi,
  getNamaHariDariTgl,
  formatWaktuSekarangWIB,
  getSesiKey,
  packSesiToCompactArray,
  unpackCompactArrayToSesi,
  ekstraksiSesiJadwalHariIni,
} from '@/lib/utils/absensiHelper';
import { RelationalMigrationService } from '@/lib/services/relationalMigrationService';

export const KEY_DB_ABSENSI = 'ABSENSI_ASATIDZ_DATA';
export const KEY_DB_LIBUR = 'PENGATURAN_LIBUR_MADIN';
export const LS_CACHE_ABSENSI = 'MADIN_ABSENSI_ASATIDZ_DATA';
export const LS_CACHE_LIBUR = 'MADIN_PENGATURAN_LIBUR';

/**
 * Mengonversi rawBucketMap (V3 maupun Legacy) menjadi absensiMapByDate
 * untuk kompatibilitas dengan halaman Rekap Absensi (/rekap-absensi)
 */
function buildLegacyAbsensiMapByDate(
  rawBucketMap: Record<string, any>
): Record<string, Record<JamKbm, RecordSesiAbsensi[]>> {
  const map: Record<string, Record<JamKbm, RecordSesiAbsensi[]>> = {};
  if (!rawBucketMap || typeof rawBucketMap !== 'object') return map;

  const ensureDateBucket = (tgl: string) => {
    if (!map[tgl]) {
      map[tgl] = { 1: [], 2: [], 3: [], 4: [] };
    }
  };

  Object.entries(rawBucketMap).forEach(([key, val]) => {
    if (!val || typeof val !== 'object') return;

    if (Array.isArray(val.data)) {
      const [kTgl, kJam] = key.split('|');
      const tanggal = String(val.tanggal || kTgl || '');
      const hari = String(val.hari || getNamaHariDariTgl(tanggal));
      const jamKe = String(val.jamKe || kJam || 'Jam 1');
      const mJam = jamKe.match(/\d+/);
      const jamNum = (mJam ? parseInt(mJam[0], 10) : 1) as JamKbm;
      if (!tanggal || jamNum < 1 || jamNum > 4) return;

      ensureDateBucket(tanggal);
      val.data.forEach((tuple: unknown) => {
        const item = unpackCompactArrayToSesi(tuple, tanggal, hari, jamKe);
        if (!item) return;
        map[tanggal][jamNum].push({
          id: item.id,
          nia: item.nia,
          nama_asatidz: item.nama,
          kelas: item.kelasMengajar,
          fan: item.fan,
          lokasi: item.lokasi,
          blok: item.blok,
          tingkat: item.tingkat,
          dinKls: item.dinKls,
          dinBag: item.dinBag,
          gender: item.gender,
          jam: jamNum,
          status: item.status,
          menit_terlambat: item.menitTerlambat ? parseInt(item.menitTerlambat, 10) || 0 : 0,
          asatidz_pengganti: item.namaPengganti,
          keterangan: item.keterangan,
          diinput_oleh: item.diinputOleh,
          updated_at: item.waktuUpdate || item.timestamp,
        });
      });
    } else {
      // Format legacy: key adalah tanggal "YYYY-MM-DD"
      const tanggal = key;
      ensureDateBucket(tanggal);
      ([1, 2, 3, 4] as JamKbm[]).forEach((jamNum) => {
        const arr = val[jamNum] || val[String(jamNum)];
        if (Array.isArray(arr)) {
          arr.forEach((rec: any) => {
            const item = unpackCompactArrayToSesi(rec, tanggal, getNamaHariDariTgl(tanggal), `Jam ${jamNum}`);
            if (!item) return;
            map[tanggal][jamNum].push({
              id: item.id,
              nia: item.nia,
              nama_asatidz: item.nama,
              kelas: item.kelasMengajar,
              fan: item.fan,
              lokasi: item.lokasi,
              blok: item.blok,
              tingkat: item.tingkat,
              dinKls: item.dinKls,
              dinBag: item.dinBag,
              gender: item.gender,
              jam: jamNum,
              status: item.status,
              menit_terlambat: item.menitTerlambat ? parseInt(item.menitTerlambat, 10) || 0 : 0,
              asatidz_pengganti: item.namaPengganti,
              keterangan: item.keterangan,
              diinput_oleh: item.diinputOleh,
              updated_at: item.waktuUpdate || item.timestamp,
            });
          });
        }
      });
    }
  });

  return map;
}

/**
 * Membangun peta savedRecords untuk tanggal aktif dari rawBucketMap
 */
function buildSavedRecordsForDate(
  tanggal: string,
  rawBucketMap: Record<string, any>
): Record<string, RiwayatAbsensiItem> {
  const saved: Record<string, RiwayatAbsensiItem> = {};
  if (!tanggal || !rawBucketMap) return saved;
  const hari = getNamaHariDariTgl(tanggal);

  ([1, 2, 3, 4] as JamKbm[]).forEach((jamNum) => {
    const jamKe = `Jam ${jamNum}`;
    const bucketKey = `${tanggal}|${jamKe}`;
    const bucket = rawBucketMap[bucketKey];

    if (bucket && Array.isArray(bucket.data)) {
      bucket.data.forEach((tuple: unknown) => {
        const item = unpackCompactArrayToSesi(tuple, tanggal, hari, jamKe);
        if (!item) return;
        const sKey = getSesiKey(tanggal, {
          nama: item.nama,
          jamKe: item.jamKe,
          kelasMengajar: item.kelasMengajar,
          fan: item.fan,
        });
        saved[sKey] = item;
      });
    } else if (rawBucketMap[tanggal]) {
      const legacyArr = rawBucketMap[tanggal][jamNum] || rawBucketMap[tanggal][String(jamNum)];
      if (Array.isArray(legacyArr)) {
        legacyArr.forEach((rec: unknown) => {
          const item = unpackCompactArrayToSesi(rec, tanggal, hari, jamKe);
          if (!item) return;
          const sKey = getSesiKey(tanggal, {
            nama: item.nama,
            jamKe: item.jamKe,
            kelasMengajar: item.kelasMengajar,
            fan: item.fan,
          });
          saved[sKey] = item;
        });
      }
    }
  });

  return saved;
}

/**
 * Menghitung status tersimpan (savedJams) dan kunci bertahap (unlockedJams)
 */
function computeJamLocks(
  tanggal: string,
  sesiHariIni: Record<JamKbm, SesiJadwalHarian[]>,
  savedRecords: Record<string, RiwayatAbsensiItem>,
  currentForceUnlocked?: Record<JamKbm, boolean>
): {
  savedJams: Record<JamKbm, boolean>;
  unlockedJams: Record<JamKbm, boolean>;
} {
  const savedJams: Record<JamKbm, boolean> = { 1: false, 2: false, 3: false, 4: false };

  ([1, 2, 3, 4] as JamKbm[]).forEach((j) => {
    const listSesi = sesiHariIni[j] || [];
    if (listSesi.length === 0) {
      savedJams[j] = false;
      return;
    }
    const adaTersimpan = listSesi.some((s) => {
      const k = getSesiKey(tanggal, s);
      return Boolean(savedRecords[k]);
    });
    const semuaTersimpan = listSesi.every((s) => {
      const k = getSesiKey(tanggal, s);
      return Boolean(savedRecords[k]);
    });
    savedJams[j] = semuaTersimpan || adaTersimpan;
  });

  const unlockedJams: Record<JamKbm, boolean> = {
    1: true,
    2: Boolean(
      currentForceUnlocked?.[2] ||
        (sesiHariIni[1]?.length || 0) === 0 ||
        savedJams[1] ||
        savedJams[2]
    ),
    3: Boolean(
      currentForceUnlocked?.[3] ||
        (sesiHariIni[2]?.length || 0) === 0 ||
        savedJams[2] ||
        savedJams[3]
    ),
    4: Boolean(
      currentForceUnlocked?.[4] ||
        (sesiHariIni[3]?.length || 0) === 0 ||
        savedJams[3] ||
        savedJams[4]
    ),
  };

  return { savedJams, unlockedJams };
}

interface AbsensiState {
  selectedDate: string;
  hari: string;
  selectedJam: JamKbm;
  isLoading: boolean;

  rawBucketMap: Record<string, BucketAbsensiCompact>;
  absensiMapByDate: Record<string, Record<JamKbm, RecordSesiAbsensi[]>>;
  liburMapByDate: Record<string, HariLiburInfo>;

  sesiHariIni: Record<JamKbm, SesiJadwalHarian[]>;
  savedRecords: Record<string, RiwayatAbsensiItem>;
  pendingStatus: Record<string, StatusSesiData>;
  unlockedJams: Record<JamKbm, boolean>;
  forceUnlockedJams: Record<JamKbm, boolean>;
  savedJams: Record<JamKbm, boolean>;

  // Cached master references for auto-resync when date changes
  _cachedMaster: {
    asatidzList: Asatidz[];
    jadwalMap: Record<string, TeacherJadwalRow>;
    formasiList: Formasi[];
    fanConfig: FanConfigMap;
    masterStrukturKelasKBM?: KelasKbmItem[];
  };

  setSelectedDate: (date: string) => void;
  setSelectedJam: (jam: JamKbm) => void;
  fetchAbsensi: (forceRefresh?: boolean | unknown) => Promise<void>;
  syncSesiHariIni: (
    asatidzList: Asatidz[],
    jadwalMap: Record<string, TeacherJadwalRow>,
    formasiList: Formasi[],
    fanConfig: FanConfigMap,
    masterStrukturKelasKBM?: KelasKbmItem[]
  ) => void;

  getSesiStatusData: (sesi: SesiJadwalHarian) => StatusSesiData;
  setSesiStatusData: (sesi: SesiJadwalHarian, partial: Partial<StatusSesiData>) => void;
  terapkanStatusMassal: (jam: JamKbm, keys: string[], status: StatusAbsensi) => void;
  tandaiSemuaHadirJam: (jam: JamKbm) => void;
  bukaPaksaKunciJam: (jam: JamKbm) => void;

  simpanAbsensiJam: (
    jam: JamKbm,
    actorName?: string,
    skipHistory?: boolean
  ) => Promise<{ success: boolean; count: number; message?: string }>;
  editRekamanRiwayat: (
    id: string,
    updates: {
      status: StatusAbsensi;
      menitTerlambat?: string;
      namaPengganti?: string;
      keterangan?: string;
    },
    actorName?: string,
    skipHistory?: boolean
  ) => Promise<boolean>;
  hapusRekamanRiwayat: (id: string, skipHistory?: boolean) => Promise<boolean>;

  saveAbsensiJam: (date: string, jam: JamKbm, records: RecordSesiAbsensi[]) => Promise<boolean>;
  setHariLibur: (
    date: string,
    info: HariLiburInfo | null,
    actorName?: string,
    skipHistory?: boolean
  ) => Promise<boolean>;
  restoreAbsensiRawMap: (
    targetRawMap: Record<string, BucketAbsensiCompact>,
    logDesc?: string
  ) => Promise<boolean>;
  restoreAbsensiBucket: (
    bucketKey: string,
    bucketData: BucketAbsensiCompact | null,
    logDesc?: string
  ) => Promise<boolean>;
  restoreLiburMap: (
    targetLiburMap: Record<string, HariLiburInfo>,
    logDesc?: string
  ) => Promise<boolean>;
  handleRealtimeAbsensi: (newValue: any) => void;
  handleRealtimeLibur: (newValue: any) => void;
}

const initialDate = getDefaultTanggalAbsensi();

export const useAbsensiStore = create<AbsensiState>((set, get) => ({
  selectedDate: initialDate,
  hari: getNamaHariDariTgl(initialDate),
  selectedJam: 1,
  isLoading: false,

  rawBucketMap: {},
  absensiMapByDate: {},
  liburMapByDate: {},

  sesiHariIni: { 1: [], 2: [], 3: [], 4: [] },
  savedRecords: {},
  pendingStatus: {},
  unlockedJams: { 1: true, 2: false, 3: false, 4: false },
  forceUnlockedJams: { 1: true, 2: false, 3: false, 4: false },
  savedJams: { 1: false, 2: false, 3: false, 4: false },

  _cachedMaster: {
    asatidzList: [],
    jadwalMap: {},
    formasiList: [],
    fanConfig: {},
    masterStrukturKelasKBM: [],
  },

  setSelectedDate: (date) => {
    const hariBaru = getNamaHariDariTgl(date);
    const { rawBucketMap, _cachedMaster } = get();
    const sesiBaru = ekstraksiSesiJadwalHariIni(
      hariBaru,
      _cachedMaster.asatidzList,
      _cachedMaster.jadwalMap,
      _cachedMaster.formasiList,
      _cachedMaster.fanConfig,
      _cachedMaster.masterStrukturKelasKBM
    );
    const savedBaru = buildSavedRecordsForDate(date, rawBucketMap);
    const resetForce: Record<JamKbm, boolean> = { 1: true, 2: false, 3: false, 4: false };
    const { savedJams, unlockedJams } = computeJamLocks(date, sesiBaru, savedBaru, resetForce);

    // Pilih jam pertama yang belum lengkap diabsen untuk mempermudah alur kerja
    let nextJam: JamKbm = 1;
    for (const j of [1, 2, 3, 4] as JamKbm[]) {
      const list = sesiBaru[j] || [];
      if (list.length > 0 && !savedJams[j]) {
        nextJam = j;
        break;
      }
    }

    set({
      selectedDate: date,
      hari: hariBaru,
      sesiHariIni: sesiBaru,
      savedRecords: savedBaru,
      pendingStatus: {},
      forceUnlockedJams: resetForce,
      savedJams,
      unlockedJams,
      selectedJam: nextJam,
    });
  },

  setSelectedJam: (jam) => set({ selectedJam: jam }),

  fetchAbsensi: async (forceRefresh = false) => {
    const isForce = forceRefresh === true;
    set({ isLoading: true });
    try {
      let mergedRaw: Record<string, any> = {};
      let mergedLibur: Record<string, HariLiburInfo> = {};

      // Baca cache LocalStorage terlebih dahulu bila tidak forceRefresh
      if (!isForce && typeof window !== 'undefined') {
        try {
          const lsAbs = localStorage.getItem(LS_CACHE_ABSENSI);
          const lsLib = localStorage.getItem(LS_CACHE_LIBUR);
          if (lsAbs) mergedRaw = JSON.parse(lsAbs) || {};
          if (lsLib) mergedLibur = JSON.parse(lsLib) || {};
        } catch {
          // Abaikan bila gagal parse LocalStorage
        }
      }

      // Coba baca dari tabel relasional absensi_records bila tersedia (Fase 1 Relational)
      try {
        const { data: recRows, error: recErr } = await supabase
          .from('absensi_records' as any)
          .select('*');
        if (!recErr && recRows && recRows.length > 0) {
          const reconstructed = RelationalMigrationService.reconstructAbsensiBucketsFromRecords(recRows as any);
          mergedRaw = { ...mergedRaw, ...reconstructed };
        }
      } catch {}

      const { data: rows, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [KEY_DB_ABSENSI, KEY_DB_LIBUR, 'KEY_DB_ABSENSI', 'KEY_DB_LIBUR']);

      if (!error && rows) {
        // Utamakan KEY_DB_ABSENSI & KEY_DB_LIBUR resmi, namun dukung fallback legacy
        const legacyAbsRow = rows.find((r) => r.key === 'KEY_DB_ABSENSI');
        const mainAbsRow = rows.find((r) => r.key === KEY_DB_ABSENSI);
        const legacyLibRow = rows.find((r) => r.key === 'KEY_DB_LIBUR');
        const mainLibRow = rows.find((r) => r.key === KEY_DB_LIBUR);

        const parseVal = (v: unknown) => {
          if (!v) return {};
          if (typeof v === 'string') {
            try {
              return JSON.parse(v);
            } catch {
              return {};
            }
          }
          return typeof v === 'object' ? v : {};
        };

        mergedRaw = {
          ...parseVal(legacyAbsRow?.value),
          ...parseVal(mainAbsRow?.value),
        };
        mergedLibur = {
          ...parseVal(legacyLibRow?.value),
          ...parseVal(mainLibRow?.value),
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LS_CACHE_ABSENSI, JSON.stringify(mergedRaw));
            localStorage.setItem(LS_CACHE_LIBUR, JSON.stringify(mergedLibur));
          } catch {
            // Abaikan kuota LocalStorage
          }
        }
      }

      const { selectedDate, sesiHariIni, forceUnlockedJams } = get();
      const absensiMapByDate = buildLegacyAbsensiMapByDate(mergedRaw);
      const savedRecords = buildSavedRecordsForDate(selectedDate, mergedRaw);
      const { savedJams, unlockedJams } = computeJamLocks(
        selectedDate,
        sesiHariIni,
        savedRecords,
        forceUnlockedJams
      );

      set({
        rawBucketMap: mergedRaw,
        absensiMapByDate,
        liburMapByDate: mergedLibur,
        savedRecords,
        savedJams,
        unlockedJams,
      });
    } catch (err: any) {
      console.error('Fetch absensi error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  syncSesiHariIni: (
    asatidzList,
    jadwalMap,
    formasiList,
    fanConfig,
    masterStrukturKelasKBM
  ) => {
    const { selectedDate, rawBucketMap, forceUnlockedJams } = get();
    const hari = getNamaHariDariTgl(selectedDate);
    const sesiHariIni = ekstraksiSesiJadwalHariIni(
      hari,
      asatidzList,
      jadwalMap,
      formasiList,
      fanConfig,
      masterStrukturKelasKBM
    );
    const savedRecords = buildSavedRecordsForDate(selectedDate, rawBucketMap);
    const { savedJams, unlockedJams } = computeJamLocks(
      selectedDate,
      sesiHariIni,
      savedRecords,
      forceUnlockedJams
    );

    set({
      hari,
      sesiHariIni,
      savedRecords,
      savedJams,
      unlockedJams,
      _cachedMaster: {
        asatidzList,
        jadwalMap,
        formasiList,
        fanConfig,
        masterStrukturKelasKBM,
      },
    });
  },

  getSesiStatusData: (sesi) => {
    const { selectedDate, pendingStatus, savedRecords } = get();
    const sKey = getSesiKey(selectedDate, sesi);

    if (pendingStatus[sKey]) {
      return pendingStatus[sKey];
    }

    const saved = savedRecords[sKey];
    if (saved) {
      return {
        status: saved.status || 'Hadir',
        keterangan: saved.keterangan || '',
        menitTerlambat: saved.menitTerlambat || '',
        namaPengganti: saved.namaPengganti || '',
        isSaved: true,
      };
    }

    return {
      status: 'Hadir',
      keterangan: '',
      menitTerlambat: '',
      namaPengganti: '',
      isSaved: false,
    };
  },

  setSesiStatusData: (sesi, partial) => {
    const { selectedDate, getSesiStatusData } = get();
    const sKey = getSesiKey(selectedDate, sesi);
    const current = getSesiStatusData(sesi);
    const nextStatus = partial.status !== undefined ? partial.status : current.status;

    const updated: StatusSesiData = {
      ...current,
      ...partial,
      status: nextStatus,
      // Bersihkan field kondisional bila status berubah dan tidak relevan
      menitTerlambat:
        nextStatus === 'Terlambat'
          ? partial.menitTerlambat !== undefined
            ? partial.menitTerlambat
            : current.menitTerlambat
          : '',
      namaPengganti: ['Digantikan', 'Badal', 'Izin', 'Sakit'].includes(String(nextStatus))
        ? partial.namaPengganti !== undefined
          ? partial.namaPengganti
          : current.namaPengganti
        : '',
    };

    set((state) => ({
      pendingStatus: {
        ...state.pendingStatus,
        [sKey]: updated,
      },
    }));
  },

  terapkanStatusMassal: (jam, keys, status) => {
    const { selectedDate, sesiHariIni, getSesiStatusData } = get();
    const listSesi = sesiHariIni[jam] || [];
    const keySet = new Set(keys);
    const nextPending = { ...get().pendingStatus };

    listSesi.forEach((sesi) => {
      const sKey = getSesiKey(selectedDate, sesi);
      if (keySet.has(sKey)) {
        const cur = getSesiStatusData(sesi);
        nextPending[sKey] = {
          ...cur,
          status,
          menitTerlambat: status === 'Terlambat' ? cur.menitTerlambat : '',
          namaPengganti: ['Digantikan', 'Badal', 'Izin', 'Sakit'].includes(status)
            ? cur.namaPengganti
            : '',
        };
      }
    });

    set({ pendingStatus: nextPending });
  },

  tandaiSemuaHadirJam: (jam) => {
    const { selectedDate, sesiHariIni, getSesiStatusData } = get();
    const listSesi = sesiHariIni[jam] || [];
    const nextPending = { ...get().pendingStatus };

    listSesi.forEach((sesi) => {
      const sKey = getSesiKey(selectedDate, sesi);
      const cur = getSesiStatusData(sesi);
      nextPending[sKey] = {
        ...cur,
        status: 'Hadir',
        menitTerlambat: '',
        namaPengganti: '',
      };
    });

    set({ pendingStatus: nextPending });
  },

  bukaPaksaKunciJam: (jam) => {
    set((state) => {
      const nextForce = { ...state.forceUnlockedJams, [jam]: true };
      const { savedJams, unlockedJams } = computeJamLocks(
        state.selectedDate,
        state.sesiHariIni,
        state.savedRecords,
        nextForce
      );
      return {
        forceUnlockedJams: nextForce,
        savedJams,
        unlockedJams,
      };
    });
  },

  simpanAbsensiJam: async (jam, actorName = 'Master Administrator', skipHistory = false) => {
    const {
      selectedDate,
      hari,
      sesiHariIni,
      rawBucketMap,
      savedRecords,
      getSesiStatusData,
      forceUnlockedJams,
    } = get();

    const prevRawMap = JSON.parse(JSON.stringify(rawBucketMap));

    const listSesi = sesiHariIni[jam] || [];
    if (listSesi.length === 0) {
      return {
        success: false,
        count: 0,
        message: `Tidak ada sesi jadwal pada Jam Ke-${jam}.`,
      };
    }

    const jamKe = `Jam ${jam}`;
    const waktuSekarang = formatWaktuSekarangWIB();
    const bucketKey = `${selectedDate}|${jamKe}`;

    const compactTuples = listSesi.map((sesi) => {
      const sKey = getSesiKey(selectedDate, sesi);
      const stData = getSesiStatusData(sesi);
      const existing = savedRecords[sKey];

      return packSesiToCompactArray({
        id:
          existing?.id ||
          'ABS-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        timestamp: existing?.timestamp || waktuSekarang,
        tanggal: selectedDate,
        hari,
        jamKe,
        nama: sesi.nama,
        nia: sesi.nia,
        tingkat: sesi.tingkat,
        dinKls: sesi.dinKls,
        dinBag: sesi.dinBag,
        blok: sesi.blok,
        gender: sesi.gender,
        kelasMengajar: sesi.kelasMengajar,
        fan: sesi.fan,
        lokasi: sesi.lokasi,
        status: (stData.status || 'Hadir') as StatusAbsensi,
        keterangan: stData.keterangan || '',
        menitTerlambat: stData.menitTerlambat || '',
        namaPengganti: stData.namaPengganti || '',
        diinputOleh: actorName,
        waktuUpdate: waktuSekarang,
      });
    });

    const newBucket: BucketAbsensiCompact = {
      tanggal: selectedDate,
      hari,
      jamKe,
      waktuUpdate: waktuSekarang,
      diinputOleh: actorName,
      data: compactTuples,
    };

    const nextRawMap: Record<string, BucketAbsensiCompact> = {
      ...rawBucketMap,
      [bucketKey]: newBucket,
    };

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: KEY_DB_ABSENSI, value: nextRawMap },
          { onConflict: 'key' }
        );
      if (error) throw error;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_CACHE_ABSENSI, JSON.stringify(nextRawMap));
        } catch {
          // Abaikan kuota LocalStorage
        }
      }

      const nextSavedRecords = buildSavedRecordsForDate(selectedDate, nextRawMap);
      const nextAbsensiMapByDate = buildLegacyAbsensiMapByDate(nextRawMap);

      // Tandai pendingStatus pada jam ini sebagai isSaved = true
      const nextPending = { ...get().pendingStatus };
      listSesi.forEach((sesi) => {
        const sKey = getSesiKey(selectedDate, sesi);
        if (nextPending[sKey]) {
          nextPending[sKey] = {
            ...nextPending[sKey],
            isSaved: true,
          };
        }
      });

      const { savedJams, unlockedJams } = computeJamLocks(
        selectedDate,
        sesiHariIni,
        nextSavedRecords,
        forceUnlockedJams
      );

      await logActivity(
        'Simpan Absensi Asatidz',
        `Menyimpan ${compactTuples.length} sesi pada ${selectedDate} (${jamKe})`
      );

      if (!skipHistory) {
        const prevBucket = prevRawMap[bucketKey] ? JSON.parse(JSON.stringify(prevRawMap[bucketKey])) : null;
        useUndoRedoStore.getState().recordAction({
          module: 'absensi',
          title: `Simpan Absensi ${selectedDate} (${jamKe})`,
          undo: async () => {
            // Cek konflik di server: apakah bucket ini telah diubah lagi oleh orang lain?
            try {
              const { data: dbData } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', KEY_DB_ABSENSI)
                .maybeSingle();

              if (dbData?.value) {
                const parsed = typeof dbData.value === 'string' ? JSON.parse(dbData.value) : dbData.value;
                const serverBucket = parsed?.[bucketKey];
                if (serverBucket && serverBucket.waktuUpdate !== newBucket.waktuUpdate) {
                  const proceed = await useUndoRedoStore.getState().requestConflictResolution({
                    title: 'Peringatan Konflik Absensi KBM',
                    entityName: `${selectedDate} (${jamKe})`,
                    message: `Sesi absensi ini telah diperbarui oleh ${serverBucket.diinputOleh || 'admin lain'} pada ${serverBucket.waktuUpdate}.`,
                    currentServerState: `Diperbarui oleh: ${serverBucket.diinputOleh || 'Admin'} (${serverBucket.waktuUpdate})`,
                    proposedUndoState: prevBucket
                      ? `Kembalikan ke status sebelum aksi (${prevBucket.waktuUpdate})`
                      : 'Hapus data rekaman sesi ini',
                  });

                  if (!proceed) return false;
                }
              }
            } catch {}

            return await get().restoreAbsensiBucket(
              bucketKey,
              prevBucket,
              `[UNDO] Simpan Absensi ${selectedDate} (${jamKe})`
            );
          },
          redo: async () => {
            return await get().restoreAbsensiBucket(
              bucketKey,
              newBucket,
              `[REDO] Simpan Absensi ${selectedDate} (${jamKe})`
            );
          },
        });
      }

      set({
        rawBucketMap: nextRawMap,
        absensiMapByDate: nextAbsensiMapByDate,
        savedRecords: nextSavedRecords,
        pendingStatus: nextPending,
        savedJams,
        unlockedJams,
      });

      return {
        success: true,
        count: compactTuples.length,
      };
    } catch (err: any) {
      console.error('Simpan absensi jam error:', err.message);
      return {
        success: false,
        count: 0,
        message: err.message,
      };
    }
  },

  editRekamanRiwayat: async (
    id,
    updates,
    actorName = 'Master Administrator',
    skipHistory = false
  ) => {
    const { rawBucketMap, selectedDate, sesiHariIni, forceUnlockedJams } = get();
    const prevRawMap = JSON.parse(JSON.stringify(rawBucketMap));
    const waktuSekarang = formatWaktuSekarangWIB();
    const nextRawMap: Record<string, any> = { ...rawBucketMap };
    let ditemukan = false;

    Object.entries(nextRawMap).forEach(([bKey, bucket]) => {
      if (ditemukan || !bucket || typeof bucket !== 'object') return;
      if (Array.isArray(bucket.data)) {
        const idx = bucket.data.findIndex(
          (t: any) => (Array.isArray(t) ? t[0] === id : t?.id === id)
        );
        if (idx !== -1) {
          ditemukan = true;
          const [kTgl, kJam] = bKey.split('|');
          const tanggal = String(bucket.tanggal || kTgl || '');
          const hari = String(bucket.hari || getNamaHariDariTgl(tanggal));
          const jamKe = String(bucket.jamKe || kJam || 'Jam 1');
          const unpacked = unpackCompactArrayToSesi(
            bucket.data[idx],
            tanggal,
            hari,
            jamKe
          );
          if (unpacked) {
            const newTuple = packSesiToCompactArray({
              ...unpacked,
              status: updates.status,
              menitTerlambat:
                updates.status === 'Terlambat' ? updates.menitTerlambat || '' : '',
              namaPengganti: ['Digantikan', 'Badal', 'Izin', 'Sakit'].includes(
                updates.status
              )
                ? updates.namaPengganti || ''
                : '',
              keterangan: updates.keterangan ?? unpacked.keterangan,
              diinputOleh: actorName,
              waktuUpdate: waktuSekarang,
            });
            const newData = [...bucket.data];
            newData[idx] = newTuple;
            nextRawMap[bKey] = {
              ...bucket,
              waktuUpdate: waktuSekarang,
              diinputOleh: actorName,
              data: newData,
            };
          }
        }
      }
    });

    if (!ditemukan) return false;

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: KEY_DB_ABSENSI, value: nextRawMap },
          { onConflict: 'key' }
        );
      if (error) throw error;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_CACHE_ABSENSI, JSON.stringify(nextRawMap));
        } catch {
          // Abaikan
        }
      }

      const nextSavedRecords = buildSavedRecordsForDate(selectedDate, nextRawMap);
      const nextAbsensiMapByDate = buildLegacyAbsensiMapByDate(nextRawMap);
      const { savedJams, unlockedJams } = computeJamLocks(
        selectedDate,
        sesiHariIni,
        nextSavedRecords,
        forceUnlockedJams
      );

      await logActivity('Edit Riwayat Absensi', `Mengubah rekaman absensi ID: ${id}`);

      if (!skipHistory) {
        useUndoRedoStore.getState().recordAction({
          module: 'absensi',
          title: `Edit Status Absensi (ID: ${id})`,
          undo: async () => {
            return await get().restoreAbsensiRawMap(
              prevRawMap,
              `[UNDO] Edit Status Absensi (ID: ${id})`
            );
          },
          redo: async () => {
            return await get().restoreAbsensiRawMap(
              nextRawMap,
              `[REDO] Edit Status Absensi (ID: ${id})`
            );
          },
        });
      }

      set({
        rawBucketMap: nextRawMap,
        absensiMapByDate: nextAbsensiMapByDate,
        savedRecords: nextSavedRecords,
        pendingStatus: {},
        savedJams,
        unlockedJams,
      });

      return true;
    } catch (err: any) {
      console.error('Edit rekaman riwayat error:', err.message);
      return false;
    }
  },

  hapusRekamanRiwayat: async (id, skipHistory = false) => {
    const { rawBucketMap, selectedDate, sesiHariIni, forceUnlockedJams } = get();
    const prevRawMap = JSON.parse(JSON.stringify(rawBucketMap));
    const nextRawMap: Record<string, any> = { ...rawBucketMap };
    let ditemukan = false;

    Object.entries(nextRawMap).forEach(([bKey, bucket]) => {
      if (ditemukan || !bucket || typeof bucket !== 'object') return;
      if (Array.isArray(bucket.data)) {
        const idx = bucket.data.findIndex(
          (t: any) => (Array.isArray(t) ? t[0] === id : t?.id === id)
        );
        if (idx !== -1) {
          ditemukan = true;
          const newData = bucket.data.filter((_: any, i: number) => i !== idx);
          if (newData.length === 0) {
            delete nextRawMap[bKey];
          } else {
            nextRawMap[bKey] = {
              ...bucket,
              data: newData,
            };
          }
        }
      }
    });

    if (!ditemukan) return false;

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: KEY_DB_ABSENSI, value: nextRawMap },
          { onConflict: 'key' }
        );
      if (error) throw error;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_CACHE_ABSENSI, JSON.stringify(nextRawMap));
        } catch {
          // Abaikan
        }
      }

      const nextSavedRecords = buildSavedRecordsForDate(selectedDate, nextRawMap);
      const nextAbsensiMapByDate = buildLegacyAbsensiMapByDate(nextRawMap);
      const { savedJams, unlockedJams } = computeJamLocks(
        selectedDate,
        sesiHariIni,
        nextSavedRecords,
        forceUnlockedJams
      );

      await logActivity('Hapus Riwayat Absensi', `Menghapus rekaman absensi ID: ${id}`);

      if (!skipHistory) {
        useUndoRedoStore.getState().recordAction({
          module: 'absensi',
          title: `Hapus Rekaman Absensi ID: ${id}`,
          undo: async () => {
            return await get().restoreAbsensiRawMap(
              prevRawMap,
              `[UNDO] Hapus Rekaman Absensi ID: ${id}`
            );
          },
          redo: async () => {
            return await get().restoreAbsensiRawMap(
              nextRawMap,
              `[REDO] Hapus Rekaman Absensi ID: ${id}`
            );
          },
        });
      }

      set({
        rawBucketMap: nextRawMap,
        absensiMapByDate: nextAbsensiMapByDate,
        savedRecords: nextSavedRecords,
        pendingStatus: {},
        savedJams,
        unlockedJams,
      });

      return true;
    } catch (err: any) {
      console.error('Hapus rekaman riwayat error:', err.message);
      return false;
    }
  },

  saveAbsensiJam: async (date, jam, records) => {
    const { rawBucketMap, sesiHariIni, forceUnlockedJams } = get();
    const hari = getNamaHariDariTgl(date);
    const jamKe = `Jam ${jam}`;
    const waktuSekarang = formatWaktuSekarangWIB();
    const bucketKey = `${date}|${jamKe}`;

    const tuples = records.map((r) =>
      packSesiToCompactArray({
        id: r.id || 'ABS-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        timestamp: r.updated_at || waktuSekarang,
        tanggal: date,
        hari,
        jamKe,
        nama: r.nama_asatidz,
        nia: r.nia,
        tingkat: r.tingkat || '-',
        dinKls: r.dinKls || '-',
        dinBag: r.dinBag || '-',
        blok: r.blok || '-',
        gender: r.gender || '-',
        kelasMengajar: r.kelas,
        fan: r.fan,
        lokasi: r.lokasi || '-',
        status: r.status,
        keterangan: r.keterangan || '',
        menitTerlambat: r.menit_terlambat ? String(r.menit_terlambat) : '',
        namaPengganti: r.asatidz_pengganti || '',
        diinputOleh: r.diinput_oleh || 'Master Administrator',
        waktuUpdate: waktuSekarang,
      })
    );

    const nextRawMap: Record<string, BucketAbsensiCompact> = {
      ...rawBucketMap,
      [bucketKey]: {
        tanggal: date,
        hari,
        jamKe,
        waktuUpdate: waktuSekarang,
        diinputOleh: 'Master Administrator',
        data: tuples,
      },
    };

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: KEY_DB_ABSENSI, value: nextRawMap }, { onConflict: 'key' });
      if (error) throw error;

      // Dual-write ke tabel relasional absensi_records bila tersedia
      RelationalMigrationService.isTableAvailable('absensi_records').then(async (avail) => {
        if (avail) {
          try {
            const records = RelationalMigrationService.parseAbsensiBucketsToRecords(nextRawMap);
            for (let i = 0; i < records.length; i += 100) {
              const chunk = records.slice(i, i + 100);
              await supabase
                .from('absensi_records' as any)
                .upsert(chunk, { onConflict: 'id' });
            }
          } catch (syncErr) {
            console.warn('Dual-write ke absensi_records gagal:', syncErr);
          }
        }
      });

      const nextSavedRecords = buildSavedRecordsForDate(date, nextRawMap);
      const nextAbsensiMapByDate = buildLegacyAbsensiMapByDate(nextRawMap);
      const { savedJams, unlockedJams } = computeJamLocks(
        date,
        sesiHariIni,
        nextSavedRecords,
        forceUnlockedJams
      );

      set({
        rawBucketMap: nextRawMap,
        absensiMapByDate: nextAbsensiMapByDate,
        savedRecords: nextSavedRecords,
        savedJams,
        unlockedJams,
      });
      return true;
    } catch (err: any) {
      console.error('Save absensi error:', err.message);
      return false;
    }
  },

  setHariLibur: async (
    date,
    info,
    actorName = 'Master Administrator',
    skipHistory = false
  ) => {
    const prevLibur = JSON.parse(JSON.stringify(get().liburMapByDate));
    const current = { ...get().liburMapByDate };
    if (info) {
      current[date] = {
        tanggal: date,
        hari: getNamaHariDariTgl(date),
        kategori: info.kategori,
        keterangan: info.keterangan,
        waktuUpdate: formatWaktuSekarangWIB(),
        diinputOleh: actorName,
      };
    } else {
      delete current[date];
    }

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: KEY_DB_LIBUR, value: current }, { onConflict: 'key' });
      if (error) throw error;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_CACHE_LIBUR, JSON.stringify(current));
        } catch {
          // Abaikan
        }
      }

      await logActivity(
        info ? 'Set Hari Libur KBM' : 'Hapus Hari Libur KBM',
        `Tanggal: ${date}${info ? ` (${info.kategori}: ${info.keterangan})` : ''}`
      );

      if (!skipHistory) {
        useUndoRedoStore.getState().recordAction({
          module: 'absensi',
          title: info ? `Set Libur: ${date} (${info.kategori})` : `Hapus Libur: ${date}`,
          undo: async () => {
            return await get().restoreLiburMap(prevLibur, `[UNDO] Libur ${date}`);
          },
          redo: async () => {
            return await get().restoreLiburMap(current, `[REDO] Libur ${date}`);
          },
        });
      }

      set({ liburMapByDate: current });
      return true;
    } catch (err: any) {
      console.error('Set libur error:', err.message);
      return false;
    }
  },

  restoreAbsensiRawMap: async (targetRawMap, logDesc = '') => {
    const { selectedDate, sesiHariIni, forceUnlockedJams } = get();
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: KEY_DB_ABSENSI, value: targetRawMap }, { onConflict: 'key' });
      if (error) throw error;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_CACHE_ABSENSI, JSON.stringify(targetRawMap));
        } catch {}
      }

      const nextSavedRecords = buildSavedRecordsForDate(selectedDate, targetRawMap);
      const nextAbsensiMapByDate = buildLegacyAbsensiMapByDate(targetRawMap);
      const { savedJams, unlockedJams } = computeJamLocks(
        selectedDate,
        sesiHariIni,
        nextSavedRecords,
        forceUnlockedJams
      );

      if (logDesc) {
        await logActivity('UNDO/REDO ABSENSI ASATIDZ', logDesc);
      }

      set({
        rawBucketMap: targetRawMap,
        absensiMapByDate: nextAbsensiMapByDate,
        savedRecords: nextSavedRecords,
        pendingStatus: {},
        savedJams,
        unlockedJams,
      });
      return true;
    } catch (err: any) {
      console.error('Restore absensi error:', err.message);
      return false;
    }
  },

  restoreAbsensiBucket: async (bucketKey: string, bucketData: BucketAbsensiCompact | null, logDesc = '') => {
    const { selectedDate, sesiHariIni, forceUnlockedJams, rawBucketMap } = get();
    try {
      const nextRawMap = { ...rawBucketMap };
      if (bucketData) {
        nextRawMap[bucketKey] = bucketData;
      } else {
        delete nextRawMap[bucketKey];
      }

      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: KEY_DB_ABSENSI, value: nextRawMap }, { onConflict: 'key' });
      if (error) throw error;

      // Dual-write ke tabel relasional absensi_records bila tersedia
      RelationalMigrationService.isTableAvailable('absensi_records').then(async (avail) => {
        if (avail) {
          try {
            const records = RelationalMigrationService.parseAbsensiBucketsToRecords(nextRawMap);
            for (let i = 0; i < records.length; i += 100) {
              const chunk = records.slice(i, i + 100);
              await supabase
                .from('absensi_records' as any)
                .upsert(chunk, { onConflict: 'id' });
            }
          } catch (syncErr) {
            console.warn('Dual-write ke absensi_records gagal:', syncErr);
          }
        }
      });

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_CACHE_ABSENSI, JSON.stringify(nextRawMap));
        } catch {}
      }

      const nextSavedRecords = buildSavedRecordsForDate(selectedDate, nextRawMap);
      const nextAbsensiMapByDate = buildLegacyAbsensiMapByDate(nextRawMap);
      const { savedJams, unlockedJams } = computeJamLocks(
        selectedDate,
        sesiHariIni,
        nextSavedRecords,
        forceUnlockedJams
      );

      if (logDesc) {
        await logActivity('UNDO/REDO ABSENSI ASATIDZ', logDesc);
      }

      set({
        rawBucketMap: nextRawMap,
        absensiMapByDate: nextAbsensiMapByDate,
        savedRecords: nextSavedRecords,
        savedJams,
        unlockedJams,
      });

      return true;
    } catch (err: any) {
      console.error('Restore absensi bucket error:', err.message);
      return false;
    }
  },

  restoreLiburMap: async (targetLiburMap, logDesc = '') => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: KEY_DB_LIBUR, value: targetLiburMap }, { onConflict: 'key' });
      if (error) throw error;

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_CACHE_LIBUR, JSON.stringify(targetLiburMap));
        } catch {}
      }

      if (logDesc) {
        await logActivity('UNDO/REDO LIBUR MADIN', logDesc);
      }

      set({ liburMapByDate: targetLiburMap });
      return true;
    } catch (err: any) {
      console.error('Restore libur error:', err.message);
      return false;
    }
  },

  handleRealtimeAbsensi: (newValue) => {
    try {
      const parsed = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
      if (parsed && typeof parsed === 'object') {
        const { selectedDate, sesiHariIni, forceUnlockedJams } = get();
        const nextSavedRecords = buildSavedRecordsForDate(selectedDate, parsed);
        const nextAbsensiMapByDate = buildLegacyAbsensiMapByDate(parsed);
        const { savedJams, unlockedJams } = computeJamLocks(
          selectedDate,
          sesiHariIni,
          nextSavedRecords,
          forceUnlockedJams
        );

        set({
          rawBucketMap: parsed,
          savedRecords: nextSavedRecords,
          absensiMapByDate: nextAbsensiMapByDate,
          savedJams,
          unlockedJams,
        });

        try {
          localStorage.setItem(LS_CACHE_ABSENSI, JSON.stringify(parsed));
        } catch {}
      }
    } catch (err) {
      console.error('Handle realtime absensi error:', err);
    }
  },

  handleRealtimeLibur: (newValue) => {
    try {
      const parsed = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
      if (parsed && typeof parsed === 'object') {
        set({ liburMapByDate: parsed });
        try {
          localStorage.setItem(LS_CACHE_LIBUR, JSON.stringify(parsed));
        } catch {}
      }
    } catch (err) {
      console.error('Handle realtime libur error:', err);
    }
  },
}));

if (typeof window !== 'undefined') {
  (window as any).useAbsensiStore = useAbsensiStore;
}
