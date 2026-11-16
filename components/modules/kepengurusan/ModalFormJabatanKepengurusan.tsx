'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Users,
  Upload,
  User,
  Loader2,
} from 'lucide-react';
import {
  AnggotaKepengurusan,
  BAGIAN_KEPENGURUSAN_META,
  KategoriBagianKepengurusan,
  KELOMPOK_KEPENGURUSAN_META,
  KELOMPOK_KEPENGURUSAN_ORDER,
  KelompokKepengurusan,
  KepengurusanJabatan,
  sanitizeMemberPhotoUrl,
} from '@/types/kepengurusan';
import { compressImageFile } from '@/lib/utils/image';

interface ModalFormJabatanProps {
  isOpen: boolean;
  onClose: () => void;
  periodeId: string;
  editingJabatan: KepengurusanJabatan | null;
  onSubmit: (
    payload: Omit<KepengurusanJabatan, 'id' | 'created_at' | 'updated_at'>,
    editingId?: string
  ) => Promise<boolean>;
}

const ALLOWED_INPUT_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export default function ModalFormJabatanKepengurusan({
  isOpen,
  onClose,
  periodeId,
  editingJabatan,
  onSubmit,
}: ModalFormJabatanProps) {
  const [namaJabatan, setNamaJabatan] = useState('');
  const [kelompok, setKelompok] = useState<KelompokKepengurusan>('pkm_dan_koordinator');
  const [kategoriBagian, setKategoriBagian] = useState<KategoriBagianKepengurusan>('bersama');
  const [sortOrder, setSortOrder] = useState<number>(100);
  const [isActive, setIsActive] = useState(true);
  const [anggota, setAnggota] = useState<AnggotaKepengurusan[]>([
    { id: 'ang-1', nama: '', sub_label: '', catatan: '', foto_url: '' },
  ]);
  const [processingPhotoIdx, setProcessingPhotoIdx] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setProcessingPhotoIdx(null);
    if (editingJabatan) {
      setNamaJabatan(editingJabatan.nama_jabatan);
      setKelompok(editingJabatan.kelompok);
      setKategoriBagian(editingJabatan.kategori_bagian);
      setSortOrder(editingJabatan.sort_order);
      setIsActive(editingJabatan.is_active !== false);
      setAnggota(
        editingJabatan.anggota.length > 0
          ? editingJabatan.anggota.map((a) => ({
              ...a,
              sub_label: a.sub_label || '',
              catatan: a.catatan || '',
              foto_url: sanitizeMemberPhotoUrl(a.foto_url),
            }))
          : [{ id: `ang-${Date.now()}`, nama: '', sub_label: '', catatan: '', foto_url: '' }]
      );
    } else {
      setNamaJabatan('');
      setKelompok('pkm_dan_koordinator');
      setKategoriBagian('bersama');
      setSortOrder(100);
      setIsActive(true);
      setAnggota([
        { id: `ang-${Date.now()}`, nama: '', sub_label: '', catatan: '', foto_url: '' },
      ]);
    }
  }, [isOpen, editingJabatan]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleAddAnggota = () => {
    setAnggota((prev) => [
      ...prev,
      {
        id: `ang-${Date.now()}-${prev.length + 1}`,
        nama: '',
        sub_label: '',
        catatan: '',
        foto_url: '',
      },
    ]);
  };

  const handleUpdateAnggota = (
    idx: number,
    field: 'nama' | 'sub_label' | 'catatan' | 'foto_url',
    value: string
  ) => {
    setAnggota((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleFotoUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const mime = String(file.type || '').toLowerCase();
    if (!ALLOWED_INPUT_MIME.has(mime)) {
      setFormError('Format foto harus JPG, PNG, atau WEBP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError('Ukuran file mentah terlalu besar (maksimal 10 MB sebelum kompresi).');
      return;
    }

    try {
      setFormError(null);
      setProcessingPhotoIdx(idx);
      const compressedDataUrl = await compressImageFile(file, 600, 0.8);
      handleUpdateAnggota(idx, 'foto_url', compressedDataUrl);
    } catch {
      setFormError('Gagal memproses foto. Pastikan file gambar tidak rusak.');
    } finally {
      setProcessingPhotoIdx(null);
    }
  };

  const handleRemoveAnggota = (idx: number) => {
    setAnggota((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const handleMoveAnggota = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= anggota.length) return;
    setAnggota((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaJabatan.trim()) {
      setFormError('Nama unit / jabatan wajib diisi.');
      return;
    }

    const cleanedAnggota = anggota
      .map((a) => ({
        ...a,
        nama: a.nama.trim(),
        sub_label: a.sub_label?.trim() || '',
        catatan: a.catatan?.trim() || '',
        foto_url: sanitizeMemberPhotoUrl(a.foto_url),
      }))
      .filter((a) => a.nama.length > 0);

    if (cleanedAnggota.length === 0) {
      setFormError('Minimal harus ada 1 nama pengurus.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    const ok = await onSubmit(
      {
        periode_id: editingJabatan?.periode_id || periodeId,
        kelompok,
        kategori_bagian: kategoriBagian,
        nama_jabatan: namaJabatan.trim(),
        sort_order: Number(sortOrder) || 0,
        anggota: cleanedAnggota,
        is_active: isActive,
      },
      editingJabatan?.id
    );
    setIsSubmitting(false);

    if (ok) {
      onClose();
    } else {
      setFormError('Gagal menyimpan data jabatan. Periksa koneksi atau otoritas edit.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-jabatan-title"
      onClick={() => !isSubmitting && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0b5751] to-[#137269] text-white">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-300" aria-hidden="true" />
            <h2 id="modal-jabatan-title" className="text-base sm:text-lg font-extrabold font-serif">
              {editingJabatan ? 'Ubah Unit & Personalia Jabatan' : 'Tambah Unit Jabatan Baru'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup modal"
            className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg hover:bg-white/15 cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {formError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-4 py-3 text-xs sm:text-sm font-semibold text-rose-800 dark:text-rose-200"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Jabatan / Unit *
              </label>
              <input
                type="text"
                required
                value={namaJabatan}
                onChange={(e) => setNamaJabatan(e.target.value)}
                placeholder="Contoh: PKM. KURIKULUM, KOOR. UNGGULAN, PELINDUNG"
                className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Tingkat / Kelompok Hierarki
              </label>
              <select
                value={kelompok}
                onChange={(e) => setKelompok(e.target.value as KelompokKepengurusan)}
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              >
                {KELOMPOK_KEPENGURUSAN_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {KELOMPOK_KEPENGURUSAN_META[key].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Bagian (Tampil Pada Tab)
              </label>
              <select
                value={kategoriBagian}
                onChange={(e) =>
                  setKategoriBagian(e.target.value as KategoriBagianKepengurusan)
                }
                className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              >
                {(['bersama', 'putra', 'putri'] as KategoriBagianKepengurusan[]).map((k) => (
                  <option key={k} value={k}>
                    {BAGIAN_KEPENGURUSAN_META[k].label}
                  </option>
                ))}
              </select>
            </div>

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
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Tampilkan di halaman publik
                </span>
              </label>
            </div>
          </div>

          {/* Daftar Anggota & Upload Foto */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Daftar Personalia / Anggota &amp; Foto Profil
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                  Unggah foto (JPG/PNG/WEBP, otomatis dikompresi) agar tampil saat kartu diklik di halaman publik.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddAnggota}
                className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tambah Anggota</span>
              </button>
            </div>

            <div className="space-y-3">
              {anggota.map((item, idx) => {
                const safePhoto = sanitizeMemberPhotoUrl(item.foto_url);
                const isProcessing = processingPhotoIdx === idx;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {/* Area Preview & Upload Foto */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-5 text-center">
                          {idx + 1}.
                        </span>
                        <div className="w-14 h-16 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                          {isProcessing ? (
                            <Loader2 className="w-5 h-5 text-emerald-700 animate-spin" />
                          ) : safePhoto ? (
                            <img
                              src={safePhoto}
                              alt={`Preview ${item.nama || 'pengurus'}`}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <User className="w-6 h-6 text-slate-400" aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="min-h-[34px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-[11px] font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer">
                            <Upload className="w-3 h-3" aria-hidden="true" />
                            <span>{safePhoto ? 'Ganti Foto' : 'Upload Foto'}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={(e) => handleFotoUpload(idx, e)}
                              className="hidden"
                            />
                          </label>
                          {safePhoto && (
                            <button
                              type="button"
                              onClick={() => handleUpdateAnggota(idx, 'foto_url', '')}
                              className="min-h-[28px] inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" aria-hidden="true" />
                              <span>Hapus Foto</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Input Nama & Sub-label */}
                      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={item.sub_label || ''}
                          onChange={(e) => handleUpdateAnggota(idx, 'sub_label', e.target.value)}
                          placeholder="Sub-Label (opsional)"
                          aria-label={`Sub-label anggota ${idx + 1}`}
                          className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                        />
                        <input
                          type="text"
                          value={item.nama}
                          onChange={(e) => handleUpdateAnggota(idx, 'nama', e.target.value)}
                          placeholder="Nama Lengkap & Gelar (mis. Ust. ...)"
                          aria-label={`Nama lengkap anggota ${idx + 1}`}
                          className="sm:col-span-2 min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white font-medium"
                        />
                        <input
                          type="text"
                          value={item.catatan || ''}
                          onChange={(e) => handleUpdateAnggota(idx, 'catatan', e.target.value)}
                          placeholder="Catatan / keterangan singkat untuk pop-up (opsional)"
                          aria-label={`Catatan anggota ${idx + 1}`}
                          className="sm:col-span-3 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
                        />
                      </div>

                      {/* Kontrol Urutan & Hapus */}
                      <div className="flex items-center justify-end gap-1 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleMoveAnggota(idx, -1)}
                          disabled={idx === 0}
                          aria-label="Geser anggota ke atas"
                          title="Geser ke atas"
                          className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveAnggota(idx, 1)}
                          disabled={idx === anggota.length - 1}
                          aria-label="Geser anggota ke bawah"
                          title="Geser ke bawah"
                          className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAnggota(idx)}
                          disabled={anggota.length <= 1}
                          aria-label="Hapus anggota"
                          title="Hapus anggota"
                          className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || processingPhotoIdx !== null}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{isSubmitting ? 'Menyimpan & Mengunggah...' : 'Simpan Jabatan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
