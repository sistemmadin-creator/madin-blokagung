/**
 * Helper Perhitungan Kalender Hari Minggu & Penataan Linimasa Santri
 * Sistem Database & Presensi KBM Madin Al Amiriyyah Blokagung
 */

export interface SundayOption {
  mingguKe: number; // 1, 2, 3, 4, atau 5
  tanggal: string; // ISO format: 'YYYY-MM-DD'
  labelLengkap: string; // contoh: 'Minggu 1 (05 Jul 2026)'
  labelSingkat: string; // contoh: 'M1 (05/07)'
  dayNumber: number; // 1..31
  formattedDisplay: string; // '05/07/2026'
  isCurrentWeek?: boolean;
}

export interface AcademicMonthInfo {
  key: string; // '2026-06' (year-monthIndex)
  year: number;
  monthIndex: number; // 0 = Jan, 6 = Jul, 11 = Des
  monthName: string; // 'Juli', 'Agustus', etc.
  monthNameShort: string; // 'Jul', 'Ags', etc.
  sundays: SundayOption[];
  semester: 'Ganjil' | 'Genap';
  colSpan: number; // 4 atau 5
}

export const MONTH_NAMES_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Ags',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/**
 * Menghasilkan semua hari Minggu pada bulan dan tahun tertentu.
 * Otomatis mendeteksi apakah bulan tersebut memiliki 4 atau 5 hari Minggu.
 */
export function getSundaysInMonth(year: number, monthIndex: number): SundayOption[] {
  const sundays: SundayOption[] = [];
  const date = new Date(year, monthIndex, 1);
  const todayStr = new Date().toISOString().split('T')[0];
  let mingguCounter = 1;

  while (date.getMonth() === monthIndex) {
    if (date.getDay() === 0) {
      // Hari Minggu
      const yStr = date.getFullYear();
      const mStr = String(date.getMonth() + 1).padStart(2, '0');
      const dStr = String(date.getDate()).padStart(2, '0');
      const isoDate = `${yStr}-${mStr}-${dStr}`;

      sundays.push({
        mingguKe: mingguCounter,
        tanggal: isoDate,
        dayNumber: date.getDate(),
        labelLengkap: `Minggu ${mingguCounter} (${dStr} ${MONTH_NAMES_SHORT[monthIndex]} ${yStr})`,
        labelSingkat: `M${mingguCounter} (${dStr}/${mStr})`,
        formattedDisplay: `${dStr}/${mStr}/${yStr}`,
        isCurrentWeek: isoDate === todayStr,
      });
      mingguCounter++;
    }
    date.setDate(date.getDate() + 1);
  }

  return sundays;
}

/**
 * Menghasilkan susunan 12 bulan kalender akademik (Juli s.d. Juni tahun berikutnya).
 * Masing-masing bulan memuat hari Minggu dinamis (4 atau 5 hari Minggu).
 */
export function getAcademicYearMonths(startYear: number): AcademicMonthInfo[] {
  // Urutan bulan dalam tahun ajaran:
  // Semester Ganjil: Juli (6), Agustus (7), September (8), Oktober (9), November (10), Desember (11) di tahun `startYear`
  // Semester Genap: Januari (0), Februari (1), Maret (2), April (3), Mei (4), Juni (5) di tahun `startYear + 1`
  const schedule: { monthIndex: number; yearOffset: number; semester: 'Ganjil' | 'Genap' }[] = [
    { monthIndex: 6, yearOffset: 0, semester: 'Ganjil' }, // Juli
    { monthIndex: 7, yearOffset: 0, semester: 'Ganjil' }, // Agustus
    { monthIndex: 8, yearOffset: 0, semester: 'Ganjil' }, // September
    { monthIndex: 9, yearOffset: 0, semester: 'Ganjil' }, // Oktober
    { monthIndex: 10, yearOffset: 0, semester: 'Ganjil' }, // November
    { monthIndex: 11, yearOffset: 0, semester: 'Ganjil' }, // Desember
    { monthIndex: 0, yearOffset: 1, semester: 'Genap' }, // Januari
    { monthIndex: 1, yearOffset: 1, semester: 'Genap' }, // Februari
    { monthIndex: 2, yearOffset: 1, semester: 'Genap' }, // Maret
    { monthIndex: 3, yearOffset: 1, semester: 'Genap' }, // April
    { monthIndex: 4, yearOffset: 1, semester: 'Genap' }, // Mei
    { monthIndex: 5, yearOffset: 1, semester: 'Genap' }, // Juni
  ];

  return schedule.map((item) => {
    const year = startYear + item.yearOffset;
    const sundays = getSundaysInMonth(year, item.monthIndex);
    return {
      key: `${year}-${String(item.monthIndex + 1).padStart(2, '0')}`,
      year,
      monthIndex: item.monthIndex,
      monthName: MONTH_NAMES_INDONESIA[item.monthIndex],
      monthNameShort: MONTH_NAMES_SHORT[item.monthIndex],
      sundays,
      semester: item.semester,
      colSpan: sundays.length,
    };
  });
}

/**
 * Mencari hari Minggu terdekat dari hari ini dalam kumpulan pilihan hari Minggu
 */
export function getClosestSunday(sundays: SundayOption[]): SundayOption | null {
  if (!sundays || sundays.length === 0) return null;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Cek apakah ada yang persis hari ini
  const exact = sundays.find((s) => s.tanggal === todayStr);
  if (exact) return exact;

  // 2. Cek hari Minggu terdekat setelah hari ini, atau hari Minggu terakhir yang baru lewat
  const todayTime = new Date(todayStr).getTime();
  let closest: SundayOption = sundays[0];
  let minDiff = Math.abs(new Date(sundays[0].tanggal).getTime() - todayTime);

  for (const s of sundays) {
    const diff = Math.abs(new Date(s.tanggal).getTime() - todayTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }

  return closest;
}

/**
 * Format peletakan nama kelas standar: '1 A ULA (PA)'
 */
export function formatKelasMadin(
  din_kls?: string,
  din_bag?: string,
  tingkat?: string,
  pa_pi?: string
): string {
  const base = [din_kls, din_bag, tingkat].filter(Boolean).join(' ').trim();
  const cleanGender = pa_pi ? pa_pi.trim().toUpperCase() : '';
  return cleanGender ? `${base} (${cleanGender})` : base;
}

/**
 * Peringkat hierarki tingkat madin untuk sorting
 */
export const TINGKAT_RANK_FORMASI: Record<string, number> = {
  "ISTI'DAD": 1,
  ISTIDAD: 1,
  ULA: 2,
  WUSTHO: 3,
  ULYA: 4,
};

/**
 * Mengurutkan data santri persis seperti tata urutan formasi kelas di Gambar 3:
 * 1. Tingkat: ISTI'DAD -> ULA -> WUSTHO -> ULYA
 * 2. Kelas: 1 -> 2 -> 3 -> 4...
 * 3. Bagian: A -> B -> C -> D...
 * 4. Gender: PA (Putra) -> PI (Putri)
 * 5. Nama Santri: A -> Z
 */
export function sortSantriByFormasiHierarchy<
  T extends {
    tingkat?: string;
    din_kls?: string;
    din_bag?: string;
    pa_pi?: string;
    gender?: string;
    nama?: string;
    nama_lengkap?: string;
    no_induk?: string;
  }
>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    // 1. Tingkat
    const tA = TINGKAT_RANK_FORMASI[(a.tingkat || '').trim().toUpperCase()] || 99;
    const tB = TINGKAT_RANK_FORMASI[(b.tingkat || '').trim().toUpperCase()] || 99;
    if (tA !== tB) return tA - tB;

    // 2. Kelas (din_kls)
    const kA = parseInt(String(a.din_kls || '0').replace(/\D/g, ''), 10) || 0;
    const kB = parseInt(String(b.din_kls || '0').replace(/\D/g, ''), 10) || 0;
    if (kA !== kB) return kA - kB;

    // 3. Bagian (din_bag)
    const bA = String(a.din_bag || '').trim().toUpperCase();
    const bB = String(b.din_bag || '').trim().toUpperCase();
    const bagComp = bA.localeCompare(bB);
    if (bagComp !== 0) return bagComp;

    // 4. Gender (PA duluan, lalu PI)
    const gA = String(a.pa_pi || a.gender || '').trim().toUpperCase();
    const gB = String(b.pa_pi || b.gender || '').trim().toUpperCase();
    const genderComp = gA.localeCompare(gB);
    if (genderComp !== 0) return genderComp;

    // 5. Nama Santri (A-Z)
    const nA = String(a.nama || a.nama_lengkap || '').trim().toLowerCase();
    const nB = String(b.nama || b.nama_lengkap || '').trim().toLowerCase();
    const nameComp = nA.localeCompare(nB);
    if (nameComp !== 0) return nameComp;

    // 6. Fallback No Induk
    return String(a.no_induk || '').localeCompare(String(b.no_induk || ''));
  });
}
