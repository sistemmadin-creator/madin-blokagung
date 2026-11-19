import { Santri } from '@/types/santri';
import { Asatidz } from '@/types/asatidz';
import { FormasiKelas } from '@/types/formasi';
import { TeacherJadwalRow } from '@/types/jadwal';
import { FanConfigMap } from '@/types/fan';
import { RiwayatAbsensiItem } from '@/types/absensi';
import { SesiPresensiKonsorsium } from '@/types/konsorsium';
import { SetoranHafalan } from '@/types/setoran';
import { SetorMustahiqLog, SantriActiveHafalanState } from '@/types/setor-mustahiq';
import { SerahPiagamRecord } from '@/types/serah-piagam';
import { AgendaKalenderItem } from '@/types/kalender';
import {
  STRICT_KELAS_DATABASE_TA,
  StrictKelasDefinition,
  RekapPerKelasTA,
  RekapRingkasanUmumTA,
  DatabaseTahunAjaranRekap,
} from '@/types/database-ta';
import { buildMasterStrukturKelasKBM, hitungSlotKelasKBM } from '@/lib/utils/jadwalHelper';
import { parseStartYearFromTA } from '@/stores/useTahunAjaranStore';

const STRICT_KEY_MAP = new Map<string, StrictKelasDefinition>(
  STRICT_KELAS_DATABASE_TA.map((def) => [def.key, def])
);

const ROMAN_TO_DIGIT: Record<string, string> = {
  I: '1',
  II: '2',
  III: '3',
  IV: '4',
};

function normalizeToken(val: string | number | null | undefined): string {
  return String(val ?? '').trim().toUpperCase();
}

/**
 * Menormalkan pasangan tingkat & kelas ke daftar baku strictly 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA.
 * Kelas di luar cakupan (termasuk ISTI'DAD, EBTADIN khusus, dll) dikembalikan null agar tidak terhitung.
 */
export function normalizeStrictTingkatKelas(
  tingkatRaw: string | null | undefined,
  dinKlsRaw: string | number | null | undefined
): StrictKelasDefinition | null {
  const tkUpper = normalizeToken(tingkatRaw);
  if (!tkUpper || tkUpper.includes('ISTI')) return null;

  let tingkat: 'ULA' | 'WUSTHO' | 'ULYA' | null = null;
  if (tkUpper.includes('ULA')) tingkat = 'ULA';
  else if (tkUpper.includes('WUST') || tkUpper === 'WST') tingkat = 'WUSTHO';
  else if (tkUpper.includes('ULYA') || tkUpper === 'ULY') tingkat = 'ULYA';
  if (!tingkat) return null;

  const rawKls = normalizeToken(dinKlsRaw);
  const digitMatch = rawKls.match(/^(1|2|3|4)/);
  const kls = digitMatch ? digitMatch[1] : ROMAN_TO_DIGIT[rawKls] || rawKls;

  return STRICT_KEY_MAP.get(`${kls}_${tingkat}`) || null;
}

export function resolveTahunAjaranDateRange(tahunAjaranMasehi: string): {
  startDate: string;
  endDate: string;
  startYear: number;
  endYear: number;
} {
  const startYear = parseStartYearFromTA(tahunAjaranMasehi);
  const endYear = startYear + 1;
  return {
    startDate: `${startYear}-07-01`,
    endDate: `${endYear}-06-30`,
    startYear,
    endYear,
  };
}

function isDateWithinTA(dateRaw: string | null | undefined, startDate: string, endDate: string): boolean {
  if (!dateRaw) return true;
  const trimmed = String(dateRaw).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true;
  return trimmed >= startDate && trimmed <= endDate;
}

export interface BuildRekapSnapshotParams {
  tahunAjaranMasehi: string;
  santriList: Santri[];
  asatidzList: Asatidz[];
  formasiList: FormasiKelas[];
  jadwalMap: Record<string, TeacherJadwalRow>;
  fanConfig: FanConfigMap;
  absensiRecords: RiwayatAbsensiItem[];
  konsorsiumSesiList: SesiPresensiKonsorsium[];
  setoranList: SetoranHafalan[];
  mustahiqLogs: SetorMustahiqLog[];
  activeStates: Record<string, SantriActiveHafalanState>;
  serahPiagamRecords: Record<string, SerahPiagamRecord>;
  agendaMap?: Record<string, AgendaKalenderItem>;
}

/**
 * Menghitung ringkasan tahunan & rekap 8 jenjang kelas (strictly 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA)
 * langsung dari state store aplikasi. Terisolasi penuh dari tabel EBTADIN.
 */
export function buildRekapSnapshotFromLiveData(params: BuildRekapSnapshotParams): {
  ringkasan_umum: RekapRingkasanUmumTA;
  rekap_per_kelas: RekapPerKelasTA[];
} {
  const {
    tahunAjaranMasehi,
    santriList,
    asatidzList,
    formasiList,
    jadwalMap,
    fanConfig,
    absensiRecords,
    konsorsiumSesiList,
    setoranList,
    mustahiqLogs,
    activeStates,
    serahPiagamRecords,
    agendaMap,
  } = params;

  const { startDate, endDate, startYear } = resolveTahunAjaranDateRange(tahunAjaranMasehi);

  // Inisialisasi kerangka akumulasi strictly untuk 8 tingkat kelas
  const bucketMap = new Map<
    string,
    {
      def: StrictKelasDefinition;
      santriPaSet: Set<string>;
      santriPiSet: Set<string>;
      wajibSet: Set<string>;
      sunnahSet: Set<string>;
      kitabSet: Set<string>;
      formasiPa: number;
      formasiPi: number;
      formasiUnggulan: number;
      slotTerisi: number;
      slotTotal: number;
      absenTotal: number;
      absenHadir: number;
      piagamCount: number;
    }
  >();

  STRICT_KELAS_DATABASE_TA.forEach((def) => {
    bucketMap.set(def.key, {
      def,
      santriPaSet: new Set(),
      santriPiSet: new Set(),
      wajibSet: new Set(),
      sunnahSet: new Set(),
      kitabSet: new Set(),
      formasiPa: 0,
      formasiPi: 0,
      formasiUnggulan: 0,
      slotTerisi: 0,
      slotTotal: 0,
      absenTotal: 0,
      absenHadir: 0,
      piagamCount: 0,
    });
  });

  // Pemetaan no_induk -> strict class key agar setoran & serah piagam terpetakan konsisten
  const santriClassByNoInduk = new Map<string, string>();

  santriList.forEach((s) => {
    const def = normalizeStrictTingkatKelas(s.tingkat, s.din_kls);
    if (!def) return;
    const statusRaw = normalizeToken(
      (s as unknown as { status_santri?: string; ket_status?: string }).status_santri ||
        (s as unknown as { ket_status?: string }).ket_status
    );
    if (statusRaw === 'BOYONG') return;

    const bucket = bucketMap.get(def.key)!;
    const nis = normalizeToken(s.no_induk || s.nama);
    if (nis) {
      santriClassByNoInduk.set(nis, def.key);
    }

    if (normalizeToken(s.pa_pi) === 'PI') {
      bucket.santriPiSet.add(nis || `${bucket.santriPiSet.size}`);
    } else {
      bucket.santriPaSet.add(nis || `${bucket.santriPaSet.size}`);
    }
  });

  // Formasi Rombel strictly 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA
  formasiList.forEach((f) => {
    const def = normalizeStrictTingkatKelas(f.tingkat, f.din_kls);
    if (!def) return;
    const bucket = bucketMap.get(def.key)!;
    if (normalizeToken(f.pa_pi) === 'PI') bucket.formasiPi += 1;
    else bucket.formasiPa += 1;
    if (f.is_unggulan) bucket.formasiUnggulan += 1;
  });

  // Keterisian Jadwal KBM per kelas strict
  const masterKbmList = buildMasterStrukturKelasKBM(formasiList, asatidzList, jadwalMap, fanConfig);
  masterKbmList.forEach((k) => {
    const def = normalizeStrictTingkatKelas(k.tingkat, k.kls);
    if (!def) return;
    const bucket = bucketMap.get(def.key)!;
    const slotStat = hitungSlotKelasKBM(k);
    bucket.slotTerisi += slotStat.terisi;
    bucket.slotTotal += slotStat.total;
  });

  // Absensi Asatidz KBM (terfilter dalam rentang TA)
  let totalAbsenGlobal = 0;
  let totalHadirGlobal = 0;
  absensiRecords.forEach((rec) => {
    if (!isDateWithinTA(rec.tanggal, startDate, endDate)) return;
    const def = normalizeStrictTingkatKelas(rec.tingkat, rec.dinKls);
    if (!def) return;

    const bucket = bucketMap.get(def.key)!;
    bucket.absenTotal += 1;
    totalAbsenGlobal += 1;

    const st = normalizeToken(rec.status);
    if (st === 'HADIR' || st === 'TERLAMBAT') {
      bucket.absenHadir += 1;
      totalHadirGlobal += 1;
    }
  });

  // Konsorsium Asatidz (terfilter dalam rentang TA, tidak memaksa strict class karena konsorsium per jenjang)
  let konsorsiumTotal = 0;
  let konsorsiumHadir = 0;
  konsorsiumSesiList.forEach((sesi) => {
    if (!isDateWithinTA(sesi.tanggal, startDate, endDate)) return;
    (sesi.records || []).forEach((d) => {
      konsorsiumTotal += 1;
      const st = normalizeToken(d.status);
      if (st === 'HADIR' || st === 'TERLAMBAT') {
        konsorsiumHadir += 1;
      }
    });
  });

  // Setoran Muhafadzoh & Setor Mustahiq (terfilter tahun_ajaran / tahun)
  let totalSetoranLogCount = 0;
  const markSetoranBucket = (
    noIndukRaw: string,
    tingkatRaw: string | undefined,
    dinKlsRaw: string | undefined,
    kategoriRaw: string
  ) => {
    const nis = normalizeToken(noIndukRaw);
    if (!nis) return;
    const mappedKey =
      normalizeStrictTingkatKelas(tingkatRaw, dinKlsRaw)?.key || santriClassByNoInduk.get(nis);
    if (!mappedKey) return;
    const bucket = bucketMap.get(mappedKey);
    if (!bucket) return;

    const kat = normalizeToken(kategoriRaw);
    if (kat.includes('WAJIB')) bucket.wajibSet.add(nis);
    else if (kat.includes('SUNNAH')) bucket.sunnahSet.add(nis);
    else if (kat.includes('KITAB')) bucket.kitabSet.add(nis);
  };

  setoranList.forEach((s) => {
    if (s.tahun_ajaran && normalizeToken(s.tahun_ajaran) !== normalizeToken(tahunAjaranMasehi)) {
      return;
    }
    totalSetoranLogCount += 1;
    markSetoranBucket(s.no_induk, s.tingkat, s.din_kls, s.kategori);
  });

  mustahiqLogs.forEach((l) => {
    if (l.tahun && l.tahun !== startYear && l.tahun !== startYear + 1) return;
    totalSetoranLogCount += 1;
    markSetoranBucket(l.no_induk, l.tingkat, l.din_kls, l.kategori);
  });

  Object.entries(activeStates || {}).forEach(([noInduk, st]) => {
    if ((st?.completed_materi || []).length > 0) {
      markSetoranBucket(noInduk, undefined, undefined, st.active_kategori || 'Wajib');
    }
  });

  // Serah Piagam per kelas (sinkron tahun mulai TA atau bila tahun cocok)
  let totalPiagam = 0;
  Object.values(serahPiagamRecords || {}).forEach((rec) => {
    if (!rec.is_menerima) return;
    if (rec.tahun && rec.tahun !== startYear) return;
    const nis = normalizeToken(rec.no_induk);
    const mappedKey =
      santriClassByNoInduk.get(nis) || normalizeStrictTingkatKelas(rec.tingkat, '1')?.key;
    if (!mappedKey) return;
    const bucket = bucketMap.get(mappedKey);
    if (!bucket) return;
    bucket.piagamCount += 1;
    totalPiagam += 1;
  });

  // Susun array per kelas dalam urutan baku 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA
  const rekap_per_kelas: RekapPerKelasTA[] = STRICT_KELAS_DATABASE_TA.map((def) => {
    const b = bucketMap.get(def.key)!;
    const santriPa = b.santriPaSet.size;
    const santriPi = b.santriPiSet.size;
    const totalSantri = santriPa + santriPi;
    const totalFormasi = b.formasiPa + b.formasiPi;
    const keterisianKbmPct =
      b.slotTotal > 0 ? Math.round((b.slotTerisi / b.slotTotal) * 100) : 0;
    const kehadiranAsatidzPct =
      b.absenTotal > 0 ? Math.round((b.absenHadir / b.absenTotal) * 100) : 0;
    const capaianWajibPct =
      totalSantri > 0 ? Math.round((b.wajibSet.size / totalSantri) * 100) : 0;

    return {
      key: def.key,
      tingkat: def.tingkat,
      din_kls: def.din_kls,
      label_kelas: def.label_kelas,
      santri_pa: santriPa,
      santri_pi: santriPi,
      total_santri: totalSantri,
      formasi_pa: b.formasiPa,
      formasi_pi: b.formasiPi,
      formasi_unggulan: b.formasiUnggulan,
      total_formasi: totalFormasi,
      slot_kbm_terisi: b.slotTerisi,
      slot_kbm_total: b.slotTotal,
      keterisian_kbm_pct: keterisianKbmPct,
      sesi_absensi_total: b.absenTotal,
      sesi_absensi_hadir: b.absenHadir,
      kehadiran_asatidz_pct: kehadiranAsatidzPct,
      setoran_wajib_santri: b.wajibSet.size,
      setoran_sunnah_santri: b.sunnahSet.size,
      setoran_kitab_santri: b.kitabSet.size,
      capaian_wajib_pct: capaianWajibPct,
      serah_piagam_count: b.piagamCount,
    };
  });

  // Akumulasi Ringkasan Umum dari 8 tingkat baku
  const santriPaTotal = rekap_per_kelas.reduce((acc, r) => acc + r.santri_pa, 0);
  const santriPiTotal = rekap_per_kelas.reduce((acc, r) => acc + r.santri_pi, 0);
  const totalSantri = santriPaTotal + santriPiTotal;
  const totalFormasi = rekap_per_kelas.reduce((acc, r) => acc + r.total_formasi, 0);
  const formasiUnggulan = rekap_per_kelas.reduce((acc, r) => acc + r.formasi_unggulan, 0);
  const formasiReguler = Math.max(0, totalFormasi - formasiUnggulan);
  const slotTerisiTotal = rekap_per_kelas.reduce((acc, r) => acc + r.slot_kbm_terisi, 0);
  const slotTotalAll = rekap_per_kelas.reduce((acc, r) => acc + r.slot_kbm_total, 0);
  const totalWajibSantri = rekap_per_kelas.reduce((acc, r) => acc + r.setoran_wajib_santri, 0);

  const totalAsatidzAktif = asatidzList.filter((a) => {
    const st = normalizeToken(a.status);
    return !st || st === 'AKTIF';
  }).length;

  const ringkasan_umum: RekapRingkasanUmumTA = {
    total_santri: totalSantri,
    santri_pa: santriPaTotal,
    santri_pi: santriPiTotal,
    total_asatidz_aktif: totalAsatidzAktif,
    total_formasi_kelas: totalFormasi,
    formasi_reguler: formasiReguler,
    formasi_unggulan: formasiUnggulan,
    slot_kbm_terisi: slotTerisiTotal,
    slot_kbm_total: slotTotalAll,
    keterisian_kbm_pct:
      slotTotalAll > 0 ? Math.round((slotTerisiTotal / slotTotalAll) * 100) : 0,
    kehadiran_asatidz_pct:
      totalAbsenGlobal > 0 ? Math.round((totalHadirGlobal / totalAbsenGlobal) * 100) : 0,
    kehadiran_konsorsium_pct:
      konsorsiumTotal > 0 ? Math.round((konsorsiumHadir / konsorsiumTotal) * 100) : 0,
    total_setoran_hafalan: totalSetoranLogCount,
    capaian_wajib_pct:
      totalSantri > 0 ? Math.round((totalWajibSantri / totalSantri) * 100) : 0,
    total_serah_piagam: totalPiagam,
    total_agenda_kalender: Object.keys(agendaMap || {}).length,
  };

  return {
    ringkasan_umum,
    rekap_per_kelas,
  };
}

export interface YoYDeltaResult {
  diff: number;
  label: string;
  direction: 'up' | 'down' | 'flat';
}

export function computeDeltaYoY(currentVal: number, prevVal?: number | null, suffix = ''): YoYDeltaResult | null {
  if (typeof prevVal !== 'number' || Number.isNaN(prevVal)) return null;
  const diff = currentVal - prevVal;
  if (diff > 0) return { diff, label: `+${diff}${suffix}`, direction: 'up' };
  if (diff < 0) return { diff, label: `${diff}${suffix}`, direction: 'down' };
  return { diff: 0, label: `0${suffix}`, direction: 'flat' };
}

export function sortSnapshotsByTA(list: DatabaseTahunAjaranRekap[]): DatabaseTahunAjaranRekap[] {
  return [...list].sort(
    (a, b) => parseStartYearFromTA(a.tahun_ajaran_masehi) - parseStartYearFromTA(b.tahun_ajaran_masehi)
  );
}
