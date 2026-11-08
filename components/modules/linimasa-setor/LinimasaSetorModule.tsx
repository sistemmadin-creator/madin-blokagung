'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Calendar,
  Search,
  Download,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSantriStore } from '@/stores/useSantriStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import {
  getAcademicYearMonths,
  sortSantriByFormasiHierarchy,
  formatKelasMadin,
  getHafalanLevelStyle,
  SundayOption,
} from '@/lib/utils/sundayHelper';
import {
  useSetorMustahiqStore,
  getMateriListForTingkat,
} from '@/stores/useSetorMustahiqStore';
import { norm } from '@/lib/utils/setoranHelper';
import { SetoranHafalan } from '@/types/setoran';
import ModalInputSetorMinggu from './ModalInputSetorMinggu';

type TingkatTab = 'SEMUA' | 'ULA' | 'WUSTHO' | 'ULYA';

// Helper untuk normalisasi string tanggal ke ISO 'YYYY-MM-DD'
function normalizeToIsoDate(raw: string): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (trimmed.includes('T')) return trimmed.split('T')[0];
  if (trimmed.includes('/')) {
    const parts = trimmed.split(' ')[0].split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return trimmed.split(' ')[0];
}

// Helper untuk membersihkan dan menstandarisasi data santri
interface ParsedSantri {
  no_induk: string;
  nama: string;
  pa_pi: 'PA' | 'PI';
  tingkat: string;
  din_kls: string;
  din_bag: string;
  kamar?: string;
  displayKelas: string;
  raw: any;
}

function parseSantri(s: any): ParsedSantri {
  const no_induk = String(s.no_induk || s[1] || '').trim();
  const nama = String(s.nama || s.nama_lengkap || s[3] || '').trim();
  const rawGender = String(s.pa_pi || s.gender || s[2] || '').trim().toUpperCase();
  const pa_pi: 'PA' | 'PI' = rawGender.includes('PI') || rawGender.includes('PUTRI') ? 'PI' : 'PA';

  let tingkat = String(s.tingkat || s[26] || '').trim().toUpperCase();
  if (!tingkat) {
    const combined = `${s.kelas || ''} ${s.din_kls || ''} ${s[20] || ''}`.toUpperCase();
    if (combined.includes('WUSTHO')) tingkat = 'WUSTHO';
    else if (combined.includes('ULYA')) tingkat = 'ULYA';
    else if (combined.includes('ULA')) tingkat = 'ULA';
    else if (combined.includes("ISTI'DAD") || combined.includes('ISTIDAD')) tingkat = "ISTI'DAD";
  }

  let din_kls = String(s.din_kls || s[24] || '').trim();
  if (!din_kls) {
    const rawKelas = String(s.kelas || s[20] || '').trim();
    const match = rawKelas.match(/^([1-6])/);
    if (match) din_kls = match[1];
  }

  const din_bag = String(s.din_bag || s[25] || s.bag || '').trim().toUpperCase();
  const kamar = String(s.kamar || s[19] || '').trim();
  // Format Kelas Baru: '1 A ULA (PA)'
  const displayKelas = formatKelasMadin(din_kls, din_bag, tingkat, pa_pi);

  return {
    no_induk,
    nama,
    pa_pi,
    tingkat,
    din_kls,
    din_bag,
    kamar,
    displayKelas: displayKelas || '-',
    raw: s,
  };
}

export default function LinimasaSetorModule() {
  const { santriList, fetchSantri, isLoading: loadingSantri } = useSantriStore();
  const { config, setoranList, fetchSetoranData } = useMuhafadzohStore();
  const { logs, activeStates, fetchMustahiqData } = useSetorMustahiqStore();
  const { formasiList, fetchFormasi } = useFormasiStore();

  // Tahun awal ajaran (default: jika saat ini bulan Juli-Desember -> tahun ini, jika Jan-Jun -> tahun lalu)
  const [startYear, setStartYear] = useState<number>(() => {
    const now = new Date();
    return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  });

  // Switch Tingkat (Semua, ULA, WUSTHO, ULYA)
  const [activeTingkat, setActiveTingkat] = useState<TingkatTab>('SEMUA');

  // Multi-select Filter Bulan yang Ditampilkan
  // Default: Seluruh 12 bulan (1 tahun penuh) aktif
  const academicMonths = useMemo(() => getAcademicYearMonths(startYear), [startYear]);
  const [visibleMonthKeys, setVisibleMonthKeys] = useState<Set<string>>(() => {
    const initialMonths = getAcademicYearMonths(
      new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1
    );
    return new Set(initialMonths.map((m) => m.key));
  });

  // Sync bulan jika startYear berubah
  useEffect(() => {
    setVisibleMonthKeys(new Set(academicMonths.map((m) => m.key)));
  }, [academicMonths]);

  // Filter pencarian & gender
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterGender, setFilterGender] = useState<'SEMUA' | 'PA' | 'PI'>('SEMUA');
  const [isMonthFilterOpen, setIsMonthFilterOpen] = useState<boolean>(false);

  // State Interaktif Sel (Klik untuk Detail / Input Setoran)
  const [selectedCell, setSelectedCell] = useState<{
    santri: ParsedSantri;
    sunday: SundayOption;
    records: SetoranHafalan[];
  } | null>(null);

  // Load data awal lintas modul
  useEffect(() => {
    if (santriList.length === 0) fetchSantri();
    if (setoranList.length === 0) fetchSetoranData();
    if (formasiList.length === 0) fetchFormasi();
    if (logs.length === 0) fetchMustahiqData();
  }, [
    santriList.length,
    setoranList.length,
    formasiList.length,
    logs.length,
    fetchSantri,
    fetchSetoranData,
    fetchFormasi,
    fetchMustahiqData,
  ]);

  // Parsing & Normalisasi Seluruh Data Santri
  const parsedSantriList = useMemo(() => {
    return santriList.map(parseSantri);
  }, [santriList]);

  // Hitung jumlah santri untuk masing-masing tab tingkat
  const tingkatCounts = useMemo(() => {
    const counts: Record<TingkatTab, number> = { SEMUA: 0, ULA: 0, WUSTHO: 0, ULYA: 0 };
    parsedSantriList.forEach((s) => {
      counts.SEMUA++;
      if (s.tingkat === 'ULA') counts.ULA++;
      else if (s.tingkat === 'WUSTHO') counts.WUSTHO++;
      else if (s.tingkat === 'ULYA') counts.ULYA++;
    });
    return counts;
  }, [parsedSantriList]);

  // Santri yang telah difilter dan DIURUTKAN SESUAI FORMASI KELAS (Gambar 3)
  const displayedSantri = useMemo(() => {
    const filtered = parsedSantriList.filter((s) => {
      // 1. Filter Tingkat
      if (activeTingkat !== 'SEMUA') {
        if (s.tingkat !== activeTingkat) return false;
      }
      // 2. Filter Gender
      if (filterGender !== 'SEMUA' && s.pa_pi !== filterGender) return false;
      // 3. Filter Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = s.nama.toLowerCase().includes(q);
        const matchNis = s.no_induk.toLowerCase().includes(q);
        const matchKelas = s.displayKelas.toLowerCase().includes(q);
        if (!matchNama && !matchNis && !matchKelas) return false;
      }
      return true;
    });

    // Urutkan menggunakan algoritma Formasi Kelas (Gambar 3)
    return sortSantriByFormasiHierarchy(filtered);
  }, [parsedSantriList, activeTingkat, filterGender, searchQuery]);

  // Batasi baris tabel hanya 3 kelas saja
  const [classPage, setClassPage] = useState<number>(0);
  const CLASSES_PER_VIEW = 3;

  // Reset pagination kelas bila filter berubah
  useEffect(() => {
    setClassPage(0);
  }, [activeTingkat, filterGender, searchQuery]);

  // Daftar kelas unik berurutan sesuai hierarki formasi
  const distinctClasses = useMemo(() => {
    const list: string[] = [];
    const set = new Set<string>();
    displayedSantri.forEach((s) => {
      if (s.displayKelas && !set.has(s.displayKelas)) {
        set.add(s.displayKelas);
        list.push(s.displayKelas);
      }
    });
    return list;
  }, [displayedSantri]);

  const totalClassPages = Math.ceil(distinctClasses.length / CLASSES_PER_VIEW) || 1;
  const currentClassPage = Math.min(classPage, Math.max(0, totalClassPages - 1));

  // 3 Kelas yang sedang aktif ditampilkan
  const activeClasses = useMemo(() => {
    const startIdx = currentClassPage * CLASSES_PER_VIEW;
    return distinctClasses.slice(startIdx, startIdx + CLASSES_PER_VIEW);
  }, [distinctClasses, currentClassPage]);

  const activeClassSet = useMemo(() => new Set(activeClasses), [activeClasses]);

  // Santri yang dibatasi hanya dari 3 kelas aktif tersebut
  const paginatedSantri = useMemo(() => {
    return displayedSantri.filter((s) => activeClassSet.has(s.displayKelas));
  }, [displayedSantri, activeClassSet]);

  // Lookup Cepat Setoran: Map `${no_induk}_${isoDate}` -> SetoranHafalan[]
  // Mengintegrasikan sumber data logs (Setor Cepat, Setor Kelas, Rekap) & legacy setoranList
  const setoranLookupMap = useMemo(() => {
    const map = new Map<string, any[]>();

    // 1. Prioritas Utama: Setor Mustahiq Logs
    logs.forEach((log) => {
      const isoDate = normalizeToIsoDate(log.tanggal);
      const noInduk = String(log.no_induk || '').trim();
      if (!isoDate || !noInduk) return;

      const key = `${noInduk}_${isoDate}`;
      const existing = map.get(key) || [];
      existing.push({
        id: log.id,
        no_induk: log.no_induk,
        nama: log.nama_santri,
        item_hafalan: log.materi_nama,
        materi_nama: log.materi_nama,
        kategori: log.kategori,
        target_type: log.target_type,
        capaian:
          log.target_type === 'sentence'
            ? log.kalimat_dipilih
            : `${log.tambah_angka || 0} ${log.satuan_angka || ''}`,
        penjaga: log.mustahiq || 'Mustahiq',
        tanggal: log.tanggal,
        tahun: log.tahun,
      });
      map.set(key, existing);
    });

    // 2. Legacy / External Setoran List dari useMuhafadzohStore
    setoranList.forEach((rec) => {
      const isoDate = normalizeToIsoDate(rec.tanggal);
      const noInduk = String(rec.no_induk || '').trim();
      if (!isoDate || !noInduk) return;

      const key = `${noInduk}_${isoDate}`;
      const existing = map.get(key) || [];
      const alreadyHas = existing.some(
        (e) => norm(e.item_hafalan || e.materi_nama) === norm(rec.item_hafalan)
      );
      if (!alreadyHas) {
        existing.push({
          id: rec.id || `rec_${Math.random()}`,
          no_induk: rec.no_induk,
          nama: rec.nama,
          item_hafalan: rec.item_hafalan,
          materi_nama: rec.item_hafalan,
          kategori: rec.kategori,
          capaian: rec.capaian,
          penjaga: rec.penjaga,
          tanggal: rec.tanggal,
          tahun: rec.tanggal ? parseInt(rec.tanggal.split('-')[0], 10) : undefined,
        });
        map.set(key, existing);
      }
    });

    return map;
  }, [logs, setoranList]);

  // Mapping Level Hafalan per Santri: no_induk -> Map<materi_norm, levelNumber>
  // Menghitung urutan materi yang dihafalkan santri (Hafalan Ke-1, Ke-2, Ke-3, dst.)
  const santriMateriLevelMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();

    parsedSantriList.forEach((s) => {
      const noInduk = s.no_induk;
      const configKey = `${s.tingkat}_${s.din_kls}`;
      const materiList = getMateriListForTingkat(config, configKey);
      const mLevelMap = new Map<string, number>();

      let nextLevel = 1;
      // 1. Daftarkan materi kurikulum kelas ini secara berurutan
      materiList.forEach((m) => {
        const key = norm(m.item.nama);
        if (!mLevelMap.has(key)) {
          mLevelMap.set(key, nextLevel++);
        }
      });

      // 2. Tambahkan materi dari logs santri ini berdasarkan urutan kemunculan tanggal
      const santriLogs = logs
        .filter((l) => String(l.no_induk).trim() === noInduk)
        .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));

      santriLogs.forEach((l) => {
        const key = norm(l.materi_nama);
        if (!mLevelMap.has(key)) {
          mLevelMap.set(key, nextLevel++);
        }
      });

      map.set(noInduk, mLevelMap);
    });

    return map;
  }, [parsedSantriList, config, logs]);

  // Bulan-bulan yang aktif ditampilkan berdasarkan multi-select
  const displayedMonths = useMemo(() => {
    return academicMonths.filter((m) => visibleMonthKeys.has(m.key));
  }, [academicMonths, visibleMonthKeys]);

  // Total kolom minggu yang tampil
  const totalSundayColumns = useMemo(() => {
    return displayedMonths.reduce((acc, m) => acc + m.sundays.length, 0);
  }, [displayedMonths]);

  // Handlers Filter Bulan
  const handleToggleMonth = (key: string) => {
    setVisibleMonthKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key); // Sisakan minimal 1 bulan
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAllMonths = () => {
    setVisibleMonthKeys(new Set(academicMonths.map((m) => m.key)));
  };

  const handleSelectGanjil = () => {
    setVisibleMonthKeys(
      new Set(academicMonths.filter((m) => m.semester === 'Ganjil').map((m) => m.key))
    );
  };

  const handleSelectGenap = () => {
    setVisibleMonthKeys(
      new Set(academicMonths.filter((m) => m.semester === 'Genap').map((m) => m.key))
    );
  };

  // Handler Klik Sel Interaktif
  const handleCellClick = (santri: ParsedSantri, sunday: SundayOption) => {
    const records = setoranLookupMap.get(`${santri.no_induk}_${sunday.tanggal}`) || [];
    setSelectedCell({
      santri,
      sunday,
      records,
    });
  };

  // Ekspor ke Berkas Excel (.xlsx) dengan struktur persis seperti Gambar 2
  const handleExportExcel = () => {
    // 1. Baris 1: Header Bulan
    const headerRow1: any[] = ['NO', 'NAMA', 'KELAS'];
    // 2. Baris 2: Sub-header Minggu
    const headerRow2: any[] = ['', '', ''];

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // NO
      { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // NAMA
      { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // KELAS
    ];

    let currentCol = 3;
    displayedMonths.forEach((m) => {
      headerRow1.push(`${m.monthName.toUpperCase()} ${m.year}`);
      for (let i = 1; i < m.sundays.length; i++) {
        headerRow1.push(''); // placeholder span
      }
      merges.push({
        s: { r: 0, c: currentCol },
        e: { r: 0, c: currentCol + m.sundays.length - 1 },
      });

      m.sundays.forEach((s) => {
        headerRow2.push(`Minggu ${s.mingguKe} (${s.dayNumber}/${m.monthIndex + 1})`);
      });

      currentCol += m.sundays.length;
    });

    // 3. Baris Data Santri
    const dataRows = displayedSantri.map((s, idx) => {
      const row: any[] = [idx + 1, s.nama, s.displayKelas];
      displayedMonths.forEach((m) => {
        m.sundays.forEach((sunday) => {
          const records = setoranLookupMap.get(`${s.no_induk}_${sunday.tanggal}`) || [];
          if (records.length > 0) {
            row.push(records.map((r) => r.item_hafalan).join(', '));
          } else {
            row.push('');
          }
        });
      });
      return row;
    });

    const worksheetData = [headerRow1, headerRow2, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    ws['!merges'] = merges;

    // Set Column Widths
    const colWidths = [{ wch: 6 }, { wch: 32 }, { wch: 18 }];
    for (let i = 3; i < currentCol; i++) {
      colWidths.push({ wch: 14 });
    }
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Linimasa Setoran');
    XLSX.writeFile(
      wb,
      `Linimasa_Setor_Santri_${activeTingkat}_${startYear}-${startYear + 1}.xlsx`
    );
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header Utama & Keterangan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <CalendarDays className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Linimasa Setor Santri
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Matriks linimasa setoran mingguan (hari Minggu) santri otomatis sesuai kalender riil,
            dengan urutan formasi kelas terintegrasi.
          </p>
        </div>

        {/* Toolbar Tahun Ajaran & Ekspor */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pemilih Tahun Ajaran */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Tahun Ajaran:</span>
            <select
              value={startYear}
              onChange={(e) => setStartYear(parseInt(e.target.value, 10))}
              className="bg-transparent font-bold text-emerald-800 outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y} / {y + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Ekspor Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            title="Download Excel format matriks silabus"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Switch Tab Tingkat (Semua, ULA, WUSTHO, ULYA) & Kontrol Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Switch Tingkat */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1 overflow-x-auto">
            {(['SEMUA', 'ULA', 'WUSTHO', 'ULYA'] as TingkatTab[]).map((tab) => {
              const isActive = activeTingkat === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTingkat(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{tab === 'SEMUA' ? 'Semua Tingkat' : tab}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tingkatCounts[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filter Pencarian & Filter Cepat */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Input Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari santri / NIS / kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-60 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium"
              />
            </div>

            {/* Filter Gender */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterGender('SEMUA')}
                className={`px-2 py-1 rounded-lg ${
                  filterGender === 'SEMUA'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-500'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterGender('PA')}
                className={`px-2 py-1 rounded-lg ${
                  filterGender === 'PA'
                    ? 'bg-sky-600 text-white shadow-2xs font-bold'
                    : 'text-slate-500'
                }`}
              >
                PA
              </button>
              <button
                type="button"
                onClick={() => setFilterGender('PI')}
                className={`px-2 py-1 rounded-lg ${
                  filterGender === 'PI'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-slate-500'
                }`}
              >
                PI
              </button>
            </div>

            {/* Tombol Buka Popover Multi-select Bulan */}
            <button
              type="button"
              onClick={() => setIsMonthFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                isMonthFilterOpen || visibleMonthKeys.size < 12
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Bulan ({visibleMonthKeys.size}/12)</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Panel Multi-Select Bulan (Dropdown / Collapse) */}
        {isMonthFilterOpen && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Pilih Bulan yang Ditampilkan:
                </span>
                <span className="text-[11px] text-slate-500">
                  (Default: 1 Tahun Penuh. Centang bulan untuk menyaring)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllMonths}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                >
                  Semua (12 Bulan)
                </button>
                <button
                  type="button"
                  onClick={handleSelectGanjil}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                >
                  Sem. Ganjil (Jul-Des)
                </button>
                <button
                  type="button"
                  onClick={handleSelectGenap}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-100 hover:bg-teal-200 text-teal-800"
                >
                  Sem. Genap (Jan-Jun)
                </button>
              </div>
            </div>

            {/* Checkbox Pills per Bulan */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {academicMonths.map((m) => {
                const isChecked = visibleMonthKeys.has(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => handleToggleMonth(m.key)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isChecked
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span>
                      {m.monthName} {m.year}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isChecked
                          ? 'bg-emerald-800 text-emerald-100'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.sundays.length} M
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Kontrol Pembatasan 3 Kelas */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>Menampilkan 3 Kelas:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeClasses.map((cls) => (
              <span
                key={cls}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
              >
                {cls}
              </span>
            ))}
            {activeClasses.length === 0 && (
              <span className="text-xs text-slate-400 italic">Tidak ada kelas</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Jump to Class Dropdown */}
          {distinctClasses.length > 0 && (
            <select
              value={activeClasses[0] || ''}
              onChange={(e) => {
                const targetClass = e.target.value;
                const idx = distinctClasses.indexOf(targetClass);
                if (idx >= 0) {
                  setClassPage(Math.floor(idx / CLASSES_PER_VIEW));
                }
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              {distinctClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Lompat ke: {cls}
                </option>
              ))}
            </select>
          )}

          {/* Prev / Next 3 Kelas Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentClassPage === 0}
              onClick={() => setClassPage((p) => Math.max(0, p - 1))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-colors"
              title="3 Kelas Sebelumnya"
            >
              ← Sebelumnya
            </button>
            <span className="text-xs font-semibold text-slate-500 px-1 font-mono">
              {currentClassPage + 1} / {totalClassPages}
            </span>
            <button
              type="button"
              disabled={currentClassPage >= totalClassPages - 1}
              onClick={() => setClassPage((p) => Math.min(totalClassPages - 1, p + 1))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-colors"
              title="3 Kelas Berikutnya"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Linimasa Matriks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Banner Status Tabel */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">{paginatedSantri.length} Santri</span>
            <span>•</span>
            <span className="text-slate-600">
              3 Kelas Terpilih dari total {distinctClasses.length} Kelas ({displayedSantri.length} Total Santri)
            </span>
            <span>•</span>
            <span>
              {displayedMonths.length} Bulan Aktif ({totalSundayColumns} Kolom Minggu)
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] flex-wrap">
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shadow-2xs" />
              <span>Hafalan Ke-1 (Hijau)</span>
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block shadow-2xs" />
              <span>Hafalan Ke-2 (Biru)</span>
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-700 inline-block shadow-2xs" />
              <span>Hafalan Ke-3+ (Biru Tua)</span>
            </span>
            <span className="flex items-center gap-1 font-medium text-cyan-800">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-700 inline-block shadow-2xs" />
              <span>Tahfidz (Juz)</span>
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 inline-block" />
              <span>Belum Setor (Putih)</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-slate-400 italic">Klik sel untuk detail/input setoran</span>
          </div>
        </div>

        {/* Container Tabel dengan Horizontal & Vertical Scroll */}
        <div className="overflow-x-auto max-h-[75vh] relative">
          <table className="w-full text-left text-xs border-collapse">
            {/* Multi-Level Sticky Header */}
            <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 z-30 select-none shadow-xs">
              {/* Tingkat 1: Bulan Header */}
              <tr className="border-b border-slate-200">
                {/* Kolom Beku (Sticky Columns di Kiri) */}
                <th
                  rowSpan={2}
                  className="py-2.5 px-2 text-center w-12 sticky left-0 z-40 bg-slate-100 border-r border-slate-200"
                >
                  NO
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 w-56 sticky left-12 z-40 bg-slate-100 border-r border-slate-200 whitespace-nowrap"
                >
                  NAMA SANTRI
                </th>
                <th
                  rowSpan={2}
                  className="py-2.5 px-3 w-32 sticky left-68 z-40 bg-slate-100 border-r border-slate-300 whitespace-nowrap"
                >
                  KELAS
                </th>

                {/* Kolom Bulan Bertingkat (colSpan dinamis 4 atau 5 Minggu) */}
                {displayedMonths.map((m) => (
                  <th
                    key={m.key}
                    colSpan={m.sundays.length}
                    className="py-2 px-2 text-center border-r border-slate-300 bg-emerald-800 text-white font-bold tracking-wide"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>
                        {m.monthName.toUpperCase()} {m.year}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-emerald-100 font-mono">
                        {m.sundays.length} Minggu
                      </span>
                    </div>
                  </th>
                ))}
              </tr>

              {/* Tingkat 2: Sub-Header Hari Minggu (Minggu 1, Minggu 2, ...) */}
              <tr className="border-b border-slate-300 bg-slate-50 text-[11px] text-slate-700">
                {displayedMonths.map((m) =>
                  m.sundays.map((s) => (
                    <th
                      key={s.tanggal}
                      className={`py-1.5 px-1.5 text-center min-w-[70px] border-r border-slate-200 ${
                        s.isCurrentWeek ? 'bg-amber-100/60 font-bold text-amber-900' : ''
                      }`}
                      title={s.labelLengkap}
                    >
                      <div className="font-bold">M{s.mingguKe}</div>
                      <div className="text-[10px] text-slate-500 font-mono font-normal">
                        {s.dayNumber}/{m.monthIndex + 1}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>

            {/* Body Data Santri (Dibatasi 3 Kelas Saja, Urutan Sesuai Gambar 3) */}
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedSantri.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + totalSundayColumns}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    {loadingSantri
                      ? 'Memuat data santri madrasah...'
                      : 'Tidak ada data santri pada kelas ini.'}
                  </td>
                </tr>
              ) : (
                paginatedSantri.map((santri, idx) => {
                  const isNewClass =
                    idx === 0 || santri.displayKelas !== paginatedSantri[idx - 1].displayKelas;
                  const countInClass = paginatedSantri.filter(
                    (s) => s.displayKelas === santri.displayKelas
                  ).length;

                  return (
                    <React.Fragment key={santri.no_induk || idx}>
                      {isNewClass && (
                        <tr className="bg-slate-100 border-y border-slate-300">
                          <td
                            colSpan={3 + totalSundayColumns}
                            className="py-1.5 px-3 font-bold text-slate-800 text-xs tracking-tight sticky left-0 z-20"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-3.5 bg-emerald-600 rounded-sm" />
                              <span>Kelas: {santri.displayKelas}</span>
                              <span className="text-[11px] text-slate-500 font-normal font-mono">
                                ({countInClass} Santri)
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-emerald-50/30 transition-colors group">
                      {/* Kolom 1: No Urut (Sticky Left) */}
                      <td className="py-2 px-2 text-center sticky left-0 z-20 bg-white group-hover:bg-emerald-50/50 border-r border-slate-200 text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Kolom 2: Nama Santri (Sticky Left) */}
                      <td className="py-2 px-3 sticky left-12 z-20 bg-white group-hover:bg-emerald-50/50 border-r border-slate-200">
                        <div className="font-bold text-slate-900 truncate max-w-[200px]">
                          {santri.nama}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          NIS: {santri.no_induk}
                        </div>
                      </td>

                      {/* Kolom 3: Kelas (Sticky Left) */}
                      <td className="py-2 px-3 sticky left-68 z-20 bg-white group-hover:bg-emerald-50/50 border-r border-slate-300">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {santri.displayKelas}
                        </span>
                      </td>

                      {/* Sel-Sel Pertemuan Hari Minggu (Interaktif dengan Gradasi Warna Multi-Hafalan) */}
                      {displayedMonths.map((m) =>
                        m.sundays.map((sunday) => {
                          const records =
                            setoranLookupMap.get(`${santri.no_induk}_${sunday.tanggal}`) || [];
                          const hasSetoran = records.length > 0;

                          // Cek apakah ada setoran Tahfidz & setoran Wajib/lainnya
                          const tahfidzRecord = records.find(
                            (r) => r.kategori === 'Tahfidz' || (r.materi_nama && r.materi_nama.toLowerCase().startsWith('juz '))
                          );
                          const nonTahfidzRecords = records.filter((r) => r !== tahfidzRecord);

                          // Ekstrak angka juz jika ada
                          let juzNumber: string | null = null;
                          if (tahfidzRecord) {
                            const match = (tahfidzRecord.materi_nama || tahfidzRecord.item_hafalan || '').match(/\d+/);
                            juzNumber = match ? match[0] : 'T';
                          }

                          // Hitung tingkat materi tertinggi yang disetorkan pada hari Minggu ini
                          let maxLevel = 0;
                          if (hasSetoran) {
                            const sMap = santriMateriLevelMap.get(santri.no_induk);
                            records.forEach((r) => {
                              const matKey = norm(r.materi_nama || r.item_hafalan || '');
                              const lvl = sMap?.get(matKey) || 1;
                              if (lvl > maxLevel) maxLevel = lvl;
                            });
                            if (maxLevel === 0) maxLevel = 1;
                          }

                          const levelStyle = getHafalanLevelStyle(maxLevel);
                          const isTahfidzOnly = Boolean(tahfidzRecord && nonTahfidzRecords.length === 0);
                          const isDual = Boolean(tahfidzRecord && nonTahfidzRecords.length > 0);

                          return (
                            <td
                              key={sunday.tanggal}
                              onClick={() => handleCellClick(santri, sunday)}
                              className={`py-1.5 px-1 text-center border-r border-slate-100 cursor-pointer transition-all hover:ring-2 hover:ring-inset ${
                                isDual
                                  ? 'bg-gradient-to-r from-cyan-50 to-emerald-50 hover:ring-cyan-500'
                                  : isTahfidzOnly
                                  ? 'bg-cyan-50/80 hover:bg-cyan-100/70 hover:ring-cyan-500'
                                  : hasSetoran
                                  ? `${levelStyle.cellBg} ${levelStyle.ringColor}`
                                  : 'bg-white hover:bg-slate-100/60 hover:ring-emerald-500'
                              }`}
                              title={
                                hasSetoran
                                  ? `${sunday.labelLengkap}\nSetoran: ${records
                                      .map((r) => r.materi_nama || r.item_hafalan)
                                      .join(', ')} (Klik untuk detail)`
                                  : `${sunday.labelLengkap}\nBelum ada setoran (Klik untuk input)`
                              }
                            >
                              {hasSetoran ? (
                                <div className="inline-flex flex-col items-center justify-center">
                                  {isDual ? (
                                    /* Dual Badge: Ada Tahfidz DAN Hafalan Kurikulum/Sunnah */
                                    <div className="flex items-center gap-0.5" title={`Tahfidz Juz ${juzNumber} + Hafalan Kurikulum`}>
                                      <span className="inline-flex items-center justify-center px-1 h-5 rounded-md font-bold text-[10px] bg-cyan-700 text-white shadow-2xs">
                                        J{juzNumber}
                                      </span>
                                      <span
                                        className={`inline-flex items-center justify-center w-5 h-5 rounded-md font-bold text-[10px] shadow-2xs ${levelStyle.badgeBg} ${levelStyle.badgeText}`}
                                      >
                                        ✓
                                      </span>
                                    </div>
                                  ) : isTahfidzOnly ? (
                                    /* Setoran Tahfidz Saja */
                                    <span
                                      className="inline-flex items-center justify-center w-6 h-6 rounded-lg font-bold text-xs bg-cyan-700 text-white shadow-2xs"
                                      title={`Setoran Tahfidz: Juz ${juzNumber}`}
                                    >
                                      J{juzNumber}
                                    </span>
                                  ) : (
                                    /* Setoran Reguler (Hijau/Biru/Biru Tua) */
                                    <span
                                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg font-bold text-xs shadow-2xs ${levelStyle.badgeBg} ${levelStyle.badgeText}`}
                                    >
                                      ✓
                                    </span>
                                  )}
                                  {records.length > 2 && (
                                    <span className="text-[9px] font-bold text-slate-700 font-mono mt-0.5">
                                      {records.length}x
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-block w-4 h-4 rounded text-slate-300 group-hover:text-slate-400 font-bold text-xs">
                                  -
                                </span>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  </React.Fragment>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Interaktif Setoran Per-Minggu */}
      {selectedCell && (
        <ModalInputSetorMinggu
          isOpen={Boolean(selectedCell)}
          onClose={() => setSelectedCell(null)}
          santri={selectedCell.santri}
          sunday={selectedCell.sunday}
          existingRecords={selectedCell.records}
          onSuccess={() => {
            fetchMustahiqData();
            fetchSetoranData();
            // Re-fetch records untuk sel yang sedang aktif
            setTimeout(() => {
              const updated =
                setoranLookupMap.get(
                  `${selectedCell.santri.no_induk}_${selectedCell.sunday.tanggal}`
                ) || [];
              setSelectedCell((prev) => (prev ? { ...prev, records: updated } : null));
            }, 300);
          }}
        />
      )}
    </div>
  );
}
