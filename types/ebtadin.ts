export interface EbtadinTahunAjaran {
  id: string;
  tahun_masehi: number;
  tahun_hijriyah: string;
  nama_angkatan: string;
  status: 'DRAFT' | 'LOCKED';
  is_active: boolean;
  tanggal_kunci?: string | null;
  dikunci_oleh?: string | null;
  catatan?: string | null;
}

export interface EbtadinFormasiKelas {
  id: string;
  tahun_ebtadin_id: string;
  source_formasi_id?: string | null;
  tingkat: 'ULA' | 'WUSTHO' | 'ULYA';
  din_kls: string;
  din_bag: string;
  pa_pi: 'PA' | 'PI';
  domisili?: string | null;
  wali_kelas_text?: string | null;
  id_mustahiq?: string | null;
  lokasi_diniyyah?: string | null;
  lokasi_takror?: string | null;
  blok_diniyyah?: string | null;
  blok_takror?: string | null;
  foto_diniyyah?: string | null;
  foto_takror?: string | null;
  kapasitas_maksimal?: number;
}

export interface EbtadinSantri {
  id: string;
  tahun_ebtadin_id: string;
  ebtadin_formasi_id: string;
  source_santri_id?: number | null;
  no_induk: string;
  nisn?: string | null;
  nama: string;
  pa_pi: string;
  tempat_lahir?: string | null;
  tgl_lahir?: string | null;
  bln_lahir?: string | null;
  thn_lahir?: string | null;
  desa?: string | null;
  kecamatan?: string | null;
  kabupaten?: string | null;
  provinsi?: string | null;
  blok?: string | null;
  asrama?: string | null;
  kamar?: string | null;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  nomor_seri_ijazah?: string | null;
  urutan_ijazah?: number;
}

export interface EbtadinAsatidz {
  id: string;
  tahun_ebtadin_id: string;
  source_asatidz_id?: string | null;
  nia?: string | null;
  nama_asatidz: string;
  pa_pi?: string | null;
  tingkat_asatidz?: string | null;
  din_kls_asatidz?: string | null;
  din_bag_asatidz?: string | null;
  jah_asatidz?: string | null;
  peran_ebtadin?: string;
  foto_asatidz?: string | null;
}

export interface EbtadinSerahIjazah {
  id: string;
  tahun_ebtadin_id: string;
  ebtadin_santri_id: string;
  ebtadin_formasi_id: string;
  no_induk: string;
  nama_santri: string;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  nomor_seri_ijazah?: string | null;
  is_menerima: boolean;
  tanggal_serah?: string | null;
  diserahkan_oleh?: string | null;
  penerima_nama?: string | null;
  status_penahanan?: 'NONE' | 'TAHAN_KITAB' | 'TAHAN_ADMINISTRASI' | 'TAHAN_HAFALAN' | string | null;
  alasan_penahanan?: string | null;
  catatan?: string | null;
}

export interface EbtadinAlasanOption {
  id: string;
  kategori: 'UJIAN' | 'LULUS';
  kode: string;
  label: string;
  urutan: number;
  is_active: boolean;
}

export interface EbtadinPesertaUjian {
  id: string;
  tahun_ebtadin_id: string;
  ebtadin_santri_id: string;
  ebtadin_formasi_id: string;
  no_induk: string;
  nama_santri: string;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  is_ikut_ujian: boolean;
  alasan_kode?: string | null;
  alasan_teks?: string | null;
  catatan?: string | null;
  tanggal_verifikasi?: string | null;
  dicatat_oleh?: string | null;
}

export interface EbtadinKelulusan {
  id: string;
  tahun_ebtadin_id: string;
  ebtadin_santri_id: string;
  ebtadin_formasi_id: string;
  no_induk: string;
  nama_santri: string;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  is_lulus: boolean;
  alasan_kode?: string | null;
  alasan_teks?: string | null;
  predikat?: 'MUMTAZ' | 'JAYYID JIDDAN' | 'JAYYID' | 'MAQBUL' | 'RASP' | string | null;
  catatan?: string | null;
  tanggal_penetapan?: string | null;
  ditetapkan_oleh?: string | null;
}
