'use client';

import React from 'react';
import { UserCheck, UserPlus, Upload, Download, Search, Filter } from 'lucide-react';

export default function AsatidzPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Data Dewan Asatidz</h1>
            <p className="text-xs text-slate-500">Direktori Tenaga Pendidik & Pengajar Madrasah Diniyyah</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700">
            <Upload className="w-3.5 h-3.5" />
            Import Excel
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm">
            <UserPlus className="w-3.5 h-3.5" />
            Tambah Asatidz
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama asatidz, NIA, NIS, kelas..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700">
            <Filter className="w-3.5 h-3.5 text-madin-600" />
            Filter (PA/PI, Kelas, Blok, Jah)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
        Tabel Asatidz siap dirender dengan TanStack Table dan Supabase.
      </div>
    </div>
  );
}
