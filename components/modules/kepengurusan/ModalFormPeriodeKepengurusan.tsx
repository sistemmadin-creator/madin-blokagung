'use client';

import React, { useEffect, useState } from 'react';
import { X, CalendarRange, Save } from 'lucide-react';
import { KepengurusanPeriode } from '@/types/kepengurusan';

interface ModalFormPeriodeProps {
  isOpen: boolean;
  onClose: () => void;
  editingPeriode: KepengurusanPeriode | null;
  onSave: (
    payload: { nama_periode: string; catatan: string; is_current: boolean },
    editingId?: string
  ) => Promise<boolean>;
}

export default function ModalFormPeriodeKepengurusan({
  isOpen,
  onClose,
  editingPeriode,
  onSave,
}: ModalFormPeriodeProps) {
  const [namaPeriode, setNamaPeriode] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isCurrent, setIsCurrent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingPeriode) {
      setNamaPeriode(editingPeriode.nama_periode);
      setCatatan(editingPeriode.catatan || '');
      setIsCurrent(editingPeriode.is_current);
    } else {
      setNamaPeriode('');
      setCatatan(
        'Personalia Kepengurusan Putra dan Putri Madrasah Diniyyah Al-Amiriyyah PP. Darussalam Blokagung Banyuwangi'
      );
      setIsCurrent(false);
    }
  }, [isOpen, editingPeriode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPeriode.trim()) return;
    setIsSaving(true);
    const ok = await onSave(
      {
        nama_periode: namaPeriode.trim(),
        catatan: catatan.trim(),
        is_current: isCurrent,
      },
      editingPeriode?.id
    );
    setIsSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#0b5751] text-white">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-amber-300" />
            <h2 className="text-base font-extrabold font-serif">
              {editingPeriode ? 'Ubah Periode Masa Khidmah' : 'Tambah Periode Masa Khidmah'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal periode"
            className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Nama Periode Masa Khidmah *
            </label>
            <input
              type="text"
              required
              value={namaPeriode}
              onChange={(e) => setNamaPeriode(e.target.value)}
              placeholder="Contoh: 1447-1448 H / 2026-2027 M"
              className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Keterangan / Subjudul
            </label>
            <textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-700"
            />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Jadikan periode aktif utama di halaman publik
            </span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-60 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Periode'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
