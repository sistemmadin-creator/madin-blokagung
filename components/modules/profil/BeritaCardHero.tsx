'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Tag, ArrowRight } from 'lucide-react';
import { WartaBerita, TOPIK_BERITA_MAP } from '@/types/berita';

interface BeritaCardHeroProps {
  post: WartaBerita;
}

export default function BeritaCardHero({ post }: BeritaCardHeroProps) {
  const topikMeta = TOPIK_BERITA_MAP[post.topic] || TOPIK_BERITA_MAP.kelas_unggulan;

  // Format tanggal publikasi
  const formattedDate = new Date(post.published_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link
      href={`/berita/${post.slug}`}
      className="group relative block w-full h-full min-h-[380px] sm:min-h-[440px] lg:min-h-[480px] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200/80 dark:border-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/40"
    >
      {/* Background Image dengan efek zoom halus */}
      <img
        src={post.cover_image_url}
        alt={post.title}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
      />

      {/* Gradien Scrim Gelap (Khas Majalah Editorial Pesantren ala Lirboyo) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10 transition-opacity" />

      {/* Konten Berita di Atas Scrim */}
      <div className="absolute inset-0 p-5 sm:p-7 lg:p-8 flex flex-col justify-end">
        {/* Baris Badge Kategori & Waktu */}
        <div className="flex items-center gap-2.5 flex-wrap mb-3">
          <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${topikMeta.badgeBg} ${topikMeta.badgeText} shadow-md`}>
            {topikMeta.title}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-200 bg-white/15 backdrop-blur-xs border border-white/15">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>{formattedDate}</span>
          </span>
        </div>

        {/* Judul Berita Utama */}
        <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white font-serif tracking-tight leading-snug group-hover:text-amber-300 transition-colors line-clamp-3">
          {post.title}
        </h3>

        {/* Cuplikan Excerpt */}
        <p className="mt-2 text-xs sm:text-sm text-slate-200/90 leading-relaxed line-clamp-2 font-sans max-w-3xl">
          {post.excerpt}
        </p>

        {/* Chip Tag Tambahan & Indikator Baca */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-600/80 text-white text-[11px] font-semibold flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>{post.tags?.[0] || 'Kajian Salaf'}</span>
            </span>
            <span className="text-[11px] text-slate-300 hidden sm:inline">
              Oleh: {post.author_name}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
            <span>Baca Selengkapnya</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
