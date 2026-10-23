export interface FormasiKelas {
  id?: string;
  tingkat: string;
  kelas: string;
  gender: 'PA' | 'PI';
  kapasitas: number;
  wali_kelas?: string;
  lokasi?: string;
  santri_ids?: string[];
}
