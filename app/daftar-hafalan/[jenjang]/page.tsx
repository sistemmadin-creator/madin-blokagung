import React from 'react';
import Link from 'next/link';
import { ChevronLeft, BookOpen } from 'lucide-react';
import { NavbarProfil, FooterProfil } from '@/components/modules/profil';
import DaftarHafalanPublicView from '@/components/modules/setoran/DaftarHafalanPublicView';
import {
  JENJANG_HAFALAN_META,
  parseJenjangSlug,
} from '@/lib/utils/daftarHafalanPublicHelper';

interface PageProps {
  params: Promise<{ jenjang: string }>;
}

export default async function DaftarHafalanJenjangPage({ params }: PageProps) {
  const { jenjang: rawJenjang } = await params;
  const jenjang = parseJenjangSlug(rawJenjang);
  const meta = JENJANG_HAFALAN_META[jenjang];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-300 selection:text-emerald-950">
      <NavbarProfil />

      <main className="flex-1 py-8 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="space-y-1">
              <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link href="/" className="hover:text-emerald-700">
                  Beranda
                </Link>
                <span>/</span>
                <span>Muhafadzoh</span>
                <span>/</span>
                <span className="font-semibold">Daftar Hafalan</span>
                <span>/</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {meta.label}
                </span>
              </nav>
              <div className="flex items-center gap-2 pt-1">
                <BookOpen className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
                <h2 className="text-lg sm:text-xl font-extrabold font-serif text-slate-900 dark:text-white">
                  Muhafadzoh • Daftar Hafalan Tingkat {meta.label}
                </h2>
              </div>
            </div>

            <Link
              href="/"
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold transition self-start sm:self-auto"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>

          <DaftarHafalanPublicView jenjang={jenjang} />
        </div>
      </main>

      <FooterProfil />
    </div>
  );
}
