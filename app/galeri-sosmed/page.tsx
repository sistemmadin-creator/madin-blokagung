'use client';

import React from 'react';
import Link from 'next/link';
import { Newspaper, ChevronLeft, Film } from 'lucide-react';
import { NavbarProfil, FooterProfil } from '@/components/modules/profil';
import GaleriSosmedPortfolioView from '@/components/modules/galeri-sosmed/GaleriSosmedPortfolioView';

export default function GaleriSosmedPublicPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-300 selection:text-emerald-950">
      <NavbarProfil />

      <main className="flex-1 py-4 sm:py-6">
        <div className="max-w-[1520px] mx-auto px-3 sm:px-6 lg:px-8 space-y-4">
          {/* Baris Navigasi Ringkas & Judul Halaman */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Film className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-xl font-extrabold font-serif text-slate-900 dark:text-white">
                Portofolio Kreator &amp; Galeri Sosmed Media Madin
              </h1>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/berita"
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
              >
                <Newspaper className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Arsip Kabar Berita</span>
              </Link>
              <Link
                href="/#berita"
                className="min-h-[36px] inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </Link>
            </div>
          </div>

          {/* Tampilan Penuh Board Masonry 4-Kolom Ala Pinterest */}
          <GaleriSosmedPortfolioView />
        </div>
      </main>

      <FooterProfil />
    </div>
  );
}
