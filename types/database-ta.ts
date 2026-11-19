export type StrictTingkatTA = 'ULA' | 'WUSTHO' | 'ULYA';

export interface StrictKelasDefinition {
  key: string;
  tingkat: StrictTingkatTA;
  din_kls: string;
  label_kelas: string;
}

/**
 * Daftar baku kelas pada menu Database Tahun Ajaran.
 * STRICT: Hanya mencakup 1-4 ULA, 1-2 WUSTHO, dan 1-2 ULYA.
 * Tidak mencakup ISTI'DAD dan tidak terhubung ke modul EBTADIN.
 */
export const STRICT_KELAS_DATABASE_TA: readonly StrictKelasDefinition[] = [
  { key: '1_ULA', tingkat: 'ULA', din_kls: '1', label_kelas: '1 ULA' },
  { key: '2_ULA', tingkat: 'ULA', din_kls: '2', label_kelas: '2 ULA' },
  { key: '3_ULA', tingkat: 'ULA', din_kls: '3', label_kelas: '3 ULA' },
  { key: '4_ULA', tingkat: 'ULA', din_kls: '4', label_kelas: '4 ULA' },
  { key: '1_WUSTHO', tingkat: 'WUSTHO', din_kls: '1', label_kelas: '1 WUSTHO' },
  { key: '2_WUSTHO', tingkat: 'WUSTHO', din_kls: '2', label_kelas: '2 WUSTHO' },
  { key: '1_ULYA', tingkat: 'ULYA', din_kls: '1', label_kelas: '1 ULYA' },
  { key: '2_ULYA', tingkat: 'ULYA', din_kls: '2', label_kelas: '2 ULYA' },
] as const;

export interface RekapPerKelasTA {
  key: string;
  tingkat: StrictTingkatTA;
  din_kls: string;
  label_kelas: string;
  santri_pa: number;
  santri_pi: number;
  total_santri: number;
  formasi_pa: number;
  formasi_pi: number;
  formasi_unggulan: number;
  total_formasi: number;
  slot_kbm_terisi: number;
  slot_kbm_total: number;
  keterisian_kbm_pct: number;
  sesi_absensi_total: number;
  sesi_absensi_hadir: number;
  kehadiran_asatidz_pct: number;
  setoran_wajib_santri: number;
  setoran_sunnah_santri: number;
  setoran_kitab_santri: number;
  capaian_wajib_pct: number;
  serah_piagam_count: number;
}

export interface RekapRingkasanUmumTA {
  total_santri: number;
  santri_pa: number;
  santri_pi: number;
  total_asatidz_aktif: number;
  total_formasi_kelas: number;
  formasi_reguler: number;
  formasi_unggulan: number;
  slot_kbm_terisi: number;
  slot_kbm_total: number;
  keterisian_kbm_pct: number;
  kehadiran_asatidz_pct: number;
  kehadiran_konsorsium_pct: number;
  total_setoran_hafalan: number;
  capaian_wajib_pct: number;
  total_serah_piagam: number;
  total_agenda_kalender: number;
}

export type StatusArsipTA = 'draf' | 'terkunci';

export interface DatabaseTahunAjaranRekap {
  id?: string;
  tahun_ajaran_masehi: string;
  tahun_ajaran_hijriyah: string;
  status_arsip: StatusArsipTA;
  ringkasan_umum: RekapRingkasanUmumTA;
  rekap_per_kelas: RekapPerKelasTA[];
  catatan_evaluasi: string;
  dibuat_oleh: string;
  diperbarui_oleh: string;
  created_at?: string;
  updated_at?: string;
  is_live_preview?: boolean;
}
