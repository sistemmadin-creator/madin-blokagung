import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  buildRekapRinciExcelSheet,
  buildRekapRinciResult,
  formatKurikulumFormalSantri,
} from '@/lib/utils/rekapRinciHelper';
import { resolvePageIdFromPathname } from '@/lib/utils/rbacHelper';
import { DEFAULT_SIDEBAR_GROUPS } from '@/stores/useSidebarConfigStore';
import { HafalanConfig, SetoranHafalan } from '@/types/setoran';

describe('Rekap Hafalan Rinci Helpers & Export Excel', () => {
  const sampleConfig: HafalanConfig = {
    hafWajib: {
      ULA_4: [{ id: 'w1', nama: 'Nadhom Al-Imrithi', targetType: 'numeric' }],
      WUSTHO_1: [{ id: 'w2', nama: 'Alfiyyah 500 Nadhom', targetType: 'numeric' }],
    },
    hafSunnah: {
      ULA_4: [
        { id: 's1', nama: 'Khoridatul Bahiyyah', targetType: 'numeric' },
        { id: 's2', nama: 'Panduan Al-Imrithi', targetType: 'numeric' },
        { id: 's3', nama: "Panduan I'lal", targetType: 'numeric' },
        { id: 's4', nama: 'Tashrif Lughowi', targetType: 'numeric' },
      ],
    },
    hafKitab: {
      ULA_4: [{ id: 'k1', nama: 'Kitab Tambahan', targetType: 'numeric' }],
    },
    hafWisuda: {
      ULA_4: [
        { id: 'wi1', nama: 'Taqrib Awwal', targetType: 'numeric' },
        { id: 'wi2', nama: 'Taqrib Tsani', targetType: 'numeric' },
      ],
    },
    penjagaBebas: [],
  };

  const sampleSantri = [
    {
      no_induk: '230543',
      nama: 'ABDUL KARIM',
      pa_pi: 'PA',
      tingkat: 'ULA',
      din_kls: '4',
      din_bag: 'A',
      kelas: '10',
      bag: '2',
      unit: 'SMK Darussalam',
    },
    {
      no_induk: '241700',
      nama: 'IBNU ADRIAN PRATAMA',
      pa_pi: 'PA',
      tingkat: 'ULA',
      din_kls: '4',
      din_bag: 'A',
      kelas: '12',
      bag: '2',
      unit: 'SMK Darussalam',
    },
    {
      no_induk: '249999',
      nama: 'SANTRI BOYONG',
      pa_pi: 'PA',
      tingkat: 'ULA',
      din_kls: '4',
      din_bag: 'A',
      kelas: '10',
      bag: '1',
      unit: 'MA Al-Amiriyyah',
      status_santri: 'BOYONG',
    },
    {
      no_induk: '231001',
      nama: 'FATIMAH AZZAHRA',
      pa_pi: 'PI',
      tingkat: 'ULA',
      din_kls: '4',
      din_bag: 'B',
      kelas: '10',
      bag: '4',
      unit: 'MA Al-Amiriyyah',
    },
    {
      no_induk: '230816',
      nama: 'SETIA ADI NUGROHO',
      pa_pi: 'PA',
      tingkat: 'WUSTHO',
      din_kls: '1',
      din_bag: 'A',
      semester: '1',
      jurusan: '1',
      unit: 'Politeknik Darussalam',
    },
  ];

  const sampleSetoran: SetoranHafalan[] = [
    {
      no_induk: '230543',
      tanggal: '19/11/2026 10:00',
      nama: 'ABDUL KARIM',
      penjaga: 'Admin',
      item_hafalan: 'Nadhom Al-Imrithi',
      kategori: 'Wajib',
      tahun_ajaran: '2026/2027',
    },
    {
      no_induk: '230543',
      tanggal: '19/11/2026 10:05',
      nama: 'ABDUL KARIM',
      penjaga: 'Admin',
      item_hafalan: 'Tashrif Lughowi',
      kategori: 'Sunnah',
      tahun_ajaran: '2026/2027',
    },
    {
      no_induk: '241700',
      tanggal: '19/11/2026 11:00',
      nama: 'IBNU ADRIAN PRATAMA',
      penjaga: 'Admin',
      item_hafalan: 'Nadhom Al-Imrithi',
      kategori: 'Wajib',
      tahun_ajaran: '2026/2027',
    },
    {
      no_induk: '241700',
      tanggal: '19/11/2026 11:05',
      nama: 'IBNU ADRIAN PRATAMA',
      penjaga: 'Admin',
      item_hafalan: 'Panduan Al-Imrithi',
      kategori: 'Sunnah',
      tahun_ajaran: '2026/2027',
    },
    {
      no_induk: '241700',
      tanggal: '19/11/2026 11:10',
      nama: 'IBNU ADRIAN PRATAMA',
      penjaga: 'Admin',
      item_hafalan: 'Tashrif Lughowi',
      kategori: 'Sunnah',
      tahun_ajaran: '2026/2027',
    },
    // Setoran tahun ajaran berbeda tidak masuk filter 2026/2027
    {
      no_induk: '230543',
      tanggal: '10/08/2027 09:00',
      nama: 'ABDUL KARIM',
      penjaga: 'Admin',
      item_hafalan: 'Taqrib Awwal',
      kategori: 'Wisuda',
      tahun_ajaran: '2027/2028',
    },
  ];

  it('registers /rekap-hafalan/rinci in RBAC and Sidebar', () => {
    expect(resolvePageIdFromPathname('/rekap-hafalan/rinci')).toBe(
      'rekap-hafalan-rinci'
    );
    const muhafadzohGrp = DEFAULT_SIDEBAR_GROUPS.find((g) => g.id === 'grp-muhafadzoh');
    const rekapItem = muhafadzohGrp?.items.find((i) => i.id === 'item-rekap-hafalan');
    expect(rekapItem?.children?.some((c) => c.href === '/rekap-hafalan/rinci')).toBe(
      true
    );
  });

  it('formats Kurikulum formal santri cleanly', () => {
    expect(formatKurikulumFormalSantri(sampleSantri[0])).toBe('10 2 SMK Darussalam');
    expect(formatKurikulumFormalSantri(sampleSantri[4])).toBe(
      '1 1 Politeknik Darussalam'
    );
  });

  it('filters Madin rombel, omits Kitab, and matches CSV/Excel format for 4A ULA Putra', async () => {
    const result = buildRekapRinciResult({
      santriList: sampleSantri,
      setoranList: sampleSetoran,
      config: sampleConfig,
      filter: {
        tahunAjaran: '2026/2027',
        jenisPendidikan: 'Madin',
        tingkat: 'ULA',
        dinKls: '4',
        dinBag: 'A',
        unitFormal: '',
        kelasFormal: '',
        bagFormal: '',
        gender: 'PA',
      },
    });

    expect(result.filterSummaryText).toBe('2026-2027 | ULA | Kelas 4A | Putra');
    expect(result.excelFilename).toBe(
      'Rekap_Hafalan_2026_2027___ULA___Kelas_4A___Putra.xlsx'
    );

    // Hanya Wajib, Sunnah, Wisuda (7 kolom, Kitab tidak masuk)
    expect(result.columns.map((c) => c.excelHeaderLabel)).toEqual([
      'ULA K4 - Nadhom Al-Imrithi (Wajib)',
      'ULA K4 - Khoridatul Bahiyyah (Sunnah)',
      'ULA K4 - Panduan Al-Imrithi (Sunnah)',
      "ULA K4 - Panduan I'lal (Sunnah)",
      'ULA K4 - Tashrif Lughowi (Sunnah)',
      'ULA K4 - Taqrib Awwal (Wisuda)',
      'ULA K4 - Taqrib Tsani (Wisuda)',
    ]);

    // Santri BOYONG terfilter keluar -> 2 santri
    expect(result.rows.length).toBe(2);
    expect(result.rows[0].nama).toBe('ABDUL KARIM');
    expect(result.rows[0].statuses).toEqual([true, false, false, false, true, false, false]);
    expect(result.rows[1].nama).toBe('IBNU ADRIAN PRATAMA');
    expect(result.rows[1].statuses).toEqual([true, false, true, false, true, false, false]);

    // Verifikasi sheet Excel identik dengan CSV
    const sheet = buildRekapRinciExcelSheet(result);
    expect(sheet.rows[0][0]).toBe('REKAP HAFALAN SANTRI');
    expect(sheet.rows[1][0]).toBe('Filter: 2026-2027 | ULA | Kelas 4A | Putra');
    expect(sheet.rows[3].slice(0, 5)).toEqual([
      'No',
      'NOIN',
      'Nama',
      'Kurikulum',
      'ULA K4 - Nadhom Al-Imrithi (Wajib)',
    ]);
    expect(sheet.rows[4]).toEqual([
      1,
      '230543',
      'ABDUL KARIM',
      '10 2 SMK Darussalam',
      '✓',
      '-',
      '-',
      '-',
      '✓',
      '-',
      '-',
    ]);

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheet.name);
    sheet.rows.forEach((r) => ws.addRow(r));
    sheet.merges?.forEach((m) => ws.mergeCells(m.s.r + 1, m.s.c + 1, m.e.r + 1, m.e.c + 1));
    const buf = await wb.xlsx.writeBuffer();
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  it('combines all bagian & genders when cleared and supports Formal mode', () => {
    const combinedMadin = buildRekapRinciResult({
      santriList: sampleSantri,
      setoranList: sampleSetoran,
      config: sampleConfig,
      filter: {
        tahunAjaran: '2026/2027',
        jenisPendidikan: 'Madin',
        tingkat: 'ULA',
        dinKls: '4',
        dinBag: '',
        unitFormal: '',
        kelasFormal: '',
        bagFormal: '',
        gender: '',
      },
    });
    expect(combinedMadin.rows.map((r) => r.nama)).toEqual([
      'ABDUL KARIM',
      'FATIMAH AZZAHRA',
      'IBNU ADRIAN PRATAMA',
    ]);
    expect(combinedMadin.filterSummaryText).toBe(
      '2026-2027 | ULA | Kelas 4 (Semua Bagian) | Putra & Putri'
    );

    const formalResult = buildRekapRinciResult({
      santriList: sampleSantri,
      setoranList: sampleSetoran,
      config: sampleConfig,
      filter: {
        tahunAjaran: '2026/2027',
        jenisPendidikan: 'Formal',
        tingkat: 'ULA',
        dinKls: '4',
        dinBag: '',
        unitFormal: 'SMK Darussalam',
        kelasFormal: '',
        bagFormal: '2',
        gender: 'PA',
      },
    });
    expect(formalResult.rows.length).toBe(2);
    expect(formalResult.filterSummaryText).toBe(
      '2026-2027 | Formal | SMK Darussalam | Bagian 2 | Putra'
    );
  });
});
