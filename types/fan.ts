export interface FanItem {
  id: string;
  nama: string;
  kitab: string;
  tingkat: string;
  jamMS: number; // Jam Mengajar Standar
  jamMB: number; // Jam Mengajar Bebas
  alokasiJam?: number;
  din_kls?: string;
  din_bag?: string;
  grupAsal?: string;
  asatidzList?: string[];
}

export interface FanConfig {
  items: FanItem[];
  grupAsalList: string[];
}
