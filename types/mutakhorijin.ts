import { sanitizeHttpUrl } from '@/lib/security/urlSanitizer';

export type MutakhorijinSectionType = 'dossier' | 'postcard';
export type MutakhorijinLayoutAlign = 'auto' | 'left' | 'right';

export interface MutakhorijinPhotoItem {
  id: string;
  url: string;
  caption?: string;
}

export interface MutakhorijinAlbum {
  id: string;
  nama_angkatan: string;
  caption_angkatan: string;
  tahun_angkatan: number;
  slug: string;
  hero_title: string;
  hero_subtitle: string;
  hero_quote: string;
  hero_image_url: string;
  footer_note: string;
  sort_order: number;
  is_current: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MutakhorijinSection {
  id: string;
  album_id: string;
  section_type: MutakhorijinSectionType;
  judul: string;
  subjudul_label: string;
  quote: string;
  narasi: string;
  foto_utama_url: string;
  foto_utama_caption: string;
  galeri_foto: MutakhorijinPhotoItem[];
  layout_align: MutakhorijinLayoutAlign;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const SAFE_DATA_IMAGE_RE = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i;

export function sanitizeMutakhorijinPhotoUrl(rawUrl?: string | null): string {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:image/')) {
    return SAFE_DATA_IMAGE_RE.test(trimmed) ? trimmed : '';
  }
  return sanitizeHttpUrl(trimmed) || '';
}

export function slugifyMutakhorijinAlbum(
  namaAngkatan: string,
  tahunAngkatan?: number,
  fallbackId?: string
): string {
  const baseName = String(namaAngkatan || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const yearSuffix =
    tahunAngkatan && Number.isFinite(tahunAngkatan) && tahunAngkatan > 1900
      ? String(Math.trunc(tahunAngkatan))
      : '';

  let combined = baseName;
  if (yearSuffix && !baseName.includes(yearSuffix)) {
    combined = baseName ? `${baseName}-${yearSuffix}` : yearSuffix;
  }

  const clean = combined.replace(/^-+|-+$/g, '').slice(0, 90);
  if (clean) return clean;
  return fallbackId ? `angkatan-${fallbackId.slice(0, 8)}` : 'angkatan';
}

export function getAlbumSlug(
  album: Pick<MutakhorijinAlbum, 'id' | 'slug' | 'nama_angkatan' | 'tahun_angkatan'>
): string {
  const existing = String(album.slug || '').trim();
  if (existing) return existing;
  return slugifyMutakhorijinAlbum(album.nama_angkatan, album.tahun_angkatan, album.id);
}

/**
 * Mengurutkan album angkatan: angkatan aktif sekarang (is_current) paling atas,
 * lalu berdasarkan tahun_angkatan terbaru (descending), sort_order, dan created_at.
 */
export function sortAlbumsForDisplay(albums: MutakhorijinAlbum[]): MutakhorijinAlbum[] {
  return [...albums].sort((a, b) => {
    if (a.is_current !== b.is_current) {
      return a.is_current ? -1 : 1;
    }
    const yearDiff = (Number(b.tahun_angkatan) || 0) - (Number(a.tahun_angkatan) || 0);
    if (yearDiff !== 0) return yearDiff;

    const orderA = Number(a.sort_order ?? 0);
    const orderB = Number(b.sort_order ?? 0);
    if (orderA !== orderB) return orderA - orderB;

    const timeA = a.created_at ? Date.parse(a.created_at) : 0;
    const timeB = b.created_at ? Date.parse(b.created_at) : 0;
    return timeB - timeA;
  });
}

/**
 * Mengambil maksimal 5 tahun angkatan terakhir yang aktif publik untuk dropdown header.
 */
export function getPublicNavbarAlbums(
  albums: MutakhorijinAlbum[],
  limit = 5
): MutakhorijinAlbum[] {
  const activeOnly = albums.filter((a) => a.is_active !== false);
  return sortAlbumsForDisplay(activeOnly).slice(0, Math.max(1, limit));
}

export const SEED_MUTAKHORIJIN_ALBUM_ID = 'seed-mutakhorijin-tsuroya-2026';

export const SEED_MUTAKHORIJIN_ALBUMS: MutakhorijinAlbum[] = [
  {
    id: SEED_MUTAKHORIJIN_ALBUM_ID,
    nama_angkatan: 'Tsuroya',
    caption_angkatan: 'Angkatan 2026',
    tahun_angkatan: 2026,
    slug: 'tsuroya-2026',
    hero_title: 'TSUROYA',
    hero_subtitle:
      'Album Kenangan Mutakhorijin Angkatan 2026 • Madrasah Diniyyah Al-Amiriyyah PP. Darussalam Blokagung',
    hero_quote:
      'Menjaga sanad keilmuan salafiyah, merawat persaudaraan santri, dan melangkah dengan khidmah.',
    hero_image_url: '',
    footer_note:
      'Mutakhorijin Tsuroya Angkatan 2026 • Semoga ilmu yang diraih membawa keberkahan sepanjang hayat.',
    sort_order: 10,
    is_current: true,
    is_active: true,
  },
];

export const SEED_MUTAKHORIJIN_SECTIONS: MutakhorijinSection[] = [
  {
    id: 'seed-mut-sec-1',
    album_id: SEED_MUTAKHORIJIN_ALBUM_ID,
    section_type: 'dossier',
    judul: 'Jejak Takror & Syawir',
    subjudul_label: 'BAB 01 • PERJUANGAN',
    quote:
      'Di antara lembaran kitab kuning dan lantunan nadzom, persaudaraan ini ditempa setiap siang dan malam.',
    narasi:
      'Catatan perjalanan belajar santri Mutakhorijin Tsuroya dari kelas awal hingga purna Ulya. Unggah foto utama dan 3 hingga 4 dokumentasi terbaik melalui menu Kelola Mutakhorijin.',
    foto_utama_url: '',
    foto_utama_caption: '',
    galeri_foto: [],
    layout_align: 'left',
    sort_order: 10,
    is_active: true,
  },
  {
    id: 'seed-mut-sec-2',
    album_id: SEED_MUTAKHORIJIN_ALBUM_ID,
    section_type: 'postcard',
    judul: 'Serambi Diniyyah & Haflah',
    subjudul_label: 'KARTU POS • ANGKATAN 2026',
    quote: 'Satu tempat yang selalu memanggil ingatan tentang kebersamaan angkatan.',
    narasi:
      'Galeri momen puncak angkatan: kebersamaan kelas akhir, khidmah majelis, dan detik-detik tasyakuran kelulusan.',
    foto_utama_url: '',
    foto_utama_caption: '',
    galeri_foto: [],
    layout_align: 'auto',
    sort_order: 20,
    is_active: true,
  },
  {
    id: 'seed-mut-sec-3',
    album_id: SEED_MUTAKHORIJIN_ALBUM_ID,
    section_type: 'dossier',
    judul: 'Khidmah & Pengabdian',
    subjudul_label: 'BAB 02 • HARAPAN',
    quote:
      'Purna belajar di bangku madrasah bukan akhir perjalanan, melainkan awal khidmah di tengah masyarakat.',
    narasi:
      'Potret pengabdian, musyawarah, serta pesan keteladanan bersama para masyayikh dan dewan asatidz sebelum melepas masa belajar klasikal.',
    foto_utama_url: '',
    foto_utama_caption: '',
    galeri_foto: [],
    layout_align: 'right',
    sort_order: 30,
    is_active: true,
  },
];
