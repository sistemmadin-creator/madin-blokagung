import { describe, it, expect } from 'vitest';
import {
  generateLaporanWAText,
  parseKelasWA,
  getEmojiStatusWA,
  formatNamaAsatidzWA,
} from '@/lib/utils/absensiHelper';
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

  it('1. Memisahkan kelas PA & PI menjadi baris mandiri dengan nomor urut berlanjut saat filter SEMUA', () => {
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
    // Pemisahan baris mandiri per asatidz dengan titik tunggal untuk nama yang terpotong
    expect(text).toContain('1. 1 A ULA Ust. FIKRUL UMAM AL . ✅');
    expect(text).toContain('2. 1 A ULA Ustz. KUNI NAFI\'AH 🅰️');
    expect(text).toContain('3. 1 B ULA Ust. AHNAF HUMAM AZ . 🅰️');
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
    expect(text).toContain('1. 1 A ULA Ust. FIKRUL UMAM AL . ✅');
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
    expect(text).toContain('1. 1 A ULA Ustz. KUNI NAFI\'AH 🅰️');
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
      getSesiStatus: () => ({ status: 'Hadir', keterangan: '', menitTerlambat: '', namaPengganti: '', isSaved: false }),
      selectedJams: [1],
      filterGender: 'SEMUA',
    });

    expect(text).toContain('🏠 BLOK INDUK PUTRA');
    expect(text).toContain('⚠️ BLOK BELUM DIATUR');
    expect(text).not.toContain('🏠 BLOK INDUK\n');
  });

  it('8. Memeriksa fungsi formatNamaAsatidzWA (normalisasi M., titik tunggal, dan nama utuh)', () => {
    // 1. Putra <= 14 huruf (nama utuh, tanpa titik)
    expect(formatNamaAsatidzWA('AGUNG SETIAJI', 'PA')).toBe('Ust. AGUNG SETIAJI');
    expect(formatNamaAsatidzWA('AHMAD AFALLAH', 'PA')).toBe('Ust. AHMAD AFALLAH');

    // 2. Putra > 14 huruf (dipotong 14 karakter dengan titik tunggal .)
    expect(formatNamaAsatidzWA('SHOLEHUDDIN AL MALIKUS SHOLEH', 'PA')).toBe('Ust. SHOLEHUDDIN AL .');
    expect(formatNamaAsatidzWA('FIKRUL UMAM AL HANIF', 'PA')).toBe('Ust. FIKRUL UMAM AL .');
    expect(formatNamaAsatidzWA('Agus M. Ainun Niam', 'PA')).toBe('Ust. Agus M. Ainun .');

    // 3. Normalisasi awalan varian Muhammad/Mohammad/Moch/Moh/Mhd/M -> M.
    expect(formatNamaAsatidzWA('MOHAMMAD REZA AZIZI', 'PA')).toBe('Ust. M. REZA AZIZI');
    expect(formatNamaAsatidzWA('MUHAMMAD ABDU AR ROZZAQ', 'PA')).toBe('Ust. M. ABDU AR ROZ .');
    expect(formatNamaAsatidzWA('MOH. KAVIN AISAR AFIQI', 'PA')).toBe('Ust. M. KAVIN AISAR .');
    expect(formatNamaAsatidzWA('M ABURIZAL AZIZY', 'PA')).toBe('Ust. M. ABURIZAL AZ .');

    // 4. Putri <= 14 huruf
    expect(formatNamaAsatidzWA("KUNI NAFI'AH", 'PI')).toBe("Ustz. KUNI NAFI'AH");

    // 5. Putri > 14 huruf
    expect(formatNamaAsatidzWA('DEWI MASYITOH ANNEIRA RAHMA', 'PI')).toBe('Ustz. DEWI MASYITOH .');

    // 6. Nama yang sudah memiliki awalan lama di database (tidak boleh duplikat)
    expect(formatNamaAsatidzWA('UST. AHMAD DIMYATI', 'PA')).toBe('Ust. AHMAD DIMYATI');
    expect(formatNamaAsatidzWA('Ustz. SITI MAESAROH', 'PI')).toBe('Ustz. SITI MAESAROH');
  });

  it('9. Memisahkan kelas yang diajar dua asatidz menjadi baris tersendiri dengan urutan Jam 1 di atas Jam 2', () => {
    const sesiDuaGuru: Record<JamKbm, SesiJadwalHarian[]> = {
      1: [
        createSesi({
          jamNum: 1,
          jamKe: 'Jam 1',
          nama: 'MOH. KAVIN AISAR AFIQI',
          nia: 'K01',
          gender: 'PA',
          tingkat: 'ULA',
          dinKls: '3',
          dinBag: 'B',
          blok: 'BLOK INDUK',
          kelasMengajar: '3 B ULA (PA)',
          fan: 'Tauhid',
        }),
      ],
      2: [
        createSesi({
          jamNum: 2,
          jamKe: 'Jam 2',
          nama: 'AGUS M. AINUN NIAM',
          nia: 'A09',
          gender: 'PA',
          tingkat: 'ULA',
          dinKls: '3',
          dinBag: 'B',
          blok: 'BLOK INDUK',
          kelasMengajar: '3 B ULA (PA)',
          fan: 'Tarikh',
        }),
      ],
      3: [],
      4: [],
    };

    const text = generateLaporanWAText({
      tanggal: '2026-11-03',
      sesiHariIni: sesiDuaGuru,
      getSesiStatus: () => ({ status: 'Hadir', keterangan: '', menitTerlambat: '', namaPengganti: '', isSaved: true }),
      selectedJams: [1, 2],
      filterGender: 'PA',
    });

    // Guru Jam 1 (Moh. Kavin -> M. Kavin) harus berada di baris 1, dan Guru Jam 2 (Agus M. Ainun) di baris 2
    expect(text).toContain('1. 3 B ULA Ust. M. KAVIN AISAR . ✅\n2. 3 B ULA Ust. AGUS M. AINUN . ✅');
  });
});
