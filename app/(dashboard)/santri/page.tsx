'use client';

import React, { useEffect } from 'react';
import { useSantriStore } from '@/stores/useSantriStore';
import { SANTRI_COLUMNS } from '@/types/santri';
import { Users, Filter, EyeOff, UserPlus, Download, RefreshCw, Search } from 'lucide-react';
import { exportToExcel } from '@/lib/utils/excel';

export default function SantriPage() {
  const { santriList, isLoading, fetchSantri } = useSantriStore();

  useEffect(() => {
    fetchSantri();
  }, [fetchSantri]);

  const handleExport = () => {
    exportToExcel(santriList, 'Data_Santri_Madin_Blokagung');
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-madin-50 text-madin-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Data Induk Santri</h1>
            <p className="text-xs text-slate-500">
              Total {santriList.length} santri terdaftar di Madrasah Diniyyah
            </p>
          </div>
        </div>

        {/* Tombol Aksi Cepat */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchSantri}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Muat Ulang
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white transition shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Tambah Santri
          </button>
        </div>
      </div>

      {/* Bar Pencarian & Tombol Filter Token */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, nomor induk, kamar..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700">
            <Filter className="w-3.5 h-3.5 text-madin-600" />
            Filter Lanjutan (16 Kategori)
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700">
            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            Kolom (34)
          </button>
        </div>
      </div>

      {/* Tabel Data Santri */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10">
              <tr>
                <th className="p-3 w-10 text-center">No</th>
                {SANTRI_COLUMNS.slice(0, 10).map((col) => (
                  <th key={col.key} className="p-3 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-madin-600" />
                    Sedang memuat data santri dari Supabase...
                  </td>
                </tr>
              ) : santriList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    Belum ada data santri yang dimuat.
                  </td>
                </tr>
              ) : (
                santriList.slice(0, 50).map((s, idx) => (
                  <tr key={s.no_induk || idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono font-medium text-slate-800">{s.no_induk}</td>
                    <td className="p-3 text-slate-600">{s.no_biro || '-'}</td>
                    <td className="p-3 text-slate-600">{s.nisn || '-'}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        s.pa_pi === 'PA' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                      }`}>
                        {s.pa_pi}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">{s.nama}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{s.tempat_lahir || '-'}</td>
                    <td className="p-3 text-slate-600">{s.tgl_lahir || '-'}</td>
                    <td className="p-3 text-slate-600">{s.bln_lahir || '-'}</td>
                    <td className="p-3 text-slate-600">{s.thn_lahir || '-'}</td>
                    <td className="p-3 text-slate-600">{s.dusun || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Menampilkan 50 data pertama dari {santriList.length} santri</span>
          <span className="text-[11px] text-slate-400">Tekan baris untuk melihat detail santri</span>
        </div>
      </div>
    </div>
  );
}
