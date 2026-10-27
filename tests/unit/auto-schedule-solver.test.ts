import { describe, it, expect } from 'vitest';
import { AutoScheduleSolverService } from '@/lib/services/autoScheduleSolverService';
import { JadwalSlotRecord } from '@/types/database';

describe('AutoScheduleSolverService (Fase 3: Smart Auto-Schedule Engine)', () => {
  const mockExistingSlots: JadwalSlotRecord[] = [
    {
      hari: 'Sabtu',
      jam: 1,
      nama_asatidz: 'USTADZ AHMAD',
      kelas_lengkap: '1 A ULA (PA)',
      fan: 'Fiqih',
      lokasi: 'Lokal 1A Gedung Timur',
    },
    {
      hari: 'Sabtu',
      jam: 2,
      nama_asatidz: 'USTADZ AHMAD',
      kelas_lengkap: '1 A ULA (PA)',
      fan: 'Fiqih',
      lokasi: 'Lokal 1A Gedung Timur',
    },
    {
      hari: 'Sabtu',
      jam: 1,
      nama_asatidz: 'USTADZ ZAID',
      kelas_lengkap: '1 B ULA (PA)',
      fan: 'Nahwu',
      lokasi: 'Lokal 1B Gedung Barat',
    },
  ];

  it('1. Mendeteksi jadwal normal tanpa bentrok', () => {
    const conflicts = AutoScheduleSolverService.detectAllConflicts(mockExistingSlots);
    expect(conflicts.length).toBe(0);
  });

  it('2. Mendeteksi bentrok jadwal guru (guru dijadwalkan ganda pada jam & hari yang sama)', () => {
    const clashSlots: JadwalSlotRecord[] = [
      ...mockExistingSlots,
      {
        hari: 'Sabtu',
        jam: 1,
        nama_asatidz: 'USTADZ AHMAD', // Bentrok dengan 1 A ULA (PA)
        kelas_lengkap: '2 A WUSTHO (PI)',
        fan: 'Ushul Fiqih',
        lokasi: 'Lokal 2A Putri',
      },
    ];

    const conflicts = AutoScheduleSolverService.detectAllConflicts(clashSlots);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('bentrok_guru');
    expect(conflicts[0].hari).toBe('Sabtu');
    expect(conflicts[0].jam).toBe(1);
    expect(conflicts[0].deskripsi).toContain('USTADZ AHMAD');
  });

  it('3. Mendeteksi bentrok fisik ruangan / lokal KBM', () => {
    const clashRoomSlots: JadwalSlotRecord[] = [
      ...mockExistingSlots,
      {
        hari: 'Sabtu',
        jam: 1,
        nama_asatidz: 'USTADZ HASAN',
        kelas_lengkap: '3 B ULA (PA)',
        fan: 'Tauhid',
        lokasi: 'Lokal 1A Gedung Timur', // Bentrok ruangan dengan 1 A ULA (PA)
      },
    ];

    const conflicts = AutoScheduleSolverService.detectAllConflicts(clashRoomSlots);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('bentrok_lokasi');
    expect(conflicts[0].deskripsi).toContain('Lokal 1A Gedung Timur');
  });

  it('4. Mengambil jam luang seorang guru pada hari tertentu', () => {
    const freeJams = AutoScheduleSolverService.getFreeJamsForTeacher(
      'USTADZ AHMAD',
      'Sabtu',
      mockExistingSlots
    );
    // Jam 1 dan 2 sibuk, jam 3 dan 4 harus luang
    expect(freeJams).toEqual([3, 4]);
  });

  it('5. Menyelesaikan alokasi jam bebas (MB) tanpa bentrok baru', () => {
    const unassigned = [
      { fan: 'Akhlaq', preferredGuru: 'USTADZ ZAID' },
      { fan: 'Tarikh', preferredGuru: 'USTADZ ALI' },
    ];

    const result = AutoScheduleSolverService.autoSolveUnassignedSlots(
      '1 A ULA (PA)',
      unassigned,
      mockExistingSlots,
      ['USTADZ ZAID', 'USTADZ ALI', 'USTADZ UMAR']
    );

    expect(result.assignedSlots.length).toBe(2);
    expect(result.conflicts.length).toBe(0);
    expect(result.unassignedItems.length).toBe(0);
  });
});
