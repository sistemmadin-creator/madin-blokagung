'use client';

import React from 'react';
import Link from 'next/link';
import { Award, BookMarked, ArrowUpRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { TimeRangeFilter } from './DashboardHeader';

interface JenjangHafalan {
  nama: string;
  kitab: string;
  totalSantri: number;
  tuntas: number;
  pct: number;
  color: string;
}

export type { JenjangHafalan };

interface MuhafadzohProgressWidgetProps {
  timeRange: TimeRangeFilter;
  stats?: JenjangHafalan[];
}

export default function MuhafadzohProgressWidget({
  timeRange,
  stats: externalStats,
}: MuhafadzohProgressWidgetProps) {
  const defaultJenjangList: JenjangHafalan[] = [
    {
      nama: 'Kelas Unggulan',
      kitab: 'Takhassus Kutub & Alfiyyah Kubro',
      totalSantri: 360,
      tuntas: 324,
      pct: 90,
      color: 'from-amber-500 to-amber-600',
    },
    {
      nama: 'Tingkat Ula',
      kitab: 'Al-Jurumiyyah & Nadzom Imrithi',
      totalSantri: 2450,
      tuntas: 1960,
      pct: 80,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      nama: 'Tingkat Wustho',
      kitab: 'Alfiyyah Ibnu Malik (Juz 1)',
      totalSantri: 1680,
      tuntas: 1260,
      pct: 75,
      color: 'from-teal-500 to-teal-600',
    },
    {
      nama: 'Tingkat Ulya',
      kitab: 'Alfiyyah (Juz 2) & Jauharul Maknun',
      totalSantri: 922,
      tuntas: 664,
      pct: 72,
      color: 'from-indigo-500 to-indigo-600',
    },
  ];

  const jenjangList = externalStats && externalStats.length > 0 ? externalStats : defaultJenjangList;
  const totalTuntas = jenjangList.reduce((acc, curr) => acc + curr.tuntas, 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header Widget */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-50 text-amber-700">
                <Award className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Ketuntasan Muhafadzoh Nadzom
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Capaian setoran hafalan wajib per jenjang semester ini
            </p>
          </div>

          <Link
            href="/rekap-hafalan"
            className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline"
          >
            <span>Rekap Lengkap</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Daftar Progress Bar per Jenjang */}
        <div className="space-y-3.5 my-2">
          {jenjangList.map((item) => (
            <div key={item.nama} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/50">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div>
                  <span className="font-bold text-slate-800 mr-2">{item.nama}</span>
                  <span className="text-[11px] text-slate-500">({item.kitab})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">
                    {item.tuntas.toLocaleString('id-ID')} / {item.totalSantri.toLocaleString('id-ID')} Santri
                  </span>
                  <span className="font-extrabold text-slate-900">{item.pct}%</span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden">
                <div
                  className={`bg-gradient-to-r ${item.color} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info & Cetak Piagam Link */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{totalTuntas.toLocaleString('id-ID')} Santri tuntas target nadzom</span>
        </div>
        <Link
          href="/piagam"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
        >
          <span>Penerbitan Piagam</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
