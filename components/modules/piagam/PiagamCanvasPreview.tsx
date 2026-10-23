'use client';

import React from 'react';

export default function PiagamCanvasPreview() {
  return (
    <div className="w-full aspect-[1.414/1] bg-white border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden">
      <div className="text-center p-6 space-y-2">
        <h4 className="text-lg font-serif font-bold text-slate-800">PIAGAM PENGHARGAAN MUHAFADZOH</h4>
        <p className="text-xs text-slate-500">Pratinjau visual koordinat dan format teks sertifikat santri</p>
      </div>
    </div>
  );
}
