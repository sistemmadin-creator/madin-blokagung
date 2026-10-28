'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Newspaper, ChevronRight, Clock } from 'lucide-react';
import { useBeritaStore } from '@/stores/useBeritaStore';
import { TopikBerita, TOPIK_BERITA_MAP } from '@/types/berita';
import BeritaCardHero from './BeritaCardHero';
import BeritaCardGrid from './BeritaCardGrid';
import BeritaWidgetKategori from './BeritaWidgetKategori';

export default function BeritaShowcaseSection() {
  const { posts, fetchPosts, isLoading } = useBeritaStore();
  const [selectedTopic, setSelectedTopic] = useState<TopikBerita | 'all'>('all');

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Hanya tampilkan berita yang berstatus published
  const publishedPosts = useMemo(() => {
    return posts.filter((p) => p.status === 'published');
  }, [posts]);

  // Filter berdasarkan topik yang dipilih jika ada
  const filteredPosts = useMemo(() => {
    if (selectedTopic === 'all') return publishedPosts;
    return publishedPosts.filter((p) => p.topic === selectedTopic);
  }, [publishedPosts, selectedTopic]);

  // Hitung jumlah warta per topik untuk widget kategori
  const postCounts = useMemo(() => {
    const counts: Record<TopikBerita, number> = {
      kelas_unggulan: 0,
      tingkat_ula: 0,
      tingkat_wustho: 0,
      tingkat_ulya: 0,
    };
    publishedPosts.forEach((p) => {
      if (counts[p.topic] !== undefined) {
        counts[p.topic] += 1;
      }
    });
    return counts;
  }, [publishedPosts]);

  // Pemisahan Slot Ala Lirboyo.net:
  // 1. Hero Lead: Kartu utama besar sisi kiri
  const heroPost = useMemo(() => {
    const lead = filteredPosts.find((p) => p.display_type === 'hero_lead');
    return lead || filteredPosts[0];
  }, [filteredPosts]);

  // 2. Highlight Quad: 4 kartu sorotan sisi kanan (2x2)
  const highlightPosts = useMemo(() => {
    const list = filteredPosts.filter((p) => p.id !== heroPost?.id);
    const highlights = list.filter((p) => p.display_type === 'highlight_grid');
    if (highlights.length >= 4) {
      return highlights.slice(0, 4);
    }
    // Jika highlight kurang dari 4, ambil post berikutnya yang tersedia
    return list.slice(0, 4);
  }, [filteredPosts, heroPost]);

  // 3. Post Terbaru: Daftar warta di baris bawah
  const latestPosts = useMemo(() => {
    const excludedIds = new Set([heroPost?.id, ...highlightPosts.map((p) => p.id)]);
    const remainder = filteredPosts.filter((p) => !excludedIds.has(p.id));
    return remainder.slice(0, 3);
  }, [filteredPosts, heroPost, highlightPosts]);

  if (publishedPosts.length === 0 && !isLoading) {
    return null;
  }

  return (
    <section id="berita" className="py-16 sm:py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header Bagian Berita Warta Madina */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40">
                <Newspaper className="w-3.5 h-3.5" />
                <span>Warta & Publikasi Diniyyah</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
              Kabar Madrasah & Khazanah Keilmuan Santri
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              Dokumentasi kegiatan tafaqquh fiddin, bahtsul masail kubro, dan penguatan tradisi salafiyah pada 4 jenjang pendidikan Madin Al-Amiriyyah.
            </p>
          </div>

          {/* Filter Tab 4 Topik di Header */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedTopic('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedTopic === 'all'
                  ? 'bg-[#0b5751] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Semua Topik
            </button>
            {(Object.keys(TOPIK_BERITA_MAP) as TopikBerita[]).map((key) => {
              const meta = TOPIK_BERITA_MAP[key];
              const isSelected = selectedTopic === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTopic(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
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
        </div>

        {/* 1. Baris Hero Editorial Majalah Pesantren Ala Lirboyo.net */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Kolom Kiri: Kartu Hero Lead Besar (60% Lebar) */}
          <div className="lg:col-span-7 flex">
            {heroPost ? (
              <BeritaCardHero post={heroPost} />
            ) : (
              <div className="w-full h-80 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            )}
          </div>

          {/* Kolom Kanan: 4 Kartu Sorotan 2x2 (40% Lebar) */}
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlightPosts.map((post) => (
              <BeritaCardGrid key={post.id} post={post} />
            ))}
          </div>
        </div>

        {/* 2. Baris Bawah: Post Terbaru & Widget Kategori Pilihan (Ala Lirboyo.net) */}
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
                  const topikMeta = TOPIK_BERITA_MAP[post.topic];
                  const formattedDate = new Date(post.published_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <Link
                      key={post.id}
                      href={`/berita/${post.slug}`}
                      className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all"
                    >
                      <div className="w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 relative">
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] ${topikMeta.badgeBg} ${topikMeta.badgeText}`}>
                          {topikMeta.shortTitle}
                        </span>
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
      </div>
    </section>
  );
}
