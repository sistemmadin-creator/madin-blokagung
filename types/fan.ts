export interface FanItem {
  id: string;
  nama: string;
  kitab: string;
  tingkat: string;
  jamMS: number; // Jam Mengajar Standar
  jamMB: number; // Jam Mengajar Bebas
  alokasiJam?: number;
  din_kls?: string;
  din_bag?: string;
  grupAsal?: string;
  asatidzList?: string[];
}

export interface FanConfig {
  items: FanItem[];
  grupAsalList: string[];
}

// ============================================================================
// STRUKTUR DATA RESMI KELAS & MATRIKS FAN PELAJARAN (app_settings)
// ============================================================================

/**
 * Peta konfigurasi item Fan per kelas reguler ("1 ULA") atau sub-kelas unggulan ("1 A ULA (Ug)").
 * Format item: "(NamaFan) Nama Kitab / Mapel"
 * Contoh: { "1 ULA": ["(Fiqih) Mabadi Fiqih Juz I", "(Tajwid) Hidayatush Shibyan"] }
 */
export type FanConfigMap = Record<string, string[]>;

/**
 * Detail pengajar dan jam per item fan (key format: `${kelasKey}||${rawItem}`)
 */
export interface FanItemDetail {
  jam?: string;
  pengajar?: string; // 'MS' | 'MB' | 'MS, MB' | ''
  asatidz?: string[]; // Array nama-nama asatidz yang ditugaskan
}

/**
 * Keterangan catatan kelas per kelasKey (merging vertical textarea)
 */
export interface FanKelasDetail {
  keterangan?: string;
}

/**
 * Struktur objek tersimpan pada key `FAN_PELAJARAN_DETAIL` di Supabase
 */
export interface FanPelajaranDetail {
  kelas?: Record<string, FanKelasDetail>;
  item?: Record<string, FanItemDetail>;
}

/**
 * Master Grup Asal Asatidz untuk pengelompokan vertikal pada Rekapitulasi Pengajar Fan
 */
export interface GrupAsalItem {
  id?: string;
  namaGrup: string;
  anggota: string[]; // Array nama lengkap asatidz
}

/**
 * Hasil parsing format "(NamaFan) Nama Mapel/Kitab"
 */
export interface ParsedFanItem {
  fan: string;
  mapel: string;
}

/**
 * Entri representasi baris kurikulum per item fan di matriks tabel
 */
export interface MatriksFanRowItem {
  idx: number;
  rawItem: string;
  itemKey: string;
  fan: string;
  mapel: string;
  jam: string;
  pengajar: string;
  asatidz: string[];
}

/**
 * Kelompok kelas di tabel matriks
 */
export interface MatriksKelasGroup {
  klsNum: string;
  tingkat: string;
  kelasKey: string;
  fallbackKey?: string;
  romawiKls: string;
  isUg: boolean;
  keterangan: string;
  items: MatriksFanRowItem[];
}
