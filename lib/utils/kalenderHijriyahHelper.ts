import {
  AgendaKalenderItem,
  BulanKalenderGrid,
  KATALOG_ATURAN_KEGIATAN,
  KategoriLiburAbsensi,
  KodeKegiatanKalender,
  SelKalenderGrid,
  TahunAjaranKalenderConfig,
} from '@/types/kalender';

export const NAMA_BULAN_MASEHI = [
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
] as const;

export const NAMA_BULAN_HIJRIYAH = [
  'MUHARROM',
  'SHOFAR',
  "RABI'UL AWWAL",
  "RABI'US TSANI",
  'JUMADIL ULA',
  'JUMADIL AKHIROH',
  'ROJAB',
  "SYA'BAN",
  'ROMADHON',
  'SYAWAL',
  "DZULQO'DAH",
  'DZULHIJJAH',
] as const;

export const NAMA_HARI_KALENDER = [
  'AHAD',
  'SENIN',
  'SELASA',
  'RABU',
  'KAMIS',
  "JUM'AT",
  'SABTU',
] as const;

export const PASARAN_JAWA_LIST = [
  'Legi',
  'Pahing',
  'Pon',
  'Wage',
  'Kliwon',
] as const;

/**
 * Daftar pilihan Tahun Ajaran yang tersedia di pemilih Kalender Kegiatan
 */
export const DAFTAR_TAHUN_AJARAN_KALENDER: TahunAjaranKalenderConfig[] = [
  {
    tahunAjaranMasehi: '2025/2026',
    tahunAjaranHijriyah: '1446/1447',
    startYearMasehi: 2025,
    startYearHijriyah: 1446,
    hijriOffsetDays: 0,
  },
  {
    tahunAjaranMasehi: '2026/2027',
    tahunAjaranHijriyah: '1447/1448',
    startYearMasehi: 2026,
    startYearHijriyah: 1447,
    hijriOffsetDays: 0,
  },
  {
    tahunAjaranMasehi: '2027/2028',
    tahunAjaranHijriyah: '1448/1449',
    startYearMasehi: 2027,
    startYearHijriyah: 1448,
    hijriOffsetDays: 0,
  },
  {
    tahunAjaranMasehi: '2028/2029',
    tahunAjaranHijriyah: '1449/1450',
    startYearMasehi: 2028,
    startYearHijriyah: 1449,
    hijriOffsetDays: 0,
  },
];

/**
 * Helper konversi Date UTC ke string YYYY-MM-DD
 */
export function toYMD(year: number, month1Based: number, day: number): string {
  const y = String(year);
  const m = String(month1Based).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseYMDToUTC(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y || 2025, (m || 1) - 1, d || 1));
}

export function dateUTCToYMD(dt: Date): string {
  return toYMD(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDaysYMD(ymd: string, days: number): string {
  const dt = parseYMDToUTC(ymd);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dateUTCToYMD(dt);
}

export function diffDaysYMD(ymdA: string, ymdB: string): number {
  const a = parseYMDToUTC(ymdA).getTime();
  const b = parseYMDToUTC(ymdB).getTime();
  return Math.round((a - b) / 86400000);
}

/**
 * Menghitung Pasaran Jawa dari tanggal YYYY-MM-DD.
 * Patokan resmi: Ahad, 8 Juni 2025 adalah Ahad Legi (index 0 = Legi).
 */
export function getPasaranJawa(
  ymd: string
): 'Legi' | 'Pahing' | 'Pon' | 'Wage' | 'Kliwon' {
  const diff = diffDaysYMD(ymd, '2025-06-08');
  const idx = ((diff % 5) + 5) % 5;
  return PASARAN_JAWA_LIST[idx];
}

/**
 * Tabel patokan awal bulan Hijriyah resmi Pondok Pesantren Darussalam Blokagung
 * untuk 1446 H s/d 1451 H (dengan dukungan koreksi hilal hijriOffsetDays).
 * Data 1446/1447 H sesuai 100% dengan dokumen PDF Perangkat 2025/2026 (Gambar 1 & Gambar 2).
 */
interface HijriMonthAnchor {
  yearH: number;
  monthH: number; // 1 = Muharrom .. 12 = Dzulhijjah
  startYMD: string;
  lengthDays: number;
}

const OFFICIAL_HIJRI_MONTHS_1446_1448: HijriMonthAnchor[] = [
  // Akhir 1446 H
  { yearH: 1446, monthH: 11, startYMD: '2025-04-29', lengthDays: 29 }, // Dzulqo'dah 46
  { yearH: 1446, monthH: 12, startYMD: '2025-05-28', lengthDays: 30 }, // Dzulhijjah 46 (1 Dzulhijjah = Rabu 28 Mei 2025)
  // Tahun 1447 H (Sesuai Gambar 1)
  { yearH: 1447, monthH: 1, startYMD: '2025-06-27', lengthDays: 30 }, // Muharrom 47 (1 Muharrom = Jum'at 27 Juni 2025)
  { yearH: 1447, monthH: 2, startYMD: '2025-07-27', lengthDays: 29 }, // Shofar 47 (1 Shofar = Ahad 27 Juli 2025)
  { yearH: 1447, monthH: 3, startYMD: '2025-08-25', lengthDays: 30 }, // Rabi'ul Awwal 47 (1 = Senin 25 Agu 2025)
  { yearH: 1447, monthH: 4, startYMD: '2025-09-24', lengthDays: 30 }, // Rabi'us Tsani 47 (1 = Rabu 24 Sep 2025)
  { yearH: 1447, monthH: 5, startYMD: '2025-10-24', lengthDays: 30 }, // Jumadil Ula 47 (1 = Jum'at 24 Okt 2025)
  { yearH: 1447, monthH: 6, startYMD: '2025-11-23', lengthDays: 29 }, // Jumadil Akhiroh 47 (1 = Ahad 23 Nov 2025)
  { yearH: 1447, monthH: 7, startYMD: '2025-12-22', lengthDays: 29 }, // Rojab 47 (1 = Senin 22 Des 2025)
  { yearH: 1447, monthH: 8, startYMD: '2026-01-20', lengthDays: 29 }, // Sya'ban 47 (1 = Selasa 20 Jan 2026)
  { yearH: 1447, monthH: 9, startYMD: '2026-02-18', lengthDays: 30 }, // Romadhon 47 (1 = Rabu 18 Feb 2026)
  { yearH: 1447, monthH: 10, startYMD: '2026-03-20', lengthDays: 29 }, // Syawal 47 (1 = Jum'at 20 Mar 2026)
  { yearH: 1447, monthH: 11, startYMD: '2026-04-18', lengthDays: 30 }, // Dzulqo'dah 47 (1 = Sabtu 18 Apr 2026)
  { yearH: 1447, monthH: 12, startYMD: '2026-05-18', lengthDays: 29 }, // Dzulhijjah 47 (1 = Senin 18 Mei 2026)
  // Tahun 1448 H (Proyeksi berkesinambungan mulai Selasa 16 Juni 2026)
  { yearH: 1448, monthH: 1, startYMD: '2026-06-16', lengthDays: 30 },
  { yearH: 1448, monthH: 2, startYMD: '2026-07-16', lengthDays: 29 },
  { yearH: 1448, monthH: 3, startYMD: '2026-08-14', lengthDays: 30 },
  { yearH: 1448, monthH: 4, startYMD: '2026-09-13', lengthDays: 30 },
  { yearH: 1448, monthH: 5, startYMD: '2026-10-13', lengthDays: 29 },
  { yearH: 1448, monthH: 6, startYMD: '2026-11-11', lengthDays: 30 },
  { yearH: 1448, monthH: 7, startYMD: '2026-12-11', lengthDays: 29 },
  { yearH: 1448, monthH: 8, startYMD: '2027-01-09', lengthDays: 30 },
  { yearH: 1448, monthH: 9, startYMD: '2027-02-08', lengthDays: 30 },
  { yearH: 1448, monthH: 10, startYMD: '2027-03-10', lengthDays: 29 },
  { yearH: 1448, monthH: 11, startYMD: '2027-04-08', lengthDays: 30 },
  { yearH: 1448, monthH: 12, startYMD: '2027-05-08', lengthDays: 29 },
];

/**
 * Membangun tabel bulan Hijriyah dinamis hingga tahun 1455 H
 */
function getFullHijriAnchors(hijriOffsetDays = 0): HijriMonthAnchor[] {
  const list: HijriMonthAnchor[] = OFFICIAL_HIJRI_MONTHS_1446_1448.map((m) => ({
    ...m,
    startYMD:
      hijriOffsetDays !== 0 ? addDaysYMD(m.startYMD, hijriOffsetDays) : m.startYMD,
  }));

  let last = list[list.length - 1];
  for (let y = 1449; y <= 1454; y++) {
    for (let m = 1; m <= 12; m++) {
      const nextStart = addDaysYMD(last.startYMD, last.lengthDays);
      const len = m % 2 === 1 || (m === 12 && y % 3 === 0) ? 30 : 29;
      last = { yearH: y, monthH: m, startYMD: nextStart, lengthDays: len };
      list.push(last);
    }
  }
  return list;
}

/**
 * Mengonversi tanggal Masehi (YYYY-MM-DD) ke Tanggal Hijriyah { yearH, monthH, dayH }
 */
export function masehiToHijri(
  ymd: string,
  hijriOffsetDays = 0
): { yearH: number; monthH: number; dayH: number; monthName: string } {
  const anchors = getFullHijriAnchors(hijriOffsetDays);
  for (let i = anchors.length - 1; i >= 0; i--) {
    const a = anchors[i];
    if (ymd >= a.startYMD) {
      const diff = diffDaysYMD(ymd, a.startYMD);
      if (diff < a.lengthDays) {
        return {
          yearH: a.yearH,
          monthH: a.monthH,
          dayH: diff + 1,
          monthName: NAMA_BULAN_HIJRIYAH[a.monthH - 1] || 'HIJRIYAH',
        };
      }
    }
  }
  // Fallback sebelum 1446 H
  const first = anchors[0];
  const diffBefore = diffDaysYMD(first.startYMD, ymd);
  const dH = Math.max(1, 30 - (diffBefore % 30));
  return {
    yearH: 1446,
    monthH: 10,
    dayH: dH,
    monthName: 'SYAWAL',
  };
}

/**
 * Mengonversi Tanggal Hijriyah (yearH, monthH 1..12, dayH 1..30) ke Masehi (YYYY-MM-DD)
 */
export function hijriToMasehi(
  yearH: number,
  monthH: number,
  dayH: number,
  hijriOffsetDays = 0
): string {
  const anchors = getFullHijriAnchors(hijriOffsetDays);
  const found = anchors.find((a) => a.yearH === yearH && a.monthH === monthH);
  if (found) {
    const clampedDay = Math.max(1, Math.min(dayH, found.lengthDays));
    return addDaysYMD(found.startYMD, clampedDay - 1);
  }
  return '2025-06-27';
}

export function getHijriMonthAnchor(
  yearH: number,
  monthH: number,
  hijriOffsetDays = 0
): HijriMonthAnchor {
  const anchors = getFullHijriAnchors(hijriOffsetDays);
  return (
    anchors.find((a) => a.yearH === yearH && a.monthH === monthH) || {
      yearH,
      monthH,
      startYMD: '2025-06-27',
      lengthDays: 30,
    }
  );
}

/**
 * Helper menambahkan rentang tanggal ke map agenda
 */
function assignRangeAgenda(
  map: Record<string, AgendaKalenderItem>,
  startYMD: string,
  endYMD: string,
  kode: KodeKegiatanKalender,
  aturanOverride?: Partial<Record<KodeKegiatanKalender, boolean>>,
  catatanKhusus?: string
) {
  const meta = KATALOG_ATURAN_KEGIATAN[kode];
  const isLibur =
    aturanOverride && typeof aturanOverride[kode] === 'boolean'
      ? Boolean(aturanOverride[kode])
      : meta.defaultIsLiburKbm;

  let curr = startYMD;
  while (curr <= endYMD) {
    map[curr] = {
      tanggalMasehi: curr,
      kode,
      namaKegiatan: catatanKhusus || meta.namaKegiatan,
      isLiburKbm: isLibur,
      kategoriLibur: meta.kategoriLiburAbsensi,
      isAutoGenerated: true,
    };
    curr = addDaysYMD(curr, 1);
  }
}

/**
 * Menghasilkan Data Kalender Kegiatan Presisi Tinggi:
 * - Untuk Tahun Ajaran 2025/2026 (1446/1447 H): 100% sesuai Gambar 1 dan Gambar 2.
 * - Untuk Tahun Ajaran berikutnya (2026/2027 dst.): Dihitung otomatis berdasarkan
 *   siklus Selapanan Ahad Legi (35 hari) & patokan tanggal Hijriyah pesantren.
 */
export function generateAgendaTahunAjaran(
  config: TahunAjaranKalenderConfig,
  aturanLiburOverride?: Partial<Record<KodeKegiatanKalender, boolean>>
): Record<string, AgendaKalenderItem> {
  const map: Record<string, AgendaKalenderItem> = {};
  const { startYearMasehi, startYearHijriyah, hijriOffsetDays } = config;

  // Jika Tahun Ajaran 2025/2026 dengan offset 0, gunakan titik tanggal persis Gambar 1 & Gambar 2
  if (startYearMasehi === 2025 && hijriOffsetDays === 0) {
    // 1. Siklus Pra Ahad Legi (PAL) & Ahad Legi (AL) sepanjang Mei 2025 - Juni 2026
    const palDates2025 = [
      '2025-05-28',
      '2025-06-01',
      '2025-07-02',
      '2025-08-06',
      '2025-09-10',
      '2025-10-15',
      '2025-11-12',
      '2025-12-24',
      '2026-01-28',
      '2026-04-15',
      '2026-05-13',
    ];
    palDates2025.forEach((d) =>
      assignRangeAgenda(map, d, d, 'PAL', aturanLiburOverride)
    );

    const alDates2025 = [
      '2025-06-08',
      '2025-07-13',
      '2025-08-17',
      '2025-09-21',
      '2025-10-26',
      '2025-11-23',
      '2025-12-28',
      '2026-01-04',
      '2026-02-01',
      '2026-04-19',
      '2026-05-24',
      '2026-06-28',
    ];
    alDates2025.forEach((d) =>
      assignRangeAgenda(map, d, d, 'AL', aturanLiburOverride)
    );

    // 2. Kegiatan Juni 2025 (Akhir TA Sebelumnya & Pembukaan TA 2025/2026)
    assignRangeAgenda(map, '2025-06-03', '2025-06-05', 'PS', aturanLiburOverride);
    assignRangeAgenda(map, '2025-06-07', '2025-06-07', 'E & DS', aturanLiburOverride);
    assignRangeAgenda(map, '2025-06-09', '2025-06-12', 'E & DS', aturanLiburOverride);
    assignRangeAgenda(map, '2025-06-14', '2025-06-19', 'E & DS', aturanLiburOverride);
    assignRangeAgenda(map, '2025-06-25', '2025-06-25', 'TKA', aturanLiburOverride);
    assignRangeAgenda(
      map,
      '2025-06-26',
      '2025-06-26',
      'TKA',
      aturanLiburOverride,
      'Haflah Akhirussanah'
    );
    assignRangeAgenda(map, '2025-06-27', '2025-06-27', 'AB', aturanLiburOverride);

    // 3. Rabi'ul Awwal 1447 H (Agustus - September 2025): Ngaji Maulud & Libur Maulud
    assignRangeAgenda(map, '2025-08-30', '2025-09-04', 'NM', aturanLiburOverride);
    assignRangeAgenda(map, '2025-09-07', '2025-09-09', 'LM', aturanLiburOverride);

    // 4. Rabi'us Tsani 1447 H (September - Oktober 2025): UUB I & Tes Kitab I
    assignRangeAgenda(map, '2025-09-27', '2025-10-02', 'UUB', aturanLiburOverride);
    assignRangeAgenda(map, '2025-10-04', '2025-10-09', 'TK', aturanLiburOverride);

    // 5. Jumadil Ula & Jumadil Akhiroh 1447 H (November 2025): Daur Awwal & Apel Madina
    assignRangeAgenda(map, '2025-11-15', '2025-11-20', 'DA', aturanLiburOverride);
    assignRangeAgenda(map, '2025-11-25', '2025-11-25', 'APL', aturanLiburOverride);

    // 6. Sya'ban, Romadhon & Syawal 1447 H (Februari - April 2026): Imtihan, Ngaji Ramadhan, Libur Hari Raya, HBH
    assignRangeAgenda(map, '2026-02-07', '2026-02-08', 'IMTHN', aturanLiburOverride);
    assignRangeAgenda(map, '2026-02-09', '2026-03-09', 'NR', aturanLiburOverride);
    assignRangeAgenda(map, '2026-03-10', '2026-04-08', 'LHR', aturanLiburOverride);
    assignRangeAgenda(map, '2026-04-12', '2026-04-12', 'HBH', aturanLiburOverride);

    // 7. Dzulqo'dah 1447 H (April - Mei 2026): UUB II & Tes Kitab II
    assignRangeAgenda(map, '2026-04-25', '2026-04-30', 'UUB', aturanLiburOverride);
    assignRangeAgenda(map, '2026-05-02', '2026-05-07', 'TK', aturanLiburOverride);

    // 8. Dzulhijjah 1447 H / Juni 2026: Pra Sidang, EBTA & Daur Tsani, Sidang, TKA & Ajaran Baru
    assignRangeAgenda(map, '2026-06-02', '2026-06-04', 'PS', aturanLiburOverride);
    assignRangeAgenda(map, '2026-06-12', '2026-06-12', 'E & DS', aturanLiburOverride);
    assignRangeAgenda(map, '2026-06-13', '2026-06-18', 'E & DS', aturanLiburOverride);
    assignRangeAgenda(map, '2026-06-21', '2026-06-21', 'SL', aturanLiburOverride);
    assignRangeAgenda(map, '2026-06-22', '2026-06-23', 'SN', aturanLiburOverride);
    assignRangeAgenda(map, '2026-06-24', '2026-06-24', 'TKA', aturanLiburOverride);
    assignRangeAgenda(
      map,
      '2026-06-25',
      '2026-06-25',
      'TKA',
      aturanLiburOverride,
      'Haflah Akhirussanah'
    );
    assignRangeAgenda(map, '2026-06-26', '2026-06-26', 'AB', aturanLiburOverride);

    return map;
  }

  // ============================================================================
  // ALGORITMA AUTO-GENERATOR UNTUK TAHUN AJARAN BARU (2026/2027, 2027/2028, DST.)
  // ============================================================================
  const targetHijriYear = startYearHijriyah + 1; // Misal TA 2026/2027 -> mayoritas bulan ada di 1448 H
  const rangeStartYMD = `${startYearMasehi}-05-20`;
  const rangeEndYMD = `${startYearMasehi + 1}-07-05`;

  // 1. Generate seluruh Ahad Legi (AL) & Pra Ahad Legi (PAL) secara otomatis dari siklus 35 hari
  let curr = rangeStartYMD;
  while (curr <= rangeEndYMD) {
    const dt = parseYMDToUTC(curr);
    if (dt.getUTCDay() === 0 && getPasaranJawa(curr) === 'Legi') {
      // Hari Ahad Legi ditemukan
      assignRangeAgenda(map, curr, curr, 'AL', aturanLiburOverride);
      // Rabu sebelum Ahad Legi (-4 hari) adalah Pra Ahad Legi (PAL)
      const rabuPal = addDaysYMD(curr, -4);
      assignRangeAgenda(map, rabuPal, rabuPal, 'PAL', aturanLiburOverride);
    }
    curr = addDaysYMD(curr, 1);
  }

  // Helper mencari hari Sabtu terdekat dari suatu tanggal Hijriyah untuk pekan ujian (Sabtu-Kamis)
  const findNearestSaturday = (ymd: string): string => {
    const dt = parseYMDToUTC(ymd);
    const dow = dt.getUTCDay(); // 6 = Sabtu
    const diffToSat = (6 - dow + 7) % 7;
    return addDaysYMD(ymd, diffToSat);
  };

  // 2. Rabi'ul Awwal (Bulan 3): 6-11 NM, 13-15 LM
  const nmStart = hijriToMasehi(targetHijriYear, 3, 6, hijriOffsetDays);
  const nmEnd = hijriToMasehi(targetHijriYear, 3, 11, hijriOffsetDays);
  assignRangeAgenda(map, nmStart, nmEnd, 'NM', aturanLiburOverride);

  const lmStart = hijriToMasehi(targetHijriYear, 3, 13, hijriOffsetDays);
  const lmEnd = hijriToMasehi(targetHijriYear, 3, 15, hijriOffsetDays);
  assignRangeAgenda(map, lmStart, lmEnd, 'LM', aturanLiburOverride);

  // 3. Rabi'us Tsani (Bulan 4): UUB I (Sabtu-Kamis pekan ke-1) & TK I (Sabtu-Kamis pekan ke-2)
  const uub1Start = findNearestSaturday(
    hijriToMasehi(targetHijriYear, 4, 2, hijriOffsetDays)
  );
  assignRangeAgenda(
    map,
    uub1Start,
    addDaysYMD(uub1Start, 5),
    'UUB',
    aturanLiburOverride
  );
  const tk1Start = addDaysYMD(uub1Start, 7);
  assignRangeAgenda(
    map,
    tk1Start,
    addDaysYMD(tk1Start, 5),
    'TK',
    aturanLiburOverride
  );

  // 4. Jumadil Ula (Bulan 5) & Jumadil Akhiroh (Bulan 6): Daur Awwal (DA) & Apel Madina (APL)
  const daStart = findNearestSaturday(
    hijriToMasehi(targetHijriYear, 5, 21, hijriOffsetDays)
  );
  assignRangeAgenda(
    map,
    daStart,
    addDaysYMD(daStart, 5),
    'DA',
    aturanLiburOverride
  );
  const aplDate = hijriToMasehi(targetHijriYear, 6, 3, hijriOffsetDays);
  assignRangeAgenda(map, aplDate, aplDate, 'APL', aturanLiburOverride);

  // 5. Sya'ban (Bulan 8), Romadhon (Bulan 9), Syawal (Bulan 10): IMTHN, NR, LHR, HBH
  const imthnStart = hijriToMasehi(targetHijriYear, 8, 19, hijriOffsetDays);
  const imthnEnd = hijriToMasehi(targetHijriYear, 8, 20, hijriOffsetDays);
  assignRangeAgenda(map, imthnStart, imthnEnd, 'IMTHN', aturanLiburOverride);

  const nrStart = hijriToMasehi(targetHijriYear, 8, 21, hijriOffsetDays);
  const nrEnd = hijriToMasehi(targetHijriYear, 9, 20, hijriOffsetDays);
  assignRangeAgenda(map, nrStart, nrEnd, 'NR', aturanLiburOverride);

  const lhrStart = hijriToMasehi(targetHijriYear, 9, 21, hijriOffsetDays);
  const lhrEnd = hijriToMasehi(targetHijriYear, 10, 20, hijriOffsetDays);
  assignRangeAgenda(map, lhrStart, lhrEnd, 'LHR', aturanLiburOverride);

  const hbhDate = hijriToMasehi(targetHijriYear, 10, 24, hijriOffsetDays);
  assignRangeAgenda(map, hbhDate, hbhDate, 'HBH', aturanLiburOverride);

  // 6. Dzulqo'dah (Bulan 11): UUB II & TK II
  const uub2Start = findNearestSaturday(
    hijriToMasehi(targetHijriYear, 11, 6, hijriOffsetDays)
  );
  assignRangeAgenda(
    map,
    uub2Start,
    addDaysYMD(uub2Start, 5),
    'UUB',
    aturanLiburOverride
  );
  const tk2Start = addDaysYMD(uub2Start, 7);
  assignRangeAgenda(
    map,
    tk2Start,
    addDaysYMD(tk2Start, 5),
    'TK',
    aturanLiburOverride
  );

  // 7. Dzulhijjah (Bulan 12): Pra Sidang (PS), EBTA & Daur Tsani (E & DS), SL, SN, TKA, AB
  const edsStart = findNearestSaturday(
    hijriToMasehi(targetHijriYear, 12, 24, hijriOffsetDays)
  );
  const psStart = addDaysYMD(edsStart, -11);
  assignRangeAgenda(
    map,
    psStart,
    addDaysYMD(psStart, 2),
    'PS',
    aturanLiburOverride
  );
  assignRangeAgenda(
    map,
    edsStart,
    addDaysYMD(edsStart, 5),
    'E & DS',
    aturanLiburOverride
  );

  const slDate = addDaysYMD(edsStart, 8);
  assignRangeAgenda(map, slDate, slDate, 'SL', aturanLiburOverride);
  assignRangeAgenda(
    map,
    addDaysYMD(slDate, 1),
    addDaysYMD(slDate, 2),
    'SN',
    aturanLiburOverride
  );
  assignRangeAgenda(
    map,
    addDaysYMD(slDate, 3),
    addDaysYMD(slDate, 4),
    'TKA',
    aturanLiburOverride
  );
  assignRangeAgenda(
    map,
    addDaysYMD(slDate, 5),
    addDaysYMD(slDate, 5),
    'AB',
    aturanLiburOverride
  );

  return map;
}

/**
 * Membangun 13 Matriks Bulan Masehi (Juni Tahun Awal s/d Juni Tahun Berikutnya)
 * persis seperti tata letak Kalender Masehi Gambar 2
 */
export function buildGrid13BulanMasehi(
  config: TahunAjaranKalenderConfig,
  agendaMap: Record<string, AgendaKalenderItem>
): BulanKalenderGrid[] {
  const result: BulanKalenderGrid[] = [];
  const { startYearMasehi, hijriOffsetDays } = config;

  // 13 bulan: Juni (bulan 6) tahun awal s/d Juni (bulan 6) tahun berikutnya
  for (let i = 0; i < 13; i++) {
    const totalMonthZero = 5 + i; // 5 = Juni (0-indexed)
    const year = startYearMasehi + Math.floor(totalMonthZero / 12);
    const monthZero = totalMonthZero % 12;
    const month1 = monthZero + 1;

    const firstDayUTC = new Date(Date.UTC(year, monthZero, 1));
    const startDow = firstDayUTC.getUTCDay(); // 0 (Ahad) .. 6 (Sabtu)
    const gridStartUTC = new Date(Date.UTC(year, monthZero, 1 - startDow));

    const weeks: SelKalenderGrid[][] = [];
    for (let w = 0; w < 5; w++) {
      const row: SelKalenderGrid[] = [];
      for (let d = 0; d < 7; d++) {
        const cellUTC = new Date(gridStartUTC.getTime());
        cellUTC.setUTCDate(gridStartUTC.getUTCDate() + w * 7 + d);

        // Jika minggu ke-6 jatuh di bulan yang sama (misal tgl 30/31 di baris ke-5),
        // kita tetap memeriksa apakah tanggal +7 hari masih di bulan yang sama
        const ymd = dateUTCToYMD(cellUTC);
        const hInfo = masehiToHijri(ymd, hijriOffsetDays);
        const isCurrentMonth =
          cellUTC.getUTCFullYear() === year &&
          cellUTC.getUTCMonth() === monthZero;

        row.push({
          tanggalMasehi: ymd,
          dayMasehi: cellUTC.getUTCDate(),
          monthMasehi: cellUTC.getUTCMonth() + 1,
          yearMasehi: cellUTC.getUTCFullYear(),
          dayHijri: hInfo.dayH,
          monthHijri: hInfo.monthH,
          yearHijri: hInfo.yearH,
          dayOfWeek: d,
          isCurrentMonth,
          isFriday: d === 5,
          pasaranJawa: getPasaranJawa(ymd),
          agenda: agendaMap[ymd],
        });
      }
      weeks.push(row);
    }

    // Cek apakah masih ada sisa tanggal bulan ini di minggu ke-6 (baris ke-6)
    const sixthWeekStartUTC = new Date(gridStartUTC.getTime());
    sixthWeekStartUTC.setUTCDate(gridStartUTC.getUTCDate() + 35);
    if (
      sixthWeekStartUTC.getUTCFullYear() === year &&
      sixthWeekStartUTC.getUTCMonth() === monthZero
    ) {
      const row6: SelKalenderGrid[] = [];
      for (let d = 0; d < 7; d++) {
        const cellUTC = new Date(sixthWeekStartUTC.getTime());
        cellUTC.setUTCDate(sixthWeekStartUTC.getUTCDate() + d);
        const ymd = dateUTCToYMD(cellUTC);
        const hInfo = masehiToHijri(ymd, hijriOffsetDays);
        const isCurrentMonth =
          cellUTC.getUTCFullYear() === year &&
          cellUTC.getUTCMonth() === monthZero;
        row6.push({
          tanggalMasehi: ymd,
          dayMasehi: cellUTC.getUTCDate(),
          monthMasehi: cellUTC.getUTCMonth() + 1,
          yearMasehi: cellUTC.getUTCFullYear(),
          dayHijri: hInfo.dayH,
          monthHijri: hInfo.monthH,
          yearHijri: hInfo.yearH,
          dayOfWeek: d,
          isCurrentMonth,
          isFriday: d === 5,
          pasaranJawa: getPasaranJawa(ymd),
          agenda: agendaMap[ymd],
        });
      }
      weeks.push(row6);
    }

    const monthName = NAMA_BULAN_MASEHI[monthZero];
    result.push({
      id: `masehi-${year}-${month1}`,
      titleSidebar: `${monthName} ${year}`,
      subtitleHeader: `${monthName} ${year}`,
      monthNumber: month1,
      yearNumber: year,
      sidebarVariant: year === startYearMasehi ? 'amber' : 'lime',
      weeks,
    });
  }

  return result;
}

/**
 * Membangun 13 Matriks Bulan Hijriyah (Dzulhijjah Tahun Awal s/d Dzulhijjah Tahun Berikutnya)
 * persis seperti tata letak Kalender Hijriyah Gambar 1
 */
export function buildGrid13BulanHijriyah(
  config: TahunAjaranKalenderConfig,
  agendaMap: Record<string, AgendaKalenderItem>
): BulanKalenderGrid[] {
  const result: BulanKalenderGrid[] = [];
  const { startYearHijriyah, hijriOffsetDays } = config;

  // Urutan 13 bulan: Dzulhijjah (12) tahun awal, lalu Muharrom (1) s/d Dzulhijjah (12) tahun berikutnya
  const sequence: Array<{ yearH: number; monthH: number }> = [
    { yearH: startYearHijriyah, monthH: 12 },
  ];
  for (let m = 1; m <= 12; m++) {
    sequence.push({ yearH: startYearHijriyah + 1, monthH: m });
  }

  sequence.forEach(({ yearH, monthH }) => {
    const anchor = getHijriMonthAnchor(yearH, monthH, hijriOffsetDays);
    const firstDayUTC = parseYMDToUTC(anchor.startYMD);
    const startDow = firstDayUTC.getUTCDay(); // 0 (Ahad) .. 6 (Sabtu)
    const gridStartUTC = new Date(firstDayUTC.getTime());
    gridStartUTC.setUTCDate(firstDayUTC.getUTCDate() - startDow);

    const endDayYMD = addDaysYMD(anchor.startYMD, anchor.lengthDays - 1);

    const weeks: SelKalenderGrid[][] = [];
    for (let w = 0; w < 5; w++) {
      const row: SelKalenderGrid[] = [];
      for (let d = 0; d < 7; d++) {
        const cellUTC = new Date(gridStartUTC.getTime());
        cellUTC.setUTCDate(gridStartUTC.getUTCDate() + w * 7 + d);
        const ymd = dateUTCToYMD(cellUTC);
        const hInfo = masehiToHijri(ymd, hijriOffsetDays);
        const isCurrentMonth = ymd >= anchor.startYMD && ymd <= endDayYMD;

        row.push({
          tanggalMasehi: ymd,
          dayMasehi: cellUTC.getUTCDate(),
          monthMasehi: cellUTC.getUTCMonth() + 1,
          yearMasehi: cellUTC.getUTCFullYear(),
          dayHijri: hInfo.dayH,
          monthHijri: hInfo.monthH,
          yearHijri: hInfo.yearH,
          dayOfWeek: d,
          isCurrentMonth,
          isFriday: d === 5,
          pasaranJawa: getPasaranJawa(ymd),
          agenda: agendaMap[ymd],
        });
      }
      weeks.push(row);
    }

    // Cek apakah hari ke-29/30 Hijriyah masih jatuh di minggu ke-6
    const sixthWeekStartUTC = new Date(gridStartUTC.getTime());
    sixthWeekStartUTC.setUTCDate(gridStartUTC.getUTCDate() + 35);
    const sixthWeekStartYMD = dateUTCToYMD(sixthWeekStartUTC);
    if (sixthWeekStartYMD <= endDayYMD) {
      const row6: SelKalenderGrid[] = [];
      for (let d = 0; d < 7; d++) {
        const cellUTC = new Date(sixthWeekStartUTC.getTime());
        cellUTC.setUTCDate(sixthWeekStartUTC.getUTCDate() + d);
        const ymd = dateUTCToYMD(cellUTC);
        const hInfo = masehiToHijri(ymd, hijriOffsetDays);
        const isCurrentMonth = ymd >= anchor.startYMD && ymd <= endDayYMD;
        row6.push({
          tanggalMasehi: ymd,
          dayMasehi: cellUTC.getUTCDate(),
          monthMasehi: cellUTC.getUTCMonth() + 1,
          yearMasehi: cellUTC.getUTCFullYear(),
          dayHijri: hInfo.dayH,
          monthHijri: hInfo.monthH,
          yearHijri: hInfo.yearH,
          dayOfWeek: d,
          isCurrentMonth,
          isFriday: d === 5,
          pasaranJawa: getPasaranJawa(ymd),
          agenda: agendaMap[ymd],
        });
      }
      weeks.push(row6);
    }

    const shortYearH = String(yearH).slice(-2);
    const monthNameH = NAMA_BULAN_HIJRIYAH[monthH - 1];
    result.push({
      id: `hijri-${yearH}-${monthH}`,
      titleSidebar: `${monthNameH} ${shortYearH}`,
      subtitleHeader: `${monthNameH} ${yearH} H`,
      monthNumber: monthH,
      yearNumber: yearH,
      sidebarVariant: yearH === startYearHijriyah ? 'amber' : 'lime',
      weeks,
    });
  });

  return result;
}

/**
 * Membangun peta HariLiburInfo bawaan dari Kalender Kegiatan lintas Tahun Ajaran
 * untuk disinkronkan langsung dengan useAbsensiStore (Pengaturan Hari Libur / Event).
 */
export function buildDefaultLiburMapFromKalender(): Record<
  string,
  {
    tanggal: string;
    hari: string;
    kategori: string;
    keterangan: string;
    diinputOleh: string;
  }
> {
  const liburMap: Record<
    string,
    {
      tanggal: string;
      hari: string;
      kategori: string;
      keterangan: string;
      diinputOleh: string;
    }
  > = {};

  const hariIndo = [
    'Ahad',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
  ];

  DAFTAR_TAHUN_AJARAN_KALENDER.forEach((cfg) => {
    const agendas = generateAgendaTahunAjaran(cfg);
    Object.values(agendas).forEach((item) => {
      if (!item.isLiburKbm) return;
      const dt = parseYMDToUTC(item.tanggalMasehi);
      liburMap[item.tanggalMasehi] = {
        tanggal: item.tanggalMasehi,
        hari: hariIndo[dt.getUTCDay()] || '-',
        kategori: item.kategoriLibur,
        keterangan: `[${item.kode}] ${item.namaKegiatan}`,
        diinputOleh: 'Sinkron Kalender Kegiatan',
      };
    });
  });

  return liburMap;
}

