export type KondisiSapras =
  | 'BAIK'
  | 'RUSAK_RINGAN'
  | 'RUSAK_BERAT'
  | 'BELUM_ADA';

export const KONDISI_SAPRAS_META: Record<
  KondisiSapras,
  { label: string; shortLabel: string; badgeClass: string; dotClass: string }
> = {
  BAIK: {
    label: 'Baik & Layak',
    shortLabel: 'Baik',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  RUSAK_RINGAN: {
    label: 'Rusak Ringan',
    shortLabel: 'Rusak Ringan',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  RUSAK_BERAT: {
    label: 'Rusak Berat',
    shortLabel: 'Rusak Berat',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  BELUM_ADA: {
    label: 'Belum Ada / Kurang',
    shortLabel: 'Belum Ada',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    dotClass: 'bg-slate-400',
  },
};

export interface ItemSaprasTambahan {
  id: string;
  nama: string;
  jumlah: number;
  kondisi: KondisiSapras;
}

export interface KelasSaprasOverride {
  kelasKey: string;
  papanTulisKondisi: KondisiSapras;
  papanTulisJumlah: number;
  papanTulisSpesifikasi: string;
  mejaGuruKondisi: KondisiSapras;
  mejaGuruJumlah: number;
  mejaGuruSpesifikasi: string;
  penghapusKondisi: KondisiSapras;
  spidolKondisi: KondisiSapras;
  itemTambahan: ItemSaprasTambahan[];
  catatanKelas?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface KelasSaprasRow {
  kelasKey: string;
  shortBadge: string;
  kelasLabel: string;
  tingkat: string;
  din_kls: string;
  din_bag: string;
  pa_pi: 'PA' | 'PI';
  mustahiq: string;
  blokDiniyyah: string;
  lokasiDiniyyah: string;
  blokTakror: string;
  lokasiTakror: string;
  papanTulisKondisi: KondisiSapras;
  papanTulisJumlah: number;
  papanTulisSpesifikasi: string;
  mejaGuruKondisi: KondisiSapras;
  mejaGuruJumlah: number;
  mejaGuruSpesifikasi: string;
  penghapusKondisi: KondisiSapras;
  spidolKondisi: KondisiSapras;
  itemTambahan: ItemSaprasTambahan[];
  catatanKelas?: string;
  updatedAt: string;
  isFullyHealthy: boolean;
}

export type StatusTiketPerbaikan = 'DILAPORKAN' | 'PROSES' | 'SELESAI';
export type UrgensiPerbaikan = 'DARURAT' | 'SEDANG' | 'RINGAN';
export type KategoriAsetPerbaikan = 'PAPAN_TULIS' | 'MEJA_GURU' | 'LAINNYA';

export interface SaprasTiketPerbaikan {
  id: string;
  kelasKey: string;
  kelasLabel: string;
  shortBadge: string;
  tingkat: string;
  paPi: 'PA' | 'PI';
  blokKbm: string;
  itemType: 'PAPAN_TULIS' | 'MEJA_GURU' | 'LAINNYA';
  itemNama: string;
  kondisiAwal: KondisiSapras;
  deskripsiKerusakan: string;
  urgensi: UrgensiPerbaikan;
  status: StatusTiketPerbaikan;
  pelapor: string;
  biayaPerbaikan: number;
  catatanPenyelesaian?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaprasLogistikStok {
  id: string;
  kode: string;
  namaBarang: string;
  kategori: 'ATK_PAPAN' | 'KELISTRIKAN' | 'KEBERSIHAN';
  satuan: string;
  stokSaatIni: number;
  batasMinimum: number;
  updatedAt: string;
}

export interface SaprasDistribusiLog {
  id: string;
  logistikId: string;
  namaBarang: string;
  satuan: string;
  jumlah: number;
  kelasKey: string;
  kelasLabel: string;
  penerima: string;
  tanggal: string;
  catatan?: string;
}

export type SaprasSectionId =
  | 'inventaris-madin'
  | 'inventaris-kelas'
  | 'perbaikan'
  | 'logistik'
  | 'rekap';

// ==================== MASTER TEMPAT / LOKASI KANTOR ====================
export interface SaprasTempatLokasi {
  id: string; // e.g. "loc-pusat", "loc-gp", "loc-putri", "loc-blok-4", "loc-blok-11"
  nama: string; // e.g. "Kantor Madin Pusat"
  kode: string; // e.g. "KMP"
  penanggungJawab?: string;
  kontakPIC?: string;
  keterangan?: string;
  isDefault?: boolean;
  createdAt: string;
}

// ==================== INVENTARIS MADIN UNIVERSAL ====================
export type KategoriInventarisMadin =
  | 'ELEKTRONIK_IT'
  | 'MEBELER_KANTOR'
  | 'PERLENGKAPAN_RUANG'
  | 'KITAB_DOKUMEN_MASTER'
  | 'KENDARAAN'
  | 'LAINNYA';

export const KATEGORI_INVENTARIS_MADIN_META: Record<
  KategoriInventarisMadin,
  { label: string; badgeClass: string; prefixBarcode: string }
> = {
  ELEKTRONIK_IT: {
    label: 'Elektronik & IT',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    prefixBarcode: 'ELK',
  },
  MEBELER_KANTOR: {
    label: 'Mebeler & Kantor',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    prefixBarcode: 'MBL',
  },
  PERLENGKAPAN_RUANG: {
    label: 'Perlengkapan Ruangan',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    prefixBarcode: 'RNG',
  },
  KITAB_DOKUMEN_MASTER: {
    label: 'Kitab & Dokumen Master',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    prefixBarcode: 'DOC',
  },
  KENDARAAN: {
    label: 'Kendaraan & Logistik',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    prefixBarcode: 'KND',
  },
  LAINNYA: {
    label: 'Lainnya',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    prefixBarcode: 'LNY',
  },
};

export interface InventarisMutasiLog {
  id: string;
  tanggal: string; // ISO format
  dariTempatId: string;
  keTempatId: string;
  petugasPemindah: string;
  alasan: string;
}

export interface InventarisMadinItem {
  id: string;
  kodeBarcode: string; // e.g. "MBD-AST-ELK-001"
  namaBarang: string; // e.g. "Printer Epson L3210 (Cetak Ijazah)"
  kategori: KategoriInventarisMadin;
  tempatId: string; // Relasi ke SaprasTempatLokasi.id
  spesifikasi?: string;
  kondisi: KondisiSapras;
  jumlah: number;
  satuan: string; // 'Unit', 'Set', 'Pcs'
  tahunPerolehan?: number;
  sumberDana?: string; // 'Kas Madin', 'Wakaf Alumni', 'BOS'
  nilaiPerolehan?: number;
  fotoUrl?: string;
  catatan?: string;
  riwayatMutasi?: InventarisMutasiLog[];
  updatedAt: string;
  updatedBy?: string;
}
