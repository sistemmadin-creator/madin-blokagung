export type JamKbm = 1 | 2 | 3 | 4;

export type StatusAbsensi =
  | 'Hadir'
  | 'Izin'
  | 'Sakit'
  | 'Alfa'
  | 'Terlambat'
  | 'Digantikan'
  | 'Tugas Lain'
  | 'Jadwal Kosong'
  | 'Tugas'
  | 'Badal';

export type KpiKategori =
  | 'SEMUA'
  | 'Hadir'
  | 'IZIN_SAKIT'
  | 'ALFA'
  | 'TERLAMBAT_GANTI';

export interface SesiJadwalHarian {
  jamNum: JamKbm;
  jamKe: string; // "Jam 1" .. "Jam 4"
  nama: string;
  nia: string;
  gender: string;
  tingkat: string;
  dinKls: string;
  dinBag: string;
  jah: string;
  blok: string;
  kelasMengajar: string;
  fan: string;
  fanAsli: string;
  lokasi: string;
  lokasiGabungan: string;
  isBentrok?: boolean;
}

export interface StatusSesiData {
  status: StatusAbsensi | '';
  keterangan: string;
  menitTerlambat: string;
  namaPengganti: string;
  isSaved: boolean;
}

export interface RiwayatAbsensiItem {
  id: string;
  timestamp: string;
  tanggal: string;
  hari: string;
  jamKe: string;
  nama: string;
  nia: string;
  tingkat: string;
  dinKls: string;
  dinBag: string;
  blok: string;
  gender: string;
  kelasMengajar: string;
  fan: string;
  lokasi: string;
  status: StatusAbsensi;
  keterangan: string;
  menitTerlambat: string;
  namaPengganti: string;
  diinputOleh: string;
  waktuUpdate: string;
}

export type CompactSesiTuple = [
  string, // 0: id
  string, // 1: timestamp
  string, // 2: nama
  string, // 3: nia
  string, // 4: tingkat
  string, // 5: dinKls
  string, // 6: dinBag
  string, // 7: blok
  string, // 8: gender
  string, // 9: kelasMengajar
  string, // 10: fan
  string, // 11: lokasi
  string, // 12: status
  string, // 13: keterangan
  string, // 14: menitTerlambat
  string, // 15: namaPengganti
  string, // 16: diinputOleh
  string  // 17: waktuUpdate
];

export interface BucketAbsensiCompact {
  tanggal: string;
  hari: string;
  jamKe: string;
  waktuUpdate: string;
  diinputOleh: string;
  data: CompactSesiTuple[];
}

export interface RecordSesiAbsensi {
  id?: string;
  nia: string;
  nama_asatidz: string;
  kelas: string;
  fan: string;
  lokasi?: string;
  blok?: string;
  tingkat?: string;
  dinKls?: string;
  dinBag?: string;
  gender?: string;
  jam: JamKbm;
  status: StatusAbsensi;
  menit_terlambat?: number;
  asatidz_pengganti?: string;
  keterangan?: string;
  diinput_oleh?: string;
  updated_at?: string;
}

export interface HariLiburInfo {
  tanggal?: string;
  hari?: string;
  kategori: string;
  keterangan: string;
  waktuUpdate?: string;
  diinputOleh?: string;
}

export interface DayAbsensiState {
  isLibur: boolean;
  infoLibur?: HariLiburInfo;
  sesi: Record<JamKbm, RecordSesiAbsensi[]>;
  unlockedJams: Record<JamKbm, boolean>;
  savedJams: Record<JamKbm, boolean>;
}
