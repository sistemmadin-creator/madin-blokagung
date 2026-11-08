export interface SerahPiagamRecord {
  id: string;
  no_induk: string;
  nama_santri: string;
  kelas_id?: string;
  tingkat?: string;
  tahun: number;
  is_menerima: boolean;
  tanggal_serah?: string | null;
  diserahkan_oleh?: string | null;
  catatan?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SantriSerahPiagamRow {
  no_induk: string;
  nama: string;
  kamar: string;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  pa_pi: 'PA' | 'PI';
  short_kelas_badge: string;
  kelas_label: string;
  target_materi: string;
  is_menerima: boolean;
  tanggal_serah?: string | null;
  diserahkan_oleh?: string | null;
}

export interface KelasSerahPiagamGroup {
  groupKey: string;
  shortBadge: string;
  kelasLabel: string;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  targetMateri: string;
  totalSantri: number;
  menerimaCount: number;
  belumMenerimaCount: number;
  ratioText: string; // e.g. "7/30"
  percentage: number;
  students: SantriSerahPiagamRow[];
}

export type StatusFilterSerahPiagam = 'all' | 'menerima' | 'belum';
