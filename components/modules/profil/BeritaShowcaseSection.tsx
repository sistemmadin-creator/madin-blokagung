'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Newspaper, ChevronRight, ChevronLeft, Clock, Film } from 'lucide-react';
import { useBeritaStore } from '@/stores/useBeritaStore';
import { formatBeritaDateWib } from '@/lib/utils/beritaDateHelper';
import {
  TopikBerita,
  TOPIK_BERITA_MAP,
  TOPIK_BERITA_ORDER,
  getPostTopics,
  hasPostTopic,
  hasPostSubTopic,
} from '@/types/berita';
import BeritaCardHero from './BeritaCardHero';
import BeritaCardGrid from './BeritaCardGrid';
import BeritaWidgetKategori from './BeritaWidgetKategori';
import GaleriSosmedPortfolioView from '@/components/modules/galeri-sosmed/GaleriSosmedPortfolioView';
import SubKategoriFilterBar from '@/components/modules/media/SubKategoriFilterBar';

gsap.registerPlugin(ScrollTrigger);

export default function BeritaShowcaseSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasAnimatedRef = useRef(false);
  const { posts, fetchPosts, isLoading } = useBeritaStore();
  const [activeMediaView, setActiveMediaView] = useState<'berita' | 'galeri-sosmed'>('berita');
  const [selectedTopic, setSelectedTopic] = useState<TopikBerita | 'all'>('all');
  const [selectedSubTopic, setSelectedSubTopic] = useState<string | 'all'>('all');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Hanya tampilkan berita yang berstatus published
  const publishedPosts = useMemo(() => {
    return posts.filter((p) => p.status === 'published');
  }, [posts]);

  // Filter berdasarkan topik & sub-kategori yang dipilih
  const filteredPosts = useMemo(() => {
    return publishedPosts.filter((p) => {
      if (selectedTopic !== 'all' && !hasPostTopic(p, selectedTopic)) return false;
      if (selectedSubTopic !== 'all' && !hasPostSubTopic(p, selectedSubTopic)) return false;
      return true;
    });
  }, [publishedPosts, selectedTopic, selectedSubTopic]);

  // Urutkan kronologis terbaru (Waterfall Recency)
  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
  }, [filteredPosts]);

  // 1. Hero Lead Slider: 5 Berita Terbaru (Kiri 60%)
  const heroPosts = useMemo(() => {
    return sortedPosts.slice(0, 5);
  }, [sortedPosts]);

  // 2. Sorotan Grid 2x2: 4 Berita berikutnya yang tertumpuk (Urutan ke-6 s/d ke-9, Kanan 40%)
  const highlightPosts = useMemo(() => {
    return sortedPosts.slice(heroPosts.length, heroPosts.length + 4);
  }, [sortedPosts, heroPosts]);

  // 3. Post Terbaru: Berita tertumpuk urutan ke-10 dan seterusnya (Baris bawah)
  const latestPosts = useMemo(() => {
    return sortedPosts.slice(heroPosts.length + highlightPosts.length);
  }, [sortedPosts, heroPosts, highlightPosts]);

  // Hitung jumlah warta per topik untuk widget kategori (Mendukung Multi-Kategori)
  const postCounts = useMemo(() => {
    const counts: Record<TopikBerita, number> = {
      umum: 0,
      kelas_unggulan: 0,
      tingkat_ula: 0,
      tingkat_wustho: 0,
      tingkat_ulya: 0,
      kegiatan: 0,
      event: 0,
      acara: 0,
    };
    publishedPosts.forEach((p) => {
      const pTopics = getPostTopics(p);
      pTopics.forEach((tKey) => {
        if (counts[tKey] !== undefined) {
          counts[tKey] += 1;
        }
      });
    });
    return counts;
  }, [publishedPosts]);

  // Auto-slide 5 Berita Hero setiap 2 Detik (geser ke kiri)
  useEffect(() => {
    if (activeMediaView !== 'berita' || heroPosts.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroPosts.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [activeMediaView, heroPosts.length, isPaused]);

  // Reset slide saat topik berubah
  useEffect(() => {
    setCurrentSlide(0);
  }, [selectedTopic]);

  useEffect(() => {
    if (typeof window === 'undefined' || hasAnimatedRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = sectionRef.current;
    if (!section) return;

    const blocks = section.querySelectorAll('.js-berita-reveal');
    if (blocks.length === 0) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          if (hasAnimatedRef.current) return;
          hasAnimatedRef.current = true;
          gsap.fromTo(
            blocks,
            { y: 20, opacity: 0.2 },
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              stagger: 0.08,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            }
          );
        },
      });
    }, section);

    return () => ctx.revert();
  }, [publishedPosts.length, isLoading]);

  if (publishedPosts.length === 0 && !isLoading) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="berita"
      className="py-16 sm:py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header Bagian Media Madin & Kabar Madin Blokagung */}
        <div className="js-berita-reveal flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40">
                <Newspaper className="w-3.5 h-3.5" />
                <span>Media Madin Blokagung</span>
              </span>

              {/* Mode Switcher: Kabar Berita vs Galeri Sosmed */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveMediaView('berita')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeMediaView === 'berita'
                      ? 'bg-[#0b5751] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Newspaper className="w-3.5 h-3.5" />
                  <span>Kabar Berita</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMediaView('galeri-sosmed')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeMediaView === 'galeri-sosmed'
                      ? 'bg-[#0b5751] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Galeri Sosmed</span>
                </button>
              </div>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
              Kabar Madin Blokagung
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Dokumentasi kegiatan tafaqquh fiddin, bahtsul masail kubro, dan penguatan tradisi salafiyah pada jenjang pendidikan Madin Al-Amiriyyah Ponpes Darussalam Blokagung.
            </p>
          </div>

          {/* Filter Tab Topik & Sub-Kategori di Header (Tampil saat mode Kabar Berita aktif) */}
          {activeMediaView === 'berita' && (
            <div className="flex flex-col items-start lg:items-end gap-2 max-w-full">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTopic('all');
                    setSelectedSubTopic('all');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    selectedTopic === 'all'
                      ? 'bg-[#0b5751] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Semua Topik
                </button>
                {TOPIK_BERITA_ORDER.map((key) => {
                  const meta = TOPIK_BERITA_MAP[key];
                  const isSelected = selectedTopic === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedTopic(key);
                        setSelectedSubTopic('all');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? `${meta.badgeBg} ${meta.badgeText} shadow-xs ring-2 ring-emerald-600/40`
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {meta.shortTitle}
                    </button>
                  );
                })}
              </div>

              <SubKategoriFilterBar
                activeTopic={selectedTopic}
                selectedSubTopic={selectedSubTopic}
                onSelectSubTopic={setSelectedSubTopic}
                getCount={(subId) => publishedPosts.filter((p) => hasPostSubTopic(p, subId)).length}
              />
            </div>
          )}
        </div>

        {/* TAMPILAN 1: KABAR BERITA EDITORIAL */}
        {activeMediaView === 'berita' ? (
          <>
            {/* 1. Baris Hero Editorial: Hero Slider (60%) & Sorotan Grid 2x2 (40%) */}
            <div className="js-berita-reveal grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Kolom Kiri: Hero Slider 5 Berita Terbaru (Slide Kiri per 2 Detik) */}
              <div className="lg:col-span-7 flex">
                {heroPosts.length > 0 ? (
                  <div
                    className="relative w-full rounded-3xl overflow-hidden min-h-[380px] sm:min-h-[440px] lg:min-h-[480px] group shadow-lg flex"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                  >
                    {/* Track Horizontal Slider */}
                    <div
                      className="flex w-full h-full transition-transform duration-500 ease-in-out"
                      style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                      {heroPosts.map((post) => (
                        <div key={post.id} className="w-full h-full flex-shrink-0 flex">
                          <BeritaCardHero post={post} />
                        </div>
                      ))}
                    </div>

                    {/* Tombol Navigasi Manual Slider (Kiri / Kanan) */}
                    {heroPosts.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentSlide(
                              (prev) => (prev - 1 + heroPosts.length) % heroPosts.length
                            );
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all border border-white/20 shadow-md focus:opacity-100"
                          aria-label="Berita sebelumnya"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentSlide((prev) => (prev + 1) % heroPosts.length);
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all border border-white/20 shadow-md focus:opacity-100"
                          aria-label="Berita berikutnya"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Indikator Bilah Progress Slide (1 s/d 5) */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/45 backdrop-blur-xs border border-white/10">
                          {heroPosts.map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setCurrentSlide(idx)}
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                currentSlide === idx
                                  ? 'w-6 bg-amber-400'
                                  : 'w-2 bg-white/40 hover:bg-white/70'
                              }`}
                              aria-label={`Pindah ke berita ${idx + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : isLoading ? (
                  <div className="w-full h-80 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center p-6">
                    <span className="text-xs font-semibold text-slate-500">
                      Memuat kabar berita Madin Blokagung...
                    </span>
                  </div>
                ) : (
                  <div className="w-full min-h-[320px] rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                      <Newspaper className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white">
                      Belum Ada Kabar pada Topik {selectedTopic !== 'all' ? TOPIK_BERITA_MAP[selectedTopic]?.title : 'Ini'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                      Saat ini belum ada artikel yang diterbitkan khusus pada kategori topik ini. Silakan lihat topik lainnya.
                    </p>
                    {selectedTopic !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedTopic('all')}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Tampilkan Semua Topik
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Kolom Kanan: 4 Kartu Sorotan 2x2 (40% Lebar) */}
              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {highlightPosts.map((post) => (
                  <BeritaCardGrid key={post.id} post={post} />
                ))}
                {highlightPosts.length === 0 && (
                  <div className="sm:col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/60 dark:border-slate-700 flex flex-col items-center justify-center">
                    <p className="text-xs text-slate-500">
                      Seluruh berita pada topik ini saat ini sedang ditampilkan pada slide tajuk utama di sebelah kiri.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Baris Bawah: Post Terbaru & Widget Kategori Pilihan */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              {/* Kolom Kiri (8 Kolom): Post Terbaru */}
              <div className="lg:col-span-8 space-y-4">
                {/* Header Post Terbaru bergaris bawah hijau khas media salaf */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white relative pl-3.5">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-4.5 bg-emerald-700 rounded-full" />
                    Post Terbaru
                  </h3>
                  <Link
                    href="/berita"
                    className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 uppercase tracking-wider"
                  >
                    <span>ALL / LIHAT SEMUA</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* List Artikel Post Terbaru */}
                {latestPosts.length > 0 ? (
                  <div className="space-y-3">
                    {latestPosts.map((post) => {
                      const postTopics = getPostTopics(post);
                      const formattedDate = formatBeritaDateWib(post.published_at, 'short');

                      return (
                        <Link
                          key={post.id}
                          href={`/berita/${post.slug}`}
                          className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"
                        >
                          <div className="w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 relative">
                            <img
                              src={post.cover_image_url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                              {postTopics.map((tKey) => {
                                const topikMeta = TOPIK_BERITA_MAP[tKey] || TOPIK_BERITA_MAP.umum;
                                return (
                                  <span
                                    key={tKey}
                                    className={`px-2 py-0.5 rounded text-[9px] ${topikMeta.badgeBg} ${topikMeta.badgeText}`}
                                  >
                                    {topikMeta.shortTitle}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                              {post.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                              {post.excerpt}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                              <span className="text-slate-600 dark:text-slate-300 font-medium">
                                {post.author_name}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {formattedDate}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                    <p className="text-xs text-slate-500">
                      Semua berita warta saat ini ditampilkan pada baris sorotan utama di atas.
                    </p>
                  </div>
                )}
              </div>

              {/* Kolom Kanan (4 Kolom): Widget Kategori Pilihan */}
              <div className="lg:col-span-4">
                <BeritaWidgetKategori
                  postCounts={postCounts}
                  activeTopic={selectedTopic}
                  onSelectTopic={(t) => setSelectedTopic(t)}
                />
              </div>
            </div>
          </>
        ) : (
          /* TAMPILAN 2: PORTOFOLIO GALERI SOSMED */
          <GaleriSosmedPortfolioView compactMode />
        )}
      </div>
    </section>
  );
}
