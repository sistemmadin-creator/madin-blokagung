/* eslint-disable @typescript-eslint/no-explicit-any */

export const LIST_HARI = ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis'] as const;
export type HariKbm = (typeof LIST_HARI)[number];
export type HariKbmType = HariKbm;

/**
 * Representasi satu slot sesi mengajar di memori/tabel matriks
 */
export interface SesiSlot {
  kg: string;
  fan: string;
  fanAsli?: string;
  guru: string;
  jah?: string;
  lokasiGabungan?: string;
}

/**
 * Satu baris kelas pada matriks Jadwal KBM Per Kelas
 */
export interface KelasKbmItem {
  key: string;
  tingkat: string;
  kls: string;
  bag: string;
  papi: string;
  mustahiqNama: string;
  mustahiqKG: string;
  mustahiqJah: string;
  lokal: string;
  jadwal: Record<string, Record<1 | 2, SesiSlot[]>>;
}

/**
 * Record jadwal per guru yang disimpan di Supabase `app_settings` (key: `JADWAL_MENGAJAR_ASATIDZ`)
 */
export interface TeacherJadwalRow {
  nama_asatidz: string;
  mengajar?: string; // Daftar kelas unik yang diajar, dipisahkan koma: "1 A ULA (PA), 2 B WUSTHO (PI)"
  sabtu?: string;    // String slot per baris / ';;' : "Jam 1 | Fiqih | 1 A ULA (PA) (Asrama Al-Barokah)"
  ahad?: string;
  senin?: string;
  selasa?: string;
  rabu?: string;
  kamis?: string;
  totalJam?: string | number;
}

/**
 * Hasil pemecahan string slot: "Jam 1 | Fiqih | 1 A ULA (PA) (Asrama Al-Barokah)"
 */
export interface ParsedSlotJadwal {
  raw: string;
  jam: number;
  fan: string;
  lokasi: string;
}

/**
 * State clipboard untuk Mode Pindah (Cut & Paste antar sel)
 */
export interface ClipboardKGState {
  kelasKey: string;
  classObj: KelasKbmItem;
  hari: string;
  jam: number;
  guru: string;
  kg: string;
  fan: string;
}

/**
 * State untuk Context Menu klik kanan sel KG
 */
export interface ContextKGState {
  kelasKey: string;
  classObj: KelasKbmItem;
  hari: string;
  jam: number;
  guru: string;
  kg: string;
  fan: string;
}
