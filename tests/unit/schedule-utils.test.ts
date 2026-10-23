import { describe, it, expect } from 'vitest';
import { JadwalAsatidzRow } from '@/types/jadwal';

describe('Jadwal Conflict Detection Logic', () => {
  function checkScheduleConflicts(jadwalList: JadwalAsatidzRow[]) {
    const teacherSlots = new Map<string, string[]>(); // key: `${teacher}_${day}_${jam}`, val: [kelas]
    const classSlots = new Map<string, string[]>();   // key: `${kelas}_${day}_${jam}`, val: [teacher]

    const conflicts: string[] = [];
    const days: (keyof JadwalAsatidzRow)[] = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'];

    jadwalList.forEach((row) => {
      const teacher = row.nama_asatidz;

      days.forEach((day) => {
        const cell = row[day];
        if (!cell || typeof cell !== 'string') return;

        const entries = cell.split(';;').map((s) => s.trim()).filter(Boolean);
        entries.forEach((entry) => {
          const parts = entry.split('|').map((s) => s.trim());
          const jamStr = parts[0] || '';
          const kelas = parts[1] || '';

          const teacherKey = `${teacher}_${day}_${jamStr}`;
          if (!teacherSlots.has(teacherKey)) {
            teacherSlots.set(teacherKey, [kelas]);
          } else {
            teacherSlots.get(teacherKey)!.push(kelas);
            conflicts.push(`Guru ${teacher} bentrok di hari ${day} ${jamStr}`);
          }

          const classKey = `${kelas}_${day}_${jamStr}`;
          if (!classSlots.has(classKey)) {
            classSlots.set(classKey, [teacher]);
          } else {
            classSlots.get(classKey)!.push(teacher);
            conflicts.push(`Kelas ${kelas} memiliki 2 guru di hari ${day} ${jamStr}`);
          }
        });
      });
    });

    return conflicts;
  }

  it('should detect no conflict in clean schedule', () => {
    const sampleRows: JadwalAsatidzRow[] = [
      {
        nama_asatidz: 'USTADZ AHMAD',
        sabtu: 'Jam 1 | 1A | Jurumiyyah',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
      {
        nama_asatidz: 'USTADZ MAHMUD',
        sabtu: 'Jam 1 | 1B | Shorof',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
    ];

    const conflicts = checkScheduleConflicts(sampleRows);
    expect(conflicts).toHaveLength(0);
  });

  it('should detect teacher double-booking conflict', () => {
    const sampleRows: JadwalAsatidzRow[] = [
      {
        nama_asatidz: 'USTADZ AHMAD',
        sabtu: 'Jam 1 | 1A | Jurumiyyah ;; Jam 1 | 1B | Nahwu',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
    ];

    const conflicts = checkScheduleConflicts(sampleRows);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain('Guru USTADZ AHMAD bentrok');
  });

  it('should detect class double-teacher conflict', () => {
    const sampleRows: JadwalAsatidzRow[] = [
      {
        nama_asatidz: 'USTADZ AHMAD',
        sabtu: 'Jam 1 | 1A | Jurumiyyah',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
      {
        nama_asatidz: 'USTADZ ZAID',
        sabtu: 'Jam 1 | 1A | Fiqih',
        ahad: '',
        senin: '',
        selasa: '',
        rabu: '',
        kamis: '',
      },
    ];

    const conflicts = checkScheduleConflicts(sampleRows);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]).toContain('Kelas 1A memiliki 2 guru');
  });
});
