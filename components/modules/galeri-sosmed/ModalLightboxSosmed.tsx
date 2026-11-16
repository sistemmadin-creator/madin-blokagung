'use client';

import React, { useEffect } from 'react';
import {
  X,
  ExternalLink,
  Clock,
  User,
  Sparkles,
  Play,
} from 'lucide-react';
import {
  GaleriSosmedItem,
  PLATFORM_SOSMED_MAP,
  getSosmedTopics,
} from '@/types/galeri-sosmed';
import { TOPIK_BERITA_MAP } from '@/types/berita';
import { buildSosmedEmbedUrl } from '@/lib/utils/sosmedEmbedHelper';
import { formatBeritaDateWib } from '@/lib/utils/beritaDateHelper';
import { sanitizeHttpUrl } from '@/lib/security/urlSanitizer';

interface ModalLightboxSosmedProps {
  item: GaleriSosmedItem | null;
  onClose: () => void;
}

export default function ModalLightboxSosmed({
  item,
  onClose,
}: ModalLightboxSosmedProps) {
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const platformMeta = PLATFORM_SOSMED_MAP[item.platform] || PLATFORM_SOSMED_MAP.youtube;
  const itemTopics = getSosmedTopics(item);
  const embedUrl = buildSosmedEmbedUrl(item);
  const safeExternalUrl = sanitizeHttpUrl(item.source_url) || '#';
  const formattedDate = formatBeritaDateWib(item.published_at, 'longWithWeekday');
  const isVertical = item.content_format === 'vertical';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Pemutar Karya: ${item.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-slate-900 text-white rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup Melayang */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup jendela pemutar"
          className="absolute top-3.5 right-3.5 z-30 min-w-[44px] min-h-[44px] rounded-full bg-slate-900/90 hover:bg-slate-800 text-white border border-white/20 flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Kolom Kiri (7 Kolom): Panggung Embed Resmi */}
        <div className="lg:col-span-7 bg-black flex items-center justify-center p-3 sm:p-6 min-h-[340px] sm:min-h-[480px] relative">
          {embedUrl ? (
            <div
              className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl ${
                isVertical
                  ? 'max-w-[340px] aspect-[9/16] max-h-[72vh]'
                  : item.content_format === 'post'
                    ? 'max-w-[420px] aspect-[4/5] max-h-[72vh]'
                    : 'aspect-video'
              }`}
            >
              <iframe
                src={embedUrl}
                title={item.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/10 text-amber-300 flex items-center justify-center mx-auto">
                <Play className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold">Pratinjau Embed Tidak Tersedia</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Silakan buka karya ini secara langsung di aplikasi {platformMeta.label}.
              </p>
            </div>
          )}
        </div>

        {/* Kolom Kanan (5 Kolom): Detail Cerita Karya & Navigasi */}
        <div className="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800 overflow-y-auto">
          <div className="space-y-4">
            {/* Baris Badge Platform & Topik */}
            <div className="flex items-center gap-2 flex-wrap pr-10">
              <span
                className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${platformMeta.badgeBg} ${platformMeta.badgeText}`}
              >
                {platformMeta.label}
              </span>
              {item.is_pinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Sparkles className="w-3 h-3" />
                  <span>Showreel Utama</span>
                </span>
              )}
              {itemTopics.map((tKey) => {
                const tMeta = TOPIK_BERITA_MAP[tKey] || TOPIK_BERITA_MAP.umum;
                return (
                  <span
                    key={tKey}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] ${tMeta.badgeBg} ${tMeta.badgeText}`}
                  >
                    {tMeta.shortTitle}
                  </span>
                );
              })}
            </div>

            {/* Judul Karya */}
            <h3 className="text-xl sm:text-2xl font-extrabold font-serif text-white leading-snug">
              {item.title}
            </h3>

            {/* Metadata Kreator & Tanggal */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 py-3 border-y border-slate-800">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
                <User className="w-3.5 h-3.5" />
                <span>{item.creator_name}</span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </span>
            </div>

            {/* Deskripsi / Cerita di Balik Layar */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
                Catatan &amp; Konteks Karya
              </p>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {item.caption}
              </p>
            </div>
          </div>

          {/* Tombol Aksi Bawah */}
          <div className="pt-6 mt-6 border-t border-slate-800 space-y-2.5">
            <a
              href={safeExternalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-extrabold text-xs sm:text-sm transition shadow-md focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
              <span>Buka Langsung di {platformMeta.label}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
            >
              Tutup Pemutar (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
