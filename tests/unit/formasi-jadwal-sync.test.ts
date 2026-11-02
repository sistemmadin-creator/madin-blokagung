import { describe, it, expect } from 'vitest';
import { isKelasUnggulan, getDaftarKelasUnggulan } from '@/lib/utils/fanHelper';
import { buildMasterStrukturKelasKBM } from '@/lib/utils/jadwalHelper';
import { Formasi } from '@/types/formasi';

describe('Sinkronisasi Status Unggulan Formasi Kelas dan Jadwal KBM', () => {
  const dummyFormasi: Formasi[] = [
    {
      id: '1',
      tingkat: 'ULYA',
      din_kls: '1',
      din_bag: 'A',
      pa_pi: 'PA',
      is_unggulan: true,
      lokasi_diniyyah: 'Gedung A',
    },
    {
      id: '2',
      tingkat: 'ULYA',
      din_kls: '1',
      din_bag: 'A',
      pa_pi: 'PI',
      is_unggulan: true,
      lokasi_diniyyah: 'Gedung Putri 1',
    },
    {
      id: '3',
      tingkat: 'ULYA',
      din_kls: '2',
      din_bag: 'A',
      pa_pi: 'PA',
      is_unggulan: false, // 2 A ULYA PA adalah REGULER
      lokasi_diniyyah: 'Gedung B',
    },
    {
      id: '4',
      tingkat: 'ULYA',
      din_kls: '2',
      din_bag: 'A',
      pa_pi: 'PI',
      is_unggulan: true, // 2 A ULYA PI adalah UNGGULAN
      lokasi_diniyyah: 'Gedung Putri 2',
    },
  ];

  it('1. isKelasUnggulan membedakan status Putra dan Putri secara presisi', () => {
    // 2 A Ulya Putra harus FALSE (Reguler)
    expect(isKelasUnggulan('2 A ULYA', dummyFormasi, 'PA')).toBe(false);
    expect(isKelasUnggulan('2 A ULYA (PA)', dummyFormasi)).toBe(false);

    // 2 A Ulya Putri harus TRUE (Unggulan)
    expect(isKelasUnggulan('2 A ULYA', dummyFormasi, 'PI')).toBe(true);
    expect(isKelasUnggulan('2 A ULYA (PI)', dummyFormasi)).toBe(true);

    // 1 A Ulya Putra & Putri keduanya TRUE (Unggulan)
    expect(isKelasUnggulan('1 A ULYA', dummyFormasi, 'PA')).toBe(true);
    expect(isKelasUnggulan('1 A ULYA', dummyFormasi, 'PI')).toBe(true);
  });

  it('2. getDaftarKelasUnggulan memfilter gender jika parameter papi diberikan', () => {
    const ugPA = getDaftarKelasUnggulan(dummyFormasi, 'PA');
    const ugPI = getDaftarKelasUnggulan(dummyFormasi, 'PI');

    // Pada PA, hanya 1 A ULYA yang unggulan (2 A ULYA tidak boleh ada)
    expect(ugPA).toContain('1 A ULYA');
    expect(ugPA).not.toContain('2 A ULYA');

    // Pada PI, 1 A ULYA dan 2 A ULYA keduanya unggulan
    expect(ugPI).toContain('1 A ULYA');
    expect(ugPI).toContain('2 A ULYA');
  });

  it('3. buildMasterStrukturKelasKBM menghasilkan isUnggulan yang 100% sinkron dengan Formasi', () => {
    const master = buildMasterStrukturKelasKBM(dummyFormasi, [], {});

    const item2APutra = master.find((k) => k.kls === '2' && k.bag === 'A' && k.papi === 'PA' && k.tingkat === 'ULYA');
    const item2APutri = master.find((k) => k.kls === '2' && k.bag === 'A' && k.papi === 'PI' && k.tingkat === 'ULYA');
    const item1APutra = master.find((k) => k.kls === '1' && k.bag === 'A' && k.papi === 'PA' && k.tingkat === 'ULYA');

    expect(item2APutra).toBeDefined();
    expect(item2APutra?.isUnggulan).toBe(false); // REGULER

    expect(item2APutri).toBeDefined();
    expect(item2APutri?.isUnggulan).toBe(true); // UNGGULAN

    expect(item1APutra).toBeDefined();
    expect(item1APutra?.isUnggulan).toBe(true); // UNGGULAN
  });
});
