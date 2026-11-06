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
  | 'inventaris-kelas'
  | 'perbaikan'
  | 'logistik'
  | 'rekap';
