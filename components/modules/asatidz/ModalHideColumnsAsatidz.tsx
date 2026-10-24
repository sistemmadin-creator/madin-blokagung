'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { ASATIDZ_TABLE_COLUMNS } from '@/types/asatidz';
import { Eye, EyeOff } from 'lucide-react';

export default function ModalHideColumnsAsatidz() {
  const {
    isHideModalOpen,
    closeHideModal,
    hiddenColumns,
    toggleColumn,
    hideAllColumns,
    showAllColumns,
  } = useAsatidzStore();

  const hideableKeys = ASATIDZ_TABLE_COLUMNS.filter((c) => !c.locked).map((c) => c.key);

  const handleHideAll = () => {
    hideAllColumns(hideableKeys);
  };

  const visibleCount = ASATIDZ_TABLE_COLUMNS.length - hiddenColumns.length;

  return (
    <Dialog
      isOpen={isHideModalOpen}
      onClose={closeHideModal}
      title="Kelola Tampilan Kolom Database Asatidz"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Banner Instruksi & Aksi Cepat */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs text-slate-600">
            Centang kolom yang ingin ditampilkan di tabel. Kolom <strong>NO</strong> dan <strong>NAMA ASATIDZ</strong> dikunci.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleHideAll}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Sembunyikan Semua</span>
            </button>
            <button
              type="button"
              onClick={showAllColumns}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-emerald-200 hover:bg-emerald-100 text-emerald-800 bg-emerald-50 transition"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tampilkan Semua</span>
            </button>
          </div>
        </div>

        {/* Grid Checkbox Kolom */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto p-1">
          {ASATIDZ_TABLE_COLUMNS.map((col) => {
            const isHidden = hiddenColumns.includes(col.key);
            const isLocked = !!col.locked;

            return (
              <label
                key={col.key}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                  isLocked
                    ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
                    : isHidden
                    ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                    : 'bg-white border-emerald-300 ring-1 ring-emerald-500/20 text-slate-800 shadow-2xs'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={isLocked}
                  checked={!isHidden}
                  onChange={() => !isLocked && toggleColumn(col.key)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-medium truncate">{col.label}</span>
                {isLocked && (
                  <span className="text-[10px] text-slate-400 ml-auto">(Terkunci)</span>
                )}
              </label>
            );
          })}
        </div>

        {/* Footer Modal */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            <strong>{visibleCount}</strong> dari <strong>{ASATIDZ_TABLE_COLUMNS.length}</strong> kolom aktif ditampilkan
          </span>
          <button
            type="button"
            onClick={closeHideModal}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white shadow-sm transition"
          >
            Simpan Tampilan
          </button>
        </div>
      </div>
    </Dialog>
  );
}
