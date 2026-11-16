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
} from 'lucide-react';
import {
  AnggotaKepengurusan,
  BAGIAN_KEPENGURUSAN_META,
  KategoriBagianKepengurusan,
  KELOMPOK_KEPENGURUSAN_META,
  KELOMPOK_KEPENGURUSAN_ORDER,
  KelompokKepengurusan,
  KepengurusanJabatan,
} from '@/types/kepengurusan';

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
    { id: 'ang-1', nama: '', sub_label: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    if (editingJabatan) {
      setNamaJabatan(editingJabatan.nama_jabatan);
      setKelompok(editingJabatan.kelompok);
      setKategoriBagian(editingJabatan.kategori_bagian);
      setSortOrder(editingJabatan.sort_order);
      setIsActive(editingJabatan.is_active !== false);
      setAnggota(
        editingJabatan.anggota.length > 0
          ? editingJabatan.anggota.map((a) => ({ ...a }))
          : [{ id: `ang-${Date.now()}`, nama: '', sub_label: '' }]
      );
    } else {
      setNamaJabatan('');
      setKelompok('pkm_dan_koordinator');
      setKategoriBagian('bersama');
      setSortOrder(100);
      setIsActive(true);
      setAnggota([{ id: `ang-${Date.now()}`, nama: '', sub_label: '' }]);
    }
  }, [isOpen, editingJabatan]);

  if (!isOpen) return null;

  const handleAddAnggota = () => {
    setAnggota((prev) => [
      ...prev,
      { id: `ang-${Date.now()}-${prev.length + 1}`, nama: '', sub_label: '' },
    ]);
  };

  const handleUpdateAnggota = (
    idx: number,
    field: 'nama' | 'sub_label',
    value: string
  ) => {
    setAnggota((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0b5751] to-[#137269] text-white">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-300" />
            <h2 className="text-base sm:text-lg font-extrabold font-serif">
              {editingJabatan ? 'Ubah Unit & Personalia Jabatan' : 'Tambah Unit Jabatan Baru'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {formError && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-4 py-3 text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
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

          {/* Daftar Anggota */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Daftar Personalia / Anggota
                </h3>
                <p className="text-[11px] text-slate-500">
                  Isi <strong>Sub-Label</strong> jika punya keterangan khusus (mis.{' '}
                  <code>Ebtadin</code>, <code>Blok 4</code>, <code>Ketua</code>). Kosongkan jika daftar biasa.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddAnggota}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Anggota</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {anggota.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700"
                >
                  <span className="text-xs font-bold text-slate-400 w-6 text-center shrink-0 hidden sm:inline">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={item.sub_label || ''}
                    onChange={(e) => handleUpdateAnggota(idx, 'sub_label', e.target.value)}
                    placeholder="Sub-Label (opsional)"
                    className="sm:w-40 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="text"
                    value={item.nama}
                    onChange={(e) => handleUpdateAnggota(idx, 'nama', e.target.value)}
                    placeholder="Nama Lengkap & Gelar (mis. Ust. ...)"
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white font-medium"
                  />
                  <div className="flex items-center justify-end gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveAnggota(idx, -1)}
                      disabled={idx === 0}
                      title="Geser ke atas"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveAnggota(idx, 1)}
                      disabled={idx === anggota.length - 1}
                      title="Geser ke bawah"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAnggota(idx)}
                      disabled={anggota.length <= 1}
                      title="Hapus anggota"
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Jabatan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
