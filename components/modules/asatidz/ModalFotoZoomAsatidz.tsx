'use client';

import React from 'react';
import { X, Download, UserCheck } from 'lucide-react';
import { useAsatidzStore } from '@/stores/useAsatidzStore';

export default function ModalFotoZoomAsatidz() {
  const { isFotoZoomOpen, zoomFotoData, closeFotoZoom } = useAsatidzStore();

  if (!isFotoZoomOpen || !zoomFotoData?.url) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = zoomFotoData.url;
    link.download = `Foto_Asatidz_${zoomFotoData.nia || 'Madin'}_${(zoomFotoData.nama || 'Asatidz').replace(/\s+/g, '_')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={closeFotoZoom}
    >
      <div
        className="relative max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Lightbox */}
        <div className="w-full px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="truncate pr-2">
            <h3 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>{zoomFotoData.nama}</span>
            </h3>
            {zoomFotoData.nia && (
              <p className="text-[11px] font-mono text-emerald-400">NIA: {zoomFotoData.nia}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleDownload}
              title="Unduh Foto Asatidz"
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={closeFotoZoom}
              title="Tutup (Esc)"
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-900/50 hover:text-rose-300 text-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Gambar Foto */}
        <div className="p-4 flex items-center justify-center max-h-[75vh] w-full overflow-hidden bg-black/40">
          <img
            src={zoomFotoData.url}
            alt={zoomFotoData.nama}
            className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
          />
        </div>

        {/* Footer Ringkas */}
        <div className="w-full px-4 py-2.5 bg-slate-950/70 border-t border-slate-800 text-center">
          <span className="text-[11px] text-slate-400">
            Foto Profil Resmi Dewan Asatidz Madrasah Diniyyah
          </span>
        </div>
      </div>
    </div>
  );
}
