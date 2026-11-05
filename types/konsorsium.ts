export type TingkatKonsorsium = 'ULA' | 'WUSTHO' | 'ULYA' | 'ISTI\'DAD';

export type StatusAbsenKonsorsium =
  | 'Hadir'
  | 'Izin'
  | 'Sakit'
  | 'Alfa'
  | 'Terlambat';

export interface KelasKonsorsium {
  id: string;
  tingkat: string; // 'ULA' | 'WUSTHO' | 'ULYA' | 'ISTI\'DAD'
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
