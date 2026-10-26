'use client';

import React, { useState, useEffect } from 'react';
import { CalendarOff, X, Trash2, Save } from 'lucide-react';
import { HariLiburInfo } from '@/types/absensi';
import {
  KATEGORI_LIBUR_OPTIONS,
  getNamaHariDariTgl,
} from '@/lib/utils/absensiHelper';

interface ModalAturLiburProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  currentLibur: HariLiburInfo | null;
  onSave: (info: HariLiburInfo | null) => Promise<void>;
}

export default function ModalAturLibur({
  isOpen,
  onClose,
  selectedDate,
  currentLibur,
  onSave,
}: ModalAturLiburProps) {
  const [kategori, setKategori] = useState<string>('Libur Pondok');
  const [keterangan, setKeterangan] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentLibur) {
      setKategori(currentLibur.kategori || 'Libur Pondok');
      setKeterangan(currentLibur.keterangan || '');
    } else {
      setKategori('Libur Pondok');
      setKeterangan('');
    }
  }, [currentLibur, isOpen]);

  if (!isOpen) return null;

  const hari = getNamaHariDariTgl(selectedDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      tanggal: selectedDate,
      hari,
      kategori,
      keterangan: keterangan.trim() || kategori,
    });
    setSaving(false);
    onClose();
  };

  const handleCancelLibur = async () => {
    setSaving(true);
    await onSave(null);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Pengaturan Hari Libur / Event
              </h3>
              <p className="text-[11px] text-amber-800 font-medium">
                Nonaktifkan sesi KBM reguler pada tanggal terpilih
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tanggal KBM
            </label>
            <input
              type="text"
              readOnly
              value={`${hari}, ${selectedDate}`}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg text-slate-700 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kategori Libur / Event
            </label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
            >
              {KATEGORI_LIBUR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Keterangan / Nama Kegiatan
            </label>
            <textarea
              rows={3}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Libur Maulid Nabi / Ro'an Akbar Pondok..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
            {currentLibur ? (
              <button
                type="button"
                disabled={saving}
                onClick={handleCancelLibur}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Batalkan Libur
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Menyimpan...' : 'Simpan Status Libur'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
