import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { exportToExcel } from '@/lib/utils/excel';

vi.mock('xlsx', () => {
  return {
    utils: {
      json_to_sheet: vi.fn().mockReturnValue({}),
      book_new: vi.fn().mockReturnValue({}),
      book_append_sheet: vi.fn(),
      sheet_to_json: vi.fn().mockReturnValue([]),
    },
    writeFile: vi.fn(),
    read: vi.fn().mockReturnValue({ SheetNames: [], Sheets: {} }),
  };
});

describe('Excel Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create and trigger download of excel file', () => {
    const sampleData = [
      { NIS: '1001', Nama: 'Ahmad', Kelas: '1A' },
      { NIS: '1002', Nama: 'Fauzi', Kelas: '1B' },
    ];

    exportToExcel(sampleData, 'Test_Export');

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(sampleData);
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'Test_Export.xlsx');
  });

  it('should handle empty data safely', () => {
    exportToExcel([], 'Empty_Export');

    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith([]);
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'Empty_Export.xlsx');
  });
});
