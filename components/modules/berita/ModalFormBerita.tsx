'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  ImagePlus,
  Check, 
  FileText, 
  LayoutGrid, 
  Star, 
  Layers, 
  ShieldAlert,
  Heading,
  Quote,
  List,
  Video,
  Sparkles
} from 'lucide-react';
import { useBeritaStore } from '@/stores/useBeritaStore';
import { TopikBerita, DisplayTypeBerita, StatusBerita, TOPIK_BERITA_MAP } from '@/types/berita';
import { compressImageFile } from '@/lib/utils/image';

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
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Ref elemen
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);

  // State untuk Pop-up Klik Kanan Sisip Foto di Tengah Teks
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    cursorPos: number;
  } | null>(null);
  const [inlineImgUrl, setInlineImgUrl] = useState('');
  const [inlineCaption, setInlineCaption] = useState('');
  const [isProcessingInline, setIsProcessingInline] = useState(false);

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
      setTiktokUrl(editingPost.tiktok_url || '');
    } else {
      // Default state form baru
      setTitle('');
      setSlug('');
      setTopic('kelas_unggulan');
      setDisplayType('highlight_grid');
      setCoverUrl('');
      setExcerpt('');
      setContent('');
      setAuthorName('Redaksi Madin Blokagung');
      setStatus('published');
      setTags('Kegiatan, Santri');
      setTiktokUrl('');
    }
    setContextMenu(null);
    setErrorMessage('');
  }, [editingPost, isFormModalOpen]);

  // Handler auto-generate slug saat mengetik judul berita
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPost) {
      setSlug(generateSlug(val));
    }
  };

  // Handler upload & kompresi foto cover
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Kompres ukuran gambar canvas max 1200px agar ringan
      const compressedDataUrl = await compressImageFile(file, 1200, 0.82);
      setCoverUrl(compressedDataUrl);
    } catch {
      setErrorMessage('Gagal memproses gambar. Silakan gunakan format JPG atau PNG.');
    }
  };

  // Handler upload & kompresi foto sisipan di tengah teks
  const handleInlineFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingInline(true);
      const compressedDataUrl = await compressImageFile(file, 1000, 0.8);
      setInlineImgUrl(compressedDataUrl);
    } catch {
      setErrorMessage('Gagal memproses gambar sisipan.');
    } finally {
      setIsProcessingInline(false);
    }
  };

  // Handler klik kanan pada textarea konten berita
  const handleContentContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const textarea = contentInputRef.current;
    const cursorPos = textarea ? textarea.selectionStart : content.length;

    const rect = modalRef.current?.getBoundingClientRect();
    const modalWidth = rect?.width || 800;
    const modalHeight = rect?.height || 600;

    // Hitung posisi relatif di dalam modal container
    const rawX = rect ? e.clientX - rect.left : e.clientX;
    const rawY = rect ? e.clientY - rect.top : e.clientY;

    // Pastikan popup tidak melompat keluar batas modal
    const clampedX = Math.max(16, Math.min(rawX, modalWidth - 360));
    const clampedY = Math.max(16, Math.min(rawY, modalHeight - 340));

    setContextMenu({
      x: clampedX,
      y: clampedY,
      cursorPos,
    });
    setInlineImgUrl('');
    setInlineCaption('');
  };

  // Handler menyisipkan foto ke posisi kursor teks
  const handleInsertInlinePhoto = () => {
    if (!inlineImgUrl.trim()) return;

    const textarea = contentInputRef.current;
    const pos = contextMenu?.cursorPos ?? (textarea?.selectionStart ?? content.length);
    const captionText = inlineCaption.trim() || 'Dokumentasi Santri Madin Al-Amiriyyah';

    // Format blok markdown foto dengan takarir
    const markdownBlock = `\n\n![${captionText}](${inlineImgUrl.trim()})\n*Foto: ${captionText}*\n\n`;

    const newContent = content.slice(0, pos) + markdownBlock + content.slice(pos);
    setContent(newContent);
    setContextMenu(null);
    setInlineImgUrl('');
    setInlineCaption('');
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
    if (!coverUrl.trim()) {
      setErrorMessage('Foto cover berita wajib diunggah atau diisi URL-nya.');
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
      tiktok_url: tiktokUrl.trim() || undefined,
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
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
        } else if (isFormModalOpen) {
          closeFormModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormModalOpen, contextMenu, closeFormModal]);

  if (!isFormModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
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
                Terintegrasi dengan alur teratas editorial 5 Hero Slider, Sorotan Grid 2x2, dan Widget TikTok
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

          {/* 3. Penjelasan Alur Editorial Otomatis */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Alur Waterfall Editorial Berita Otomatis:</p>
              <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
                Berita baru yang dipublikasikan akan langsung masuk ke <strong>5 Hero Slider Utama</strong> di sisi kiri (bergulir otomatis setiap 2 detik). Berita yang tertumpuk selanjutnya masuk ke <strong>Sorotan Grid 2x2 Kanan</strong>, dan berikutnya ke <strong>Post Terbaru</strong>.
              </p>
            </div>
          </div>

          {/* 4. Foto Cover / Thumbnail (Fitur Preset Foto Pesantren Sudah Dihapus Bersih) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Foto Cover Berita (Thumbnail Utama) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Preview Gambar Cover */}
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
                    <span className="text-xs">Belum ada foto terpilih</span>
                  </div>
                )}
              </div>

              {/* Kontrol Upload File & Input URL */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center gap-3">
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 transition shadow-xs active:scale-98"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah File Foto</span>
                  </button>
                  <span className="text-[11px] text-slate-400">Kompresi otomatis max 1200px</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Atau Masukkan URL Gambar:
                  </label>
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... atau URL foto langsung"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
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

          {/* 6. Konten Lengkap & Fitur Klik Kanan Sisip Foto di Tengah Teks */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Konten Berita Lengkap <span className="text-rose-500">*</span>
              </label>
              
              {/* Toolbar Pembantu Formatting */}
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

                {/* Tombol Sisip Foto di Toolbar (Alternatif klik kanan) */}
                <button
                  type="button"
                  onClick={() => {
                    const textarea = contentInputRef.current;
                    const pos = textarea ? textarea.selectionStart : content.length;
                    setContextMenu({
                      x: 120,
                      y: 280,
                      cursorPos: pos,
                    });
                    setInlineImgUrl('');
                    setInlineCaption('');
                  }}
                  className="px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-950 dark:text-amber-200 text-[11px] font-bold flex items-center gap-1 border border-amber-300/60 transition"
                  title="Sisipkan Foto di Posisi Kursor Teks (Atau Klik Kanan pada Kotak Teks)"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>+ Sisip Foto</span>
                </button>
              </div>
            </div>

            {/* Input File Tersembunyi untuk Foto Sisipan */}
            <input
              ref={inlineFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleInlineFileChange}
              className="hidden"
            />

            {/* Textarea Konten dengan Listener onContextMenu (Klik Kanan) */}
            <textarea
              ref={contentInputRef}
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onContextMenu={handleContentContextMenu}
              placeholder="Tuliskan isi berita secara mendalam. TIPS: Klik kanan di mana saja pada teks ini untuk menyisipkan foto di tengah paragraf..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none transition leading-relaxed font-sans"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              💡 <strong>Tips:</strong> Klik kanan di sembarang posisi teks atau klik <strong>&ldquo;+ Sisip Foto&rdquo;</strong> untuk menambahkan foto dokumentasi di tengah-tengah paragraf.
            </p>

            {/* FLOATING POPUP KECIL UNTUK KLIK KANAN MENAMBAH FOTO DI TENGAH TEKS */}
            {contextMenu && (
              <div 
                className="absolute z-50 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-emerald-600 p-4 space-y-3 animate-in zoom-in-95 duration-150"
                style={{
                  top: `${contextMenu.y}px`,
                  left: `${contextMenu.x}px`,
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <ImagePlus className="w-4 h-4 text-emerald-600" />
                    <span>Sisipkan Foto di Tengah Teks</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContextMenu(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Tombol Unggah File Lokal */}
                <div>
                  <button
                    type="button"
                    disabled={isProcessingInline}
                    onClick={() => inlineFileInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-amber-400 hover:bg-amber-300 transition shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingInline ? 'Mengompresi Foto...' : 'Pilih File Foto (Komputer)'}</span>
                  </button>
                </div>

                {/* Input URL Gambar */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Atau Tempel URL Gambar:
                  </label>
                  <input
                    type="url"
                    value={inlineImgUrl}
                    onChange={(e) => setInlineImgUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Keterangan / Caption Foto */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Keterangan Foto (Caption):
                  </label>
                  <input
                    type="text"
                    value={inlineCaption}
                    onChange={(e) => setInlineCaption(e.target.value)}
                    placeholder="Contoh: Suasana setoran hafalan nadzom"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                {/* Pratinjau Kecil Jika Gambar Sudah Terpilih */}
                {inlineImgUrl && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video relative">
                    <img src={inlineImgUrl} alt="Pratinjau Sisipan" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Tombol Aksi Sisip / Batal */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setContextMenu(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={!inlineImgUrl.trim()}
                    onClick={handleInsertInlinePhoto}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 transition shadow-2xs"
                  >
                    Sisipkan Foto
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 7. Input Tautan Video TikTok (Widget Samping Berita) */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Tautan Video TikTok (Widget Jendela Samping Kanan Berita)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-600 font-bold bg-white dark:bg-slate-900 px-3 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900/60 flex items-center gap-1">
                <span>TikTok</span>
              </span>
              <input
                type="url"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="Contoh: https://www.tiktok.com/@madinblokagung/video/7350000000000000000"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Video ini akan ditampilkan pada widget jendela khusus di sebelah kanan berita (Gambar 4). Jika dikosongkan, widget samping akan menampilkan akun TikTok resmi MADINA Blokagung secara otomatis.
            </p>
          </div>

          {/* 8. Metadata Tambahan: Penulis, Tag, Status */}
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
