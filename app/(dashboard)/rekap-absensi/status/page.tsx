'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  BarChart2,
  RefreshCw,
  Printer,
  Filter,
  Search,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  Layers,
  Info,
  X,
} from 'lucide-react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { ARRAY_BULAN_IND } from '@/lib/utils/absensiHelper';
import { bandingkanBlokHariKBM } from '@/lib/utils/jadwalHelper';
import {
  computeRekapStatusSummary,
  DAFTAR_STATUS_REKAP_META,
  formatLabelBlokRekap,
  JenjangRekapFilter,
  StatusRekapSummaryRow,
} from '@/lib/utils/rekapAbsensiCalculation';
import ModalDrilldownStatusAsatidz from '@/components/modules/rekap-absensi/ModalDrilldownStatusAsatidz';

type QuickRangePreset = 'hari_ini' | 'minggu' | 'bulan' | 'lalu' | 'custom';

function formatTanggalIndoRekap(ymd: string): string {
  if (!ymd) return '-';
  const p = String(ymd).split('-');
  if (p.length < 3) return ymd;
  const blnIdx = parseInt(p[1], 10) - 1;
  return `${parseInt(p[2], 10)} ${ARRAY_BULAN_IND[blnIdx] || p[1]} ${p[0]}`;
}

function computeQuickRangeDates(
  tipe: 'hari_ini' | 'minggu' | 'bulan' | 'lalu'
): {
  dari: string;
  sampai: string;
} {
  const now = new Date();
  let dDari: Date;
  let dSampai: Date;

  if (tipe === 'hari_ini') {
    dDari = new Date(now);
    dSampai = new Date(now);
  } else if (tipe === 'minggu') {
    const day = now.getDay();
    const diffToSaturday = day === 6 ? 0 : day + 1;
    dDari = new Date(now);
    dDari.setDate(now.getDate() - diffToSaturday);
    dSampai = new Date(dDari);
    dSampai.setDate(dDari.getDate() + 5);
  } else if (tipe === 'lalu') {
    dDari = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    dSampai = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    dDari = new Date(now.getFullYear(), now.getMonth(), 1);
    dSampai = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

  return { dari: fmt(dDari), sampai: fmt(dSampai) };
}

const DAFTAR_TAB_JENJANG: Array<{
  id: JenjangRekapFilter;
  label: string;
  sublabel: string;
}> = [
  {
    id: 'SEMUA',
    label: 'Semua',
    sublabel: 'Gabungan Ula, Wustho & Ulya',
  },
  {
    id: 'ULA',
    label: 'Ula',
    sublabel: 'Jenjang Madrasah Ula',
  },
  {
    id: 'WUSTHO',
    label: 'Wustho',
    sublabel: 'Jenjang Madrasah Wustho',
  },
  {
    id: 'ULYA',
    label: 'Ulya',
    sublabel: 'Jenjang Madrasah Ulya',
  },
];

export default function RekapStatusAbsensiPage() {
  const {
    rawBucketMap,
    liburMapByDate,
    fetchAbsensi,
    isLoading: loadingAbsensi,
  } = useAbsensiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { jadwalMap, fetchJadwal } = useJadwalStore();

  const initialRange = useMemo(() => computeQuickRangeDates('bulan'), []);
  const [startDate, setStartDate] = useState<string>(initialRange.dari);
  const [endDate, setEndDate] = useState<string>(initialRange.sampai);
  const [activeRangePreset, setActiveRangePreset] =
    useState<QuickRangePreset>('bulan');

  const [activeJenjang, setActiveJenjang] =
    useState<JenjangRekapFilter>('SEMUA');
  const [filterBlok, setFilterBlok] = useState<string>('');
  const [filterJah, setFilterJah] = useState<string>('');
  const [filterJam, setFilterJam] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeUnrecordedAsKosong, setIncludeUnrecordedAsKosong] =
    useState<boolean>(false);

  const [selectedStatusModalRow, setSelectedStatusModalRow] =
    useState<StatusRekapSummaryRow | null>(null);
  const [printMode, setPrintMode] = useState<
    'ringkasan' | 'lengkap' | 'status-tunggal'
  >('ringkasan');
  const [printTargetStatusRow, setPrintTargetStatusRow] =
    useState<StatusRekapSummaryRow | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (text: string) => {
    setToastMsg(text);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    fetchAbsensi();
    if (asatidzList.length === 0) fetchAsatidz();
    if (formasiList.length === 0) fetchFormasi();
    if (Object.keys(jadwalMap).length === 0) fetchJadwal();
  }, [
    fetchAbsensi,
    fetchAsatidz,
    fetchFormasi,
    fetchJadwal,
    asatidzList.length,
    formasiList.length,
    jadwalMap,
  ]);

  const { opsiBlok, opsiJah } = useMemo(() => {
    const setBlok = new Set<string>();
    const setJah = new Set<string>();

    (formasiList || []).forEach((f) => {
      const blk = String(f.blok_diniyyah || f.blok_takror || '').trim();
      if (blk && blk !== '-' && blk.toLowerCase() !== 'belum diatur') {
        setBlok.add(formatLabelBlokRekap(blk));
      }
    });

    (asatidzList || []).forEach((a) => {
      const jah = String(a.jah_asatidz || '').trim();
      if (jah && jah !== '-') setJah.add(jah);
    });

    return {
      opsiBlok: Array.from(setBlok).sort((a, b) => bandingkanBlokHariKBM(a, b)),
      opsiJah: Array.from(setJah).sort(),
    };
  }, [formasiList, asatidzList]);

  const summaryResult = useMemo(() => {
    return computeRekapStatusSummary({
      startDate,
      endDate,
      activeJenjang,
      filterBlok,
      filterJah,
      filterJam,
      searchQuery,
      includeUnrecordedScheduledAsKosong: includeUnrecordedAsKosong,
      asatidzList,
      formasiList,
      jadwalMap,
      rawBucketMap,
      liburMapByDate,
    });
  }, [
    startDate,
    endDate,
    activeJenjang,
    filterBlok,
    filterJah,
    filterJam,
    searchQuery,
    includeUnrecordedAsKosong,
    asatidzList,
    formasiList,
    jadwalMap,
    rawBucketMap,
    liburMapByDate,
  ]);

  // Saring baris status bila pengguna mengetik nama status secara spesifik di kotak pencarian
  const displayedStatusRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return summaryResult.rows;

    const matchingStatusMeta = DAFTAR_STATUS_REKAP_META.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.shortDesc.toLowerCase().includes(q)
    );
    if (matchingStatusMeta.length > 0) {
      const matchKeys = new Set(matchingStatusMeta.map((m) => m.key));
      return summaryResult.rows.filter((r) => matchKeys.has(r.key));
    }
    return summaryResult.rows;
  }, [summaryResult.rows, searchQuery]);

  const handleSetQuickRange = (
    tipe: 'hari_ini' | 'minggu' | 'bulan' | 'lalu'
  ) => {
    const { dari, sampai } = computeQuickRangeDates(tipe);
    setStartDate(dari);
    setEndDate(sampai);
    setActiveRangePreset(tipe);
  };

  const handleResetFilters = () => {
    setActiveJenjang('SEMUA');
    setFilterBlok('');
    setFilterJah('');
    setFilterJam('');
    setSearchQuery('');
    setIncludeUnrecordedAsKosong(false);
    handleSetQuickRange('bulan');
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      fetchAbsensi(true),
      fetchAsatidz(),
      fetchFormasi(),
      fetchJadwal(true),
    ]);
    showToast('Data Rekap Status berhasil disegarkan.');
  };

  const handlePrintRingkasan = (mode: 'ringkasan' | 'lengkap') => {
    setPrintMode(mode);
    setPrintTargetStatusRow(null);
    document.body.classList.add('printing-rekap-resmi');
    setTimeout(() => {
      window.print();
      setTimeout(
        () => document.body.classList.remove('printing-rekap-resmi'),
        500
      );
    }, 150);
  };

  const handlePrintSingleStatusFromModal = (row: StatusRekapSummaryRow) => {
    setPrintMode('status-tunggal');
    setPrintTargetStatusRow(row);
    document.body.classList.add('printing-rekap-resmi');
    setTimeout(() => {
      window.print();
      setTimeout(
        () => document.body.classList.remove('printing-rekap-resmi'),
        500
      );
    }, 150);
  };

  const periodeLabel = `${formatTanggalIndoRekap(
    startDate
  )} s/d ${formatTanggalIndoRekap(endDate)}`;

  const hadirRow = summaryResult.rows.find((r) => r.key === 'hadir');
  const terlambatRow = summaryResult.rows.find((r) => r.key === 'terlambat');
  const alfaRow = summaryResult.rows.find((r) => r.key === 'alfa');
  const izinSakitPct =
    (summaryResult.rows.find((r) => r.key === 'izin')?.pctActive || 0) +
    (summaryResult.rows.find((r) => r.key === 'sakit')?.pctActive || 0);

  return (
    <div className="space-y-4 pb-10">
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border bg-emerald-800 text-white border-emerald-700 text-xs font-bold animate-in fade-in slide-in-from-bottom-4 no-print-kbm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-300" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Utama & Tab Switcher */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 space-y-3.5 no-print-kbm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-6 h-6 text-[#0b5751]" />
            </div>
            <div>
              <h1
                data-testid="heading-rekap-status"
                className="text-lg md:text-xl font-extrabold text-slate-800 m-0 leading-tight"
              >
                Rekap Status Absensi Asatidz
              </h1>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Persentase (%) status kehadiran mengajar per jenjang (Semua,
                Ula, Wustho, Ulya). Klik baris status untuk melihat daftar
                Asatidz.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="btn-refresh-rekap-status"
              onClick={handleRefreshAll}
              disabled={loadingAbsensi}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition inline-flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loadingAbsensi ? 'animate-spin' : ''
                }`}
              />
              <span>Segarkan</span>
            </button>

            <button
              type="button"
              data-testid="btn-print-rekap-status"
              onClick={() => handlePrintRingkasan('ringkasan')}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0b5751] hover:bg-[#115e59] text-white transition shadow-xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Unduh PDF / Print (% Status)</span>
            </button>

            <button
              type="button"
              data-testid="btn-print-rekap-status-lengkap"
              onClick={() => handlePrintRingkasan('lengkap')}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print + Daftar Asatidz</span>
            </button>
          </div>
        </div>

        {/* Sub-Menu Tab Switcher: Rekap Per Asatidz vs Rekap Status */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <Link
            href="/rekap-absensi"
            data-testid="subtab-rekap-per-asatidz"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Rekap Per Asatidz (Individu)</span>
          </Link>
          <Link
            href="/rekap-absensi/status"
            data-testid="subtab-rekap-status"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold bg-[#0b5751] text-white shadow-xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Rekap Status (Semua, Ula, Wustho, Ulya)</span>
          </Link>
        </div>
      </div>

      {/* Panel Filter Rentang Tanggal (Dari > Sampai), Pencarian & Kriteria */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 space-y-3.5 no-print-kbm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-xs">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Rentang Tanggal, Pencarian &amp; Kriteria</span>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              data-testid="checkbox-include-unrecorded-kosong"
              checked={includeUnrecordedAsKosong}
              onChange={(e) => setIncludeUnrecordedAsKosong(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="font-semibold">
              Hitung jadwal yang belum diinput presensinya ke dalam status{' '}
              <strong>Kosong</strong>
            </span>
          </label>
        </div>

        {/* Baris 1: Tanggal Dari > Tanggal Sampai, Pintasan Periode, Blok, Jah, Jam */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-2">
            <label
              htmlFor="rekap-status-start-date"
              className="block text-[11px] font-bold text-slate-500 mb-1"
            >
              Tanggal Dari
            </label>
            <input
              id="rekap-status-start-date"
              data-testid="input-rekap-status-start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                const nextStart = e.target.value;
                setStartDate(nextStart);
                if (endDate && nextStart > endDate) {
                  setEndDate(nextStart);
                }
                setActiveRangePreset('custom');
              }}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="rekap-status-end-date"
              className="block text-[11px] font-bold text-slate-500 mb-1"
            >
              Tanggal Sampai
            </label>
            <input
              id="rekap-status-end-date"
              data-testid="input-rekap-status-end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                const nextEnd = e.target.value;
                setEndDate(nextEnd);
                if (startDate && nextEnd < startDate) {
                  setStartDate(nextEnd);
                }
                setActiveRangePreset('custom');
              }}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Pintasan Periode
            </label>
            <div className="grid grid-cols-4 rounded-lg border border-emerald-700 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => handleSetQuickRange('hari_ini')}
                className={`py-1.5 text-[11px] font-bold transition-colors ${
                  activeRangePreset === 'hari_ini'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickRange('minggu')}
                className={`py-1.5 text-[11px] font-bold border-l border-emerald-700 transition-colors ${
                  activeRangePreset === 'minggu'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickRange('bulan')}
                className={`py-1.5 text-[11px] font-bold border-l border-emerald-700 transition-colors ${
                  activeRangePreset === 'bulan'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickRange('lalu')}
                className={`py-1.5 text-[11px] font-bold border-l border-emerald-700 transition-colors ${
                  activeRangePreset === 'lalu'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Bulan Lalu
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="rekap-status-blok"
              className="block text-[11px] font-bold text-slate-500 mb-1"
            >
              Blok Kelas
            </label>
            <select
              id="rekap-status-blok"
              data-testid="select-rekap-status-blok"
              value={filterBlok}
              onChange={(e) => setFilterBlok(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Blok</option>
              {opsiBlok.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="-">Belum Diatur</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="rekap-status-jah"
              className="block text-[11px] font-bold text-slate-500 mb-1"
            >
              Jabatan (Jah)
            </label>
            <select
              id="rekap-status-jah"
              data-testid="select-rekap-status-jah"
              value={filterJah}
              onChange={(e) => setFilterJah(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Jabatan</option>
              {opsiJah.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Baris 2: Filter Jam KBM, Pencarian, & Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3">
            <label
              htmlFor="rekap-status-jam"
              className="block text-[11px] font-bold text-slate-500 mb-1"
            >
              Filter Jam KBM
            </label>
            <select
              id="rekap-status-jam"
              data-testid="select-rekap-status-jam"
              value={filterJam}
              onChange={(e) => setFilterJam(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Jam (Jam 1 s/d 4)</option>
              <option value="Jam 1">Jam Ke-1</option>
              <option value="Jam 2">Jam Ke-2</option>
              <option value="Jam 3">Jam Ke-3</option>
              <option value="Jam 4">Jam Ke-4</option>
            </select>
          </div>

          <div className="lg:col-span-7">
            <label
              htmlFor="rekap-status-search"
              className="block text-[11px] font-bold text-slate-500 mb-1"
            >
              Pencarian Status / Nama Asatidz / NIA / Kelas
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="rekap-status-search"
                data-testid="input-rekap-status-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik status (mis. Hadir, Alfa, Terlambat) atau saring nama Asatidz / kelas..."
                className="w-full text-xs py-1.5 pl-8 pr-7 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus kata kunci pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <button
              type="button"
              data-testid="btn-reset-filter-rekap-status"
              onClick={handleResetFilters}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Pengelompokan Rekap: Semua | Ula | Wustho | Ulya */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3.5 no-print-kbm">
        <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 mb-2.5">
          <Layers className="w-4 h-4 text-[#0b5751]" />
          <span>Pengelompokan Jenjang Rekap Status:</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {DAFTAR_TAB_JENJANG.map((tab) => {
            const isSelected = activeJenjang === tab.id;
            const hadirPctTab =
              tab.id === 'ULA'
                ? hadirRow?.pctUla || 0
                : tab.id === 'WUSTHO'
                ? hadirRow?.pctWustho || 0
                : tab.id === 'ULYA'
                ? hadirRow?.pctUlya || 0
                : hadirRow?.pctSemua || 0;

            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`tab-jenjang-${tab.id}`}
                onClick={() => setActiveJenjang(tab.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0b5751] text-white border-[#0b5751] shadow-sm'
                    : 'bg-slate-50/70 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold tracking-tight">
                    {tab.label}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Hadir {hadirPctTab.toFixed(1)}%
                  </span>
                </div>
                <p
                  className={`text-[11px] mt-1 m-0 ${
                    isSelected ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  {tab.sublabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ringkasan KPI Persentase Makro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 no-print-kbm">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">
            % Status Hadir ({activeJenjang})
          </div>
          <div
            data-testid="kpi-status-hadir-pct"
            className="text-2xl font-black text-emerald-700 mt-1"
          >
            {(hadirRow?.pctActive || 0).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Hadir tepat waktu sesuai jadwal
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">
            % Status Terlambat ({activeJenjang})
          </div>
          <div
            data-testid="kpi-status-terlambat-pct"
            className="text-2xl font-black text-orange-600 mt-1"
          >
            {(terlambatRow?.pctActive || 0).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Melewati batas toleransi jam KBM
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">
            % Izin &amp; Sakit ({activeJenjang})
          </div>
          <div
            data-testid="kpi-status-izinsakit-pct"
            className="text-2xl font-black text-sky-600 mt-1"
          >
            {izinSakitPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Akumulasi berhalangan resmi &amp; sakit
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase">
            % Status Alfa ({activeJenjang})
          </div>
          <div
            data-testid="kpi-status-alfa-pct"
            className="text-2xl font-black text-rose-600 mt-1"
          >
            {(alfaRow?.pctActive || 0).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Tanpa keterangan resmi pada KBM
          </div>
        </div>
      </div>

      {/* Tabel Utama Rekap Persentase (%) 7 Status Kehadiran (Tanpa Menampilkan Nama Asatidz) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 space-y-3 no-print-kbm">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 m-0">
              Tabel Persentase (%) Status Absensi Asatidz •{' '}
              <span className="text-[#0b5751]">
                {activeJenjang === 'SEMUA'
                  ? 'Semua Jenjang (Ula, Wustho, Ulya)'
                  : `Jenjang ${activeJenjang}`}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Periode: {periodeLabel}. Klik salah satu baris status di bawah ini
              untuk membuka daftar nama Asatidz.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <span>7 Status Presensi KBM</span>
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table
            className="w-full text-xs border-collapse"
            data-testid="table-rekap-status-utama"
          >
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200 select-none">
                <th className="py-3 px-3 text-center w-12">NO</th>
                <th className="py-3 px-3.5 text-left">STATUS KEHADIRAN</th>
                <th className="py-3 px-3.5 text-left min-w-[240px]">
                  PERSENTASE (%) STATUS (
                  {activeJenjang === 'SEMUA' ? 'SEMUA' : activeJenjang})
                </th>
                {activeJenjang === 'SEMUA' && (
                  <>
                    <th className="py-3 px-3 text-center whitespace-nowrap">
                      % ULA
                    </th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">
                      % WUSTHO
                    </th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">
                      % ULYA
                    </th>
                  </>
                )}
                <th className="py-3 px-3.5 text-right whitespace-nowrap">
                  DAFTAR ASATIDZ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedStatusRows.map((row, idx) => {
                const pctVal = row.pctActive;
                const clampedBarWidth = Math.min(100, Math.max(0, pctVal));

                return (
                  <tr
                    key={row.key}
                    data-testid={`row-status-${row.key}`}
                    onClick={() => setSelectedStatusModalRow(row)}
                    className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                    title={`Klik untuk melihat daftar Asatidz berstatus ${row.meta.label}`}
                  >
                    <td className="py-3.5 px-3 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-lg border font-extrabold text-xs min-w-[92px] ${row.meta.badgeClass}`}
                        >
                          {row.meta.label}
                        </span>
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          {row.meta.shortDesc}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3.5">
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            data-testid={`pct-value-${row.key}`}
                            className={`text-base font-black ${row.meta.textClass}`}
                          >
                            {pctVal.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${row.meta.barClass}`}
                            style={{ width: `${clampedBarWidth}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {activeJenjang === 'SEMUA' && (
                      <>
                        <td
                          data-testid={`pct-ula-${row.key}`}
                          className="py-3.5 px-3 text-center font-extrabold text-slate-700"
                        >
                          {row.pctUla.toFixed(1)}%
                        </td>
                        <td
                          data-testid={`pct-wustho-${row.key}`}
                          className="py-3.5 px-3 text-center font-extrabold text-slate-700"
                        >
                          {row.pctWustho.toFixed(1)}%
                        </td>
                        <td
                          data-testid={`pct-ulya-${row.key}`}
                          className="py-3.5 px-3 text-center font-extrabold text-slate-700"
                        >
                          {row.pctUlya.toFixed(1)}%
                        </td>
                      </>
                    )}

                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 group-hover:bg-[#0b5751] text-slate-700 group-hover:text-white font-bold text-xs transition-colors">
                        <span>Lihat Daftar Asatidz</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-400 italic flex items-center gap-1.5 pt-1">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Tabel utama hanya menampilkan persentase (%) per status kehadiran.
            Klik salah satu baris status (Hadir, Izin, Sakit, Alfa, Kosong,
            Terlambat, atau Ganti) untuk menampilkan daftar nama Asatidz.
          </span>
        </p>
      </div>

      {/* Wadah Cetak Dokumen Resmi PDF / Print (#areaCetakRekapResmi) */}
      <div id="areaCetakRekapResmi" className="hidden print:block">
        {printMode === 'status-tunggal' && printTargetStatusRow ? (
          <div>
            <div className="text-center mb-4">
              <h2 className="font-bold uppercase text-base m-0">
                DAFTAR ASATIDZ BERSTATUS:{' '}
                {printTargetStatusRow.meta.label.toUpperCase()} (
                {printTargetStatusRow.pctActive.toFixed(1)}%)
              </h2>
              <h3 className="font-bold text-sm m-0 mt-0.5">
                MADRASAH DINIYYAH AL AMIRIYYAH BLOKAGUNG
              </h3>
              <p className="text-xs m-0 mt-1">
                Jenjang:{' '}
                {activeJenjang === 'SEMUA'
                  ? 'Semua Tingkat (Ula, Wustho, Ulya)'
                  : `Tingkat ${activeJenjang}`}{' '}
                • Periode: {periodeLabel}
              </p>
            </div>

            <table className="tabel-cetak-resmi w-full">
              <thead>
                <tr>
                  <th className="text-center">No</th>
                  <th>Nama Asatidz</th>
                  <th className="text-center">NIA</th>
                  <th className="text-center">Tingkat</th>
                  <th className="text-center">Blok</th>
                  <th className="text-center">Jabatan</th>
                  <th className="text-center">
                    Jumlah Sesi {printTargetStatusRow.meta.label}
                  </th>
                  <th className="text-center">% dari Sesi Guru</th>
                </tr>
              </thead>
              <tbody>
                {printTargetStatusRow.asatidzList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      Tidak ada Asatidz pada status ini.
                    </td>
                  </tr>
                ) : (
                  printTargetStatusRow.asatidzList.map((item, idx) => (
                    <tr key={`${item.nama}-${idx}`}>
                      <td className="text-center">{idx + 1}</td>
                      <td className="font-bold">{item.nama}</td>
                      <td className="text-center">{item.nia}</td>
                      <td className="text-center">{item.jenjang}</td>
                      <td className="text-center">
                        {formatLabelBlokRekap(item.blok)}
                      </td>
                      <td className="text-center">{item.jah}</td>
                      <td className="text-center font-bold">
                        {item.statusCount} Sesi
                        {printTargetStatusRow.key === 'terlambat' &&
                        item.totalMenitTerlambat > 0
                          ? ` (${item.totalMenitTerlambat} mnt)`
                          : ''}
                      </td>
                      <td className="text-center font-bold">
                        {item.pctStatusGuru.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-8 mt-10 text-center text-xs">
              <div>
                <p className="m-0">Mengetahui,</p>
                <p className="m-0">Kepala Bagian Kesiswaan</p>
                <div className="h-16" />
                <p className="font-bold m-0">
                  (...........................................)
                </p>
              </div>
              <div>
                <p className="m-0">
                  Blokagung,{' '}
                  {formatTanggalIndoRekap(
                    new Date().toISOString().slice(0, 10)
                  )}
                </p>
                <p className="m-0">Kepala TU / Pengasuh</p>
                <div className="h-16" />
                <p className="font-bold m-0">
                  (...........................................)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-4">
              <h2 className="font-bold uppercase text-base m-0">
                REKAPITULASI PERSENTASE (%) STATUS ABSENSI ASATIDZ
              </h2>
              <h3 className="font-bold text-sm m-0 mt-0.5">
                MADRASAH DINIYYAH AL AMIRIYYAH BLOKAGUNG
              </h3>
              <p className="text-xs m-0 mt-1">
                Pengelompokan:{' '}
                {activeJenjang === 'SEMUA'
                  ? 'Semua Tingkat (Ula, Wustho, Ulya)'
                  : `Tingkat ${activeJenjang}`}{' '}
                • Periode: {periodeLabel}
                {filterBlok ? ` • Blok: ${filterBlok}` : ''}
                {filterJah ? ` • Jabatan: ${filterJah}` : ''}
              </p>
            </div>

            <table className="tabel-cetak-resmi w-full">
              <thead>
                <tr>
                  <th className="text-center">No</th>
                  <th>Status Kehadiran</th>
                  <th>Keterangan Status</th>
                  <th className="text-center">
                    % {activeJenjang === 'SEMUA' ? 'Semua Tingkat' : activeJenjang}
                  </th>
                  <th className="text-center">% Ula</th>
                  <th className="text-center">% Wustho</th>
                  <th className="text-center">% Ulya</th>
                </tr>
              </thead>
              <tbody>
                {displayedStatusRows.map((row, idx) => (
                  <tr key={row.key}>
                    <td className="text-center">{idx + 1}</td>
                    <td className="font-bold">{row.meta.label}</td>
                    <td>{row.meta.shortDesc}</td>
                    <td className="text-center font-bold">
                      {row.pctActive.toFixed(1)}%
                    </td>
                    <td className="text-center">{row.pctUla.toFixed(1)}%</td>
                    <td className="text-center">{row.pctWustho.toFixed(1)}%</td>
                    <td className="text-center">{row.pctUlya.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {printMode === 'lengkap' && (
              <div className="mt-6 space-y-5">
                <h3 className="font-bold text-sm uppercase border-b border-slate-400 pb-1">
                  Lampiran Daftar Asatidz per Status Kehadiran ({activeJenjang})
                </h3>
                {displayedStatusRows.map((row) => (
                  <div key={`print-lampiran-${row.key}`} className="space-y-1.5">
                    <div className="font-bold text-xs">
                      Status {row.meta.label}: {row.pctActive.toFixed(1)}% (
                      {row.asatidzList.length} Asatidz)
                    </div>
                    {row.asatidzList.length > 0 && (
                      <table className="tabel-cetak-resmi w-full">
                        <thead>
                          <tr>
                            <th className="text-center">No</th>
                            <th>Nama Asatidz</th>
                            <th className="text-center">NIA</th>
                            <th className="text-center">Tingkat</th>
                            <th className="text-center">Blok</th>
                            <th className="text-center">
                              Sesi {row.meta.label}
                            </th>
                            <th className="text-center">% Status Guru</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.asatidzList.map((t, tIdx) => (
                            <tr key={`${row.key}-${t.nama}-${tIdx}`}>
                              <td className="text-center">{tIdx + 1}</td>
                              <td>{t.nama}</td>
                              <td className="text-center">{t.nia}</td>
                              <td className="text-center">{t.jenjang}</td>
                              <td className="text-center">
                                {formatLabelBlokRekap(t.blok)}
                              </td>
                              <td className="text-center">
                                {t.statusCount} Sesi
                              </td>
                              <td className="text-center">
                                {t.pctStatusGuru.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 mt-10 text-center text-xs">
              <div>
                <p className="m-0">Mengetahui,</p>
                <p className="m-0">Kepala Bagian Kesiswaan</p>
                <div className="h-16" />
                <p className="font-bold m-0">
                  (...........................................)
                </p>
              </div>
              <div>
                <p className="m-0">
                  Blokagung,{' '}
                  {formatTanggalIndoRekap(
                    new Date().toISOString().slice(0, 10)
                  )}
                </p>
                <p className="m-0">Pengasuh / Kepala TU</p>
                <div className="h-16" />
                <p className="font-bold m-0">
                  (...........................................)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Drilldown Daftar Asatidz saat Baris Status Diklik */}
      <ModalDrilldownStatusAsatidz
        isOpen={Boolean(selectedStatusModalRow)}
        onClose={() => setSelectedStatusModalRow(null)}
        statusRow={selectedStatusModalRow}
        activeJenjang={activeJenjang}
        periodeLabel={periodeLabel}
        onPrintStatusDetail={handlePrintSingleStatusFromModal}
      />
    </div>
  );
}
