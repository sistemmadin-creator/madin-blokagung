'use client';

import React from 'react';
import { CheckCircle2, Clock, Users, X, Sparkles, Filter } from 'lucide-react';
import { StatusFilterSerahPiagam } from '@/types/serah-piagam';

interface WidgetStatistikSerahPiagamProps {
  totalSantri: number;
  totalMenerima: number;
  totalBelumMenerima: number;
  filterStatus: StatusFilterSerahPiagam;
  onSelectFilter: (status: StatusFilterSerahPiagam) => void;
}

export default function WidgetStatistikSerahPiagam({
  totalSantri,
  totalMenerima,
  totalBelumMenerima,
  filterStatus,
  onSelectFilter,
}: WidgetStatistikSerahPiagamProps) {
  const pctMenerima = totalSantri > 0 ? Math.round((totalMenerima / totalSantri) * 100) : 0;
  const pctBelum = totalSantri > 0 ? 100 - pctMenerima : 0;

  return (
    <div className="space-y-3">
      {/* 3 Interactive Metric Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Widget 1: Menerima (Interaktif) */}
        <button
          type="button"
          onClick={() => onSelectFilter(filterStatus === 'menerima' ? 'all' : 'menerima')}
          data-testid="widget-menerima"
          className={`relative text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
            filterStatus === 'menerima'
              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-600/60 shadow-sm'
              : 'bg-white hover:bg-emerald-50/40 border-slate-200 hover:border-emerald-300 shadow-2xs'
          }`}
          title="Klik untuk menyaring santri yang sudah menerima piagam"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Menerima
              </span>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
              filterStatus === 'menerima'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {totalMenerima}
              </span>
              <span className="text-xs font-bold text-emerald-700 font-mono">
                ({pctMenerima}%)
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Santri telah menerima piagam
            </p>
          </div>

          {filterStatus === 'menerima' && (
            <div className="mt-2.5 pt-2 border-t border-emerald-200/80 flex items-center justify-between text-[11px] font-bold text-emerald-800">
              <span className="inline-flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter Aktif
              </span>
              <span className="text-[10px] text-emerald-700">Klik untuk lepas</span>
            </div>
          )}
        </button>

        {/* Widget 2: Belum Menerima (Interaktif) */}
        <button
          type="button"
          onClick={() => onSelectFilter(filterStatus === 'belum' ? 'all' : 'belum')}
          data-testid="widget-belum-menerima"
          className={`relative text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
            filterStatus === 'belum'
              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-600/60 shadow-sm'
              : 'bg-white hover:bg-amber-50/40 border-slate-200 hover:border-amber-300 shadow-2xs'
          }`}
          title="Klik untuk menyaring santri yang belum menerima piagam"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Belum Menerima
              </span>
            </div>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
              filterStatus === 'belum'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-100 text-amber-700'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {totalBelumMenerima}
              </span>
              <span className="text-xs font-bold text-amber-700 font-mono">
                ({pctBelum}%)
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Santri menunggu penyerahan piagam
            </p>
          </div>

          {filterStatus === 'belum' && (
            <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center justify-between text-[11px] font-bold text-amber-900">
              <span className="inline-flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter Aktif
              </span>
              <span className="text-[10px] text-amber-700">Klik untuk lepas</span>
            </div>
          )}
        </button>

        {/* Widget 3: Total Santri */}
        <button
          type="button"
          onClick={() => onSelectFilter('all')}
          data-testid="widget-total-santri"
          className={`relative text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
            filterStatus === 'all'
              ? 'bg-slate-50 border-slate-300 ring-2 ring-slate-400/50 shadow-sm'
              : 'bg-white hover:bg-slate-50/60 border-slate-200 shadow-2xs'
          }`}
          title="Klik untuk menampilkan seluruh santri"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Total Santri
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center transition-transform group-hover:scale-105">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {totalSantri}
              </span>
              <span className="text-xs font-bold text-slate-500 font-mono">
                Santri
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Seluruh kelas binaan aktif
            </p>
          </div>

          {filterStatus === 'all' && (
            <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Menampilkan Semua Santri</span>
              <span className="text-[10px] text-slate-400">Default</span>
            </div>
          )}
        </button>
      </div>

      {/* Active Filter Notice Banner */}
      {filterStatus !== 'all' && (
        <div className={`px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
          filterStatus === 'menerima'
            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
            : 'bg-amber-50/90 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-center gap-2 flex-wrap" data-testid="banner-filter-aktif">
            <span className="inline-flex items-center gap-1 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              Filter Interaktif Aktif:
            </span>
            <span>
              {filterStatus === 'menerima'
                ? `Hanya menampilkan santri yang SUDAH MENERIMA piagam (${totalMenerima} orang)`
                : `Hanya menampilkan santri yang BELUM MENERIMA piagam (${totalBelumMenerima} orang)`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-slate-700 border border-slate-300 text-[11px] font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
          >
            <X className="w-3 h-3" />
            Tampilkan Semua
          </button>
        </div>
      )}
    </div>
  );
}
