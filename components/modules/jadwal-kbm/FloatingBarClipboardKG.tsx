'use client';

import React, { useEffect } from 'react';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { Scissors, XCircle } from 'lucide-react';
import { ambilNamaFanSingkat } from '@/lib/utils/jadwalHelper';

export default function FloatingBarClipboardKG() {
  const { stateClipboardKG, batalkanModePindahKG } = useJadwalStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stateClipboardKG) {
        batalkanModePindahKG();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stateClipboardKG, batalkanModePindahKG]);

  if (!stateClipboardKG) return null;

  const k = stateClipboardKG.classObj;
  const fanTampil = ambilNamaFanSingkat(stateClipboardKG.fan, k?.tingkat || '', k?.kls || '');
  const labelKelas = k ? `${k.kls} ${k.bag} ${k.tingkat} (${k.papi})` : stateClipboardKG.kelasKey;

  return (
    <div
      id="floatingBarClipboardKG"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400/40 backdrop-blur-md flex items-center gap-4 max-w-[92vw] sm:max-w-xl animate-in slide-in-from-bottom duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="inline-flex items-center gap-1 bg-amber-400 text-amber-950 font-bold text-xs px-2.5 py-1 rounded-full shrink-0 shadow-sm">
          <Scissors className="w-3.5 h-3.5" />
          CUT
        </span>
        <div className="text-xs sm:text-sm truncate">
          <span className="text-slate-400">Mode Pindah: </span>
          <span className="font-bold text-amber-300">{stateClipboardKG.guru}</span>{' '}
          <span className="text-slate-300">({fanTampil})</span>
          <span className="text-slate-400"> • </span>
          <span className="text-slate-200">{labelKelas}</span>
          <span className="text-slate-400"> • </span>
          <span className="text-emerald-400 font-semibold">{stateClipboardKG.hari} Jam {stateClipboardKG.jam}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={batalkanModePindahKG}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-full shrink-0 transition-colors shadow-sm"
      >
        <XCircle className="w-3.5 h-3.5" />
        <span>Batal (Esc)</span>
      </button>
    </div>
  );
}
