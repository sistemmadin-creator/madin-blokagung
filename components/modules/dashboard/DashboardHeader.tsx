'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Moon } from 'lucide-react';
import {
  getPasaranJawa,
  masehiToHijri,
  NAMA_BULAN_MASEHI,
} from '@/lib/utils/kalenderHijriyahHelper';

export type TimeRangeFilter = 'hari_ini' | 'seminggu' | 'sebulan' | 'setahun';

interface DashboardHeaderProps {
  timeRange: TimeRangeFilter;
  setTimeRange: (range: TimeRangeFilter) => void;
  lastUpdated: string;
  hijriOffsetDays?: number;
}

const HARI_INDO_MAP = [
  'Ahad',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

export default function DashboardHeader({
  timeRange,
  setTimeRange,
  lastUpdated,
  hijriOffsetDays = 0,
}: DashboardHeaderProps) {
  const timeRangeTabs: {
    key: TimeRangeFilter;
    label: string;
    icon: string;
    desc: string;
  }[] = [
    { key: 'hari_ini', label: 'Hari Ini', icon: '🟢', desc: 'Real-Time KBM' },
    { key: 'seminggu', label: '7 Hari', icon: '📅', desc: 'Siklus Pekanan' },
    { key: 'sebulan', label: '30 Hari', icon: '📊', desc: 'Tren Bulanan' },
    { key: 'setahun', label: '1 Tahun', icon: '🏛️', desc: 'Siklus Akademik' },
  ];

  const todayInfo = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hariNama = HARI_INDO_MAP[now.getDay()] || 'Hari';
    const pasaran = getPasaranJawa(ymd);
    const hijri = masehiToHijri(ymd, hijriOffsetDays);
    const bulanMasehi = NAMA_BULAN_MASEHI[m - 1] || '';
    const masehiLabel = `${d} ${bulanMasehi.charAt(0) + bulanMasehi.slice(1).toLowerCase()} ${y}`;
    const hijriLabel = `${hijri.dayH} ${hijri.monthName} ${hijri.yearH} H`;

    return {
      ymd,
      hariPasaran: `${hariNama} ${pasaran}`,
      masehiLabel,
      hijriLabel,
    };
  }, [hijriOffsetDays]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Identitas & Judul Header (Tanpa Ikon Bintang Sparkles) */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Pusat Kendali Eksekutif
            </span>

            <span className="text-xs text-slate-300 font-medium hidden sm:inline">•</span>

            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Sinkron: {lastUpdated}
            </span>

            <span className="text-xs text-slate-300 font-medium hidden md:inline">•</span>

            {/* Lencana Penanggalan Terpadu Masehi + Pasaran Jawa + Hijriyah */}
            <Link
              href="/kalender-kegiatan"
              data-testid="dashboard-header-date-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50/90 hover:bg-amber-100/80 text-amber-900 border border-amber-200/80 transition-colors"
              title="Buka Kalender Kegiatan Masehi & Hijriyah"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>{todayInfo.hariPasaran}, {todayInfo.masehiLabel}</span>
              <span className="text-amber-400">|</span>
              <Moon className="w-3 h-3 text-emerald-700" />
              <span className="font-bold text-emerald-900">{todayInfo.hijriLabel}</span>
            </Link>
          </div>

          <h1
            data-testid="dashboard-main-heading"
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            Dashboard MADINA Blokagung
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Madrasah Diniyyah Al-Amiriyyah • Monitoring Terpadu Santri, Asatidz, Kurikulum, Sapras, & Muhafadzoh
          </p>
        </div>

        {/* Filter Rentang Waktu (Time-Slice Engine) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="bg-slate-100/90 p-1 rounded-xl flex items-center border border-slate-200/70 select-none">
            {timeRangeTabs.map((tab) => {
              const isActive = timeRange === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  data-testid={`dashboard-filter-${tab.key}`}
                  aria-pressed={isActive}
                  onClick={() => setTimeRange(tab.key)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                  title={tab.desc}
                >
                  <span className="text-xs">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
