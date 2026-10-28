'use client';

import React from 'react';
import Link from 'next/link';
import {
  Zap,
  Award,
  Calendar,
  Newspaper,
  Users,
  Building2,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function QuickActionHub() {
  const actions = [
    {
      title: 'Presensi Cepat',
      desc: 'Input absensi asatidz per sesi / rombel',
      href: '/absen-cepat',
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      bgColor: 'bg-amber-50 hover:bg-amber-100/80',
      borderColor: 'border-amber-200/80',
    },
    {
      title: 'Setoran Muhafadzoh',
      desc: 'Catat setoran hafalan nadzom santri',
      href: '/setoran',
      icon: <Award className="w-5 h-5 text-emerald-600" />,
      bgColor: 'bg-emerald-50 hover:bg-emerald-100/80',
      borderColor: 'border-emerald-200/80',
    },
    {
      title: 'Jadwal & Solver KBM',
      desc: 'Cek jadwal per kelas & deteksi bentrok',
      href: '/jadwal-kbm',
      icon: <Calendar className="w-5 h-5 text-teal-600" />,
      bgColor: 'bg-teal-50 hover:bg-teal-100/80',
      borderColor: 'border-teal-200/80',
    },
    {
      title: 'Publikasi Warta',
      desc: 'Rilis berita kegiatan madin ke publik',
      href: '/kelola-berita',
      icon: <Newspaper className="w-5 h-5 text-indigo-600" />,
      bgColor: 'bg-indigo-50 hover:bg-indigo-100/80',
      borderColor: 'border-indigo-200/80',
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Pusat Aksi Cepat Operasional
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pintasan langsung ke modul input dan verifikasi data lapangan madrasah
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white shadow-2xs flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                {act.icon}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-950">
                  {act.title}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-1">{act.desc}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
          </Link>
        ))}
      </div>
    </div>
  );
}
