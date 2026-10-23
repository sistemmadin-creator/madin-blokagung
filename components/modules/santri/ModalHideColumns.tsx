'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import { useSantriStore } from '@/stores/useSantriStore';
import { SANTRI_COLUMNS } from '@/types/santri';
import { Eye, EyeOff } from 'lucide-react';

export default function ModalHideColumns() {
  const {
    isHideModalOpen,
    closeHideModal,
    hiddenColumns,
    toggleColumn,
    hideAllColumns,
    showAllColumns,
  } = useSantriStore();

  const allKeys = SANTRI_COLUMNS.map((c) => c.key as string);

  return (
    <Dialog
      isOpen={isHideModalOpen}
      onClose={closeHideModal}
      title="Kelola Tampilan Kolom Tabel Santri (34 Kolom)"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <p className="text-xs text-slate-500">
            Centang kolom yang ingin ditampilkan di tabel. Kolom <strong>Nama Lengkap</strong> terkunci.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => hideAllColumns(allKeys)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <EyeOff className="w-3 h-3" />
              Sembunyikan Semua
            </button>
            <button
              onClick={showAllColumns}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-emerald-700 bg-emerald-50"
            >
              <Eye className="w-3 h-3" />
              Tampilkan Semua
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto p-1">
          {SANTRI_COLUMNS.map((col) => {
            const isHidden = hiddenColumns.includes(col.key as string);
            const isLocked = col.locked;

            return (
              <label
                key={col.key}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                  isLocked
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                    : isHidden
                    ? 'bg-slate-50 border-slate-200 text-slate-400'
                    : 'bg-white border-emerald-200 text-slate-800 shadow-2xs'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={isLocked}
                  checked={!isHidden}
                  onChange={() => !isLocked && toggleColumn(col.key as string)}
                  className="rounded border-slate-300 text-madin-700 focus:ring-madin-600"
                />
                <span className="truncate">{col.label}</span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            {SANTRI_COLUMNS.length - hiddenColumns.length} dari {SANTRI_COLUMNS.length} kolom ditampilkan
          </span>
          <button
            onClick={closeHideModal}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm"
          >
            Selesai
          </button>
        </div>
      </div>
    </Dialog>
  );
}
