'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Play,
  ExternalLink,
  MoreHorizontal,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  ContentFormatSosmed,
  GaleriSosmedItem,
  PLATFORM_SOSMED_MAP,
} from '@/types/galeri-sosmed';
import {
  sanitizeHttpUrl,
  sanitizeRenderableImageUrl,
} from '@/lib/security/urlSanitizer';

interface MasonrySosmedBoardProps {
  items: GaleriSosmedItem[];
  onOpenItem: (item: GaleriSosmedItem) => void;
}

const FORMAT_ASPECT_CLASS: Record<ContentFormatSosmed, string> = {
  landscape: 'aspect-video',
  post: 'aspect-[4/5]',
  vertical: 'aspect-[9/15]',
};

const FORMAT_WEIGHT: Record<ContentFormatSosmed, number> = {
  landscape: 0.72,
  post: 1.32,
  vertical: 1.72,
};

function getColumnCountForWidth(width: number): number {
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
}

export function distributeMasonryColumns(
  items: GaleriSosmedItem[],
  columnCount: number
): GaleriSosmedItem[][] {
  const safeCols = Math.max(1, columnCount);
  const columns: GaleriSosmedItem[][] = Array.from({ length: safeCols }, () => []);
  const heights = new Array<number>(safeCols).fill(0);

  // Tempatkan karya tersemat (is_pinned) lebih dahulu tanpa mengubah urutan relatif lainnya
  const sorted = [...items].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return 0;
  });

  sorted.forEach((item) => {
    let shortestIdx = 0;
    for (let i = 1; i < safeCols; i++) {
      if (heights[i] < heights[shortestIdx]) {
        shortestIdx = i;
      }
    }
    columns[shortestIdx].push(item);
    const mediaWeight = FORMAT_WEIGHT[item.content_format] ?? 1;
    heights[shortestIdx] += mediaWeight + 0.28;
  });

  return columns;
}

export default function MasonrySosmedBoard({
  items,
  onOpenItem,
}: MasonrySosmedBoardProps) {
  const [columnCount, setColumnCount] = useState<number>(4);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const syncColumns = () => {
      if (typeof window === 'undefined') return;
      setColumnCount(getColumnCountForWidth(window.innerWidth));
    };
    syncColumns();
    window.addEventListener('resize', syncColumns);
    return () => window.removeEventListener('resize', syncColumns);
  }, []);

  useEffect(() => {
    const handleDocClick = () => setOpenMenuId(null);
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('click', handleDocClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('click', handleDocClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const columns = useMemo(
    () => distributeMasonryColumns(items, columnCount),
    [items, columnCount]
  );

  const handleCopyLink = async (item: GaleriSosmedItem) => {
    const safeUrl = sanitizeHttpUrl(item.source_url);
    if (!safeUrl || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div
      className="grid gap-3 sm:gap-4 lg:gap-5 items-start"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
    >
      {columns.map((colItems, colIdx) => (
        <div key={`masonry-col-${colIdx}`} className="flex flex-col gap-4 sm:gap-5 min-w-0">
          {colItems.map((item) => {
            const pMeta = PLATFORM_SOSMED_MAP[item.platform] || PLATFORM_SOSMED_MAP.youtube;
            const aspectClass = FORMAT_ASPECT_CLASS[item.content_format] || 'aspect-[4/5]';
            const safeUrl = sanitizeHttpUrl(item.source_url) || '#';
            const safeThumbUrl = sanitizeRenderableImageUrl(item.thumbnail_url);
            const isMenuOpen = openMenuId === item.id;

            return (
              <article key={item.id} className="group flex flex-col min-w-0">
                {/* Media Pin Visual-First */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-2xs transition-shadow duration-300 group-hover:shadow-lg">
                  <button
                    type="button"
                    onClick={() => onOpenItem(item)}
                    aria-label={`Tonton karya ${pMeta.label}: ${item.title}`}
                    className={`relative block w-full ${aspectClass} overflow-hidden text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600`}
                  >
                    {!failedImages[item.id] && safeThumbUrl ? (
                      <img
                        src={safeThumbUrl}
                        alt={item.title}
                        loading="lazy"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                        }
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-950 via-[#0b5751] to-slate-900 flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-2">
                          <Play className="w-6 h-6 text-amber-300 fill-amber-300 ml-0.5" />
                        </div>
                        <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">
                          {pMeta.label}
                        </span>
                      </div>
                    )}

                    {/* Scrim hover halus seperti Pinterest */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 group-focus-within:bg-black/30 transition-colors duration-200" />

                    {/* Indikator Minimalis di Keadaan Diam (tanpa menumpuk teks di poster) */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide shadow-sm ${pMeta.badgeBg} ${pMeta.badgeText} opacity-90 group-hover:opacity-0 transition-opacity`}
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{pMeta.shortLabel}</span>
                      </span>
                      {item.is_pinned && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-emerald-950 shadow-sm opacity-95 group-hover:opacity-0 transition-opacity">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Pilihan</span>
                        </span>
                      )}
                    </div>

                    {/* Pill Tombol Putar ala Pinterest saat Hover */}
                    <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-extrabold shadow-lg">
                        <Play className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        <span>Putar</span>
                      </span>
                    </div>
                  </button>

                  {/* Tautan cepat pojok kanan bawah saat hover */}
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Buka di ${pMeta.label}`}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 text-[11px] font-bold shadow-md hover:bg-white"
                  >
                    <span>{pMeta.label}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Footer Pin Super Ringkas Ala Pinterest (Judul + Tombol titik tiga) */}
                <div className="pt-2 px-1 flex items-start justify-between gap-2 relative">
                  <button
                    type="button"
                    onClick={() => onOpenItem(item)}
                    className="flex-1 min-w-0 text-left cursor-pointer focus:outline-none group/title"
                  >
                    <h3 className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 group-hover/title:text-emerald-700 dark:group-hover/title:text-emerald-400">
                      {item.title}
                    </h3>
                  </button>

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      aria-label={`Opsi karya ${item.title}`}
                      aria-expanded={isMenuOpen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId((prev) => (prev === item.id ? null : item.id));
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        role="menu"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 bottom-8 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-1.5 z-30 space-y-0.5 text-xs"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenMenuId(null);
                            onOpenItem(item);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-semibold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                          <span>Putar Embed</span>
                        </button>
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          role="menuitem"
                          onClick={() => setOpenMenuId(null)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                          <span>Buka di {pMeta.label}</span>
                        </a>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            handleCopyLink(item);
                            setTimeout(() => setOpenMenuId(null), 500);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-semibold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Salin Tautan</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ))}
    </div>
  );
}
