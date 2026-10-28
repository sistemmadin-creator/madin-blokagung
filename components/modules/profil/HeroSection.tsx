'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  BookOpen, 
  Compass, 
  ChevronDown
} from 'lucide-react';

export default function HeroSection() {
  return (
    <section 
      id="hero" 
      className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-[#073623] to-emerald-900 text-white pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-32 lg:pb-36"
    >
      {/* Decorative Background Lighting & Subtle Patterns */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial Glow 1 (Top Left Gold) */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        {/* Radial Glow 2 (Center Emerald) */}
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-3xl" />
        {/* Subtle Geometric Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badges / Pill Identitas */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-800/60 border border-emerald-400/30 text-emerald-200 text-xs sm:text-sm font-medium backdrop-blur-sm shadow-inner mb-6 sm:mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Pondok Pesantren Darussalam Blokagung – Banyuwangi</span>
          <span className="hidden sm:inline text-emerald-400">•</span>
          <span className="hidden sm:inline text-amber-300 font-semibold">Sejak 1951 M</span>
        </div>

        {/* Hadits Nabi SAW */}
        <div className="max-w-3xl mx-auto mb-8 sm:mb-10 px-4 py-4 rounded-2xl bg-emerald-900/40 border border-amber-400/20 backdrop-blur-sm shadow-xl">
          <p 
            className="text-xl sm:text-2xl md:text-3xl text-amber-300 font-serif leading-relaxed mb-2 font-bold tracking-wide"
            dir="rtl"
            lang="ar"
          >
            إِنَّمَا بُعِثْتُ لِأُتَمِّمَ مَكَارِمَ الْأَخْلَاقِ
          </p>
          <p className="text-xs sm:text-sm text-emerald-100/90 italic font-light">
            &ldquo;Sesungguhnya aku diutus hanya untuk menyempurnakan kemuliaan akhlak.&rdquo;
            <span className="text-amber-400 font-normal ml-1.5 not-italic">(HR. Imam Al-Baihaqi)</span>
          </p>
        </div>

        {/* Judul Utama */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-serif text-white max-w-5xl mx-auto leading-tight sm:leading-snug">
          Madrasah Diniyyah <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100">Al-Amiriyyah</span>
          <span className="block text-xl sm:text-2xl md:text-3xl font-medium font-sans text-emerald-200 mt-2 sm:mt-3">
            (MADINA) Blokagung
          </span>
        </h1>

        {/* Tagline Visi */}
        <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-emerald-100/90 max-w-3xl mx-auto leading-relaxed">
          Pusat <span className="text-amber-300 font-semibold">Tafaqquh Fiddin</span> & Kaderisasi Ulama Berakhlak Mulia yang Menjaga Khazanah Turats Salafiyah dengan Disiplin dan Mutu Pembelajaran Terstruktur.
        </p>

        {/* Dawuh Pendiri Pesantren (Almaghfurlah KH. Mukhtar Syafa'at) */}
        <div className="mt-8 max-w-2xl mx-auto text-center px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-900/30 via-emerald-800/40 to-emerald-900/30 border-y border-amber-400/30">
          <p className="text-xs text-amber-300/80 uppercase tracking-widest font-semibold mb-1">
            Dawuh Pendiri • Almaghfurlah KH. Mukhtar Syafa&apos;at
          </p>
          <blockquote className="text-sm sm:text-base text-amber-200 font-serif italic">
            &ldquo;Openono perkoro seng ono, mongko bakal maujud perkoro seng ora ono.&rdquo;
          </blockquote>
          <p className="text-[11px] text-emerald-200/70 mt-0.5">
            (Rawatlah apa yang sudah ada, niscaya akan terwujud apa yang belum ada).
          </p>
        </div>

        {/* Dua Tombol CTA Utama */}
        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
          {/* Primary CTA: Langsung masuk ke Sistem KBM */}
          <Link
            href="/jadwal-kbm"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all border border-amber-200"
          >
            <BookOpen className="w-5 h-5 text-emerald-950" />
            <span>Buka Sistem Akademik KBM</span>
            <ArrowRight className="w-5 h-5 text-emerald-950" />
          </Link>

          {/* Secondary CTA: Telusuri Kurikulum & Profil */}
          <a
            href="#kurikulum"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl text-base font-semibold text-emerald-100 bg-emerald-900/60 hover:bg-emerald-800/70 border border-emerald-500/40 hover:border-emerald-400/60 backdrop-blur-sm transition-all"
          >
            <Compass className="w-5 h-5 text-amber-300" />
            <span>Pelajari Kurikulum & Kitab</span>
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-14 sm:mt-16 flex justify-center">
          <a 
            href="#statistik" 
            className="inline-flex flex-col items-center gap-1 text-emerald-300/70 hover:text-amber-300 transition-colors text-xs"
            aria-label="Scroll ke bagian statistik"
          >
            <span>Selayang Pandang</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
}
