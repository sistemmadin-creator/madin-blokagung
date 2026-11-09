export interface SetoranHafalan {
  id?: string;
  no_induk: string;
  tanggal: string; // Format DD/MM/YYYY HH:mm atau ISO
  nama: string;
  tgl_lahir?: string;
  bln_lahir?: string;
  thn_lahir?: string;
  tempat_lahir?: string;
  penjaga: string;
  mustahiq?: string;
  tingkat?: string;
  din_bag?: string;
  din_kls?: string;
  kecamatan?: string;
  kabupaten?: string;
  provinsi?: string;
  bin?: string;
  item_hafalan: string;
  kategori: string; // 'Wajib' | 'Sunnah' | 'Tahfidz' | 'Kitab'
  // Kompatibilitas modul lain
  kelas?: string;
  kamar?: string;
  capaian?: string;
  nilai?: string;
  created_at?: string;
}

export type RiwayatSetoranRawRow = [
  string, // 0: dummy / checkbox
  string, // 1: noInduk
  string, // 2: tglSetor
  string, // 3: namaSantri
  string, // 4: tglLahir
  string, // 5: blnLahir
  string, // 6: thnLahir
  string, // 7: tempatLahir
  string, // 8: penjaga
  string, // 9: mustahiq
  string, // 10: tingkat
  string, // 11: dinBag
  string, // 12: dinKls
  string, // 13: kecamatan
  string, // 14: kabupaten
  string, // 15: provinsi
  string, // 16: bin
  string, // 17: hafalan
  string  // 18: kategori
];

export type TargetUnitNumeric = 'baris' | 'halaman' | 'bait' | 'skor' | 'custom';

export interface ItemHafalanDetail {
  id: string;
  nama: string;
  targetType: 'numeric' | 'sentence';
  kategori?: string;
  targetAkhirAngka?: number;
  satuanAngka?: string;
  // Konfigurasi target angka (baris, halaman, bait, skor 1-100)
  numericUnit?: TargetUnitNumeric;
  customUnit?: string;
  numericStart?: number;
  numericEnd?: number;
  numericStep?: number;
  // Konfigurasi target kalimat (muqodimah, mubtada, khobar, rofa, jer)
  sentences?: string[];
  sentenceUnitLabel?: string;
  keterangan?: string;
}

export type HafalanItemType = string | ItemHafalanDetail;

export type ModeAlurTahfidz = 'simultan' | 'didahulukan';

export interface SantriTahfidzItem {
  no_induk: string;
  nama: string;
  tingkat?: string;
  din_kls?: string;
  din_bag?: string;
  pa_pi?: 'PA' | 'PI';
  mode: ModeAlurTahfidz; // 'simultan' (2 hafalan) | 'didahulukan' (tahfidz prioritas)
  customTargetJuz?: number; // Override batas juz (opsional, jika beda dari standar global)
  tanggalBergabung?: string; // YYYY-MM-DD
}

export interface TahfidzConfig {
  standarMaksimalJuz: number; // Default: 3
  santriTahfidzList: SantriTahfidzItem[];
}

export interface HafalanConfig {
  hafWajib: Record<string, HafalanItemType[]>;
  hafSunnah: Record<string, HafalanItemType[]>;
  hafKitab: Record<string, HafalanItemType[]>;
  penjagaBebas: string[];
  tahfidz?: TahfidzConfig;
}

export interface SilabusItemRule {
  materi_id?: string;
  materi_nama: string;
  kategori: 'Wajib' | 'Sunnah';
  target_type?: 'numeric' | 'sentence';
  target_preview?: string;
  dari_bulan_index: number; // 0 = Juli, 1 = Agustus, ..., 11 = Juni
  sampai_bulan_index: number; // 0 = Juli, 1 = Agustus, ..., 11 = Juni
  dari_bulan_nama?: string;
  sampai_bulan_nama?: string;
}

export type SilabusConfigMap = Record<string, SilabusItemRule[]>;

