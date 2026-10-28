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
  daftarBlok,
}: ModalPresensiMassalProps) {
  const [selectedJam, setSelectedJam] = useState<JamKbm>(initialJam || 1);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<StatusAbsensi>('Hadir');
  const [bulkSearch, setBulkSearch] = useState<string>('');
  const [filterBlok, setFilterBlok] = useState<string>('ALL');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Sinkronisasi saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setSelectedJam(initialJam || 1);
      setSelectedKeys([]);
      setBulkSearch('');
      setFilterBlok('ALL');
    }
  }, [isOpen, initialJam]);

  const handleSelectJam = (j: JamKbm) => {
    if (j !== selectedJam) {
      setSelectedJam(j);
      setSelectedKeys([]);
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
        return a.kelasMengajar.localeCompare(b.kelasMengajar, undefined, {
          numeric: true,
        });
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-presensi-massal-title"
    >
      <div className="w-full max-w-4xl max-h-[94vh] rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl flex flex-col">
        {/* ================================================================
            1. HEADER MODAL
        ================================================================ */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-800 text-white shadow-xs">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="modal-presensi-massal-title"
                className="text-base font-extrabold text-slate-900 leading-tight"
              >
                Penetapan Presensi Massal
              </h2>
              <p className="text-xs text-slate-500 m-0">
                Pilih asatidz untuk menetapkan atau mengubah status presensi sekaligus
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ================================================================
            2. BARIS KONTROL ATAS: TANGGAL, PILIH JAM 1-4, & TARGET STATUS
        ================================================================ */}
        <div className="space-y-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Tanggal & Switcher Jam */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{tanggal}</span>
              </div>

              <div className="flex items-center gap-1 ml-1">
                <span className="text-xs font-semibold text-slate-500 mr-0.5">
                  Jam:
                </span>
                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200">
                  {([1, 2, 3, 4] as JamKbm[]).map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => handleSelectJam(j)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                        selectedJam === j
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Jam {j}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Status Massal Selector */}
            <div className="flex flex-wrap items-center gap-1.5">
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

          {/* Pencarian, Filter Blok, & Pilih Semua */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
              {/* Input Pencarian */}
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  placeholder="Cari asatidz / kelas / fan..."
                  className="w-full h-8 pl-8 pr-7 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                {bulkSearch && (
                  <button
                    type="button"
                    onClick={() => setBulkSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Blok Kelas */}
              <select
                value={filterBlok}
                onChange={(e) => setFilterBlok(e.target.value)}
                className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition-colors"
            >
              {isAllSelected && filteredKeys.length > 0 ? (
                <CheckSquare className="h-4 w-4 text-emerald-700" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>
                Pilih Semua ({filteredList.length})
              </span>
            </button>
          </div>
        </div>

        {/* ================================================================
            3. TABEL DAFTAR ASATIDZ (SCROLLABLE & STICKY HEADER)
        ================================================================ */}
        <div className="flex-1 overflow-auto my-2 border border-slate-200 rounded-xl min-h-[220px] max-h-[52vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 sticky top-0 z-10 shadow-2xs">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                <th className="py-2.5 px-3">Nama Asatidz</th>
                <th className="py-2.5 px-2 text-center w-28">Blok</th>
                <th className="py-2.5 px-2 text-left w-36">Kelas & Fan</th>
                <th className="py-2.5 px-2 text-center w-28">Status Saat Ini</th>
                <th className="py-2.5 px-2 text-center w-28">Ubah Langsung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 italic">
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
                          ? 'bg-emerald-50/80 hover:bg-emerald-50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-2 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(sKey)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Nama Asatidz */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 leading-tight">
                          {sesi.nama}
                        </div>
                        {sesi.nia && (
                          <div className="text-[10px] font-mono text-slate-400">
                            NIA: {sesi.nia}
                          </div>
                        )}
                      </td>

                      {/* Blok Kelas */}
                      <td className="py-2 px-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {formatLabelBlokHariKBM(sesi.blok)}
                        </span>
                      </td>

                      {/* Kelas & Fan */}
                      <td className="py-2 px-2 text-left">
                        <div className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[10px]">
                          {sesi.kelasMengajar}
                        </div>
                        <div className="text-[10px] text-slate-600 truncate max-w-[130px]">
                          {sesi.fan}
                        </div>
                      </td>

                      {/* Status Saat Ini */}
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${curBadge.badgeClass}`}
                        >
                          {curBadge.label}
                          {curData.namaPengganti
                            ? ` (${curData.namaPengganti})`
                            : curData.menitTerlambat
                            ? ` (${curData.menitTerlambat}m)`
                            : ''}
                        </span>
                      </td>

                      {/* Dropdown Ubah Langsung */}
                      <td
                        className="py-2 px-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={curStatus}
                          onChange={(e) => {
                            const newSt = e.target.value as StatusAbsensi;
                            onQuickChangeSingle(sesi, { status: newSt });
                          }}
                          className="h-7 w-26 text-center rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
            4. FOOTER MODAL
        ================================================================ */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
          <span className="text-xs text-slate-600">
            Terpilih:{' '}
            <strong className="text-emerald-800 font-extrabold">
              {selectedKeys.length}
            </strong>{' '}
            dari {filteredList.length} asatidz
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={selectedKeys.length === 0}
              onClick={handleApply}
              className={`px-4 py-1.5 text-xs font-extrabold rounded-xl transition-all shadow-xs disabled:opacity-40 inline-flex items-center gap-1.5 ${currentTargetMeta.buttonApplyClass}`}
            >
              <Check className="h-4 w-4" />
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
