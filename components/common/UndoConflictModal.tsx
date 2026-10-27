'use client';

import React, { useEffect } from 'react';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import { AlertTriangle, X, ShieldAlert, Check, RefreshCw } from 'lucide-react';

export default function UndoConflictModal() {
  const { activeConflict, closeConflict } = useUndoRedoStore();

  useEffect(() => {
    if (!activeConflict) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeConflict();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeConflict, closeConflict]);

  if (!activeConflict) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-amber-200/80 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center gap-2.5 text-amber-800">
            <div className="p-2 bg-amber-100/90 rounded-xl text-amber-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 id="conflict-modal-title" className="text-base font-bold leading-tight">
                {activeConflict.title || 'Peringatan Konflik Multi-Pengguna'}
              </h2>
              <p className="text-xs text-amber-700 font-medium">
                Pemeriksaan Konkurensi Optimistic (OCC)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeConflict}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-slate-700 text-sm">
          {activeConflict.entityName && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200/80 text-slate-800 rounded-lg text-xs font-semibold">
              <span className="text-slate-500">Target Entitas:</span>
              <span className="truncate max-w-[300px]">{activeConflict.entityName}</span>
            </div>
          )}

          <p className="leading-relaxed text-slate-600">
            {activeConflict.message ||
              'Data ini telah diperbarui oleh pengguna lain di server setelah aksi Anda dicatat. Jika Anda memaksakan Undo, perubahan terbaru dari pengguna lain berpotensi tertimpa.'}
          </p>

          {/* Perbandingan State (Bila Tersedia) */}
          {(activeConflict.currentServerState || activeConflict.proposedUndoState) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <span className="font-semibold text-slate-500 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-sky-600" />
                  Kondisi di Server Terkini:
                </span>
                <p className="font-mono text-slate-800 break-words line-clamp-3">
                  {activeConflict.currentServerState || '(Telah Diperbarui)'}
                </p>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs space-y-1">
                <span className="font-semibold text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Akan Dikembalikan ke (Undo):
                </span>
                <p className="font-mono text-amber-900 break-words line-clamp-3">
                  {activeConflict.proposedUndoState || '(Nilai Sebelum Aksi Anda)'}
                </p>
              </div>
            </div>
          )}

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 leading-normal">
            💡 <strong>Rekomendasi Aman:</strong> Pilih <strong>Batalkan Undo</strong> untuk
            mempertahankan data server pengguna lain, atau pilih <strong>Paksa Undo</strong> hanya jika
            Anda yakin ingin memprioritaskan versi Anda.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={activeConflict.onCancel}
            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer shadow-xs"
          >
            Batalkan Undo (Pertahankan Data Server)
          </button>

          <button
            type="button"
            onClick={activeConflict.onForce}
            className="w-full sm:w-auto px-4 py-2 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-500 active:bg-amber-700 transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Paksa Undo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
