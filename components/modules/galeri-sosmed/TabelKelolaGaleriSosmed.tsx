'use client';

import React, { useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Plus,
  Edit3,
  Trash2,
  Sparkles,
  Play,
  Clock,
  AlertCircle,
  Film,
  Filter,
  ExternalLink,
} from 'lucide-react';
import { useGaleriSosmedStore } from '@/stores/useGaleriSosmedStore';
import {
  PlatformSosmed,
  PLATFORM_SOSMED_MAP,
  getSosmedTopics,
  hasSosmedTopic,
  hasSosmedSubTopic,
} from '@/types/galeri-sosmed';
import {
  StatusBerita,
  TOPIK_BERITA_MAP,
  TOPIK_BERITA_ORDER,
} from '@/types/berita';
import { formatBeritaDateWib } from '@/lib/utils/beritaDateHelper';
import { usePagePermission } from '@/stores/useRbacStore';
import { sanitizeHttpUrl } from '@/lib/security/urlSanitizer';
import ModalLightboxSosmed from './ModalLightboxSosmed';
import SubKategoriFilterBar from '@/components/modules/media/SubKategoriFilterBar';
import SubKategoriBadgeList from '@/components/modules/media/SubKategoriBadgeList';

export default function TabelKelolaGaleriSosmed() {
  const {
    items,
    isLoading,
    error,
    fetchItems,
    openFormModal,
    deleteItem,
    toggleStatus,
    togglePinned,
    filterPlatform,
    setFilterPlatform,
    filterTopic,
    setFilterTopic,
    filterSubTopic,
    setFilterSubTopic,
    filterStatus,
    setFilterStatus,
    searchKeyword,
    setSearchKeyword,
    activeLightboxItem,
    openLightbox,
    closeLightbox,
  } = useGaleriSosmedStore();

  const { canCreate, canEdit, canDelete } = usePagePermission('kelola-galeri-sosmed');

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Statistik Ringkas Galeri Sosmed
  const stats = useMemo(() => {
    const total = items.length;
    const published = items.filter((it) => it.status === 'published').length;
    const draft = items.filter((it) => it.status === 'draft').length;
    const youtube = items.filter((it) => it.platform === 'youtube').length;
    const instagram = items.filter((it) => it.platform === 'instagram').length;
    const tiktok = items.filter((it) => it.platform === 'tiktok').length;
    return { total, published, draft, youtube, instagram, tiktok };
  }, [items]);

  // Daftar karya terfilter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterPlatform !== 'all' && item.platform !== filterPlatform) return false;
      if (filterTopic !== 'all' && !hasSosmedTopic(item, filterTopic)) return false;
      if (filterSubTopic !== 'all' && !hasSosmedSubTopic(item, filterSubTopic)) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCaption = item.caption.toLowerCase().includes(q);
        const matchCreator = item.creator_name.toLowerCase().includes(q);
        return matchTitle || matchCaption || matchCreator;
      }
      return true;
    });
  }, [items, filterPlatform, filterTopic, filterSubTopic, filterStatus, searchKeyword]);

  const handleDeleteConfirm = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus karya ini dari Galeri Sosmed?')) {
      await deleteItem(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Baris Statistik Portofolio Kreator */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Karya</p>
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
        <div className="bg-red-50/60 dark:bg-red-950/20 p-4 rounded-2xl border border-red-200/80 dark:border-red-900/40 shadow-xs">
          <p className="text-[11px] font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">YouTube</p>
          <p className="text-2xl font-extrabold text-red-900 dark:text-red-200 font-serif mt-1">{stats.youtube}</p>
        </div>
        <div className="bg-pink-50/60 dark:bg-pink-950/20 p-4 rounded-2xl border border-pink-200/80 dark:border-pink-900/40 shadow-xs">
          <p className="text-[11px] font-bold text-pink-800 dark:text-pink-300 uppercase tracking-wider">Instagram</p>
          <p className="text-2xl font-extrabold text-pink-900 dark:text-pink-200 font-serif mt-1">{stats.instagram}</p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xs">
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">TikTok</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-serif mt-1">{stats.tiktok}</p>
        </div>
      </div>

      {/* 2. Kontrol Pencarian & Filter */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Pencarian */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari judul karya, deskripsi, atau tim kreator..."
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

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Platform */}
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value as PlatformSosmed | 'all')}
              className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">Semua Platform</option>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>

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

            {canCreate && (
              <button
                type="button"
                onClick={() => openFormModal(null)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 transition shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-950 stroke-[2.5]" />
                <span>Tambah Karya Sosmed</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar Kategori Topik */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-750">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0 mr-1">
            <Filter className="w-3 h-3 text-emerald-600" />
            Kategori:
          </span>

          <button
            type="button"
            onClick={() => setFilterTopic('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
              filterTopic === 'all'
                ? 'bg-[#0b5751] text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Semua Topik ({items.length})
          </button>

          {TOPIK_BERITA_ORDER.map((key) => {
            const meta = TOPIK_BERITA_MAP[key];
            const isSelected = filterTopic === key;
            const count = items.filter((it) => hasSosmedTopic(it, key)).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterTopic(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
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

        <SubKategoriFilterBar
          activeTopic={filterTopic}
          selectedSubTopic={filterSubTopic}
          onSelectSubTopic={setFilterSubTopic}
          getCount={(subId) => items.filter((it) => hasSosmedSubTopic(it, subId)).length}
        />
      </div>

      {/* 3. Tabel Karya Galeri Sosmed (3 UI States) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {isLoading && (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse w-1/3" />
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{error}</p>
            <button
              type="button"
              onClick={() => fetchItems()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition"
            >
              Coba Muat Ulang
            </button>
          </div>
        )}

        {!isLoading && !error && filteredItems.length === 0 && (
          <div className="p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 flex items-center justify-center mx-auto">
              <Film className="w-8 h-8 stroke-1" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
                Belum Ada Karya Galeri Sosmed Ditemukan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {searchKeyword || filterPlatform !== 'all' || filterTopic !== 'all' || filterStatus !== 'all'
                  ? 'Tidak ada konten sosmed yang cocok dengan kombinasi filter aktif saat ini.'
                  : 'Mulai tambahkan embed video YouTube, Instagram Reels, atau TikTok untuk membangun portofolio kreator Media Madin.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (searchKeyword || filterPlatform !== 'all' || filterTopic !== 'all' || filterStatus !== 'all') {
                  setSearchKeyword('');
                  setFilterPlatform('all');
                  setFilterTopic('all');
                  setFilterStatus('all');
                } else {
                  openFormModal(null);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 transition cursor-pointer"
            >
              {searchKeyword || filterPlatform !== 'all' || filterTopic !== 'all' || filterStatus !== 'all' ? (
                <span>Reset Semua Filter</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Tambah Karya Pertama</span>
                </>
              )}
            </button>
          </div>
        )}

        {!isLoading && !error && filteredItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-20">Sampul</th>
                  <th className="py-3.5 px-4">Judul &amp; Konteks Karya</th>
                  <th className="py-3.5 px-4 w-36">Platform</th>
                  <th className="py-3.5 px-4 w-44">Kategori Topik</th>
                  <th className="py-3.5 px-4 w-40">Posisi Portofolio</th>
                  <th className="py-3.5 px-4 w-32">Status</th>
                  <th className="py-3.5 px-4 w-28 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                {filteredItems.map((item) => {
                  const pMeta = PLATFORM_SOSMED_MAP[item.platform] || PLATFORM_SOSMED_MAP.youtube;
                  const itemTopics = getSosmedTopics(item);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors group"
                    >
                      {/* Thumbnail Klik Untuk Putar */}
                      <td className="py-3.5 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => openLightbox(item)}
                          title="Klik untuk memutar pratinjau embed"
                          className="w-18 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 relative flex items-center justify-center cursor-pointer group/thumb"
                        >
                          <img
                            src={item.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                          />
                          <span className="absolute inset-0 bg-black/35 flex items-center justify-center">
                            <Play className="w-4 h-4 text-amber-300 fill-amber-300" />
                          </span>
                        </button>
                      </td>

                      {/* Judul & Deskripsi */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white font-serif line-clamp-2 leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {item.caption}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5 flex-wrap">
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {item.creator_name}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatBeritaDateWib(item.published_at, 'short')}
                            </span>
                            <span>•</span>
                            <a
                              href={sanitizeHttpUrl(item.source_url) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
                            >
                              <span>Tautan Asli</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Platform & Rasio */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] ${pMeta.badgeBg} ${pMeta.badgeText}`}
                          >
                            {pMeta.label}
                          </span>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {item.content_format === 'vertical'
                              ? 'Rasio 9:16 (Vertikal)'
                              : item.content_format === 'post'
                                ? 'Rasio 4:5 (Feed)'
                                : 'Rasio 16:9 (Lanskap)'}
                          </p>
                        </div>
                      </td>

                      {/* Kategori Multi-Topik */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {itemTopics.map((tKey) => {
                            const tMeta = TOPIK_BERITA_MAP[tKey] || TOPIK_BERITA_MAP.umum;
                            return (
                              <span
                                key={tKey}
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] whitespace-nowrap ${tMeta.badgeBg} ${tMeta.badgeText}`}
                              >
                                {tMeta.shortTitle}
                              </span>
                            );
                          })}
                          <SubKategoriBadgeList subTopicIds={item.sub_topics} />
                        </div>
                      </td>

                      {/* Posisi Showreel Pinned */}
                      <td className="py-3.5 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => togglePinned(item.id)}
                          title="Klik untuk menjadikan atau melepas Showreel Utama"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            item.is_pinned
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <Sparkles
                            className={`w-3.5 h-3.5 ${
                              item.is_pinned ? 'text-amber-600 fill-amber-400' : 'text-slate-400'
                            }`}
                          />
                          <span>{item.is_pinned ? 'Showreel Utama' : 'Grid Reguler'}</span>
                        </button>
                      </td>

                      {/* Status Publikasi */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleStatus(item.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                            item.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'published' ? 'bg-emerald-600' : 'bg-amber-600'
                            }`}
                          />
                          <span>{item.status === 'published' ? 'Published' : 'Draft'}</span>
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openLightbox(item)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Putar Embed"
                          >
                            <Play className="w-4 h-4" />
                          </button>

                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openFormModal(item)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 transition cursor-pointer"
                              title="Edit Karya"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteConfirm(item.id)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Hapus Karya"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Modal Lightbox Pratinjau Embed */}
      <ModalLightboxSosmed item={activeLightboxItem} onClose={closeLightbox} />
    </div>
  );
}
