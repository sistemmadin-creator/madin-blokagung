'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  MapPin,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEbtadinStore } from '@/stores/useEbtadinStore';

export default function EbtadinFormasiPaPage() {
  const { activeTahun, formasiList, isLoading, fetchTahunList, fetchEbtadinMasterData } = useEbtadinStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');

  useEffect(() => {
    fetchTahunList();
  }, [fetchTahunList]);

  const formasiPa = useMemo(() => {
    return formasiList
      .filter((f) => f.pa_pi === 'PA')
      .filter((f) => {
        if (filterTingkat && f.tingkat.toUpperCase() !== filterTingkat.toUpperCase()) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesKls = `${f.tingkat} ${f.din_kls} ${f.din_bag}`.toLowerCase().includes(q);
          const matchesWali = (f.wali_kelas_text || '').toLowerCase().includes(q);
          const matchesLokasi = (f.lokasi_diniyyah || '').toLowerCase().includes(q) || (f.lokasi_takror || '').toLowerCase().includes(q);
          if (!matchesKls && !matchesWali && !matchesLokasi) return false;
        }
        return true;
      });
  }, [formasiList, filterTingkat, searchQuery]);

  const totalRombel = formasiList.filter((f) => f.pa_pi === 'PA').length;

  const handleExportExcel = () => {
    if (formasiPa.length === 0) return;
    const data = formasiPa.map((f, idx) => ({
      No: idx + 1,
      Tingkat: f.tingkat,
      Kelas: `${f.din_kls} ${f.din_bag}`,
      'Putra/Putri': 'Putra',
      'Wali Kelas / Mustahiq': f.wali_kelas_text || '-',
      'Lokasi Diniyyah': f.lokasi_diniyyah || '-',
      'Blok Diniyyah': f.blok_diniyyah || '-',
      'Lokasi Takror': f.lokasi_takror || '-',
      'Blok Takror': f.blok_takror || '-',
      Kapasitas: f.kapasitas_maksimal || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formasi_EBTADIN_PA');
    XLSX.writeFile(wb, `Formasi_EBTADIN_Putra_${activeTahun?.tahun_masehi || 2026}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-2xs">
              <Building2 className="w-7 h-7 text-blue-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                  Formasi Kelas Putra EBTADIN
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                  Putra (PA)
                </span>
              </div>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Pemetaan ruang KBM Diniyyah Malam dan Takror Siang rombel santri putra peserta ujian akhir EBTADIN.
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

        {/* Ringkasan & Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kelas, wali kelas, atau ruang lokasi..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="text-xs font-semibold py-2 px-3 rounded-lg border border-slate-300 bg-white"
            >
              <option value="">Semua Tingkat ({totalRombel} Rombel)</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Formasi PA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-3.5">Rombel Kelas</th>
                <th className="py-3 px-3.5">Mustahiq / Wali Kelas</th>
                <th className="py-3 px-3.5">Lokasi Diniyyah</th>
                <th className="py-3 px-3.5">Lokasi Takror</th>
                <th className="py-3 px-3.5 text-center">Kapasitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {formasiPa.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                    {isLoading ? 'Memuat formasi kelas...' : 'Tidak ada data formasi putra yang cocok.'}
                  </td>
                </tr>
              ) : (
                formasiPa.map((f, idx) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3.5">
                      <span className="font-bold text-slate-900">
                        {f.tingkat} {f.din_kls} {f.din_bag}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800">{f.wali_kelas_text || '-'}</td>
                    <td className="py-2.5 px-3.5 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{f.lokasi_diniyyah || '-'} {f.blok_diniyyah ? `(${f.blok_diniyyah})` : ''}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>{f.lokasi_takror || '-'} {f.blok_takror ? `(${f.blok_takror})` : ''}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-bold text-slate-700">
                      {f.kapasitas_maksimal ? `${f.kapasitas_maksimal} santri` : '-'}
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
