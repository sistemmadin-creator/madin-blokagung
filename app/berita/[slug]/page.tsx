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
  MessageCircle,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Play
} from 'lucide-react';
import { NavbarProfil, FooterProfil } from '@/components/modules/profil';
import { useBeritaStore } from '@/stores/useBeritaStore';
import { TOPIK_BERITA_MAP, SEED_BERITA } from '@/types/berita';

// Helper mengekstrak ID video TikTok dari berbagai format URL
function extractTikTokVideoId(url?: string): string | null {
  if (!url) return null;
  // Format: https://www.tiktok.com/@username/video/1234567890123456789
  const match = url.match(/\/video\/(\d+)/);
  if (match && match[1]) return match[1];
  return null;
}

export default function DetailBeritaPage() {
  const params = useParams();
  const { posts, fetchPosts } = useBeritaStore();
  const [copied, setCopied] = useState(false);
  const [coverImgError, setCoverImgError] = useState(false);

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

  const tikTokVideoId = extractTikTokVideoId(currentPost.tiktok_url);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-300 selection:text-emerald-950">
      <NavbarProfil />

      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
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
          <header className="space-y-4 max-w-4xl">
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

          {/* GRID UTAMA: Kolom Kiri (Artikel 68-70%) & Kolom Kanan (Widget TikTok 30-32%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* KOLOM KIRI (8 KOLOM): Konten Artikel & Foto Sisipan di Tengah Teks */}
            <article className="lg:col-span-8 space-y-8">
              {/* Foto Cover Utama 16:9 */}
              <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md aspect-video w-full bg-slate-100 dark:bg-slate-900 relative">
                {!coverImgError && currentPost.cover_image_url ? (
                  <img
                    src={currentPost.cover_image_url}
                    alt={currentPost.title}
                    onError={() => setCoverImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-900/40 to-slate-900 text-emerald-400">
                    <BookOpen className="w-16 h-16 opacity-40" />
                  </div>
                )}
              </div>

              {/* Highlight Cuplikan Excerpt */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-600 text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-serif italic">
                &ldquo;{currentPost.excerpt}&rdquo;
              </div>

              {/* Isi Konten Berita Lengkap & Render Foto di Tengah Teks */}
              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-base sm:text-lg leading-relaxed space-y-5 font-sans">
                {currentPost.content.split('\n\n').map((paragraph, idx) => {
                  const trimmed = paragraph.trim();

                  // 1. Format Gambar Sisipan di Tengah Teks: ![caption](url)
                  const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)/);
                  if (imgMatch) {
                    const caption = imgMatch[1];
                    const url = imgMatch[2];
                    return (
                      <figure key={idx} className="my-7 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900">
                        <div className="relative aspect-video sm:aspect-16/10 w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                          <img
                            src={url}
                            alt={caption}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {caption && (
                          <figcaption className="p-3.5 text-center text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 font-sans">
                            Foto: {caption}
                          </figcaption>
                        )}
                      </figure>
                    );
                  }

                  // 2. Format baris teks *Foto: ...* yang menyertai gambar
                  if (trimmed.startsWith('*Foto:') || trimmed.startsWith('_Foto:')) {
                    return null; // Sudah di-handle pada tag <figcaption>
                  }

                  // 3. Format Sub-judul ###
                  if (trimmed.startsWith('### ')) {
                    return (
                      <h3 key={idx} className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-white pt-4">
                        {trimmed.replace('### ', '')}
                      </h3>
                    );
                  }

                  // 4. Format Dawuh Masyayikh >
                  if (trimmed.startsWith('> ')) {
                    return (
                      <blockquote key={idx} className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border-l-4 border-amber-500 font-serif text-amber-950 dark:text-amber-200 my-4 italic">
                        {trimmed.replace('> ', '')}
                      </blockquote>
                    );
                  }

                  // 5. Paragraf Teks Biasa
                  return (
                    <p key={idx} className="whitespace-pre-line leading-relaxed">
                      {trimmed}
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
            </article>

            {/* KOLOM KANAN (4 KOLOM): Sidebar Widget Khusus Video TikTok (Sticky) */}
            <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              {/* WIDGET VIDEO TIKTOK */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm overflow-hidden space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                      <span>TT</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif">
                        Video TikTok Warta
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Dokumentasi Kegiatan Santri
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 text-[10px] font-bold">
                    Resmi MADINA
                  </span>
                </div>

                {/* Tampilan Pemutar Video TikTok */}
                {tikTokVideoId ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden bg-black aspect-9/16 max-h-[480px] w-full flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner">
                      <iframe
                        src={`https://www.tiktok.com/player/v1/${tikTokVideoId}?music_info=1&description=1`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="TikTok Video Madina"
                      />
                    </div>
                    {currentPost.tiktok_url && (
                      <a
                        href={currentPost.tiktok_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-black hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Tonton di Aplikasi TikTok</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 ml-1" />
                      </a>
                    )}
                  </div>
                ) : (
                  /* Fallback Widget TikTok jika belum ada link video khusus */
                  <div className="space-y-3">
                    <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white text-center space-y-3 border border-slate-800">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto text-amber-400">
                        <Play className="w-6 h-6 fill-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold font-serif text-white">
                          TikTok @madinblokagung
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Saksikan cuplikan video pendek kegiatan ngaji turots, setoran nadzom, dan syawir santri Darussalam Blokagung.
                        </p>
                      </div>
                      <a
                        href="https://www.tiktok.com/@madinblokagung"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold transition shadow-md"
                      >
                        <span>Buka Saluran TikTok</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* WIDGET KEDUA: Bantuan & Redaksi Warta */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>Layanan Warta Diniyyah</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Punya dokumentasi kegiatan rombel atau prestasi santri? Kirimkan rilis warta berita ke Redaksi MADINA Blokagung.
                </p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <a
                    href="https://wa.me/6281234567890?text=Assalamu%27alaikum%20Redaksi%20Madina"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <span>Hubungi Redaksi Pesantren &rarr;</span>
                  </a>
                </div>
              </div>
            </aside>
          </div>

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
                          alt=""
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
        </div>
      </main>

      <FooterProfil />
    </div>
  );
}
