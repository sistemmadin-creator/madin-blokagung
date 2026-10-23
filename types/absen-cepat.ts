import { StatusAbsensi, JamKbm } from './absensi';

export interface AbsenCepatCardItem {
  nia: string;
  nama_asatidz: string;
  kelas: string;
  fan: string;
  blok: string;
  kamar: string;
  lokasi: string;
  jam: JamKbm;
  status: StatusAbsensi;
  menit_terlambat: number;
  asatidz_pengganti: string;
  keterangan: string;
}

export interface AbsenCepatState {
  jamAktif: JamKbm;
  selectedKeys: string[];
  search: string;
  filterBlok: string;
  sortBy: 'kelas_asc' | 'kelas_desc' | 'nama_asc';
  modalStatus: StatusAbsensi;
}
