'use client';

import React from 'react';
import { X, Download, User } from 'lucide-react';

interface ModalFotoZoomProps {
  isOpen: boolean;
  onClose: () => void;
  fotoUrl?: string;
  nama?: string;
  noInduk?: string;
}

export default function ModalFotoZoom({
  isOpen,
  onClose,
  fotoUrl,
  nama = 'Santri',
  noInduk,
}: ModalFotoZoomProps) {
  if (!isOpen || !fotoUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fotoUrl;
    link.download = `Foto_Santri_${noInduk || 'Madin'}_${nama.replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Lightbox */}
        <div className="w-full px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="truncate pr-2">
            <h3 className="text-sm font-bold text-white truncate">{nama}</h3>
            {noInduk && (
              <p className="text-[11px] font-mono text-slate-400">No. Induk: {noInduk}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDownload}
              title="Unduh Foto Santri"
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Tutup (Esc)"
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-600 text-slate-200 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gambar Foto Penuh */}
        <div className="p-6 flex items-center justify-center max-h-[70vh] w-full overflow-hidden">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={nama}
              className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-lg border border-slate-700"
            />
          ) : (
            <div className="w-48 h-64 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500">
              <User className="w-12 h-12 mb-2 opacity-50" />
              <span className="text-xs">Foto tidak tersedia</span>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="w-full px-4 py-2.5 bg-slate-800/50 border-t border-slate-800 text-center text-[11px] text-slate-400">
          Klik di luar atau tombol × untuk menutup lightbox
        </div>
      </div>
    </div>
  );
}
