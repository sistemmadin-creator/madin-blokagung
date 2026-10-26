import { StatusAbsensi, JamKbm, SesiJadwalHarian } from './absensi';

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
  sortBy: 'kelas_asc' | 'blok_asc' | 'nama_asc';
  modalStatus: StatusAbsensi;
  detailSesi: SesiJadwalHarian | null;
}

export interface UserAkunMadin {
  username: string;
  nama: string;
  role: string;
  aktif?: boolean;
}
