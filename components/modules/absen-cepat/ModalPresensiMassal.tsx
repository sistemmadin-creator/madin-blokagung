'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  X,
  Search,
  Check,
  CheckSquare,
  Square,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import {
  JamKbm,
  SesiJadwalHarian,
  StatusAbsensi,
  StatusSesiData,
} from '@/types/absensi';
import { getSesiKey } from '@/lib/utils/absensiHelper';
import {
  formatLabelBlokHariKBM,
  bandingkanBlokHariKBM,
  bandingkanUrutanKelasUniversal,
} from '@/lib/utils/jadwalHelper';

interface ModalPresensiMassalProps {
  isOpen: boolean;
  onClose: () => void;
  tanggal: string;
  initialJam: JamKbm;
  sesiHariIni: Record<JamKbm, SesiJadwalHarian[]>;
  getSesiStatusData: (sesi: SesiJadwalHarian) => StatusSesiData;
  onApplyBulk: (jam: JamKbm, sKeys: string[], status: StatusAbsensi) => void;
  onQuickChangeSingle: (
    sesi: SesiJadwalHarian,
    updates: Partial<StatusSesiData>
  ) => void;
  onJamChange?: (jam: JamKbm) => void;
  daftarBlok: string[];
}

const TARGET_STATUS_OPTIONS: Array<{
  value: StatusAbsensi;
  label: string;
  short: string;
  activeClass: string;
  inactiveClass: string;
  buttonApplyClass: string;
}> = [
  {
    value: 'Hadir',
    label: 'H = Hadir',
    short: 'HADIR',
    activeClass: 'bg-emerald-700 text-white border-emerald-700 shadow-xs',
    inactiveClass:
      'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
    buttonApplyClass: 'bg-emerald-700 hover:bg-emerald-800 text-white',
  },
  {
    value: 'Izin',
    label: 'I = Izin',
    short: 'IZIN',
    activeClass: 'bg-sky-600 text-white border-sky-600 shadow-xs',
    inactiveClass:
      'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100',
    buttonApplyClass: 'bg-sky-600 hover:bg-sky-700 text-white',
  },
  {
    value: 'Sakit',
    label: 'S = Sakit',
    short: 'SAKIT',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-xs',
    inactiveClass:
      'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    buttonApplyClass: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  {
    value: 'Alfa',
    label: 'A = Alfa',
    short: 'ALFA',
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs',
    inactiveClass:
      'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
    buttonApplyClass: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
  {
    value: 'Tugas Lain',
    label: 'L = Tugas',
    short: 'TUGAS LAIN',
    activeClass: 'bg-slate-700 text-white border-slate-700 shadow-xs',
    inactiveClass:
      'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200',
    buttonApplyClass: 'bg-slate-700 hover:bg-slate-800 text-white',
  },
];

const PILIHAN_DROPDOWN_ROW: StatusAbsensi[] = [
  'Hadir',
  'Izin',
  'Sakit',
  'Alfa',
  'Terlambat',
  'Digantikan',
  'Tugas Lain',
];

export default function ModalPresensiMassal({
  isOpen,
  onClose,
  tanggal,
  initialJam,
  sesiHariIni,
  getSesiStatusData,
  onApplyBulk,
  onQuickChangeSingle,
  onJamChange,
  daftarBlok,
}: ModalPresensiMassalProps) {
  const [selectedJam, setSelectedJam] = useState<JamKbm>(initialJam || 1);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<StatusAbsensi>('Hadir');
  const [bulkSearch, setBulkSearch] = useState<string>('');
  const [filterBlok, setFilterBlok] = useState<string>('ALL');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // State deteksi keyboard HP & fokus pencarian agar popup otomatis naik ke atas (Gambar 4)
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [viewportInfo, setViewportInfo] = useState<{
    height: number | null;
    offsetTop: number;
    isKeyboardOpen: boolean;
  }>({
    height: null,
    offsetTop: 0,
    isKeyboardOpen: false,
  });

  // Sinkronisasi saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setSelectedJam(initialJam || 1);
      setSelectedKeys([]);
      setBulkSearch('');
      setFilterBlok('ALL');
      setIsSearchFocused(false);
    }
  }, [isOpen, initialJam]);

  // Pantau perubahan ukuran visualViewport (saat keyboard virtual HP muncul/hilang)
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const updateViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      const fullHeight = window.innerHeight;
      const keyboardOpen = vv.height < fullHeight * 0.82;
      setViewportInfo({
        height: Math.round(vv.height),
        offsetTop: Math.max(0, Math.round(vv.offsetTop)),
        isKeyboardOpen: keyboardOpen,
      });
    };

    updateViewport();
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateViewport);
      vv.addEventListener('scroll', updateViewport);
      return () => {
        vv.removeEventListener('resize', updateViewport);
        vv.removeEventListener('scroll', updateViewport);
      };
    }
  }, [isOpen]);

  const handleSelectJam = (j: JamKbm) => {
    if (j !== selectedJam) {
      setSelectedJam(j);
      setSelectedKeys([]);
      onJamChange?.(j);
    }
  };

  const rawList = useMemo(
    () => sesiHariIni[selectedJam] || [],
    [sesiHariIni, selectedJam]
  );

  // Filter daftar asatidz pada jam aktif
  const filteredList = useMemo(() => {
    return rawList
      .filter((s) => {
        if (
          filterBlok !== 'ALL' &&
          formatLabelBlokHariKBM(s.blok) !== formatLabelBlokHariKBM(filterBlok)
        ) {
          return false;
        }
        if (bulkSearch.trim()) {
          const q = bulkSearch.trim().toLowerCase().replace(/\s+/g, '');
          const hay = `${s.nama} ${s.nia || ''} ${s.kelasMengajar} ${s.fan} ${s.blok || ''}`
            .toLowerCase()
            .replace(/\s+/g, '');
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => {
        const cmpB = bandingkanBlokHariKBM(a.blok, b.blok);
        if (cmpB !== 0) return cmpB;
        return (
          bandingkanUrutanKelasUniversal(a.kelasMengajar, b.kelasMengajar) ||
          a.nama.localeCompare(b.nama, undefined, { sensitivity: 'base' })
        );
      });
  }, [rawList, filterBlok, bulkSearch]);

  const filteredKeys = useMemo(
    () => filteredList.map((s) => getSesiKey(tanggal, s)),
    [filteredList, tanggal]
  );

  const isAllSelected =
    filteredKeys.length > 0 &&
    filteredKeys.every((k) => selectedKeys.includes(k));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys((prev) => prev.filter((k) => !filteredKeys.includes(k)));
    } else {
      setSelectedKeys((prev) => Array.from(new Set([...prev, ...filteredKeys])));
    }
  };

  const handleToggleRow = (sKey: string) => {
    setSelectedKeys((prev) =>
      prev.includes(sKey) ? prev.filter((k) => k !== sKey) : [...prev, sKey]
    );
  };

  const handleApply = () => {
    if (selectedKeys.length === 0) return;
    onApplyBulk(selectedJam, selectedKeys, bulkTargetStatus);
    onJamChange?.(selectedJam);
    setSelectedKeys([]);
    onClose();
  };

  const currentTargetMeta =
    TARGET_STATUS_OPTIONS.find((t) => t.value === bulkTargetStatus) ||
    TARGET_STATUS_OPTIONS[0];

  const getStatusBadge = (status: StatusAbsensi | '') => {
    switch (status) {
      case 'Hadir':
      default:
        return {
          label: 'Hadir',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        };
      case 'Izin':
        return {
          label: 'Izin',
          badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
        };
      case 'Sakit':
        return {
          label: 'Sakit',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
        };
      case 'Alfa':
      case 'Jadwal Kosong':
        return {
          label: status === 'Jadwal Kosong' ? 'Kosong' : 'Alfa',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
        };
      case 'Terlambat':
        return {
          label: 'Terlambat',
          badgeClass: 'bg-orange-50 text-orange-800 border-orange-300',
        };
      case 'Digantikan':
      case 'Badal':
        return {
          label: 'Digantikan',
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-300',
        };
      case 'Tugas Lain':
      case 'Tugas':
        return {
          label: 'Tugas Lain',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
        };
    }
  };

  if (!isOpen) return null;

  // Mode ringkas otomatis saat pencarian sedang difokuskan atau keyboard HP muncul (Gambar 4)
  const isKeyboardElevated = isSearchFocused || viewportInfo.isKeyboardOpen;

  const dynamicDialogStyle: React.CSSProperties =
    viewportInfo.isKeyboardOpen && viewportInfo.height
      ? {
          maxHeight: `${Math.max(260, viewportInfo.height - 10)}px`,
        }
      : {};

  return (
    <div
      data-testid="modal-presensi-massal-overlay"
      data-keyboard-elevated={isKeyboardElevated ? 'true' : 'false'}
      style={
        viewportInfo.isKeyboardOpen && viewportInfo.offsetTop > 0
          ? { paddingTop: `${viewportInfo.offsetTop + 4}px` }
          : undefined
      }
      className={`fixed inset-0 z-[70] flex justify-center bg-slate-900/60 p-1.5 sm:p-4 backdrop-blur-xs transition-all duration-200 select-none ${
        isKeyboardElevated
          ? 'items-start pt-1.5 sm:items-center'
          : 'items-center'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-presensi-massal-title"
    >
      <div
        data-testid="modal-presensi-massal-panel"
        style={dynamicDialogStyle}
        className={`w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-5 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isKeyboardElevated
            ? 'max-h-[86dvh] sm:max-h-[92vh]'
            : 'max-h-[90dvh] sm:max-h-[94vh]'
        }`}
      >
        {/* ================================================================
            1. HEADER MODAL (Otomatis diringkas saat mengetik di HP - Gambar 4)
        ================================================================ */}
        <div
          className={`flex items-center justify-between border-b border-slate-100 shrink-0 transition-all ${
            isKeyboardElevated
              ? 'pb-1.5 mb-1.5 sm:pb-3 sm:mb-3'
              : 'pb-2.5 mb-2.5 sm:pb-3 sm:mb-3'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`flex items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs shrink-0 ${
                isKeyboardElevated
                  ? 'h-7 w-7 sm:h-10 sm:w-10'
                  : 'h-9 w-9 sm:h-10 sm:w-10'
              }`}
            >
              <Users className={isKeyboardElevated ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-5 w-5'} />
            </div>
            <div className="min-w-0">
              <h2
                id="modal-presensi-massal-title"
                className={`font-extrabold text-slate-900 leading-tight truncate ${
                  isKeyboardElevated ? 'text-xs sm:text-base' : 'text-sm sm:text-base'
                }`}
              >
                Penetapan Presensi Massal
              </h2>
              <p
                className={`text-[11px] sm:text-xs text-slate-500 m-0 ${
                  isKeyboardElevated ? 'hidden sm:block' : 'block'
                }`}
              >
                Pilih asatidz untuk menetapkan atau mengubah status presensi sekaligus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isKeyboardElevated && (
              <button
                type="button"
                onClick={() => {
                  setIsSearchFocused(false);
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }}
                className="sm:hidden inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
              >
                <ChevronDown className="w-3 h-3" />
                <span>Tutup Keyboard</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Tutup modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ================================================================
            2. BARIS KONTROL ATAS: TANGGAL, PILIH JAM 1-4, & TARGET STATUS
        ================================================================ */}
        <div
          className={`space-y-2 border-b border-slate-100 shrink-0 ${
            isKeyboardElevated ? 'pb-1.5 sm:pb-3' : 'pb-2.5 sm:pb-3'
          }`}
        >
          {/* Baris Tanggal & Jam (Disembunyikan sementara di layar HP saat fokus mengetik pencarian agar tabel naik ke atas) */}
          <div
            className={`flex-wrap items-center justify-between gap-2 ${
              isKeyboardElevated ? 'hidden sm:flex' : 'flex'
            }`}
          >
            {/* Tanggal & Switcher Jam */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] sm:text-xs font-bold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{tanggal}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-600 mr-0.5">
                  Jam:
                </span>
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
                  {([1, 2, 3, 4] as JamKbm[]).map((j) => {
                    const isJamActive = selectedJam === j;
                    return (
                      <button
                        key={j}
                        type="button"
                        onClick={() => handleSelectJam(j)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all ${
                          isJamActive
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        Jam {j}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Target Status Massal Selector (Desktop) */}
            <div className="hidden sm:flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">
                Status Target:
              </span>
              {TARGET_STATUS_OPTIONS.map((opt) => {
                const isActive = bulkTargetStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBulkTargetStatus(opt.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all ${
                      isActive ? opt.activeClass : opt.inactiveClass
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Status Massal Selector (Mobile - selalu tampil kompak dalam 1 baris) */}
          <div className="flex sm:hidden items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] font-bold text-slate-500 shrink-0 mr-0.5">
              Status Target:
            </span>
            {TARGET_STATUS_OPTIONS.map((opt) => {
              const isActive = bulkTargetStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBulkTargetStatus(opt.value)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border shrink-0 transition-all ${
                    isActive ? opt.activeClass : opt.inactiveClass
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Pencarian, Filter Blok, & Pilih Semua */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2.5 pt-0.5">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-[200px]">
              {/* Input Pencarian */}
              <div className="relative flex-1 min-w-[140px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  data-testid="input-search-presensi-massal"
                  value={bulkSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    // Tunda sedikit agar klik pada baris tabel tetap tereksekusi mulus
                    setTimeout(() => setIsSearchFocused(false), 180);
                  }}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  placeholder="Cari asatidz / kelas / fan..."
                  className="w-full h-8 pl-8 pr-7 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                {bulkSearch && (
                  <button
                    type="button"
                    onClick={() => setBulkSearch('')}
                    aria-label="Bersihkan pencarian"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Blok Kelas */}
              <select
                value={filterBlok}
                onChange={(e) => setFilterBlok(e.target.value)}
                className="h-8 max-w-[130px] sm:max-w-none rounded-xl border border-slate-300 bg-white px-2 sm:px-2.5 text-[11px] sm:text-xs font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="ALL">Semua Blok</option>
                {daftarBlok.map((b) => (
                  <option key={b} value={b}>
                    {formatLabelBlokHariKBM(b)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tombol Pilih Semua */}
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors shrink-0"
            >
              {isAllSelected && filteredKeys.length > 0 ? (
                <CheckSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-700" />
              ) : (
                <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400" />
              )}
              <span>
                Pilih Semua ({filteredList.length})
              </span>
            </button>
          </div>
        </div>

        {/* ================================================================
            3. TABEL DAFTAR ASATIDZ (KOMPAK DI MOBILE SEPERTI GAMBAR 3)
        ================================================================ */}
        <div
          data-testid="table-container-presensi-massal"
          className="flex-1 min-h-[120px] overflow-y-auto overflow-x-auto my-1.5 sm:my-2 border border-slate-200 rounded-xl bg-white"
        >
          <table
            data-testid="table-presensi-massal"
            className="w-full text-left border-collapse table-fixed sm:table-auto"
          >
            <thead className="bg-slate-50 text-[7px] sm:text-[11px] font-extrabold uppercase text-slate-600 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-1.5 px-1 sm:py-2.5 sm:px-3 w-[26px] sm:w-10 text-center">
                  Pilih
                </th>
                <th className="py-1.5 px-1 sm:py-2.5 sm:px-3 w-[30%] sm:w-auto">
                  Nama Asatidz
                </th>
                <th className="py-1.5 px-0.5 sm:py-2.5 sm:px-2 text-center w-[17%] sm:w-28">
                  Blok
                </th>
                <th className="py-1.5 px-1 sm:py-2.5 sm:px-2 text-left w-[18%] sm:w-36">
                  Kelas &amp; Fan
                </th>
                <th className="py-1.5 px-0.5 sm:py-2.5 sm:px-2 text-center w-[14%] sm:w-28 leading-tight">
                  Status Saat Ini
                </th>
                <th className="py-1.5 px-1 sm:py-2.5 sm:px-2 text-center w-[16%] sm:w-28 leading-tight">
                  Ubah Langsung
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[8.5px] sm:text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-xs text-slate-400 italic"
                  >
                    Tidak ada asatidz yang cocok dengan pencarian atau filter blok.
                  </td>
                </tr>
              ) : (
                filteredList.map((sesi) => {
                  const sKey = getSesiKey(tanggal, sesi);
                  const isSelected = selectedKeys.includes(sKey);
                  const curData = getSesiStatusData(sesi);
                  const curStatus = (curData.status || 'Hadir') as StatusAbsensi;
                  const curBadge = getStatusBadge(curStatus);

                  return (
                    <tr
                      key={sKey}
                      onClick={() => handleToggleRow(sKey)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/85 hover:bg-emerald-50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. Checkbox Pilih */}
                      <td
                        className="py-1 px-1 sm:py-2 sm:px-3 text-center align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(sKey)}
                          className="h-3 w-3 sm:h-4 sm:w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer align-middle"
                        />
                      </td>

                      {/* 2. Nama Asatidz & NIA */}
                      <td className="py-1 px-1 sm:py-2 sm:px-3 align-middle">
                        <div className="font-bold text-slate-900 leading-tight truncate">
                          {sesi.nama}
                        </div>
                        {sesi.nia && (
                          <div className="text-[7px] sm:text-[10px] font-mono text-slate-400 leading-none mt-0.5 truncate">
                            NIA: {sesi.nia}
                          </div>
                        )}
                      </td>

                      {/* 3. Blok Kelas */}
                      <td className="py-1 px-0.5 sm:py-2 sm:px-2 text-center align-middle">
                        <span className="inline-block max-w-full truncate px-1 py-0.5 sm:px-2 sm:py-0.5 rounded text-[7px] sm:text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 leading-tight">
                          {formatLabelBlokHariKBM(sesi.blok)}
                        </span>
                      </td>

                      {/* 4. Kelas & Fan */}
                      <td className="py-1 px-1 sm:py-2 sm:px-2 text-left align-middle">
                        <div className="inline-block max-w-full truncate px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[7px] sm:text-[10px] leading-none">
                          {sesi.kelasMengajar}
                        </div>
                        <div className="text-[7px] sm:text-[10px] text-slate-600 truncate leading-tight mt-0.5">
                          {sesi.fan}
                        </div>
                      </td>

                      {/* 5. Status Saat Ini */}
                      <td className="py-1 px-0.5 sm:py-2 sm:px-2 text-center align-middle">
                        <span
                          className={`inline-block max-w-full truncate px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[7px] sm:text-[10px] font-extrabold border leading-none ${curBadge.badgeClass}`}
                        >
                          {curBadge.label}
                          {curData.namaPengganti
                            ? ` (${curData.namaPengganti})`
                            : curData.menitTerlambat
                            ? ` (${curData.menitTerlambat}m)`
                            : ''}
                        </span>
                      </td>

                      {/* 6. Dropdown Ubah Langsung */}
                      <td
                        className="py-1 px-1 sm:py-2 sm:px-2 text-center align-middle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          aria-label={`Ubah status langsung ${sesi.nama}`}
                          value={curStatus}
                          onChange={(e) => {
                            const newSt = e.target.value as StatusAbsensi;
                            onQuickChangeSingle(sesi, { status: newSt });
                          }}
                          className="h-5 sm:h-7 w-full max-w-[62px] sm:max-w-[104px] text-center rounded-md sm:rounded-lg border border-slate-300 bg-white text-[8px] sm:text-xs font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-600 px-0.5 sm:px-1.5"
                        >
                          {PILIHAN_DROPDOWN_ROW.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ================================================================
            4. FOOTER MODAL (SELALU TAMPIL & TIDAK TERTUTUP NAVBAR HP - GAMBAR 2)
        ================================================================ */}
        <div
          data-testid="footer-presensi-massal"
          className="flex items-center justify-between gap-2 pt-2 sm:pt-3 border-t border-slate-200 bg-white shrink-0 z-20"
        >
          <span className="text-[11px] sm:text-xs text-slate-600">
            Terpilih:{' '}
            <strong className="text-emerald-800 font-extrabold">
              {selectedKeys.length}
            </strong>{' '}
            dari {filteredList.length} asatidz
          </span>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              data-testid="btn-apply-presensi-massal"
              disabled={selectedKeys.length === 0}
              onClick={handleApply}
              className={`px-3 sm:px-4 py-1.5 text-xs font-extrabold rounded-xl transition-all shadow-xs disabled:opacity-40 inline-flex items-center gap-1.5 ${currentTargetMeta.buttonApplyClass}`}
            >
              <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>
                Terapkan {currentTargetMeta.short} ({selectedKeys.length})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
