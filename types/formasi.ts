import { Asatidz } from './asatidz';

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
  mustahiq_kg?: string;
  matched_asatidz?: Asatidz[];
  domisili_sync?: string;
  takror_sync?: string;
  diniyyah_sync?: string;
  foto_takror_sync?: string;
  foto_diniyyah_sync?: string;
}
