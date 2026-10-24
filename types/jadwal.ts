export type HariKbmType = 'Sabtu' | 'Ahad' | 'Senin' | 'Selasa' | 'Rabu' | 'Kamis';

export interface JadwalSlot {
  hari: HariKbmType;
  jam: 1 | 2 | 3 | 4;
  kelas: string;
  tingkat: string;
  fan: string;
  nia_asatidz: string;
  nama_asatidz: string;
}

export type JadwalKbmMap = Record<string, JadwalSlot>;

export interface JadwalAsatidzRow {
  nama_asatidz: string;
  sabtu?: string;
  ahad?: string;
  senin?: string;
  selasa?: string;
  rabu?: string;
  kamis?: string;
  [key: string]: any;
}
