const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

const BULAN_PENDEK_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const BULAN_PANJANG_ID = [
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
] as const;

export type BeritaDateVariant = 'short' | 'dayMonth' | 'longWithWeekday';

/**
 * Memformat ISO timestamp berita ke kalender WIB (Asia/Jakarta, UTC+7) secara
 * deterministik agar hasil SSR server UTC identik dengan browser klien.
 */
export function formatBeritaDateWib(
  isoDateString: string | null | undefined,
  variant: BeritaDateVariant = 'short'
): string {
  if (!isoDateString) return '-';
  const parsedMs = Date.parse(isoDateString);
  if (Number.isNaN(parsedMs)) return '-';

  const wibDate = new Date(parsedMs + WIB_OFFSET_MS);
  const year = wibDate.getUTCFullYear();
  const monthIdx = wibDate.getUTCMonth();
  const day = wibDate.getUTCDate();
  const weekdayIdx = wibDate.getUTCDay();

  if (variant === 'dayMonth') {
    return `${day} ${BULAN_PENDEK_ID[monthIdx]}`;
  }

  if (variant === 'longWithWeekday') {
    return `${HARI_INDONESIA[weekdayIdx]}, ${day} ${BULAN_PANJANG_ID[monthIdx]} ${year}`;
  }

  return `${day} ${BULAN_PENDEK_ID[monthIdx]} ${year}`;
}

/**
 * Mengembalikan tahun kalender aktif di zona waktu WIB (UTC+7) secara deterministik.
 */
export function getCurrentYearWib(nowMs: number = Date.now()): number {
  return new Date(nowMs + WIB_OFFSET_MS).getUTCFullYear();
}
