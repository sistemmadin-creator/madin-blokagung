export type JamKbm = 1 | 2 | 3 | 4;
export type StatusAbsensi = 'Hadir' | 'Izin' | 'Sakit' | 'Alfa' | 'Tugas' | 'Badal';

export interface RecordSesiAbsensi {
  nia: string;
  nama_asatidz: string;
  kelas: string;
  fan: string;
  jam: JamKbm;
  status: StatusAbsensi;
  menit_terlambat?: number;
  asatidz_pengganti?: string;
  keterangan?: string;
  updated_at?: string;
}

export interface HariLiburInfo {
  kategori: string;
  keterangan: string;
}

export interface DayAbsensiState {
  isLibur: boolean;
  infoLibur?: HariLiburInfo;
  sesi: Record<JamKbm, RecordSesiAbsensi[]>;
  unlockedJams: Record<JamKbm, boolean>;
  savedJams: Record<JamKbm, boolean>;
}
