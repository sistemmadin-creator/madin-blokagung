'use client';

import React from 'react';
import { Calendar, Clock, Activity, Sparkles } from 'lucide-react';

export type TimeRangeFilter = 'hari_ini' | 'seminggu' | 'sebulan' | 'setahun';

interface DashboardHeaderProps {
  timeRange: TimeRangeFilter;
  setTimeRange: (range: TimeRangeFilter) => void;
  lastUpdated: string;
}

export default function DashboardHeader({
  timeRange,
  setTimeRange,
  lastUpdated,
}: DashboardHeaderProps) {
  const timeRangeTabs: { key: TimeRangeFilter; label: string; icon: string; desc: string }[] = [
    { key: 'hari_ini', label: 'Hari Ini', icon: '🟢', desc: 'Real-Time KBM' },
    { key: 'seminggu', label: '7 Hari', icon: '📅', desc: 'Siklus Pekanan' },
    { key: 'sebulan', label: '30 Hari', icon: '📊', desc: 'Tren Bulanan' },
    { key: 'setahun', label: '1 Tahun', icon: '🏛️', desc: 'Siklus Akademik' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 md:p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Identitas & Judul Header */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Pusat Kendali Eksekutif
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Sinkron: {lastUpdated}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Dashboard MADINA Blokagung
            <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Madrasah Diniyyah Al-Amiriyyah — Monitoring Terpadu Santri, Asatidz, KBM, & Muhafadzoh
          </p>
        </div>

        {/* Filter Rentang Waktu (Time-Slice Engine) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="bg-slate-100/90 p-1 rounded-xl flex items-center border border-slate-200/70 select-none">
            {timeRangeTabs.map((tab) => {
              const isActive = timeRange === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
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
