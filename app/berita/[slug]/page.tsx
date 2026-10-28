'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ChevronLeft, 
  Clock, 
  User, 
  Tag, 
  Share2, 
  Check, 
  Newspaper, 
  ArrowRight,
  MessageCircle
} from 'lucide-react';
import { NavbarProfil, FooterProfil } from '@/components/modules/profil';
import { useBeritaStore } from '@/stores/useBeritaStore';
import { TOPIK_BERITA_MAP, SEED_BERITA } from '@/types/berita';

export default function DetailBeritaPage() {
  const params = useParams();
  const { posts, fetchPosts } = useBeritaStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const slug = params?.slug as string;

  // Temukan artikel berdasarkan slug
  const currentPost = useMemo(() => {
    const list = posts.length > 0 ? posts : SEED_BERITA;
    return list.find((p) => p.slug === slug);
  }, [posts, slug]);

  // Artikel Terkait
  const relatedPosts = useMemo(() => {
    if (!currentPost) return [];
    const list = posts.length > 0 ? posts : SEED_BERITA;
    return list
      .filter((p) => p.id !== currentPost.id && p.status === 'published')
      .slice(0, 3);
  }, [posts, currentPost]);

  const topikMeta = currentPost
    ? TOPIK_BERITA_MAP[currentPost.topic] || TOPIK_BERITA_MAP.kelas_unggulan
    : TOPIK_BERITA_MAP.kelas_unggulan;

  const handleShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== 'undefined' && currentPost) {
      const text = encodeURIComponent(`*${currentPost.title}*\n\nBaca warta selengkapnya di Portal Madin Blokagung:\n${window.location.href}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    }
  };

  if (!currentPost) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
        <NavbarProfil />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <Newspaper className="w-12 h-12 text-slate-400 mx-auto" />
            <h2 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
              Warta Berita Tidak Ditemukan
            </h2>
            <p className="text-xs text-slate-500">
              Artikel yang Anda tuju mungkin telah dipindahkan atau belum diterbitkan.
            </p>
            <Link
              href="/berita"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b5751] text-white hover:bg-emerald-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Arsip Berita</span>
            </Link>
          </div>
        </main>
        <FooterProfil />
      </div>
    );
  }

  const formattedDate = new Date(currentPost.published_at).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-300 selection:text-emerald-950">
      <NavbarProfil />

      <main className="flex-1 py-8 sm:py-12">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Breadcrumb Navigasi */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto pb-1">
            <Link href="/" className="hover:text-emerald-700">
              Beranda
            </Link>
            <span>/</span>
            <Link href="/berita" className="hover:text-emerald-700">
              Warta Berita
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-xs">
              {currentPost.title}
            </span>
          </nav>

          {/* Header Artikel */}
          <header className="space-y-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider ${topikMeta.badgeBg} ${topikMeta.badgeText}`}>
                {topikMeta.title}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formattedDate}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight leading-tight">
              {currentPost.title}
            </h1>

            {/* Penulis & Tombol Bagikan */}
            <div className="pt-2 pb-2 border-y border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {currentPost.author_name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Biro Publikasi Madin Al-Amiriyyah
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tautan Disalin!' : 'Salin Tautan'}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Foto Cover Utama 16:9 */}
          <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md aspect-video w-full bg-slate-100 relative">
            <img
              src={currentPost.cover_image_url}
              alt={currentPost.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Highlight Cuplikan Excerpt */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-600 text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-serif italic">
            &ldquo;{currentPost.excerpt}&rdquo;
          </div>

          {/* Isi Konten Berita Lengkap */}
          <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-base sm:text-lg leading-relaxed space-y-5 font-sans">
            {currentPost.content.split('\n\n').map((paragraph, idx) => {
              // Jika format dawuh atau heading
              if (paragraph.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-white pt-4">
                    {paragraph.replace('### ', '')}
                  </h3>
                );
              }
              if (paragraph.startsWith('> ')) {
                return (
                  <blockquote key={idx} className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border-l-4 border-amber-500 font-serif text-amber-950 dark:text-amber-200 my-4 italic">
                    {paragraph.replace('> ', '')}
                  </blockquote>
                );
              }
              return (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* Tags Artikel */}
          {currentPost.tags && currentPost.tags.length > 0 && (
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                Tag Terkait:
              </span>
              {currentPost.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Bagian Artikel Terkait */}
          {relatedPosts.length > 0 && (
            <section className="pt-10 border-t border-slate-200 dark:border-slate-800 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">
                  Warta Terkait Lainnya
                </h3>
                <Link
                  href="/berita"
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {relatedPosts.map((post) => {
                  const meta = TOPIK_BERITA_MAP[post.topic];
                  return (
                    <Link
                      key={post.id}
                      href={`/berita/${post.slug}`}
                      className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all"
                    >
                      <div className="aspect-video w-full overflow-hidden bg-slate-100 relative">
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] ${meta.badgeBg} ${meta.badgeText}`}>
                          {meta.shortTitle}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col justify-between flex-1">
                        <h4 className="text-xs sm:text-sm font-bold font-serif text-slate-900 dark:text-white line-clamp-2 group-hover:text-emerald-700 transition-colors">
                          {post.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 pt-2 block">
                          {new Date(post.published_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tombol Kembali ke Arsip */}
          <div className="pt-6 flex justify-center">
            <Link
              href="/berita"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 shadow-md transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Kembali ke Halaman Arsip Berita</span>
            </Link>
          </div>
        </article>
      </main>

      <FooterProfil />
    </div>
  );
}
