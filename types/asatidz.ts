export interface Asatidz {
  id?: string | number;
  nis?: string;
  nia: string;
  nama_asatidz: string;
  pa_pi: 'PA' | 'PI';
  tempat_lahir?: string;
  tgl_lahir?: string;
  bln_lahir?: string;
  thn_lahir?: string;
  dusun?: string;
  desa?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  blok?: string;
  asrama?: string;
  kode?: string;
  kamar?: string;
  tingkat_asatidz?: string;
  din_kls_asatidz?: string;
  din_bag_asatidz?: string;
  jah_asatidz?: string;
  lokasi_diniyyah?: string;
  lokasi_takror?: string;
  foto_asatidz?: string;
}

export interface AsatidzColumnConfig {
  key: string;
  label: string;
  locked?: boolean;
  defaultVisible?: boolean;
}

export const ASATIDZ_TABLE_COLUMNS: AsatidzColumnConfig[] = [
  { key: 'no', label: 'NO', locked: true, defaultVisible: true },
  { key: 'foto', label: 'FOTO', defaultVisible: true },
  { key: 'nia', label: 'NIA', defaultVisible: true },
  { key: 'pa_pi', label: 'PA/PI', defaultVisible: true },
  { key: 'kelas_diniyyah', label: 'KELAS DINIYYAH', defaultVisible: true },
  { key: 'blok', label: 'BLOK', defaultVisible: true },
  { key: 'nama_asatidz', label: 'NAMA ASATIDZ', locked: true, defaultVisible: true },
  { key: 'jah_asatidz', label: 'JAH', defaultVisible: true },
  { key: 'lokasi_diniyyah', label: 'LOKASI DINIYYAH', defaultVisible: true },
  { key: 'lokasi_takror', label: 'LOKASI TAKROR', defaultVisible: true },
  { key: 'ttl', label: 'TTL', defaultVisible: true },
  { key: 'penempatan_kamar', label: 'PENEMPATAN KAMAR', defaultVisible: true },
  { key: 'alamat_asal', label: 'ALAMAT ASAL', defaultVisible: false },
];

export const ASATIDZ_FILTER_CATEGORIES = [
  { name: 'PA/PI', key: 'pa_pi' as keyof Asatidz },
  { name: 'Kelas Diniyyah', key: 'din_kls_asatidz' as keyof Asatidz },
  { name: 'Blok', key: 'blok' as keyof Asatidz },
  { name: 'Jah', key: 'jah_asatidz' as keyof Asatidz },
];
