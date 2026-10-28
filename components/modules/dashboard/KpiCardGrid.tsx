'use client';

import React from 'react';
import { Users, UserCheck, Award, Building2, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { TimeRangeFilter } from './DashboardHeader';

interface KpiData {
  totalSantri: number;
  santriPa: number;
  santriPi: number;
  santriDeltaText: string;

  kehadiranGuruPct: number;
  kehadiranHadirCount: number;
  kehadiranAlfaCount: number;
  kehadiranDeltaText: string;
  isKehadiranUp: boolean;

  totalSetoran: number;
  setoranTuntasPct: number;
  setoranDeltaText: string;

  totalRombel: number;
  kelasUnggulanCount: number;
  solverConflicts: number;
}

interface KpiCardGridProps {
  timeRange: TimeRangeFilter;
  data: KpiData;
}

export default function KpiCardGrid({ timeRange, data }: KpiCardGridProps) {
  // Sparkline data sederhana berbasis SVG native
  const sparklineSantri = "M0,25 Q25,20 50,18 T100,8 T150,12 T200,4";
  const sparklineGuru = "M0,22 Q30,12 60,16 T120,8 T160,6 T200,2";
  const sparklineSetoran = "M0,28 Q35,24 70,18 T130,10 T170,14 T200,3";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. KARTU: DATA SANTRI AKTIF */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Santri Aktif
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.totalSantri.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
              {data.santriDeltaText}
            </span>
          </div>

          {/* Mini Sparkline SVG */}
          <div className="h-7 w-full my-2 text-emerald-500 overflow-hidden">
            <svg viewBox="0 0 200 30" className="w-full h-full fill-none stroke-current stroke-2">
              <path d={sparklineSantri} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
              PA: {data.santriPa.toLocaleString('id-ID')}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold">
              PI: {data.santriPi.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <Link
          href="/santri"
          className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group-hover:underline"
        >
          <span>Kelola Data Santri</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 2. KARTU: TINGKAT KEHADIRAN ASATIDZ */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-teal-300 hover:shadow-md transition-all group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kehadiran Asatidz
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.kehadiranGuruPct}%
            </span>
            <span className={`text-xs font-semibold flex items-center ${
              data.isKehadiranUp ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {data.isKehadiranUp ? (
                <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
              )}
              {data.kehadiranDeltaText}
            </span>
          </div>

          {/* Mini Sparkline SVG */}
          <div className="h-7 w-full my-2 text-teal-600 overflow-hidden">
            <svg viewBox="0 0 200 30" className="w-full h-full fill-none stroke-current stroke-2">
              <path d={sparklineGuru} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              Hadir: {data.kehadiranHadirCount} sesi
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">
              Alfa/Izin: {data.kehadiranAlfaCount}
            </span>
          </div>
        </div>

        <Link
          href="/rekap-absensi"
          className="mt-3 text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 group-hover:underline"
        >
          <span>Buka Rekap Presensi</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 3. KARTU: VOLUME SETORAN MUHAFADZOH */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-amber-300 hover:shadow-md transition-all group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Aktivitas Muhafadzoh
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.totalSetoran.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-semibold text-amber-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
              {data.setoranDeltaText}
            </span>
          </div>

          {/* Mini Sparkline SVG */}
          <div className="h-7 w-full my-2 text-amber-500 overflow-hidden">
            <svg viewBox="0 0 200 30" className="w-full h-full fill-none stroke-current stroke-2">
              <path d={sparklineSetoran} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
              Tuntas: {data.setoranTuntasPct}%
            </span>
            <span className="text-slate-400">Target semester berjalan</span>
          </div>
        </div>

        <Link
          href="/setoran"
          className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 group-hover:underline"
        >
          <span>Input & Rekap Hafalan</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 4. KARTU: FORMASI KELAS & JADWAL KBM */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all group">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Formasi Rombel & KBM
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.totalRombel} Rombel
            </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Solver: 0 Bentrok
            </span>
          </div>

          {/* Progres Bar Kapasitas */}
          <div className="w-full bg-slate-100 rounded-full h-2 my-4 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-indigo-600 h-2 rounded-full w-[96%]" />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
              {data.kelasUnggulanCount} Rombel Unggulan
            </span>
            <span className="text-slate-400">149 Reguler</span>
          </div>
        </div>

        <Link
          href="/formasi"
          className="mt-3 text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 group-hover:underline"
        >
          <span>Peta Formasi Kelas</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
