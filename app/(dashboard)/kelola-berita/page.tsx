'use client';

import React from 'react';
import Link from 'next/link';
import { Newspaper, Plus, ExternalLink, Film } from 'lucide-react';
import TabelKelolaBerita from '@/components/modules/berita/TabelKelolaBerita';
import ModalFormBerita from '@/components/modules/berita/ModalFormBerita';
import { useBeritaStore } from '@/stores/useBeritaStore';
import { usePagePermission } from '@/stores/useRbacStore';

export default function BeritaAdminPage() {
  const { openFormModal } = useBeritaStore();
  const { canCreate } = usePagePermission('kelola-berita');

  return (
    <div className="space-y-6">
      {/* Header Halaman Admin Berita */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b5751] to-[#147a71] text-amber-300 flex items-center justify-center flex-shrink-0 shadow-md">
            <Newspaper className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
                Manajemen Kabar Madin Blokagung
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                PKM. Media Madin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Publikasikan kegiatan madrasah dengan dukungan multi-kategori: <strong>Umum</strong>, <strong>Kelas Unggulan</strong>, <strong>Tingkat ULA</strong>, <strong>Tingkat WUSTHO</strong>, dan <strong>Tingkat ULYA</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <Link
            href="/kelola-galeri-sosmed"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/80 text-xs font-bold transition shadow-2xs"
          >
            <Film className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Kelola Galeri Sosmed</span>
          </Link>

          <Link
            href="/#berita"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-2xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Lihat Portal Publik</span>
          </Link>

          {canCreate && (
            <button
              type="button"
              onClick={() => openFormModal(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 transition shadow-md shadow-amber-500/20 active:scale-98"
            >
              <Plus className="w-4 h-4 text-emerald-950 stroke-[2.5]" />
              <span>Tulis Berita Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabel Kelola Berita */}
      <TabelKelolaBerita />

      {/* Modal Formulir Input & Edit Berita */}
      <ModalFormBerita />
    </div>
  );
}
