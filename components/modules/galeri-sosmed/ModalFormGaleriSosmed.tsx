'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Film,
  Sparkles,
  ShieldAlert,
  Play,
  Link2,
} from 'lucide-react';
import { useGaleriSosmedStore } from '@/stores/useGaleriSosmedStore';
import {
  PlatformSosmed,
  ContentFormatSosmed,
  PLATFORM_SOSMED_MAP,
  getSosmedTopics,
  getSosmedSubTopics,
} from '@/types/galeri-sosmed';
import {
  TopikBerita,
  StatusBerita,
} from '@/types/berita';
import { parseSosmedUrl, buildSosmedEmbedUrl } from '@/lib/utils/sosmedEmbedHelper';
import { compressImageFile } from '@/lib/utils/image';
import MediaKategoriMultiSelector from '@/components/modules/media/MediaKategoriMultiSelector';

export default function ModalFormGaleriSosmed() {
  const {
    isFormModalOpen,
    editingItem,
    closeFormModal,
    createItem,
    updateItem,
  } = useGaleriSosmedStore();

  const [sourceUrl, setSourceUrl] = useState('');
  const [platform, setPlatform] = useState<PlatformSosmed>('youtube');
  const [contentFormat, setContentFormat] = useState<ContentFormatSosmed>('landscape');
  const [embedId, setEmbedId] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<TopikBerita[]>(['umum']);
  const [selectedSubTopics, setSelectedSubTopics] = useState<string[]>([]);
  const [creatorName, setCreatorName] = useState('Tim Media Madin Blokagung');
  const [isPinned, setIsPinned] = useState(false);
  const [status, setStatus] = useState<StatusBerita>('published');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [autoDetectedNotice, setAutoDetectedNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
      setSourceUrl(editingItem.source_url);
      setPlatform(editingItem.platform);
      setContentFormat(editingItem.content_format);
      setEmbedId(editingItem.embed_id);
      setTitle(editingItem.title);
      setCaption(editingItem.caption);
      setThumbnailUrl(editingItem.thumbnail_url);
      setSelectedTopics(getSosmedTopics(editingItem));
      setSelectedSubTopics(getSosmedSubTopics(editingItem));
      setCreatorName(editingItem.creator_name);
      setIsPinned(Boolean(editingItem.is_pinned));
      setStatus(editingItem.status);
    } else {
      setSourceUrl('');
      setPlatform('youtube');
      setContentFormat('landscape');
      setEmbedId('');
      setTitle('');
      setCaption('');
      setThumbnailUrl('');
      setSelectedTopics(['umum']);
      setSelectedSubTopics([]);
      setCreatorName('Tim Media Madin Blokagung');
      setIsPinned(false);
      setStatus('published');
    }
    setErrorMessage('');
    setAutoDetectedNotice(null);
  }, [editingItem, isFormModalOpen]);

  // Tutup dengan Escape
  useEffect(() => {
    if (!isFormModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFormModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormModalOpen, closeFormModal]);

  const handleSourceUrlChange = (val: string) => {
    setSourceUrl(val);
    const parsed = parseSosmedUrl(val);
    if (parsed.isValid) {
      setPlatform(parsed.platform);
      setEmbedId(parsed.embedId);
      setContentFormat(parsed.contentFormat);
      if (parsed.autoThumbnailUrl && !thumbnailUrl) {
        setThumbnailUrl(parsed.autoThumbnailUrl);
      }
      setAutoDetectedNotice(
        `Terdeteksi otomatis: ${PLATFORM_SOSMED_MAP[parsed.platform].label} (ID: ${parsed.embedId})`
      );
    } else {
      setAutoDetectedNotice(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 1200, 0.82);
      setThumbnailUrl(compressed);
    } catch {
      setErrorMessage('Gagal memproses gambar sampul. Gunakan file JPG atau PNG.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl.trim()) {
      setErrorMessage('Tautan URL konten (YouTube, Instagram, atau TikTok) wajib diisi.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Judul karya sosmed wajib diisi.');
      return;
    }
    if (selectedTopics.length === 0) {
      setErrorMessage('Pilih minimal 1 kategori topik (misal: Umum, atau Umum + Tingkat ULA).');
      return;
    }
    if (!caption.trim()) {
      setErrorMessage('Deskripsi / konteks cerita karya wajib diisi.');
      return;
    }

    const parsed = parseSosmedUrl(sourceUrl);
    const finalEmbedId = embedId.trim() || parsed.embedId || `item-${Date.now()}`;
    const finalThumb =
      thumbnailUrl.trim() ||
      parsed.autoThumbnailUrl ||
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1000&q=80';

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      title: title.trim(),
      caption: caption.trim(),
      platform,
      content_format: contentFormat,
      source_url: sourceUrl.trim(),
      embed_id: finalEmbedId,
      thumbnail_url: finalThumb,
      topics: selectedTopics,
      sub_topics: selectedSubTopics,
      creator_name: creatorName.trim() || 'Tim Media Madin Blokagung',
      is_pinned: isPinned,
      status,
      published_at: editingItem ? editingItem.published_at : new Date().toISOString(),
    };

    try {
      if (editingItem) {
        await updateItem(editingItem.id, payload);
      } else {
        await createItem(payload);
      }
      closeFormModal();
    } catch {
      setErrorMessage('Terjadi kendala saat menyimpan karya ke Galeri Sosmed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isFormModalOpen) return null;

  const previewEmbedUrl = buildSosmedEmbedUrl({
    platform,
    embed_id: embedId,
    source_url: sourceUrl,
    content_format: contentFormat,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-form-sosmed-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-[#0b5751] to-[#0e6962] text-white border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="modal-form-sosmed-title"
                className="text-lg font-bold font-serif tracking-tight text-white"
              >
                {editingItem ? 'Perbarui Karya Galeri Sosmed' : 'Tambah Karya Baru ke Galeri Sosmed'}
              </h2>
              <p className="text-xs text-emerald-100/80">
                Kurasi embed resmi YouTube, Instagram, dan TikTok untuk Portofolio Kreator Media Madin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeFormModal}
            aria-label="Tutup formulir galeri sosmed"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isi Formulir */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Input Tautan Konten Sosmed & Auto-Detector */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
              1. Tempel Tautan URL Konten (YouTube / Instagram / TikTok) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 flex items-center justify-center text-emerald-700 shrink-0">
                <Link2 className="w-4 h-4" />
              </div>
              <input
                type="url"
                required
                value={sourceUrl}
                onChange={(e) => handleSourceUrlChange(e.target.value)}
                placeholder="Contoh: https://www.youtube.com/watch?v=... atau https://www.instagram.com/reel/... atau https://www.tiktok.com/@.../video/..."
                className="flex-1 min-h-[42px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {autoDetectedNotice ? (
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>{autoDetectedNotice}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sistem otomatis mendeteksi platform, ID video, rasio layar (16:9 / 9:16), dan sampul YouTube begitu URL ditempelkan.
              </p>
            )}

            {/* Pilihan Platform & Format Rasio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Platform Sosmed
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as PlatformSosmed)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="youtube">YouTube (Video / Shorts)</option>
                  <option value="instagram">Instagram (Reels / Feed)</option>
                  <option value="tiktok">TikTok (Video Vertikal)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Format Tampilan Player
                </label>
                <select
                  value={contentFormat}
                  onChange={(e) => setContentFormat(e.target.value as ContentFormatSosmed)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="landscape">Widescreen 16:9 (Kartu Lebar / YouTube)</option>
                  <option value="vertical">Vertical 9:16 (Kartu Tinggi / TikTok &amp; Reels)</option>
                  <option value="post">Feed / Carousel 4:5 (Kartu Sedang / Instagram)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Menentukan proporsi tinggi kartu di papan Masonry Galeri Sosmed.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Kode / ID Embed
                </label>
                <input
                  type="text"
                  value={embedId}
                  onChange={(e) => setEmbedId(e.target.value)}
                  placeholder="Otomatis dari URL"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Judul & Cerita Karya */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Judul Karya Portofolio <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Gema Lalaran 357 Santri Kelas 4 Ula Putra Sebelum KBM Malam"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-serif focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Deskripsi &amp; Konteks Cerita Karya <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Ceritakan konteks kegiatan, pesan keilmuan, atau suasana di balik karya ini..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
              />
            </div>
          </div>

          {/* 3. Pilihan Multi-Kategori Topik & Sub-Kategori */}
          <MediaKategoriMultiSelector
            labelText="Pilih Kategori Topik (Dapat Dipilih Lebih dari Satu)"
            helperText="Anda dapat mengombinasikan kategori utama dengan sub-kategori Kegiatan, Event, atau Acara."
            selectedTopics={selectedTopics}
            selectedSubTopics={selectedSubTopics}
            onChangeTopics={setSelectedTopics}
            onChangeSubTopics={setSelectedSubTopics}
          />

          {/* 4. Poster Thumbnail & Pratinjau Embed */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Kontrol Upload Thumbnail Cover (7 Kolom) */}
            <div className="md:col-span-7 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Poster / Thumbnail Sampul Portofolio
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 transition shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Poster Sampul</span>
                </button>
                <span className="text-[11px] text-slate-400">
                  Otomatis terisi untuk YouTube, atau unggah poster kustom untuk IG/TikTok
                </span>
              </div>

              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="Atau tempel URL gambar poster sampul (https://...)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />

              {/* Saklar Pinned Showreel Utama */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Jadikan Showreel Utama (Pinned di Panggung Atas)
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Karya ini akan ditampilkan paling menonjol di panggung utama halaman Galeri Sosmed.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-5 h-5 rounded accent-emerald-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Kotak Pratinjau Visual (5 Kolom) */}
            <div className="md:col-span-5 space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Pratinjau Kartu / Embed
              </span>
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-video flex items-center justify-center relative">
                {thumbnailUrl ? (
                  <>
                    <img
                      src={thumbnailUrl}
                      alt="Pratinjau Sampul"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                      <span className="w-11 h-11 rounded-full bg-amber-400 text-emerald-950 flex items-center justify-center shadow-lg">
                        <Play className="w-5 h-5 fill-emerald-950 ml-0.5" />
                      </span>
                    </div>
                  </>
                ) : previewEmbedUrl ? (
                  <iframe
                    src={previewEmbedUrl}
                    title="Pratinjau Embed"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-400 space-y-1">
                    <ImageIcon className="w-7 h-7 mx-auto stroke-1" />
                    <p className="text-[11px]">Pratinjau tampil setelah URL diisi</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Nama Tim Kreator & Status Publikasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Unit / Tim Kreator Produksi
              </label>
              <input
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Tim Media Madin Blokagung"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Status Publikasi
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusBerita)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="published">Terbitkan di Portofolio (Published)</option>
                <option value="draft">Simpan Sebagai Draft</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer Modal */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={closeFormModal}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-emerald-950 bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <Check className="w-4 h-4 text-emerald-950" />
            <span>{isSubmitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Simpan ke Portofolio'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
