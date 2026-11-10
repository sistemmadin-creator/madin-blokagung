'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  UserCheck,
  Search,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEbtadinStore } from '@/stores/useEbtadinStore';

export default function EbtadinAsatidzPage() {
  const { activeTahun, asatidzList, isLoading, fetchTahunList, fetchEbtadinMasterData } = useEbtadinStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');

  useEffect(() => {
    fetchTahunList();
  }, [fetchTahunList]);

  const filteredAsatidz = useMemo(() => {
    return asatidzList.filter((a) => {
      if (filterTingkat && (a.tingkat_asatidz || '').toUpperCase() !== filterTingkat.toUpperCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.nama_asatidz.toLowerCase().includes(q);
        const matchesNia = (a.nia || '').includes(q);
        const matchesPeran = (a.peran_ebtadin || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNia && !matchesPeran) return false;
      }
      return true;
    });
  }, [asatidzList, filterTingkat, searchQuery]);

  const totalAsatidz = asatidzList.length;
  const totalMustahiq = asatidzList.filter((a) => (a.peran_ebtadin || '').toLowerCase().includes('mustahiq')).length || totalAsatidz;

  const handleExportExcel = () => {
    if (filteredAsatidz.length === 0) return;
    const data = filteredAsatidz.map((a, idx) => ({
      No: idx + 1,
      NIA: a.nia || '-',
      'Nama Asatidz': a.nama_asatidz,
      Tingkat: a.tingkat_asatidz || '-',
      Kelas: `${a.din_kls_asatidz || ''} ${a.din_bag_asatidz || ''}`.trim() || '-',
      'Putra/Putri': a.pa_pi || '-',
      'Peran EBTADIN': a.peran_ebtadin || 'Mustahiq / Pengawas Ruang',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asatidz_EBTADIN');
    XLSX.writeFile(wb, `Asatidz_EBTADIN_${activeTahun?.tahun_masehi || 2026}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-xl bg-cyan-100 text-[#0f766e] flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-2xs">
              <UserCheck className="w-7 h-7 text-[#0f766e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                  Data Asatidz &amp; Penguji EBTADIN
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-[#0f766e] border border-emerald-300">
                  {activeTahun?.tahun_masehi || 2026}
                </span>
              </div>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Direktori Mustahiq kelas akhir, pengawas ruang ujian, dan penguji EBTADIN Madrasah Diniyyah.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/ebtadin"
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Pusat Kendali</span>
            </Link>
            <button
              type="button"
              onClick={() => activeTahun && fetchEbtadinMasterData(activeTahun.id)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white transition shadow-2xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Asatidz Terdaftar</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalAsatidz} Asatidz</div>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-700 uppercase">Mustahiq Kelas Akhir</span>
            <div className="text-xl font-bold text-amber-900 mt-1">{totalMustahiq} Mustahiq</div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-700 uppercase">Status Pengawas</span>
            <div className="text-xl font-bold text-emerald-900 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Siap Tugas
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama asatidz, NIA, atau peran..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="text-xs font-semibold py-2 px-3 rounded-lg border border-slate-300 bg-white"
            >
              <option value="">Semua Tingkat</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Data Asatidz */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-3.5">NIA</th>
                <th className="py-3 px-3.5">Nama Asatidz</th>
                <th className="py-3 px-3.5">Binaan Tingkat/Kelas</th>
                <th className="py-3 px-3.5">Gender</th>
                <th className="py-3 px-3.5">Peran EBTADIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAsatidz.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    {isLoading ? 'Memuat data asatidz EBTADIN...' : 'Tidak ada data asatidz yang cocok.'}
                  </td>
                </tr>
              ) : (
                filteredAsatidz.map((a, idx) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600">{a.nia || '-'}</td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">{a.nama_asatidz}</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {a.tingkat_asatidz || '-'} {a.din_kls_asatidz || ''} {a.din_bag_asatidz || ''}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          a.pa_pi === 'PA'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-pink-50 text-pink-700 border border-pink-200'
                        }`}
                      >
                        {a.pa_pi === 'PA' ? 'Putra' : a.pa_pi === 'PI' ? 'Putri' : '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {a.peran_ebtadin || 'Mustahiq & Pengawas'}
                      </span>
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
