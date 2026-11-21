import type ExcelJS from 'exceljs';
import {
  HafalanConfig,
  HafalanItemType,
  ItemHafalanDetail,
  SetoranHafalan,
} from '@/types/setoran';
import {
  DEFAULT_HAFALAN_WAJIB,
  cariMustahiqSantri,
  formatJenisKelaminLengkap,
  formatKelasTanpaSpasi,
  inferTahunAjaranFromTanggal,
  norm,
  normalizeTahunAjaranDash,
  normalizeTahunAjaranSlash,
  normalizeToItemDetail,
} from '@/lib/utils/setoranHelper';
import { ExcelAoaSheetConfig, ExcelMergeRange } from '@/lib/utils/excel';

export type TingkatPertingkatan = 'ULA' | 'WUSTHO' | 'ULYA';
export type KriteriaKurikulum = 'Wajib' | 'Sunnah' | 'Wisuda' | 'Kitab';

export interface KurikulumItemEntry {
  nama: string;
  kriteria: KriteriaKurikulum;
  keterangan: string;
  detail: ItemHafalanDetail;
}

export interface RekapPertingkatanClassRow {
  id: string;
  no: number;
  tingkat: TingkatPertingkatan;
  dinKls: string;
  dinBag: string;
  paPi: 'PA' | 'PI';
  kelas: string; // Contoh: '1A ULA'
  jenisKelamin: 'Putra' | 'Putri';
  namaMustahiq: string;
  jumlahSantri: number;
  itemCounts: number[]; // Sejajar dengan `items` di RekapPertingkatanKelasGroup
  rataRata: number;
  wajibJumlah: number;
  wajibProsentase: number;
  sunnahJumlah: number;
  sunnahProsentase: number;
  wisudaJumlah: number;
  wisudaProsentase: number;
  prosentaseTotal: number;
}

export interface RekapPertingkatanKelasGroup {
  key: string; // Contoh: 'ULA_1'
  tingkat: TingkatPertingkatan;
  dinKls: string;
  title: string; // Contoh: 'KELAS 1 ULA'
  items: KurikulumItemEntry[]; // Wajib -> Sunnah -> Wisuda
  rows: RekapPertingkatanClassRow[];
}

export interface RekapPertingkatanTingkatSection {
  tingkat: TingkatPertingkatan;
  title: string; // Contoh: 'REKAPITULASI HAFALAN TINGKAT ULA'
  tahunAjaranLabel: string; // Contoh: '2026-2027'
  kelasGroups: RekapPertingkatanKelasGroup[];
}

export function round2(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function formatPercentLabel(val: number): string {
  return `${round2(val)}%`;
}

export function resolveTingkatPertingkatan(raw: unknown): TingkatPertingkatan | null {
  const clean = norm(raw);
  if (!clean) return null;
  if (clean.includes('WUSTHO') || clean.includes('WUSTHA')) return 'WUSTHO';
  if (clean.includes('ULYA')) return 'ULYA';
  if (clean.includes('ULA')) return 'ULA';
  return null;
}

export function getSetoranTahunAjaran(record: Partial<SetoranHafalan>): string {
  if (record.tahun_ajaran) {
    return normalizeTahunAjaranSlash(record.tahun_ajaran);
  }
  return inferTahunAjaranFromTanggal(record.tanggal);
}

/**
 * Mengambil daftar item hafalan terurut untuk satu jenjang kelas (`ULA_1`, `WUSTHO_1`, dll.).
 * Urutan: Wajib -> Sunnah -> Wisuda (-> Kitab jika includeKitab = true).
 */
export function getKurikulumItemsForKelas(
  config: HafalanConfig | undefined,
  tingkat: string,
  dinKls: string,
  options?: { includeKitab?: boolean }
): KurikulumItemEntry[] {
  const key = `${norm(tingkat)}_${norm(dinKls)}`;
  const items: KurikulumItemEntry[] = [];
  const seenNames = new Set<string>();

  const pushBucket = (
    rawList: HafalanItemType[] | string | undefined,
    kriteria: KriteriaKurikulum,
    offset: number
  ) => {
    const arr = Array.isArray(rawList)
      ? rawList
      : typeof rawList === 'string' && rawList.trim()
      ? rawList.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    arr.forEach((rawIt, idx) => {
      const detail = normalizeToItemDetail(rawIt, offset + idx);
      const cleanName = detail.nama.trim();
      if (!cleanName) return;
      const dedupKey = `${kriteria}::${norm(cleanName)}`;
      if (seenNames.has(dedupKey)) return;
      seenNames.add(dedupKey);

      items.push({
        nama: cleanName,
        kriteria,
        keterangan: (detail.keterangan || '').trim() || 'Semua',
        detail,
      });
    });
  };

  const configuredWajib = config?.hafWajib?.[key];
  const hasConfiguredWajib =
    Array.isArray(configuredWajib) && configuredWajib.length > 0;

  pushBucket(
    hasConfiguredWajib ? configuredWajib : DEFAULT_HAFALAN_WAJIB[key],
    'Wajib',
    0
  );
  pushBucket(config?.hafSunnah?.[key], 'Sunnah', 100);
  pushBucket(config?.hafWisuda?.[key], 'Wisuda', 200);

  if (options?.includeKitab) {
    pushBucket(config?.hafKitab?.[key], 'Kitab', 300);
  }

  return items;
}

export interface KurikulumCatalogEntry extends KurikulumItemEntry {
  idKey: string;
  tingkat: string;
  dinKls: string;
  kelasKey: string;
  kelasLabel: string;
}

const CATALOG_TINGKAT_ORDER: Record<string, number> = {
  ULA: 1,
  WUSTHO: 2,
  WUSTHA: 2,
  ULYA: 3,
  "ISTI'DAD": 4,
  ISTIDAD: 4,
};

/**
 * Menghimpun seluruh katalog materi hafalan (Wajib, Sunnah, Wisuda, Kitab)
 * lintas semua tingkat dan kelas dari konfigurasi serta fallback bawaan.
 */
export function getAllKurikulumCatalog(
  config: HafalanConfig | undefined,
  extraPairs: Array<{ tk: string; kls: string }> = []
): KurikulumCatalogEntry[] {
  const pairMap = new Map<string, { tk: string; kls: string }>();

  const registerPair = (rawTk: string, rawKls: string) => {
    const tk = norm(rawTk);
    const kls = norm(rawKls);
    if (!tk || !kls || tk === '-' || kls === '-') return;
    const key = `${tk}_${kls}`;
    if (!pairMap.has(key)) {
      pairMap.set(key, { tk, kls });
    }
  };

  extraPairs.forEach((p) => registerPair(p.tk, p.kls));

  const registerConfigMapKeys = (mapObj?: Record<string, unknown>) => {
    if (!mapObj || typeof mapObj !== 'object') return;
    Object.keys(mapObj).forEach((k) => {
      const idx = k.lastIndexOf('_');
      if (idx <= 0) return;
      registerPair(k.slice(0, idx), k.slice(idx + 1));
    });
  };

  registerConfigMapKeys(DEFAULT_HAFALAN_WAJIB);
  registerConfigMapKeys(config?.hafWajib);
  registerConfigMapKeys(config?.hafSunnah);
  registerConfigMapKeys(config?.hafWisuda);
  registerConfigMapKeys(config?.hafKitab);

  const sortedPairs = Array.from(pairMap.values()).sort((a, b) => {
    const tA = CATALOG_TINGKAT_ORDER[a.tk] || 99;
    const tB = CATALOG_TINGKAT_ORDER[b.tk] || 99;
    if (tA !== tB) return tA - tB;
    return a.kls.localeCompare(b.kls, 'id', { numeric: true });
  });

  const catalog: KurikulumCatalogEntry[] = [];
  sortedPairs.forEach(({ tk, kls }) => {
    const kelasKey = `${tk}_${kls}`;
    const kelasLabel = `${kls} ${tk}`;
    const items = getKurikulumItemsForKelas(config, tk, kls, { includeKitab: true });
    items.forEach((it) => {
      catalog.push({
        ...it,
        idKey: `${kelasKey}::${it.kriteria}::${norm(it.nama)}`,
        tingkat: tk,
        dinKls: kls,
        kelasKey,
        kelasLabel,
      });
    });
  });

  return catalog;
}

export interface BuildRekapPertingkatanParams {
  santriList: any[];
  asatidzList: any[];
  formasiList: any[];
  setoranList: SetoranHafalan[];
  config: HafalanConfig;
  tahunAjaran: string;
  filterTingkat?: 'ALL' | TingkatPertingkatan;
  filterGender?: 'ALL' | 'PA' | 'PI';
  searchQuery?: string;
}

/**
 * Menghitung struktur rekapitulasi hafalan pertingkatan yang identik dengan
 * file 'Rekap_Hafalan_Pertingkatan_2026_2027', hanya membaca data Setoran (`/setoran`).
 */
export function buildRekapPertingkatanSections(
  params: BuildRekapPertingkatanParams
): RekapPertingkatanTingkatSection[] {
  const {
    santriList,
    asatidzList,
    formasiList,
    setoranList,
    config,
    tahunAjaran,
    filterTingkat = 'ALL',
    filterGender = 'ALL',
    searchQuery = '',
  } = params;

  const targetTaSlash = normalizeTahunAjaranSlash(tahunAjaran || '2026/2027');
  const targetTaDash = normalizeTahunAjaranDash(targetTaSlash);

  // 1. Index setoran per santri (no_induk -> Set<NORM_ITEM_NAME>) untuk tahun ajaran terpilih
  const completedItemsByNis = new Map<string, Set<string>>();
  setoranList.forEach((s) => {
    const recTa = getSetoranTahunAjaran(s);
    if (recTa !== targetTaSlash) return;
    const nis = norm(s.no_induk);
    const itemNorm = norm(s.item_hafalan);
    if (!nis || !itemNorm) return;
    if (!completedItemsByNis.has(nis)) {
      completedItemsByNis.set(nis, new Set());
    }
    completedItemsByNis.get(nis)!.add(itemNorm);
  });

  // 2. Kumpulkan seluruh rombel aktif dari formasiList & santriList (non-BOYONG)
  interface RombelMeta {
    tingkat: TingkatPertingkatan;
    dinKls: string;
    dinBag: string;
    paPi: 'PA' | 'PI';
  }
  const rombelMap = new Map<string, RombelMeta>();

  formasiList.forEach((f) => {
    const tk = resolveTingkatPertingkatan(f.tingkat);
    if (!tk) return;
    const kls = String(f.din_kls || '').trim();
    const bag = String(f.din_bag || '').trim().toUpperCase();
    if (!kls || kls === '-' || !bag || bag === '-') return;
    const paPi: 'PA' | 'PI' = norm(f.pa_pi) === 'PI' ? 'PI' : 'PA';
    const key = `${tk}_${kls}_${bag}_${paPi}`;
    if (!rombelMap.has(key)) {
      rombelMap.set(key, { tingkat: tk, dinKls: kls, dinBag: bag, paPi });
    }
  });

  const activeSantriByRombel = new Map<string, any[]>();
  santriList.forEach((s) => {
    if (!s?.no_induk) return;
    const statusRaw = s.status_santri || s.ket_status;
    if (statusRaw && norm(statusRaw) === 'BOYONG') return;

    const tk = resolveTingkatPertingkatan(s.tingkat || s[26]);
    if (!tk) return;
    const kls = String(s.din_kls || s[24] || '').trim();
    const bag = String(s.din_bag || s[25] || '').trim().toUpperCase();
    if (!kls || kls === '-' || !bag || bag === '-') return;
    const paPi: 'PA' | 'PI' = norm(s.pa_pi || s[4]) === 'PI' ? 'PI' : 'PA';

    const key = `${tk}_${kls}_${bag}_${paPi}`;
    if (!rombelMap.has(key)) {
      rombelMap.set(key, { tingkat: tk, dinKls: kls, dinBag: bag, paPi });
    }
    if (!activeSantriByRombel.has(key)) {
      activeSantriByRombel.set(key, []);
    }
    activeSantriByRombel.get(key)!.push(s);
  });

  const tingkatOrder: TingkatPertingkatan[] = ['ULA', 'WUSTHO', 'ULYA'];
  const q = norm(searchQuery);

  const sections: RekapPertingkatanTingkatSection[] = [];

  for (const tk of tingkatOrder) {
    if (filterTingkat !== 'ALL' && filterTingkat !== tk) continue;

    const rombelsForTk = Array.from(rombelMap.values()).filter((r) => r.tingkat === tk);
    if (rombelsForTk.length === 0) continue;

    // Kelompokkan per tingkat kelas (mis. 1, 2, 3, 4)
    const klsSet = Array.from(new Set(rombelsForTk.map((r) => r.dinKls))).sort((a, b) =>
      a.localeCompare(b, 'id', { numeric: true })
    );

    const kelasGroups: RekapPertingkatanKelasGroup[] = [];

    for (const dinKls of klsSet) {
      const items = getKurikulumItemsForKelas(config, tk, dinKls, { includeKitab: false });

      const rombelsInKelas = rombelsForTk
        .filter((r) => r.dinKls === dinKls)
        .filter((r) => filterGender === 'ALL' || r.paPi === filterGender)
        .sort((a, b) => {
          const bagComp = a.dinBag.localeCompare(b.dinBag, 'id');
          if (bagComp !== 0) return bagComp;
          return a.paPi.localeCompare(b.paPi);
        });

      const wajibCountItems = items.filter((it) => it.kriteria === 'Wajib').length;
      const sunnahCountItems = items.filter((it) => it.kriteria === 'Sunnah').length;
      const wisudaCountItems = items.filter((it) => it.kriteria === 'Wisuda').length;
      const totalItemsCount = items.length;

      const builtRows: RekapPertingkatanClassRow[] = [];

      rombelsInKelas.forEach((rombel) => {
        const rombelKey = `${rombel.tingkat}_${rombel.dinKls}_${rombel.dinBag}_${rombel.paPi}`;
        const santriInRombel = activeSantriByRombel.get(rombelKey) || [];
        const kelasLabel = formatKelasTanpaSpasi(rombel.dinKls, rombel.dinBag, rombel.tingkat);
        const jenisKelamin = formatJenisKelaminLengkap(rombel.paPi);
        const namaMustahiq = cariMustahiqSantri(
          rombel.tingkat,
          rombel.dinBag,
          rombel.dinKls,
          rombel.paPi,
          asatidzList,
          formasiList
        );

        if (q) {
          const matchKelas = norm(kelasLabel).includes(q);
          const matchMustahiq = norm(namaMustahiq).includes(q);
          const matchGender = norm(jenisKelamin).includes(q);
          if (!matchKelas && !matchMustahiq && !matchGender) return;
        }

        const N = santriInRombel.length;
        const itemCounts = items.map((item) => {
          const targetNameNorm = norm(item.nama);
          let count = 0;
          santriInRombel.forEach((s) => {
            const nis = norm(s.no_induk || s[1]);
            const doneSet = completedItemsByNis.get(nis);
            if (doneSet && doneSet.has(targetNameNorm)) {
              count++;
            }
          });
          return count;
        });

        let wajibJumlah = 0;
        let sunnahJumlah = 0;
        let wisudaJumlah = 0;
        let totalCapaian = 0;

        items.forEach((item, idx) => {
          const c = itemCounts[idx];
          totalCapaian += c;
          if (item.kriteria === 'Wajib') wajibJumlah += c;
          else if (item.kriteria === 'Sunnah') sunnahJumlah += c;
          else if (item.kriteria === 'Wisuda') wisudaJumlah += c;
        });

        const rataRata = N > 0 ? round2(totalCapaian / N) : 0;
        const wajibProsentase =
          N > 0 && wajibCountItems > 0 ? round2((wajibJumlah / (N * wajibCountItems)) * 100) : 0;
        const sunnahProsentase =
          N > 0 && sunnahCountItems > 0 ? round2((sunnahJumlah / (N * sunnahCountItems)) * 100) : 0;
        const wisudaProsentase =
          N > 0 && wisudaCountItems > 0 ? round2((wisudaJumlah / (N * wisudaCountItems)) * 100) : 0;
        const prosentaseTotal =
          N > 0 && totalItemsCount > 0 ? round2((totalCapaian / (N * totalItemsCount)) * 100) : 0;

        builtRows.push({
          id: rombelKey,
          no: builtRows.length + 1,
          tingkat: rombel.tingkat,
          dinKls: rombel.dinKls,
          dinBag: rombel.dinBag,
          paPi: rombel.paPi,
          kelas: kelasLabel,
          jenisKelamin,
          namaMustahiq,
          jumlahSantri: N,
          itemCounts,
          rataRata,
          wajibJumlah,
          wajibProsentase,
          sunnahJumlah,
          sunnahProsentase,
          wisudaJumlah,
          wisudaProsentase,
          prosentaseTotal,
        });
      });

      if (builtRows.length > 0) {
        kelasGroups.push({
          key: `${tk}_${dinKls}`,
          tingkat: tk,
          dinKls,
          title: `KELAS ${dinKls} ${tk}`,
          items,
          rows: builtRows,
        });
      }
    }

    if (kelasGroups.length > 0) {
      sections.push({
        tingkat: tk,
        title: `REKAPITULASI HAFALAN TINGKAT ${tk}`,
        tahunAjaranLabel: targetTaDash,
        kelasGroups,
      });
    }
  }

  return sections;
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF334155' } },
  bottom: { style: 'thin', color: { argb: 'FF334155' } },
  left: { style: 'thin', color: { argb: 'FF334155' } },
  right: { style: 'thin', color: { argb: 'FF334155' } },
};

/**
 * Membangun 3 sheet Excel terpisah (TINGKAT ULA, TINGKAT WUSTHO, TINGKAT ULYA)
 * identik dengan layout file 'Rekap_Hafalan_Pertingkatan_2026_2027'.
 */
export function buildExcelSheetsRekapPertingkatan(
  sections: RekapPertingkatanTingkatSection[]
): ExcelAoaSheetConfig[] {
  return sections.map((section) => {
    const rows: unknown[][] = [];
    const merges: ExcelMergeRange[] = [];
    const cellStyles: Record<string, Partial<ExcelJS.Style>> = {};
    const rowHeights: Record<number, number> = {};

    const maxCols = Math.max(
      13,
      ...section.kelasGroups.map((g) => 5 + g.items.length + 8)
    );

    const padRow = (vals: unknown[]): unknown[] => {
      const copy = [...vals];
      while (copy.length < maxCols) copy.push('');
      return copy;
    };

    // Row 0: REKAPITULASI HAFALAN TINGKAT ...
    rows.push(padRow([section.title]));
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: maxCols - 1 } });
    cellStyles['0,0'] = {
      font: { bold: true, size: 14, color: { argb: 'FF0F172A' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    };
    rowHeights[0] = 24;

    // Row 1: Tahun Ajaran: 2026-2027
    rows.push(padRow([`Tahun Ajaran: ${section.tahunAjaranLabel}`]));
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: maxCols - 1 } });
    cellStyles['1,0'] = {
      font: { bold: true, size: 11, color: { argb: 'FF334155' } },
      alignment: { horizontal: 'left', vertical: 'middle' },
    };
    rowHeights[1] = 20;

    // Row 2-3: Spacer
    rows.push(padRow([]));
    rows.push(padRow([]));

    const colWidths: number[] = new Array(maxCols).fill(13);
    colWidths[0] = 6; // No
    colWidths[1] = 14; // Kelas
    colWidths[2] = 14; // Jenis Kelamin
    colWidths[3] = 34; // Nama Mustahiq
    colWidths[4] = 14; // Jumlah Santri

    section.kelasGroups.forEach((group, groupIdx) => {
      if (groupIdx > 0) {
        rows.push(padRow([]));
        rows.push(padRow([]));
        rows.push(padRow([]));
      }

      // Judul Sub-Tabel: KELAS 1 ULA
      const titleRowIdx = rows.length;
      rows.push(padRow([group.title]));
      cellStyles[`${titleRowIdx},0`] = {
        font: { bold: true, size: 11, color: { argb: 'FF065F46' } },
        alignment: { horizontal: 'left', vertical: 'middle' },
      };
      rowHeights[titleRowIdx] = 22;

      const itemCount = group.items.length;
      const groupColCount = 5 + itemCount + 8;

      const hRow1Idx = rows.length;
      const hRow2Idx = hRow1Idx + 1;

      const headerRow1: unknown[] = [
        'No',
        'Kelas',
        'Jenis Kelamin',
        'Nama Mustahiq',
        'Jumlah Santri',
        ...group.items.map((it) => `${it.nama}\n(${it.kriteria})`),
        'Rata-rata',
        'hafalan Wajib',
        '',
        'hafalan Sunnah',
        '',
        'hafalan Wisuda',
        '',
        'Prosentase total',
      ];

      const headerRow2: unknown[] = [
        '',
        '',
        '',
        '',
        '',
        ...group.items.map(() => ''),
        '',
        'jumlah',
        'prosentase',
        'jumlah',
        'prosentase',
        'jumlah',
        'prosentase',
        '',
      ];

      rows.push(padRow(headerRow1));
      rows.push(padRow(headerRow2));
      rowHeights[hRow1Idx] = 34;
      rowHeights[hRow2Idx] = 20;

      // Vertical merges for single columns (No .. Rata-rata, Prosentase total)
      const rataColIdx = 5 + itemCount;
      const wajibColIdx = rataColIdx + 1;
      const sunnahColIdx = rataColIdx + 3;
      const wisudaColIdx = rataColIdx + 5;
      const totalPctColIdx = rataColIdx + 7;

      for (let c = 0; c <= rataColIdx; c++) {
        merges.push({ s: { r: hRow1Idx, c }, e: { r: hRow2Idx, c } });
      }
      merges.push({ s: { r: hRow1Idx, c: totalPctColIdx }, e: { r: hRow2Idx, c: totalPctColIdx } });

      // Horizontal merges for 2-subcolumn summary headers
      merges.push({ s: { r: hRow1Idx, c: wajibColIdx }, e: { r: hRow1Idx, c: wajibColIdx + 1 } });
      merges.push({ s: { r: hRow1Idx, c: sunnahColIdx }, e: { r: hRow1Idx, c: sunnahColIdx + 1 } });
      merges.push({ s: { r: hRow1Idx, c: wisudaColIdx }, e: { r: hRow1Idx, c: wisudaColIdx + 1 } });

      // Update colWidths for item columns & summary columns
      for (let c = 5; c < 5 + itemCount; c++) {
        colWidths[c] = Math.max(colWidths[c], 18);
      }
      for (let c = rataColIdx; c <= totalPctColIdx; c++) {
        colWidths[c] = Math.max(colWidths[c], 12);
      }

      // Header styling
      for (let r = hRow1Idx; r <= hRow2Idx; r++) {
        for (let c = 0; c < groupColCount; c++) {
          cellStyles[`${r},${c}`] = {
            font: { bold: true, size: 10, color: { argb: 'FF0F172A' } },
            alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } },
            border: HEADER_BORDER,
          };
        }
      }

      // Data Rows
      group.rows.forEach((row) => {
        const dataRowIdx = rows.length;
        const rowValues: unknown[] = [
          row.no,
          row.kelas,
          row.jenisKelamin,
          row.namaMustahiq,
          row.jumlahSantri,
          ...row.itemCounts,
          row.rataRata,
          row.wajibJumlah,
          formatPercentLabel(row.wajibProsentase),
          row.sunnahJumlah,
          formatPercentLabel(row.sunnahProsentase),
          row.wisudaJumlah,
          formatPercentLabel(row.wisudaProsentase),
          formatPercentLabel(row.prosentaseTotal),
        ];
        rows.push(padRow(rowValues));

        for (let c = 0; c < groupColCount; c++) {
          const isLeftAlign = c === 1 || c === 3;
          cellStyles[`${dataRowIdx},${c}`] = {
            font: {
              size: 10,
              bold: c === 1 || c === totalPctColIdx,
              color: { argb: 'FF1E293B' },
            },
            alignment: {
              horizontal: isLeftAlign ? 'left' : 'center',
              vertical: 'middle',
            },
            border: THIN_BORDER,
          };
        }
      });
    });

    return {
      name: `TINGKAT ${section.tingkat}`,
      rows,
      merges,
      colWidths,
      cellStyles,
      rowHeights,
    };
  });
}
