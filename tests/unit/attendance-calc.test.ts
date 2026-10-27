import { describe, it, expect } from 'vitest';
import { JamKbm, RecordSesiAbsensi } from '@/types/absensi';
import { getLabelWaktuJamKBM, getDefaultTanggalAbsensi } from '@/lib/utils/absensiHelper';

describe('Attendance Calculation & Gating Logic', () => {
  function computeGatingState(existingSessions: Record<number, RecordSesiAbsensi[]>) {
    const saved: Record<JamKbm, boolean> = { 1: false, 2: false, 3: false, 4: false };
    const unlocked: Record<JamKbm, boolean> = { 1: true, 2: false, 3: false, 4: false };

    [1, 2, 3, 4].forEach((j) => {
      const records = existingSessions[j] || [];
      if (records.length > 0) {
        saved[j as JamKbm] = true;
      }
    });

    if (saved[1]) unlocked[2] = true;
    if (saved[2]) unlocked[3] = true;
    if (saved[3]) unlocked[4] = true;

    return { saved, unlocked };
  }

  function computePredikat(persen: number): string {
    if (persen >= 90) return 'Sangat Baik';
    if (persen >= 80) return 'Baik';
    if (persen >= 70) return 'Cukup';
    return 'Kurang';
  }

  it('initially unlocks only Jam 1', () => {
    const { saved, unlocked } = computeGatingState({});
    expect(saved[1]).toBe(false);
    expect(unlocked[1]).toBe(true);
    expect(unlocked[2]).toBe(false);
    expect(unlocked[3]).toBe(false);
    expect(unlocked[4]).toBe(false);
  });

  it('unlocks Jam 2 when Jam 1 is saved', () => {
    const { saved, unlocked } = computeGatingState({
      1: [{ nia: '101', nama_asatidz: 'Ustadz A', kelas: '1A', fan: 'Nahwu', jam: 1, status: 'Hadir' }],
    });
    expect(saved[1]).toBe(true);
    expect(unlocked[1]).toBe(true);
    expect(unlocked[2]).toBe(true);
    expect(unlocked[3]).toBe(false);
  });

  it('correctly assigns Pesantren time labels to Jam 1..3 and Jam 4', () => {
    expect(getLabelWaktuJamKBM(1).label).toBe('(Malam Sebelumnya)');
    expect(getLabelWaktuJamKBM(2).label).toBe('(Malam Sebelumnya)');
    expect(getLabelWaktuJamKBM(3).label).toBe('(Malam Sebelumnya)');
    expect(getLabelWaktuJamKBM(4).label).toBe('(Siang Hari)');
  });

  it('produces valid YYYY-MM-DD format for getDefaultTanggalAbsensi', () => {
    const tgl = getDefaultTanggalAbsensi();
    expect(tgl).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
