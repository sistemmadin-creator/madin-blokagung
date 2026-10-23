export interface RekapAsatidzItem {
  nia: string;
  nama: string;
  pa_pi: 'PA' | 'PI';
  blok: string;
  total_jadwal: number;
  total_hadir: number;
  total_izin: number;
  total_sakit: number;
  total_alfa: number;
  total_tugas: number;
  persentase: number;
}

export interface WAGeneratorConfig {
  tujuan: string;
  nomorWA: string;
  pesanPreview: string;
}
