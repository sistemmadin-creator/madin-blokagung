export interface Santri {
  no_induk: string;
  pa_pi: 'PA' | 'PI';
  nama: string;
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
  kelas?: string;
  bag?: string;
  semester?: string;
  jurusan?: string;
  unit?: string;
  din_kls?: string;
  din_bag?: string;
  tingkat?: string;
  nama_ayah?: string;
  telepon?: string;
  foto?: string;
}

export const SANTRI_COLUMNS: { key: keyof Santri; label: string; locked?: boolean }[] = [
  { key: 'no_induk', label: 'NIS' },
  { key: 'pa_pi', label: 'Gender' },
  { key: 'nama', label: 'Nama Lengkap', locked: true },
  { key: 'tempat_lahir', label: 'Tempat Lahir' },
  { key: 'tgl_lahir', label: 'Tgl' },
  { key: 'bln_lahir', label: 'Bln' },
  { key: 'thn_lahir', label: 'Thn' },
  { key: 'dusun', label: 'Dusun' },
  { key: 'desa', label: 'Desa' },
  { key: 'kecamatan', label: 'Kecamatan' },
  { key: 'kabupaten', label: 'Kabupaten' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'blok', label: 'Blok' },
  { key: 'asrama', label: 'Asrama' },
  { key: 'kode', label: 'Kode' },
  { key: 'kamar', label: 'Kamar' },
  { key: 'kelas', label: 'Kelas' },
  { key: 'bag', label: 'Bag' },
  { key: 'semester', label: 'Semester' },
  { key: 'jurusan', label: 'Jurusan' },
  { key: 'unit', label: 'Unit' },
  { key: 'din_kls', label: 'Din.Kls' },
  { key: 'din_bag', label: 'Din.Bag' },
  { key: 'tingkat', label: 'Tingkat' },
  { key: 'nama_ayah', label: 'Nama Ayah' },
  { key: 'telepon', label: 'Telepon' },
];

export const SANTRI_FILTER_CATEGORIES = [
  { name: 'PA/PI', key: 'pa_pi' as keyof Santri },
  { name: 'Tempat Lahir', key: 'tempat_lahir' as keyof Santri },
  { name: 'Dusun', key: 'dusun' as keyof Santri },
  { name: 'Desa', key: 'desa' as keyof Santri },
  { name: 'Kecamatan', key: 'kecamatan' as keyof Santri },
  { name: 'Kabupaten', key: 'kabupaten' as keyof Santri },
  { name: 'Provinsi', key: 'provinsi' as keyof Santri },
  { name: 'Blok', key: 'blok' as keyof Santri },
  { name: 'Asrama', key: 'asrama' as keyof Santri },
  { key: 'kode' as keyof Santri, name: 'Kode' },
  { name: 'Unit', key: 'unit' as keyof Santri },
  { name: 'Jurusan', key: 'jurusan' as keyof Santri },
  { name: 'Semester', key: 'semester' as keyof Santri },
  { name: 'Tingkat', key: 'tingkat' as keyof Santri },
  { name: 'Din.Bag', key: 'din_bag' as keyof Santri },
];
