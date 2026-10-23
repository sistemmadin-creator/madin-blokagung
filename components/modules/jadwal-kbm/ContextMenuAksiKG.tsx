'use client';

import React from 'react';

export default function ContextMenuAksiKG({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[200px] text-xs">
        <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 font-medium">Edit Jadwal</button>
        <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-medium">Hapus Slot</button>
      </div>
    </div>
  );
}
