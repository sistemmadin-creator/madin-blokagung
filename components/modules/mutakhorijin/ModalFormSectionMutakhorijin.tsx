'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Save,
  Upload,
  Trash2,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Loader2,
  BookOpen,
  Compass,
} from 'lucide-react';
import {
  MutakhorijinLayoutAlign,
  MutakhorijinPhotoItem,
  MutakhorijinSection,
  MutakhorijinSectionType,
  sanitizeMutakhorijinPhotoUrl,
} from '@/types/mutakhorijin';
import { CreateSectionPayload } from '@/stores/useMutakhorijinStore';
import { compressImageFile } from '@/lib/utils/image';

interface ModalFormSectionProps {
  isOpen: boolean;
  onClose: () => void;
  albumId: string;
  editingSection: MutakhorijinSection | null;
  onSave: (payload: CreateSectionPayload, editingId?: string) => Promise<boolean>;
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export default function ModalFormSectionMutakhorijin({
  isOpen,
  onClose,
  albumId,
  editingSection,
  onSave,
}: ModalFormSectionProps) {
  const [sectionType, setSectionType] = useState<MutakhorijinSectionType>('dossier');
  const [judul, setJudul] = useState('');
  const [subjudulLabel, setSubjudulLabel] = useState('');
  const [quote, setQuote] = useState('');
  const [narasi, setNarasi] = useState('');
  const [fotoUtamaUrl, setFotoUtamaUrl] = useState('');
  const [fotoUtamaCaption, setFotoUtamaCaption] = useState('');
  const [galeriFoto, setGaleriFoto] = useState<MutakhorijinPhotoItem[]>([]);
  const [layoutAlign, setLayoutAlign] = useState<MutakhorijinLayoutAlign>('auto');
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [isActive, setIsActive] = useState(true);

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setIsProcessingImage(false);
    if (editingSection) {
      setSectionType(editingSection.section_type);
      setJudul(editingSection.judul);
      setSubjudulLabel(editingSection.subjudul_label || '');
      setQuote(editingSection.quote || '');
      setNarasi(editingSection.narasi || '');
      setFotoUtamaUrl(sanitizeMutakhorijinPhotoUrl(editingSection.foto_utama_url));
      setFotoUtamaCaption(editingSection.foto_utama_caption || '');
      setGaleriFoto((editingSection.galeri_foto || []).map((g) => ({ ...g })));
      setLayoutAlign(editingSection.layout_align || 'auto');
      setSortOrder(editingSection.sort_order);
      setIsActive(editingSection.is_active !== false);
    } else {
      setSectionType('dossier');
      setJudul('');
      setSubjudulLabel('');
      setQuote('');
      setNarasi('');
      setFotoUtamaUrl('');
      setFotoUtamaCaption('');
      setGaleriFoto([]);
      setLayoutAlign('auto');
      setSortOrder(10);
      setIsActive(true);
    }
  }, [isOpen, editingSection]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleMainPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_MIME.has(String(file.type || '').toLowerCase())) {
      setFormError('Format foto harus JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setFormError('Ukuran foto terlalu besar (maksimal 12 MB sebelum kompresi).');
      return;
    }
    try {
      setFormError(null);
      setIsProcessingImage(true);
      const compressed = await compressImageFile(file, 1400, 0.82);
      setFotoUtamaUrl(compressed);
    } catch {
      setFormError('Gagal memproses foto utama.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleGalleryMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const maxGallery = sectionType === 'dossier' ? 4 : 24;
    const remainingSlots = maxGallery - galeriFoto.length;
    if (remainingSlots <= 0) {
      setFormError(
        sectionType === 'dossier'
          ? 'Tipe Bab Cerita (Dossier) maksimal memiliki 4 foto pendukung.'
          : 'Galeri kartu pos maksimal 24 foto.'
      );
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);
    setFormError(null);
    setIsProcessingImage(true);

    try {
      const added: MutakhorijinPhotoItem[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const f = selectedFiles[i];
        if (!ALLOWED_MIME.has(String(f.type || '').toLowerCase())) continue;
        if (f.size > 12 * 1024 * 1024) continue;
        const compressed = await compressImageFile(f, 1400, 0.82);
        added.push({
          id: `foto-${Date.now()}-${i + 1}`,
          url: compressed,
          caption: '',
        });
      }
      if (added.length === 0) {
        setFormError('Tidak ada foto valid (JPG/PNG/WEBP, maks. 12 MB) yang dapat diproses.');
      } else {
        setGaleriFoto((prev) => [...prev, ...added]);
      }
    } catch {
      setFormError('Sebagian foto gagal dikompresi.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleMoveGallery = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= galeriFoto.length) return;
    setGaleriFoto((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) {
      setFormError('Judul bab atau kartu pos wajib diisi.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload: CreateSectionPayload = {
      album_id: editingSection?.album_id || albumId,
      section_type: sectionType,
      judul: judul.trim(),
      subjudul_label: subjudulLabel.trim(),
      quote: quote.trim(),
      narasi: narasi.trim(),
      foto_utama_url: sanitizeMutakhorijinPhotoUrl(fotoUtamaUrl),
      foto_utama_caption: fotoUtamaCaption.trim(),
      galeri_foto: galeriFoto,
      layout_align: layoutAlign,
      sort_order: Number(sortOrder) || 10,
      is_active: isActive,
    };

    const ok = await onSave(payload, editingSection?.id);
    setIsSaving(false);
    if (ok) {
      onClose();
    } else {
      setFormError('Gagal menyimpan blok album. Periksa koneksi atau otoritas edit.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-section-title"
      onClick={() => !isSaving && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0b5751] to-[#137269] text-white">
          <div className="flex items-center gap-2.5">
            {sectionType === 'postcard' ? (
              <Compass className="w-5 h-5 text-amber-300" aria-hidden="true" />
            ) : (
              <BookOpen className="w-5 h-5 text-amber-300" aria-hidden="true" />
            )}
            <h2 id="modal-section-title" className="text-base sm:text-lg font-extrabold font-serif">
              {editingSection ? 'Ubah Blok Album Kenangan' : 'Tambah Blok Album Kenangan'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Tutup modal blok"
            className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {formError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-4 py-3 text-xs sm:text-sm font-semibold text-rose-800 dark:text-rose-200"
            >
              {formError}
            </div>
          )}

          {/* Pilihan Tipe Blok */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Tipe Blok Tampilan
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSectionType('dossier')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  sectionType === 'dossier'
                    ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-600/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Bab Cerita (Dossier)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  Split asimetris kiri/kanan: 1 foto utama + hingga 4 foto pendukung klik-lightbox.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSectionType('postcard')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  sectionType === 'postcard'
                    ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/40 ring-1 ring-amber-600/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                  <Compass className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Kartu Pos Momen (Postcard)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  Kartu pos berbingkai yang saat diklik membuka galeri layar penuh berisi banyak foto.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Judul Besar *
              </label>
              <input
                type="text"
                required
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder={
                  sectionType === 'postcard'
                    ? 'Contoh: Serambi Diniyyah & Haflah'
                    : 'Contoh: Jejak Takror & Syawir'
                }
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Label Atas (Eyebrow)
              </label>
              <input
                type="text"
                value={subjudulLabel}
                onChange={(e) => setSubjudulLabel(e.target.value)}
                placeholder="BAB 01 • PERJUANGAN"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Kutipan / Quote Sorotan
            </label>
            <input
              type="text"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Kalimat singkat penuh makna untuk pembuka bab..."
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Teks Narasi / Cerita Singkat
            </label>
            <textarea
              rows={3}
              value={narasi}
              onChange={(e) => setNarasi(e.target.value)}
              placeholder="Tuliskan cerita kenangan atau keterangan momen..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sectionType === 'dossier' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Posisi Teks Desktop
                </label>
                <select
                  value={layoutAlign}
                  onChange={(e) => setLayoutAlign(e.target.value as MutakhorijinLayoutAlign)}
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                >
                  <option value="auto">Otomatis Selang-Seling</option>
                  <option value="left">Teks di Kiri, Foto di Kanan</option>
                  <option value="right">Foto di Kiri, Teks di Kanan</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Nomor Urut Tampil
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700"
                />
                <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Tampilkan di halaman publik
                </span>
              </label>
            </div>
          </div>

          {/* Foto Utama / Sampul */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {sectionType === 'postcard' ? 'Foto Sampul Kartu Pos' : 'Foto Utama Bab (Hero Bab)'}
              </h3>
              {isProcessingImage && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengompresi...</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-36 h-24 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                {fotoUtamaUrl ? (
                  <img
                    src={fotoUtamaUrl}
                    alt="Preview foto utama"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-7 h-7 text-slate-400" aria-hidden="true" />
                )}
              </div>

              <div className="flex-1 w-full space-y-2">
                <div className="flex flex-wrap gap-2">
                  <label className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-xs font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{fotoUtamaUrl ? 'Ganti Foto Utama' : 'Upload Foto Utama'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleMainPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {fotoUtamaUrl && (
                    <button
                      type="button"
                      onClick={() => setFotoUtamaUrl('')}
                      className="min-h-[38px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={fotoUtamaCaption}
                  onChange={(e) => setFotoUtamaCaption(e.target.value)}
                  placeholder="Caption foto utama (tampil saat hover & lightbox)"
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Galeri Foto Pendukung / Isi Galeri Kartu Pos */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {sectionType === 'postcard'
                    ? `Koleksi Foto Galeri Kartu Pos (${galeriFoto.length}/24)`
                    : `Foto Pendukung Dossier (${galeriFoto.length}/4)`}
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Pilih satu atau beberapa foto sekaligus (JPG/PNG/WEBP). Otomatis dikompresi sebelum diunggah.
                </p>
              </div>
              <label className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tambah Foto Galeri</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleGalleryMultiUpload}
                  className="hidden"
                />
              </label>
            </div>

            {galeriFoto.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                Belum ada foto galeri tambahan.
              </p>
            ) : (
              <div className="space-y-2.5">
                {galeriFoto.map((foto, idx) => (
                  <div
                    key={foto.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
                  >
                    <img
                      src={foto.url}
                      alt={`Galeri ${idx + 1}`}
                      className="w-20 h-14 rounded-lg object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                    />
                    <input
                      type="text"
                      value={foto.caption || ''}
                      onChange={(e) =>
                        setGaleriFoto((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, caption: e.target.value } : item
                          )
                        )
                      }
                      placeholder={`Caption foto ${idx + 1} (opsional)`}
                      className="flex-1 w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                    <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveGallery(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Geser foto ke atas"
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveGallery(idx, 1)}
                        disabled={idx === galeriFoto.length - 1}
                        aria-label="Geser foto ke bawah"
                        className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGaleriFoto((prev) => prev.filter((_, i) => i !== idx))
                        }
                        aria-label="Hapus foto"
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
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
              disabled={isSaving || isProcessingImage}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{isSaving ? 'Menyimpan & Mengunggah...' : 'Simpan Blok'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
