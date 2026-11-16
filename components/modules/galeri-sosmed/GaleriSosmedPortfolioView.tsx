'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  ExternalLink,
  Sparkles,
  Film,
  Search,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useGaleriSosmedStore } from '@/stores/useGaleriSosmedStore';
import {
  PlatformSosmed,
  PLATFORM_SOSMED_MAP,
  GaleriSosmedItem,
  getSosmedTopics,
  hasSosmedTopic,
} from '@/types/galeri-sosmed';
import {
  TopikBerita,
  TOPIK_BERITA_MAP,
  TOPIK_BERITA_ORDER,
} from '@/types/berita';
import { formatBeritaDateWib } from '@/lib/utils/beritaDateHelper';
import { sanitizeHttpUrl } from '@/lib/security/urlSanitizer';
import ModalLightboxSosmed from './ModalLightboxSosmed';

interface GaleriSosmedPortfolioViewProps {
  compactMode?: boolean;
}

export default function GaleriSosmedPortfolioView({
  compactMode = false,
}: GaleriSosmedPortfolioViewProps) {
  const {
    items,
    channelConfig,
    isLoading,
    error,
    fetchItems,
    activeLightboxItem,
    openLightbox,
    closeLightbox,
  } = useGaleriSosmedStore();

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformSosmed | 'all'>('all');
  const [selectedTopic, setSelectedTopic] = useState<TopikBerita | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Hanya tampilkan karya yang berstatus published untuk publik
  const publishedItems = useMemo(() => {
    return items.filter((it) => it.status === 'published');
  }, [items]);

  // Metrik nyata dari database (Tanpa angka karangan sesuai R-17 & R-38)
  const portfolioStats = useMemo(() => {
    const total = publishedItems.length;
    const youtube = publishedItems.filter((it) => it.platform === 'youtube').length;
    const instagram = publishedItems.filter((it) => it.platform === 'instagram').length;
    const tiktok = publishedItems.filter((it) => it.platform === 'tiktok').length;
    return { total, youtube, instagram, tiktok };
  }, [publishedItems]);

  // Showreel Utama (Karya yang di-pin oleh admin, atau karya terbaru jika belum ada yang di-pin)
  const featuredShowreel = useMemo<GaleriSosmedItem | null>(() => {
    if (publishedItems.length === 0) return null;
    const pinned = publishedItems.find((it) => it.is_pinned);
    return pinned || publishedItems[0];
  }, [publishedItems]);

  // Daftar karya terfilter
  const filteredItems = useMemo(() => {
    return publishedItems.filter((item) => {
      if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) return false;
      if (selectedTopic !== 'all' && !hasSosmedTopic(item, selectedTopic)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCaption = item.caption.toLowerCase().includes(q);
        const matchCreator = item.creator_name.toLowerCase().includes(q);
        return matchTitle || matchCaption || matchCreator;
      }
      return true;
    });
  }, [publishedItems, selectedPlatform, selectedTopic, searchQuery]);

  const displayedGridItems = useMemo(() => {
    if (compactMode) {
      return filteredItems.slice(0, 6);
    }
    return filteredItems;
  }, [filteredItems, compactMode]);

  return (
    <div className="space-y-10">
      {/* 1. CREATOR IDENTITY HEADER & CHANNEL HUB */}
      <div className="rounded-3xl bg-gradient-to-br from-[#062c28] via-[#0b5751] to-slate-950 text-white p-6 sm:p-8 lg:p-10 border border-emerald-700/50 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Profil Studio Kreator */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 max-w-2xl">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-lg border-2 border-amber-300/60 flex items-center justify-center shrink-0">
              <img
                src="/logo-madin.png"
                alt="Logo Media Madin Blokagung"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-400 text-emerald-950">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Official Creator Studio</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-900/80 text-emerald-200 border border-emerald-600/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ponpes Darussalam Blokagung</span>
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-serif tracking-tight text-white">
                {channelConfig.creatorTitle}
              </h2>

              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                {channelConfig.creatorTagline}
              </p>

              {/* Tautan Kanal Resmi (YouTube, Instagram, TikTok) */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <a
                  href={sanitizeHttpUrl(channelConfig.youtubeUrl) || 'https://www.youtube.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <span className="px-1.5 py-0.5 rounded bg-black/25 text-[10px] font-extrabold">YT</span>
                  <span>YouTube {channelConfig.youtubeHandle}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <a
                  href={sanitizeHttpUrl(channelConfig.instagramUrl) || 'https://www.instagram.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 hover:opacity-95 text-white text-xs font-bold transition shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <span className="px-1.5 py-0.5 rounded bg-black/25 text-[10px] font-extrabold">IG</span>
                  <span>Instagram {channelConfig.instagramHandle}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <a
                  href={sanitizeHttpUrl(channelConfig.tiktokUrl) || 'https://www.tiktok.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 text-white border border-white/25 text-xs font-bold transition shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <span className="px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-extrabold">TT</span>
                  <span>TikTok {channelConfig.tiktokHandle}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>
          </div>

          {/* Metrik Portofolio Terverifikasi dari Database */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0 lg:w-72">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                Total Karya
              </p>
              <p className="text-2xl font-extrabold font-serif text-amber-300 mt-0.5">
                {portfolioStats.total}
              </p>
              <p className="text-[10px] text-emerald-100/75">Karya Terpublikasi</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                YouTube
              </p>
              <p className="text-2xl font-extrabold font-serif text-white mt-0.5">
                {portfolioStats.youtube}
              </p>
              <p className="text-[10px] text-emerald-100/75">Dokumenter &amp; Kajian</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                Instagram
              </p>
              <p className="text-2xl font-extrabold font-serif text-white mt-0.5">
                {portfolioStats.instagram}
              </p>
              <p className="text-[10px] text-emerald-100/75">Reels &amp; Visual Feed</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                TikTok
              </p>
              <p className="text-2xl font-extrabold font-serif text-white mt-0.5">
                {portfolioStats.tiktok}
              </p>
              <p className="text-[10px] text-emerald-100/75">Video Pendek Santri</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FEATURED SHOWREEL STAGE (KARYA UNGGULAN UTAMA) */}
      {featuredShowreel && (
        <div className="rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Panggung Visual Showreel (7 Kolom) */}
          <div className="lg:col-span-7 relative min-h-[280px] sm:min-h-[380px] bg-slate-900 overflow-hidden group">
            <img
              src={featuredShowreel.thumbnail_url}
              alt={featuredShowreel.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

            {/* Badge Pinned Showreel */}
            <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-400 text-emerald-950 shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Featured Showreel</span>
              </span>
              <span
                className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider ${
                  PLATFORM_SOSMED_MAP[featuredShowreel.platform].badgeBg
                } ${PLATFORM_SOSMED_MAP[featuredShowreel.platform].badgeText} shadow-md`}
              >
                {PLATFORM_SOSMED_MAP[featuredShowreel.platform].label}
              </span>
            </div>

            {/* Tombol Putar Sinematik di Tengah */}
            <button
              type="button"
              onClick={() => openLightbox(featuredShowreel)}
              aria-label={`Putar showreel utama: ${featuredShowreel.title}`}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center focus:outline-none focus:ring-4 focus:ring-amber-400/60 cursor-pointer"
            >
              <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-400 text-emerald-950 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 fill-emerald-950 ml-1" />
              </span>
              <span className="px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-xs border border-white/20 text-xs font-bold text-amber-300">
                Klik untuk Menonton di Layar Penuh (Theater Mode)
              </span>
            </button>
          </div>

          {/* Narasi & Konteks Produksi (5 Kolom) */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getSosmedTopics(featuredShowreel).map((tKey) => {
                  const meta = TOPIK_BERITA_MAP[tKey] || TOPIK_BERITA_MAP.umum;
                  return (
                    <span
                      key={tKey}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider ${meta.badgeBg} ${meta.badgeText}`}
                    >
                      {meta.title}
                    </span>
                  );
                })}
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatBeritaDateWib(featuredShowreel.published_at, 'short')}</span>
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-serif text-white leading-snug">
                {featuredShowreel.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {featuredShowreel.caption}
              </p>

              <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">
                  Unit Produksi Kreatif
                </span>
                <span className="font-semibold text-white block">
                  {featuredShowreel.creator_name}
                </span>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => openLightbox(featuredShowreel)}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-extrabold text-xs sm:text-sm transition shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                <Play className="w-4 h-4 fill-emerald-950" />
                <span>Putar Karya Sekarang</span>
              </button>

              <a
                href={sanitizeHttpUrl(featuredShowreel.source_url) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <span>Buka Asli</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 3. FILTER BAR (PLATFORM, TOPIK MULTI-KATEGORI, & PENCARIAN) */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tab Filter Platform */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedPlatform('all')}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedPlatform === 'all'
                  ? 'bg-[#0b5751] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Semua Platform ({publishedItems.length})
            </button>

            {(['youtube', 'instagram', 'tiktok'] as PlatformSosmed[]).map((plat) => {
              const pMeta = PLATFORM_SOSMED_MAP[plat];
              const isSelected = selectedPlatform === plat;
              const count = publishedItems.filter((it) => it.platform === plat).length;
              return (
                <button
                  key={plat}
                  type="button"
                  onClick={() => setSelectedPlatform(plat)}
                  className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? `${pMeta.badgeBg} ${pMeta.badgeText} shadow-xs ring-2 ring-emerald-500/40`
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>{pMeta.label}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Input Pencarian Karya */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul karya atau kreator..."
              className="w-full min-h-[40px] pl-10 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Bersihkan kata kunci pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Baris Filter Kategori Topik (Semua Topik -> Umum -> Unggulan -> ULA -> WUSTHO -> ULYA) */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3 text-emerald-600" />
            <span>Kategori:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedTopic('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedTopic === 'all'
                ? 'bg-[#0b5751] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Semua Topik
          </button>

          {TOPIK_BERITA_ORDER.map((tKey) => {
            const meta = TOPIK_BERITA_MAP[tKey];
            const isSelected = selectedTopic === tKey;
            return (
              <button
                key={tKey}
                type="button"
                onClick={() => setSelectedTopic(tKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? `${meta.badgeBg} ${meta.badgeText} ring-2 ring-emerald-600/40`
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {meta.shortTitle}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. PORTFOLIO GRID DENGAN 3 UI STATES (LOADING, ERROR, EMPTY, DATA) */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse p-6 flex flex-col justify-end"
            >
              <span className="text-xs text-slate-500 font-semibold">
                Memuat portofolio karya Media Madin...
              </span>
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
            Gagal Memuat Galeri Sosmed
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {error}
          </p>
          <button
            type="button"
            onClick={() => fetchItems()}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition"
          >
            Muat Ulang Galeri
          </button>
        </div>
      )}

      {!isLoading && !error && displayedGridItems.length === 0 && (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
            <Film className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
            Tidak Ada Karya yang Sesuai Filter
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Belum ada konten video atau publikasi sosmed pada kombinasi filter platform dan kategori yang dipilih.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedPlatform('all');
              setSelectedTopic('all');
              setSearchQuery('');
            }}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
          >
            Tampilkan Semua Karya
          </button>
        </div>
      )}

      {!isLoading && !error && displayedGridItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedGridItems.map((item) => {
            const pMeta = PLATFORM_SOSMED_MAP[item.platform] || PLATFORM_SOSMED_MAP.youtube;
            const itemTopics = getSosmedTopics(item);
            const formattedDate = formatBeritaDateWib(item.published_at, 'short');
            const formatBadgeLabel =
              item.content_format === 'vertical'
                ? 'Vertical 9:16'
                : item.content_format === 'post'
                  ? 'Feed / Carousel'
                  : 'Widescreen 16:9';

            return (
              <div
                key={item.id}
                className="group flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                {/* Area Poster Thumbnail Klik-Untuk-Putar */}
                <button
                  type="button"
                  onClick={() => openLightbox(item)}
                  aria-label={`Tonton karya ${pMeta.label}: ${item.title}`}
                  className="relative aspect-video w-full overflow-hidden bg-slate-900 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/15" />

                  {/* Badge Platform & Format */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider ${pMeta.badgeBg} ${pMeta.badgeText} shadow-md`}
                    >
                      {pMeta.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/65 text-slate-200 backdrop-blur-xs border border-white/15">
                      {formatBadgeLabel}
                    </span>
                  </div>

                  {/* Ikon Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-13 h-13 rounded-full bg-amber-400/95 text-emerald-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-emerald-950 ml-0.5" />
                    </span>
                  </div>

                  {/* Baris Kategori di Sudut Bawah Thumbnail */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 flex-wrap">
                    {itemTopics.map((tKey) => {
                      const tMeta = TOPIK_BERITA_MAP[tKey] || TOPIK_BERITA_MAP.umum;
                      return (
                        <span
                          key={tKey}
                          className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider ${tMeta.badgeBg} ${tMeta.badgeText}`}
                        >
                          {tMeta.shortTitle}
                        </span>
                      );
                    })}
                  </div>
                </button>

                {/* Detail Konten Kartu */}
                <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                        {item.creator_name}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{formattedDate}</span>
                      </span>
                    </div>

                    <h4 className="text-base font-bold font-serif text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      <button
                        type="button"
                        onClick={() => openLightbox(item)}
                        className="text-left hover:underline focus:outline-none cursor-pointer"
                      >
                        {item.title}
                      </button>
                    </h4>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.caption}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openLightbox(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Putar Embed</span>
                    </button>

                    <a
                      href={sanitizeHttpUrl(item.source_url) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span>Buka {pMeta.shortLabel}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tombol Menuju Halaman Penuh Portofolio jika sedang di mode ringkas Beranda */}
      {compactMode && (
        <div className="pt-2 flex justify-center">
          <Link
            href="/galeri-sosmed"
            className="min-h-[44px] inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs sm:text-sm font-extrabold shadow-lg transition"
          >
            <Film className="w-4 h-4 text-amber-300" />
            <span>Buka Halaman Penuh Portofolio Galeri Sosmed</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </Link>
        </div>
      )}

      {/* Modal Cinema Lightbox Pemutar Embed Resmi */}
      <ModalLightboxSosmed item={activeLightboxItem} onClose={closeLightbox} />
    </div>
  );
}
