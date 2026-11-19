import type ExcelJS from 'exceljs';
import { HafalanConfig, SetoranHafalan } from '@/types/setoran';
import {
  norm,
  normalizeTahunAjaranDash,
  normalizeTahunAjaranSlash,
} from '@/lib/utils/setoranHelper';
import {
  getKurikulumItemsForKelas,
  getSetoranTahunAjaran,
  KriteriaKurikulum,
  resolveTingkatPertingkatan,
  TingkatPertingkatan,
} from '@/lib/utils/rekapPertingkatanHelper';
import { ExcelAoaSheetConfig, ExcelMergeRange } from '@/lib/utils/excel';

export type JenisPendidikanRekap = 'Madin' | 'Formal';

export interface RekapRinciFilter {
  tahunAjaran: string;
  jenisPendidikan: JenisPendidikanRekap;
  // Filter Madin
  tingkat: TingkatPertingkatan;
  dinKls: string;
  dinBag: string; // '' = semua bagian
  // Filter Formal
  unitFormal: string;
  kelasFormal: string; // '' = semua kelas formal
  bagFormal: string; // '' = semua bagian formal
  // Filter Gender bersama
  gender: '' | 'PA' | 'PI'; // '' = gabungan Putra & Putri
}

export interface RekapRinciColumn {
  key: string;
  shortGroupLabel: string; // contoh: 'ULA K4'
  nama: string; // contoh: 'Nadhom Al-Imrithi'
  kriteria: Exclude<KriteriaKurikulum, 'Kitab'>;
  excelHeaderLabel: string; // contoh: 'ULA K4 - Nadhom Al-Imrithi (Wajib)'
}

export interface RekapRinciRow {
  no: number;
  noin: string;
  nama: string;
  kurikulum: string;
  statuses: boolean[];
}

export interface RekapRinciResult {
  filterSummaryText: string;
  excelFilename: string;
  columns: RekapRinciColumn[];
  rows: RekapRinciRow[];
}

export function formatKurikulumFormalSantri(santri: any): string {
  if (!santri) return '-';
  const kls = String(santri.kelas || santri.semester || '').trim();
  const bag = String(santri.bag || santri.jurusan || '').trim();
  const unit = String(santri.unit || '').trim();
  const parts = [kls, bag, unit].filter((v) => v && v !== '-');
  return parts.length > 0 ? parts.join(' ') : '-';
}

function sanitizeFilenameSegment(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
}

function formatGenderText(gender: '' | 'PA' | 'PI'): string {
  if (gender === 'PA') return 'Putra';
  if (gender === 'PI') return 'Putri';
  return 'Putra_Putri';
}

function formatGenderSummary(gender: '' | 'PA' | 'PI'): string {
  if (gender === 'PA') return 'Putra';
  if (gender === 'PI') return 'Putri';
  return 'Putra & Putri';
}

const TINGKAT_SORT_ORDER: Record<TingkatPertingkatan, number> = {
  ULA: 1,
  WUSTHO: 2,
  ULYA: 3,
};

/**
 * Menghitung data Rekap Hafalan Rinci per santri berdasarkan data Setoran
 * (/setoran Tampilan 1 & 2) untuk kategori Wajib, Sunnah, dan Wisuda.
 */
export function buildRekapRinciResult(params: {
  santriList: any[];
  setoranList: SetoranHafalan[];
  config: HafalanConfig;
  filter: RekapRinciFilter;
}): RekapRinciResult {
  const { santriList, setoranList, config, filter } = params;

  const targetTaSlash = normalizeTahunAjaranSlash(filter.tahunAjaran || '2026/2027');
  const targetTaDash = normalizeTahunAjaranDash(targetTaSlash);

  // 1. Filter santri aktif (non-BOYONG) sesuai Jenis Pendidikan & filter terpilih
  const matchingSantri = santriList
    .filter((s) => {
      if (!s?.no_induk || !s?.nama) return false;
      const statusRaw = s.status_santri || s.ket_status;
      if (statusRaw && norm(statusRaw) === 'BOYONG') return false;

      // Filter Jenis Kelamin bersama (bila dipilih)
      if (filter.gender) {
        const sPaPi = norm(s.pa_pi || s[4]) === 'PI' ? 'PI' : 'PA';
        if (sPaPi !== filter.gender) return false;
      }

      if (filter.jenisPendidikan === 'Madin') {
        const sTk = resolveTingkatPertingkatan(s.tingkat || s[26]);
        if (sTk !== filter.tingkat) return false;

        const sKls = String(s.din_kls || s[24] || '').trim();
        if (norm(sKls) !== norm(filter.dinKls)) return false;

        if (filter.dinBag.trim()) {
          const sBag = String(s.din_bag || s[25] || '').trim();
          if (norm(sBag) !== norm(filter.dinBag)) return false;
        }
        return true;
      }

      // Jenis Pendidikan: Formal
      const sUnit = String(s.unit || '').trim();
      if (filter.unitFormal.trim() && norm(sUnit) !== norm(filter.unitFormal)) {
        return false;
      }
      if (filter.kelasFormal.trim()) {
        const sKlsFormal = String(s.kelas || s.semester || '').trim();
        if (norm(sKlsFormal) !== norm(filter.kelasFormal)) return false;
      }
      if (filter.bagFormal.trim()) {
        const sBagFormal = String(s.bag || s.jurusan || '').trim();
        if (norm(sBagFormal) !== norm(filter.bagFormal)) return false;
      }
      return true;
    })
    .sort((a, b) => String(a.nama || '').localeCompare(String(b.nama || ''), 'id'));

  // 2. Tentukan daftar kolom materi hafalan (Wajib, Sunnah, Wisuda saja)
  const columns: RekapRinciColumn[] = [];
  const seenColKeys = new Set<string>();

  const appendColumnsForClass = (tk: TingkatPertingkatan, kls: string) => {
    const items = getKurikulumItemsForKelas(config, tk, kls, { includeKitab: false });
    items.forEach((it) => {
      if (it.kriteria !== 'Wajib' && it.kriteria !== 'Sunnah' && it.kriteria !== 'Wisuda') {
        return;
      }
      const shortGroupLabel = `${tk} K${kls}`;
      const colKey = `${shortGroupLabel}::${it.kriteria}::${norm(it.nama)}`;
      if (seenColKeys.has(colKey)) return;
      seenColKeys.add(colKey);

      columns.push({
        key: colKey,
        shortGroupLabel,
        nama: it.nama,
        kriteria: it.kriteria,
        excelHeaderLabel: `${shortGroupLabel} - ${it.nama} (${it.kriteria})`,
      });
    });
  };

  if (filter.jenisPendidikan === 'Madin') {
    appendColumnsForClass(filter.tingkat, filter.dinKls);
  } else {
    // Kumpulkan seluruh pasangan (tingkat, din_kls) unik dari santri formal terpilih
    const pairMap = new Map<string, { tk: TingkatPertingkatan; kls: string }>();
    matchingSantri.forEach((s) => {
      const tk = resolveTingkatPertingkatan(s.tingkat || s[26]);
      const kls = String(s.din_kls || s[24] || '').trim();
      if (!tk || !kls || kls === '-') return;
      const key = `${tk}_${norm(kls)}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, { tk, kls });
      }
    });

    const sortedPairs = Array.from(pairMap.values()).sort((a, b) => {
      const tDiff = (TINGKAT_SORT_ORDER[a.tk] || 99) - (TINGKAT_SORT_ORDER[b.tk] || 99);
      if (tDiff !== 0) return tDiff;
      return a.kls.localeCompare(b.kls, 'id', { numeric: true });
    });

    sortedPairs.forEach((p) => appendColumnsForClass(p.tk, p.kls));
  }

  // 3. Index setoran tuntas dari setoranList pada Tahun Ajaran terpilih
  const completedByNis = new Map<string, Set<string>>();
  setoranList.forEach((rec) => {
    if (getSetoranTahunAjaran(rec) !== targetTaSlash) return;
    const nis = norm(rec.no_induk);
    const itemNorm = norm(rec.item_hafalan);
    if (!nis || !itemNorm) return;
    if (!completedByNis.has(nis)) {
      completedByNis.set(nis, new Set());
    }
    completedByNis.get(nis)!.add(itemNorm);
  });

  // 4. Susun baris hasil per santri
  const rows: RekapRinciRow[] = matchingSantri.map((s, idx) => {
    const noin = String(s.no_induk || '').trim();
    const nama = String(s.nama || '').trim();
    const doneSet = completedByNis.get(norm(noin));

    const statuses = columns.map((col) => {
      if (!doneSet) return false;
      return doneSet.has(norm(col.nama));
    });

    return {
      no: idx + 1,
      noin,
      nama,
      kurikulum: formatKurikulumFormalSantri(s),
      statuses,
    };
  });

  // 5. Susun ringkasan filter & nama file Excel
  const genderLabel = formatGenderSummary(filter.gender);
  let filterSummaryText = '';
  let excelFilename = '';
  const taUnder = targetTaDash.replace('-', '_');

  if (filter.jenisPendidikan === 'Madin') {
    const kelasPart = filter.dinBag.trim()
      ? `Kelas ${filter.dinKls}${filter.dinBag.trim().toUpperCase()}`
      : `Kelas ${filter.dinKls} (Semua Bagian)`;
    filterSummaryText = `${targetTaDash} | ${filter.tingkat} | ${kelasPart} | ${genderLabel}`;

    const fileKelasPart = filter.dinBag.trim()
      ? `Kelas_${sanitizeFilenameSegment(filter.dinKls + filter.dinBag.trim().toUpperCase())}`
      : `Kelas_${sanitizeFilenameSegment(filter.dinKls)}_Semua`;
    excelFilename = `Rekap_Hafalan_${taUnder}___${filter.tingkat}___${fileKelasPart}___${formatGenderText(
      filter.gender
    )}.xlsx`;
  } else {
    const unitPart = filter.unitFormal.trim() || 'Semua Unit';
    const klsPart = filter.kelasFormal.trim()
      ? `Kelas ${filter.kelasFormal.trim()}${filter.bagFormal.trim()}`
      : filter.bagFormal.trim()
      ? `Bagian ${filter.bagFormal.trim()}`
      : 'Semua Kelas';
    filterSummaryText = `${targetTaDash} | Formal | ${unitPart} | ${klsPart} | ${genderLabel}`;

    excelFilename = `Rekap_Hafalan_${taUnder}___Formal___${sanitizeFilenameSegment(
      unitPart
    )}___${sanitizeFilenameSegment(klsPart)}___${formatGenderText(filter.gender)}.xlsx`;
  }

  return {
    filterSummaryText,
    excelFilename,
    columns,
    rows,
  };
}

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF334155' } },
  bottom: { style: 'thin', color: { argb: 'FF334155' } },
  left: { style: 'thin', color: { argb: 'FF334155' } },
  right: { style: 'thin', color: { argb: 'FF334155' } },
};

const CELL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

/**
 * Membangun 1 sheet Excel identik dengan format file contoh
 * 'Rekap_Hafalan_2026_2027___ULA___Kelas_4A___Putra'.
 */
export function buildRekapRinciExcelSheet(
  result: RekapRinciResult
): ExcelAoaSheetConfig {
  const totalCols = Math.max(4, 4 + result.columns.length);
  const padRow = (vals: unknown[]): unknown[] => {
    const copy = [...vals];
    while (copy.length < totalCols) copy.push('');
    return copy;
  };

  const rows: unknown[][] = [
    padRow(['REKAP HAFALAN SANTRI']),
    padRow([`Filter: ${result.filterSummaryText}`]),
    padRow([]),
    padRow([
      'No',
      'NOIN',
      'Nama',
      'Kurikulum',
      ...result.columns.map((c) => c.excelHeaderLabel),
    ]),
  ];

  const merges: ExcelMergeRange[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
  ];

  const cellStyles: Record<string, Partial<ExcelJS.Style>> = {
    '0,0': {
      font: { bold: true, size: 13, color: { argb: 'FF0F172A' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    },
    '1,0': {
      font: { bold: false, size: 10, color: { argb: 'FF334155' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    },
  };

  const rowHeights: Record<number, number> = {
    0: 24,
    1: 18,
    3: 32,
  };

  for (let c = 0; c < totalCols; c++) {
    cellStyles[`3,${c}`] = {
      font: { bold: true, size: 10, color: { argb: 'FF0F172A' } },
      alignment: {
        horizontal: c === 2 || c === 3 ? 'left' : 'center',
        vertical: 'middle',
        wrapText: true,
      },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
      border: HEADER_BORDER,
    };
  }

  result.rows.forEach((row) => {
    const rIdx = rows.length;
    rows.push(
      padRow([
        row.no,
        row.noin,
        row.nama,
        row.kurikulum,
        ...row.statuses.map((done) => (done ? '✓' : '-')),
      ])
    );

    for (let c = 0; c < totalCols; c++) {
      const isStatusCol = c >= 4;
      const isDone = isStatusCol && row.statuses[c - 4];
      cellStyles[`${rIdx},${c}`] = {
        font: {
          size: 10,
          bold: c === 2 || isDone,
          color: {
            argb: isStatusCol
              ? isDone
                ? 'FF065F46'
                : 'FF64748B'
              : 'FF1E293B',
          },
        },
        alignment: {
          horizontal: c === 2 || c === 3 ? 'left' : 'center',
          vertical: 'middle',
        },
        border: CELL_BORDER,
      };
    }
  });

  const colWidths: number[] = [6, 12, 32, 26];
  result.columns.forEach((col) => {
    colWidths.push(Math.min(Math.max(col.excelHeaderLabel.length + 4, 20), 36));
  });

  return {
    name: 'Rekap Hafalan Santri',
    rows,
    merges,
    colWidths,
    cellStyles,
    rowHeights,
  };
}
