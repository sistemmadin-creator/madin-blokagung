'use client';

import React from 'react';
import Link from 'next/link';
import { Newspaper, ChevronLeft, Film } from 'lucide-react';
import { NavbarProfil, FooterProfil } from '@/components/modules/profil';
import GaleriSosmedPortfolioView from '@/components/modules/galeri-sosmed/GaleriSosmedPortfolioView';

export default function GaleriSosmedPublicPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-300 selection:text-emerald-950">
      <NavbarProfil />

      <main className="flex-1 py-8 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Baris Navigasi Atas & Breadcrumb */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="space-y-1">
              <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link href="/" className="hover:text-emerald-700">
                  Beranda
                </Link>
                <span>/</span>
                <Link href="/#berita" className="hover:text-emerald-700">
                  Media Madin
                </Link>
                <span>/</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Galeri Sosmed
                </span>
              </nav>
              <div className="flex items-center gap-2 pt-1">
                <Film className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h1 className="text-xl sm:text-2xl font-extrabold font-serif text-slate-900 dark:text-white">
                  Portofolio Kreator &amp; Galeri Sosmed Media Madin
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/berita"
                className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition"
              >
                <Newspaper className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Arsip Kabar Berita</span>
              </Link>
              <Link
                href="/#berita"
                className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali ke Beranda</span>
              </Link>
            </div>
          </div>

          {/* Tampilan Penuh Portofolio Kreator Media Madin */}
          <GaleriSosmedPortfolioView />
        </div>
      </main>

      <FooterProfil />
    </div>
  );
}
