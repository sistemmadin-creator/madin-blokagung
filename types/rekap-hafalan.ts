export interface RekapHafalanTingkat {
  tingkat: string;
  total_santri: number;
  tuntas: number;
  belum_tuntas: number;
  persentase: number;
  detail_per_kelas: Record<string, { tuntas: number; total: number }>;
}
