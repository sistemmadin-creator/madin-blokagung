'use client';

import React, { useEffect, useState } from 'react';
import { X, GraduationCap, Save, Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import {
  MutakhorijinAlbum,
  sanitizeMutakhorijinPhotoUrl,
  slugifyMutakhorijinAlbum,
} from '@/types/mutakhorijin';
import {
  CreateAlbumPayload,
  UpdateAlbumPayload,
} from '@/stores/useMutakhorijinStore';
import { compressImageFile } from '@/lib/utils/image';

interface ModalFormAlbumProps {
  isOpen: boolean;
  onClose: () => void;
  editingAlbum: MutakhorijinAlbum | null;
  existingAlbums: MutakhorijinAlbum[];
  onSave: (
    payload: CreateAlbumPayload | UpdateAlbumPayload,
    editingId?: string
  ) => Promise<boolean>;
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export default function ModalFormAlbumMutakhorijin({
  isOpen,
  onClose,
  editingAlbum,
  existingAlbums,
  onSave,
}: ModalFormAlbumProps) {
  const [namaAngkatan, setNamaAngkatan] = useState('');
  const [captionAngkatan, setCaptionAngkatan] = useState('');
  const [tahunAngkatan, setTahunAngkatan] = useState<number>(2026);
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroQuote, setHeroQuote] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [footerNote, setFooterNote] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [isCurrent, setIsCurrent] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setIsCompressing(false);
    if (editingAlbum) {
      setNamaAngkatan(editingAlbum.nama_angkatan);
      setCaptionAngkatan(editingAlbum.caption_angkatan);
      setTahunAngkatan(editingAlbum.tahun_angkatan);
      setSlug(editingAlbum.slug);
      setSlugTouched(true);
      setHeroTitle(editingAlbum.hero_title);
      setHeroSubtitle(editingAlbum.hero_subtitle);
      setHeroQuote(editingAlbum.hero_quote);
      setHeroImageUrl(sanitizeMutakhorijinPhotoUrl(editingAlbum.hero_image_url));
      setFooterNote(editingAlbum.footer_note);
      setSortOrder(editingAlbum.sort_order);
      setIsCurrent(editingAlbum.is_current);
      setIsActive(editingAlbum.is_active !== false);
    } else {
      const nextYear = new Date().getFullYear();
      setNamaAngkatan('');
      setCaptionAngkatan(`Angkatan ${nextYear}`);
      setTahunAngkatan(nextYear);
      setSlug('');
      setSlugTouched(false);
      setHeroTitle('');
      setHeroSubtitle(
        `Album Kenangan Mutakhorijin Angkatan ${nextYear} • Madrasah Diniyyah Al-Amiriyyah PP. Darussalam Blokagung`
      );
      setHeroQuote('');
      setHeroImageUrl('');
      setFooterNote('');
      setSortOrder(20);
      setIsCurrent(false);
      setIsActive(true);
    }
  }, [isOpen, editingAlbum]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleNamaChange = (val: string) => {
    setNamaAngkatan(val);
    if (!editingAlbum && !slugTouched) {
      setSlug(val.trim() ? slugifyMutakhorijinAlbum(val, tahunAngkatan) : '');
    }
    if (!editingAlbum && !heroTitle.trim()) {
      setHeroTitle(val.toUpperCase());
    }
  };

  const handleTahunChange = (yearVal: number) => {
    setTahunAngkatan(yearVal);
    if (!editingAlbum && !slugTouched && namaAngkatan.trim()) {
      setSlug(slugifyMutakhorijinAlbum(namaAngkatan, yearVal));
    }
    if (!editingAlbum) {
      setCaptionAngkatan(`Angkatan ${yearVal}`);
    }
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_MIME.has(String(file.type || '').toLowerCase())) {
      setFormError('Format foto sampul harus JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setFormError('Ukuran file terlalu besar (maksimal 12 MB sebelum kompresi).');
      return;
    }
    try {
      setFormError(null);
      setIsCompressing(true);
      const compressed = await compressImageFile(file, 1400, 0.82);
      setHeroImageUrl(compressed);
    } catch {
      setFormError('Gagal memproses foto sampul.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = namaAngkatan.trim();
    const cleanSlug = slugifyMutakhorijinAlbum(slug || cleanNama, tahunAngkatan);

    if (!cleanNama) {
      setFormError('Nama angkatan wajib diisi (mis. Tsuroya).');
      return;
    }

    const dupSlug = existingAlbums.some(
      (a) => a.id !== editingAlbum?.id && a.slug.toLowerCase() === cleanSlug.toLowerCase()
    );
    if (dupSlug) {
      setFormError(`Slug "${cleanSlug}" sudah dipakai angkatan lain.`);
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload: CreateAlbumPayload = {
      nama_angkatan: cleanNama,
      caption_angkatan: captionAngkatan.trim() || `Angkatan ${tahunAngkatan}`,
      tahun_angkatan: Number(tahunAngkatan) || 2026,
      slug: cleanSlug,
      hero_title: (heroTitle || cleanNama).trim(),
      hero_subtitle: heroSubtitle.trim(),
      hero_quote: heroQuote.trim(),
      hero_image_url: sanitizeMutakhorijinPhotoUrl(heroImageUrl),
      footer_note: footerNote.trim(),
      sort_order: Number(sortOrder) || 0,
      is_current: isCurrent,
      is_active: isCurrent ? true : isActive,
    };

    const ok = await onSave(payload, editingAlbum?.id);
    setIsSaving(false);
    if (ok) {
      onClose();
    } else {
      setFormError('Gagal menyimpan data angkatan. Periksa koneksi atau otoritas edit.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-album-title"
      onClick={() => !isSaving && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#0b5751] text-white">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-amber-300" aria-hidden="true" />
            <h2 id="modal-album-title" className="text-base font-extrabold font-serif">
              {editingAlbum ? 'Ubah Album Angkatan Mutakhorijin' : 'Tambah Album Angkatan Baru'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Tutup modal angkatan"
            className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-4 py-3 text-xs sm:text-sm font-semibold text-rose-800 dark:text-rose-200"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Angkatan (Menu Dropdown) *
              </label>
              <input
                type="text"
                required
                value={namaAngkatan}
                onChange={(e) => handleNamaChange(e.target.value)}
                placeholder="Contoh: Tsuroya"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Tahun Angkatan *
              </label>
              <input
                type="number"
                required
                min={1951}
                max={2100}
                value={tahunAngkatan}
                onChange={(e) => handleTahunChange(Number(e.target.value) || 2026)}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Caption Kecil di Bawah Menu *
              </label>
              <input
                type="text"
                required
                value={captionAngkatan}
                onChange={(e) => setCaptionAngkatan(e.target.value)}
                placeholder="Contoh: Angkatan 2026"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Slug URL *
              </label>
              <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
                <span className="px-2.5 text-[11px] font-mono text-slate-600 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700">
                  /mutakhorijin/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
                  }}
                  placeholder="tsuroya-2026"
                  className="flex-1 min-h-[40px] px-2.5 py-1.5 bg-white dark:bg-slate-800 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Pengaturan Hero Sampul Album */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              Tampilan Hero Sampul Album
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Besar Hero
                </label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  placeholder="TSUROYA"
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Urutan Tampil
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kutipan / Tagline Pembuka
              </label>
              <input
                type="text"
                value={heroQuote}
                onChange={(e) => setHeroQuote(e.target.value)}
                placeholder="Menjaga sanad keilmuan salafiyah..."
                className="w-full min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Subjudul / Deskripsi Singkat Hero
              </label>
              <textarea
                rows={2}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
              />
            </div>

            {/* Foto Sampul Hero */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
              <div className="w-32 h-20 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                {isCompressing ? (
                  <Loader2 className="w-5 h-5 text-emerald-700 animate-spin" />
                ) : heroImageUrl ? (
                  <img
                    src={heroImageUrl}
                    alt="Preview sampul"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" aria-hidden="true" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-xs font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{heroImageUrl ? 'Ganti Foto Sampul' : 'Upload Foto Sampul'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleHeroUpload}
                    className="hidden"
                  />
                </label>
                {heroImageUrl && (
                  <button
                    type="button"
                    onClick={() => setHeroImageUrl('')}
                    className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Pesan Penutup Album (Footer Album)
            </label>
            <input
              type="text"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              placeholder="Mutakhorijin Tsuroya Angkatan 2026 • Semoga ilmu yang diraih membawa keberkahan."
              className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => {
                  setIsCurrent(e.target.checked);
                  if (e.target.checked) setIsActive(true);
                }}
                className="w-4 h-4 mt-0.5 rounded text-emerald-700"
              />
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                Jadikan angkatan utama sekarang (tampil di urutan teratas dropdown)
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCurrent ? true : isActive}
                disabled={isCurrent}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-emerald-700 disabled:opacity-50"
              />
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                Publikasikan ke halaman publik (maks. 5 tahun angkatan terakhir tampil di header)
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Angkatan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
