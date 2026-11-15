import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ExcelJS from 'exceljs';
import {
  exportToExcel,
  exportAoaToExcel,
  parseExcelFile,
  sanitizeSpreadsheetCell,
} from '@/lib/utils/excel';

describe('Excel Utils (ExcelJS)', () => {
  let clickMock = vi.fn<() => void>();
  let appendChildMock = vi.fn();
  let removeChildMock = vi.fn();
  let lastCreatedAnchor: { href: string; download: string; click: () => void } | null = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    clickMock = vi.fn<() => void>();
    appendChildMock = vi.fn();
    removeChildMock = vi.fn();
    lastCreatedAnchor = null;

    vi.stubGlobal('window', {});
    vi.stubGlobal('document', {
      createElement: vi.fn((tag: string) => {
        if (tag === 'a') {
          lastCreatedAnchor = { href: '', download: '', click: () => clickMock() };
          return lastCreatedAnchor;
        }
        return {};
      }),
      body: {
        appendChild: appendChildMock,
        removeChild: removeChildMock,
      },
    });

    if (typeof URL !== 'undefined') {
      URL.createObjectURL = vi.fn(() => 'blob:mock-excel-url');
      URL.revokeObjectURL = vi.fn();
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sanitizes formula injection prefixes in sanitizeSpreadsheetCell', () => {
    expect(sanitizeSpreadsheetCell('=SUM(A1:A5)')).toBe("'=SUM(A1:A5)");
    expect(sanitizeSpreadsheetCell('+cmd|\'/C calc\'!A0')).toBe("'+cmd|'/C calc'!A0");
    expect(sanitizeSpreadsheetCell('-2+3')).toBe("'-2+3");
    expect(sanitizeSpreadsheetCell('@SUM(1,2)')).toBe("'@SUM(1,2)");
    expect(sanitizeSpreadsheetCell('Normal Text')).toBe('Normal Text');
  });

  it('exports JSON data to .xlsx and triggers browser download', async () => {
    const mockData = [
      { id: 1, name: 'Ahmad', formula: '=HYPERLINK("http://evil.com")' },
      { id: 2, name: 'Budi', formula: 'Aman' },
    ];

    await exportToExcel(mockData, 'Data_Santri_Test', 'Santri');

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(lastCreatedAnchor?.download).toBe('Data_Santri_Test.xlsx');
  });

  it('exports AOA data with merges and colWidths via exportAoaToExcel', async () => {
    await exportAoaToExcel({
      filename: 'Laporan_AOA.xlsx',
      sheets: [
        {
          name: 'Rekap',
          rows: [
            ['REKAP DATA', ''],
            ['No', 'Nama'],
            [1, '=1+1'],
          ],
          merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }],
          colWidths: [10, 25],
        },
      ],
    });

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(lastCreatedAnchor?.download).toBe('Laporan_AOA.xlsx');
  });

  it('rejects legacy .xls files for security', async () => {
    const legacyFile = new File(['dummy'], 'data_lama.xls', {
      type: 'application/vnd.ms-excel',
    });

    await expect(parseExcelFile(legacyFile)).rejects.toThrow(/Format \.xls lama/i);
  });

  it('parses valid .xlsx files accurately into JSON records', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Template');
    ws.addRow(['no_induk', 'nama', 'kelas']);
    ws.addRow(['2026001', 'Zaid bin Tsabit', '1 Ula A']);
    ws.addRow(['2026002', 'Umar', '']);

    const buffer = await wb.xlsx.writeBuffer();
    const file = new File([buffer as ArrayBuffer], 'import_santri.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const rows = await parseExcelFile(file);
    expect(rows).toEqual([
      { no_induk: '2026001', nama: 'Zaid bin Tsabit', kelas: '1 Ula A' },
      { no_induk: '2026002', nama: 'Umar', kelas: '' },
    ]);
  });

  it('parses valid .csv files accurately into JSON records', async () => {
    const csvContent = 'no_induk,nama,kelas\n2026001,"Ahmad, S.Pd",2 Wustho\n';
    const file = new File([csvContent], 'import_santri.csv', { type: 'text/csv' });

    const rows = await parseExcelFile(file);
    expect(rows).toEqual([
      { no_induk: '2026001', nama: 'Ahmad, S.Pd', kelas: '2 Wustho' },
    ]);
  });
});
