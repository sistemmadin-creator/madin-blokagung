'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  FileText, 
  LayoutGrid, 
  Star, 
  Layers, 
  ShieldAlert,
  Heading,
  Quote,
  List
} from 'lucide-react';
import { useBeritaStore } from '@/stores/useBeritaStore';
import { TopikBerita, DisplayTypeBerita, StatusBerita, TOPIK_BERITA_MAP } from '@/types/berita';
import { compressImageFile } from '@/lib/utils/image';

// Preset foto dokumentasi pesantren berkualitas tinggi untuk kemudahan input admin
const PRESET_COVERS = [
  {
    name: 'Kajian Aula & Masyayikh',
    url: 'https://images.unsplash.com/photo-1584697964190-705b89369947?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Santri Sorogan Kitab',
    url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Musyawarah & Bahtsul Masail',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Khazanah Kitab Turots',
    url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&w=800&q=80',
  },
];

export default function ModalFormBerita() {
  const { isFormModalOpen, editingPost, closeFormModal, createPost, updatePost } = useBeritaStore();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [topic, setTopic] = useState<TopikBerita>('kelas_unggulan');
  const [displayType, setDisplayType] = useState<DisplayTypeBerita>('highlight_grid');
  const [coverUrl, setCoverUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('Redaksi Madin Blokagung');
  const [status, setStatus] = useState<StatusBerita>('published');
  const [tags, setTags] = useState('Kegiatan, Santri');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper pembuat slug otomatis
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setSlug(editingPost.slug);
      setTopic(editingPost.topic);
      setDisplayType(editingPost.display_type);
      setCoverUrl(editingPost.cover_image_url);
      setExcerpt(editingPost.excerpt);
      setContent(editingPost.content);
      setAuthorName(editingPost.author_name);
      setStatus(editingPost.status);
      setTags(editingPost.tags ? editingPost.tags.join(', ') : '');
    } else {
      // Default state form baru
      setTitle('');
      setSlug('');
      setTopic('kelas_unggulan');
      setDisplayType('highlight_grid');
      setCoverUrl(PRESET_COVERS[0].url);
      setExcerpt('');
      setContent('');
      setAuthorName('Redaksi Madin Blokagung');
      setStatus('published');
      setTags('Kegiatan, Santri');
    }
    setErrorMessage('');
  }, [editingPost, isFormModalOpen]);

  // Handler auto-generate slug saat mengetik judul berita
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPost) {
      setSlug(generateSlug(val));
    }
  };

  // Handler upload & kompresi foto
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Kompres ukuran gambar canvas max 1000px agar ringan
      const compressedDataUrl = await compressImageFile(file, 1000, 0.8);
      setCoverUrl(compressedDataUrl);
    } catch {
      setErrorMessage('Gagal memproses gambar. Silakan gunakan format JPG atau PNG.');
    }
  };

  // Handler bantuan formatting konten
  const insertContentFormat = (prefix: string, suffix: string = '') => {
    setContent((prev) => prev + `\n${prefix}Teks di sini${suffix}\n`);
  };

  // Handler submit formulir
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Judul berita wajib diisi.');
      return;
    }
    if (!excerpt.trim()) {
      setErrorMessage('Ringkasan / cuplikan berita wajib diisi.');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('Konten isi berita wajib diisi.');
      return;
    }
    if (!coverUrl.trim()) {
      setErrorMessage('Foto cover berita wajib dipilih atau diunggah.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const formattedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || generateSlug(title),
      topic,
      display_type: displayType,
      cover_image_url: coverUrl.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      author_name: authorName.trim() || 'Redaksi Madin Blokagung',
      status,
      tags: formattedTags,
      published_at: editingPost ? editingPost.published_at : new Date().toISOString(),
    };

    try {
      if (editingPost) {
        await updatePost(editingPost.id, payload);
      } else {
        await createPost(payload);
      }
      closeFormModal();
    } catch {
      setErrorMessage('Terjadi kendala saat menyimpan warta berita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tutup dengan Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFormModalOpen) {
        closeFormModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormModalOpen, closeFormModal]);

  if (!isFormModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-[#0b5751] to-[#0e6962] text-white border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif tracking-tight text-white">
                {editingPost ? 'Perbarui Warta Berita' : 'Tulis Berita Baru (Warta Madina)'}
              </h2>
              <p className="text-xs text-emerald-100/80">
                Terintegrasi dengan 4 topik diniyyah dan tata letak editorial ala Lirboyo.net
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeFormModal}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Tutup formulir"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Isi Formulir */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Judul & Slug */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Judul Berita <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Contoh: Kuliah Umum Santri Kelas Unggulan Bersama Majelis Pendidik"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-serif focus:ring-2 focus:ring-emerald-600 focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Slug URL (Tautan Artikel)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-mono">
                  /berita/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="slug-otomatis-dari-judul"
                  className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Pilihan 4 Topik Utama */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Pilih 1 dari 4 Topik Strategis Madina <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(TOPIK_BERITA_MAP) as TopikBerita[]).map((key) => {
                const item = TOPIK_BERITA_MAP[key];
                const isSelected = topic === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTopic(key)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? `${item.lightBg} ${item.borderColor} ring-2 ring-emerald-600 shadow-sm`
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.badgeBg} ${item.badgeText}`}>
                          {item.shortTitle}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Tipe Tampilan Ala Lirboyo.net */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Posisi Tampilan Tata Letak Editorial
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setDisplayType('hero_lead')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  displayType === 'hero_lead'
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-600'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  <span>Hero Utama Kiri (60%)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kartu berita raksasa di sisi kiri beranda, menjadi tajuk utama warta.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDisplayType('highlight_grid')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  displayType === 'highlight_grid'
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-600'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <LayoutGrid className="w-4 h-4 text-emerald-600" />
                  <span>Sorotan Grid 2x2 Kanan (40%)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tampil pada 4 kotak sorotan pendukung berdampingan dengan berita utama.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDisplayType('regular')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  displayType === 'regular'
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-emerald-600'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>Post Terbaru (Reguler)</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Masuk ke dalam daftar artikel terbaru di bawah barisan hero grid.
                </p>
              </button>
            </div>
          </div>

          {/* 4. Foto Cover / Thumbnail */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Foto Cover Berita (Thumbnail) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Preview Gambar */}
              <div className="md:col-span-5 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 aspect-video flex items-center justify-center group shadow-xs">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Pratinjau Cover"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-1 stroke-1" />
                    <span className="text-xs">Belum ada foto</span>
                  </div>
                )}
              </div>

              {/* Kontrol Upload & Preset */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center gap-2">
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 transition shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah File Foto</span>
                  </button>
                  <span className="text-[11px] text-slate-400">Kompresi otomatis max 1000px</span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Atau Pilih Foto Pesantren:</span>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {PRESET_COVERS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setCoverUrl(preset.url)}
                        className={`px-2.5 py-1.5 rounded-lg border text-left text-xs truncate transition ${
                          coverUrl === preset.url
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="Atau tempel URL gambar eksternal (https://...)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Ringkasan / Excerpt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Ringkasan Berita (Excerpt Cuplikan Depan) <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] ${excerpt.length > 350 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                {excerpt.length} / 350 Karakter
              </span>
            </div>
            <textarea
              required
              rows={2}
              maxLength={400}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Tulis ringkasan 1-2 kalimat untuk ditampilkan di kartu depan berita..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none transition leading-relaxed"
            />
          </div>

          {/* 6. Konten Lengkap & Toolbar Format */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Konten Berita Lengkap <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => insertContentFormat('### ')}
                  className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  title="Sisipkan Sub-judul"
                >
                  <Heading className="w-3 h-3" />
                  <span>Subjudul</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertContentFormat('> "')}
                  className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  title="Sisipkan Kutipan Dawuh Masyayikh"
                >
                  <Quote className="w-3 h-3" />
                  <span>Dawuh</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertContentFormat('- ')}
                  className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1"
                  title="Sisipkan Poin List"
                >
                  <List className="w-3 h-3" />
                  <span>Poin</span>
                </button>
              </div>
            </div>
            <textarea
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan isi berita secara mendalam. Dukung pemisahan paragraf dengan tombol enter ganda..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none transition leading-relaxed font-sans"
            />
          </div>

          {/* 7. Metadata Tambahan: Penulis, Tag, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Penulis / Mustahiq Liputan
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Redaksi Madin Blokagung"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Tag / Topik Terkait (Koma)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Bahtsul Masail, Nadzom, Syawir"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Status Publikasi
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusBerita)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="published">Terbitkan Sekarang (Published)</option>
                <option value="draft">Simpan Sebagai Draft</option>
                <option value="archived">Diarsipkan (Archived)</option>
              </select>
            </div>
          </div>
        </form>

        {/* Footer Tombol Aksi */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={closeFormModal}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-emerald-950 bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-200 hover:to-amber-300 transition shadow-md shadow-amber-500/20 active:scale-98 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <Check className="w-4 h-4 text-emerald-950" />
                <span>{editingPost ? 'Simpan Perubahan' : 'Terbitkan Warta Berita'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
