export type PageAccessMode = 'edit' | 'baca' | 'sembunyikan';

export type AppPageId =
  | 'dashboard'
  | 'santri'
  | 'asatidz'
  | 'jadwal-kbm'
  | 'hari-kbm'
  | 'formasi'
  | 'fan-pelajaran'
  | 'fan-pengajar'
  | 'daftar-pendidik'
  | 'setoran'
  | 'setor-mustahiq'
  | 'rekap-hafalan'
  | 'piagam'
  | 'absensi'
  | 'absen-cepat'
  | 'absen-konsorsium'
  | 'rekap-absensi'
  | 'kelola-berita'
  | 'pengaturan';

export type GenderScope = 'semua' | 'putra' | 'putri';

export type PengaturanAuthorityStatus = 'aktif' | 'non_aktif';

export interface SpecialAuthorities {
  // 'SEMUA' atau array nama Blok dari Hierarki Kamar (Tree 1)
  blok_scope: 'SEMUA' | string[];
  // 'semua' | 'putra' | 'putri'
  gender_scope: GenderScope;
  // 'aktif' | 'non_aktif' (untuk seluruh pengaturan terpusat & di halaman modul)
  pengaturan_status: PengaturanAuthorityStatus;
  // Daftar halaman yang tombol Edit/Ubah data lamanya disembunyikan (walau akses halaman 'edit')
  hide_edit_pages: AppPageId[];
  // Daftar halaman yang tombol Hapusnya disembunyikan (walau akses halaman 'edit')
  hide_delete_pages: AppPageId[];
}

export type PagePermissionsMap = Record<AppPageId, PageAccessMode>;

export interface UserAccountRecord {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'master_admin' | 'pkm_kurikulum' | 'custom_user' | string;
  role_label: string;
  is_active: boolean;
  page_permissions: PagePermissionsMap;
  special_authorities: SpecialAuthorities;
  created_at?: string;
  updated_at?: string;
}

export interface PageCatalogItem {
  id: AppPageId;
  label: string;
  group: string;
  routes: string[];
  supportsEditOverride: boolean;
  supportsDeleteOverride: boolean;
}

export const APP_PAGE_CATALOG: PageCatalogItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Utama',
    group: 'Beranda',
    routes: ['/dashboard'],
    supportsEditOverride: false,
    supportsDeleteOverride: false,
  },
  {
    id: 'santri',
    label: 'Data Santri',
    group: 'Utama',
    routes: ['/santri'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'asatidz',
    label: 'Data Asatidz',
    group: 'Utama',
    routes: ['/asatidz'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'jadwal-kbm',
    label: 'Jadwal KBM Per Kelas',
    group: 'PKM. Kurikulum',
    routes: ['/jadwal-kbm'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'hari-kbm',
    label: 'Hari KBM',
    group: 'PKM. Kurikulum',
    routes: ['/hari-kbm'],
    supportsEditOverride: true,
    supportsDeleteOverride: false,
  },
  {
    id: 'formasi',
    label: 'Formasi Kelas (Master, Putra, Putri)',
    group: 'PKM. Kurikulum',
    routes: ['/formasi', '/formasi/pa', '/formasi/pi'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'fan-pelajaran',
    label: 'Daftar Fan Pelajaran',
    group: 'PKM. Kurikulum',
    routes: ['/fan/pelajaran'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'fan-pengajar',
    label: 'Pengajar Fan',
    group: 'PKM. Kurikulum',
    routes: ['/fan/pengajar'],
    supportsEditOverride: true,
    supportsDeleteOverride: false,
  },
  {
    id: 'daftar-pendidik',
    label: 'Daftar Pendidik',
    group: 'PKM. Kurikulum',
    routes: ['/daftar-pendidik'],
    supportsEditOverride: false,
    supportsDeleteOverride: false,
  },
  {
    id: 'setoran',
    label: 'Setoran Muhafadzoh',
    group: 'PKM. Muhafadzoh',
    routes: ['/setoran'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'setor-mustahiq',
    label: 'Setor Mustahiq',
    group: 'PKM. Muhafadzoh',
    routes: ['/setor-mustahiq'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'rekap-hafalan',
    label: 'Rekap Hafalan',
    group: 'PKM. Muhafadzoh',
    routes: ['/rekap-hafalan'],
    supportsEditOverride: false,
    supportsDeleteOverride: false,
  },
  {
    id: 'piagam',
    label: 'Cetak Piagam',
    group: 'PKM. Muhafadzoh',
    routes: ['/piagam'],
    supportsEditOverride: true,
    supportsDeleteOverride: false,
  },
  {
    id: 'absensi',
    label: 'Absensi Asatidz',
    group: 'PKM. Kesiswaan',
    routes: ['/absensi'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'absen-cepat',
    label: 'Absen Cepat',
    group: 'PKM. Kesiswaan',
    routes: ['/absen-cepat'],
    supportsEditOverride: true,
    supportsDeleteOverride: false,
  },
  {
    id: 'absen-konsorsium',
    label: 'Absen Konsorsium',
    group: 'PKM. Kesiswaan',
    routes: ['/absen-konsorsium'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'rekap-absensi',
    label: 'Rekap Absensi',
    group: 'PKM. Kesiswaan',
    routes: ['/rekap-absensi'],
    supportsEditOverride: false,
    supportsDeleteOverride: false,
  },
  {
    id: 'kelola-berita',
    label: 'Kelola Berita',
    group: 'PKM. Publikasi & Warta',
    routes: ['/kelola-berita'],
    supportsEditOverride: true,
    supportsDeleteOverride: true,
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan Sistem',
    group: 'Pengaturan',
    routes: ['/pengaturan'],
    supportsEditOverride: true,
    supportsDeleteOverride: false,
  },
];
