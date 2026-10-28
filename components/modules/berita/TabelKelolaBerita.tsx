'use client';

import React, { useEffect, useMemo } from 'react';
import { 
  Search, 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Star, 
  LayoutGrid, 
  Layers, 
  Clock, 
  AlertCircle, 
  Newspaper,
  Filter
} from 'lucide-react';
import { useBeritaStore } from '@/stores/useBeritaStore';
import { TopikBerita, StatusBerita, TOPIK_BERITA_MAP } from '@/types/berita';

export default function TabelKelolaBerita() {
  const { 
    posts, 
    isLoading, 
    error, 
    fetchPosts, 
    openFormModal, 
    deletePost, 
    toggleStatus, 
    setDisplayType,
    filterTopic,
    setFilterTopic,
    filterStatus,
    setFilterStatus,
    searchKeyword,
    setSearchKeyword
  } = useBeritaStore();

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Statistik Warta
  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p) => p.status === 'published').length;
    const draft = posts.filter((p) => p.status === 'draft').length;
    const unggulan = posts.filter((p) => p.topic === 'kelas_unggulan').length;
    const ula = posts.filter((p) => p.topic === 'tingkat_ula').length;
    const wustho = posts.filter((p) => p.topic === 'tingkat_wustho').length;
    const ulya = posts.filter((p) => p.topic === 'tingkat_ulya').length;
    return { total, published, draft, unggulan, ula, wustho, ulya };
  }, [posts]);

  // Data Terfilter
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Filter Topik
      if (filterTopic !== 'all' && post.topic !== filterTopic) return false;
      // Filter Status
      if (filterStatus !== 'all' && post.status !== filterStatus) return false;
      // Pencarian Kata Kunci
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase();
        const matchTitle = post.title.toLowerCase().includes(query);
        const matchAuthor = post.author_name.toLowerCase().includes(query);
        const matchExcerpt = post.excerpt.toLowerCase().includes(query);
        const matchTags = post.tags?.some((t) => t.toLowerCase().includes(query));
        return matchTitle || matchAuthor || matchExcerpt || matchTags;
      }
      return true;
    });
  }, [posts, filterTopic, filterStatus, searchKeyword]);

  const handleDeleteConfirm = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus warta berita ini?')) {
      await deletePost(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Baris Statistik Ringkas Warta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Warta</p>
          <p className="text-2xl font-extrabold text-slate-800 dark:text-white font-serif mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Terbit</p>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 font-serif mt-1">{stats.published}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Draft</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-300 font-serif mt-1">{stats.draft}</p>
        </div>
        <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs">
          <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Unggulan</p>
          <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 font-serif mt-1">{stats.unggulan}</p>
        </div>
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Tingkat ULA</p>
          <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 font-serif mt-1">{stats.ula}</p>
        </div>
        <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 shadow-xs">
          <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Tingkat WUSTHO</p>
          <p className="text-2xl font-extrabold text-blue-900 dark:text-blue-200 font-serif mt-1">{stats.wustho}</p>
        </div>
        <div className="bg-indigo-50/60 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/40 shadow-xs">
          <p className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">Tingkat ULYA</p>
          <p className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-200 font-serif mt-1">{stats.ulya}</p>
        </div>
      </div>

      {/* 2. Kontrol Filter & Tombol Tambah Berita */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Input Pencarian */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari judul berita, penulis, atau kata kunci..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusBerita | 'all')}
              className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="published">Diterbitkan (Published)</option>
              <option value="draft">Draft Tersimpan</option>
            </select>

            {/* Tombol Tulis Berita */}
            <button
              type="button"
              onClick={() => openFormModal(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 transition shadow-md shadow-amber-500/20 active:scale-98"
            >
              <Plus className="w-4 h-4 text-emerald-950 stroke-[2.5]" />
              <span>Tulis Berita Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Bar 4 Topik Utama */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-750">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 mr-1">
            <Filter className="w-3 h-3 text-emerald-600" />
            Topik:
          </span>

          <button
            type="button"
            onClick={() => setFilterTopic('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              filterTopic === 'all'
                ? 'bg-[#0b5751] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Semua Topik ({posts.length})
          </button>

          {(Object.keys(TOPIK_BERITA_MAP) as TopikBerita[]).map((key) => {
            const meta = TOPIK_BERITA_MAP[key];
            const isSelected = filterTopic === key;
            const count = posts.filter((p) => p.topic === key).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterTopic(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? `${meta.badgeBg} ${meta.badgeText} shadow-xs ring-2 ring-emerald-600/40`
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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

      {/* 3. Tampilan Tabel Data Berita (Dengan 3 UI States) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {/* State 1: Loading */}
        {isLoading && (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse w-1/4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {/* State 2: Error */}
        {!isLoading && error && (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchPosts()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Coba Muat Ulang
            </button>
          </div>
        )}

        {/* State 3: Empty State */}
        {!isLoading && !error && filteredPosts.length === 0 && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 flex items-center justify-center mx-auto">
              <Newspaper className="w-8 h-8 stroke-1" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
                Belum Ada Warta Berita Ditemukan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {searchKeyword || filterTopic !== 'all' || filterStatus !== 'all'
                  ? 'Tidak ada artikel yang cocok dengan filter aktif saat ini. Silakan atur ulang kata kunci atau filter topik.'
                  : 'Mulai publikasikan warta kegiatan madrasah, pengajian turots, atau prestasi santri sekarang.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (searchKeyword || filterTopic !== 'all' || filterStatus !== 'all') {
                  setSearchKeyword('');
                  setFilterTopic('all');
                  setFilterStatus('all');
                } else {
                  openFormModal(null);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 transition"
            >
              {searchKeyword || filterTopic !== 'all' || filterStatus !== 'all' ? (
                <span>Reset Semua Filter</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Tulis Berita Pertama</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State Sukses: Tabel Artikel */}
        {!isLoading && !error && filteredPosts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16">Foto</th>
                  <th className="py-3.5 px-4">Judul & Ringkasan Berita</th>
                  <th className="py-3.5 px-4 w-40">Topik</th>
                  <th className="py-3.5 px-4 w-48">Tampilan Editorial</th>
                  <th className="py-3.5 px-4 w-36">Status</th>
                  <th className="py-3.5 px-4 w-28 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                {filteredPosts.map((post) => {
                  const topikMeta = TOPIK_BERITA_MAP[post.topic] || TOPIK_BERITA_MAP.tingkat_ula;
                  const isHero = post.display_type === 'hero_lead';
                  const isHighlight = post.display_type === 'highlight_grid';

                  return (
                    <tr 
                      key={post.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors group"
                    >
                      {/* Foto Thumbnail */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="w-16 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 relative shadow-2xs flex-shrink-0">
                          <img
                            src={post.cover_image_url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      </td>

                      {/* Judul & Excerpt */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-serif line-clamp-2 leading-snug">
                            {post.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {post.excerpt}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              Oleh: {post.author_name}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(post.published_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span>•</span>
                            <span>{post.views_count} pembaca</span>
                          </div>
                        </div>
                      </td>

                      {/* Topik Badge */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] ${topikMeta.badgeBg} ${topikMeta.badgeText} shadow-2xs`}>
                          {topikMeta.title}
                        </span>
                      </td>

                      {/* Posisi Tampilan */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                            {isHero ? (
                              <>
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                <span className="font-bold text-amber-700 dark:text-amber-300">Hero Utama (Kiri 60%)</span>
                              </>
                            ) : isHighlight ? (
                              <>
                                <LayoutGrid className="w-3 h-3 text-emerald-600" />
                                <span>Sorotan (Grid 2x2 Kanan)</span>
                              </>
                            ) : (
                              <>
                                <Layers className="w-3 h-3 text-slate-400" />
                                <span>Post Terbaru (Reguler)</span>
                              </>
                            )}
                          </div>

                          {/* Quick Switch Tampilan */}
                          <div className="flex items-center gap-1 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setDisplayType(post.id, 'hero_lead')}
                              title="Jadikan Hero Lead Utama"
                              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] ${
                                isHero ? 'text-amber-600 font-bold' : 'text-slate-400'
                              }`}
                            >
                              Hero
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => setDisplayType(post.id, 'highlight_grid')}
                              title="Jadikan Sorotan Grid 2x2"
                              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] ${
                                isHighlight ? 'text-emerald-600 font-bold' : 'text-slate-400'
                              }`}
                            >
                              Sorotan
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => setDisplayType(post.id, 'regular')}
                              title="Jadikan Post Reguler"
                              className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] ${
                                !isHero && !isHighlight ? 'text-slate-800 dark:text-white font-bold' : 'text-slate-400'
                              }`}
                            >
                              Reguler
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Status Terbit */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleStatus(post.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                            post.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200'
                          }`}
                          title="Klik untuk mengubah status publikasi"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            post.status === 'published' ? 'bg-emerald-600' : 'bg-amber-600'
                          }`} />
                          <span>{post.status === 'published' ? 'Published' : 'Draft'}</span>
                        </button>
                      </td>

                      {/* Tombol Aksi */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openFormModal(post)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 transition"
                            title="Edit Berita"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteConfirm(post.id)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="Hapus Berita"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
