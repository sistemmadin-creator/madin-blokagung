'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { Asatidz } from '@/types/asatidz';
import { BarChart2, MessageSquare, Download, RefreshCw, Search, AlertCircle } from 'lucide-react';
import { exportToExcel } from '@/lib/utils/excel';
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
  const { asatidzList, fetchAsatidz, isLoading: loadingAsatidz } = useAsatidzStore();

  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [search, setSearch] = useState('');
  const [showWAModal, setShowWAModal] = useState(false);

  // Drilldown state
  const [drilldownTeacher, setDrilldownTeacher] = useState<string | null>(null);
  const [drilldownItems, setDrilldownItems] = useState<RekapAbsenceItem[]>([]);

  useEffect(() => {
    fetchAbsensi();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchAbsensi, fetchAsatidz, asatidzList.length]);

  // Aggregate attendance data across the date range
  const rekapRows = useMemo(() => {
    // Map asatidz lookup
    const asatidzMap = new Map<string, Asatidz>();
    asatidzList.forEach((a) => asatidzMap.set(a.nama_asatidz.toUpperCase(), a));

    // Stats map: { "TEACHER_UPPER": { hadir, izin, sakit, alfa, badal, total, absences: [] } }
    const stats: Record<
      string,
      {
        nama: string;
        nia: string;
        jah: string;
        hadir: number;
        izin: number;
        sakit: number;
        alfa: number;
        badal: number;
        total: number;
        absences: RekapAbsenceItem[];
      }
    > = {};

    // Initialize stats with all known asatidz
    asatidzList.forEach((a) => {
      stats[a.nama_asatidz.toUpperCase()] = {
        nama: a.nama_asatidz,
        nia: a.nia,
        jah: a.jah_asatidz || '-',
        hadir: 0,
        izin: 0,
        sakit: 0,
        alfa: 0,
        badal: 0,
        total: 0,
        absences: [],
      };
    });

    // Loop through dates within range
    Object.keys(absensiMapByDate).forEach((dateKey) => {
      if (dateKey >= startDate && dateKey <= endDate) {
        const dateSessions = absensiMapByDate[dateKey];
        if (!dateSessions) return;

        [1, 2, 3, 4].forEach((jamNum) => {
          const records = dateSessions[jamNum as 1 | 2 | 3 | 4] || [];
          records.forEach((r) => {
            const key = r.nama_asatidz.toUpperCase();
            if (!stats[key]) {
              stats[key] = {
                nama: r.nama_asatidz,
                nia: r.nia || '-',
                jah: '-',
                hadir: 0,
                izin: 0,
                sakit: 0,
                alfa: 0,
                badal: 0,
                total: 0,
                absences: [],
              };
            }

            stats[key].total++;

            if (r.status === 'Hadir') {
              stats[key].hadir++;
            } else if (r.status === 'Izin') {
              stats[key].izin++;
              stats[key].absences.push({
                tanggal: dateKey,
                jam: jamNum,
                kelas: r.kelas,
                fan: r.fan,
                status: 'Izin',
                keterangan: r.keterangan,
              });
            } else if (r.status === 'Sakit') {
              stats[key].sakit++;
              stats[key].absences.push({
                tanggal: dateKey,
                jam: jamNum,
                kelas: r.kelas,
                fan: r.fan,
                status: 'Sakit',
                keterangan: r.keterangan,
              });
            } else if (r.status === 'Alfa') {
              stats[key].alfa++;
              stats[key].absences.push({
                tanggal: dateKey,
                jam: jamNum,
                kelas: r.kelas,
                fan: r.fan,
                status: 'Alfa',
              });
            } else if (r.status === 'Badal') {
              stats[key].badal++;
              stats[key].absences.push({
                tanggal: dateKey,
                jam: jamNum,
                kelas: r.kelas,
                fan: r.fan,
                status: 'Badal',
                pengganti: r.asatidz_pengganti,
              });
            }
          });
        });
      }
    });

    return Object.values(stats)
      .filter((s) => s.total > 0)
      .map((s) => {
        const persen = s.total > 0 ? Math.round(((s.hadir + s.badal) / s.total) * 100) : 0;
        let predikat = 'Kurang';
        if (persen >= 90) predikat = 'Sangat Baik';
        else if (persen >= 80) predikat = 'Baik';
        else if (persen >= 70) predikat = 'Cukup';

        return { ...s, persen, predikat };
      })
      .sort((a, b) => b.persen - a.persen || a.nama.localeCompare(b.nama));
  }, [absensiMapByDate, asatidzList, startDate, endDate]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rekapRows;
    return rekapRows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.nia.toLowerCase().includes(q) ||
        r.jah.toLowerCase().includes(q) ||
        r.predikat.toLowerCase().includes(q)
    );
  }, [rekapRows, search]);

  const handleRowClick = (row: RekapRowItem) => {
    setDrilldownTeacher(row.nama);
    setDrilldownItems(row.absences);
  };

  const handleExport = () => {
    const exportData = filteredRows.map((r) => ({
      NIA: r.nia,
      'Nama Asatidz': r.nama,
      Amanah: r.jah,
      'Total Tugas': r.total,
      Hadir: r.hadir,
      Izin: r.izin,
      Sakit: r.sakit,
      Alfa: r.alfa,
      Badal: r.badal,
      'Persentase (%)': `${r.persen}%`,
      Predikat: r.predikat,
    }));
    exportToExcel(exportData, `Rekap_Absensi_${startDate}_sd_${endDate}`);
  };

  // Top 10 Alfa
  const top10Alfa = useMemo(() => {
    return [...rekapRows].sort((a, b) => b.alfa - a.alfa).slice(0, 5).filter((r) => r.alfa > 0);
  }, [rekapRows]);

  const isLoading = loadingAbsensi || loadingAsatidz;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Rekapitulasi Absensi & Generator WA</h1>
            <p className="text-xs text-slate-500">
              Laporan Kehadiran, Analisis KPI Dewan Asatidz, dan Generator Pesan WhatsApp
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowWAModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Generator Pesan WA</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-600">Rentang Tanggal:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
          />
          <span className="text-xs text-slate-400">s.d.</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
          />
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama asatidz, predikat..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Top 5 Alfa Notice if exists */}
      {top10Alfa.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold">Perhatian: Asatidz dengan Catatan Alfa Terbanyak</h4>
            <div className="flex flex-wrap gap-2 pt-1">
              {top10Alfa.map((t) => (
                <span
                  key={t.nama}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-semibold"
                >
                  <span>{t.nama}</span>
                  <span className="text-rose-600">({t.alfa} Alfa)</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabel Rekapitulasi Kehadiran Asatidz */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold z-10 select-none">
              <tr>
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">Nama Asatidz</th>
                <th className="p-3">NIA / Jah</th>
                <th className="p-3 text-center">Total Tugas</th>
                <th className="p-3 text-center text-emerald-700">Hadir</th>
                <th className="p-3 text-center text-amber-700">Izin</th>
                <th className="p-3 text-center text-blue-700">Sakit</th>
                <th className="p-3 text-center text-rose-700">Alfa</th>
                <th className="p-3 text-center text-purple-700">Badal</th>
                <th className="p-3 text-center">% Kehadiran</th>
                <th className="p-3 text-center">Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Mengkalkulasi rekapitulasi kehadiran dewan asatidz...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    Belum ada catatan presensi pada rentang tanggal ini.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr
                    key={row.nama || idx}
                    onClick={() => handleRowClick(row)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                    title="Klik untuk melihat tanggal dan jam ketidakhadiran"
                  >
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                      {row.nama}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono text-slate-500">{row.nia}</span>
                      {row.jah !== '-' && (
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {row.jah}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-700 font-mono">
                      {row.total}
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700 font-mono bg-emerald-50/20">
                      {row.hadir}
                    </td>
                    <td className="p-3 text-center font-bold text-amber-700 font-mono">
                      {row.izin || '-'}
                    </td>
                    <td className="p-3 text-center font-bold text-blue-700 font-mono">
                      {row.sakit || '-'}
                    </td>
                    <td className="p-3 text-center font-bold text-rose-700 font-mono bg-rose-50/20">
                      {row.alfa || '-'}
                    </td>
                    <td className="p-3 text-center font-bold text-purple-700 font-mono">
                      {row.badal || '-'}
                    </td>

                    {/* Persen */}
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {row.persen}%
                    </td>

                    {/* Predikat */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.predikat === 'Sangat Baik'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.predikat === 'Baik'
                            ? 'bg-blue-100 text-blue-800'
                            : row.predikat === 'Cukup'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {row.predikat}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
