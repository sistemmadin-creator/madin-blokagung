export type PiagamOrientation = 'landscape' | 'portrait';
export type PiagamAlign = 'left' | 'center' | 'right';
export type PiagamTextTransform = 'none' | 'uppercase' | 'capitalize' | 'lowercase';

export interface PiagamColumnElement {
  id: string;
  title: string;
  text: string;
  x: number; // 0 - 100%
  y: number; // 0 - 100%
  size: number; // 8 - 120px
  color: string;
  fontFamily: string;
  isBold: boolean;
  align: PiagamAlign;
  textTransform: PiagamTextTransform;
  show: boolean;
  lockX: boolean;
  lockY: boolean;
  lockSize: boolean;
}

export interface PiagamTemplatePayload {
  driveLink?: string;
  customBgUrl?: string;
  orientation: PiagamOrientation;
  columns: PiagamColumnElement[];
}

export interface PiagamTemplate extends PiagamTemplatePayload {
  id?: string;
  name: string;
}

export const PIAGAM_FONT_OPTIONS = [
  { label: 'Playfair Display (Serif Elegan)', value: "'Playfair Display', serif" },
  { label: 'Cinzel (Serif Klasik Formal)', value: "'Cinzel', serif" },
  { label: 'Times New Roman (Serif Standar)', value: "'Times New Roman', serif" },
  { label: 'Merriweather (Serif Hangat)', value: "'Merriweather', serif" },
  { label: 'Amiri (Gaya Kaligrafi Naskh)', value: "'Amiri', serif" },
  { label: 'Scheherazade New (Arab Tradisional)', value: "'Scheherazade New', serif" },
  { label: 'Inter (Sans Modern Bersih)', value: "'Inter', sans-serif" },
  { label: 'Montserrat (Sans Tegas)', value: "'Montserrat', sans-serif" },
];

export interface MergeFieldItem {
  tag: string;
  desc: string;
  short: string;
}

export const MERGE_FIELDS_LIST: MergeFieldItem[] = [
  { tag: '<<NAMA>>', desc: 'Nama Santri Lengkap', short: 'Nama' },
  { tag: '<<NO_INDUK>>', desc: 'Nomor Induk', short: 'No. Induk' },
  { tag: '<<NISN>>', desc: 'NISN Santri', short: 'NISN' },
  { tag: '<<TTL>>', desc: 'Tempat, Tgl Lahir', short: 'TTL' },
  { tag: '<<GENDER>>', desc: 'Gender (Putra/Putri)', short: 'Gender' },
  { tag: '<<ALAMAT>>', desc: 'Alamat (Desa, Kec, Kab)', short: 'Alamat' },
  { tag: '<<KELAS>>', desc: 'Kelas Diniyyah', short: 'Kelas' },
  { tag: '<<KAMAR>>', desc: 'Penempatan Kamar', short: 'Kamar' },
  { tag: '<<NAMA_AYAH>>', desc: 'Nama Ayah Santri', short: 'Nama Ayah' },
  { tag: '<<NO_TELEPON>>', desc: 'Nomor Telepon/WA', short: 'No. HP' },
  { tag: '<<HAFALAN_GABUNG>>', desc: 'Seluruh Hafalan Lulus', short: 'Hafalan Semua' },
  { tag: '<<HAFALAN_TERAKHIR>>', desc: 'Hafalan Terakhir Disetor', short: 'Hafalan Terakhir' },
  { tag: '<<TANGGAL_SEKARANG>>', desc: 'Tanggal Hari Ini (Masehi)', short: 'Tgl Sekarang' },
  { tag: '<<TAHUN_AJARAN>>', desc: 'Tahun Ajaran', short: 'Thn Ajaran' },
];
