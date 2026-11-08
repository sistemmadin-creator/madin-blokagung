import { describe, it, expect } from 'vitest';
import {
  getSundaysInMonth,
  getAcademicYearMonths,
  sortSantriByFormasiHierarchy,
  formatKelasMadin,
  getHafalanLevelStyle,
} from '@/lib/utils/sundayHelper';

describe('Sunday Helper & Linimasa Sorting (Unit Tests)', () => {
  it('1. Mendeteksi jumlah hari Minggu secara dinamis (contoh November 2026 memiliki 5 hari Minggu)', () => {
    // Bulan November 2026: index 10
    const sundaysNov2026 = getSundaysInMonth(2026, 10);
    expect(sundaysNov2026).toHaveLength(5);
    expect(sundaysNov2026[0].dayNumber).toBe(1);
    expect(sundaysNov2026[1].dayNumber).toBe(8);
    expect(sundaysNov2026[2].dayNumber).toBe(15);
    expect(sundaysNov2026[3].dayNumber).toBe(22);
    expect(sundaysNov2026[4].dayNumber).toBe(29);
    expect(sundaysNov2026[1].tanggal).toBe('2026-11-08');
  });

  it('2. Mendeteksi bulan dengan tepat 4 hari Minggu (contoh Februari 2026)', () => {
    // Bulan Februari 2026: index 1
    const sundaysFeb2026 = getSundaysInMonth(2026, 1);
    expect(sundaysFeb2026).toHaveLength(4);
    expect(sundaysFeb2026[0].dayNumber).toBe(1);
    expect(sundaysFeb2026[1].dayNumber).toBe(8);
    expect(sundaysFeb2026[2].dayNumber).toBe(15);
    expect(sundaysFeb2026[3].dayNumber).toBe(22);
  });

  it('3. Menyusun 12 bulan akademik dari Juli s.d. Juni tahun berikutnya', () => {
    const months = getAcademicYearMonths(2026);
    expect(months).toHaveLength(12);
    expect(months[0].monthName).toBe('Juli');
    expect(months[0].year).toBe(2026);
    expect(months[0].semester).toBe('Ganjil');

    expect(months[5].monthName).toBe('Desember');
    expect(months[5].year).toBe(2026);
    expect(months[5].semester).toBe('Ganjil');

    expect(months[6].monthName).toBe('Januari');
    expect(months[6].year).toBe(2027);
    expect(months[6].semester).toBe('Genap');

    expect(months[11].monthName).toBe('Juni');
    expect(months[11].year).toBe(2027);
    expect(months[11].semester).toBe('Genap');
  });

  it('4. Mengurutkan baris santri persis seperti hierarki Formasi Kelas Madin (Gambar 3)', () => {
    const sampleSantri = [
      { no_induk: '105', nama: 'Zaidan', tingkat: 'ULA', din_kls: '1', din_bag: 'B', pa_pi: 'PA' },
      { no_induk: '101', nama: 'Budi Santoso', tingkat: 'ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PI' },
      { no_induk: '102', nama: 'Ardhito Pramono', tingkat: 'ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PA' },
      { no_induk: '104', nama: 'Farhan', tingkat: 'WUSTHO', din_kls: '1', din_bag: 'A', pa_pi: 'PA' },
      { no_induk: '103', nama: 'Arya Pratama', tingkat: 'ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PA' },
      { no_induk: '106', nama: 'Hasan', tingkat: 'ULYA', din_kls: '1', din_bag: 'A', pa_pi: 'PA' },
    ];

    const sorted = sortSantriByFormasiHierarchy(sampleSantri);

    // 1. ULA 1 A PA (Ardhito lalu Arya secara alfabet nama)
    expect(sorted[0].nama).toBe('Ardhito Pramono');
    expect(sorted[1].nama).toBe('Arya Pratama');

    // 2. ULA 1 A PI (Budi Santoso)
    expect(sorted[2].nama).toBe('Budi Santoso');

    // 3. ULA 1 B PA (Zaidan)
    expect(sorted[3].nama).toBe('Zaidan');

    // 4. WUSTHO 1 A PA (Farhan)
    expect(sorted[4].nama).toBe('Farhan');

    // 5. ULYA 1 A PA (Hasan)
    expect(sorted[5].nama).toBe('Hasan');
  });

  it('5. Memformat nama kelas menjadi format standar 1 A ULA (PA)', () => {
    expect(formatKelasMadin('1', 'A', 'ULA', 'PA')).toBe('1 A ULA (PA)');
    expect(formatKelasMadin('1', 'B', 'WUSTHO', 'PI')).toBe('1 B WUSTHO (PI)');
    expect(formatKelasMadin('2', 'A', 'ULYA', 'PA')).toBe('2 A ULYA (PA)');
  });

  it('6. Menghitung gradasi warna progresif multi-hafalan (Hijau, Biru, Biru Tua, Putih)', () => {
    // Belum Setor -> Putih
    const lvl0 = getHafalanLevelStyle(0);
    expect(lvl0.label).toBe('Belum Setor');
    expect(lvl0.cellBg).toBe('bg-white');

    // Hafalan Ke-1 -> Hijau
    const lvl1 = getHafalanLevelStyle(1);
    expect(lvl1.label).toBe('Hafalan Ke-1');
    expect(lvl1.badgeBg).toBe('bg-emerald-600');
    expect(lvl1.cellBg).toContain('emerald');

    // Hafalan Ke-2 -> Biru
    const lvl2 = getHafalanLevelStyle(2);
    expect(lvl2.label).toBe('Hafalan Ke-2');
    expect(lvl2.badgeBg).toBe('bg-blue-600');
    expect(lvl2.cellBg).toContain('sky');

    // Hafalan Ke-3 -> Biru Tua / Indigo
    const lvl3 = getHafalanLevelStyle(3);
    expect(lvl3.label).toBe('Hafalan Ke-3');
    expect(lvl3.badgeBg).toBe('bg-indigo-700');
    expect(lvl3.cellBg).toContain('indigo');

    // Hafalan Ke-4+ -> Biru Sangat Gelap / Midnight (semakin banyak semakin pekat)
    const lvl4 = getHafalanLevelStyle(4);
    expect(lvl4.label).toBe('Hafalan Ke-4');
    expect(lvl4.badgeBg).toBe('bg-slate-900');
  });
});
