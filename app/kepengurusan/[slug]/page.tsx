import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';
import { NavbarProfil, FooterProfil } from '@/components/modules/profil';
import KepengurusanPublicView from '@/components/modules/kepengurusan/KepengurusanPublicView';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function KepengurusanPeriodePage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-300 selection:text-emerald-950">
      <NavbarProfil />

      <main className="flex-1 py-8 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="space-y-1">
              <nav className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                <Link href="/" className="hover:text-emerald-700">
                  Beranda
                </Link>
                <span>/</span>
                <Link href="/#statistik" className="hover:text-emerald-700">
                  Tentang Kami
                </Link>
                <span>/</span>
                <Link href="/kepengurusan" className="hover:text-emerald-700">
                  Kepengurusan
                </Link>
                <span>/</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {slug}
                </span>
              </nav>
              <div className="flex items-center gap-2 pt-1">
                <Users className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                <h2 className="text-lg sm:text-xl font-extrabold font-serif text-slate-900 dark:text-white">
                  Struktur &amp; Personalia Kepengurusan Madin Blokagung
                </h2>
              </div>
            </div>

            <Link
              href="/"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold transition self-start sm:self-auto"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>

          <KepengurusanPublicView periodeSlug={slug} />
        </div>
      </main>

      <FooterProfil />
    </div>
  );
}
