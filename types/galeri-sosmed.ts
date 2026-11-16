import { TopikBerita, StatusBerita, TOPIK_BERITA_ORDER } from './berita';

export type PlatformSosmed = 'youtube' | 'instagram' | 'tiktok';

export type ContentFormatSosmed = 'vertical' | 'landscape' | 'post';

export interface GaleriSosmedItem {
  id: string;
  title: string;
  caption: string;
  platform: PlatformSosmed;
  content_format: ContentFormatSosmed;
  source_url: string;
  embed_id: string;
  thumbnail_url: string;
  topics: TopikBerita[];
  sub_topics?: string[];
  creator_name: string;
  is_pinned: boolean;
  status: StatusBerita;
  published_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatorChannelConfig {
  creatorTitle: string;
  creatorTagline: string;
  youtubeHandle: string;
  youtubeUrl: string;
  instagramHandle: string;
  instagramUrl: string;
  tiktokHandle: string;
  tiktokUrl: string;
}

export const DEFAULT_CREATOR_CHANNEL_CONFIG: CreatorChannelConfig = {
  creatorTitle: 'Media Madin Blokagung',
  creatorTagline:
    'Studio Dokumentasi, Kreatif Visual, dan Syiar Khazanah Turots Salafiyah Madrasah Diniyyah Al-Amiriyyah Ponpes Darussalam Blokagung.',
  youtubeHandle: '@MadinBlokagungOfficial',
  youtubeUrl: 'https://www.youtube.com/@darussalamblokagung',
  instagramHandle: '@madinblokagung',
  instagramUrl: 'https://www.instagram.com/darussalamblokagung',
  tiktokHandle: '@madinblokagung',
  tiktokUrl: 'https://www.tiktok.com/@madinblokagung',
};

export interface PlatformSosmedMeta {
  code: PlatformSosmed;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  softBg: string;
  accentColor: string;
}

export const PLATFORM_SOSMED_MAP: Record<PlatformSosmed, PlatformSosmedMeta> = {
  youtube: {
    code: 'youtube',
    label: 'YouTube',
    shortLabel: 'YT',
    badgeBg: 'bg-red-600',
    badgeText: 'text-white font-bold',
    borderColor: 'border-red-500/40',
    softBg: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300',
    accentColor: '#dc2626',
  },
  instagram: {
    code: 'instagram',
    label: 'Instagram',
    shortLabel: 'IG',
    badgeBg: 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500',
    badgeText: 'text-white font-bold',
    borderColor: 'border-pink-500/40',
    softBg: 'bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300',
    accentColor: '#db2777',
  },
  tiktok: {
    code: 'tiktok',
    label: 'TikTok',
    shortLabel: 'TT',
    badgeBg: 'bg-slate-950 dark:bg-black border border-white/20',
    badgeText: 'text-white font-bold',
    borderColor: 'border-slate-700',
    softBg: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
    accentColor: '#0f172a',
  },
};

export function getSosmedTopics(item: Pick<GaleriSosmedItem, 'topics'>): TopikBerita[] {
  const validSet = new Set<string>(TOPIK_BERITA_ORDER);
  if (Array.isArray(item.topics) && item.topics.length > 0) {
    const cleaned = item.topics.filter((t): t is TopikBerita => validSet.has(t));
    if (cleaned.length > 0) return Array.from(new Set(cleaned));
  }
  return ['umum'];
}

export function hasSosmedTopic(
  item: Pick<GaleriSosmedItem, 'topics'>,
  target: TopikBerita | 'all'
): boolean {
  if (target === 'all') return true;
  return getSosmedTopics(item).includes(target);
}

export function getSosmedSubTopics(item: Pick<GaleriSosmedItem, 'sub_topics'>): string[] {
  if (!Array.isArray(item.sub_topics)) return [];
  return Array.from(
    new Set(item.sub_topics.map((s) => String(s || '').trim()).filter(Boolean))
  );
}

export function hasSosmedSubTopic(
  item: Pick<GaleriSosmedItem, 'sub_topics'>,
  targetSubId: string | 'all'
): boolean {
  if (targetSubId === 'all') return true;
  return getSosmedSubTopics(item).includes(targetSubId);
}

export const SEED_GALERI_SOSMED: GaleriSosmedItem[] = [
  {
    id: 'sosmed-001',
    title: 'Dokumenter Khidmah Keilmuan: 75 Tahun Tradisi Kitab Kuning Madin Blokagung',
    caption:
      'Menyelami perjalanan panjang pengajaran kitab turots salafiyah, disiplin takror siang, dan syawir malam ribuan santri Madrasah Diniyyah Al-Amiriyyah Ponpes Darussalam Blokagung.',
    platform: 'youtube',
    content_format: 'landscape',
    source_url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    embed_id: 'jfKfPfyJRdk',
    thumbnail_url:
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80',
    topics: ['umum', 'kelas_unggulan'],
    creator_name: 'Tim Sinematografi Media Madin',
    is_pinned: true,
    status: 'published',
    published_at: '2026-11-15T08:00:00Z',
    created_at: '2026-11-15T08:00:00Z',
  },
  {
    id: 'sosmed-002',
    title: 'Gema Lalaran 357 Santri Kelas 4 Ula Putra Sebelum KBM Malam Dimulai',
    caption:
      'Suasana khidmah serambi Masjid Jami saat ratusan talamidz Tingkat ULA melantunkan nadzom Al-Imrithi dari Muqaddimah hingga bab Idhafah secara serempak.',
    platform: 'tiktok',
    content_format: 'vertical',
    source_url: 'https://www.tiktok.com/@madinblokagung/video/7350000000000000001',
    embed_id: '7350000000000000001',
    thumbnail_url:
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
    topics: ['umum', 'tingkat_ula'],
    creator_name: 'Divisi Reels & TikTok Media Madin',
    is_pinned: false,
    status: 'published',
    published_at: '2026-11-14T19:30:00Z',
    created_at: '2026-11-14T19:30:00Z',
  },
  {
    id: 'sosmed-003',
    title: ' Adu Dalil Syarah Fathul Qorib: Potret Hangatnya Syawir Malam Selasa Tingkat Wustho',
    caption:
      'Cuplikan Reels Instagram kemandirian santri Tingkat Wustho dalam membedah masail fiqhiyyah muamalah kontemporer berlandaskan ibarat kitab kuning.',
    platform: 'instagram',
    content_format: 'vertical',
    source_url: 'https://www.instagram.com/reel/C8abc123xyz/',
    embed_id: 'C8abc123xyz',
    thumbnail_url:
      'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    topics: ['tingkat_wustho'],
    creator_name: 'Redaksi Visual Instagram Madin',
    is_pinned: false,
    status: 'published',
    published_at: '2026-11-12T20:15:00Z',
    created_at: '2026-11-12T20:15:00Z',
  },
  {
    id: 'sosmed-004',
    title: 'Halaqoh Sanad & Bedah Metodologi Fathul Wahhab Bersama Dewan Masyayikh',
    caption:
      'Rekaman lengkap sesi pembekalan kader mustahiq Tingkat Ulya dalam menjaga ketersambungan sanad keilmuan dan ketepatan tahqiq ibarat.',
    platform: 'youtube',
    content_format: 'landscape',
    source_url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
    embed_id: '5qap5aO4i9A',
    thumbnail_url:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80',
    topics: ['umum', 'tingkat_ulya'],
    creator_name: 'Tim Siaran & Dokumentasi Ulya',
    is_pinned: false,
    status: 'published',
    published_at: '2026-11-10T10:00:00Z',
    created_at: '2026-11-10T10:00:00Z',
  },
  {
    id: 'sosmed-005',
    title: 'Detik-Detik Ujian Tasmi\' 1.002 Bait Alfiyyah Ibnu Malik Sekali Duduk',
    caption:
      'Ketekunan santri Kelas Unggulan dan Wustho dalam menuntaskan setoran muhafadzoh Alfiyyah Ibnu Malik di hadapan dewan penguji.',
    platform: 'tiktok',
    content_format: 'vertical',
    source_url: 'https://www.tiktok.com/@madinblokagung/video/7350000000000000002',
    embed_id: '7350000000000000002',
    thumbnail_url:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
    topics: ['kelas_unggulan', 'tingkat_wustho'],
    creator_name: 'Tim Muhafadzoh & Media Madin',
    is_pinned: false,
    status: 'published',
    published_at: '2026-11-08T14:00:00Z',
    created_at: '2026-11-08T14:00:00Z',
  },
  {
    id: 'sosmed-006',
    title: 'Kilas Balik Bahtsul Masail Kubro & Silaturahmi Lintas Pesantren',
    caption:
      'Rangkaian foto dan video pendek delegasi santri Madin Blokagung saat memaparkan rumusan jawaban fiqih di forum Bahtsul Masail.',
    platform: 'instagram',
    content_format: 'post',
    source_url: 'https://www.instagram.com/p/C9xyz987abc/',
    embed_id: 'C9xyz987abc',
    thumbnail_url:
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    topics: ['umum', 'kelas_unggulan', 'tingkat_ulya'],
    creator_name: 'Redaksi Visual Instagram Madin',
    is_pinned: false,
    status: 'published',
    published_at: '2026-11-05T16:45:00Z',
    created_at: '2026-11-05T16:45:00Z',
  },
  {
    id: 'sosmed-007',
    title: 'Infografis Jadwal Takror Siang & Persiapan Imtihan Semester Ganjil',
    caption:
      'Panduan visual tata tertib takror siang dan persiapan ujian kitab kuning seluruh jenjang Ula, Wustho, dan Ulya.',
    platform: 'instagram',
    content_format: 'post',
    source_url: 'https://www.instagram.com/p/C9abc456def/',
    embed_id: 'C9abc456def',
    thumbnail_url:
      'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=800&q=80',
    topics: ['umum', 'tingkat_ula', 'tingkat_wustho'],
    creator_name: 'Divisi Desain Grafis Media Madin',
    is_pinned: false,
    status: 'published',
    published_at: '2026-11-02T09:00:00Z',
    created_at: '2026-11-02T09:00:00Z',
  },
  {
    id: 'sosmed-008',
    title: 'Momen Khidmat Setoran Hafalan Nadhom Imrithi & Juz Amma Sore Hari',
    caption:
      'Cuplikan semangat santri dalam menyetorkan hafalan muhafadzoh harian sebelum waktu maghrib bersama mustahiq.',
    platform: 'tiktok',
    content_format: 'vertical',
    source_url: 'https://www.tiktok.com/@madinblokagung/video/7350000000000000003',
    embed_id: '7350000000000000003',
    thumbnail_url:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
    topics: ['tingkat_ula'],
    creator_name: 'Tim Reels & TikTok Media Madin',
    is_pinned: false,
    status: 'published',
    published_at: '2026-10-29T17:15:00Z',
    created_at: '2026-10-29T17:15:00Z',
  },
];
