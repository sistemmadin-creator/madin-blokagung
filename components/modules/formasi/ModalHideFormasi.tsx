'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { EyeOff, CheckSquare, Square } from 'lucide-react';

const FORMASI_COLUMNS = [
  { id: 1, name: 'Tingkat' },
  { id: 2, name: 'Kelas' },
  { id: 3, name: 'Bagian' },
  { id: 4, name: 'Gender' },
  { id: 5, name: 'Kapasitas' },
  { id: 6, name: 'Wali Kelas' },
  { id: 7, name: 'Domisili' },
  { id: 8, name: 'Blok Takror' },
  { id: 9, name: 'Lokal Takror' },
  { id: 10, name: 'Blok Diniyyah' },
  { id: 11, name: 'Lokasi Diniyyah' },
];

export default function ModalHideFormasi({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { hiddenColumns, setHiddenColumns } = useFormasiStore();
  const [selectedHidden, setSelectedHidden] = useState<number[]>([]);

  useEffect(() => {
    setSelectedHidden(hiddenColumns || []);
  }, [hiddenColumns, isOpen]);

  const toggleCol = (id: number) => {
    setSelectedHidden((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (hideAll: boolean) => {
    if (hideAll) {
      setSelectedHidden(FORMASI_COLUMNS.map((c) => c.id));
    } else {
      setSelectedHidden([]);
    }
  };

  const handleApply = () => {
    setHiddenColumns(selectedHidden);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Sembunyikan Kolom Formasi"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-slate-500" />
            <span>Pilih kolom yang ingin disembunyikan dari tabel master.</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="text-[11px] font-semibold text-madin-700 hover:underline"
            >
              Semua
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="text-[11px] font-semibold text-slate-500 hover:underline"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FORMASI_COLUMNS.map((col) => {
            const isHidden = selectedHidden.includes(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleCol(col.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition ${
                  isHidden
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{col.name}</span>
                {isHidden ? (
                  <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-300" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-xs"
          >
            Terapkan ({selectedHidden.length} Disembunyikan)
          </button>
        </div>
      </div>
    </Dialog>
  );
}
