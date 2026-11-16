import { sanitizeHttpUrl } from '@/lib/security/urlSanitizer';

export type KelompokKepengurusan =
  | 'pimpinan'
  | 'kepala_madrasah'
  | 'pkm_dan_koordinator'
  | 'panitia_dan_luar';

export type KategoriBagianKepengurusan = 'bersama' | 'putra' | 'putri';

export interface AnggotaKepengurusan {
  id: string;
  nama: string;
  sub_label?: string;
  catatan?: string;
  foto_url?: string;
}

export interface KepengurusanPeriode {
  id: string;
  nama_periode: string;
  menu_label?: string;
  slug?: string;
  catatan: string;
  sort_order?: number;
  is_current: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const SAFE_DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;

/**
 * Menjaga URL foto pengurus hanya berasal dari URL http(s) yang valid
 * atau Data URL image (JPEG/PNG/WEBP) hasil kompresi lokal.
 */
export function sanitizeMemberPhotoUrl(rawUrl?: string | null): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) {
    return SAFE_DATA_IMAGE_RE.test(trimmed) ? trimmed : '';
  }
  return sanitizeHttpUrl(trimmed) || '';
}

/**
 * Menghasilkan slug URL yang rapi dari nama periode atau label menu.
 * Jika mengandung pola rentang tahun Masehi (mis. 2026-2027), utamakan rentang tersebut.
 */
export function slugifyPeriode(input: string, fallbackId?: string): string {
  const raw = String(input || '').trim();
  const yearRangeMatch = raw.match(/\b(20\d{2}\s*[-/]\s*20\d{2})\b/);
  const baseSource = yearRangeMatch ? yearRangeMatch[1].replace(/\s*\/\s*|\s+/g, '-') : raw;

  const normalized = baseSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

  if (normalized) return normalized;
  return fallbackId ? `periode-${fallbackId.slice(0, 8)}` : 'periode';
}

export function getPeriodeSlug(
  periode: Pick<KepengurusanPeriode, 'id' | 'slug' | 'menu_label' | 'nama_periode'>
): string {
  const existing = String(periode.slug || '').trim();
  if (existing) return existing;
  return slugifyPeriode(periode.menu_label || periode.nama_periode, periode.id);
}

export function getPeriodeMenuLabel(
  periode: Pick<KepengurusanPeriode, 'nama_periode' | 'menu_label'>
): string {
  const explicit = String(periode.menu_label || '').trim();
  if (explicit) return explicit;
  const raw = String(periode.nama_periode || '').trim();
  const yearRangeMatch = raw.match(/\b(20\d{2}\s*[-/]\s*20\d{2})\b/);
  if (yearRangeMatch) {
    return `Kepengurusan ${yearRangeMatch[1].replace(/\s*\/\s*|\s+/g, '-')}`;
  }
  return raw ? `Kepengurusan ${raw}` : 'Kepengurusan';
}

function extractLeadingYear(text: string): number {
  const match = String(text || '').match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : 0;
}

/**
 * Mengurutkan daftar periode: periode berjalan (is_current) selalu di urutan paling atas,
 * diikuti periode lainnya berdasarkan sort_order naik lalu tahun/created_at terbaru.
 */
export function sortPeriodesForDisplay(
  periodes: KepengurusanPeriode[]
): KepengurusanPeriode[] {
  return [...periodes].sort((a, b) => {
    if (a.is_current !== b.is_current) {
      return a.is_current ? -1 : 1;
    }
    const orderA = Number(a.sort_order ?? 0);
    const orderB = Number(b.sort_order ?? 0);
    if (orderA !== orderB && orderA > 0 && orderB > 0) {
      return orderA - orderB;
    }
    const yearA = extractLeadingYear(a.slug || a.menu_label || a.nama_periode);
    const yearB = extractLeadingYear(b.slug || b.menu_label || b.nama_periode);
    if (yearA !== yearB) {
      return yearB - yearA;
    }
    const timeA = a.created_at ? Date.parse(a.created_at) : 0;
    const timeB = b.created_at ? Date.parse(b.created_at) : 0;
    return timeB - timeA;
  });
}

/**
 * Mengambil maksimal N (default 3) periode aktif terakhir untuk sub-menu navbar publik,
 * dengan periode sekarang (is_current) selalu di posisi paling atas.
 */
export function getPublicNavbarPeriodes(
  periodes: KepengurusanPeriode[],
  limit = 3
): KepengurusanPeriode[] {
  const activeOnly = periodes.filter((p) => p.is_active !== false);
  return sortPeriodesForDisplay(activeOnly).slice(0, Math.max(1, limit));
}

export function getInitialsFromName(nama: string): string {
  const cleaned = String(nama || '')
    .replace(/^(KH|Dr\.?\s*KH|Ust|Ustdz|H|Hj)\.?\s+/gi, '')
    .trim();
  if (!cleaned) return 'MB';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

export interface KepengurusanJabatan {
  id: string;
  periode_id: string;
  kelompok: KelompokKepengurusan;
  kategori_bagian: KategoriBagianKepengurusan;
  nama_jabatan: string;
  sort_order: number;
  anggota: AnggotaKepengurusan[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const KELOMPOK_KEPENGURUSAN_ORDER: KelompokKepengurusan[] = [
  'pimpinan',
  'kepala_madrasah',
  'pkm_dan_koordinator',
  'panitia_dan_luar',
];

export const KELOMPOK_KEPENGURUSAN_META: Record<
  KelompokKepengurusan,
  { label: string; badge: string; deskripsi: string }
> = {
  pimpinan: {
    label: 'Dewan Pimpinan & Penasehat',
    badge: 'Pimpinan Pondok',
    deskripsi: 'Pelindung, Penanggung Jawab, dan Penasehat Madrasah Diniyyah Al-Amiriyyah.',
  },
  kepala_madrasah: {
    label: 'Kepala Madrasah Per Jenjang',
    badge: 'Ka. Madrasah',
    deskripsi: 'Pimpinan operasional tingkat Ula, Wustho, dan Ulya.',
  },
  pkm_dan_koordinator: {
    label: 'Bidang PKM & Koordinator Program',
    badge: 'PKM & Koordinator',
    deskripsi: 'Pembantu Kepala Madrasah (PKM) dan koordinator program unggulan.',
  },
  panitia_dan_luar: {
    label: 'Panitia Evaluasi & Koordinator Madin Luar',
    badge: 'Evaluasi & Wilayah',
    deskripsi: 'Pelaksana ujian evaluasi akademik dan koordinator blok madrasah luar.',
  },
};

export const BAGIAN_KEPENGURUSAN_META: Record<
  KategoriBagianKepengurusan,
  { label: string; shortLabel: string }
> = {
  bersama: { label: 'Putra & Putri (Bersama)', shortLabel: 'Bersama' },
  putra: { label: 'Kepengurusan Putra', shortLabel: 'Putra' },
  putri: { label: 'Kepengurusan Putri', shortLabel: 'Putri' },
};

export const SEED_PERIODE_ID = 'seed-periode-1447-1448';
export const SEED_PERIODE_2025_ID = 'seed-periode-1446-1447';

export const SEED_KEPENGURUSAN_PERIODE: KepengurusanPeriode[] = [
  {
    id: SEED_PERIODE_ID,
    nama_periode: '1447-1448 H / 2026-2027 M',
    menu_label: 'Kepengurusan 2026-2027',
    slug: '2026-2027',
    catatan:
      'Personalia Kepengurusan Putra dan Putri Madrasah Diniyyah Al-Amiriyyah PP. Darussalam Blokagung Banyuwangi',
    sort_order: 10,
    is_current: true,
    is_active: true,
  },
  {
    id: SEED_PERIODE_2025_ID,
    nama_periode: '1446-1447 H / 2025-2026 M',
    menu_label: 'Kepengurusan 2025-2026',
    slug: '2025-2026',
    catatan:
      'Personalia Kepengurusan Putra dan Putri Madrasah Diniyyah Al-Amiriyyah PP. Darussalam Blokagung Banyuwangi',
    sort_order: 20,
    is_current: false,
    is_active: true,
  },
];

export const SEED_KEPENGURUSAN_JABATAN: KepengurusanJabatan[] = [
  {
    id: 'seed-pelindung',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pimpinan',
    kategori_bagian: 'bersama',
    nama_jabatan: 'PELINDUNG',
    sort_order: 10,
    is_active: true,
    anggota: [{ id: 'ang-pel-1', nama: 'KH. Ahmad Hisyam Syafaat' }],
  },
  {
    id: 'seed-pj',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pimpinan',
    kategori_bagian: 'bersama',
    nama_jabatan: 'PENANGGUNG JAWAB',
    sort_order: 20,
    is_active: true,
    anggota: [{ id: 'ang-pj-1', nama: 'Dr. KH. Abdul Kholiq Syafaat' }],
  },
  {
    id: 'seed-penasehat',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pimpinan',
    kategori_bagian: 'bersama',
    nama_jabatan: 'PENASEHAT',
    sort_order: 30,
    is_active: true,
    anggota: [{ id: 'ang-pen-1', nama: 'KH. Aly Asyiqin' }],
  },
  {
    id: 'seed-ka-ula',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'kepala_madrasah',
    kategori_bagian: 'bersama',
    nama_jabatan: 'KA. MADRASAH ULA',
    sort_order: 40,
    is_active: true,
    anggota: [{ id: 'ang-ka-ula', nama: 'Ust. Abdul Hamid, S.Ag' }],
  },
  {
    id: 'seed-ka-wustho',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'kepala_madrasah',
    kategori_bagian: 'bersama',
    nama_jabatan: 'KA. MADRASAH WUSTHO',
    sort_order: 50,
    is_active: true,
    anggota: [{ id: 'ang-ka-wus', nama: 'Ust. Agus A. Chadziq Kanzul F, S.Ag' }],
  },
  {
    id: 'seed-ka-ulya',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'kepala_madrasah',
    kategori_bagian: 'bersama',
    nama_jabatan: 'KA. MADRASAH ULYA',
    sort_order: 60,
    is_active: true,
    anggota: [{ id: 'ang-ka-uly', nama: 'Ust. Agus H. Muhammadun, M.Ag' }],
  },
  {
    id: 'seed-pa-kur',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putra',
    nama_jabatan: 'PKM. KURIKULUM',
    sort_order: 70,
    is_active: true,
    anggota: [
      { id: 'pa-kur-1', nama: 'Ust. Yunuz Zamrozi, M.E' },
      { id: 'pa-kur-2', nama: 'Ust. Ulul Azmi' },
      { id: 'pa-kur-3', nama: 'Ust. Hilmi Alfian' },
      { id: 'pa-kur-4', nama: 'Ust. Ali Makmun' },
    ],
  },
  {
    id: 'seed-pi-kur',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putri',
    nama_jabatan: 'PKM. KURIKULUM',
    sort_order: 75,
    is_active: true,
    anggota: [
      { id: 'pi-kur-1', nama: 'Ust. Yunuz Zamrozi, M.E' },
      { id: 'pi-kur-2', nama: 'Ustdz. Khoirotun Hisan' },
      { id: 'pi-kur-3', nama: 'Ustdz. Suhita Rindu Haromain' },
      { id: 'pi-kur-4', nama: 'Ustdz. Ulin Nuha' },
      { id: 'pi-kur-5', nama: 'Ustdz. Layla Nirmala' },
    ],
  },
  {
    id: 'seed-pa-muh',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putra',
    nama_jabatan: 'PKM. MUHAFADZOH',
    sort_order: 80,
    is_active: true,
    anggota: [
      { id: 'pa-muh-1', nama: 'Ust. Andiko Dwi Saputra' },
      { id: 'pa-muh-2', nama: 'Ust. Muchlisin' },
      { id: 'pa-muh-3', nama: 'Ust. M. Miftahul Ilham' },
      { id: 'pa-muh-4', nama: 'Ust. Rizqi Maulana Ahmad' },
    ],
  },
  {
    id: 'seed-pi-muh',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putri',
    nama_jabatan: 'PKM. MUHAFADZOH',
    sort_order: 85,
    is_active: true,
    anggota: [
      { id: 'pi-muh-1', nama: 'Ustdz. Nikmatul Khoiriah' },
      { id: 'pi-muh-2', nama: 'Ustdz. Nikmatur Rohmah' },
      { id: 'pi-muh-3', nama: 'Ustdz. Maulida Nur Azizah' },
      { id: 'pi-muh-4', nama: 'Ustdz. Shofiya Nabilla' },
    ],
  },
  {
    id: 'seed-keuangan',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'bersama',
    nama_jabatan: 'PKM. KEUANGAN',
    sort_order: 90,
    is_active: true,
    anggota: [
      { id: 'keu-1', nama: 'Ust. Agus Ahmad Supriyadi, S.E' },
      { id: 'keu-2', nama: 'Ust. M. Fajar Attamimi' },
      { id: 'keu-3', nama: 'Ust. Hafiruddin' },
      { id: 'keu-4', nama: 'Ust. Fahim Hilmy Ahimsa' },
    ],
  },
  {
    id: 'seed-pa-kes',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putra',
    nama_jabatan: 'PKM. KESISWAAN',
    sort_order: 100,
    is_active: true,
    anggota: [
      { id: 'pa-kes-1', nama: "Ust. Agus Indi' Najmu Tsaqib" },
      { id: 'pa-kes-2', nama: 'Ust. Zulfan Rifqi' },
      { id: 'pa-kes-3', nama: 'Ust. Muhammad Nafiul Umam' },
      { id: 'pa-kes-4', nama: 'Ust. Ahmad Rifai' },
      { id: 'pa-kes-5', nama: 'Ust. Anggit Setiawan Yahya' },
      { id: 'pa-kes-6', nama: 'Ust. Qoidus Solah' },
      { id: 'pa-kes-7', nama: 'Ust. Ahmad Fakhrurroziqin' },
    ],
  },
  {
    id: 'seed-pi-kes',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putri',
    nama_jabatan: 'PKM. KESISWAAN',
    sort_order: 105,
    is_active: true,
    anggota: [
      { id: 'pi-kes-1', nama: "Ust. Agus Indi' Najmu Tsaqib" },
      { id: 'pi-kes-2', nama: 'Ustdz. Inggrit Lailatul Mukaromah' },
      { id: 'pi-kes-3', nama: 'Ustdz. Dina Marisatul Azhari' },
      { id: 'pi-kes-4', nama: 'Ustdz. Ummu Astri Zulaikha' },
      { id: 'pi-kes-5', nama: 'Ustdz. Riyan Putri Wulandari' },
      { id: 'pi-kes-6', nama: 'Ustdz. Atina Novia Khusna' },
    ],
  },
  {
    id: 'seed-pa-mpk',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putra',
    nama_jabatan: 'PKM. MPK & ITMAM',
    sort_order: 110,
    is_active: true,
    anggota: [{ id: 'pa-mpk-1', nama: 'Ust. Rois Muzaki' }],
  },
  {
    id: 'seed-pi-mpk',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putri',
    nama_jabatan: 'PKM. MPK & ITMAM',
    sort_order: 115,
    is_active: true,
    anggota: [{ id: 'pi-mpk-1', nama: 'Ustdz. Fatma Aslihatul Amalia' }],
  },
  {
    id: 'seed-pa-med',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putra',
    nama_jabatan: 'PKM. MEDIA',
    sort_order: 120,
    is_active: true,
    anggota: [
      { id: 'pa-med-1', nama: 'Ust. Cholid Asrori' },
      { id: 'pa-med-2', nama: 'Ust. Moch. Miftachul Farihin' },
      { id: 'pa-med-3', nama: 'Ust. Miftachul Huda' },
    ],
  },
  {
    id: 'seed-pi-med',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putri',
    nama_jabatan: 'PKM. MEDIA',
    sort_order: 125,
    is_active: true,
    anggota: [{ id: 'pi-med-1', nama: 'Ustdz. Zida Nurul Ilma' }],
  },
  {
    id: 'seed-pa-tu',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putra',
    nama_jabatan: 'PKM. TATA USAHA',
    sort_order: 130,
    is_active: true,
    anggota: [
      { id: 'pa-tu-1', nama: 'Ust. Agus Hamdani' },
      { id: 'pa-tu-2', nama: 'Ust. Rokib Munawwir' },
      { id: 'pa-tu-3', nama: 'Ust. Hafidz Muslimin' },
      { id: 'pa-tu-4', nama: 'Ust. Qoulan Sadidan' },
      { id: 'pa-tu-5', nama: 'Ust. Royhan Azizi' },
      { id: 'pa-tu-6', nama: 'Ust. Ibnu Haris' },
      { id: 'pa-tu-7', nama: 'Ust. Adib Assyarifi' },
      { id: 'pa-tu-8', nama: 'Ust. Zubriyadi' },
    ],
  },
  {
    id: 'seed-pi-tu',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putri',
    nama_jabatan: 'PKM. TATA USAHA',
    sort_order: 135,
    is_active: true,
    anggota: [
      { id: 'pi-tu-1', nama: 'Ustdz. Dalilah El Bariro' },
      { id: 'pi-tu-2', nama: 'Ustdz. Naulina Nuril Khusna' },
      { id: 'pi-tu-3', nama: 'Ustdz. Eka Faticha Rini' },
      { id: 'pi-tu-4', nama: 'Ustdz. Ratu Syifa Mustika' },
    ],
  },
  {
    id: 'seed-pa-ung',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putra',
    nama_jabatan: 'KOOR. UNGGULAN',
    sort_order: 140,
    is_active: true,
    anggota: [{ id: 'pa-ung-1', nama: 'Ust. Muhammad Hanif' }],
  },
  {
    id: 'seed-pi-ung',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'putri',
    nama_jabatan: 'KOOR. UNGGULAN',
    sort_order: 145,
    is_active: true,
    anggota: [{ id: 'pi-ung-1', nama: 'Ustdz. Fatma Aslihatul Amalia' }],
  },
  {
    id: 'seed-sapras',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'pkm_dan_koordinator',
    kategori_bagian: 'bersama',
    nama_jabatan: 'PKM. SARANA PRASARANA',
    sort_order: 150,
    is_active: true,
    anggota: [
      { id: 'sap-1', nama: 'Ust. Abdul Rochmad (PA)' },
      { id: 'sap-2', nama: 'Ust. M. Naufal Zabidi (PA)' },
      { id: 'sap-3', nama: 'Ust. Ahmad Fajrul Falah Shidqi (PI)' },
    ],
  },
  {
    id: 'seed-pa-eval',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'panitia_dan_luar',
    kategori_bagian: 'putra',
    nama_jabatan: 'PANITIA EVALUASI',
    sort_order: 160,
    is_active: true,
    anggota: [
      { id: 'pa-ev-1', sub_label: 'Ebtadin', nama: 'Ust. Royhan Azizi' },
      { id: 'pa-ev-2', sub_label: 'Daur', nama: 'Ust. Rokib Munawir' },
      { id: 'pa-ev-3', sub_label: 'Akselerasi', nama: 'Ust. Hafiruddin' },
      { id: 'pa-ev-4', sub_label: 'Tes Kitab', nama: 'Ust. Hafidz Muslimin' },
      { id: 'pa-ev-5', sub_label: 'Imtihan', nama: "Ust. Ro'is Muzakky" },
      { id: 'pa-ev-6', sub_label: 'Psb', nama: 'Ust. Rokib Munawir' },
    ],
  },
  {
    id: 'seed-pi-eval',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'panitia_dan_luar',
    kategori_bagian: 'putri',
    nama_jabatan: 'PANITIA EVALUASI',
    sort_order: 165,
    is_active: true,
    anggota: [
      { id: 'pi-ev-1', sub_label: 'Ebtadin', nama: 'Ust. Muchlisin' },
      { id: 'pi-ev-2', sub_label: 'Daur', nama: 'Ust. Rokib Munawir' },
      { id: 'pi-ev-3', sub_label: 'Akselerasi', nama: 'Ust. Hafiruddin' },
      { id: 'pi-ev-4', sub_label: 'Tes Kitab', nama: 'Ust. Hafidz Muslimin' },
      { id: 'pi-ev-5', sub_label: 'Imtihan', nama: "Ust. Ro'is Muzakky" },
      { id: 'pi-ev-6', sub_label: 'Psb', nama: 'Ust. Rokib Munawir' },
    ],
  },
  {
    id: 'seed-madin-luar',
    periode_id: SEED_PERIODE_ID,
    kelompok: 'panitia_dan_luar',
    kategori_bagian: 'bersama',
    nama_jabatan: 'KOOR. MADIN LUAR',
    sort_order: 170,
    is_active: true,
    anggota: [
      { id: 'ml-1', sub_label: 'Blok 4', nama: 'Ust. Anggi Pratama' },
      { id: 'ml-2', sub_label: 'Blok 5', nama: "Ust. Khoirul walid sifa'ul fatih" },
      { id: 'ml-3', sub_label: 'Blok 6', nama: 'Ustdz. Nur Khofifah Intan Saputri' },
      { id: 'ml-4', sub_label: 'Blok 10', nama: 'Ust. Moh Indi Asrofi' },
      { id: 'ml-5', sub_label: 'Blok 11', nama: 'Ust. Fajin Amiq' },
      { id: 'ml-6', sub_label: 'Blok 12', nama: 'Ust. Septian Khoirul Umam' },
    ],
  },
];
