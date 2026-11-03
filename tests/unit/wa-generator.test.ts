import { describe, it, expect } from 'vitest';
import { generateLaporanWAText, parseKelasWA, getEmojiStatusWA } from '@/lib/utils/absensiHelper';
import { SesiJadwalHarian, StatusSesiData, JamKbm } from '@/types/absensi';

describe('Generator Laporan WhatsApp (Kompatibilitas Penuh Referensi)', () => {
  const createSesi = (data: Partial<SesiJadwalHarian> & Pick<SesiJadwalHarian, 'jamNum' | 'jamKe' | 'nama' | 'nia' | 'gender' | 'tingkat' | 'dinKls' | 'dinBag' | 'blok' | 'kelasMengajar' | 'fan'>): SesiJadwalHarian => ({
    jah: '',
    fanAsli: data.fan,
    lokasi: '',
    lokasiGabungan: '',
    ...data,
  });

  const dummySesi: Record<JamKbm, SesiJadwalHarian[]> = {
    1: [
      createSesi({
        jamNum: 1,
        jamKe: 'Jam 1',
        nama: 'FIKRUL UMAM AL HANIF',
        nia: 'A01',
        gender: 'PA',
        tingkat: 'ULA',
        dinKls: '1',
        dinBag: 'A',
        blok: 'BLOK INDUK',
        kelasMengajar: '1 A ULA (PA)',
        fan: 'Fiqih',
      }),
      createSesi({
        jamNum: 1,
        jamKe: 'Jam 1',
        nama: 'KUNI NAFI\'AH',
        nia: 'B01',
        gender: 'PI',
        tingkat: 'ULA',
        dinKls: '1',
        dinBag: 'A',
        blok: 'BLOK INDUK',
        kelasMengajar: '1 A ULA (PI)',
        fan: 'Fiqih',
      }),
      createSesi({
        jamNum: 1,
        jamKe: 'Jam 1',
        nama: 'AHNAF HUMAM AZIZY',
        nia: 'A02',
        gender: 'PA',
        tingkat: 'ULA',
        dinKls: '1',
        dinBag: 'B',
        blok: 'BLOK INDUK',
        kelasMengajar: '1 B ULA (PA)',
        fan: 'Tajwid',
      }),
    ],
    2: [
      createSesi({
        jamNum: 2,
        jamKe: 'Jam 2',
        nama: 'FIKRUL UMAM AL HANIF',
        nia: 'A01',
        gender: 'PA',
        tingkat: 'ULA',
        dinKls: '1',
        dinBag: 'A',
        blok: 'BLOK INDUK',
        kelasMengajar: '1 A ULA (PA)',
        fan: 'Fiqih',
      }),
      createSesi({
        jamNum: 2,
        jamKe: 'Jam 2',
        nama: 'KUNI NAFI\'AH',
        nia: 'B01',
        gender: 'PI',
        tingkat: 'ULA',
        dinKls: '1',
        dinBag: 'A',
        blok: 'BLOK INDUK',
        kelasMengajar: '1 A ULA (PI)',
        fan: 'Fiqih',
      }),
    ],
    3: [
      createSesi({
        jamNum: 3,
        jamKe: 'Jam 3',
        nama: 'FIKRUL UMAM AL HANIF',
        nia: 'A01',
        gender: 'PA',
        tingkat: 'ULA',
        dinKls: '1',
        dinBag: 'A',
        blok: 'BLOK INDUK',
        kelasMengajar: '1 A ULA (PA)',
        fan: '(Badongan) Akhlaq',
      }),
    ],
    4: [],
  };

  const dummyGetStatus = (sesi: SesiJadwalHarian): StatusSesiData => {
    if (sesi.nama === 'FIKRUL UMAM AL HANIF') return { status: 'Hadir', keterangan: '', menitTerlambat: '', namaPengganti: '', isSaved: true };
    if (sesi.nama === 'KUNI NAFI\'AH') return { status: 'Alfa', keterangan: '', menitTerlambat: '', namaPengganti: '', isSaved: true };
    return { status: 'Alfa', keterangan: '', menitTerlambat: '', namaPengganti: '', isSaved: false };
  };

  it('1. Mengelompokkan kelas PA & PI dalam satu baris dengan separator & saat filter SEMUA', () => {
    const text = generateLaporanWAText({
      tanggal: '2026-11-03',
      sesiHariIni: dummySesi,
      getSesiStatus: dummyGetStatus,
      selectedJams: [1, 2],
      filterGender: 'SEMUA',
    });

    expect(text).toContain('ABSENSI DINIYYAH SELASA, 3 NOVEMBER 2026');
    expect(text).toContain('JUMLAH GURU: 3');
    expect(text).toContain('HADIR: 1'); // Fikrul Umam
    expect(text).toContain('ALPA: 2'); // Kuni Nafi'ah & Ahnaf
    expect(text).toContain('🏠 BLOK INDUK');
    // Penggabungan kelas simetris dengan &
    expect(text).toContain('1. 1 A ULA FIKRUL UMAM AL HANIF ✅ & KUNI NAFI\'AH 🅰️');
    expect(text).toContain('2. 1 B ULA AHNAF HUMAM AZIZY 🅰️');
  });

  it('2. Menyaring hanya sesi Putra saat filter PA dipilih', () => {
    const text = generateLaporanWAText({
      tanggal: '2026-11-03',
      sesiHariIni: dummySesi,
      getSesiStatus: dummyGetStatus,
      selectedJams: [1, 2],
      filterGender: 'PA',
    });

    expect(text).toContain('ABSENSI DINIYYAH (PUTRA / PA) SELASA, 3 NOVEMBER 2026');
    expect(text).toContain('JUMLAH GURU: 2');
    expect(text).toContain('1. 1 A ULA FIKRUL UMAM AL HANIF ✅');
    expect(text).not.toContain('KUNI NAFI\'AH');
  });

  it('3. Menyaring hanya sesi Putri saat filter PI dipilih', () => {
    const text = generateLaporanWAText({
      tanggal: '2026-11-03',
      sesiHariIni: dummySesi,
      getSesiStatus: dummyGetStatus,
      selectedJams: [1, 2],
      filterGender: 'PI',
    });

    expect(text).toContain('ABSENSI DINIYYAH (PUTRI / PI) SELASA, 3 NOVEMBER 2026');
    expect(text).toContain('JUMLAH GURU: 1');
    expect(text).toContain('1. 1 A ULA KUNI NAFI\'AH 🅰️');
    expect(text).not.toContain('FIKRUL UMAM AL HANIF');
  });

  it('4. Memformat judul sesi jam gabungan Diniyyah, Bandongan, dan Takror', () => {
    const text = generateLaporanWAText({
      tanggal: '2026-11-03',
      sesiHariIni: dummySesi,
      getSesiStatus: dummyGetStatus,
      selectedJams: [1, 2, 3],
      filterGender: 'SEMUA',
    });

    expect(text).toContain('ABSENSI DINIYYAH & BANDONGAN & SYAWIR');
  });

  it('5. Memeriksa fungsi parseKelasWA untuk pengurutan natural', () => {
    const a = parseKelasWA('1 A ULA');
    const b = parseKelasWA('1 B ULA');
    const c = parseKelasWA('1 A WUSTHO');

    expect(a.tingkatOrder).toBe(1);
    expect(c.tingkatOrder).toBe(2);
    expect(a.bagian).toBe('A');
    expect(b.bagian).toBe('B');
  });

  it('6. Memetakan status ke simbol emoji standar referensi', () => {
    expect(getEmojiStatusWA('Hadir')).toBe('✅');
    expect(getEmojiStatusWA('Alfa')).toBe('🅰️');
    expect(getEmojiStatusWA('Izin')).toBe('ℹ️');
    expect(getEmojiStatusWA('Sakit')).toBe('🤒');
    expect(getEmojiStatusWA('Terlambat')).toBe('⏳');
    expect(getEmojiStatusWA('Digantikan')).toBe('🔄');
  });

  it('7. Memastikan kelas dengan blok Belum Diatur tidak menjadi BLOK INDUK palsu', () => {
    const sesiWithBelumDiatur: Record<JamKbm, SesiJadwalHarian[]> = {
      1: [
        createSesi({
          jamNum: 1,
          jamKe: 'Jam 1',
          nama: 'GURU INDUK PUTRA',
          nia: 'X01',
          gender: 'PA',
          tingkat: 'ULA',
          dinKls: '1',
          dinBag: 'A',
          blok: 'Induk Putra',
          kelasMengajar: '1 A ULA (PA)',
          fan: 'Fiqih',
        }),
        createSesi({
          jamNum: 1,
          jamKe: 'Jam 1',
          nama: 'GURU BELUM DIATUR',
          nia: 'Y01',
          gender: 'PI',
          tingkat: 'WUSTHO',
          dinKls: '1',
          dinBag: 'A',
          blok: 'Belum Diatur',
          kelasMengajar: '1 A WUSTHO (PI)',
          fan: 'Nahwu',
        }),
      ],
      2: [],
      3: [],
      4: [],
    };

    const text = generateLaporanWAText({
      tanggal: '2026-11-03',
      sesiHariIni: sesiWithBelumDiatur,
      getSesiStatus: () => ({ status: 'Hadir' }),
      selectedJams: [1],
      filterGender: 'SEMUA',
    });

    expect(text).toContain('🏠 BLOK INDUK PUTRA');
    expect(text).toContain('⚠️ BLOK BELUM DIATUR');
    expect(text).not.toContain('🏠 BLOK INDUK\n');
  });
});
