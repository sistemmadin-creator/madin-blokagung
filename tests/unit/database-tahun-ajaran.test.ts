import { describe, it, expect } from 'vitest';
import { DAFTAR_TAHUN_AJARAN_KALENDER } from '@/lib/utils/kalenderHijriyahHelper';
import { parseStartYearFromTA } from '@/stores/useTahunAjaranStore';
import {
  normalizeStrictTingkatKelas,
  buildRekapSnapshotFromLiveData,
  computeDeltaYoY,
} from '@/lib/utils/databaseTahunAjaranHelper';
import { STRICT_KELAS_DATABASE_TA } from '@/types/database-ta';
import { DEFAULT_SIDEBAR_GROUPS } from '@/stores/useSidebarConfigStore';
import { resolvePageIdFromPathname } from '@/lib/utils/rbacHelper';

describe('Database Tahun Ajaran & Sinkronisasi TA Global', () => {
  it('1. daftar default Tahun Ajaran hanya menyimpan TA 2026/2027 (tanpa 2027/2028 s/d 2030/2031)', () => {
    expect(DAFTAR_TAHUN_AJARAN_KALENDER).toHaveLength(1);
    expect(DAFTAR_TAHUN_AJARAN_KALENDER[0].tahunAjaranMasehi).toBe('2026/2027');
    expect(DAFTAR_TAHUN_AJARAN_KALENDER[0].tahunAjaranHijriyah).toBe('1447/1448');
  });

  it('2. parseStartYearFromTA mengurai tahun mulai secara akurat', () => {
    expect(parseStartYearFromTA('2026/2027')).toBe(2026);
    expect(parseStartYearFromTA('2028/2029')).toBe(2028);
    expect(parseStartYearFromTA('')).toBe(2026);
  });

  it('3. normalizeStrictTingkatKelas hanya menerima 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA dan menolak ISTIDAD', () => {
    expect(STRICT_KELAS_DATABASE_TA.map((k) => k.label_kelas)).toEqual([
      '1 ULA',
      '2 ULA',
      '3 ULA',
      '4 ULA',
      '1 WUSTHO',
      '2 WUSTHO',
      '1 ULYA',
      '2 ULYA',
    ]);

    expect(normalizeStrictTingkatKelas('ULA', '1')?.key).toBe('1_ULA');
    expect(normalizeStrictTingkatKelas('ula', 'IV')?.key).toBe('4_ULA');
    expect(normalizeStrictTingkatKelas('WUSTHO', '2')?.key).toBe('2_WUSTHO');
    expect(normalizeStrictTingkatKelas('ULYA', '1')?.key).toBe('1_ULYA');

    // Wajib tertolak di luar 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA
    expect(normalizeStrictTingkatKelas("ISTI'DAD", '1')).toBeNull();
    expect(normalizeStrictTingkatKelas('ULA', '5')).toBeNull();
    expect(normalizeStrictTingkatKelas('WUSTHO', '3')).toBeNull();
    expect(normalizeStrictTingkatKelas('ULYA', '3')).toBeNull();
    expect(normalizeStrictTingkatKelas('', '1')).toBeNull();
  });

  it('4. buildRekapSnapshotFromLiveData menghitung 8 jenjang secara ketat & mengabaikan ISTIDAD / BOYONG', () => {
    const result = buildRekapSnapshotFromLiveData({
      tahunAjaranMasehi: '2026/2027',
      santriList: [
        { no_induk: 'S01', pa_pi: 'PA', nama: 'Ahmad', tingkat: 'ULA', din_kls: '1', din_bag: 'A' },
        { no_induk: 'S02', pa_pi: 'PI', nama: 'Fatimah', tingkat: 'ULA', din_kls: '4', din_bag: 'A' },
        { no_induk: 'S03', pa_pi: 'PA', nama: 'Zaid', tingkat: 'WUSTHO', din_kls: '2', din_bag: 'B' },
        { no_induk: 'S04', pa_pi: 'PI', nama: 'Aisyah', tingkat: 'ULYA', din_kls: '1', din_bag: 'A' },
        // Di luar cakupan strictly (harus terfilter keluar):
        { no_induk: 'S05', pa_pi: 'PA', nama: 'Istidad', tingkat: "ISTI'DAD", din_kls: '1', din_bag: 'A' },
        {
          no_induk: 'S06',
          pa_pi: 'PA',
          nama: 'Boyong',
          tingkat: 'ULA',
          din_kls: '2',
          din_bag: 'A',
          status_santri: 'BOYONG',
        } as never,
      ],
      asatidzList: [
        { kode_guru: 'B1', nama_asatidz: 'Ust. Ali', pa_pi: 'PA', status: 'aktif' },
        { kode_guru: 'B2', nama_asatidz: 'Ust. Nonaktif', pa_pi: 'PA', status: 'tidak aktif' },
      ],
      formasiList: [
        { tingkat: 'ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PA', is_unggulan: false },
        { tingkat: 'WUSTHO', din_kls: '2', din_bag: 'B', pa_pi: 'PA', is_unggulan: true },
        { tingkat: "ISTI'DAD", din_kls: '1', din_bag: 'A', pa_pi: 'PA', is_unggulan: false },
      ],
      jadwalMap: {},
      fanConfig: {},
      absensiRecords: [
        {
          id: 'ab-1',
          timestamp: '2026-08-01T14:00:00Z',
          tanggal: '2026-08-01',
          hari: 'Sabtu',
          jamKe: 'Jam 1',
          nama: 'Ust. Ali',
          nia: 'B1',
          tingkat: 'ULA',
          dinKls: '1',
          dinBag: 'A',
          blok: 'Timur',
          gender: 'PA',
          kelasMengajar: '1 A ULA',
          fan: 'Fiqih',
          lokasi: 'R1',
          status: 'Hadir',
          keterangan: '',
          menitTerlambat: '',
          namaPengganti: '',
          diinputOleh: 'Admin',
          waktuUpdate: '2026-08-01',
        },
        {
          id: 'ab-2',
          timestamp: '2026-08-01T15:00:00Z',
          tanggal: '2026-08-01',
          hari: 'Sabtu',
          jamKe: 'Jam 2',
          nama: 'Ust. Ali',
          nia: 'B1',
          tingkat: 'ULA',
          dinKls: '1',
          dinBag: 'A',
          blok: 'Timur',
          gender: 'PA',
          kelasMengajar: '1 A ULA',
          fan: 'Tajwid',
          lokasi: 'R1',
          status: 'Izin',
          keterangan: '',
          menitTerlambat: '',
          namaPengganti: '',
          diinputOleh: 'Admin',
          waktuUpdate: '2026-08-01',
        },
      ],
      konsorsiumSesiList: [],
      setoranList: [
        {
          no_induk: 'S01',
          tanggal: '2026-09-10',
          nama: 'Ahmad',
          penjaga: 'Ust. Ali',
          tingkat: 'ULA',
          din_kls: '1',
          din_bag: 'A',
          item_hafalan: 'Juz Amma',
          kategori: 'Wajib',
          tahun_ajaran: '2026/2027',
        },
      ],
      mustahiqLogs: [],
      activeStates: {},
      serahPiagamRecords: {
        S01_2026: {
          id: 'sp-1',
          no_induk: 'S01',
          nama_santri: 'Ahmad',
          tingkat: 'ULA',
          tahun: 2026,
          is_menerima: true,
        },
      },
      agendaMap: { '2026-07-15': {} as never },
    });

    expect(result.rekap_per_kelas).toHaveLength(8);
    expect(result.ringkasan_umum.total_santri).toBe(4);
    expect(result.ringkasan_umum.santri_pa).toBe(2);
    expect(result.ringkasan_umum.santri_pi).toBe(2);
    expect(result.ringkasan_umum.total_asatidz_aktif).toBe(1);
    expect(result.ringkasan_umum.total_formasi_kelas).toBe(2);
    expect(result.ringkasan_umum.formasi_unggulan).toBe(1);
    expect(result.ringkasan_umum.formasi_reguler).toBe(1);
    expect(result.ringkasan_umum.kehadiran_asatidz_pct).toBe(50);
    expect(result.ringkasan_umum.capaian_wajib_pct).toBe(25);
    expect(result.ringkasan_umum.total_serah_piagam).toBe(1);
    expect(result.ringkasan_umum.total_agenda_kalender).toBe(1);
  });

  it('5. computeDeltaYoY menghasilkan arah dan label selisih yang benar', () => {
    expect(computeDeltaYoY(120, 100)).toEqual({ diff: 20, label: '+20', direction: 'up' });
    expect(computeDeltaYoY(80, 95, '%')).toEqual({ diff: -15, label: '-15%', direction: 'down' });
    expect(computeDeltaYoY(50, 50)).toEqual({ diff: 0, label: '0', direction: 'flat' });
    expect(computeDeltaYoY(50, null)).toBeNull();
  });

  it('6. grup menu Database Tahun Ajaran terdaftar ringkas 3 halaman & tersambung ke RBAC', () => {
    const dbGroup = DEFAULT_SIDEBAR_GROUPS.find((g) => g.id === 'grp-database-ta');
    expect(dbGroup?.group).toBe('Database Tahun Ajaran');
    expect(dbGroup?.items.map((i) => i.href)).toEqual([
      '/database-ta',
      '/database-ta/rekap',
      '/database-ta/arsip',
    ]);

    expect(resolvePageIdFromPathname('/database-ta')).toBe('database-ta');
    expect(resolvePageIdFromPathname('/database-ta/rekap')).toBe('database-ta-rekap');
    expect(resolvePageIdFromPathname('/database-ta/arsip')).toBe('database-ta-arsip');
  });
});
