import { HariKbm, HariKbmType } from './jadwal';
import { Asatidz } from './asatidz';

export interface ParsedSlotHariKBM {
  jam: 1 | 2;
  fan: string;
  fanAsli: string;
  kelas: string;
  lokasi: string;
}

export interface GuruAktifHariKBM {
  rawRow: Asatidz;
  nia: string;
  nama: string;
  jah: string;
  tingkat: string;
  blok: string;
  lokasiDiniyyahMaster: string;
  slots: ParsedSlotHariKBM[];
}

export interface KelompokBlokHariKBM {
  namaBlok: string;
  daftarAsatidz: GuruAktifHariKBM[];
}

export interface HariKbmFilterState {
  activeHari: HariKbmType;
  viewMode: 'table' | 'card';
  searchQuery: string;
  tingkatFilter: string;
  jamFilter: string;
}
