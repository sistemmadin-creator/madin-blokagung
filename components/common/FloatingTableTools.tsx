'use client';

import React, { useRef, useEffect } from 'react';
import {
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useTableViewerStore } from '@/stores/useTableViewerStore';

interface FloatingTableToolsProps {
  currentDisplayScale?: number;
}

export default function FloatingTableTools({
  currentDisplayScale,
}: FloatingTableToolsProps) {
  const {
    isFloatingToolsVisible,
    setFloatingToolsVisible,
    zoomScale,
    zoomMode,
    zoomIn,
    zoomOut,
    resetZoom,
    setFitToScreen,
    searchQuery,
    setSearchQuery,
    totalMatches,
    activeMatchIndex,
    nextMatch,
    prevMatch,
  } = useTableViewerStore();

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isFloatingToolsVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isFloatingToolsVisible]);

  if (!isFloatingToolsVisible) return null;

  // Percentage display calculation
  const displayedPercentage = Math.round(
    (currentDisplayScale !== undefined ? currentDisplayScale : zoomScale) * 100
  );

  return (
    <aside
      aria-label="Panel Alat Bantu Tabel"
      className="fixed bottom-22 left-4 right-4 max-w-md mx-auto z-45 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] border border-slate-700/80 p-3 select-none animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      {/* Baris 1: Pencarian Cepat Tabel */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
        <div className="relative flex-1 flex items-center">
          <Search className="w-4 h-4 text-emerald-400 absolute left-2.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ustadz, kitab, kelas..."
            aria-label="Kata kunci pencarian tabel"
            className="w-full bg-slate-800/90 text-slate-100 placeholder-slate-400 text-xs rounded-xl pl-8 pr-7 py-2 border border-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-slate-400 hover:text-white p-0.5 rounded-full"
              title="Hapus pencarian"
              aria-label="Hapus kata kunci pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Counter & Navigasi Pencarian */}
        {searchQuery.trim().length > 0 && (
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl px-2 py-1 border border-slate-700 text-[11px]">
            <span className="font-semibold text-emerald-300">
              {totalMatches > 0
                ? `${activeMatchIndex + 1}/${totalMatches}`
                : '0'}
            </span>
            <button
              type="button"
              onClick={prevMatch}
              disabled={totalMatches <= 0}
              className="p-1 text-slate-300 hover:text-white disabled:opacity-30 rounded-md transition"
              title="Hasil Sebelumnya"
              aria-label="Hasil pencarian sebelumnya"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={nextMatch}
              disabled={totalMatches <= 0}
              className="p-1 text-slate-300 hover:text-white disabled:opacity-30 rounded-md transition"
              title="Hasil Berikutnya"
              aria-label="Hasil pencarian berikutnya"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tombol Tutup Floating Toolbar */}
        <button
          type="button"
          onClick={() => setFloatingToolsVisible(false)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          title="Tutup Panel Alat"
          aria-label="Tutup panel alat mengambang"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Baris 2: Kontrol Zoom Khusus Tabel */}
      <div className="flex items-center justify-between gap-2 pt-2.5">
        {/* Tombol Stepper Zoom (- dan +) */}
        <div className="flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-slate-700/80">
          <button
            type="button"
            onClick={zoomOut}
            className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-700/70 rounded-lg active:scale-95 transition"
            title="Perkecil Tabel"
            aria-label="Perkecil skala tabel"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span
            className="w-12 text-center text-[11px] font-bold tracking-tight text-emerald-400"
            title="Skala Zoom Aktif"
            aria-live="polite"
          >
            {zoomMode === 'fit' ? 'Fit' : `${displayedPercentage}%`}
          </span>

          <button
            type="button"
            onClick={zoomIn}
            className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-white hover:bg-slate-700/70 rounded-lg active:scale-95 transition"
            title="Perbesar Tabel"
            aria-label="Perbesar skala tabel"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcut Mode Zoom (Pas Layar & 100%) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={setFitToScreen}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
              zoomMode === 'fit'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Sesuaikan ukuran tabel selebar layar HP"
            aria-label="Mode zoom pas layar HP"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Pas Layar</span>
          </button>

          <button
            type="button"
            onClick={resetZoom}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
              zoomMode === '100'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700/60'
            }`}
            title="Reset ukuran tabel ke 100% (tajam & normal)"
            aria-label="Reset zoom tabel ke 100 persen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>100%</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
