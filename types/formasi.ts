export interface FormasiKelas {
  id?: string;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  pa_pi: 'PA' | 'PI';
  is_unggulan?: boolean;
  kapasitas_maksimal: number;
  id_mustahiq?: string;
  domisili?: string;
  lokasi_takror?: string;
  lokasi_diniyyah?: string;
  blok?: string;
  foto_takror?: string;
  foto_diniyyah?: string;
  created_at?: string;
}

export interface FormasiWithStats extends FormasiKelas {
  jumlah_santri: number;
  persentase: number;
  wali_kelas_text: string;
}
