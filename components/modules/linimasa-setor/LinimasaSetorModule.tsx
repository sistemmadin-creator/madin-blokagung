'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalendarDays,
  Calendar,
  Search,
  Download,
  ChevronDown,
  SlidersHorizontal,
  Clock,
  BookOpen,
  Table2,
  CalendarOff,
  ZoomIn,
  ZoomOut,
  Minimize2,
  Maximize2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { exportAoaToExcel, ExcelMergeRange } from '@/lib/utils/excel';
import { useSantriStore } from '@/stores/useSantriStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useTahunAjaranStore, parseStartYearFromTA } from '@/stores/useTahunAjaranStore';
import {
  AcademicMonthInfo,
  formatMonthMinimizedLabel,
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
import {
  getDaftarTingkatKelasDiniyyah,
  norm,
  normalizeTingkatKey,
} from '@/lib/utils/setoranHelper';
import { evaluateAllSantriSilabusStatus } from '@/lib/utils/silabusHelper';
import { SetoranHafalan } from '@/types/setoran';
import ModalInputSetorMinggu from './ModalInputSetorMinggu';
import ModalAturSilabus, { ACADEMIC_MONTHS } from './ModalAturSilabus';
import SilabusScheduleView, { exportSilabusToExcel } from './SilabusScheduleView';

type TingkatTab = 'SEMUA' | 'ULA' | 'WUSTHO' | 'ULYA';
type LinimasaViewMode = 'matriks' | 'silabus';
type MatrixZoomPreset = 3 | 6 | 9 | 12;
const ZOOM_PRESETS: MatrixZoomPreset[] = [3, 6, 9, 12];
const LS_LINIMASA_VIEW_MODE = 'madin_linimasa_view_mode_v1';
const LS_LINIMASA_ZOOM_MONTHS = 'madin_linimasa_zoom_months_v1';
const LS_LINIMASA_CLASSES_PER_VIEW = 'madin_linimasa_classes_per_view_v1';
const LS_LINIMASA_MINIMIZED_MONTHS = 'madin_linimasa_minimized_months_v1';

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
  const { config, silabusConfig, silabusHolidays, setoranList, fetchSetoranData } =
    useMuhafadzohStore();
  const { logs, activeStates, fetchMustahiqData } = useSetorMustahiqStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { activeTahunAjaran, fetchGlobalTahunAjaran } = useTahunAjaranStore();

  // Tahun awal ajaran (sinkron dengan Tahun Ajaran aktif global)
  const [startYear, setStartYear] = useState<number>(() =>
    parseStartYearFromTA(activeTahunAjaran)
  );
  const [hasCustomStartYear, setHasCustomStartYear] = useState<boolean>(false);

  useEffect(() => {
    if (!hasCustomStartYear && activeTahunAjaran) {
      setStartYear(parseStartYearFromTA(activeTahunAjaran));
    }
  }, [activeTahunAjaran, hasCustomStartYear]);

  // Switch 2 Mode: Matriks Setoran vs Silabus
  const [viewMode, setViewMode] = useState<LinimasaViewMode>('matriks');

  // State untuk Zoom Tabel Matriks (Panah Merah: 3 | 6 | 9 | 12 bulan),
  // Jumlah Kelas per Tampilan (Panah Hitam: default 3), dan Minimize Minggu Bulan (Panah Hijau)
  const [matrixZoomMonths, setMatrixZoomMonths] = useState<MatrixZoomPreset>(3);
  const [classesPerView, setClassesPerView] = useState<number>(3);
  const [isEditClassesOpen, setIsEditClassesOpen] = useState<boolean>(false);
  const [classesInputDraft, setClassesInputDraft] = useState<string>('3');
  const [minimizedMonthKeys, setMinimizedMonthKeys] = useState<Set<string>>(() => new Set());
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [tableContainerWidth, setTableContainerWidth] = useState<number>(0);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LS_LINIMASA_VIEW_MODE);
      if (saved === 'matriks' || saved === 'silabus') {
        setViewMode(saved);
      }
      const savedZoom = Number(window.localStorage.getItem(LS_LINIMASA_ZOOM_MONTHS));
      if (savedZoom === 3 || savedZoom === 6 || savedZoom === 9 || savedZoom === 12) {
        setMatrixZoomMonths(savedZoom);
      }
      const savedClasses = parseInt(
        window.localStorage.getItem(LS_LINIMASA_CLASSES_PER_VIEW) || '',
        10
      );
      if (Number.isFinite(savedClasses) && savedClasses >= 1) {
        setClassesPerView(savedClasses);
        setClassesInputDraft(String(savedClasses));
      }
      const savedMin = window.localStorage.getItem(LS_LINIMASA_MINIMIZED_MONTHS);
      if (savedMin) {
        const arr = JSON.parse(savedMin);
        if (Array.isArray(arr)) {
          setMinimizedMonthKeys(new Set(arr.filter((x) => typeof x === 'string')));
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateWidth = () => {
      if (el.clientWidth > 0) setTableContainerWidth(el.clientWidth);
    };
    updateWidth();
    const obs = new ResizeObserver(updateWidth);
    obs.observe(el);
    return () => obs.disconnect();
  }, [viewMode]);

  const handleChangeZoomPreset = (preset: MatrixZoomPreset) => {
    setMatrixZoomMonths(preset);
    try {
      window.localStorage.setItem(LS_LINIMASA_ZOOM_MONTHS, String(preset));
    } catch {}
  };

  const handleZoomIn = () => {
    const idx = ZOOM_PRESETS.indexOf(matrixZoomMonths);
    if (idx > 0) handleChangeZoomPreset(ZOOM_PRESETS[idx - 1]);
  };

  const handleZoomOut = () => {
    const idx = ZOOM_PRESETS.indexOf(matrixZoomMonths);
    if (idx >= 0 && idx < ZOOM_PRESETS.length - 1) {
      handleChangeZoomPreset(ZOOM_PRESETS[idx + 1]);
    }
  };

  const updateClassesPerView = (nextCount: number, maxAllowed: number) => {
    const clamped = Math.max(1, Math.min(Math.max(1, maxAllowed), Math.round(nextCount)));
    setClassesPerView(clamped);
    setClassesInputDraft(String(clamped));
    setClassPage(0);
    setIsEditClassesOpen(false);
    try {
      window.localStorage.setItem(LS_LINIMASA_CLASSES_PER_VIEW, String(clamped));
    } catch {}
  };

  const handleToggleMinimizeMonth = (monthKey: string) => {
    setMinimizedMonthKeys((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      try {
        window.localStorage.setItem(
          LS_LINIMASA_MINIMIZED_MONTHS,
          JSON.stringify(Array.from(next))
        );
      } catch {}
      return next;
    });
  };

  const handleMinimizeAllMonths = (monthsToMin: AcademicMonthInfo[]) => {
    const next = new Set(monthsToMin.map((m) => m.key));
    setMinimizedMonthKeys(next);
    try {
      window.localStorage.setItem(
        LS_LINIMASA_MINIMIZED_MONTHS,
        JSON.stringify(Array.from(next))
      );
    } catch {}
  };

  const handleExpandAllMonths = () => {
    setMinimizedMonthKeys(new Set());
    try {
      window.localStorage.setItem(LS_LINIMASA_MINIMIZED_MONTHS, JSON.stringify([]));
    } catch {}
  };

  const handleChangeViewMode = (mode: LinimasaViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(LS_LINIMASA_VIEW_MODE, mode);
    } catch {}
  };

  // Switch Tingkat (Semua, ULA, WUSTHO, ULYA)
  const [activeTingkat, setActiveTingkat] = useState<TingkatTab>('SEMUA');

  // Modal Atur Silabus Target Hafalan
  const [isModalSilabusOpen, setIsModalSilabusOpen] = useState<boolean>(false);
  // Bulan acuan evaluasi: 'auto' (sesuai waktu saat ini) atau 0..11 (Juli s.d Juni)
  const [evalMonthOverride, setEvalMonthOverride] = useState<number | 'auto'>('auto');
  // Filter stabilo silabus
  const [filterSilabusStatus, setFilterSilabusStatus] = useState<'SEMUA' | 'MERAH' | 'KUNING' | 'PUTIH'>('SEMUA');

  // Multi-select Filter Bulan yang Ditampilkan
  // Default: Seluruh 12 bulan (1 tahun penuh) aktif
  const academicMonths = useMemo(() => getAcademicYearMonths(startYear), [startYear]);
  const [visibleMonthKeys, setVisibleMonthKeys] = useState<Set<string>>(() => {
    const initialMonths = getAcademicYearMonths(parseStartYearFromTA(activeTahunAjaran));
    return new Set(initialMonths.map((m) => m.key));
  });

  // Sync bulan jika startYear berubah
  useEffect(() => {
    setVisibleMonthKeys(new Set(academicMonths.map((m) => m.key)));
  }, [academicMonths]);

  // Data liburan global untuk Tahun Ajaran aktif
  const taKey = `${startYear}/${startYear + 1}`;
  const holidaysForTA = useMemo(
    () => silabusHolidays?.[taKey] || {},
    [silabusHolidays, taKey]
  );

  // Daftar kelas-tingkat untuk tampilan mode Silabus
  const allKelasPairs = useMemo(
    () => getDaftarTingkatKelasDiniyyah(formasiList, santriList),
    [formasiList, santriList]
  );

  const filteredSilabusPairs = useMemo(() => {
    if (activeTingkat === 'SEMUA') return allKelasPairs;
    return allKelasPairs.filter((p) => normalizeTingkatKey(p.tk) === activeTingkat);
  }, [allKelasPairs, activeTingkat]);

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
    fetchGlobalTahunAjaran();
    if (santriList.length === 0) fetchSantri();
    if (setoranList.length === 0) fetchSetoranData();
    if (formasiList.length === 0) fetchFormasi();
    if (logs.length === 0) fetchMustahiqData();
  }, [
    santriList.length,
    setoranList.length,
    formasiList.length,
    logs.length,
    fetchGlobalTahunAjaran,
    fetchSantri,
    fetchSetoranData,
    fetchFormasi,
    fetchMustahiqData,
  ]);

  // Parsing & Normalisasi Seluruh Data Santri
  const parsedSantriList = useMemo(() => {
    return santriList.map(parseSantri);
  }, [santriList]);

  // Indeks Bulan Kalender Akademik Saat Ini (0 = Juli s/d 11 = Juni)
  const currentAcademicMonthIndex = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0 = Jan, 6 = Jul, 11 = Des

    if (y === startYear) {
      if (m >= 6) return m - 6; // Juli(6) -> 0, ..., Des(11) -> 5
      return 0; // Awal tahun ajaran
    } else if (y === startYear + 1) {
      if (m <= 5) return m + 6; // Jan(0) -> 6, ..., Jun(5) -> 11
      return 11; // Akhir tahun ajaran
    } else if (y < startYear) {
      return 0;
    } else {
      return 11;
    }
  }, [startYear]);

  // Bulan Efektif yang Digunakan untuk Evaluasi Silabus Santri
  const effectiveEvalMonthIndex = useMemo(() => {
    if (evalMonthOverride === 'auto') return currentAcademicMonthIndex;
    return evalMonthOverride;
  }, [evalMonthOverride, currentAcademicMonthIndex]);

  // Evaluasi Status Kepatuhan Silabus Target per Santri: Map<no_induk, { status: 'merah' | 'kuning' | 'putih'; reason: string; item: string }>
  const santriSilabusStatusMap = useMemo(() => {
    return evaluateAllSantriSilabusStatus({
      santriList: parsedSantriList,
      config,
      silabusConfig,
      holidaysMap: holidaysForTA,
      activeStates,
      logs,
      setoranList,
      startYear,
      targetMonth: effectiveEvalMonthIndex,
      isAutoEvalMonth: evalMonthOverride === 'auto',
    });
  }, [
    parsedSantriList,
    silabusConfig,
    holidaysForTA,
    activeStates,
    logs,
    config,
    setoranList,
    startYear,
    effectiveEvalMonthIndex,
    evalMonthOverride,
  ]);

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
      // 4. Filter Status Stabilo Silabus
      if (filterSilabusStatus !== 'SEMUA') {
        const stat = santriSilabusStatusMap.get(s.no_induk)?.status || 'putih';
        if (stat.toUpperCase() !== filterSilabusStatus) return false;
      }
      return true;
    });

    // Urutkan menggunakan algoritma Formasi Kelas (Gambar 3)
    return sortSantriByFormasiHierarchy(filtered);
  }, [parsedSantriList, activeTingkat, filterGender, searchQuery, filterSilabusStatus, santriSilabusStatusMap]);

  // Pagination jumlah kelas dinamis (default: 3 kelas, dapat diklik & diubah sendiri)
  const [classPage, setClassPage] = useState<number>(0);

  // Reset pagination kelas bila filter berubah
  useEffect(() => {
    setClassPage(0);
  }, [activeTingkat, filterGender, searchQuery, filterSilabusStatus]);

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

  const effectiveClassesPerView = Math.max(1, classesPerView);
  const totalClassPages = Math.ceil(distinctClasses.length / effectiveClassesPerView) || 1;
  const currentClassPage = Math.min(classPage, Math.max(0, totalClassPages - 1));

  // Kelas yang sedang aktif ditampilkan sesuai classesPerView
  const activeClasses = useMemo(() => {
    const startIdx = currentClassPage * effectiveClassesPerView;
    return distinctClasses.slice(startIdx, startIdx + effectiveClassesPerView);
  }, [distinctClasses, currentClassPage, effectiveClassesPerView]);

  const activeClassSet = useMemo(() => new Set(activeClasses), [activeClasses]);

  // Santri yang dibatasi hanya dari kelas aktif tersebut
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

  // Total kolom minggu penuh (untuk informasi ringkasan)
  const totalSundayColumns = useMemo(() => {
    return displayedMonths.reduce((acc, m) => acc + m.sundays.length, 0);
  }, [displayedMonths]);

  // Total kolom aktual yang dirender (bulan ter-minimize dihitung 1 kolom)
  const totalVisibleMatrixColumns = useMemo(() => {
    return displayedMonths.reduce(
      (acc, m) => acc + (minimizedMonthKeys.has(m.key) ? 1 : m.sundays.length),
      0
    );
  }, [displayedMonths, minimizedMonthKeys]);

  // Dimensi adaptif tabel matriks berdasarkan preset zoom (3 | 6 | 9 | 12 Bulan) & lebar kontainer
  const zoomMetrics = useMemo(() => {
    const isNarrowViewport = tableContainerWidth > 0 && tableContainerWidth < 640;
    const containerW = tableContainerWidth > 0 ? tableContainerWidth : 980;

    let noW = 44;
    let namaW = 216;
    let kelasW = 120;
    let targetCols = 13;
    let minWeekW = 54;
    let density: 'normal' | 'compact' | 'dense' | 'micro' = 'normal';

    if (matrixZoomMonths === 6) {
      noW = 36;
      namaW = 172;
      kelasW = 98;
      targetCols = 26;
      minWeekW = 28;
      density = 'compact';
    } else if (matrixZoomMonths === 9) {
      noW = 30;
      namaW = 148;
      kelasW = 86;
      targetCols = 39;
      minWeekW = 20;
      density = 'dense';
    } else if (matrixZoomMonths === 12) {
      noW = 26;
      namaW = 128;
      kelasW = 74;
      targetCols = Math.max(1, totalVisibleMatrixColumns);
      minWeekW = 13;
      density = 'micro';
    }

    if (isNarrowViewport) {
      noW = Math.min(noW, 28);
      namaW = Math.min(namaW, 128);
      kelasW = Math.min(kelasW, 74);
    }

    const stickyTotal = noW + namaW + kelasW;
    const availW = Math.max(220, containerW - stickyTotal);
    const weekColW = Math.max(minWeekW, Math.floor(availW / targetCols));
    const minMonthColW = Math.max(
      weekColW,
      density === 'micro' ? 40 : density === 'dense' ? 48 : 58
    );

    return {
      noW,
      namaW,
      kelasW,
      leftNama: noW,
      leftKelas: noW + namaW,
      weekColW,
      minMonthColW,
      density,
    };
  }, [matrixZoomMonths, tableContainerWidth, totalVisibleMatrixColumns]);

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

  const handleSelectCurrentMonthOnly = () => {
    const target = academicMonths[currentAcademicMonthIndex];
    if (target) {
      setVisibleMonthKeys(new Set([target.key]));
    }
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

  // Handler Klik Sel Bulan yang Ter-Minimize (langsung buka Modal dengan SundayDatePicker pada bulan tsb)
  const handleMinimizedMonthCellClick = (santri: ParsedSantri, month: AcademicMonthInfo) => {
    if (!month.sundays || month.sundays.length === 0) return;
    const withRecord = month.sundays.find(
      (s) => (setoranLookupMap.get(`${santri.no_induk}_${s.tanggal}`) || []).length > 0
    );
    const nonHoliday = month.sundays.find((s) => !holidaysForTA[s.tanggal]);
    const targetSunday = withRecord || nonHoliday || month.sundays[0];
    handleCellClick(santri, targetSunday);
  };

  // Ekspor ke Berkas Excel (.xlsx): Mode Matriks vs Mode Silabus
  const handleExportExcel = async () => {
    if (viewMode === 'silabus') {
      await exportSilabusToExcel({
        pairs: filteredSilabusPairs,
        config,
        silabusConfig,
        holidaysMap: holidaysForTA,
        startYear,
        visibleMonthKeys,
        activeTingkat,
      });
      return;
    }
    // 1. Baris 1: Header Bulan
    const headerRow1: any[] = ['NO', 'NAMA', 'KELAS'];
    // 2. Baris 2: Sub-header Minggu
    const headerRow2: any[] = ['', '', ''];

    const merges: ExcelMergeRange[] = [
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
    const colWidths = [6, 32, 18];
    for (let i = 3; i < currentCol; i++) {
      colWidths.push(14);
    }

    await exportAoaToExcel({
      filename: `Linimasa_Setor_Santri_${activeTingkat}_${startYear}-${startYear + 1}.xlsx`,
      sheets: [
        {
          name: 'Linimasa Setoran',
          rows: worksheetData,
          merges,
          colWidths,
        },
      ],
    });
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

        {/* Toolbar Switch 2 Mode, Tahun Ajaran, Bulan Acuan, Atur Silabus & Ekspor */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch 2 Mode: Matriks Setoran | Silabus */}
          <div
            role="group"
            aria-label="Mode tampilan Linimasa Setor"
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1"
          >
            <button
              type="button"
              onClick={() => handleChangeViewMode('matriks')}
              aria-pressed={viewMode === 'matriks'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'matriks'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Matriks Setoran</span>
            </button>
            <button
              type="button"
              onClick={() => handleChangeViewMode('silabus')}
              aria-pressed={viewMode === 'silabus'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'silabus'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Silabus</span>
            </button>
          </div>

          {/* Pemilih Tahun Ajaran */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Tahun Ajaran:</span>
            <select
              value={startYear}
              onChange={(e) => {
                setHasCustomStartYear(true);
                setStartYear(parseInt(e.target.value, 10));
              }}
              className="bg-transparent font-bold text-emerald-800 outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y} / {y + 1}
                </option>
              ))}
            </select>
          </div>

          {/* Pemilih Bulan Acuan Evaluasi Silabus */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
            title="Bulan acuan untuk mengevaluasi apakah target hafalan santri sudah lewat atau tertinggal (merah), sesuai target di bulan capaian (kuning), atau belum masuk jadwal / selesai (putih)"
          >
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>Bulan Acuan:</span>
            <select
              value={evalMonthOverride}
              onChange={(e) =>
                setEvalMonthOverride(
                  e.target.value === 'auto' ? 'auto' : parseInt(e.target.value, 10)
                )
              }
              className="bg-transparent font-bold text-emerald-800 outline-none cursor-pointer"
            >
              <option value="auto">
                Otomatis ({ACADEMIC_MONTHS[currentAcademicMonthIndex]?.name || 'Berjalan'})
              </option>
              {ACADEMIC_MONTHS.map((m) => (
                <option key={m.index} value={m.index}>
                  Bulan {m.name} ({m.semester})
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Atur Silabus Target */}
          <button
            type="button"
            onClick={() => setIsModalSilabusOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Buka pop-up untuk mengatur silabus target hafalan (Wajib & Sunnah), target mingguan angka, serta minggu liburan"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Atur Silabus</span>
          </button>

          {/* Tombol Ekspor Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            title={
              viewMode === 'silabus'
                ? 'Download Excel jadwal silabus per kelas'
                : 'Download Excel format matriks linimasa setoran'
            }
          >
            <Download className="w-4 h-4" />
            <span>{viewMode === 'silabus' ? 'Export Silabus' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Switch Tab Tingkat (Semua, ULA, WUSTHO, ULYA) & Kontrol Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Switch Tingkat */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1 overflow-x-auto shrink-0">
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
            {viewMode === 'matriks' && (
              <>
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

                {/* Filter Status Stabilo Silabus */}
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200 text-xs">
                  <span className="text-[11px] font-semibold text-slate-500">Stabilo:</span>
                  <select
                    value={filterSilabusStatus}
                    onChange={(e) => setFilterSilabusStatus(e.target.value as any)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer text-xs"
                    title="Filter baris santri berdasarkan status stabilo silabus"
                  >
                    <option value="SEMUA">Semua Santri</option>
                    <option value="MERAH">Melewati Target / Tertinggal (Merah)</option>
                    <option value="KUNING">Bulan Capaian (Kuning)</option>
                    <option value="PUTIH">Aman / Selesai (Putih)</option>
                  </select>
                </div>
              </>
            )}

            {/* Bar Zoom Tabel Matriks (Panah Merah: 3 Bln | 6 Bln | 9 Bln | 12 Bln + - / +) */}
            {viewMode === 'matriks' && (
              <div
                role="group"
                aria-label="Zoom tampilan tabel matriks"
                className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 gap-0.5"
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={matrixZoomMonths === 12}
                  title="Perkecil tabel (Zoom Out menuju 12 Bulan)"
                  aria-label="Zoom Out tabel"
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-white disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                {ZOOM_PRESETS.map((preset) => {
                  const isActive = matrixZoomMonths === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleChangeZoomPreset(preset)}
                      aria-pressed={isActive}
                      title={
                        preset === 3
                          ? 'Zoom In Maksimal (tampak ~3 Bulan)'
                          : preset === 12
                          ? 'Zoom Out Maksimal (tampak hingga 12 Bulan)'
                          : `Tampilan sedang (~${preset} Bulan)`
                      }
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                      }`}
                    >
                      {preset} Bln
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={matrixZoomMonths === 3}
                  title="Perbesar tabel (Zoom In menuju 3 Bulan)"
                  aria-label="Zoom In tabel"
                  className="p-1.5 rounded-lg text-slate-700 hover:bg-white disabled:opacity-35 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Tombol Buka Popover Multi-select Bulan */}
            <button
              type="button"
              onClick={() => setIsMonthFilterOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllMonths}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                >
                  Semua (12 Bulan)
                </button>
                <button
                  type="button"
                  onClick={handleSelectCurrentMonthOnly}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 cursor-pointer"
                >
                  Bulan Ini ({ACADEMIC_MONTHS[currentAcademicMonthIndex]?.name})
                </button>
                <button
                  type="button"
                  onClick={handleSelectGanjil}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                >
                  Sem. Ganjil (Jul-Des)
                </button>
                <button
                  type="button"
                  onClick={handleSelectGenap}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-100 hover:bg-teal-200 text-teal-800 cursor-pointer"
                >
                  Sem. Genap (Jan-Jun)
                </button>
                {viewMode === 'matriks' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMinimizeAllMonths(displayedMonths)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 cursor-pointer"
                    >
                      Minimize Semua Minggu
                    </button>
                    {minimizedMonthKeys.size > 0 && (
                      <button
                        type="button"
                        onClick={handleExpandAllMonths}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                      >
                        Tampilkan Semua Minggu
                      </button>
                    )}
                  </>
                )}
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
                    <span className="truncate">
                      {m.monthName} {m.year}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono whitespace-nowrap shrink-0 ${
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

      {viewMode === 'silabus' ? (
        <SilabusScheduleView
          pairs={filteredSilabusPairs}
          config={config}
          silabusConfig={silabusConfig}
          holidaysMap={holidaysForTA}
          startYear={startYear}
          visibleMonthKeys={visibleMonthKeys}
          onOpenAturSilabus={() => setIsModalSilabusOpen(true)}
        />
      ) : (
        <>
          {/* Kontrol Pembatasan Kelas Dinamis (Panah Hitam: default 3, dapat diklik & diubah) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {!isEditClassesOpen ? (
            <button
              type="button"
              onClick={() => {
                setClassesInputDraft(String(effectiveClassesPerView));
                setIsEditClassesOpen(true);
              }}
              title="Klik untuk menentukan sendiri jumlah kelas yang ingin ditampilkan"
              className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-emerald-50 hover:text-emerald-800 border border-transparent hover:border-emerald-200 transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="underline decoration-dashed decoration-slate-400 underline-offset-4">
                Menampilkan {effectiveClassesPerView} Kelas:
              </span>
              <Pencil className="w-3 h-3 text-slate-400" />
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = parseInt(classesInputDraft, 10);
                updateClassesPerView(
                  Number.isFinite(parsed) ? parsed : 3,
                  Math.max(1, distinctClasses.length)
                );
              }}
              className="inline-flex items-center gap-1.5 flex-wrap bg-emerald-50/70 border border-emerald-300 rounded-xl px-2.5 py-1"
            >
              <span className="text-xs font-bold text-emerald-950">Tampilkan</span>
              <input
                type="number"
                autoFocus
                min={1}
                max={Math.max(1, distinctClasses.length)}
                value={classesInputDraft}
                onChange={(e) => setClassesInputDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsEditClassesOpen(false);
                  }
                }}
                aria-label="Jumlah kelas yang ditampilkan"
                className="w-16 h-7 px-2 rounded-lg border border-emerald-400 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <span className="text-xs font-bold text-emerald-950">
                / {distinctClasses.length} Kelas
              </span>
              {[
                { label: '3', val: 3 },
                { label: '6', val: 6 },
                { label: '10', val: 10 },
                { label: 'Semua', val: Math.max(1, distinctClasses.length) },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    updateClassesPerView(preset.val, Math.max(1, distinctClasses.length))
                  }
                  className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold text-emerald-800 cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="submit"
                aria-label="Terapkan jumlah kelas"
                className="p-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
                title="Terapkan"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditClassesOpen(false)}
                aria-label="Batal ubah jumlah kelas"
                className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Batal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

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
                  setClassPage(Math.floor(idx / effectiveClassesPerView));
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

          {/* Prev / Next Kelas Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentClassPage === 0}
              onClick={() => setClassPage((p) => Math.max(0, p - 1))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition-colors"
              title={`${effectiveClassesPerView} Kelas Sebelumnya`}
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
              title={`${effectiveClassesPerView} Kelas Berikutnya`}
            >
              Berikutnya →
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Linimasa Matriks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Banner Status Tabel */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900">{paginatedSantri.length} Santri</span>
            <span>•</span>
            <span className="text-slate-600">
              {activeClasses.length} Kelas Terpilih dari total {distinctClasses.length} Kelas ({displayedSantri.length} Total Santri)
            </span>
            <span>•</span>
            <span>
              {displayedMonths.length} Bulan Aktif ({totalSundayColumns} Minggu
              {minimizedMonthKeys.size > 0
                ? `, ${totalVisibleMatrixColumns} Kolom Tampil`
                : ''}
              )
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] flex-wrap">
            {/* Indikator Stabilo Silabus (Permintaan User) */}
            <span
              className="flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200"
              title="Stabilo Merah: Santri sudah melewati bulan batas target silabus hafalan dan belum tuntas"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-2xs" />
              <span>Stabilo Merah: Melewati Target</span>
            </span>
            <span
              className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
              title="Stabilo Kuning: Santri sedang berada dalam rentang atau bulan batas capaian target hafalan"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs" />
              <span>Stabilo Kuning: Bulan Capaian</span>
            </span>
            <span
              className="flex items-center gap-1 font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200"
              title="Stabilo Putih: Santri aman / sudah menyelesaikan target / target hafalan belum masuk jadwal"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
              <span>Stabilo Putih: Aman / Selesai</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
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
            <span className="flex items-center gap-1 font-medium text-rose-700">
              <CalendarOff className="w-3 h-3 text-rose-600" />
              <span>LBR (Liburan Silabus)</span>
            </span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="text-slate-400 italic">Klik sel untuk detail/input setoran</span>
          </div>
        </div>

        {/* Container Tabel dengan Horizontal & Vertical Scroll */}
        <div ref={tableScrollRef} className="overflow-x-auto max-h-[75vh] relative">
          <table
            className="text-left text-xs border-collapse"
            style={{
              tableLayout: 'fixed',
              width:
                zoomMetrics.noW +
                zoomMetrics.namaW +
                zoomMetrics.kelasW +
                displayedMonths.reduce(
                  (acc, m) =>
                    acc +
                    (minimizedMonthKeys.has(m.key)
                      ? zoomMetrics.minMonthColW
                      : m.sundays.length * zoomMetrics.weekColW),
                  0
                ),
            }}
          >
            <colgroup>
              <col style={{ width: zoomMetrics.noW }} />
              <col style={{ width: zoomMetrics.namaW }} />
              <col style={{ width: zoomMetrics.kelasW }} />
              {displayedMonths.map((m) =>
                minimizedMonthKeys.has(m.key) ? (
                  <col key={`col_min_${m.key}`} style={{ width: zoomMetrics.minMonthColW }} />
                ) : (
                  m.sundays.map((s) => (
                    <col key={`col_${s.tanggal}`} style={{ width: zoomMetrics.weekColW }} />
                  ))
                )
              )}
            </colgroup>

            {/* Multi-Level Sticky Header */}
            <thead className="bg-slate-100 text-slate-800 font-bold sticky top-0 z-30 select-none shadow-xs">
              {/* Tingkat 1: Bulan Header */}
              <tr className="border-b border-slate-200">
                {/* Kolom Beku (Sticky Columns di Kiri dengan left dinamis sesuai zoom) */}
                <th
                  rowSpan={2}
                  style={{ left: 0, width: zoomMetrics.noW }}
                  className={`${
                    zoomMetrics.density === 'micro' || zoomMetrics.density === 'dense'
                      ? 'py-1.5 px-1 text-[10px]'
                      : 'py-2.5 px-2'
                  } text-center sticky z-40 bg-slate-100 border-r border-slate-200`}
                >
                  NO
                </th>
                <th
                  rowSpan={2}
                  style={{ left: zoomMetrics.leftNama, width: zoomMetrics.namaW }}
                  className={`${
                    zoomMetrics.density === 'micro' || zoomMetrics.density === 'dense'
                      ? 'py-1.5 px-2 text-[10px]'
                      : 'py-2.5 px-3'
                  } sticky z-40 bg-slate-100 border-r border-slate-200 whitespace-nowrap overflow-hidden text-ellipsis`}
                >
                  NAMA SANTRI
                </th>
                <th
                  rowSpan={2}
                  style={{ left: zoomMetrics.leftKelas, width: zoomMetrics.kelasW }}
                  className={`${
                    zoomMetrics.density === 'micro' || zoomMetrics.density === 'dense'
                      ? 'py-1.5 px-1.5 text-[10px]'
                      : 'py-2.5 px-3'
                  } sticky z-40 bg-slate-100 border-r border-slate-300 whitespace-nowrap overflow-hidden text-ellipsis`}
                >
                  KELAS
                </th>

                {/* Kolom Bulan Bertingkat (Normal vs Minimized: Panah Hijau) */}
                {displayedMonths.map((m) => {
                  const isMinimized = minimizedMonthKeys.has(m.key);
                  const minLabel = formatMonthMinimizedLabel(m.monthIndex, m.year);

                  if (isMinimized) {
                    return (
                      <th
                        key={m.key}
                        rowSpan={2}
                        colSpan={1}
                        className="p-0 text-center border-r border-slate-300 bg-emerald-900 text-white font-bold align-middle"
                        title={`${m.monthName} ${m.year} (${m.sundays.length} Minggu) sedang diminimize. Klik untuk menampilkan minggu-minggunya kembali.`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleMinimizeMonth(m.key)}
                          className="w-full h-full py-2 px-1 flex flex-col items-center justify-center gap-0.5 hover:bg-emerald-700 transition cursor-pointer"
                          aria-label={`Tampilkan minggu bulan ${m.monthName} ${m.year}`}
                        >
                          <span
                            className={`${
                              zoomMetrics.density === 'micro' ? 'text-[9px]' : 'text-[11px]'
                            } font-bold leading-tight whitespace-nowrap`}
                          >
                            {minLabel}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-200 font-normal">
                            <Maximize2 className="w-2.5 h-2.5" />
                            {zoomMetrics.density !== 'micro' && (
                              <span>{m.sundays.length}M</span>
                            )}
                          </span>
                        </button>
                      </th>
                    );
                  }

                  return (
                    <th
                      key={m.key}
                      colSpan={m.sundays.length}
                      className="p-0 text-center border-r border-slate-300 bg-emerald-800 text-white font-bold tracking-wide"
                      title={`Klik untuk minimize minggu bulan ${m.monthName} ${m.year} menjadi ${minLabel}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleMinimizeMonth(m.key)}
                        className={`w-full h-full ${
                          zoomMetrics.density === 'micro' || zoomMetrics.density === 'dense'
                            ? 'py-1 px-0.5'
                            : 'py-2 px-2'
                        } flex items-center justify-center gap-1 hover:bg-emerald-700/90 transition cursor-pointer overflow-hidden`}
                        aria-label={`Minimize minggu bulan ${m.monthName} ${m.year}`}
                      >
                        {zoomMetrics.density === 'micro' || zoomMetrics.density === 'dense' ? (
                          <span className="text-[10px] font-bold truncate">
                            {minLabel}
                          </span>
                        ) : (
                          <>
                            <span className="truncate">
                              {m.monthName.toUpperCase()} {m.year}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-emerald-100 font-mono whitespace-nowrap shrink-0">
                              {m.sundays.length} Minggu
                            </span>
                            <Minimize2 className="w-3 h-3 text-emerald-200 shrink-0" />
                          </>
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>

              {/* Tingkat 2: Sub-Header Hari Minggu (Hanya untuk bulan yang TIDAK diminimize) */}
              <tr className="border-b border-slate-300 bg-slate-50 text-[11px] text-slate-700">
                {displayedMonths.map((m) => {
                  if (minimizedMonthKeys.has(m.key)) return null;
                  return m.sundays.map((s) => {
                    const holidayInfo = holidaysForTA[s.tanggal];
                    const isMicroOrDense =
                      zoomMetrics.density === 'micro' || zoomMetrics.density === 'dense';
                    return (
                      <th
                        key={s.tanggal}
                        className={`${
                          isMicroOrDense ? 'py-1 px-0.5 text-[9px]' : 'py-1.5 px-1 text-[11px]'
                        } text-center border-r border-slate-200 overflow-hidden ${
                          holidayInfo
                            ? 'bg-rose-100/80 font-bold text-rose-900'
                            : s.isCurrentWeek
                            ? 'bg-amber-100/60 font-bold text-amber-900'
                            : ''
                        }`}
                        title={
                          holidayInfo
                            ? `${s.labelLengkap} (${holidayInfo.label || 'LIBURAN'})`
                            : s.labelLengkap
                        }
                      >
                        {zoomMetrics.density === 'micro' ? (
                          <div className="font-bold leading-none">{s.mingguKe}</div>
                        ) : zoomMetrics.density === 'dense' ? (
                          <div className="font-bold leading-tight">M{s.mingguKe}</div>
                        ) : (
                          <>
                            <div className="font-bold">M{s.mingguKe}</div>
                            <div className="text-[10px] text-slate-500 font-mono font-normal">
                              {s.dayNumber}/{m.monthIndex + 1}
                            </div>
                            {holidayInfo && zoomMetrics.density === 'normal' && (
                              <div className="text-[8px] font-bold uppercase text-rose-700 tracking-wider truncate">
                                {holidayInfo.label || 'LIBUR'}
                              </div>
                            )}
                          </>
                        )}
                      </th>
                    );
                  });
                })}
              </tr>
            </thead>

            {/* Body Data Santri (Urutan Sesuai Formasi Kelas) */}
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedSantri.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + totalVisibleMatrixColumns}
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

                  // Status Silabus Santri (Merah / Kuning / Putih)
                  const silabusStatus = santriSilabusStatusMap.get(santri.no_induk) || {
                    status: 'putih',
                    reason: '',
                    item: '',
                  };
                  const isRed = silabusStatus.status === 'merah';
                  const isYellow = silabusStatus.status === 'kuning';
                  const isMicro = zoomMetrics.density === 'micro';
                  const isDense = zoomMetrics.density === 'dense';
                  const isCompact = zoomMetrics.density === 'compact';

                  // Kelas Styling Stabilo Baris & Kolom Sticky
                  const rowClasses = isRed
                    ? 'bg-rose-50/80 hover:bg-rose-100/70 border-l-4 border-l-rose-500 transition-colors group'
                    : isYellow
                    ? 'bg-amber-50/80 hover:bg-amber-100/70 border-l-4 border-l-amber-500 transition-colors group'
                    : 'hover:bg-emerald-50/30 transition-colors group';

                  const stickyColClasses = isRed
                    ? 'bg-rose-50 group-hover:bg-rose-100/90 text-rose-950'
                    : isYellow
                    ? 'bg-amber-50 group-hover:bg-amber-100/90 text-amber-950'
                    : 'bg-white group-hover:bg-emerald-50/50 text-slate-900';

                  const cellPadY = isMicro
                    ? 'py-0.5'
                    : isDense
                    ? 'py-1'
                    : isCompact
                    ? 'py-1.5'
                    : 'py-2';

                  return (
                    <React.Fragment key={santri.no_induk || idx}>
                      {isNewClass && (
                        <tr className="bg-slate-100 border-y border-slate-300">
                          <td
                            colSpan={3 + totalVisibleMatrixColumns}
                            className={`${
                              isMicro || isDense ? 'py-1 px-2 text-[11px]' : 'py-1.5 px-3 text-xs'
                            } font-bold text-slate-800 tracking-tight sticky left-0 z-20`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-3.5 bg-emerald-600 rounded-sm shrink-0" />
                              <span>Kelas: {santri.displayKelas}</span>
                              <span className="text-[11px] text-slate-500 font-normal font-mono">
                                ({countInClass} Santri)
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className={rowClasses}>
                      {/* Kolom 1: No Urut (Sticky Left) */}
                      <td
                        style={{ left: 0 }}
                        className={`${cellPadY} px-1 text-center sticky z-20 ${stickyColClasses} border-r border-slate-200 font-mono ${
                          isMicro ? 'text-[10px]' : 'text-[11px]'
                        }`}
                      >
                        {idx + 1}
                      </td>

                      {/* Kolom 2: Nama Santri & Indikator Silabus (Sticky Left) */}
                      <td
                        style={{ left: zoomMetrics.leftNama }}
                        className={`${cellPadY} ${
                          isMicro || isDense ? 'px-1.5' : 'px-3'
                        } sticky z-20 ${stickyColClasses} border-r border-slate-200 overflow-hidden`}
                      >
                        <div className="flex items-center gap-1 flex-wrap">
                          <span
                            className={`font-bold truncate ${
                              isMicro
                                ? 'text-[10px] max-w-[110px]'
                                : isDense
                                ? 'text-[11px] max-w-[130px]'
                                : 'max-w-[190px]'
                            }`}
                            title={`${santri.nama} (NIS: ${santri.no_induk})`}
                          >
                            {santri.nama}
                          </span>
                          {!isMicro && !isDense && isRed && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-200 text-rose-900 border border-rose-300 shadow-2xs"
                              title={silabusStatus.reason}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                              <span>Melewati Target</span>
                            </span>
                          )}
                          {!isMicro && !isDense && isYellow && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs"
                              title={silabusStatus.reason}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              <span>Bulan Capaian</span>
                            </span>
                          )}
                        </div>
                        {!isMicro && !isDense && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            NIS: {santri.no_induk}
                          </div>
                        )}
                      </td>

                      {/* Kolom 3: Kelas (Sticky Left) */}
                      <td
                        style={{ left: zoomMetrics.leftKelas }}
                        className={`${cellPadY} ${
                          isMicro || isDense ? 'px-1' : 'px-3'
                        } sticky z-20 ${stickyColClasses} border-r border-slate-300 overflow-hidden`}
                      >
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-md ${
                            isMicro ? 'text-[9px]' : 'text-[10px]'
                          } font-bold border truncate max-w-full ${
                            isRed
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : isYellow
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {santri.displayKelas}
                        </span>
                      </td>

                      {/* Sel-Sel Pertemuan (Bulan Ter-Minimize 1 sel ringkasan vs Normal per Minggu) */}
                      {displayedMonths.map((m) => {
                        if (minimizedMonthKeys.has(m.key)) {
                          const monthRecords = m.sundays.flatMap(
                            (sun) => setoranLookupMap.get(`${santri.no_induk}_${sun.tanggal}`) || []
                          );
                          const hasMonthSetoran = monthRecords.length > 0;
                          const allHoliday =
                            m.sundays.length > 0 &&
                            m.sundays.every((sun) => Boolean(holidaysForTA[sun.tanggal]));
                          const tahfidzRec = monthRecords.find(
                            (r) =>
                              r.kategori === 'Tahfidz' ||
                              (r.materi_nama && r.materi_nama.toLowerCase().startsWith('juz '))
                          );
                          const nonTahfidzCount = monthRecords.filter((r) => r !== tahfidzRec).length;

                          let monthMaxLvl = 0;
                          if (hasMonthSetoran) {
                            const sMap = santriMateriLevelMap.get(santri.no_induk);
                            monthRecords.forEach((r) => {
                              const matKey = norm(r.materi_nama || r.item_hafalan || '');
                              const lvl = sMap?.get(matKey) || 1;
                              if (lvl > monthMaxLvl) monthMaxLvl = lvl;
                            });
                            if (monthMaxLvl === 0) monthMaxLvl = 1;
                          }
                          const mLevelStyle = getHafalanLevelStyle(monthMaxLvl);
                          const minLabel = formatMonthMinimizedLabel(m.monthIndex, m.year);

                          return (
                            <td
                              key={`min_${santri.no_induk}_${m.key}`}
                              onClick={() => handleMinimizedMonthCellClick(santri, m)}
                              className={`${cellPadY} px-1 text-center border-r border-slate-200 cursor-pointer transition-all hover:ring-2 hover:ring-inset ${
                                hasMonthSetoran
                                  ? tahfidzRec && nonTahfidzCount === 0
                                    ? 'bg-cyan-50/80 hover:ring-cyan-500'
                                    : `${mLevelStyle.cellBg} ${mLevelStyle.ringColor}`
                                  : allHoliday
                                  ? 'bg-rose-50/50 hover:ring-rose-400'
                                  : isRed
                                  ? 'bg-rose-50/40 hover:ring-rose-400'
                                  : isYellow
                                  ? 'bg-amber-50/40 hover:ring-amber-400'
                                  : 'bg-slate-50/40 hover:bg-slate-100/70 hover:ring-emerald-500'
                              }`}
                              title={
                                hasMonthSetoran
                                  ? `${minLabel} (${monthRecords.length}x setor): ${Array.from(
                                      new Set(
                                        monthRecords.map((r) => r.materi_nama || r.item_hafalan)
                                      )
                                    ).join(', ')} (Klik untuk input/detail minggu pada bulan ini)`
                                  : allHoliday
                                  ? `${minLabel}: Liburan Silabus (Klik untuk pilih minggu)`
                                  : `${minLabel}: Belum ada setoran (Klik untuk pilih minggu & input)`
                              }
                            >
                              {hasMonthSetoran ? (
                                <span
                                  className={`inline-flex items-center justify-center px-1.5 h-5 rounded-md font-bold text-[10px] shadow-2xs ${
                                    tahfidzRec && nonTahfidzCount === 0
                                      ? 'bg-cyan-700 text-white'
                                      : `${mLevelStyle.badgeBg} ${mLevelStyle.badgeText}`
                                  }`}
                                >
                                  {monthRecords.length}x
                                </span>
                              ) : allHoliday ? (
                                <span className="inline-block px-1 py-0.5 rounded font-bold text-[9px] text-rose-600 bg-rose-100/80">
                                  LBR
                                </span>
                              ) : (
                                <span className="text-slate-300 font-bold text-xs">-</span>
                              )}
                            </td>
                          );
                        }

                        return m.sundays.map((sunday) => {
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
                          const holidayInfo = holidaysForTA[sunday.tanggal];

                          return (
                            <td
                              key={sunday.tanggal}
                              onClick={() => handleCellClick(santri, sunday)}
                              className={`${cellPadY} ${
                                isMicro || isDense ? 'px-0' : 'px-1'
                              } text-center border-r border-slate-100 cursor-pointer transition-all hover:ring-2 hover:ring-inset overflow-hidden ${
                                isDual
                                  ? 'bg-gradient-to-r from-cyan-50 to-emerald-50 hover:ring-cyan-500'
                                  : isTahfidzOnly
                                  ? 'bg-cyan-50/80 hover:bg-cyan-100/70 hover:ring-cyan-500'
                                  : hasSetoran
                                  ? `${levelStyle.cellBg} ${levelStyle.ringColor}`
                                  : holidayInfo
                                  ? 'bg-rose-50/50 hover:bg-rose-100/60 hover:ring-rose-400'
                                  : isRed
                                  ? 'bg-rose-50/40 hover:bg-rose-100/60 hover:ring-rose-400'
                                  : isYellow
                                  ? 'bg-amber-50/40 hover:bg-amber-100/60 hover:ring-amber-400'
                                  : 'bg-white hover:bg-slate-100/60 hover:ring-emerald-500'
                              }`}
                              title={
                                hasSetoran
                                  ? `${sunday.labelLengkap}\nSetoran: ${records
                                      .map((r) => r.materi_nama || r.item_hafalan)
                                      .join(', ')} (Klik untuk detail)`
                                  : holidayInfo
                                  ? `${sunday.labelLengkap}\n${holidayInfo.label || 'LIBURAN'} (Klik jika ada setoran susulan)`
                                  : `${sunday.labelLengkap}\nBelum ada setoran (Klik untuk input)`
                              }
                            >
                              {hasSetoran ? (
                                isMicro ? (
                                  <span
                                    className={`inline-block w-2.5 h-2.5 rounded-xs ${
                                      isTahfidzOnly || isDual ? 'bg-cyan-700' : levelStyle.badgeBg
                                    }`}
                                  />
                                ) : isDense ? (
                                  <span
                                    className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-bold ${
                                      isTahfidzOnly
                                        ? 'bg-cyan-700 text-white'
                                        : `${levelStyle.badgeBg} ${levelStyle.badgeText}`
                                    }`}
                                  >
                                    {isTahfidzOnly ? `J${juzNumber}` : '✓'}
                                  </span>
                                ) : (
                                  <div className="inline-flex flex-col items-center justify-center">
                                    {isDual ? (
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
                                      <span
                                        className="inline-flex items-center justify-center w-6 h-6 rounded-lg font-bold text-xs bg-cyan-700 text-white shadow-2xs"
                                        title={`Setoran Tahfidz: Juz ${juzNumber}`}
                                      >
                                        J{juzNumber}
                                      </span>
                                    ) : (
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
                                )
                              ) : holidayInfo ? (
                                isMicro ? (
                                  <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />
                                ) : (
                                  <span className="inline-block px-1 py-0.5 rounded font-bold text-[9px] text-rose-600 bg-rose-100/80">
                                    LBR
                                  </span>
                                )
                              ) : (
                                <span
                                  className={`inline-block font-bold ${
                                    isMicro ? 'text-[9px]' : 'w-4 h-4 text-xs'
                                  } ${
                                    isRed
                                      ? 'text-rose-400 group-hover:text-rose-600'
                                      : isYellow
                                      ? 'text-amber-400 group-hover:text-amber-600'
                                      : 'text-slate-300 group-hover:text-slate-400'
                                  }`}
                                >
                                  -
                                </span>
                              )}
                            </td>
                          );
                        });
                      })}
                    </tr>
                  </React.Fragment>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Modal Interaktif Setoran Per-Minggu */}
      {selectedCell && (
        <ModalInputSetorMinggu
          isOpen={Boolean(selectedCell)}
          onClose={() => setSelectedCell(null)}
          santri={selectedCell.santri}
          sunday={selectedCell.sunday}
          existingRecords={selectedCell.records}
          holidayLabel={holidaysForTA[selectedCell.sunday.tanggal]?.label}
          holidaysMap={holidaysForTA}
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

      {/* Modal Atur Silabus Target Hafalan (Permintaan User) */}
      <ModalAturSilabus
        isOpen={isModalSilabusOpen}
        onClose={() => setIsModalSilabusOpen(false)}
        startYear={startYear}
      />
    </div>
  );
}
