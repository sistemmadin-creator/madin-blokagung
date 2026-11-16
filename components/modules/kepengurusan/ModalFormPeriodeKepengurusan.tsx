'use client';

import React, { useEffect, useState } from 'react';
import { X, CalendarRange, Save, Copy } from 'lucide-react';
import {
  getPeriodeMenuLabel,
  KepengurusanPeriode,
  slugifyPeriode,
} from '@/types/kepengurusan';
import {
  CopyPeriodeMode,
  CreatePeriodePayload,
  UpdatePeriodePayload,
} from '@/stores/useKepengurusanStore';

interface ModalFormPeriodeProps {
  isOpen: boolean;
  onClose: () => void;
  editingPeriode: KepengurusanPeriode | null;
  existingPeriodes: KepengurusanPeriode[];
  onSave: (
    payload: CreatePeriodePayload | UpdatePeriodePayload,
    editingId?: string
  ) => Promise<boolean>;
}

export default function ModalFormPeriodeKepengurusan({
  isOpen,
  onClose,
  editingPeriode,
  existingPeriodes,
  onSave,
}: ModalFormPeriodeProps) {
  const [namaPeriode, setNamaPeriode] = useState('');
  const [menuLabel, setMenuLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [labelTouched, setLabelTouched] = useState(false);
  const [sortOrder, setSortOrder] = useState<number>(10);
  const [catatan, setCatatan] = useState('');
  const [isCurrent, setIsCurrent] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [copyFromPeriodeId, setCopyFromPeriodeId] = useState('');
  const [copyMode, setCopyMode] = useState<CopyPeriodeMode>('with_members');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    if (editingPeriode) {
      setNamaPeriode(editingPeriode.nama_periode);
      setMenuLabel(getPeriodeMenuLabel(editingPeriode));
      setSlug(editingPeriode.slug || slugifyPeriode(editingPeriode.nama_periode, editingPeriode.id));
      setSortOrder(Number(editingPeriode.sort_order ?? 10));
      setCatatan(editingPeriode.catatan || '');
      setIsCurrent(editingPeriode.is_current);
      setIsActive(editingPeriode.is_active !== false);
      setSlugTouched(true);
      setLabelTouched(true);
      setCopyFromPeriodeId('');
    } else {
      setNamaPeriode('');
      setMenuLabel('');
      setSlug('');
      setSortOrder(10);
      setCatatan(
        'Personalia Kepengurusan Putra dan Putri Madrasah Diniyyah Al-Amiriyyah PP. Darussalam Blokagung Banyuwangi'
      );
      setIsCurrent(false);
      setIsActive(true);
      setSlugTouched(false);
      setLabelTouched(false);
      setCopyFromPeriodeId(existingPeriodes[0]?.id || '');
      setCopyMode('with_members');
    }
  }, [isOpen, editingPeriode, existingPeriodes]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNamaChange = (val: string) => {
    setNamaPeriode(val);
    if (!labelTouched) {
      setMenuLabel(val.trim() ? getPeriodeMenuLabel({ nama_periode: val }) : '');
    }
    if (!slugTouched) {
      setSlug(val.trim() ? slugifyPeriode(val) : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = namaPeriode.trim();
    const cleanSlug = slugifyPeriode(slug || menuLabel || cleanNama);
    const cleanLabel = (menuLabel || getPeriodeMenuLabel({ nama_periode: cleanNama })).trim();

    if (!cleanNama) {
      setFormError('Nama periode masa khidmah wajib diisi.');
      return;
    }

    const duplicateSlug = existingPeriodes.some(
      (p) =>
        p.id !== editingPeriode?.id &&
        (p.slug || slugifyPeriode(p.nama_periode, p.id)).toLowerCase() === cleanSlug.toLowerCase()
    );
    if (duplicateSlug) {
      setFormError(`Slug "${cleanSlug}" sudah dipakai periode lain. Gunakan slug yang unik.`);
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload: CreatePeriodePayload = {
      nama_periode: cleanNama,
      menu_label: cleanLabel,
      slug: cleanSlug,
      catatan: catatan.trim(),
      sort_order: Number(sortOrder) || 0,
      is_current: isCurrent,
      is_active: isCurrent ? true : isActive,
      ...(!editingPeriode && copyFromPeriodeId
        ? {
            copy_from_periode_id: copyFromPeriodeId,
            copy_mode: copyMode,
          }
        : {}),
    };

    const ok = await onSave(payload, editingPeriode?.id);
    setIsSaving(false);

    if (ok) {
      onClose();
    } else {
      setFormError('Gagal menyimpan data periode. Periksa koneksi atau otoritas edit.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-periode-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#0b5751] text-white">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-amber-300" aria-hidden="true" />
            <h2 id="modal-periode-title" className="text-base font-extrabold font-serif">
              {editingPeriode ? 'Ubah Periode Masa Khidmah' : 'Tambah Periode Masa Khidmah'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal periode"
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Periode Masa Khidmah *
            </label>
            <input
              type="text"
              required
              value={namaPeriode}
              onChange={(e) => handleNamaChange(e.target.value)}
              placeholder="Contoh: 1447-1448 H / 2026-2027 M"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Label Sub-Menu Navbar *
              </label>
              <input
                type="text"
                required
                value={menuLabel}
                onChange={(e) => {
                  setLabelTouched(true);
                  setMenuLabel(e.target.value);
                }}
                placeholder="Kepengurusan 2026-2027"
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Urutan Sub-Menu
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Slug URL Halaman Publik *
            </label>
            <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 overflow-hidden">
              <span className="px-3 text-xs font-mono text-slate-600 dark:text-slate-300 border-r border-slate-300 dark:border-slate-700 select-none">
                /kepengurusan/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
                }}
                placeholder="2026-2027"
                className="flex-1 min-h-[42px] px-3 py-2 bg-white dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Keterangan / Subjudul
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="space-y-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3.5">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsCurrent(checked);
                  if (checked) setIsActive(true);
                }}
                className="w-4 h-4 mt-0.5 rounded text-emerald-700"
              />
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                Jadikan periode aktif utama sekarang (selalu tampil paling atas di sub-menu)
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
                Tampilkan di halaman &amp; sub-menu publik (maks. 3 periode aktif terakhir tampil di navbar)
              </span>
            </label>
          </div>

          {!editingPeriode && existingPeriodes.length > 0 && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Salin Struktur dari Periode Sebelumnya (Opsional)</span>
              </div>

              <select
                aria-label="Sumber periode yang disalin"
                value={copyFromPeriodeId}
                onChange={(e) => setCopyFromPeriodeId(e.target.value)}
                className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-100"
              >
                <option value="">Jangan salin (buat struktur kosong)</option>
                {existingPeriodes.map((p) => (
                  <option key={p.id} value={p.id}>
                    Salin dari: {p.nama_periode}
                  </option>
                ))}
              </select>

              {copyFromPeriodeId && (
                <div className="flex flex-col sm:flex-row gap-2 text-xs">
                  <label className="flex-1 flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                    <input
                      type="radio"
                      name="copyMode"
                      checked={copyMode === 'with_members'}
                      onChange={() => setCopyMode('with_members')}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      Salin jabatan &amp; nama personalia
                    </span>
                  </label>
                  <label className="flex-1 flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer">
                    <input
                      type="radio"
                      name="copyMode"
                      checked={copyMode === 'structure_only'}
                      onChange={() => setCopyMode('structure_only')}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      Salin unit jabatan saja
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Periode'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
