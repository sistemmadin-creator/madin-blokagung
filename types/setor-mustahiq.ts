import { ItemHafalanDetail } from '@/types/setoran';

export interface SetorMustahiqLog {
  id: string;
  no_induk: string;
  nama_santri: string;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  materi_nama: string;
  kategori: 'Wajib' | 'Sunnah' | 'Kitab';
  target_type: 'numeric' | 'sentence';
  tanggal: string; // YYYY-MM-DD
  tahun: number;
  // Penambahan
  tambah_angka?: number;
  kalimat_dipilih?: string;
  kalimat_index?: number;
  // Status kumulatif setelah input ini
  kumulatif_angka?: number;
  target_akhir_angka?: number;
  satuan_angka?: string;
  status_ringkas: string;
  catatan?: string;
  mustahiq?: string;
  created_at: string;
}

export interface SantriActiveHafalanState {
  no_induk: string;
  active_materi_nama: string;
  active_kategori: 'Wajib' | 'Sunnah' | 'Kitab';
  completed_materi: string[];
  updated_at: string;
}

export interface MateriOptionWithStatus {
  item: ItemHafalanDetail;
  kategori: 'Wajib' | 'Sunnah' | 'Kitab';
  orderIndex: number;
  isCompleted: boolean;
  isCurrentActive: boolean;
  isRecommendedNext: boolean;
  currentProgressPct: number;
  currentStatusLabel: string;
}

export interface SantriSetorMustahiqRow {
  no_induk: string;
  nama: string;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  pa_pi: string;
  kamar: string;
  asrama: string;
  blok: string;
  kelas_label: string; // Contoh: '1A ULA' atau '1 ULA A'
  short_kelas_badge: string; // Contoh: '1A'
  config_key: string; // Contoh: 'ULA_1'
  mustahiq: string;
  active_item: ItemHafalanDetail;
  active_kategori: 'Wajib' | 'Sunnah' | 'Kitab';
  completed_materi: string[];
  total_capaian_angka: number;
  target_akhir_angka: number;
  satuan_label: string;
  latest_sentence: string;
  completed_sentences: string[];
  completed_sentences_count: number;
  total_sentences_count: number;
  progress_pct: number;
  is_target_met: boolean;
  status_badge_text: string;
  status_sub_text: string;
  proses_ratio_text: string;
  proses_full_text: string;
}
