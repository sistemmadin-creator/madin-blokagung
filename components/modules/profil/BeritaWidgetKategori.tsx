'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, BookOpen, Layers, GraduationCap, ChevronRight } from 'lucide-react';
import { TopikBerita, TOPIK_BERITA_MAP } from '@/types/berita';

interface BeritaWidgetKategoriProps {
  postCounts: Record<TopikBerita, number>;
  onSelectTopic?: (topic: TopikBerita | 'all') => void;
  activeTopic?: TopikBerita | 'all';
}

const TOPIK_ICONS: Record<TopikBerita, React.ReactNode> = {
  kelas_unggulan: <Sparkles className="w-4 h-4 text-amber-500" />,
  tingkat_ula: <BookOpen className="w-4 h-4 text-emerald-600" />,
  tingkat_wustho: <Layers className="w-4 h-4 text-blue-600" />,
  tingkat_ulya: <GraduationCap className="w-4 h-4 text-indigo-600" />,
};

export default function BeritaWidgetKategori({
  postCounts,
  onSelectTopic,
  activeTopic = 'all',
}: BeritaWidgetKategoriProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-4">
      {/* Header Widget Kategori Pilihan (Khas Lirboyo.net) */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-3 flex items-center justify-between">
        <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white relative pl-3.5">
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-4.5 bg-emerald-700 rounded-full" />
          Kategori Pilihan
        </h3>
        <Link
          href="/berita"
          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-0.5"
        >
          <span>Semua</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 4 Kotak Topik Khusus */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
        {(Object.keys(TOPIK_BERITA_MAP) as TopikBerita[]).map((key) => {
          const item = TOPIK_BERITA_MAP[key];
          const count = postCounts[key] || 0;
          const isSelected = activeTopic === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectTopic && onSelectTopic(isSelected ? 'all' : key)}
              className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                isSelected
                  ? `${item.lightBg} ${item.borderColor} ring-2 ring-emerald-600/40 shadow-xs`
                  : 'border-slate-100 dark:border-slate-700/80 hover:border-slate-200 bg-slate-50/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-750'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-slate-200/60 dark:border-slate-600 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  {TOPIK_ICONS[key]}
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {item.description}
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex-shrink-0 ml-2">
                {count} Warta
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
