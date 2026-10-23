'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { Save, Trash2 } from 'lucide-react';

export default function ModalAturLibur({
  isOpen,
  onClose,
  targetDate,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetDate: string;
}) {
  const { liburMapByDate, setHariLibur, hapusHariLibur } = useAbsensiStore();

  const existingLibur = liburMapByDate[targetDate];

  const [kategori, setKategori] = useState(existingLibur?.kategori || 'Libur Nasional');
  const [keterangan, setKeterangan] = useState(existingLibur?.keterangan || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await setHariLibur(targetDate, { kategori, keterangan });
    setIsSubmitting(false);
    if (success) onClose();
  };

  const handleHapus = async () => {
    if (!confirm('Hapus status hari libur untuk tanggal ini? KBM akan kembali aktif.')) return;
    setIsSubmitting(true);
    const success = await hapusHariLibur(targetDate);
    setIsSubmitting(false);
    if (success) onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Pengaturan Hari Libur Madin (${targetDate})`}
      maxWidth="sm"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Hari Libur</label>
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white"
          >
            <option value="Libur Nasional">Libur Nasional</option>
            <option value="Hari Besar Islam">Hari Besar Islam</option>
            <option value="Libur Khusus Pondok">Libur Khusus Pondok</option>
            <option value="Kegiatan / Ujian Diniyyah">Kegiatan / Ujian Diniyyah</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Alasan Libur</label>
          <textarea
            rows={3}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Tuliskan keterangan bila ada..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
          />
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          {existingLibur ? (
            <button
              type="button"
              onClick={handleHapus}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Libur</span>
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Status</span>
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
