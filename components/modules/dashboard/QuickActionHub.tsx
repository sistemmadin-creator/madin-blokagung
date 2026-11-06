'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap,
  Calendar,
  CalendarDays,
  QrCode,
  MessageCircle,
  Wrench,
  NotebookPen,
  UsersRound,
  ArrowRight,
} from 'lucide-react';

export default function QuickActionHub() {
  const actions = [
    {
      title: 'Presensi Cepat',
      desc: 'Input absensi asatidz per sesi & rombel',
      href: '/absen-cepat',
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      bgColor: 'bg-amber-50 hover:bg-amber-100/80',
      borderColor: 'border-amber-200/80',
    },
    {
      title: 'Kalender Kegiatan',
      desc: 'Kalender Masehi & Hijriyah sinkron libur KBM',
      href: '/kalender-kegiatan',
      icon: <CalendarDays className="w-5 h-5 text-emerald-600" />,
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80',
      borderColor: 'border-emerald-200/80',
    },
    {
      title: 'Setor Mustahiq & Barcode',
      desc: 'Input setoran mingguan & scan barcode santri',
      href: '/setor-mustahiq',
      icon: <QrCode className="w-5 h-5 text-teal-600" />,
      bgColor: 'bg-teal-50 hover:bg-teal-100/80',
      borderColor: 'border-teal-200/80',
    },
    {
      title: 'Kirim WA Rapor Hafalan',
      desc: 'Broadcast kartu rapor digital ke wali santri',
      href: '/kirim-wa',
      icon: <MessageCircle className="w-5 h-5 text-green-600" />,
      bgColor: 'bg-green-50 hover:bg-green-100/80',
      borderColor: 'border-green-200/80',
    },
    {
      title: 'Inventaris & Sapras',
      desc: 'Pantau papan tulis, meja guru & perbaikan',
      href: '/sapras/inventaris-kelas',
      icon: <Wrench className="w-5 h-5 text-cyan-600" />,
      bgColor: 'bg-cyan-50 hover:bg-cyan-100/80',
      borderColor: 'border-cyan-200/80',
    },
    {
      title: 'Catatan & To-Do List',
      desc: 'Kelola dokumen catatan & daftar tugas harian',
      href: '/catatan',
      icon: <NotebookPen className="w-5 h-5 text-indigo-600" />,
      bgColor: 'bg-indigo-50 hover:bg-indigo-100/80',
      borderColor: 'border-indigo-200/80',
    },
    {
      title: 'Absen Konsorsium',
      desc: 'Rekap kehadiran musyawarah & konsorsium',
      href: '/absen-konsorsium',
      icon: <UsersRound className="w-5 h-5 text-violet-600" />,
      bgColor: 'bg-violet-50 hover:bg-violet-100/80',
      borderColor: 'border-violet-200/80',
    },
    {
      title: 'Jadwal & Solver KBM',
      desc: 'Cek jadwal per kelas & deteksi bentrok',
      href: '/jadwal-kbm',
      icon: <Calendar className="w-5 h-5 text-rose-600" />,
      bgColor: 'bg-rose-50 hover:bg-rose-100/80',
      borderColor: 'border-rose-200/80',
    },
  ];

  return (
    <div
      data-testid="dashboard-quick-action-hub"
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Pusat Aksi Cepat Operasional
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pintasan langsung ke 8 modul operasional utama madrasah
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((act) => (
          <Link
            key={act.title}
            href={act.href}
            className={`p-3.5 rounded-xl border ${act.borderColor} ${act.bgColor} transition-all duration-200 flex items-center justify-between group hover:shadow-xs`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white shadow-2xs flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                {act.icon}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-950 truncate">
                  {act.title}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {act.desc}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
          </Link>
        ))}
      </div>
    </div>
  );
}
