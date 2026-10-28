'use client';

import React from 'react';
import { 
  Users, 
  School, 
  Award, 
  Calendar, 
  BookCheck, 
  Sparkles, 
  ShieldCheck,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';

export default function StatistikCounter() {
  const stats = [
    {
      id: 'tahun',
      value: '1951 M',
      label: 'Tahun Berdiri',
      sublabel: '75+ Tahun Mengabdi & Bertransformasi',
      icon: Calendar,
      accent: 'from-amber-500 to-amber-700',
      badge: 'Est. 1951',
    },
    {
      id: 'santri',
      value: '± 5.400',
      label: 'Santri Aktif',
      sublabel: 'Talamidz Putra & Putri (Ula, Wustho, Ulya)',
      icon: Users,
      accent: 'from-emerald-600 to-teal-800',
      badge: 'Putra & Putri',
    },
    {
      id: 'kelas',
      value: '161+',
      label: 'Rombongan Belajar',
      sublabel: 'Formasi Kelas Reguler, Unggulan & Blok Luar',
      icon: School,
      accent: 'from-blue-600 to-indigo-800',
      badge: '161 Rombel',
    },
    {
      id: 'pendidik',
      value: '367+',
      label: 'Tenaga Pendidik',
      sublabel: 'Mustahiq, Munawib, Pengurus & Ndalem',
      icon: Award,
      accent: 'from-amber-600 to-emerald-800',
      badge: 'SDM Berdedikasi',
    },
  ];

  const pilars = [
    {
      title: 'Kelas Reguler',
      badge: 'Fondasi Salafiyah',
      desc: 'Pendidikan diniyyah berjenjang 3 tingkatan (Ula 4 th, Wustho 2 th, Ulya 2 th) dengan target penguasaan materi ushul fiqih, gramatika (Nahwu-Shorof), aqidah, dan muhafadzoh nadzom wajib.',
      icon: BookCheck,
      color: 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100',
      features: [
        'KBM Malam Jam I, II, dan III',
        'Takror Siang & Setoran 6 Kelompok',
        'Batas Presensi Alfa Maksimal 10%',
      ],
    },
    {
      title: 'Kelas Unggulan',
      badge: 'Est. 2018 M',
      desc: 'Dirancang untuk santri berprestasi (3 Ula s/d 2 Ulya) dengan pembiasaan kemandirian baca kitab (larangan mbalah bagi mustahiq di Daur Tsani), Syawir Kubro mingguan, dan evaluasi Ma\'had Aly.',
      icon: Sparkles,
      color: 'border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100',
      features: [
        'Metode Belajar Mandiri & Diskusi Aktif',
        'Syawir Kubro & Kajian Mendalam',
        'Evaluasi Triwulanan Bersama Ma\'had Aly',
      ],
    },
    {
      title: 'Program Akselerasi & IHFAD',
      badge: 'Est. 2019 M',
      desc: 'Percepatan jenjang bagi santri berpotensi luar biasa (1 Ula – 4 Ula) yang dibarengi kewajiban bimbingan intensif IHFAD (Jilid I, II, dan III) untuk penuntasan hafalan nadzom tingkat tinggi.',
      icon: TrendingUp,
      color: 'border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 text-teal-950 dark:text-teal-100',
      features: [
        'Seleksi Ketat Hafalan & Pemahaman',
        'Bimbingan Khusus IHFAD Berjenjang',
        'Akselerasi Jenjang 1–4 Ula',
      ],
    },
  ];

  return (
    <section id="statistik" className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40 mb-3">
            Skala & Metrik Lembaga
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
            Tradisi Salaf Skala Besar yang Terkelola Terstruktur
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            Menggabungkan keotentikan sistem sorogan-bandongan pesantren salaf dengan tata kelola administrasi modern untuk membina ribuan kader ulama.
          </p>
        </div>

        {/* 4 Kartu Metrik Statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700/80 transition-all hover:-translate-y-1 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.accent} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-serif mb-1">
                  {item.value}
                </h3>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.sublabel}
                </p>
              </div>
            );
          })}
        </div>

        {/* 3 Pilar Program Pendidikan */}
        <div id="program" className="mt-16 sm:mt-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40 mb-2">
              Model Pembelajaran
            </span>
            <h3 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white font-serif">
              Tiga Pilar Program Pendidikan MADINA
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              Memberikan ruang berkembang yang proporsional bagi setiap santri sesuai tingkat kemampuan dan target keilmuan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {pilars.map((pilar, idx) => {
              const Icon = pilar.icon;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-6 sm:p-7 border backdrop-blur-sm transition-all hover:shadow-md ${pilar.color} flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/50 dark:border-slate-700/50">
                        <Icon className="w-6 h-6 text-emerald-700 dark:text-amber-400" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 shadow-2xs border border-current/20">
                        {pilar.badge}
                      </span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold mb-2 font-serif text-slate-900 dark:text-white">
                      {pilar.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                      {pilar.desc}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    {pilar.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legalitas & SK Madrasah */}
        <div className="mt-12 p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                Legalitas & Pengakuan Resmi Lembaga
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nomor Statistik: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">413351210273</span> | SK Kemenag: <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">KD. 13.10/PP.00.7/171/2007</span>
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            Yayasan PP. Darussalam (Akte Notaris No. 31/1978)
          </div>
        </div>
      </div>
    </section>
  );
}
