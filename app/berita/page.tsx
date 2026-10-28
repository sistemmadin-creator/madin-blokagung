'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { 
  Newspaper, 
  Search, 
  X, 
  Clock, 
  ArrowRight, 
  Filter
} from 'lucide-react';
import { NavbarProfil, FooterProfil } from '@/components/modules/profil';
import { useBeritaStore } from '@/stores/useBeritaStore';
import { TopikBerita, TOPIK_BERITA_MAP } from '@/types/berita';

export default function ArsipBeritaPage() {
  const { posts, fetchPosts, isLoading } = useBeritaStore();
  const [selectedTopic, setSelectedTopic] = useState<TopikBerita | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Hanya ambil berita yang published
  const publishedPosts = useMemo(() => {
    return posts.filter((p) => p.status === 'published');
  }, [posts]);

  // Filter warta
  const filteredPosts = useMemo(() => {
    return publishedPosts.filter((post) => {
      if (selectedTopic !== 'all' && post.topic !== selectedTopic) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = post.title.toLowerCase().includes(query);
        const matchExcerpt = post.excerpt.toLowerCase().includes(query);
        const matchAuthor = post.author_name.toLowerCase().includes(query);
        const matchTags = post.tags?.some((t) => t.toLowerCase().includes(query));
        return matchTitle || matchExcerpt || matchAuthor || matchTags;
      }
      return true;
    });
  }, [publishedPosts, selectedTopic, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-300 selection:text-emerald-950">
      <NavbarProfil />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header Portal Arsip Berita */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40">
              <Newspaper className="w-3.5 h-3.5" />
              <span>Portal Warta Resmi Diniyyah</span>
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
              Khazanah Warta Madin Blokagung
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Arsip liputan komprehensif seputar pengajian kitab salaf, syawir kubro, ujian muhafadzoh, dan dinamika keilmuan santri Pondok Pesantren Darussalam Blokagung.
            </p>
          </div>

          {/* Filter Bar & Pencarian */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Input Pencarian */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari artikel berita, topik, atau kata kunci..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Total Info */}
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan <strong>{filteredPosts.length}</strong> warta berita
              </span>
            </div>

            {/* Filter 4 Topik */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 mr-1">
                <Filter className="w-3 h-3 text-emerald-600" />
                Topik:
              </span>

              <button
                type="button"
                onClick={() => setSelectedTopic('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                  selectedTopic === 'all'
                    ? 'bg-[#0b5751] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Semua Topik ({publishedPosts.length})
              </button>

              {(Object.keys(TOPIK_BERITA_MAP) as TopikBerita[]).map((key) => {
                const meta = TOPIK_BERITA_MAP[key];
                const isSelected = selectedTopic === key;
                const count = publishedPosts.filter((p) => p.topic === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTopic(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? `${meta.badgeBg} ${meta.badgeText} shadow-xs ring-2 ring-emerald-600/40`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>{meta.title}</span>
                    <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/10">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Kartu Berita */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => {
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
                    className="group flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
                  >
                    {/* Cover Thumbnail 16:9 */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={post.cover_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider ${topikMeta.badgeBg} ${topikMeta.badgeText} shadow-md`}>
                          {topikMeta.title}
                        </span>
                      </div>
                    </div>

                    {/* Konten Artikel */}
                    <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>{formattedDate}</span>
                          <span>•</span>
                          <span>{post.author_name}</span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-serif leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {post.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <span>Baca Warta</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Newspaper className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white font-serif">
                Tidak ada artikel warta yang sesuai
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Silakan ubah kata kunci pencarian atau pilih kategori topik lainnya.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedTopic('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0b5751] text-white hover:bg-emerald-800 transition"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>
      </main>

      <FooterProfil />
    </div>
  );
}
