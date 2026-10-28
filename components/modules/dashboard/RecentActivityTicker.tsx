'use client';

import React from 'react';
import { Clock, CheckCircle2, Award, Zap, Newspaper, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  waktu: string;
  kategori: 'setoran' | 'absensi' | 'berita' | 'sync';
  judul: string;
  detail: string;
}

export type { ActivityItem };

interface RecentActivityTickerProps {
  activities?: ActivityItem[];
}

export default function RecentActivityTicker({ activities: externalActivities }: RecentActivityTickerProps = {}) {
  const defaultActivities: ActivityItem[] = [
    {
      id: '1',
      waktu: '10 mnt lalu',
      kategori: 'setoran',
      judul: 'Setoran Nadzom Imrithi Diterima',
      detail: 'M. Ali Ridho (No. Induk 20240192) tuntas Bait 1-50 • Penjaga: Ust. Musthofa',
    },
    {
      id: '2',
      waktu: '25 mnt lalu',
      kategori: 'absensi',
      judul: 'Presensi Sesi Jam 2 Tersimpan',
      detail: 'Kelas 2 A ULA: Ust. Fathurrahman (Fathul Qorib) • Status: Hadir Tepat Waktu',
    },
    {
      id: '3',
      waktu: '1 jam lalu',
      kategori: 'berita',
      judul: 'Warta Pesantren Terbit',
      detail: 'Artikel "Ujian Tasmi\' Nadzom Al-Jurumiyyah Serentak Santri Ula" dipublikasikan',
    },
    {
      id: '4',
      waktu: '2 jam lalu',
      kategori: 'sync',
      judul: 'Sinkronisasi Offline Berhasil',
      detail: '14 Mutasi lokal dari gawai asatidz berhasil disinkronkan ke Supabase Cloud',
    },
  ];

  const activities = externalActivities && externalActivities.length > 0 ? externalActivities : defaultActivities;

  const getBadge = (kategori: ActivityItem['kategori']) => {
    switch (kategori) {
      case 'setoran':
        return (
          <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <Award className="w-4 h-4" />
          </span>
        );
      case 'absensi':
        return (
          <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4" />
          </span>
        );
      case 'berita':
        return (
          <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <Newspaper className="w-4 h-4" />
          </span>
        );
      case 'sync':
        return (
          <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Denyut Aktivitas Lapangan</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Aliran mutasi data presensi, setoran, dan penerbitan warta secara real-time
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {activities.map((act) => (
          <div key={act.id} className="py-3 flex items-start gap-3.5 hover:bg-slate-50/70 rounded-xl px-2 transition-colors">
            {getBadge(act.kategori)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {act.judul}
                </h4>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0 font-medium">
                  <Clock className="w-3 h-3" />
                  {act.waktu}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{act.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
