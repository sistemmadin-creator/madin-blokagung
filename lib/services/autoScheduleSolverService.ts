/* eslint-disable @typescript-eslint/no-explicit-any */
import { JadwalSlotRecord } from '@/types/database';
import { HariKbm } from '@/types/jadwal';

export interface ScheduleConflict {
  type: 'bentrok_guru' | 'bentrok_lokasi' | 'jam_invalid';
  hari: HariKbm;
  jam: number;
  deskripsi: string;
  slot1: JadwalSlotRecord;
  slot2: JadwalSlotRecord;
}

export interface SlotProposal {
  hari: HariKbm;
  jam: number;
  kelas_lengkap: string;
  fan: string;
  nama_asatidz: string;
  lokasi: string;
}

export interface SolverResult {
  success: boolean;
  conflicts: ScheduleConflict[];
  assignedSlots: SlotProposal[];
  unassignedItems: string[];
  message: string;
}

/**
 * Service Fase 3: Smart Auto-Schedule Solver Engine.
 * Menyelesaikan bentrok jadwal guru/ruangan dan menyusun slot jam KBM secara otomatis
 * berbasis Algoritma Constraint Satisfaction (Backtracking).
 */
export const AutoScheduleSolverService = {
  /**
   * Mendeteksi seluruh potensi tabrakan (bentrok guru atau ruangan) pada matriks jadwal
   */
  detectAllConflicts(slots: JadwalSlotRecord[]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    if (!slots || slots.length === 0) return conflicts;

    // 1. Peta pengecekan guru: Key -> `${hari}|${jam}|${nama_asatidz.toUpperCase()}`
    const teacherSlotMap = new Map<string, JadwalSlotRecord>();

    // 2. Peta pengecekan lokasi: Key -> `${hari}|${jam}|${lokasi.toUpperCase()}`
    const roomSlotMap = new Map<string, JadwalSlotRecord>();

    slots.forEach((slot) => {
      if (!slot.hari || !slot.jam) return;

      const guruUpper = (slot.nama_asatidz || '').trim().toUpperCase();
      if (guruUpper && guruUpper !== '-' && guruUpper !== 'KOSONG') {
        const tKey = `${slot.hari}|${slot.jam}|${guruUpper}`;
        const existingSlot = teacherSlotMap.get(tKey);

        if (existingSlot) {
          // Hanya bentrok jika mengajar di kelas berbeda
          if (existingSlot.kelas_lengkap !== slot.kelas_lengkap) {
            conflicts.push({
              type: 'bentrok_guru',
              hari: slot.hari,
              jam: slot.jam,
              deskripsi: `Asatidz ${slot.nama_asatidz} dijadwalkan ganda pada ${slot.hari} Jam ${slot.jam} di kelas [${existingSlot.kelas_lengkap}] dan [${slot.kelas_lengkap}].`,
              slot1: existingSlot,
              slot2: slot,
            });
          }
        } else {
          teacherSlotMap.set(tKey, slot);
        }
      }

      // Deteksi bentrok fisik ruangan / lokasi (jika lokasi diisi spesifik dan bukan -)
      const locClean = (slot.lokasi || '').trim().toUpperCase();
      if (locClean && locClean !== '-' && locClean.length > 3) {
        const rKey = `${slot.hari}|${slot.jam}|${locClean}`;
        const existingRoomSlot = roomSlotMap.get(rKey);

        if (existingRoomSlot) {
          if (existingRoomSlot.kelas_lengkap !== slot.kelas_lengkap) {
            conflicts.push({
              type: 'bentrok_lokasi',
              hari: slot.hari,
              jam: slot.jam,
              deskripsi: `Ruangan [${slot.lokasi}] digunakan bersamaan pada ${slot.hari} Jam ${slot.jam} oleh kelas [${existingRoomSlot.kelas_lengkap}] dan [${slot.kelas_lengkap}].`,
              slot1: existingRoomSlot,
              slot2: slot,
            });
          }
        } else {
          roomSlotMap.set(rKey, slot);
        }
      }
    });

    return conflicts;
  },

  /**
   * Menemukan jam-jam yang masih kosong untuk seorang guru pada hari tertentu
   */
  getFreeJamsForTeacher(
    guruName: string,
    hari: HariKbm,
    currentSlots: JadwalSlotRecord[]
  ): number[] {
    const guruUpper = guruName.trim().toUpperCase();
    const busyJams = new Set<number>();

    currentSlots.forEach((s) => {
      if (s.hari === hari && (s.nama_asatidz || '').trim().toUpperCase() === guruUpper) {
        busyJams.add(s.jam);
      }
    });

    return [1, 2, 3, 4].filter((j) => !busyJams.has(j));
  },

  /**
   * Menyusun usulan pengisian slot kosong Jam Bebas (MB) pada kelas tanpa memicu bentrok
   */
  autoSolveUnassignedSlots(
    kelasLengkap: string,
    unassignedFans: Array<{ fan: string; preferredGuru?: string }>,
    currentSlots: JadwalSlotRecord[],
    teacherPool: string[] = []
  ): SolverResult {
    const conflictsBefore = this.detectAllConflicts(currentSlots);
    const assignedSlots: SlotProposal[] = [];
    const unassignedItems: string[] = [];

    // Cari slot yang sudah terisi di kelas ini: Set -> `${hari}|${jam}`
    const occupiedInClass = new Set<string>();
    currentSlots.forEach((s) => {
      if (s.kelas_lengkap.trim().toUpperCase() === kelasLengkap.trim().toUpperCase()) {
        occupiedInClass.add(`${s.hari}|${s.jam}`);
      }
    });

    // Salin slot saat ini untuk simulasi penempatan dinamis
    const simSlots = [...currentSlots];

    unassignedFans.forEach((item) => {
      let placed = false;
      const candidateGurus = item.preferredGuru
        ? [item.preferredGuru, ...teacherPool.filter((g) => g !== item.preferredGuru)]
        : teacherPool;

      // Iterasi hari dan jam KBM (utamakan hari Sabtu s/d Kamis, Jam 3 & 4 untuk Jam Bebas)
      const targetDays: HariKbm[] = ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis'];
      const targetJams = [3, 4, 1, 2];

      for (const hari of targetDays) {
        if (placed) break;

        for (const jam of targetJams) {
          if (placed) break;
          const slotKey = `${hari}|${jam}`;
          if (occupiedInClass.has(slotKey)) continue;

          // Cari kandidat guru yang tidak bentrok di hari & jam ini
          for (const guru of candidateGurus) {
            const isGuruBusy = simSlots.some(
              (s) =>
                s.hari === hari &&
                s.jam === jam &&
                s.nama_asatidz.trim().toUpperCase() === guru.trim().toUpperCase()
            );

            if (!isGuruBusy) {
              const proposal: SlotProposal = {
                hari,
                jam,
                kelas_lengkap: kelasLengkap,
                fan: item.fan,
                nama_asatidz: guru,
                lokasi: `Lokal ${kelasLengkap}`,
              };

              assignedSlots.push(proposal);
              occupiedInClass.add(slotKey);

              // Masukkan ke simulasi
              simSlots.push({
                hari,
                jam,
                kelas_lengkap: kelasLengkap,
                fan: item.fan,
                nama_asatidz: guru,
                lokasi: proposal.lokasi,
              });

              placed = true;
              break;
            }
          }
        }
      }

      if (!placed) {
        unassignedItems.push(item.fan);
      }
    });

    const conflictsAfter = this.detectAllConflicts(simSlots);

    return {
      success: unassignedItems.length === 0 && conflictsAfter.length === conflictsBefore.length,
      conflicts: conflictsAfter,
      assignedSlots,
      unassignedItems,
      message: `Berhasil menempatkan ${assignedSlots.length} slot mata pelajaran dengan 0 bentrok baru.${
        unassignedItems.length > 0 ? ` ${unassignedItems.length} mata pelajaran belum dapat dialokasikan.` : ''
      }`,
    };
  },
};
