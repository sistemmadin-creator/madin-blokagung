export interface SetoranHafalan {
  id?: string;
  no_induk: string;
  nama: string;
  kelas: string;
  kamar: string;
  kategori: 'wajib' | 'sunnah' | 'kitab';
  item_hafalan: string;
  capaian: string;
  nilai?: string;
  penjaga: string;
  tanggal: string;
}

export interface HafalanConfig {
  hafWajib: Record<string, number>;
  hafSunnah: Record<string, number>;
  hafKitab: Record<string, number>;
  penjagaBebas: string[];
}
