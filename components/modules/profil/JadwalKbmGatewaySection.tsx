'use client';

import React from 'react';
import Link from 'next/link';
import { 
  LayoutGrid, 
  ArrowRight, 
  CalendarDays, 
  UserCheck, 
  MapPin, 
  Award, 
  Sparkles, 
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';

export default function JadwalKbmGatewaySection() {
  const quickFeatures = [
    {
      title: 'Jadwal KBM 161 Kelas',
      desc: 'Matriks jadwal pelajaran jam 1 s/d 4 untuk 79 kelas Putra dan 82+ kelas Putri dengan filter pintar.',
      icon: CalendarDays,
      link: '/jadwal-kbm',
      badge: 'Jam 1 - 4',
    },
    {
      title: 'Absensi & Absen Cepat',
      desc: 'Presensi harian santri dan asatidz, fitur penetapan massal kilat, dan filter berbasis blok asrama.',
      icon: UserCheck,
      link: '/absen-cepat',
      badge: 'Multi Jam',
    },
    {
      title: 'Pengajar Fan & Asatidz',
      desc: 'Direktori 367 pendidik (Kode A Ndalem, B Putra, C Putri) dengan validasi lencana fan resmi.',
      icon: Award,
      link: '/fan/pengajar',
      badge: 'Kode A/B/C',
    },
    {
      title: 'Formasi Lokal & Ruang',
      desc: 'Pemetaan ruang KBM Diniyyah Malam dan Takror Siang di Gedung Pusat, GP, Masjid, & Blok Luar.',
      icon: MapPin,
      link: '/formasi',
      badge: '161 Lokal',
    },
  ];

  return (
    <section id="gateway" className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-emerald-50/40 dark:from-slate-900 dark:to-slate-950 border-t border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner Utama Gateway */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-[#0b4731] to-teal-950 text-white p-8 sm:p-12 lg:p-16 shadow-2xl border border-amber-400/30">
          {/* Subtle Decorative Pattern */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 mb-4 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Gerbang Layanan Internal</span>
            </span>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold font-serif text-white tracking-tight leading-tight">
              Pusat Kendali Akademik & Sistem KBM MADINA
            </h2>

            <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
              Akses cepat dan terpadu bagi Asatidz, Mustahiq/qoh, dan Pengurus untuk mengelola jadwal pelajaran, presensi santri, formasi lokal, serta rekap administrasi madrasah.
            </p>

            {/* Tombol Akses Utama */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/jadwal-kbm"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 shadow-xl shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all border border-amber-200"
              >
                <LayoutGrid className="w-5 h-5 text-emerald-950" />
                <span>Buka Jadwal KBM Per Kelas</span>
                <ArrowRight className="w-5 h-5 text-emerald-950" />
              </Link>

              <Link
                href="/absen-cepat"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl text-base font-semibold text-emerald-100 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-500/40 hover:border-emerald-400/60 backdrop-blur-sm transition-all"
              >
                <UserCheck className="w-5 h-5 text-amber-300" />
                <span>Absen Cepat Santri</span>
              </Link>
            </div>
          </div>

          {/* Interactive UI Preview Mockup (Mencerminkan Gambar 1 Jadwal KBM) */}
          <div className="mt-12 lg:mt-14 max-w-5xl mx-auto rounded-2xl overflow-hidden bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-md">
            {/* Mockup Toolbar Header */}
            <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="ml-2 font-mono text-[11px] text-slate-400 hidden sm:inline">
                  madinablokagung.app/jadwal-kbm
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-800/70 text-emerald-200 text-[10px] font-semibold">
                  Jadwal Aktif 1446-1447 H
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-900/70 text-amber-300 text-[10px] font-semibold">
                  161 Rombel
                </span>
              </div>
            </div>

            {/* Mockup Table Snapshot */}
            <div className="p-4 sm:p-6 text-xs text-slate-300">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-700 text-white font-bold text-xs">
                    Putra (79 Kelas)
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-xs">
                    Putri (82 Kelas)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter Tingkat: Isti&apos;dad • Ula • Wustho • Ulya</span>
                </div>
              </div>

              {/* Sample Table Rows Preview */}
              <div className="space-y-2 font-sans">
                <div className="grid grid-cols-12 gap-2 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 items-center">
                  <span className="col-span-3 sm:col-span-2 font-bold text-white">1 A ULA (Pa)</span>
                  <span className="col-span-4 sm:col-span-3 text-emerald-400">Ust. Ahmad Syakir (MS)</span>
                  <span className="col-span-5 sm:col-span-7 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                      J1: Jurumiyyah
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                      J2: Tashrif
                    </span>
                    <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60">
                      J3: Sorogan
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40 items-center">
                  <span className="col-span-3 sm:col-span-2 font-bold text-amber-300">2 A WUSTHO Ug</span>
                  <span className="col-span-4 sm:col-span-3 text-amber-200">Shidqil Adiliyah (MS)</span>
                  <span className="col-span-5 sm:col-span-7 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-600/60 font-semibold">
                      J1: Alfiyyah II (Ug)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-600/60 font-semibold">
                      J2: Fathul Qorib (Ug)
                    </span>
                    <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-600/60">
                      J3: Syawir Kubro
                    </span>
                  </span>
                </div>
              </div>

              {/* Click overlay hint */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
                <span>Klik untuk mengoperasikan matriks jadwal lengkap 161 kelas</span>
                <Link
                  href="/jadwal-kbm"
                  className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                >
                  <span>Buka Layar Penuh</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Kartu Fitur Tambahan */}
        <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <Link
                key={idx}
                href={feat.link}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {feat.badge}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors mb-1.5">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span>Buka Modul</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
