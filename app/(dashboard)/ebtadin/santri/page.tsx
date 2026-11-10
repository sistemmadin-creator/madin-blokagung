'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  ArrowLeft,
  RefreshCw,
  Award,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEbtadinStore } from '@/stores/useEbtadinStore';

export default function EbtadinSantriPage() {
  const { activeTahun, santriList, isLoading, fetchTahunList, fetchEbtadinMasterData } = useEbtadinStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');
  const [filterGender, setFilterGender] = useState('');

  useEffect(() => {
    fetchTahunList();
  }, [fetchTahunList]);

  const filteredSantri = useMemo(() => {
    return santriList.filter((s) => {
      if (filterTingkat && s.tingkat.toUpperCase() !== filterTingkat.toUpperCase()) return false;
      if (filterGender && s.pa_pi.toUpperCase() !== filterGender.toUpperCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.nama.toLowerCase().includes(q);
        const matchesInduk = s.no_induk.includes(q);
        const matchesIjazah = (s.nomor_seri_ijazah || '').toLowerCase().includes(q);
        if (!matchesName && !matchesInduk && !matchesIjazah) return false;
      }
      return true;
    });
  }, [santriList, filterTingkat, filterGender, searchQuery]);

  const totalSantri = santriList.length;
  const totalPutra = santriList.filter((s) => s.pa_pi === 'PA').length;
  const totalPutri = santriList.filter((s) => s.pa_pi === 'PI').length;
  const totalWithIjazah = santriList.filter((s) => s.nomor_seri_ijazah).length;

  const handleExportExcel = () => {
    if (filteredSantri.length === 0) return;
    const data = filteredSantri.map((s, idx) => ({
      No: idx + 1,
      'No. Induk': s.no_induk,
      'Nama Santri': s.nama,
      Tingkat: s.tingkat,
      Kelas: `${s.din_kls} ${s.din_bag}`,
      'Putra/Putri': s.pa_pi,
      'Asrama/Kamar': `${s.asrama || '-'} ${s.kamar || ''}`,
      'No. Seri Ijazah': s.nomor_seri_ijazah || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Santri_EBTADIN');
    XLSX.writeFile(wb, `Santri_EBTADIN_${activeTahun?.tahun_masehi || 2026}.xlsx`);
  };

  return (
    <div className="space-y-5">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-xl bg-emerald-100 text-[#0f766e] flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-2xs">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                  Data Santri EBTADIN
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-[#0f766e] border border-emerald-300">
                  {activeTahun?.tahun_masehi || 2026}
                </span>
              </div>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Calon penerima ijazah jenjang 4 Ula, 2 Wustho, dan 2 Ulya peserta ujian akhir EBTADIN.
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Peserta</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{totalSantri} Santri</div>
          </div>
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[11px] font-bold text-blue-700 uppercase">Santri Putra</span>
            <div className="text-xl font-bold text-blue-900 mt-1">{totalPutra} Santri</div>
          </div>
          <div className="p-3.5 rounded-xl bg-pink-50 border border-pink-200">
            <span className="text-[11px] font-bold text-pink-700 uppercase">Santri Putri</span>
            <div className="text-xl font-bold text-pink-900 mt-1">{totalPutri} Santri</div>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-700 uppercase">No. Seri Ijazah</span>
            <div className="text-xl font-bold text-emerald-900 mt-1">{totalWithIjazah} Terbit</div>
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
              placeholder="Cari nama santri, no. induk, no. seri ijazah..."
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
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="text-xs font-semibold py-2 px-3 rounded-lg border border-slate-300 bg-white"
            >
              <option value="">Semua Gender</option>
              <option value="PA">Putra (PA)</option>
              <option value="PI">Putri (PI)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Data Santri */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-3.5 w-12 text-center">No</th>
                <th className="py-3 px-3.5">No. Induk</th>
                <th className="py-3 px-3.5">Nama Santri</th>
                <th className="py-3 px-3.5">Tingkat &amp; Rombel</th>
                <th className="py-3 px-3.5">Gender</th>
                <th className="py-3 px-3.5">Domisili Santri</th>
                <th className="py-3 px-3.5">No. Seri Ijazah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSantri.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    {isLoading ? 'Memuat data santri EBTADIN...' : 'Tidak ada data santri yang cocok.'}
                  </td>
                </tr>
              ) : (
                filteredSantri.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-slate-800">{s.no_induk}</td>
                    <td className="py-2.5 px-3.5 font-bold text-slate-900">{s.nama}</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.tingkat} {s.din_kls} {s.din_bag}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          s.pa_pi === 'PA'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-pink-50 text-pink-700 border border-pink-200'
                        }`}
                      >
                        {s.pa_pi === 'PA' ? 'Putra' : 'Putri'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-600">
                      {s.asrama || s.blok ? `${s.asrama || s.blok} ${s.kamar || ''}` : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-emerald-800 font-semibold">
                      {s.nomor_seri_ijazah ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Award className="w-3 h-3 text-emerald-600" />
                          {s.nomor_seri_ijazah}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Belum terbit</span>
                      )}
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
