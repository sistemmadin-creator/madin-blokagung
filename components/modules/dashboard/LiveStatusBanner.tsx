'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, ShieldCheck, Zap, ArrowRight, BookOpen } from 'lucide-react';

interface LiveStatusBannerProps {
  currentJam: string;
  coveredClasses: number;
  totalClasses: number;
  uncoveredCount: number;
}

export default function LiveStatusBanner({
  currentJam = 'Jam 2',
  coveredClasses = 158,
  totalClasses = 161,
  uncoveredCount = 3,
}: LiveStatusBannerProps) {
  const percentage = Math.round((coveredClasses / totalClasses) * 100);

  return (
    <div className="bg-gradient-to-r from-emerald-900 to-[#0b5751] rounded-2xl p-4 sm:p-5 text-white shadow-sm mb-6 border border-emerald-800/40 relative overflow-hidden">
      {/* Background Islamic Geometric Subtle Motif Accent */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-6">
        <BookOpen className="w-48 h-48 text-white -rotate-12" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Kolom Kiri: Status KBM Aktif */}
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center flex-shrink-0 border border-white/20 text-amber-300">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-300/30">
                Live KBM Hari Ini
              </span>
              <span className="text-xs text-white/70 font-medium">Sesi Berjalan: {currentJam}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
              {coveredClasses} dari {totalClasses} Rombel Terisi Asatidz ({percentage}%)
            </h2>
            <p className="text-xs text-white/80 mt-0.5">
              {uncoveredCount > 0 ? (
                <span className="text-amber-200 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-300 inline" />
                  Perhatian: {uncoveredCount} rombongan belajar memerlukan guru badal atau konfirmasi presensi.
                </span>
              ) : (
                <span className="text-emerald-200 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 inline" />
                  Alhamdulillah, seluruh kelas terisi dan KBM berlangsung tertib.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Aksi Cepat EWS */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Link
            href="/absen-cepat"
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Zap className="w-4 h-4 text-slate-950" />
            <span>Presensi Cepat</span>
          </Link>
          <Link
            href="/jadwal-kbm"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 border border-white/20 transition-all"
          >
            <span>Lihat Jadwal</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/70" />
          </Link>
        </div>
      </div>
    </div>
  );
}
