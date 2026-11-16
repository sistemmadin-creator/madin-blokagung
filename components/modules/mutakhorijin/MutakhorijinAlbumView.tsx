'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Compass,
  Expand,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  List,
  Sparkles,
  X,
} from 'lucide-react';
import { useMutakhorijinStore } from '@/stores/useMutakhorijinStore';
import {
  getAlbumSlug,
  MutakhorijinAlbum,
  MutakhorijinPhotoItem,
  MutakhorijinSection,
  sanitizeMutakhorijinPhotoUrl,
  sortAlbumsForDisplay,
} from '@/types/mutakhorijin';

interface MutakhorijinAlbumViewProps {
  albumSlug?: string;
}

interface LightboxState {
  sectionTitle: string;
  photos: Array<{ url: string; caption: string }>;
  index: number;
}

function collectSectionPhotos(
  section: MutakhorijinSection
): Array<{ url: string; caption: string }> {
  const list: Array<{ url: string; caption: string }> = [];
  const mainUrl = sanitizeMutakhorijinPhotoUrl(section.foto_utama_url);
  if (mainUrl) {
    list.push({
      url: mainUrl,
      caption: section.foto_utama_caption || section.judul,
    });
  }
  (section.galeri_foto || []).forEach((item: MutakhorijinPhotoItem) => {
    const clean = sanitizeMutakhorijinPhotoUrl(item.url);
    if (clean) {
      list.push({
        url: clean,
        caption: item.caption || section.judul,
      });
    }
  });
  return list;
}

function PhotoFrame({
  url,
  alt,
  caption,
  aspectClass,
  onClick,
  emptyLabel = 'Foto belum diunggah',
}: {
  url: string;
  alt: string;
  caption?: string;
  aspectClass: string;
  onClick?: () => void;
  emptyLabel?: string;
}) {
  const [broken, setBroken] = useState(false);
  const cleanUrl = sanitizeMutakhorijinPhotoUrl(url);

  if (!cleanUrl || broken) {
    return (
      <div
        className={`${aspectClass} w-full rounded-2xl border border-emerald-800/60 bg-[#0b2622]/90 flex flex-col items-center justify-center p-4 text-center`}
      >
        <ImageIcon className="w-8 h-8 text-emerald-400/70 mb-2" aria-hidden="true" />
        <p className="text-xs font-semibold text-emerald-100/80">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={caption ? `Perbesar foto: ${caption}` : `Perbesar foto: ${alt}`}
      className={`group relative w-full ${aspectClass} rounded-2xl overflow-hidden border border-emerald-700/40 bg-[#0a221e] text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300`}
    >
      <img
        src={cleanUrl}
        alt={alt}
        onError={() => setBroken(true)}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#04100e]/85 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
      <div className="absolute bottom-3 left-3 right-12">
        {caption && (
          <p className="text-xs font-semibold text-slate-100 line-clamp-2 drop-shadow">
            {caption}
          </p>
        )}
      </div>
      <span
        aria-hidden="true"
        className="absolute bottom-3 right-3 w-9 h-9 rounded-xl bg-black/55 border border-white/20 text-[#FFF6D1] flex items-center justify-center group-hover:bg-amber-400 group-hover:text-emerald-950 transition-colors"
      >
        <Expand className="w-4 h-4" />
      </span>
    </button>
  );
}

export default function MutakhorijinAlbumView({ albumSlug }: MutakhorijinAlbumViewProps) {
  const router = useRouter();
  const { albums, sections, isLoading, hasFetched, error, fetchMutakhorijin } =
    useMutakhorijinStore();

  const [reducedMotion, setReducedMotion] = useState(false);
  const [indexDrawerOpen, setIndexDrawerOpen] = useState(false);
  const [activePostcard, setActivePostcard] = useState<MutakhorijinSection | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const savedScrollYRef = useRef<number>(0);

  useEffect(() => {
    fetchMutakhorijin(false);
  }, [fetchMutakhorijin]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.matches) setReducedMotion(true);
    }
  }, []);

  const activeAlbums = useMemo(
    () => sortAlbumsForDisplay(albums.filter((a) => a.is_active !== false)),
    [albums]
  );

  const runningAlbum = useMemo(
    () => activeAlbums.find((a) => a.is_current) || activeAlbums[0] || null,
    [activeAlbums]
  );

  const currentAlbum: MutakhorijinAlbum | null = useMemo(() => {
    if (albumSlug) {
      const norm = albumSlug.trim().toLowerCase();
      return (
        activeAlbums.find(
          (a) => getAlbumSlug(a).toLowerCase() === norm || a.id.toLowerCase() === norm
        ) || null
      );
    }
    return runningAlbum;
  }, [activeAlbums, albumSlug, runningAlbum]);

  const albumSections = useMemo(() => {
    if (!currentAlbum) return [];
    return sections
      .filter((s) => s.album_id === currentAlbum.id && s.is_active !== false)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [sections, currentAlbum]);

  const isSlugNotFound = Boolean(albumSlug && hasFetched && !isLoading && !currentAlbum);

  useEffect(() => {
    if (!lightbox && !activePostcard && !indexDrawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) {
          setLightbox(null);
          return;
        }
        if (activePostcard) {
          closePostcardModal();
          return;
        }
        if (indexDrawerOpen) {
          setIndexDrawerOpen(false);
        }
      } else if (lightbox && lightbox.photos.length > 1) {
        if (e.key === 'ArrowRight') {
          setLightbox((prev) =>
            prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null
          );
        } else if (e.key === 'ArrowLeft') {
          setLightbox((prev) =>
            prev
              ? {
                  ...prev,
                  index: (prev.index - 1 + prev.photos.length) % prev.photos.length,
                }
              : null
          );
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [lightbox, activePostcard, indexDrawerOpen]);

  const openPostcardModal = (sec: MutakhorijinSection) => {
    savedScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
    setActivePostcard(sec);
  };

  const closePostcardModal = () => {
    setActivePostcard(null);
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollYRef.current, behavior: 'auto' });
      });
    }
  };

  const openSectionLightbox = (section: MutakhorijinSection, targetUrl?: string) => {
    const photos = collectSectionPhotos(section);
    if (photos.length === 0) return;
    const targetIdx = targetUrl ? photos.findIndex((p) => p.url === targetUrl) : 0;
    setLightbox({
      sectionTitle: section.judul,
      photos,
      index: targetIdx >= 0 ? targetIdx : 0,
    });
  };

  const scrollToSection = (sectionId: string) => {
    setIndexDrawerOpen(false);
    const el = document.getElementById(`mut-sec-${sectionId}`);
    if (el) {
      el.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  if (isSlugNotFound) {
    return (
      <section className="min-h-[70vh] bg-[#061816] text-slate-100 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full rounded-3xl border border-emerald-800/60 bg-[#0b2420] p-8 text-center space-y-4">
          <GraduationCap className="w-10 h-10 text-amber-300 mx-auto" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold font-[family-name:var(--font-mutakhorijin-display)] uppercase tracking-wide text-[#FFF6D1]">
            Album Angkatan Tidak Ditemukan
          </h1>
          <p className="text-sm text-slate-300">
            Data album kenangan mutakhorijin untuk tautan tersebut belum tersedia atau sedang disembunyikan.
          </p>
          {runningAlbum && (
            <Link
              href={`/mutakhorijin/${getAlbumSlug(runningAlbum)}`}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-extrabold transition"
            >
              <span>Buka {runningAlbum.nama_angkatan} ({runningAlbum.caption_angkatan})</span>
            </Link>
          )}
        </div>
      </section>
    );
  }

  const heroImageUrl = sanitizeMutakhorijinPhotoUrl(currentAlbum?.hero_image_url);

  return (
    <div
      className={`min-h-screen bg-[#061816] text-slate-100 selection:bg-amber-300 selection:text-emerald-950 ${
        reducedMotion ? 'motion-reduce' : ''
      }`}
    >
      {/* Sticky Sub-Bar Navigasi Album */}
      <div className="sticky top-[73px] z-30 border-b border-emerald-900/70 bg-[#051412]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-emerald-950 text-xs font-extrabold tracking-wide shrink-0">
              <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{currentAlbum?.nama_angkatan || 'Tsuroya'}</span>
            </span>
            {currentAlbum?.caption_angkatan && (
              <span className="text-xs font-semibold text-amber-200 truncate">
                {currentAlbum.caption_angkatan}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {activeAlbums.length > 1 && (
              <select
                aria-label="Pilih Angkatan Mutakhorijin"
                value={currentAlbum?.id || ''}
                onChange={(e) => {
                  const chosen = activeAlbums.find((a) => a.id === e.target.value);
                  if (chosen) router.push(`/mutakhorijin/${getAlbumSlug(chosen)}`);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-full border border-emerald-700/70 bg-[#0b2622] text-xs font-bold text-[#FFF6D1] focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {activeAlbums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama_angkatan} ({a.caption_angkatan || a.tahun_angkatan})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setReducedMotion((prev) => !prev)}
              aria-pressed={reducedMotion}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-700/70 bg-[#0b2622] hover:bg-emerald-900/70 text-xs font-bold text-slate-200 transition cursor-pointer"
              title="Ubah intensitas animasi & transisi halaman"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Gerak: {reducedMotion ? 'Minimal' : 'Normal'}</span>
            </button>

            {albumSections.length > 0 && (
              <button
                type="button"
                onClick={() => setIndexDrawerOpen(true)}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF6D1] hover:bg-amber-200 text-emerald-950 text-xs font-extrabold transition cursor-pointer"
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Indeks Bab ({albumSections.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Pembuka Album (Editorial Showcase) */}
      <header className="relative overflow-hidden border-b border-emerald-900/60">
        {heroImageUrl ? (
          <img
            src={heroImageUrl}
            alt={`Sampul ${currentAlbum?.nama_angkatan || 'Mutakhorijin'}`}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_48%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.22),_transparent_52%)]"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#061816]/75 via-[#061816]/65 to-[#061816]"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-28">
          <div className="max-w-4xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-300/40 bg-emerald-950/70 text-amber-300 text-xs font-extrabold uppercase tracking-widest">
              <span>Mutakhorijin</span>
              <span aria-hidden="true">•</span>
              <span>{currentAlbum?.caption_angkatan || 'Angkatan 2026'}</span>
            </div>

            <h1 className="font-[family-name:var(--font-mutakhorijin-display)] text-6xl sm:text-8xl lg:text-[7.5rem] font-extrabold uppercase tracking-tight leading-[0.88] text-[#FFF6D1]">
              {currentAlbum?.hero_title || currentAlbum?.nama_angkatan || 'TSUROYA'}
            </h1>

            {currentAlbum?.hero_quote && (
              <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-amber-300 leading-snug max-w-3xl">
                &ldquo;{currentAlbum.hero_quote}&rdquo;
              </p>
            )}

            {currentAlbum?.hero_subtitle && (
              <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
                {currentAlbum.hero_subtitle}
              </p>
            )}

            {albumSections.length > 0 && (
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => scrollToSection(albumSections[0].id)}
                  className="min-h-[48px] inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-amber-400 hover:bg-amber-300 text-emerald-950 text-sm font-extrabold transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span>Telusuri Album Kenangan</span>
                  <ArrowDown className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Error / Loading / Empty State */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-20 sm:space-y-28">
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-500/40 bg-rose-950/60 px-5 py-4 text-sm font-semibold text-rose-100"
          >
            {error}
          </div>
        )}

        {isLoading && albumSections.length === 0 ? (
          <div className="space-y-8" aria-label="Memuat album kenangan">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-72 rounded-3xl bg-emerald-950/70 border border-emerald-900/50 animate-pulse"
              />
            ))}
          </div>
        ) : albumSections.length === 0 ? (
          <div className="rounded-3xl border border-emerald-800/60 bg-[#0b2420] p-12 text-center space-y-3">
            <Layers className="w-10 h-10 text-amber-300 mx-auto" aria-hidden="true" />
            <h2 className="text-2xl font-extrabold font-[family-name:var(--font-mutakhorijin-display)] uppercase text-[#FFF6D1]">
              Album Kenangan Masih Disiapkan
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Belum ada bab cerita atau kartu pos momen yang dipublikasikan untuk angkatan ini.
            </p>
          </div>
        ) : (
          albumSections.map((sec, idx) => {
            if (sec.section_type === 'postcard') {
              const allPhotos = collectSectionPhotos(sec);
              const coverUrl =
                sanitizeMutakhorijinPhotoUrl(sec.foto_utama_url) || allPhotos[0]?.url || '';

              return (
                <section
                  key={sec.id}
                  id={`mut-sec-${sec.id}`}
                  aria-labelledby={`mut-title-${sec.id}`}
                  className="scroll-mt-32 py-4"
                >
                  <div className="max-w-5xl mx-auto rounded-3xl border border-emerald-800/60 bg-[#09211d] p-5 sm:p-8 lg:p-10 shadow-2xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                      {/* Bingkai Kartu Pos Vintage */}
                      <div className="lg:col-span-7">
                        <button
                          type="button"
                          onClick={() => openPostcardModal(sec)}
                          className={`group w-full text-left rounded-2xl bg-[#FAF6EE] p-3 sm:p-4 shadow-2xl border border-amber-200/80 transition-transform duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 ${
                            reducedMotion ? '' : 'lg:-rotate-1 lg:hover:rotate-0'
                          }`}
                        >
                          <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#0a221e]">
                            {coverUrl ? (
                              <img
                                src={coverUrl}
                                alt={sec.judul}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-emerald-100/80 p-6 text-center">
                                <ImageIcon className="w-10 h-10 text-amber-300 mb-2" aria-hidden="true" />
                                <span className="text-xs font-semibold">
                                  Foto sampul kartu pos belum diunggah
                                </span>
                              </div>
                            )}
                            <div
                              aria-hidden="true"
                              className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20"
                            />
                            {/* Stempel Angkatan di pojok kanan atas kartu pos */}
                            <div className="absolute top-3 right-3 px-3 py-1 rounded-full border-2 border-dashed border-amber-300/90 bg-emerald-950/85 text-[#FFF6D1] text-[10px] font-extrabold uppercase tracking-widest">
                              {currentAlbum?.caption_angkatan || 'Angkatan 2026'}
                            </div>
                            <div className="absolute bottom-3 left-4 right-4">
                              <span className="font-[family-name:var(--font-mutakhorijin-script)] italic text-2xl sm:text-3xl font-bold text-[#FFF6D1] drop-shadow">
                                {sec.judul}
                              </span>
                            </div>
                          </div>

                          <div className="pt-3 px-1 flex items-center justify-between gap-2 text-slate-800">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                              {sec.subjudul_label || 'KARTU POS KENANGAN'}
                            </span>
                            <span className="text-xs font-bold text-slate-700">
                              {allPhotos.length} Foto
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Narasi & Tombol Buka Galeri Penuh */}
                      <div className="lg:col-span-5 space-y-4">
                        {sec.subjudul_label && (
                          <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-amber-300">
                            {sec.subjudul_label}
                          </span>
                        )}
                        <h2
                          id={`mut-title-${sec.id}`}
                          className="font-[family-name:var(--font-mutakhorijin-display)] text-4xl sm:text-5xl font-extrabold uppercase tracking-tight leading-[0.95] text-[#FFF6D1]"
                        >
                          {sec.judul}
                        </h2>
                        {sec.quote && (
                          <p className="text-base sm:text-lg font-bold text-amber-300 leading-snug">
                            &ldquo;{sec.quote}&rdquo;
                          </p>
                        )}
                        {sec.narasi && (
                          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                            {sec.narasi}
                          </p>
                        )}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => openPostcardModal(sec)}
                            className="min-h-[46px] inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs sm:text-sm font-extrabold transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                          >
                            <Compass className="w-4 h-4" aria-hidden="true" />
                            <span>Buka Galeri Momen ({allPhotos.length} Foto)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            // Tipe 'dossier': Split editorial asimetris kiri-kanan bergantian
            const alignRight =
              sec.layout_align === 'right' ||
              (sec.layout_align === 'auto' && idx % 2 === 1);
            const stillPhotos = (sec.galeri_foto || []).slice(0, 4);
            const mainPhotoUrl = sanitizeMutakhorijinPhotoUrl(sec.foto_utama_url);

            return (
              <section
                key={sec.id}
                id={`mut-sec-${sec.id}`}
                aria-labelledby={`mut-title-${sec.id}`}
                className="scroll-mt-32"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                  {/* Blok Visual (Pada mobile selalu tampil dulu dengan overlay judul, pada desktop bergantian kiri/kanan) */}
                  <div
                    className={`lg:col-span-7 space-y-4 ${
                      alignRight ? 'lg:order-1' : 'lg:order-2'
                    }`}
                  >
                    {/* Foto Utama Dossier */}
                    <div className="relative">
                      <PhotoFrame
                        url={mainPhotoUrl}
                        alt={sec.foto_utama_caption || sec.judul}
                        caption={sec.foto_utama_caption}
                        aspectClass="aspect-[4/5] sm:aspect-[16/11]"
                        emptyLabel="Foto utama bab belum diunggah di Kelola Mutakhorijin"
                        onClick={
                          mainPhotoUrl ? () => openSectionLightbox(sec, mainPhotoUrl) : undefined
                        }
                      />

                      {/* Overlay Judul ala Mobile Viewport pada referensi (hanya tampil < lg) */}
                      <div className="lg:hidden pointer-events-none absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-[#061816] via-[#061816]/80 to-transparent rounded-b-2xl">
                        {sec.subjudul_label && (
                          <span className="block text-[11px] font-extrabold uppercase tracking-widest text-amber-300 mb-1">
                            {sec.subjudul_label}
                          </span>
                        )}
                        <h2 className="font-[family-name:var(--font-mutakhorijin-display)] text-5xl font-extrabold uppercase tracking-tight leading-[0.9] text-[#FFF6D1]">
                          {sec.judul}
                        </h2>
                      </div>
                    </div>

                    {/* Grid 1-4 Foto Pendukung */}
                    {stillPhotos.length > 0 && (
                      <div
                        className={`grid gap-3 sm:gap-4 ${
                          stillPhotos.length === 1
                            ? 'grid-cols-1'
                            : stillPhotos.length === 3
                            ? 'grid-cols-1 sm:grid-cols-3'
                            : 'grid-cols-2'
                        }`}
                      >
                        {stillPhotos.map((foto, fIdx) => (
                          <PhotoFrame
                            key={foto.id || fIdx}
                            url={foto.url}
                            alt={foto.caption || `${sec.judul} foto ${fIdx + 1}`}
                            caption={foto.caption}
                            aspectClass="aspect-[4/3]"
                            onClick={() => openSectionLightbox(sec, foto.url)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Blok Teks Editorial */}
                  <div
                    className={`lg:col-span-5 space-y-5 lg:sticky lg:top-36 ${
                      alignRight ? 'lg:order-2' : 'lg:order-1'
                    }`}
                  >
                    <div className="hidden lg:block space-y-2">
                      {sec.subjudul_label && (
                        <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-amber-300">
                          {sec.subjudul_label}
                        </span>
                      )}
                      <h2
                        id={`mut-title-${sec.id}`}
                        className="font-[family-name:var(--font-mutakhorijin-display)] text-6xl xl:text-7xl font-extrabold uppercase tracking-tight leading-[0.9] text-[#FFF6D1]"
                      >
                        {sec.judul}
                      </h2>
                    </div>

                    {sec.quote && (
                      <blockquote className="text-xl sm:text-2xl font-bold text-amber-300 leading-snug">
                        &ldquo;{sec.quote}&rdquo;
                      </blockquote>
                    )}

                    {sec.narasi && (
                      <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-[60ch]">
                        {sec.narasi}
                      </p>
                    )}

                    {collectSectionPhotos(sec).length > 0 && (
                      <button
                        type="button"
                        onClick={() => openSectionLightbox(sec)}
                        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-700/80 bg-[#0b2622] hover:bg-emerald-900/70 text-xs font-bold text-[#FFF6D1] transition cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300"
                      >
                        <Expand className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                        <span>
                          Lihat Galeri Bab ({collectSectionPhotos(sec).length} Foto)
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </section>
            );
          })
        )}

        {/* Penutup Album Kenangan */}
        {currentAlbum && (
          <footer className="rounded-3xl border border-emerald-800/60 bg-[#09211d] px-6 py-10 sm:py-12 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-300 text-xs font-bold">
              <span>{currentAlbum.nama_angkatan}</span>
              <span aria-hidden="true">•</span>
              <span>{currentAlbum.caption_angkatan}</span>
            </div>
            <p className="font-[family-name:var(--font-mutakhorijin-display)] text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#FFF6D1] max-w-3xl mx-auto">
              {currentAlbum.footer_note ||
                `${currentAlbum.nama_angkatan} ${currentAlbum.caption_angkatan}`}
            </p>
          </footer>
        )}
      </main>

      {/* Drawer Indeks Bab & Sorotan */}
      {indexDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Indeks Bab Album Kenangan"
          onClick={() => setIndexDrawerOpen(false)}
          className="fixed inset-0 z-50 flex justify-end bg-black/75"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-full bg-[#071c19] border-l border-emerald-800/70 p-6 flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-emerald-900">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300">
                    Indeks Momen
                  </p>
                  <h2 className="font-[family-name:var(--font-mutakhorijin-display)] text-2xl font-extrabold uppercase text-[#FFF6D1]">
                    {currentAlbum?.nama_angkatan}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIndexDrawerOpen(false)}
                  aria-label="Tutup indeks"
                  className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl bg-emerald-950 text-white hover:bg-emerald-900 cursor-pointer"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-2">
                {albumSections.map((sec, idx) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className="w-full min-h-[52px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#0c2924] hover:bg-emerald-900/70 border border-emerald-800/50 text-left transition cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                        {sec.section_type === 'postcard' ? 'Kartu Pos' : `Bab ${idx + 1}`}
                        {sec.subjudul_label ? ` • ${sec.subjudul_label}` : ''}
                      </span>
                      <span className="block text-sm font-bold text-[#FFF6D1] truncate">
                        {sec.judul}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>

            <p className="pt-6 text-xs text-slate-400">
              Pilih bab atau kartu pos untuk langsung menuju bagian tersebut.
            </p>
          </div>
        </div>
      )}

      {/* Fullscreen Takeover Modal untuk Kartu Pos Momen */}
      {activePostcard && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="postcard-modal-title"
          className="fixed inset-0 z-50 bg-[#061816] text-slate-100 overflow-y-auto"
        >
          <div className="sticky top-0 z-20 border-b border-emerald-900/80 bg-[#051412]/95 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={closePostcardModal}
                className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs sm:text-sm font-extrabold transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Kembali ke Album</span>
              </button>

              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 truncate">
                {activePostcard.subjudul_label || 'Galeri Kartu Pos'}
              </span>
            </div>
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
            <div className="max-w-3xl space-y-4">
              <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-amber-300">
                {currentAlbum?.nama_angkatan} • {currentAlbum?.caption_angkatan}
              </span>
              <h2
                id="postcard-modal-title"
                className="font-[family-name:var(--font-mutakhorijin-display)] text-5xl sm:text-7xl font-extrabold uppercase tracking-tight leading-[0.9] text-[#FFF6D1]"
              >
                {activePostcard.judul}
              </h2>
              {activePostcard.quote && (
                <p className="text-lg sm:text-2xl font-bold text-amber-300 leading-snug">
                  &ldquo;{activePostcard.quote}&rdquo;
                </p>
              )}
              {activePostcard.narasi && (
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  {activePostcard.narasi}
                </p>
              )}
            </div>

            {(() => {
              const allPhotos = collectSectionPhotos(activePostcard);
              if (allPhotos.length === 0) {
                return (
                  <div className="rounded-2xl border border-emerald-800/60 bg-[#0b2420] p-10 text-center text-sm text-slate-300">
                    Belum ada foto galeri yang diunggah untuk kartu pos ini.
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allPhotos.map((foto, pIdx) => (
                    <PhotoFrame
                      key={`${foto.url}-${pIdx}`}
                      url={foto.url}
                      alt={foto.caption || `${activePostcard.judul} ${pIdx + 1}`}
                      caption={foto.caption}
                      aspectClass="aspect-[4/3]"
                      onClick={() =>
                        setLightbox({
                          sectionTitle: activePostcard.judul,
                          photos: allPhotos,
                          index: pIdx,
                        })
                      }
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Lightbox Foto Layar Penuh */}
      {lightbox && lightbox.photos[lightbox.index] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Lightbox foto ${lightbox.sectionTitle}`}
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[60] bg-[#030b0a]/95 flex flex-col justify-between p-4 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-between gap-3 max-w-6xl w-full mx-auto"
          >
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300 truncate">
                {lightbox.sectionTitle}
              </p>
              <p className="text-xs text-slate-300">
                Foto {lightbox.index + 1} dari {lightbox.photos.length}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Tutup Lightbox"
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
            >
              <span>Tutup (Esc)</span>
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center max-w-6xl w-full mx-auto my-4 min-h-0"
          >
            <img
              src={lightbox.photos[lightbox.index].url}
              alt={lightbox.photos[lightbox.index].caption || lightbox.sectionTitle}
              className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl border border-emerald-800/60"
            />
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pt-2"
          >
            <p className="text-xs sm:text-sm font-medium text-slate-200 text-center sm:text-left">
              {lightbox.photos[lightbox.index].caption}
            </p>
            {lightbox.photos.length > 1 && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setLightbox((prev) =>
                      prev
                        ? {
                            ...prev,
                            index:
                              (prev.index - 1 + prev.photos.length) % prev.photos.length,
                          }
                        : null
                    )
                  }
                  className="min-h-[44px] inline-flex items-center gap-1 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Sebelumnya</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightbox((prev) =>
                      prev ? { ...prev, index: (prev.index + 1) % prev.photos.length } : null
                    )
                  }
                  className="min-h-[44px] inline-flex items-center gap-1 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-emerald-950 text-xs font-extrabold cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
