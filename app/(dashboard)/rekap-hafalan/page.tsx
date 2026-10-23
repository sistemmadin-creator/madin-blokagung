'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { BarChart2, Download, RefreshCw, Search } from 'lucide-react';
import { exportToExcel } from '@/lib/utils/excel';

export default function RekapHafalanPage() {
  const { setoranList, fetchSetoranData, isLoading: loadingSetoran } = useMuhafadzohStore();
  const { formasiList, fetchFormasi, isLoading: loadingFormasi } = useFormasiStore();
  const { santriList, fetchSantri, isLoading: loadingSantri } = useSantriStore();

  const [selectedTingkat, setSelectedTingkat] = useState('SEMUA');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSetoranData();
    if (formasiList.length === 0) fetchFormasi();
    if (santriList.length === 0) fetchSantri();
  }, [fetchSetoranData, fetchFormasi, fetchSantri, formasiList.length, santriList.length]);

  // Aggregate progress per class
  const classProgressRows = useMemo(() => {
    return formasiList.map((f) => {
      const kelasLabel = `${f.tingkat} ${f.din_kls}${f.din_bag} (${f.pa_pi})`;

      // Find santri in this class
      const classSantri = santriList.filter(
        (s) =>
          s.pa_pi === f.pa_pi &&
          String(s.tingkat || '').toUpperCase() === String(f.tingkat).toUpperCase() &&
          String(s.din_kls || '').toUpperCase() === String(f.din_kls).toUpperCase() &&
          String(s.din_bag || '').toUpperCase() === String(f.din_bag).toUpperCase()
      );
      const totalSantri = classSantri.length;

      // Find all setoran by santri in this class
      const noIndukSet = new Set(classSantri.map((s) => s.no_induk));
      const classSetoran = setoranList.filter((setoran) => noIndukSet.has(setoran.no_induk));

      // Calculate khatam / tuntas count
      const tuntasCount = classSantri.filter((s) => {
        return classSetoran.some(
          (setoran) =>
            setoran.no_induk === s.no_induk &&
            (setoran.capaian.toLowerCase().includes('khatam') ||
             setoran.capaian.toLowerCase().includes('tuntas') ||
             setoran.capaian.toLowerCase().includes('akhir'))
        );
      }).length;

      const persentase = totalSantri > 0 ? Math.round((tuntasCount / totalSantri) * 100) : 0;

      return {
        id: f.id,
        tingkat: f.tingkat,
        kelas: `${f.din_kls}-${f.din_bag}`,
        kelasLabel,
        waliKelas: f.id_mustahiq || '-',
        domisili: f.domisili || '-',
        totalSantri,
        totalSetoran: classSetoran.length,
        tuntasCount,
        persentase,
      };
    });
  }, [formasiList, santriList, setoranList]);

  const filteredClassRows = useMemo(() => {
    return classProgressRows.filter((r) => {
      const matchTingkat = selectedTingkat === 'SEMUA' || r.tingkat === selectedTingkat;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.kelasLabel.toLowerCase().includes(q) ||
        r.waliKelas.toLowerCase().includes(q) ||
        r.domisili.toLowerCase().includes(q);
      return matchTingkat && matchSearch;
    });
  }, [classProgressRows, selectedTingkat, search]);

  const handleExport = () => {
    const data = filteredClassRows.map((r, idx) => ({
      No: idx + 1,
      'Rombel Kelas': r.kelasLabel,
      'Wali Kelas': r.waliKelas,
      'Domisili Blok': r.domisili,
      'Jumlah Santri': r.totalSantri,
      'Total Transaksi Setoran': r.totalSetoran,
      'Santri Tuntas/Khatam': r.tuntasCount,
      'Persentase Ketuntasan (%)': `${r.persentase}%`,
    }));
    exportToExcel(data, 'Rekapitulasi_Capaian_Hafalan_Pertingkatan');
  };

  const isLoading = loadingSetoran || loadingFormasi || loadingSantri;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-madin-50 text-madin-700 flex items-center justify-center shadow-xs">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Rekapitulasi Hafalan Pertingkatan</h1>
            <p className="text-xs text-slate-500">
              Capaian Persentase Ketuntasan Target Muhafadzoh Per Rombel Kelas dan Blok Kamar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['SEMUA', 'Ula', 'Wustho', 'Ulya'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTingkat(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                selectedTingkat === t
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {t === 'SEMUA' ? 'Semua Tingkat' : `Tingkat ${t}`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari rombel kelas, wali kelas..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600"
          />
        </div>
      </div>

      {/* Tabel Rekap Capaian Hafalan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold z-10 select-none">
              <tr>
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">Rombel Kelas Diniyyah</th>
                <th className="p-3">Wali Kelas (Mustahiq)</th>
                <th className="p-3">Domisili Blok</th>
                <th className="p-3 text-center">Jumlah Santri</th>
                <th className="p-3 text-center">Total Setoran</th>
                <th className="p-3 text-center">Santri Khatam / Tuntas</th>
                <th className="p-3 text-center w-48">Persentase Ketuntasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-madin-600" />
                    Mengkalkulasi capaian ketuntasan hafalan santri...
                  </td>
                </tr>
              ) : filteredClassRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    Belum ada data rombel kelas untuk kriteria ini.
                  </td>
                </tr>
              ) : (
                filteredClassRows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                      {row.kelasLabel}
                    </td>
                    <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">
                      {row.waliKelas}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{row.domisili}</td>
                    <td className="p-3 text-center font-bold text-slate-800 font-mono">
                      {row.totalSantri} Santri
                    </td>
                    <td className="p-3 text-center font-bold text-slate-600 font-mono">
                      {row.totalSetoran} Kali
                    </td>
                    <td className="p-3 text-center font-bold text-emerald-700 font-mono">
                      {row.tuntasCount} Santri
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              row.persentase >= 80
                                ? 'bg-emerald-500'
                                : row.persentase >= 50
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(row.persentase, 100)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Capaian</span>
                          <span className="font-bold text-slate-700">{row.persentase}%</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
