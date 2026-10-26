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

export interface HafalanConfig {
  hafWajib: Record<string, string[]>;
  hafSunnah: Record<string, string[]>;
  hafKitab: Record<string, string[]>;
  penjagaBebas: string[];
}
