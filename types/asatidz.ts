export interface Asatidz {
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

export const ASATIDZ_FILTER_CATEGORIES = [
  { name: 'PA/PI', key: 'pa_pi' as keyof Asatidz },
  { name: 'Kelas Diniyyah', key: 'din_kls_asatidz' as keyof Asatidz },
  { name: 'Blok', key: 'blok' as keyof Asatidz },
  { name: 'Jah', key: 'jah_asatidz' as keyof Asatidz },
];
