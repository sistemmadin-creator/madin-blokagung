import ExcelJS from 'exceljs';
import { sanitizeSpreadsheetCell } from '@/lib/security/urlSanitizer';

export { sanitizeSpreadsheetCell };

export interface ExcelMergeRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

export interface ExcelAoaSheetConfig {
  name: string;
  rows: unknown[][];
  merges?: ExcelMergeRange[];
  colWidths?: number[];
}

export interface ExportAoaOptions {
  filename: string;
  sheets: ExcelAoaSheetConfig[];
}

export interface ParseExcelOptions {
  maxBytes?: number;
  maxRows?: number;
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MAX_ROWS = 15000;

function normalizeExcelFilename(filename: string): string {
  const trimmed = filename.trim() || 'Export';
  return trimmed.toLowerCase().endsWith('.xlsx') ? trimmed : `${trimmed}.xlsx`;
}

function sanitizeSheetName(name: string, fallback = 'Data'): string {
  const cleaned = (name || fallback).replace(/[\\/?*:[\]]/g, '_').trim();
  return (cleaned || fallback).slice(0, 31);
}

function sanitizeCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return sanitizeSpreadsheetCell(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) {
    return value;
  }
  return sanitizeSpreadsheetCell(String(value));
}

function triggerBrowserDownload(buffer: ArrayBuffer | Uint8Array, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const blob = new Blob([uint8 as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = normalizeExcelFilename(filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Ekspor array of objects (JSON) menjadi file .xlsx.
 * Otomatis melakukan sanitasi formula injection pada nilai string.
 */
export async function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName = 'Data'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetName, 'Data'));

  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(Math.max(header.length + 4, 12), 50),
    }));

    for (const row of data) {
      const safeRow: Record<string, unknown> = {};
      for (const header of headers) {
        safeRow[header] = sanitizeCellValue(row[header]);
      }
      worksheet.addRow(safeRow);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  triggerBrowserDownload(buffer as ArrayBuffer, filename);
}

/**
 * Ekspor Array of Arrays (2D) dengan dukungan multi-sheet, merge cells (0-indexed), dan lebar kolom.
 * Otomatis melakukan sanitasi formula injection pada setiap sel string.
 */
export async function exportAoaToExcel(options: ExportAoaOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const usedNames = new Set<string>();

  options.sheets.forEach((sheet, idx) => {
    let baseName = sanitizeSheetName(sheet.name, `Sheet${idx + 1}`);
    if (usedNames.has(baseName)) {
      const suffix = `_${idx + 1}`;
      baseName = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
    }
    usedNames.add(baseName);

    const worksheet = workbook.addWorksheet(baseName);

    for (const row of sheet.rows) {
      const safeRow = (row || []).map((cell) => sanitizeCellValue(cell));
      worksheet.addRow(safeRow);
    }

    if (sheet.merges && sheet.merges.length > 0) {
      for (const merge of sheet.merges) {
        worksheet.mergeCells(
          merge.s.r + 1,
          merge.s.c + 1,
          merge.e.r + 1,
          merge.e.c + 1
        );
      }
    }

    if (sheet.colWidths && sheet.colWidths.length > 0) {
      sheet.colWidths.forEach((w, colIdx) => {
        if (typeof w === 'number' && w > 0) {
          worksheet.getColumn(colIdx + 1).width = w;
        }
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  triggerBrowserDownload(buffer as ArrayBuffer, options.filename);
}

function unwrapExcelCellValue(val: ExcelJS.CellValue): unknown {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return val;
  }
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'object') {
    if ('richText' in val && Array.isArray(val.richText)) {
      return val.richText.map((part) => part.text || '').join('');
    }
    if ('text' in val && typeof val.text === 'string') {
      return val.text;
    }
    if ('result' in val) {
      const res = val.result;
      if (res === null || res === undefined) return '';
      if (typeof res === 'object' && 'error' in res) return '';
      return res;
    }
  }
  return String(val);
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvText(text: string, maxRows: number): Record<string, unknown>[] {
  const cleaned = text.replace(/^\uFEFF/, '');
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const headers = parseCsvLine(headerLine, delimiter).map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (rows.length >= maxRows) {
      throw new Error(`Jumlah baris melebihi batas maksimum (${maxRows} baris).`);
    }
    const values = parseCsvLine(lines[i], delimiter);
    const hasContent = values.some((v) => v !== '');
    if (!hasContent) continue;

    const record: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (h) {
        record[h] = values[idx] ?? '';
      }
    });
    rows.push(record);
  }

  return rows;
}

async function readFileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error('Gagal membaca buffer file.'));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsArrayBuffer(file);
  });
}

async function readFileToText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(String(e.target?.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file CSV.'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Membaca file .xlsx atau .csv menjadi array of objects dengan batas ukuran dan jumlah baris.
 * Menolak format lama .xls (Excel 97-2003) demi keamanan.
 */
export async function parseExcelFile<T = Record<string, any>>(
  file: File,
  options?: ParseExcelOptions
): Promise<T[]> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRows = options?.maxRows ?? DEFAULT_MAX_ROWS;

  if (file.size > maxBytes) {
    const maxMb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    throw new Error(`Ukuran file terlalu besar. Maksimal ukuran file adalah ${maxMb} MB.`);
  }

  const lowerName = (file.name || '').toLowerCase();
  if (lowerName.endsWith('.xls') && !lowerName.endsWith('.xlsx')) {
    throw new Error(
      'Format .xls lama (Excel 97-2003) tidak didukung demi keamanan. Silakan simpan ulang (Save As) sebagai .xlsx atau .csv.'
    );
  }

  if (lowerName.endsWith('.csv') || file.type === 'text/csv') {
    const text = await readFileToText(file);
    return parseCsvText(text, maxRows) as T[];
  }

  const buffer = await readFileToArrayBuffer(file);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const rawHeader = unwrapExcelCellValue(cell.value);
    headers[colNumber] = String(rawHeader ?? '').trim();
  });

  const activeColNumbers = headers
    .map((h, idx) => (h ? idx : -1))
    .filter((idx) => idx > 0);

  if (activeColNumbers.length === 0) {
    return [];
  }

  const result: Record<string, unknown>[] = [];
  for (let rowIdx = 2; rowIdx <= worksheet.rowCount; rowIdx++) {
    if (result.length >= maxRows) {
      throw new Error(`Jumlah baris melebihi batas maksimum (${maxRows} baris).`);
    }

    const row = worksheet.getRow(rowIdx);
    const record: Record<string, unknown> = {};
    let hasNonEmptyValue = false;

    for (const colNum of activeColNumbers) {
      const headerName = headers[colNum];
      const cellVal = unwrapExcelCellValue(row.getCell(colNum).value);
      if (cellVal !== '' && cellVal !== null && cellVal !== undefined) {
        hasNonEmptyValue = true;
      }
      record[headerName] = cellVal ?? '';
    }

    if (hasNonEmptyValue) {
      result.push(record);
    }
  }

  return result as T[];
}
