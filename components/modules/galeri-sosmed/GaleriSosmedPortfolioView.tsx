'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Film,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { useGaleriSosmedStore } from '@/stores/useGaleriSosmedStore';
import {
  PlatformSosmed,
  PLATFORM_SOSMED_MAP,
  hasSosmedTopic,
  hasSosmedSubTopic,
} from '@/types/galeri-sosmed';
import {
  TopikBerita,
  TOPIK_BERITA_MAP,
  TOPIK_BERITA_ORDER,
} from '@/types/berita';
import { sanitizeHttpUrl } from '@/lib/security/urlSanitizer';
import ModalLightboxSosmed from './ModalLightboxSosmed';
import MasonrySosmedBoard from './MasonrySosmedBoard';
import SubKategoriFilterBar from '@/components/modules/media/SubKategoriFilterBar';

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
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeFilterCount =
    (selectedPlatform !== 'all' ? 1 : 0) +
    (selectedTopic !== 'all' ? 1 : 0) +
    (selectedSubTopic !== 'all' ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setSelectedPlatform('all');
    setSelectedTopic('all');
    setSelectedSubTopic('all');
    setSearchQuery('');
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Hanya tampilkan karya yang berstatus published untuk publik
  const publishedItems = useMemo(() => {
    return items.filter((it) => it.status === 'published');
  }, [items]);

  // Daftar karya terfilter
  const filteredItems = useMemo(() => {
    return publishedItems.filter((item) => {
      if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) return false;
      if (selectedTopic !== 'all' && !hasSosmedTopic(item, selectedTopic)) return false;
      if (selectedSubTopic !== 'all' && !hasSosmedSubTopic(item, selectedSubTopic)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCaption = item.caption.toLowerCase().includes(q);
        const matchCreator = item.creator_name.toLowerCase().includes(q);
        return matchTitle || matchCaption || matchCreator;
      }
      return true;
    });
  }, [publishedItems, selectedPlatform, selectedTopic, selectedSubTopic, searchQuery]);

  // Di Beranda tampilkan 8 karya terbaru ala Masonry; di halaman penuh tampilkan semua
  const displayedGridItems = useMemo(() => {
    if (compactMode) {
      return filteredItems.slice(0, 8);
    }
    return filteredItems;
  }, [filteredItems, compactMode]);

  const activeLightboxIndex = useMemo(() => {
    if (!activeLightboxItem) return -1;
    return filteredItems.findIndex((it) => it.id === activeLightboxItem.id);
  }, [activeLightboxItem, filteredItems]);

  const handleLightboxPrev = () => {
    if (activeLightboxIndex > 0) {
      openLightbox(filteredItems[activeLightboxIndex - 1]);
    }
  };

  const handleLightboxNext = () => {
    if (activeLightboxIndex >= 0 && activeLightboxIndex < filteredItems.length - 1) {
      openLightbox(filteredItems[activeLightboxIndex + 1]);
    }
  };

  const topBarContainerClass = compactMode
    ? 'bg-white dark:bg-slate-950 py-2 border-b border-slate-100 dark:border-slate-800/80'
    : 'sticky top-[68px] z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md py-3 -mx-2 px-2 border-b border-slate-100 dark:border-slate-800/80';

  const sideFilterStickyClass = compactMode
    ? 'lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto'
    : 'lg:sticky lg:top-[146px] lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto';

  return (
    <div className="space-y-5">
      {/* Bar Atas: Search Pill & Profil Kanal Kreator */}
      <div className={topBarContainerClass}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search Pill Bar Dominan */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari karya Media Madin, kajian kitab, atau kreator..."
              aria-label="Cari karya galeri sosmed"
              className="w-full min-h-[44px] pl-11 pr-10 py-2.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Bersihkan kata kunci pencarian"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Strip Profil Kanal Kreator Ringkas */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>{channelConfig.creatorTitle}</span>
            </span>

            <div className="flex items-center gap-1.5">
              <a
                href={sanitizeHttpUrl(channelConfig.youtubeUrl) || 'https://www.youtube.com'}
                target="_blank"
                rel="noopener noreferrer"
                title={`YouTube ${channelConfig.youtubeHandle}`}
                className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold transition"
              >
                <span>YT</span>
                <ExternalLink className="w-3 h-3 opacity-85" />
              </a>
              <a
                href={sanitizeHttpUrl(channelConfig.instagramUrl) || 'https://www.instagram.com'}
                target="_blank"
                rel="noopener noreferrer"
                title={`Instagram ${channelConfig.instagramHandle}`}
                className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 hover:opacity-90 text-white text-[11px] font-bold transition"
              >
                <span>IG</span>
                <ExternalLink className="w-3 h-3 opacity-85" />
              </a>
              <a
                href={sanitizeHttpUrl(channelConfig.tiktokUrl) || 'https://www.tiktok.com'}
                target="_blank"
                rel="noopener noreferrer"
                title={`TikTok ${channelConfig.tiktokHandle}`}
                className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition"
              >
                <span>TT</span>
                <ExternalLink className="w-3 h-3 opacity-85" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Tombol Accordion Filter khusus Mobile (< 1024px) */}
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <button
          type="button"
          data-testid="btn-toggle-mobile-sidefilter"
          onClick={() => setIsMobileFilterOpen((prev) => !prev)}
          aria-expanded={isMobileFilterOpen}
          className={`flex-1 min-h-[42px] px-4 py-2 rounded-xl border text-xs font-bold inline-flex items-center justify-between gap-2 transition cursor-pointer ${
            isMobileFilterOpen || activeFilterCount > 0
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Filter Platform &amp; Topik</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-700 text-white">
                {activeFilterCount} aktif
              </span>
            )}
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isMobileFilterOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Layout 2 Kolom: SideFilter Kiri & Board Masonry Kanan */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        {/* Panel Kiri: SideFilter Vertikal (Permanen di Desktop lg+, Lipat di Mobile) */}
        <aside
          data-testid="galeri-sidefilter"
          aria-label="Filter Galeri Sosmed"
          className={`${
            isMobileFilterOpen ? 'block' : 'hidden lg:block'
          } ${sideFilterStickyClass} rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/75 p-4 space-y-5 shadow-2xs`}
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100 m-0">
                Filter Galeri
              </h3>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Kelompok 1: Filter Platform */}
          <div className="space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Platform
            </span>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => setSelectedPlatform('all')}
                className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                  selectedPlatform === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs'
                    : 'bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Semua Platform ({publishedItems.length})</span>
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
                    className={`w-full min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? `${pMeta.badgeBg} ${pMeta.badgeText} shadow-xs`
                        : 'bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{pMeta.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected ? 'bg-black/15' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kelompok 2: Filter Topik / Kategori */}
          <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Topik &amp; Jenjang
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-label="Semua Topik"
                onClick={() => {
                  setSelectedTopic('all');
                  setSelectedSubTopic('all');
                }}
                className={`min-h-[34px] px-3 py-1.5 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                  selectedTopic === 'all'
                    ? 'bg-[#0b5751] text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Semua Topik</span>
              </button>

              {TOPIK_BERITA_ORDER.map((tKey) => {
                const meta = TOPIK_BERITA_MAP[tKey];
                const isSelected = selectedTopic === tKey;
                const topicCount = publishedItems.filter((it) => hasSosmedTopic(it, tKey)).length;
                return (
                  <button
                    key={tKey}
                    type="button"
                    aria-label={meta.shortTitle}
                    onClick={() => {
                      setSelectedTopic(tKey);
                      setSelectedSubTopic('all');
                    }}
                    className={`min-h-[34px] px-3 py-1.5 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? `${meta.badgeBg} ${meta.badgeText} ring-2 ring-emerald-600/40 shadow-2xs`
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{meta.shortTitle}</span>
                    <span
                      aria-hidden="true"
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-black/15' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {topicCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kelompok 3: Sub-Kategori Dinamis (Saat topik induk Kegiatan/Event/Acara aktif) */}
          <SubKategoriFilterBar
            activeTopic={selectedTopic}
            selectedSubTopic={selectedSubTopic}
            onSelectSubTopic={setSelectedSubTopic}
            getCount={(subId) => publishedItems.filter((it) => hasSosmedSubTopic(it, subId)).length}
            variant="pill"
            layout="vertical"
          />
        </aside>

        {/* Area Konten Kanan: Masonry Grid / State */}
        <div data-testid="galeri-masonry-area" className="min-w-0 space-y-4">
          {hasActiveFilters && !isLoading && !error && (
            <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <span>
                Menampilkan <strong className="text-slate-900 dark:text-white">{filteredItems.length}</strong> dari {publishedItems.length} karya
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Tampilkan Semua
              </button>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className={`rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse ${
                    n % 2 === 0 ? 'h-80' : 'h-56'
                  }`}
                />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="p-12 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-center space-y-3">
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
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Muat Ulang Galeri
              </button>
            </div>
          )}

          {!isLoading && !error && displayedGridItems.length === 0 && (
            <div className="p-12 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
                <Film className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
                Tidak Ada Karya yang Sesuai Filter
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Belum ada konten pada kombinasi filter platform, kategori, atau kata kunci yang dipilih.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Tampilkan Semua Karya
              </button>
            </div>
          )}

          {!isLoading && !error && displayedGridItems.length > 0 && (
            <MasonrySosmedBoard items={displayedGridItems} onOpenItem={openLightbox} />
          )}

          {/* Tombol Menuju Halaman Penuh Portofolio jika ditampilkan di Beranda */}
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
        </div>
      </div>

      <ModalLightboxSosmed
        item={activeLightboxItem}
        onClose={closeLightbox}
        onPrev={handleLightboxPrev}
        onNext={handleLightboxNext}
        hasPrev={activeLightboxIndex > 0}
        hasNext={activeLightboxIndex >= 0 && activeLightboxIndex < filteredItems.length - 1}
      />
    </div>
  );
}
