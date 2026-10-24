'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { Asatidz } from '@/types/asatidz';
import {
  BarChart2,
  RefreshCw,
  Search,
  Printer,
  FileSpreadsheet,
  Trophy,
  MessageSquare,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ModalGeneratorWA from '@/components/modules/rekap-absensi/ModalGeneratorWA';
import ModalDrilldownRekap from '@/components/modules/rekap-absensi/ModalDrilldownRekap';

export interface RekapAbsenceItem {
  tanggal: string;
  jam: number;
  kelas: string;
  fan: string;
  status: string;
  keterangan?: string;
  pengganti?: string;
}

export interface RekapRowItem {
  nama: string;
  nia: string;
  jah: string;
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
  badal: number;
  total: number;
  persen: number;
  predikat: string;
  absences: RekapAbsenceItem[];
}

export default function RekapAbsensiPage() {
  const { absensiMapByDate, fetchAbsensi, isLoading: loadingAbsensi } = useAbsensiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [search, setSearch] = useState('');
  const [showWAModal, setShowWAModal] = useState(false);
  const [showTop10Dropdown, setShowTop10Dropdown] = useState(false);

  // Drilldown state
  const [drilldownTeacher, setDrilldownTeacher] = useState<string | null>(null);
  const [drilldownItems, setDrilldownItems] = useState<RekapAbsenceItem[]>([]);

  useEffect(() => {
    fetchAbsensi();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchAbsensi, fetchAsatidz, asatidzList.length]);

  const setRangeQuick = (type: 'minggu' | 'bulan' | 'lalu') => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (type === 'minggu') {
      const first = now.getDate() - now.getDay();
      const last = first + 6;
      const d1 = new Date(now.setDate(first));
      const d2 = new Date(now.setDate(last));
      setStartDate(`${d1.getFullYear()}-${pad(d1.getMonth() + 1)}-${pad(d1.getDate())}`);
      setEndDate(`${d2.getFullYear()}-${pad(d2.getMonth() + 1)}-${pad(d2.getDate())}`);
    } else if (type === 'bulan') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const lastDay = new Date(y, m + 1, 0).getDate();
      setStartDate(`${y}-${pad(m + 1)}-01`);
      setEndDate(`${y}-${pad(m + 1)}-${pad(lastDay)}`);
    } else if (type === 'lalu') {
      const y = now.getFullYear();
      const m = now.getMonth() - 1;
      const lastDay = new Date(y, m + 1, 0).getDate();
      setStartDate(`${y}-${pad(m + 1)}-01`);
      setEndDate(`${y}-${pad(m + 1)}-${pad(lastDay)}`);
    }
  };

  // Aggregate attendance data across the date range
  const rekapRows: RekapRowItem[] = useMemo(() => {
    const asatidzMap = new Map<string, Asatidz>();
    asatidzList.forEach((a) => asatidzMap.set(a.nama_asatidz.toUpperCase(), a));

    const statsMap: Record<
      string,
      {
        nama: string;
        hadir: number;
        izin: number;
        sakit: number;
        alfa: number;
        badal: number;
        absences: RekapAbsenceItem[];
      }
    > = {};

    asatidzList.forEach((a) => {
      statsMap[a.nama_asatidz.toUpperCase()] = {
        nama: a.nama_asatidz,
        hadir: 0,
        izin: 0,
        sakit: 0,
        alfa: 0,
        badal: 0,
        absences: [],
      };
    });

    Object.entries(absensiMapByDate).forEach(([dateStr, sessionObj]) => {
      if (dateStr >= startDate && dateStr <= endDate) {
        Object.values(sessionObj).forEach((records) => {
          records.forEach((r) => {
            const key = r.nama_asatidz.toUpperCase();
            if (!statsMap[key]) {
              statsMap[key] = {
                nama: r.nama_asatidz,
                hadir: 0,
                izin: 0,
                sakit: 0,
                alfa: 0,
                badal: 0,
                absences: [],
              };
            }

            if (r.status === 'Hadir') statsMap[key].hadir++;
            else if (r.status === 'Badal') statsMap[key].badal++;
            else if (r.status === 'Izin') {
              statsMap[key].izin++;
              statsMap[key].absences.push({
                tanggal: dateStr,
                jam: r.jam,
                kelas: r.kelas,
                fan: r.fan,
                status: 'Izin',
                keterangan: r.keterangan,
              });
            } else if (r.status === 'Sakit') {
              statsMap[key].sakit++;
              statsMap[key].absences.push({
                tanggal: dateStr,
                jam: r.jam,
                kelas: r.kelas,
                fan: r.fan,
                status: 'Sakit',
                keterangan: r.keterangan,
              });
            } else if (r.status === 'Alfa') {
              statsMap[key].alfa++;
              statsMap[key].absences.push({
                tanggal: dateStr,
                jam: r.jam,
                kelas: r.kelas,
                fan: r.fan,
                status: 'Alfa',
                keterangan: r.keterangan,
              });
            }
          });
        });
      }
    });

    return Object.values(statsMap).map((item) => {
      const aObj = asatidzMap.get(item.nama.toUpperCase());
      const total = item.hadir + item.badal + item.izin + item.sakit + item.alfa;
      const validAttend = item.hadir + item.badal;
      const persen = total > 0 ? Math.round((validAttend / total) * 100) : 0;

      let predikat = 'Cukup';
      if (persen >= 90) predikat = 'Sangat Baik (A)';
      else if (persen >= 75) predikat = 'Baik (B)';
      else if (persen < 60 && total > 0) predikat = 'Kurang (D)';

      return {
        nama: item.nama,
        nia: aObj?.nia || '-',
        jah: aObj?.jah_asatidz || '-',
        hadir: item.hadir,
        badal: item.badal,
        izin: item.izin,
        sakit: item.sakit,
        alfa: item.alfa,
        total,
        persen,
        predikat,
        absences: item.absences,
      };
    }).sort((a, b) => b.total - a.total);
  }, [absensiMapByDate, startDate, endDate, asatidzList]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rekapRows;
    const q = search.toLowerCase().trim();
    return rekapRows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.nia.toLowerCase().includes(q) ||
        r.jah.toLowerCase().includes(q)
    );
  }, [rekapRows, search]);

  const top10Alfa = useMemo(() => {
    return [...rekapRows].sort((a, b) => b.alfa - a.alfa).slice(0, 10);
  }, [rekapRows]);

  const handleExportExcel = () => {
    const data = filteredRows.map((r, idx) => ({
      NO: idx + 1,
      NIA: r.nia,
      'NAMA ASATIDZ': r.nama,
      JAH: r.jah,
      HADIR: r.hadir,
      BADAL: r.badal,
      IZIN: r.izin,
      SAKIT: r.sakit,
      ALFA: r.alfa,
      TOTAL: r.total,
      '% KEHADIRAN': `${r.persen}%`,
      PREDIKAT: r.predikat,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap_Absensi');
    XLSX.writeFile(wb, `Rekap_Absensi_${startDate}_sd_${endDate}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai rekap-absensi.html */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-6 h-6 text-madin-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Rekap Absensi Asatidz
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Ringkasan kinerja kehadiran mengajar per periode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap relative">
            <button
              type="button"
              onClick={() => setShowWAModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Broadcast WA</span>
            </button>

            <button
              type="button"
              onClick={fetchAbsensi}
              disabled={loadingAbsensi}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAbsensi ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-madin-700" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-madin-700 hover:bg-madin-800 text-white transition shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap Resmi</span>
            </button>

            {/* Dropdown Top 10 Alfa */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTop10Dropdown((prev) => !prev)}
                className="px-3 py-2 text-xs font-bold rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 transition shadow-xs flex items-center gap-1"
              >
                <Trophy className="w-3.5 h-3.5 text-rose-500" />
                <span>Top 10 Alfa</span>
              </button>

              {showTop10Dropdown && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1 text-[11px] font-bold text-rose-600 uppercase">
                    Peringkat Alfa Terbanyak
                  </div>
                  <hr className="my-1 border-slate-100" />
                  <button
                    onClick={() => {
                      setShowTop10Dropdown(false);
                      window.print();
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 font-medium"
                  >
                    Cetak Dokumen Resmi
                  </button>
                  <button
                    onClick={() => {
                      setShowTop10Dropdown(false);
                      const ws = XLSX.utils.json_to_sheet(top10Alfa);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Top_10_Alfa');
                      XLSX.writeFile(wb, 'Top_10_Alfa_Asatidz.xlsx');
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-slate-50 font-medium text-emerald-700"
                  >
                    Unduh Berkas Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter Periode & Pintasan */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end mt-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Dari Tanggal:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Sampai Tanggal:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Pintasan Periode:
            </label>
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-50 w-full">
              <button
                type="button"
                onClick={() => setRangeQuick('minggu')}
                className="flex-1 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white rounded transition"
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={() => setRangeQuick('bulan')}
                className="flex-1 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white rounded transition"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setRangeQuick('lalu')}
                className="flex-1 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white rounded transition"
              >
                Bulan Lalu
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Cari Asatidz:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama / NIA / Jah..."
                className="w-full text-xs pl-8 pr-7 py-2 rounded-lg border border-slate-300 focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Dokumen Tabel Rekapitulasi Sesuai rekap-absensi.html */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm">
        <div className="text-center mb-4">
          <h5 className="font-bold text-sm md:text-base text-slate-800 uppercase tracking-wide m-0">
            REKAPITULASI KEHADIRAN MENGAJAR ASATIDZ
          </h5>
          <h6 className="font-bold text-slate-500 text-xs md:text-sm m-0 mt-1">
            Periode: {startDate} s/d {endDate}
          </h6>
        </div>

        <div className="table-responsive overflow-x-auto">
          <table className="tabel-kbm-resmi w-full">
            <thead>
              <tr>
                <th style={{ width: 40 }}>NO</th>
                <th style={{ width: 65 }}>NIA</th>
                <th style={{ minWidth: 180 }}>NAMA ASATIDZ</th>
                <th style={{ width: 100 }}>JAH</th>
                <th style={{ width: 65 }}>HADIR</th>
                <th style={{ width: 65 }}>BADAL</th>
                <th style={{ width: 60 }}>IZIN</th>
                <th style={{ width: 60 }}>SAKIT</th>
                <th style={{ width: 60 }}>ALFA</th>
                <th style={{ width: 65 }}>TOTAL</th>
                <th style={{ width: 85 }}>% HADIR</th>
                <th style={{ width: 120 }}>PREDIKAT</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-6 text-slate-400">
                    Tidak ada catatan presensi dalam rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => (
                  <tr
                    key={r.nama}
                    onClick={() => {
                      if (r.absences.length > 0) {
                        setDrilldownTeacher(r.nama);
                        setDrilldownItems(r.absences);
                      }
                    }}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    title={r.absences.length > 0 ? 'Klik untuk lihat detail ketidakhadiran' : undefined}
                  >
                    <td className="text-center font-bold text-slate-600">{idx + 1}</td>
                    <td className="cell-kg font-mono font-bold">{r.nia}</td>
                    <td className="font-semibold text-slate-800 px-2 text-left">{r.nama}</td>
                    <td className="text-xs text-slate-600 px-2">{r.jah}</td>
                    <td className="text-center font-bold text-emerald-700">{r.hadir}</td>
                    <td className="text-center font-bold text-blue-700">{r.badal}</td>
                    <td className="text-center text-amber-700 font-semibold">{r.izin}</td>
                    <td className="text-center text-orange-700 font-semibold">{r.sakit}</td>
                    <td className="text-center text-rose-700 font-bold bg-rose-50/50">{r.alfa}</td>
                    <td className="text-center font-bold text-slate-700">{r.total}</td>
                    <td className="text-center font-bold text-madin-700">{r.persen}%</td>
                    <td className="text-center text-xs font-semibold">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          r.persen >= 85
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.persen >= 70
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.predikat}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ModalGeneratorWA
        isOpen={showWAModal}
        onClose={() => setShowWAModal(false)}
      />
      <ModalDrilldownRekap
        isOpen={!!drilldownTeacher}
        onClose={() => setDrilldownTeacher(null)}
        teacherName={drilldownTeacher || ''}
        items={drilldownItems}
      />
    </div>
  );
}
