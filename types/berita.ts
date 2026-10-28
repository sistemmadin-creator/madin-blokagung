/**
 * Tipe Data dan Metadata Modul Warta Berita MADINA Blokagung
 * Mengadopsi tata letak editorial majalah pesantren ala Lirboyo.net
 */

export type TopikBerita = 
  | 'kelas_unggulan' 
  | 'tingkat_ula' 
  | 'tingkat_wustho' 
  | 'tingkat_ulya';

export type DisplayTypeBerita = 
  | 'hero_lead'      // Kartu besar utama sebelah kiri (seperti di Lirboyo.net)
  | 'highlight_grid' // 4 kartu sorotan 2x2 di sisi kanan
  | 'regular';       // Ditampilkan di feed post terbaru

export type StatusBerita = 
  | 'draft' 
  | 'published' 
  | 'archived';

export interface WartaBerita {
  id: string;
  title: string;
  slug: string;
  topic: TopikBerita;
  display_type: DisplayTypeBerita;
  excerpt: string;
  content: string;
  cover_image_url: string;
  author_name: string;
  status: StatusBerita;
  views_count: number;
  tags?: string[];
  published_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface TopikMeta {
  code: TopikBerita;
  title: string;
  shortTitle: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  lightBg: string;
  description: string;
}

export const TOPIK_BERITA_MAP: Record<TopikBerita, TopikMeta> = {
  kelas_unggulan: {
    code: 'kelas_unggulan',
    title: 'Kelas Unggulan',
    shortTitle: 'Unggulan',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-amber-950 font-bold',
    borderColor: 'border-amber-400',
    lightBg: 'bg-amber-50 dark:bg-amber-950/40',
    description: 'Kajian mandiri santri, Syawir Kubro, Daur Tsani, dan evaluasi Ma\'had Aly.',
  },
  tingkat_ula: {
    code: 'tingkat_ula',
    title: 'Tingkat ULA',
    shortTitle: 'ULA',
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white font-bold',
    borderColor: 'border-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    description: 'Pendidikan dasar diniyyah, bimbingan intensif IHFAD, pegon, dan nadzom awam.',
  },
  tingkat_wustho: {
    code: 'tingkat_wustho',
    title: 'Tingkat WUSTHO',
    shortTitle: 'WUSTHO',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white font-bold',
    borderColor: 'border-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-950/40',
    description: 'Pendalaman gramatika Nahwu-Shorof (Alfiyyah), Fiqih Fathul Qorib, dan ushul fiqih.',
  },
  tingkat_ulya: {
    code: 'tingkat_ulya',
    title: 'Tingkat ULYA',
    shortTitle: 'ULYA',
    badgeBg: 'bg-indigo-700',
    badgeText: 'text-white font-bold',
    borderColor: 'border-indigo-500',
    lightBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    description: 'Kajian turots tingkat tinggi (Fathul Wahhab, Ihya Ulumiddin) dan kaderisasi mustahiq.',
  },
};

/**
 * Data Awal / Seed Berita Realistis Madin Blokagung
 * Dibuat berbasis kultur otentik Pesantren Darussalam Blokagung
 */
export const SEED_BERITA: WartaBerita[] = [
  {
    id: 'warta-001',
    title: 'Kuliah Umum & Penguatan Literasi Kitab Kuning Kelas Unggulan Bersama Dewan Masyayikh',
    slug: 'kuliah-umum-literasi-kitab-kuning-kelas-unggulan',
    topic: 'kelas_unggulan',
    display_type: 'hero_lead',
    excerpt: 'Madrasah Diniyyah Al-Amiriyyah menyelenggarakan pembekalan metodologi syawir kutubut turots bagi santri kelas unggulan guna mematangkan kesiapan Daur Tsani tanpa mbalah.',
    content: `Madrasah Diniyyah Al-Amiriyyah Pondok Pesantren Darussalam Blokagung kembali mengukuhkan komitmen penguatan tradisi keilmuan salafiyah melalui penyelenggaraan Kuliah Umum dan Orientasi Metodologi Syawir bagi santri Kelas Unggulan.

Bertempat di Aula Utama Madrasah, kegiatan ini dihadiri jajaran Majelis Pendidik dan Mustahiq Senior. Dalam arahannya, ditekankan pentingnya kemandirian santri dalam membedah tarkib nahwu-shorof serta penguasaan ma'ani dan badi' saat menghadapi teks-teks klasik yang tidak berharakat.

Sebagaimana dawuh Almaghfurlah KH. Mukhtar Syafa'at: "Openono perkoro seng ono, mongko bakal maujud perkoro seng ora ono." Semangat menjaga kemurnian kajian turots inilah yang menjadi pilar utama kaderisasi ulama di Blokagung.`,
    cover_image_url: 'https://images.unsplash.com/photo-1584697964190-705b89369947?auto=format&fit=crop&w=1200&q=80',
    author_name: 'Redaksi Media Madina',
    status: 'published',
    views_count: 428,
    tags: ['Kelas Unggulan', 'Syawir Kubro', 'Turots Salaf'],
    published_at: '2026-10-27T08:00:00Z',
    created_at: '2026-10-27T08:00:00Z',
  },
  {
    id: 'warta-002',
    title: 'Ujian Tasmi\' Nadzom Al-Jurumiyyah & Imrithi Serentak Santri Tingkat ULA Semester Gasal',
    slug: 'ujian-tasmi-nadzom-tingkat-ula-semester-gasal',
    topic: 'tingkat_ula',
    display_type: 'highlight_grid',
    excerpt: 'Ribuan santri tingkat ULA mengikuti evaluasi muhafadzoh nadzom dasar dengan metode setoran berhadapan langsung di hadapan mustahiq penguji.',
    content: `Sebanyak 1.800 santri Tingkat ULA (1 Ula hingga 4 Ula) serentak mengikuti rangkaian Ujian Tasmi' Muhafadzoh Nadzom Jurumiyyah, Aqidatul Awam, dan Imrithi. Kegiatan berlangsung khidmah di serambi asrama masing-masing di bawah pengawasan langsung tim PKM Muhafadzoh.`,
    cover_image_url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
    author_name: 'Tim Muhafadzoh ULA',
    status: 'published',
    views_count: 312,
    tags: ['Tingkat ULA', 'Muhafadzoh', 'Nadzom'],
    published_at: '2026-10-26T14:30:00Z',
    created_at: '2026-10-26T14:30:00Z',
  },
  {
    id: 'warta-003',
    title: 'Musyawarah Wustho: Mengurai Masail Fiqhiyyah Kontemporer Berpijak Fathul Qorib',
    slug: 'musyawarah-wustho-masail-fiqhiyyah-fathul-qorib',
    topic: 'tingkat_wustho',
    display_type: 'highlight_grid',
    excerpt: 'Diskusi mingguan santri Wustho mengasah nalar ushul dan ketepatan ibarat kitab dalam menjawab dinamika muamalah terkini santri.',
    content: `Forum musyawarah antar-rombel tingkat Wustho kembali digelar malam Selasa. Mengangkat tema kajian bab Muamalah Fathul Qorib Mujib, para musyawirin aktif beradu argumen dalil dan kutipan syarah para ulama Syafi'iyyah.`,
    cover_image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    author_name: 'Lajnah Bahtsul Masail Wustho',
    status: 'published',
    views_count: 245,
    tags: ['Tingkat WUSTHO', 'Fiqih', 'Musyawarah'],
    published_at: '2026-10-25T19:00:00Z',
    created_at: '2026-10-25T19:00:00Z',
  },
  {
    id: 'warta-004',
    title: 'Kaderisasi Mustahiq: Halaqoh Fathul Wahhab Tingkat ULYA Menuju Khidmah Pesantren',
    slug: 'kaderisasi-mustahiq-halaqoh-fathul-wahhab-ulya',
    topic: 'tingkat_ulya',
    display_type: 'highlight_grid',
    excerpt: 'Santri tingkat akhir Ulya dibekali sanad keilmuan dan metodologi mengajar kitab berjenjang guna persiapan penugasan mengajar di asrama.',
    content: `Menjelang akhir tahun ajaran, santri 2 Ulya mengikuti halaqoh intensif pendalaman kitab Fathul Wahhab karya Syaikhul Islam Zakariya Al-Anshari. Program ini merupakan jenjang puncak kaderisasi mustahiq di Madin Al-Amiriyyah Blokagung.`,
    cover_image_url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=800&q=80',
    author_name: 'Biro Kurikulum ULYA',
    status: 'published',
    views_count: 510,
    tags: ['Tingkat ULYA', 'Fathul Wahhab', 'Kaderisasi'],
    published_at: '2026-10-24T10:15:00Z',
    created_at: '2026-10-24T10:15:00Z',
  },
  {
    id: 'warta-005',
    title: 'Prestasi Gemilang Delegasi Bahtsul Masail Kubro Antar-Pondok Pesantren Se-Jawa Timur',
    slug: 'prestasi-gemilang-delegasi-bahtsul-masail-kubro',
    topic: 'kelas_unggulan',
    display_type: 'highlight_grid',
    excerpt: 'Kombinasi ketajaman analisa santri Kelas Unggulan dan Ulya membuktikan ketangguhan sistem takror madrasah di kancah bahtsul masail eksternal.',
    content: `Kafilah Bahtsul Masail Madin Blokagung berhasil meraih predikat musyawirin terbaik dalam ajang Bahtsul Masail Kubro. Keberhasilan ini tidak lepas dari pembiasaan takror rutin dan kemandirian kajian di kelas unggulan.`,
    cover_image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
    author_name: 'Humas PP. Darussalam Blokagung',
    status: 'published',
    views_count: 630,
    tags: ['Prestasi', 'Bahtsul Masail', 'Unggulan'],
    published_at: '2026-10-23T16:00:00Z',
    created_at: '2026-10-23T16:00:00Z',
  },
  {
    id: 'warta-006',
    title: 'Pelaksanaan Takror Siang Intensif Jelang Evaluasi Triwulan Pertama',
    slug: 'pelaksanaan-takror-siang-intensif-triwulan',
    topic: 'tingkat_ula',
    display_type: 'regular',
    excerpt: 'Seluruh mustahiq mendampingi kelompok takror siang di serambi madrasah guna memantapkan pemahaman pelajaran Nahwu dan Shorof.',
    content: `Program takror siang yang dimulai pukul 14.00 WIB berlangsung tertib. Santri dibagi per kelompok kecil yang dibimbing oleh musyrif dan munawib untuk memastikan target kurikulum tercapai dengan baik.`,
    cover_image_url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    author_name: 'Biro Kesiswaan',
    status: 'published',
    views_count: 180,
    tags: ['Takror', 'KBM', 'ULA'],
    published_at: '2026-10-22T13:00:00Z',
    created_at: '2026-10-22T13:00:00Z',
  },
];
