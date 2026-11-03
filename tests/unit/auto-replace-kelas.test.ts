import { describe, it, expect } from 'vitest';
import { terapkanAutoReplaceKelasJam12 } from '@/lib/utils/jadwalHelper';
import type { TeacherJadwalRow } from '@/types/jadwal';

const row = (nama: string, patch: Partial<TeacherJadwalRow> = {}): TeacherJadwalRow =>
  ({
    nama_asatidz: nama,
    mengajar: '',
    totalJam: 0,
    sabtu: '',
    ahad: '',
    senin: '',
    selasa: '',
    rabu: '',
    kamis: '',
    ...patch,
  }) as TeacherJadwalRow;

describe('terapkanAutoReplaceKelasJam12', () => {
  it('menggeser guru lama saat guru baru ditempatkan di kelas, hari, dan jam yang sama', () => {
    const sebelum = {
      'GURU LAMA': row('Guru Lama', {
        senin: 'Jam 1 | Fiqih | 2 A ULA (PA) (Ruang 1)\nJam 2 | Fiqih | 2 A ULA (PA) (Ruang 1)',
      }),
      'GURU BARU': row('Guru Baru'),
    };
    const baru = {
      'GURU BARU': row('Guru Baru', { senin: 'Jam 1 | Nahwu | 2 A ULA (PA) (Ruang 1)' }),
    };

    const hasil = terapkanAutoReplaceKelasJam12(sebelum, baru);

    expect(hasil.guruTergeser).toEqual(['GURU LAMA']);
    expect(hasil.rowsTergeser['GURU LAMA'].senin).toBe('Jam 2 | Fiqih | 2 A ULA (PA) (Ruang 1)');
    expect(hasil.klaimBaru).toHaveLength(1);
  });

  it('tidak menyentuh guru yang mengajar di kelas lain pada jam yang sama', () => {
    const sebelum = {
      'GURU A': row('Guru A', { senin: 'Jam 1 | Fiqih | 2 B ULA (PA) (Ruang 2)' }),
    };
    const baru = {
      'GURU B': row('Guru B', { senin: 'Jam 1 | Nahwu | 2 A ULA (PA) (Ruang 1)' }),
    };

    const hasil = terapkanAutoReplaceKelasJam12(sebelum, baru);
    expect(hasil.guruTergeser).toEqual([]);
  });

  it('tidak mencampur kelas putra (PA) dan putri (PI)', () => {
    const sebelum = {
      'GURU A': row('Guru A', { senin: 'Jam 1 | Fiqih | 2 A ULA (PI) (Ruang 2)' }),
    };
    const baru = {
      'GURU B': row('Guru B', { senin: 'Jam 1 | Nahwu | 2 A ULA (PA) (Ruang 1)' }),
    };

    expect(terapkanAutoReplaceKelasJam12(sebelum, baru).guruTergeser).toEqual([]);
  });

  it('membiarkan satu guru yang terjadwal di dua kelas sekaligus', () => {
    const sebelum = {};
    const baru = {
      'GURU A': row('Guru A', {
        senin: 'Jam 1 | Hadits | 2 A WUSTHO (PI) (R1)\nJam 1 | Hadits | 2 B WUSTHO (PI) (R2)',
      }),
    };

    const hasil = terapkanAutoReplaceKelasJam12(sebelum, baru);
    expect(hasil.guruTergeser).toEqual([]);
    expect(hasil.klaimBaru).toHaveLength(2);
  });

  it('hanya menjadikan slot baru sebagai klaim, bukan slot lama yang tidak diubah', () => {
    const slotLama = 'Jam 1 | Tauhid | 3 K ULA (PA) (R9)';
    const sebelum = {
      'GURU A': row('Guru A', { selasa: slotLama }),
      'GURU B': row('Guru B', { selasa: slotLama }),
    };
    const baru = {
      'GURU A': row('Guru A', { selasa: slotLama, rabu: 'Jam 3 | Takror | 3 K ULA (PA) (R9)' }),
    };

    const hasil = terapkanAutoReplaceKelasJam12(sebelum, baru);
    expect(hasil.klaimBaru).toHaveLength(0);
    expect(hasil.guruTergeser).toEqual([]);
  });

  it('tidak menggeser guru pada Jam 3 dan Jam 4 (Sorogan/Takror)', () => {
    const sebelum = {
      'GURU A': row('Guru A', { senin: 'Jam 3 | Sorogan | 1 A WUSTHO (PI) (R1)' }),
    };
    const baru = {
      'GURU B': row('Guru B', { senin: 'Jam 3 | Sorogan | 1 A WUSTHO (PI) (R1)' }),
    };

    expect(terapkanAutoReplaceKelasJam12(sebelum, baru).guruTergeser).toEqual([]);
  });

  it('tidak menggeser sesama guru yang ikut diubah pada batch yang sama', () => {
    const sebelum = {
      'GURU A': row('Guru A', { senin: 'Jam 1 | Fiqih | 2 A ULA (PA) (R1)' }),
    };
    const baru = {
      'GURU A': row('Guru A', { senin: 'Jam 1 | Fiqih | 2 A ULA (PA) (R1)', rabu: 'Jam 1 | Fiqih | 2 A ULA (PA) (R1)' }),
      'GURU B': row('Guru B', { senin: 'Jam 1 | Nahwu | 2 A ULA (PA) (R1)' }),
    };

    expect(terapkanAutoReplaceKelasJam12(sebelum, baru).guruTergeser).toEqual([]);
  });
});
