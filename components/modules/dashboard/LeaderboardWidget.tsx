'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trophy, Award, UserCheck, Building2, Star, ArrowUpRight } from 'lucide-react';

interface GuruTeladan {
  nama: string;
  nia: string;
  tingkat: string;
  totalHadir: number;
  alfa: number;
  pct: number;
}

interface RombelUnggul {
  namaKelas: string;
  waliKelas: string;
  tingkat: string;
  totalSantri: number;
  tuntasHafalan: number;
  pct: number;
}

export default function LeaderboardWidget() {
  const [activeTab, setActiveTab] = useState<'asatidz' | 'rombel'>('asatidz');

  const topAsatidz: GuruTeladan[] = [
    { nama: 'Ust. H. Ahmad Shodiq', nia: 'AS-0102', tingkat: 'ULYA', totalHadir: 48, alfa: 0, pct: 100 },
    { nama: 'Ust. M. Khoirul Anam', nia: 'AS-0118', tingkat: 'WUSTHO', totalHadir: 48, alfa: 0, pct: 100 },
    { nama: 'Ust. Saiful Huda', nia: 'AS-0145', tingkat: 'ULA', totalHadir: 48, alfa: 0, pct: 100 },
    { nama: 'Ning Siti Fatimah', nia: 'AS-0204', tingkat: 'WUSTHO', totalHadir: 47, alfa: 0, pct: 98 },
    { nama: 'Ust. Abdul Malik', nia: 'AS-0231', tingkat: 'ULA', totalHadir: 46, alfa: 0, pct: 96 },
  ];

  const topRombel: RombelUnggul[] = [
    { namaKelas: '3 A ULA (Ug)', waliKelas: 'Ust. Mustaqim', tingkat: 'Unggulan', totalSantri: 32, tuntasHafalan: 32, pct: 100 },
    { namaKelas: '2 B WUSTHO', waliKelas: 'Ust. Zarkasyi', tingkat: 'Wustho', totalSantri: 35, tuntasHafalan: 33, pct: 94 },
    { namaKelas: '1 A ULYA', waliKelas: 'Ust. M. Ridwan', tingkat: 'Ulya', totalSantri: 30, tuntasHafalan: 28, pct: 93 },
    { namaKelas: '4 C ULA', waliKelas: 'Ust. Bahrul Ulum', tingkat: 'Ula', totalSantri: 34, tuntasHafalan: 31, pct: 91 },
    { namaKelas: '1 B WUSTHO', waliKelas: 'Ust. Kholilur Rahman', tingkat: 'Wustho', totalSantri: 36, tuntasHafalan: 32, pct: 89 },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header Widget & Tab Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-50 text-amber-700">
              <Trophy className="w-4 h-4 text-amber-600" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Peringkat & Rekognisi Kinerja
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluasi kedisiplinan guru dan prestasi hafalan rombel semester ini
              </p>
            </div>
          </div>

          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center select-none text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('asatidz')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'asatidz'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Asatidz Teladan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rombel')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'rombel'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Rombel Hafalan
            </button>
          </div>
        </div>

        {/* Tab 1: Asatidz Teladan */}
        {activeTab === 'asatidz' && (
          <div className="space-y-2">
            {topAsatidz.map((guru, idx) => (
              <div
                key={guru.nia}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 transition-colors border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950 font-black'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {guru.nama}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      NIA: {guru.nia} • Tingkat {guru.tingkat}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-extrabold text-emerald-700 flex items-center justify-end gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500 inline" />
                    <span>{guru.pct}% Hadir</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {guru.totalHadir} Sesi Mengajar • 0 Alfa
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Rombel Hafalan Tercepat */}
        {activeTab === 'rombel' && (
          <div className="space-y-2">
            {topRombel.map((rombel, idx) => (
              <div
                key={rombel.namaKelas}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 transition-colors border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950 font-black'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      {rombel.namaKelas}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Wali: {rombel.waliKelas} • {rombel.tingkat}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-extrabold text-amber-700">
                    {rombel.pct}% Tuntas
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {rombel.tuntasHafalan} dari {rombel.totalSantri} Santri
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info & Navigasi */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400 text-[11px]">
          Data diperbarui otomatis dari log absensi & setoran
        </span>
        <Link
          href={activeTab === 'asatidz' ? '/rekap-absensi' : '/rekap-hafalan'}
          className="font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline text-xs"
        >
          <span>Detail Lengkap</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
