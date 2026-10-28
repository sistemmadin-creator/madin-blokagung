'use client';

import React from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { WartaBerita, TOPIK_BERITA_MAP } from '@/types/berita';

interface BeritaCardGridProps {
  post: WartaBerita;
}

export default function BeritaCardGrid({ post }: BeritaCardGridProps) {
  const topikMeta = TOPIK_BERITA_MAP[post.topic] || TOPIK_BERITA_MAP.tingkat_ula;

  const formattedDate = new Date(post.published_at).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <Link
      href={`/berita/${post.slug}`}
      className="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      {/* Thumbnail Gambar dengan Badge Topik Melayang */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        <img
          src={post.cover_image_url}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Badge Topik di Sudut Kiri Atas */}
        <div className="absolute top-2.5 left-2.5">
          <span className={`px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${topikMeta.badgeBg} ${topikMeta.badgeText} shadow-xs`}>
            {topikMeta.shortTitle}
          </span>
        </div>
      </div>

      {/* Konten Judul & Tanggal */}
      <div className="p-3.5 sm:p-4 flex flex-col justify-between flex-1">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-serif leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
          {post.title}
        </h4>

        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="truncate max-w-[130px]">{post.author_name}</span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{formattedDate}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
