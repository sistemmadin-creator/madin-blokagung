import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  buildExcelSheetsRekapPertingkatan,
  buildRekapPertingkatanSections,
  formatPercentLabel,
  getKurikulumItemsForKelas,
} from '@/lib/utils/rekapPertingkatanHelper';
import {
  convertRawToSetoran,
  convertSetoranToRaw,
  inferTahunAjaranFromTanggal,
  normalizeTahunAjaranDash,
  normalizeTahunAjaranSlash,
} from '@/lib/utils/setoranHelper';
import { resolvePageIdFromPathname } from '@/lib/utils/rbacHelper';
import { DEFAULT_SIDEBAR_GROUPS } from '@/stores/useSidebarConfigStore';
import { HafalanConfig, SetoranHafalan } from '@/types/setoran';

describe('Rekap Hafalan Pertingkatan & Setoran Tampilan 1/2 Helpers', () => {
  it('normalizes and infers tahun_ajaran accurately', () => {
    expect(normalizeTahunAjaranSlash('2026-2027')).toBe('2026/2027');
    expect(normalizeTahunAjaranDash('2026/2027')).toBe('2026-2027');
    expect(inferTahunAjaranFromTanggal('19/11/2026 12:17')).toBe('2026/2027');
    expect(inferTahunAjaranFromTanggal('15/02/2027 09:00')).toBe('2026/2027');
    expect(inferTahunAjaranFromTanggal('10/07/2027 08:00')).toBe('2027/2028');
  });

  it('preserves tahun_ajaran in raw row roundtrip while keeping legacy 19-col compatibility', () => {
    const legacyRaw = [
      '',
      '230268',
      '19/11/2026 12:17',
      'MAFTUF BAHRUL AKMAL',
      '1',
      'Agustus',
      '2008',
      'JAYAPURA',
      'Ust. Admin',
      'Ust. Wahyu',
      'WUSTHO',
      'D',
      '1',
      'JAYAPURA UTARA',
      'KOTA JAYAPURA',
      'PAPUA',
      'MUHAIMIN',
      'Alfiyyah 500 Nadhom',
      'Wajib',
    ];
    const parsedLegacy = convertRawToSetoran(legacyRaw);
    expect(parsedLegacy.tahun_ajaran).toBe('2026/2027');

    const withExplicitTa: SetoranHafalan = {
      ...parsedLegacy,
      tahun_ajaran: '2027-2028',
    };
    const rawAgain = convertSetoranToRaw(withExplicitTa);
    expect(rawAgain[19]).toBe('2027/2028');
    expect(convertRawToSetoran(rawAgain).tahun_ajaran).toBe('2027/2028');
  });

  it('resolves RBAC pageId and sidebar menu for /rekap-hafalan/pertingkatan', () => {
    expect(resolvePageIdFromPathname('/rekap-hafalan/pertingkatan')).toBe(
      'rekap-hafalan-pertingkatan'
    );
    expect(resolvePageIdFromPathname('/rekap-hafalan')).toBe('rekap-hafalan');

    const muhafadzohGrp = DEFAULT_SIDEBAR_GROUPS.find((g) => g.id === 'grp-muhafadzoh');
    const rekapItem = muhafadzohGrp?.items.find((i) => i.id === 'item-rekap-hafalan');
    expect(
      rekapItem?.children?.some((c) => c.href === '/rekap-hafalan/pertingkatan')
    ).toBe(true);
  });

  it('calculates Rata-rata, hafalan Wajib/Sunnah/Wisuda, and Prosentase total matching CSV formulas', () => {
    const config: HafalanConfig = {
      hafWajib: {
        ULA_1: [
          {
            id: 'w1',
            nama: "Juz Amma' (Al-Fajr-An-Nass)",
            targetType: 'numeric',
            keterangan: 'Semua',
          },
        ],
        WUSTHO_1: [
          { id: 'w2', nama: 'Alfiyyah 500 Nadhom', targetType: 'numeric', keterangan: 'Putra' },
          { id: 'w3', nama: 'Alfiyyah 350 Nadhom', targetType: 'numeric', keterangan: 'Putri' },
        ],
      },
      hafSunnah: {
        ULA_1: [
          { id: 's1', nama: 'Aqoid Khomsin', targetType: 'numeric' },
          { id: 's2', nama: 'Aqidatul Amam', targetType: 'numeric' },
          { id: 's3', nama: 'Tuhfatul Athfal', targetType: 'numeric' },
          { id: 's4', nama: "Panduan Tajwid Yanbu'a", targetType: 'numeric' },
        ],
      },
      hafKitab: {},
      hafWisuda: {
        ULA_1: [{ id: 'wi1', nama: 'Safinatus Sholah', targetType: 'numeric' }],
      },
      penjagaBebas: [],
    };

    // Buat 40 santri untuk 1A ULA Putri (sesuai sampel baris 2 CSV: 37 Juz Amma, 6 Aqidatul Amam, 26 Yanbu'a)
    const santri1APutri = Array.from({ length: 40 }, (_, i) => ({
      no_induk: `1AP_${i + 1}`,
      nama: `Santri ${i + 1}`,
      pa_pi: 'PI',
      tingkat: 'ULA',
      din_kls: '1',
      din_bag: 'A',
    }));

    // Buat 25 santri untuk 1A WUSTHO Putra (sesuai sampel baris 1 WUSTHO CSV: 21 Alfiyyah 500, 4 Alfiyyah 350)
    const santri1AWusthoPutra = Array.from({ length: 25 }, (_, i) => ({
      no_induk: `1WP_${i + 1}`,
      nama: `Santri W ${i + 1}`,
      pa_pi: 'PA',
      tingkat: 'WUSTHO',
      din_kls: '1',
      din_bag: 'A',
    }));

    const setoranList: SetoranHafalan[] = [];
    for (let i = 0; i < 37; i++) {
      setoranList.push({
        no_induk: `1AP_${i + 1}`,
        tanggal: '19/11/2026 10:00',
        nama: `Santri ${i + 1}`,
        penjaga: 'Admin',
        item_hafalan: "Juz Amma' (Al-Fajr-An-Nass)",
        kategori: 'Wajib',
        tahun_ajaran: '2026/2027',
      });
    }
    for (let i = 0; i < 6; i++) {
      setoranList.push({
        no_induk: `1AP_${i + 1}`,
        tanggal: '19/11/2026 10:00',
        nama: `Santri ${i + 1}`,
        penjaga: 'Admin',
        item_hafalan: 'Aqidatul Amam',
        kategori: 'Sunnah',
        tahun_ajaran: '2026/2027',
      });
    }
    for (let i = 0; i < 26; i++) {
      setoranList.push({
        no_induk: `1AP_${i + 1}`,
        tanggal: '19/11/2026 10:00',
        nama: `Santri ${i + 1}`,
        penjaga: 'Admin',
        item_hafalan: "Panduan Tajwid Yanbu'a",
        kategori: 'Sunnah',
        tahun_ajaran: '2026/2027',
      });
    }

    // Setoran berbeda tahun ajaran tidak boleh masuk hitungan 2026/2027
    setoranList.push({
      no_induk: '1AP_1',
      tanggal: '19/11/2027 10:00',
      nama: 'Santri 1',
      penjaga: 'Admin',
      item_hafalan: 'Safinatus Sholah',
      kategori: 'Wisuda',
      tahun_ajaran: '2027/2028',
    });

    for (let i = 0; i < 21; i++) {
      setoranList.push({
        no_induk: `1WP_${i + 1}`,
        tanggal: '19/11/2026 10:00',
        nama: `Santri W ${i + 1}`,
        penjaga: 'Admin',
        item_hafalan: 'Alfiyyah 500 Nadhom',
        kategori: 'Wajib',
        tahun_ajaran: '2026/2027',
      });
    }
    for (let i = 0; i < 4; i++) {
      setoranList.push({
        no_induk: `1WP_${i + 1}`,
        tanggal: '19/11/2026 10:00',
        nama: `Santri W ${i + 1}`,
        penjaga: 'Admin',
        item_hafalan: 'Alfiyyah 350 Nadhom',
        kategori: 'Wajib',
        tahun_ajaran: '2026/2027',
      });
    }

    const formasiList = [
      { tingkat: 'ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PI', id_mustahiq: "Ustdz. Kuni Nafi'ah" },
      { tingkat: 'ULA', din_kls: '1', din_bag: 'K', pa_pi: 'PI', id_mustahiq: "Ustdz. Ulfatus Sa'adah" },
      { tingkat: 'WUSTHO', din_kls: '1', din_bag: 'A', pa_pi: 'PA', id_mustahiq: 'Ust. Rizqi Maulana Achmad' },
    ];

    const sections = buildRekapPertingkatanSections({
      santriList: [...santri1APutri, ...santri1AWusthoPutra],
      asatidzList: [],
      formasiList,
      setoranList,
      config,
      tahunAjaran: '2026/2027',
    });

    expect(sections.map((s) => s.tingkat)).toEqual(['ULA', 'WUSTHO']);

    const row1APi = sections[0].kelasGroups[0].rows.find((r) => r.kelas === '1A ULA');
    expect(row1APi).toBeDefined();
    expect(row1APi?.jenisKelamin).toBe('Putri');
    expect(row1APi?.jumlahSantri).toBe(40);
    expect(row1APi?.itemCounts).toEqual([37, 0, 6, 0, 26, 0]);
    expect(row1APi?.rataRata).toBe(1.73);
    expect(row1APi?.wajibJumlah).toBe(37);
    expect(formatPercentLabel(row1APi!.wajibProsentase)).toBe('92.5%');
    expect(row1APi?.sunnahJumlah).toBe(32);
    expect(formatPercentLabel(row1APi!.sunnahProsentase)).toBe('20%');
    expect(row1APi?.wisudaJumlah).toBe(0);
    expect(formatPercentLabel(row1APi!.wisudaProsentase)).toBe('0%');
    expect(formatPercentLabel(row1APi!.prosentaseTotal)).toBe('28.75%');

    // Kelas dengan 0 santri (1K ULA Putri) tetap aman tanpa NaN
    const row1KPi = sections[0].kelasGroups[0].rows.find((r) => r.kelas === '1K ULA');
    expect(row1KPi?.jumlahSantri).toBe(0);
    expect(row1KPi?.rataRata).toBe(0);
    expect(formatPercentLabel(row1KPi!.prosentaseTotal)).toBe('0%');

    // WUSTHO 1A Putra
    const row1WPa = sections[1].kelasGroups[0].rows[0];
    expect(row1WPa.kelas).toBe('1A WUSTHO');
    expect(row1WPa.itemCounts).toEqual([21, 4]);
    expect(row1WPa.rataRata).toBe(1);
    expect(row1WPa.wajibJumlah).toBe(25);
    expect(formatPercentLabel(row1WPa.wajibProsentase)).toBe('50%');
    expect(formatPercentLabel(row1WPa.prosentaseTotal)).toBe('50%');

    // Cek item kurikulum untuk Tampilan 1 menjaga keterangan gender
    const itemsWustho1 = getKurikulumItemsForKelas(config, 'WUSTHO', '1', {
      includeKitab: true,
    });
    expect(itemsWustho1.map((x) => `${x.nama}:${x.keterangan}`)).toEqual([
      'Alfiyyah 500 Nadhom:Putra',
      'Alfiyyah 350 Nadhom:Putri',
    ]);
  });

  it('builds 3-sheet Excel structure matching Rekap_Hafalan_Pertingkatan_2026_2027', async () => {
    const config: HafalanConfig = {
      hafWajib: {
        ULA_1: [{ id: 'w1', nama: "Juz Amma'", targetType: 'numeric' }],
        WUSTHO_1: [{ id: 'w2', nama: 'Alfiyyah 500 Nadhom', targetType: 'numeric' }],
        ULYA_1: [{ id: 'w3', nama: 'Jauharul Maknun', targetType: 'numeric' }],
      },
      hafSunnah: {},
      hafKitab: {},
      hafWisuda: {},
      penjagaBebas: [],
    };

    const formasiList = [
      { tingkat: 'ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PA', id_mustahiq: 'Ust. Ula' },
      { tingkat: 'WUSTHO', din_kls: '1', din_bag: 'A', pa_pi: 'PA', id_mustahiq: 'Ust. Wustho' },
      { tingkat: 'ULYA', din_kls: '1', din_bag: 'A', pa_pi: 'PA', id_mustahiq: 'Ust. Ulya' },
    ];

    const sections = buildRekapPertingkatanSections({
      santriList: [],
      asatidzList: [],
      formasiList,
      setoranList: [],
      config,
      tahunAjaran: '2026/2027',
    });

    const sheets = buildExcelSheetsRekapPertingkatan(sections);
    expect(sheets.map((s) => s.name)).toEqual([
      'TINGKAT ULA',
      'TINGKAT WUSTHO',
      'TINGKAT ULYA',
    ]);
    expect(sheets[0].rows[0][0]).toBe('REKAPITULASI HAFALAN TINGKAT ULA');
    expect(sheets[0].rows[1][0]).toBe('Tahun Ajaran: 2026-2027');
    expect(sheets[0].rows[4][0]).toBe('KELAS 1 ULA');
    expect(sheets[0].merges?.length).toBeGreaterThan(5);

    // Pastikan ExcelJS dapat menulis workbook tanpa error merge overlap
    const wb = new ExcelJS.Workbook();
    sheets.forEach((sh) => {
      const ws = wb.addWorksheet(sh.name);
      sh.rows.forEach((r) => ws.addRow(r));
      sh.merges?.forEach((m) => ws.mergeCells(m.s.r + 1, m.s.c + 1, m.e.r + 1, m.e.c + 1));
    });
    const buf = await wb.xlsx.writeBuffer();
    expect(buf.byteLength).toBeGreaterThan(1000);
  });
});
