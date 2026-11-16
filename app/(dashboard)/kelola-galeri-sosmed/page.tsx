'use client';

import React from 'react';
import Link from 'next/link';
import { Film, Plus, ExternalLink, Sliders, Newspaper } from 'lucide-react';
import TabelKelolaGaleriSosmed from '@/components/modules/galeri-sosmed/TabelKelolaGaleriSosmed';
import ModalFormGaleriSosmed from '@/components/modules/galeri-sosmed/ModalFormGaleriSosmed';
import ModalChannelConfigSosmed from '@/components/modules/galeri-sosmed/ModalChannelConfigSosmed';
import { useGaleriSosmedStore } from '@/stores/useGaleriSosmedStore';
import { usePagePermission } from '@/stores/useRbacStore';

export default function KelolaGaleriSosmedAdminPage() {
  const { openFormModal, openChannelModal } = useGaleriSosmedStore();
  const { canCreate, canEdit } = usePagePermission('kelola-galeri-sosmed');

  return (
    <div className="space-y-6">
      {/* Header Halaman Admin Galeri Sosmed */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b5751] to-[#147a71] text-amber-300 flex items-center justify-center shrink-0 shadow-md">
            <Film className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
                Kelola Galeri Sosmed &amp; Portofolio Kreator
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                PKM. Media Madin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Kelola kurasi embed resmi dari <strong>YouTube</strong>, <strong>Instagram</strong>, dan <strong>TikTok</strong> untuk ditampilkan pada panggung portofolio kreator profesional Media Madin Blokagung.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/kelola-berita"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-2xs"
          >
            <Newspaper className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Kelola Berita</span>
          </Link>

          {canEdit && (
            <button
              type="button"
              onClick={openChannelModal}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Profil &amp; Kanal Resmi</span>
            </button>
          )}

          <Link
            href="/galeri-sosmed"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/80 text-xs font-bold transition shadow-2xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Lihat Portofolio Publik</span>
          </Link>

          {canCreate && (
            <button
              type="button"
              onClick={() => openFormModal(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 transition shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-950 stroke-[2.5]" />
              <span>Tambah Karya Sosmed</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabel Kelola Galeri Sosmed */}
      <TabelKelolaGaleriSosmed />

      {/* Modal Form Input & Edit Karya Sosmed */}
      <ModalFormGaleriSosmed />

      {/* Modal Konfigurasi Kanal Resmi */}
      <ModalChannelConfigSosmed />
    </div>
  );
}
