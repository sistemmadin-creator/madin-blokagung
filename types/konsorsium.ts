export type TingkatKonsorsium = 'ULA' | 'WUSTHO' | 'ULYA' | 'ISTI\'DAD';

export type JenisKonsorsium = 'Mustahiq/qoh' | 'Munawib/bah';

export type StatusAbsenKonsorsium =
  | 'Hadir'
  | 'Izin'
  | 'Sakit'
  | 'Alfa'
  | 'Terlambat';

export interface KelasKonsorsium {
  id: string;
  tingkat: string; // 'ULA' | 'WUSTHO' | 'ULYA' | 'ISTI\'DAD'
  jenisKonsor: JenisKonsorsium; // 'Mustahiq/qoh' (Kamis) | 'Munawib/bah' (Selasa)
  namaKelas: string; // Diambil dari Fan Pelajaran / Ketik Bebas
  kitabRujukan?: string;
  pembimbingNama: string;
  pembimbingNia?: string;
  keterangan?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AnggotaKonsorsium {
  id: string;
  kelasId: string;
  asatidzId?: string;
  nia: string;
  nama: string;
  gender?: string;
  peran?: 'Koordinator' | 'Anggota';
  tanggalBergabung?: string;
  createdAt: string;
}

export interface DetailPresensiKonsorsium {
  id: string;
  anggotaId: string;
  nia: string;
  nama: string;
  status: StatusAbsenKonsorsium;
  keterangan?: string;
  waktuInput?: string;
}

export interface SesiPresensiKonsorsium {
  id: string;
  kelasId: string;
  tanggal: string; // YYYY-MM-DD
  hari?: string;
  tahun?: number;
  bulan?: number; // 1 - 12
  pertemuanKe?: number; // 1, 2, 3, 4, 5
  topikBahasan?: string;
  notulen?: string;
  diinputOleh?: string;
  createdAt: string;
  records: DetailPresensiKonsorsium[];
}

export interface KonsorsiumDataPayload {
  kelasList: KelasKonsorsium[];
  anggotaList: AnggotaKonsorsium[];
  sesiList: SesiPresensiKonsorsium[];
}

export interface PertemuanInfo {
  ke: number; // 1, 2, 3, 4, 5
  tanggal: string; // YYYY-MM-DD
  labelTanggal: string; // DD/MM (contoh: 05/11)
  hariNama: string; // "Kamis" atau "Selasa"
  fullFormatted: string; // "Kamis, 05 Nov 2026"
}
