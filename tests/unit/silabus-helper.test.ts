import { describe, it, expect } from 'vitest';
import {
  buildClassSilabusRows,
  computeDisplayOffsetsForRules,
  computeNumericRuleSchedule,
  evaluateAllSantriSilabusStatus,
  evaluateSantriSilabusStatus,
  resolveKelasMaterialsForSilabus,
  syncSilabusRulesWithConfig,
} from '@/lib/utils/silabusHelper';
import {
  getAcademicYearMonths,
  getLocalTodayYMD,
  inferAcademicStartYearFromDate,
} from '@/lib/utils/sundayHelper';
import { HafalanConfig, SilabusHolidayEntry, SilabusItemRule } from '@/types/setoran';
import { SetorMustahiqLog } from '@/types/setor-mustahiq';

const SAMPLE_CONFIG: HafalanConfig = {
  hafWajib: {
    ULA_4: [
      {
        id: 'imrithi',
        nama: 'Nadhom Al-Imrithi',
        targetType: 'numeric',
        numericUnit: 'bait',
        numericStart: 1,
        numericEnd: 254,
      },
    ],
    WUSTHO_1: [
      {
        id: 'alf350',
        nama: 'Al-Fiyyah 350',
        targetType: 'numeric',
        numericUnit: 'bait',
        numericStart: 1,
        numericEnd: 350,
      },
      {
        id: 'alf500',
        nama: 'Al-Fiyyah 500',
        targetType: 'numeric',
        numericUnit: 'bait',
        numericStart: 1,
        numericEnd: 500,
      },
    ],
  },
  hafSunnah: {
    ULA_1: [
      {
        id: 'tajwid',
        nama: 'Panduan Tajwid',
        targetType: 'sentence',
        sentences: ['Idzhar', 'Ikhfa'],
      },
    ],
  },
  hafKitab: {},
  hafWisuda: {},
  penjagaBebas: [],
};

describe('Silabus Helper & Target Mingguan (Unit Tests)', () => {
  it('1. Menyelaraskan materi silabus dengan Gambar 2 termasuk fallback DEFAULT_HAFALAN_WAJIB', () => {
    const ula1Materials = resolveKelasMaterialsForSilabus(SAMPLE_CONFIG, 'ULA_1');
    expect(ula1Materials.map((m) => m.item.nama)).toContain("Juz Amma' (An-Naas - Adh-Dhuha)");
    expect(ula1Materials.map((m) => m.item.nama)).toContain('Panduan Tajwid');

    const syncedWustho = syncSilabusRulesWithConfig([], SAMPLE_CONFIG, 'WUSTHO_1');
    expect(syncedWustho).toHaveLength(2);
    expect(syncedWustho[0].target_type).toBe('numeric');
    expect(syncedWustho[0].target_akhir).toBe(350);
    expect(syncedWustho[1].target_akhir).toBe(500);
  });

  it('2. Menghitung target mingguan fixed_increment sambil melewati minggu LIBURAN dan menyesuaikan 4/5 minggu kalender', () => {
    const academicMonths = getAcademicYearMonths(2026);
    // Juli 2026: 4 minggu; Agustus 2026: 5 minggu
    expect(academicMonths[0].sundays).toHaveLength(4);
    expect(academicMonths[1].sundays).toHaveLength(5);

    // Tandai Minggu 1 Agustus (2026-08-02) sebagai LIBURAN
    const holidays: Record<string, SilabusHolidayEntry> = {
      '2026-08-02': { label: 'LIBURAN', source: 'manual' },
    };

    const rule: SilabusItemRule = {
      materi_nama: 'Nadhom Al-Imrithi',
      kategori: 'Wajib',
      target_type: 'numeric',
      dari_bulan_index: 0, // Juli
      sampai_bulan_index: 1, // Agustus
      numeric_mode: 'fixed_increment',
      target_mulai: 1,
      target_akhir: 254,
      increment_per_minggu: 20,
    };

    const sched = computeNumericRuleSchedule(rule, academicMonths, holidays, 0);
    // Total 9 minggu (4 Jul + 5 Ags), 1 libur -> 8 minggu aktif
    expect(sched.activeSundaysCount).toBe(8);
    expect(sched.holidaySundaysCount).toBe(1);

    // Minggu 4 Juli = 80
    expect(sched.weeklyMap.get('2026-07-26')?.displayValue).toBe(80);
    // Minggu 1 Ags (LIBURAN) tetap di 80 (tidak naik)
    expect(sched.weeklyMap.get('2026-08-02')?.isHoliday).toBe(true);
    expect(sched.weeklyMap.get('2026-08-02')?.relCumulative).toBe(80);
    // Minggu 2 Ags lanjut ke 100
    expect(sched.weeklyMap.get('2026-08-09')?.displayValue).toBe(100);
    // Minggu 5 Ags = 8 * 20 = 160
    expect(sched.weeklyMap.get('2026-08-30')?.displayValue).toBe(160);
    expect(sched.isSufficient).toBe(false);
    expect(sched.shortfall).toBe(254 - 160);
  });

  it('3. Mendukung lanjutan angka kumulatif antar materi dalam satu kelas (mis. Al-Fiyyah 350 -> 351 s.d. 850)', () => {
    const academicMonths = getAcademicYearMonths(2026);
    const rules: SilabusItemRule[] = [
      {
        materi_nama: 'Al-Fiyyah 350',
        kategori: 'Wajib',
        target_type: 'numeric',
        dari_bulan_index: 0, // Juli
        sampai_bulan_index: 2, // September (13 minggu)
        numeric_mode: 'auto_even',
        target_mulai: 1,
        target_akhir: 350,
      },
      {
        materi_nama: 'Al-Fiyyah 500',
        kategori: 'Wajib',
        target_type: 'numeric',
        dari_bulan_index: 3, // Oktober
        sampai_bulan_index: 6, // Januari
        numeric_mode: 'fixed_increment',
        target_mulai: 1,
        target_akhir: 500,
        increment_per_minggu: 25,
        lanjutkan_kumulatif: true,
      },
    ];

    const offsets = computeDisplayOffsetsForRules(rules, academicMonths, {});
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(350);

    const rows = buildClassSilabusRows(2026, rules, {});
    const oktM1 = rows.find((r) => r.sunday.tanggal === '2026-10-04');
    expect(oktM1?.activeEntries[0]?.numericDisplayValue).toBe(375);
    expect(oktM1?.activeEntries[0]?.materiNama).toBe('Al-Fiyyah 500');
  });

  it('4. Memicu Stabilo Merah lebih awal jika santri tertinggal target kumulatif minggu/bulan acuan, dan aman saat minggu libur', () => {
    const silabusConfig = {
      ULA_4: [
        {
          materi_nama: 'Nadhom Al-Imrithi',
          kategori: 'Wajib' as const,
          target_type: 'numeric' as const,
          dari_bulan_index: 0, // Juli
          sampai_bulan_index: 3, // Oktober
          dari_bulan_nama: 'Juli',
          sampai_bulan_nama: 'Oktober',
          numeric_mode: 'fixed_increment' as const,
          target_mulai: 1,
          target_akhir: 254,
          increment_per_minggu: 20,
        },
      ],
    };

    const logsOnTrack: SetorMustahiqLog[] = [
      {
        id: 'l1',
        no_induk: '001',
        nama_santri: 'Ahmad',
        tingkat: 'ULA',
        din_kls: '4',
        din_bag: 'A',
        materi_nama: 'Nadhom Al-Imrithi',
        kategori: 'Wajib',
        target_type: 'numeric',
        tanggal: '2026-07-26',
        tahun: 2026,
        tambah_angka: 80,
        status_ringkas: '80 Bait',
        created_at: '2026-07-26T10:00:00Z',
      },
    ];

    // Evaluasi pada 2026-07-27 (akhir Juli = 4 minggu * 20 = 80 bait)
    const onTrackRes = evaluateSantriSilabusStatus({
      noInduk: '001',
      tingkat: 'ULA',
      dinKls: '4',
      displayKelas: '4 A ULA (PA)',
      config: SAMPLE_CONFIG,
      silabusConfig,
      holidaysMap: {},
      activeStates: {},
      logs: logsOnTrack,
      setoranList: [],
      startYear: 2026,
      targetMonth: 0, // Juli
      isAutoEvalMonth: true,
      todayYMD: '2026-07-27',
    });
    expect(onTrackRes.status).toBe('kuning');

    // Evaluasi pada 2026-08-10 (Agustus M2 = 6 minggu * 20 = 120 bait, santri baru 80 -> Merah!)
    const behindRes = evaluateSantriSilabusStatus({
      noInduk: '001',
      tingkat: 'ULA',
      dinKls: '4',
      displayKelas: '4 A ULA (PA)',
      config: SAMPLE_CONFIG,
      silabusConfig,
      holidaysMap: {},
      activeStates: {},
      logs: logsOnTrack,
      setoranList: [],
      startYear: 2026,
      targetMonth: 1, // Agustus
      isAutoEvalMonth: true,
      todayYMD: '2026-08-10',
    });
    expect(behindRes.status).toBe('merah');
    expect(behindRes.reason).toContain('80 / 120');

    // Jika Agustus M1 dan M2 ditandai LIBURAN, target masih 80 (Juli M4) -> santri tetap Kuning (tidak merah)
    const holidayProtectedRes = evaluateSantriSilabusStatus({
      noInduk: '001',
      tingkat: 'ULA',
      dinKls: '4',
      displayKelas: '4 A ULA (PA)',
      config: SAMPLE_CONFIG,
      silabusConfig,
      holidaysMap: {
        '2026-08-02': { label: 'LIBURAN' },
        '2026-08-09': { label: 'LIBURAN' },
      },
      activeStates: {},
      logs: logsOnTrack,
      setoranList: [],
      startYear: 2026,
      targetMonth: 1,
      isAutoEvalMonth: true,
      todayYMD: '2026-08-10',
    });
    expect(holidayProtectedRes.status).toBe('kuning');

    // Verifikasi versi batch evaluateAllSantriSilabusStatus menghasilkan hasil identik
    const batchMap = evaluateAllSantriSilabusStatus({
      santriList: [
        {
          no_induk: '001',
          tingkat: 'ULA',
          din_kls: '4',
          displayKelas: '4 A ULA (PA)',
        },
      ],
      config: SAMPLE_CONFIG,
      silabusConfig,
      holidaysMap: {},
      activeStates: {},
      logs: logsOnTrack,
      setoranList: [],
      startYear: 2026,
      targetMonth: 1,
      isAutoEvalMonth: true,
      todayYMD: '2026-08-10',
    });
    expect(batchMap.get('001')?.status).toBe('merah');
  });

  it('5. Menginferensi startYear Tahun Ajaran dan tanggal lokal dengan akurat', () => {
    expect(inferAcademicStartYearFromDate('2026-07-05')).toBe(2026);
    expect(inferAcademicStartYearFromDate('2027-01-10')).toBe(2026);
    expect(inferAcademicStartYearFromDate('2027-06-27')).toBe(2026);
    expect(inferAcademicStartYearFromDate('2027-07-04')).toBe(2027);
    expect(getLocalTodayYMD(new Date(2026, 10, 21, 1, 30, 0))).toBe('2026-11-21');
  });
});
