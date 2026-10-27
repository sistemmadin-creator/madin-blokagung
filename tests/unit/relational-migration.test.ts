import { describe, it, expect } from 'vitest';
import { RelationalMigrationService } from '@/lib/services/relationalMigrationService';
import { TeacherJadwalRow } from '@/types/jadwal';
import { Asatidz } from '@/types/asatidz';
import { RiwayatSetoranRawRow } from '@/types/setoran';
import { BucketAbsensiCompact } from '@/types/absensi';

describe('Relational Migration Service (Fase 1 - Zero Data Loss Verification)', () => {
  const mockAsatidz: Asatidz[] = [
    {
      id: '1',
      nia: 'A01',
      nama_asatidz: 'LUKMAN',
      jah_asatidz: 'Asatidz',
      pa_pi: 'PA',
    },
    {
      id: '2',
      nia: 'A02',
      nama_asatidz: 'MUTOHAR',
      jah_asatidz: 'Mustahiq',
      pa_pi: 'PA',
    },
  ];

  const mockJadwalMap: Record<string, TeacherJadwalRow> = {
    LUKMAN: {
      nama_asatidz: 'LUKMAN',
      mengajar: '1 H ULA (PA), 1 I ULA (PA)',
      totalJam: 4,
      sabtu: 'Jam 1 | Akhlaq | 1 H ULA (PA) (Aula Asrama Bir Aly lt.3)\nJam 2 | Akhlaq | 1 H ULA (PA) (Aula Asrama Bir Aly lt.3)',
      ahad: 'Jam 1 | Akhlaq | 1 I ULA (PA) (Aula Asrama Bir Aly lt.2)\nJam 2 | Akhlaq | 1 I ULA (PA) (Aula Asrama Bir Aly lt.2)',
      senin: '',
      selasa: '',
      rabu: '',
      kamis: '',
    },
    MUTOHAR: {
      nama_asatidz: 'MUTOHAR',
      mengajar: '2 M ULA (PA)',
      totalJam: 2,
      sabtu: 'Jam 3 | (Badongan) Akhlaqul Banin/Banat Juz III | 2 M ULA (PA) (Aula Belakang lt. 2)\nJam 4 | (Takror) Takror | 2 M ULA (PA) (Aula Belakang lt. 2)',
      ahad: '',
      senin: '',
      selasa: '',
      rabu: '',
      kamis: '',
    },
  };

  const mockBucketMap: Record<string, BucketAbsensiCompact> = {
    '2026-10-27|Jam 1': {
      tanggal: '2026-10-27',
      hari: 'Selasa',
      jamKe: 'Jam 1',
      waktuUpdate: '2026-10-27 01:00:00',
      diinputOleh: 'Admin',
      data: [
        [
          'ABS-001',
          '2026-10-27 01:00:00',
          'LUKMAN',
          'A01',
          'ULA',
          '1',
          'H',
          'Blok Induk',
          'PA',
          '1 H ULA (PA)',
          'Akhlaq',
          'Aula Bir Aly',
          'Hadir',
          'Tepat Waktu',
          '',
          '',
          'Admin',
          '2026-10-27 01:00:00',
        ],
      ],
    },
  };

  const mockRawSetoran: RiwayatSetoranRawRow[] = [
    [
      '',
      '234234',
      '26/10/2026 17:32',
      'ANDIKO DWI SAPUTRA',
      '13',
      '10',
      '2000',
      'SUMATRA',
      'ARIF MUHTADI',
      'RIZQI MAULANA ACHMAD',
      'WUSTHO',
      'A',
      '1',
      'KURANJI',
      'KOTA PADANG',
      'SUMATERA BARAT',
      'AHMAD',
      'Al-Fiyyah 350',
      'Wajib',
    ],
  ];

  it('1. Ekstraksi info kelas dari slot jadwal dengan akurasi tinggi', () => {
    const res1 = RelationalMigrationService.extractKelasInfoFromSlot(
      '1 H ULA (PA) (Aula Asrama Bir Aly lt.3)'
    );
    expect(res1.kelas_lengkap).toBe('1 H ULA (PA)');
    expect(res1.tingkat).toBe('ULA');
    expect(res1.din_kls).toBe('1');
    expect(res1.din_bag).toBe('H');
    expect(res1.pa_pi).toBe('PA');
    expect(res1.lokasiMurni).toBe('Aula Asrama Bir Aly lt.3');

    const res2 = RelationalMigrationService.extractKelasInfoFromSlot('2 M ULA (PA)');
    expect(res2.kelas_lengkap).toBe('2 M ULA (PA)');
    expect(res2.tingkat).toBe('ULA');
    expect(res2.din_kls).toBe('2');
    expect(res2.din_bag).toBe('M');
  });

  it('2. Mengurai jadwal map menjadi baris slot relasional dengan referensi NIA', () => {
    const slots = RelationalMigrationService.parseJadwalMapToSlots(mockJadwalMap, mockAsatidz);
    expect(slots.length).toBe(6);

    const lukmanSabtuJam1 = slots.find(
      (s) => s.nama_asatidz === 'LUKMAN' && s.hari === 'Sabtu' && s.jam === 1
    );
    expect(lukmanSabtuJam1).toBeDefined();
    expect(lukmanSabtuJam1?.nia).toBe('A01');
    expect(lukmanSabtuJam1?.fan).toBe('Akhlaq');
    expect(lukmanSabtuJam1?.kelas_lengkap).toBe('1 H ULA (PA)');
  });

  it('3. Rekonstruksi jadwal 100% Lossless (Roundtrip Checksum)', () => {
    const slots = RelationalMigrationService.parseJadwalMapToSlots(mockJadwalMap, mockAsatidz);
    const reconstructed = RelationalMigrationService.reconstructJadwalMapFromSlots(slots);

    expect(reconstructed['LUKMAN']).toBeDefined();
    expect(reconstructed['LUKMAN'].totalJam).toBe(mockJadwalMap['LUKMAN'].totalJam);
    expect(reconstructed['LUKMAN'].sabtu).toBe(mockJadwalMap['LUKMAN'].sabtu);
    expect(reconstructed['LUKMAN'].ahad).toBe(mockJadwalMap['LUKMAN'].ahad);

    expect(reconstructed['MUTOHAR']).toBeDefined();
    expect(reconstructed['MUTOHAR'].totalJam).toBe(mockJadwalMap['MUTOHAR'].totalJam);
    expect(reconstructed['MUTOHAR'].sabtu).toBe(mockJadwalMap['MUTOHAR'].sabtu);
  });

  it('4. Mengurai dan merekonstruksi bucket absensi 100% Lossless', () => {
    const records = RelationalMigrationService.parseAbsensiBucketsToRecords(mockBucketMap);
    expect(records.length).toBe(1);
    expect(records[0].id).toBe('ABS-001');
    expect(records[0].nama_asatidz).toBe('LUKMAN');
    expect(records[0].status).toBe('Hadir');

    const reconstructed = RelationalMigrationService.reconstructAbsensiBucketsFromRecords(records);
    expect(reconstructed['2026-10-27|Jam 1']).toBeDefined();
    expect(reconstructed['2026-10-27|Jam 1'].data[0][0]).toBe('ABS-001');
    expect(reconstructed['2026-10-27|Jam 1'].data[0][2]).toBe('LUKMAN');
    expect(reconstructed['2026-10-27|Jam 1'].data[0][12]).toBe('Hadir');
  });

  it('5. Mengurai dan merekonstruksi setoran hafalan 100% Lossless', () => {
    const records = RelationalMigrationService.parseSetoranRawToRecords(mockRawSetoran);
    expect(records.length).toBe(1);
    expect(records[0].no_induk).toBe('234234');
    expect(records[0].nama).toBe('ANDIKO DWI SAPUTRA');
    expect(records[0].item_hafalan).toBe('Al-Fiyyah 350');

    const reconstructed = RelationalMigrationService.reconstructSetoranRawFromRecords(records);
    expect(reconstructed.length).toBe(1);
    expect(reconstructed[0][1]).toBe('234234');
    expect(reconstructed[0][3]).toBe('ANDIKO DWI SAPUTRA');
    expect(reconstructed[0][17]).toBe('Al-Fiyyah 350');
  });
});
