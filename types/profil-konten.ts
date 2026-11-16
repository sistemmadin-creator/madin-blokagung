export type ProfilSectionKey =
  | 'metrik_lembaga'
  | 'model_pembelajaran'
  | 'khazanah_turats';

export interface ProfilSectionMeta {
  section_key: ProfilSectionKey;
  badge_label: string;
  judul: string;
  deskripsi: string;
  updated_at?: string;
}

export type ProfilIconName =
  | 'Calendar'
  | 'Users'
  | 'School'
  | 'Award'
  | 'BookCheck'
  | 'Sparkles'
  | 'TrendingUp'
  | 'BookOpen'
  | 'GraduationCap'
  | 'Building2'
  | 'Layers'
  | 'Sun'
  | 'Moon'
  | 'Clock';

export interface ProfilMetrikItem {
  id: string;
  value: string;
  label: string;
  sublabel: string;
  badge: string;
  icon_name: ProfilIconName;
  accent: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ModelColorTheme = 'emerald' | 'amber' | 'teal' | 'blue' | 'rose';

export interface ProfilModelPembelajaranItem {
  id: string;
  title: string;
  badge: string;
  deskripsi: string;
  icon_name: ProfilIconName;
  color_theme: ModelColorTheme;
  features: string[];
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KhazanahKitabItem {
  id: string;
  fan: string;
  kitab: string;
  kitabArab: string;
  kelas: string;
  target: string;
}

export interface ProfilKhazanahJenjangItem {
  id: string;
  kode_tab: string;
  nama: string;
  durasi: string;
  fokus: string;
  target_hafalan: string;
  ujian_akhir: string;
  kitab_list: KhazanahKitabItem[];
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WaktuKbmSlotItem {
  id: string;
  waktu: string;
  keterangan: string;
}

export interface ProfilWaktuKbmItem {
  id: string;
  judul: string;
  rentang_waktu: string;
  tema: 'siang' | 'malam';
  icon_name: ProfilIconName;
  slots: WaktuKbmSlotItem[];
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const METRIK_ACCENT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Emas (Amber)', value: 'from-amber-500 to-amber-700' },
  { label: 'Hijau Emerald', value: 'from-emerald-600 to-teal-800' },
  { label: 'Biru Indigo', value: 'from-blue-600 to-indigo-800' },
  { label: 'Emas & Hijau', value: 'from-amber-600 to-emerald-800' },
  { label: 'Rose Merah', value: 'from-rose-600 to-rose-800' },
];

export const MODEL_THEME_META: Record<
  ModelColorTheme,
  { label: string; cardClass: string }
> = {
  emerald: {
    label: 'Hijau Emerald',
    cardClass:
      'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100',
  },
  amber: {
    label: 'Emas (Amber)',
    cardClass:
      'border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100',
  },
  teal: {
    label: 'Teal Tosca',
    cardClass:
      'border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 text-teal-950 dark:text-teal-100',
  },
  blue: {
    label: 'Biru Langit',
    cardClass:
      'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-950 dark:text-blue-100',
  },
  rose: {
    label: 'Rose',
    cardClass:
      'border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100',
  },
};

export const DEFAULT_PROFIL_SECTION_META: Record<ProfilSectionKey, ProfilSectionMeta> = {
  metrik_lembaga: {
    section_key: 'metrik_lembaga',
    badge_label: 'Skala & Metrik Lembaga',
    judul: 'Tradisi Salaf Skala Besar yang Terkelola Terstruktur',
    deskripsi:
      'Menggabungkan keotentikan sistem sorogan-bandongan pesantren salaf dengan tata kelola administrasi modern untuk membina ribuan kader ulama.',
  },
  model_pembelajaran: {
    section_key: 'model_pembelajaran',
    badge_label: 'Model Pembelajaran',
    judul: 'Tiga Pilar Program Pendidikan MADINA',
    deskripsi:
      'Memberikan ruang berkembang yang proporsional bagi setiap santri sesuai tingkat kemampuan dan target keilmuan.',
  },
  khazanah_turats: {
    section_key: 'khazanah_turats',
    badge_label: 'Khazanah Turats Salafiyah',
    judul: 'Kurikulum Kitab Kuning & Jenjang Pendidikan',
    deskripsi:
      'Disusun secara berjenjang mulai dari pengenalan Pegon hingga kitab turats tingkat tinggi untuk mencetak kader ulama yang mutafaqqih fiddin.',
  },
};

export const DEFAULT_METRIK_LEMBAGA: ProfilMetrikItem[] = [
  {
    id: 'tahun',
    value: '1951 M',
    label: 'Tahun Berdiri',
    sublabel: '75+ Tahun Mengabdi & Bertransformasi',
    badge: 'Est. 1951',
    icon_name: 'Calendar',
    accent: 'from-amber-500 to-amber-700',
    sort_order: 10,
    is_active: true,
  },
  {
    id: 'santri',
    value: '± 5.400',
    label: 'Santri Aktif',
    sublabel: 'Talamidz Putra & Putri (Ula, Wustho, Ulya)',
    badge: 'Putra & Putri',
    icon_name: 'Users',
    accent: 'from-emerald-600 to-teal-800',
    sort_order: 20,
    is_active: true,
  },
  {
    id: 'kelas',
    value: '161+',
    label: 'Rombongan Belajar',
    sublabel: 'Formasi Kelas Reguler, Unggulan & Blok Luar',
    badge: '161 Rombel',
    icon_name: 'School',
    accent: 'from-blue-600 to-indigo-800',
    sort_order: 30,
    is_active: true,
  },
  {
    id: 'pendidik',
    value: '367+',
    label: 'Tenaga Pendidik',
    sublabel: 'Mustahiq, Munawib, Pengurus & Ndalem',
    badge: 'SDM Berdedikasi',
    icon_name: 'Award',
    accent: 'from-amber-600 to-emerald-800',
    sort_order: 40,
    is_active: true,
  },
];

export const DEFAULT_MODEL_PEMBELAJARAN: ProfilModelPembelajaranItem[] = [
  {
    id: 'pilar-reguler',
    title: 'Kelas Reguler',
    badge: 'Fondasi Salafiyah',
    deskripsi:
      'Pendidikan diniyyah berjenjang 3 tingkatan (Ula 4 th, Wustho 2 th, Ulya 2 th) dengan target penguasaan materi ushul fiqih, gramatika (Nahwu-Shorof), aqidah, dan muhafadzoh nadzom wajib.',
    icon_name: 'BookCheck',
    color_theme: 'emerald',
    features: [
      'KBM Malam Jam I, II, dan III',
      'Takror Siang & Setoran 6 Kelompok',
      'Batas Presensi Alfa Maksimal 10%',
    ],
    sort_order: 10,
    is_active: true,
  },
  {
    id: 'pilar-unggulan',
    title: 'Kelas Unggulan',
    badge: 'Est. 2018 M',
    deskripsi:
      "Dirancang untuk santri berprestasi (3 Ula s/d 2 Ulya) dengan pembiasaan kemandirian baca kitab (larangan mbalah bagi mustahiq di Daur Tsani), Syawir Kubro mingguan, dan evaluasi Ma'had Aly.",
    icon_name: 'Sparkles',
    color_theme: 'amber',
    features: [
      'Metode Belajar Mandiri & Diskusi Aktif',
      'Syawir Kubro & Kajian Mendalam',
      "Evaluasi Triwulanan Bersama Ma'had Aly",
    ],
    sort_order: 20,
    is_active: true,
  },
  {
    id: 'pilar-akselerasi',
    title: 'Program Akselerasi & IHFAD',
    badge: 'Est. 2019 M',
    deskripsi:
      'Percepatan jenjang bagi santri berpotensi luar biasa (1 Ula – 4 Ula) yang dibarengi kewajiban bimbingan intensif IHFAD (Jilid I, II, dan III) untuk penuntasan hafalan nadzom tingkat tinggi.',
    icon_name: 'TrendingUp',
    color_theme: 'teal',
    features: [
      'Seleksi Ketat Hafalan & Pemahaman',
      'Bimbingan Khusus IHFAD Berjenjang',
      'Akselerasi Jenjang 1–4 Ula',
    ],
    sort_order: 30,
    is_active: true,
  },
];

export const DEFAULT_KHAZANAH_JENJANG: ProfilKhazanahJenjangItem[] = [
  {
    id: 'jen-istidad',
    kode_tab: "Isti'dad",
    nama: "Tingkat Isti'dad (Persiapan)",
    durasi: '1 Tahun Ajaran',
    fokus:
      "Pengenalan Huruf Arab Pegon, Imla', Dasar Aqidah, serta Praktik Wudlu & Sholat Fardlu",
    target_hafalan:
      "Surat-surat Pendek Juz 'Amma, Doa Sehari-hari, dan Nadzom Aqidatul Awwam Awal",
    ujian_akhir: 'Tes Lisan Praktik Ibadah & Imtihan Persiapan',
    sort_order: 10,
    is_active: true,
    kitab_list: [
      { id: 'k-ist-1', fan: 'Fiqih', kitab: "Mabadi'ul Fiqhiyyah Juz 1", kitabArab: 'مبادئ الفقهية', kelas: "Isti'dad", target: 'Thoharoh & Rukun Sholat' },
      { id: 'k-ist-2', fan: 'Aqidah', kitab: "Aqidatul Mubtadi'in", kitabArab: 'عقيدة المبتدئين', kelas: "Isti'dad", target: 'Sifat Wajib 20 Bagi Allah' },
      { id: 'k-ist-3', fan: 'Akhlaq', kitab: "Tanbihul Muta'allim", kitabArab: 'تنبيه المتعلم', kelas: "Isti'dad", target: 'Adab Kepada Guru & Teman' },
      { id: 'k-ist-4', fan: "Pegon & Imla'", kitab: 'Al-Itqon Pegon', kitabArab: 'الإتقان في خط البيغون', kelas: "Isti'dad", target: 'Membaca & Menulis Gandeng' },
      { id: 'k-ist-5', fan: 'Tajwid', kitab: 'Hidayatus Shibyan', kitabArab: 'هداية الصبيان', kelas: "Isti'dad", target: 'Hukum Nun Mati & Tanwin' },
    ],
  },
  {
    id: 'jen-ula',
    kode_tab: 'Ula',
    nama: 'Tingkat Ula (Dasar Salaf)',
    durasi: '4 Tahun (Kelas 1 s/d 4 Ula)',
    fokus:
      'Penguasaan Gramatika Bahasa Arab (Jurumiyyah & Imrithi), Ushul Fiqih Dasar (Safinah & Taqrib Awal), serta Tasrifan',
    target_hafalan:
      "Nadzom Jurumiyyah, Al-Maqsud, Al-'Imrithi, Juz 'Amma lengkap & Khulashoh Nurul Yaqin",
    ujian_akhir: 'Ulangan Umum Bersama (UUB), Daur Awwal/Tsani, dan Evaluasi Tingkat 4 Ula',
    sort_order: 20,
    is_active: true,
    kitab_list: [
      { id: 'k-ula-1', fan: 'Nahwu', kitab: 'Jurumiyyah Al-Bayan & Matan Jurumiyyah', kitabArab: 'الآجرومية والبيان', kelas: '1 - 2 Ula', target: "I'rab, Isim-Isim Marfu' & Manshub" },
      { id: 'k-ula-2', fan: 'Nahwu Lanjutan', kitab: "Nadzom Al-'Imrithi", kitabArab: 'نظم الدرة البهية (العمريطي)', kelas: '3 - 4 Ula', target: "254 Bait Nadzom I'rab Lengkap" },
      { id: 'k-ula-3', fan: 'Shorof', kitab: 'Tashrif Istilahi & Lughowi (Kaelani)', kitabArab: 'تصريف اصطلاحي ولغوي', kelas: '1 - 3 Ula', target: "Bina' Shohih s/d Mu'tal 6 Bab" },
      { id: 'k-ula-4', fan: 'Fiqih', kitab: 'Safinatun Najah & Sullamut Taufiq', kitabArab: 'سفينة النجاة وسلم التوفيق', kelas: '1 - 3 Ula', target: 'Fiqih Ibadah, Muamalah, Jenazah' },
      { id: 'k-ula-5', fan: 'Fiqih Lanjutan', kitab: 'Matan Taqrib (Fathul Qorib Awal)', kitabArab: 'متن الغاية والتقريب', kelas: '4 Ula', target: 'Bab Thoharoh, Sholat, Zakat' },
      { id: 'k-ula-6', fan: 'Aqidah', kitab: 'Aqidatul Awwam & Tuhfatul Murid', kitabArab: 'عقيدة العوام', kelas: '1 - 2 Ula', target: '50 Aqaid Seket & Kisah 25 Rasul' },
      { id: 'k-ula-7', fan: 'Akhlaq', kitab: "Taisirul Kholaq & Washoya Al-Abaa'", kitabArab: 'تيسير الخلاق والوصايا', kelas: '1 - 3 Ula', target: 'Etika Penuntut Ilmu' },
      { id: 'k-ula-8', fan: 'Tarikh Nabi', kitab: 'Khulashoh Nurul Yaqin Juz 1 & 2', kitabArab: 'خلاصة نور اليقين', kelas: '2 - 4 Ula', target: 'Sirah Nabawiyyah Makkiyah-Madaniyyah' },
    ],
  },
  {
    id: 'jen-wustho',
    kode_tab: 'Wustho',
    nama: 'Tingkat Wustho (Menengah Salaf)',
    durasi: '2 Tahun (Kelas 1 s/d 2 Wustho)',
    fokus:
      "Pendalaman Kitab Fathul Qorib, Penguasaan Alfiyyah Ibnu Malik, Qowa'idul I'rab, Faroidl (Mawaris), dan Risalatul Mahidl",
    target_hafalan:
      'Alfiyyah Ibnu Malik (Bait 1 s/d 500 di Kelas 1, 501 s/d 1002 di Kelas 2) & Nadzom Faroidl',
    ujian_akhir: "Tes Kitab Fathul Qorib (Al-Qur'an & Taqrib), Daur Tsani, dan Syawir Kubro Wustho",
    sort_order: 30,
    is_active: true,
    kitab_list: [
      { id: 'k-wus-1', fan: 'Nahwu Akbar', kitab: 'Alfiyyah Ibnu Malik (Jilid 1 & 2)', kitabArab: 'ألفية ابن مالك في النحو', kelas: '1 - 2 Wustho', target: 'Khatam 1.002 Bait Alfiyyah' },
      { id: 'k-wus-2', fan: "Fiqih Syafi'i", kitab: 'Syarah Fathul Qorib Al-Mujib', kitabArab: 'فتح القريب المجيب شرح تقريب', kelas: '1 - 2 Wustho', target: 'Muamalah, Munakahat, Jinayat' },
      { id: 'k-wus-3', fan: "Qowa'id I'rab", kitab: "Qowa'idul I'rab Ibnu Hisyam", kitabArab: 'قواعد الإعراب لابن هشام', kelas: '1 Wustho', target: "Tathbiq I'rab Kalimat Kompleks" },
      { id: 'k-wus-4', fan: "I'lal & Shorof", kitab: "Qowa'idul I'lal & Nadzmul Maqsud", kitabArab: 'قواعد الإعلال ونظم المقصود', kelas: '1 - 2 Wustho', target: "Kaidah 19 I'lal Huruf 'Illat" },
      { id: 'k-wus-5', fan: 'Tauhid Lanjutan', kitab: 'Khoridatul Bahiyyah & Kifayatul Awwam', kitabArab: 'الخريدة البهية', kelas: '1 - 2 Wustho', target: 'Dalil Aqli & Naqli Sifat 20' },
      { id: 'k-wus-6', fan: 'Mawaris', kitab: 'Diklat Ilmu Faroidl', kitabArab: 'علم الفرائض والمواريث', kelas: '2 Wustho', target: "Hitungan Ashabul Furudh & 'Ashobah" },
      { id: 'k-wus-7', fan: "Dima' Jibliyyah", kitab: 'Risalatul Mahidl', kitabArab: 'رسالة المحيض', kelas: '1 Wustho Pi/Pa', target: 'Haidh, Nifas, Istihadlah & Salat' },
    ],
  },
  {
    id: 'jen-ulya',
    kode_tab: 'Ulya',
    nama: 'Tingkat Ulya (Tinggi & Kader Ulama)',
    durasi: '2 Tahun (Kelas 1 s/d 2 Ulya)',
    fokus:
      "Tafaqquh Fiddin Tingkat Tinggi (Fathul Mu'in), Ibnu 'Aqil, Sastra Balaghah, Ushul Fiqh, Falakiyah, serta Praktik Pengalaman Lapangan (PPL)",
    target_hafalan:
      'Jauharotut Tauhid, Jauharul Maknun (Balaghah), dan Sullamul Munauroq (Mantiq)',
    ujian_akhir: "Ebtadin Ulya, Sidang Munaqosyah PPL, dan Ujian Bahtsul Masa'il Kubro",
    sort_order: 40,
    is_active: true,
    kitab_list: [
      { id: 'k-uly-1', fan: 'Fiqih Tingkat Tinggi', kitab: "Fathul Mu'in bi Syarhi Qurratil 'Ain", kitabArab: 'فتح المعين بشرح قرة العين', kelas: '1 - 2 Ulya', target: 'Tathbiq Ibadah & Muamalah Turats' },
      { id: 'k-uly-2', fan: 'Syarah Nahwu', kitab: "Syarah Ibnu 'Aqil 'Ala Alfiyyah", kitabArab: 'شرح ابن عقيل على الألفية', kelas: '1 - 2 Ulya', target: 'Analisis Khilafiyah Bashrah & Kufah' },
      { id: 'k-uly-3', fan: 'Sastra Balaghah', kitab: "Al-Jauharul Maknun (Ma'ani, Bayan, Badi')", kitabArab: 'الجوهر المكنون في البلاغة', kelas: '1 - 2 Ulya', target: "Keindahan Retorika Al-Qur'an" },
      { id: 'k-uly-4', fan: 'Logika Mantiq', kitab: 'Sullamul Munauroq & Idhohul Mubham', kitabArab: 'السلم المنورق في علم المنطق', kelas: '1 Ulya', target: 'Tashowwur & Tashdiq Argumentasi' },
      { id: 'k-uly-5', fan: 'Mushtholah Hadits', kitab: 'Manzhumah Baiquniyyah & Tashilut Thuruqot', kitabArab: 'المنظومة البيقونية', kelas: '1 - 2 Ulya', target: "Klasifikasi Hadits Shohih s/d Dlo'if" },
      { id: 'k-uly-6', fan: 'Astronomi Islam', kitab: 'Ilmu Falakiyah Darussalam', kitabArab: 'علم الفلك والمواقيت', kelas: '2 Ulya', target: 'Hisab Awal Bulan & Arah Kiblat' },
    ],
  },
];

export const DEFAULT_WAKTU_KBM: ProfilWaktuKbmItem[] = [
  {
    id: 'wkbm-siang',
    judul: 'Takror Siang (Mudzakarah & Setoran Hafalan)',
    rentang_waktu: 'Pukul 13.30 – 15.00 WIB',
    tema: 'siang',
    icon_name: 'Sun',
    sort_order: 10,
    is_active: true,
    slots: [
      { id: 'sl-s-1', waktu: '13.30 – 13.55 WIB', keterangan: 'Persiapan, oprak-oprak kamar, dan penertiban lokal kelas.' },
      { id: 'sl-s-2', waktu: '13.55 – 14.00 WIB', keterangan: 'Pencegatan lokal & lalaran bait nadzom (Qobla al-Dirosah).' },
      { id: 'sl-s-3', waktu: '14.00 – 15.00 WIB', keterangan: 'Pelaksanaan 3 sesi takror 6 kelompok & setoran muhafadzoh.' },
    ],
  },
  {
    id: 'wkbm-malam',
    judul: 'Diniyyah Malam (KBM Pokok & Sorogan)',
    rentang_waktu: 'Pukul 19.55 – 22.30 WIB',
    tema: 'malam',
    icon_name: 'Moon',
    sort_order: 20,
    is_active: true,
    slots: [
      { id: 'sl-m-1', waktu: '19.55 WIB', keterangan: 'Bel tanda masuk & pencegatan Tim Oprak-Oprak (TOP).' },
      { id: 'sl-m-2', waktu: '20.00 – 20.45 WIB', keterangan: 'Jam Pelajaran I (Mata pelajaran pokok fanniyah).' },
      { id: 'sl-m-3', waktu: '20.45 – 21.30 WIB', keterangan: 'Jam Pelajaran II (Gramatika & pendalaman nahwu-shorof).' },
      { id: 'sl-m-4', waktu: '21.30 – 22.30 WIB', keterangan: 'Jam III / IV: Bandongan Ula & Sorogan Kitab Wustho/Ulya.' },
    ],
  },
];
