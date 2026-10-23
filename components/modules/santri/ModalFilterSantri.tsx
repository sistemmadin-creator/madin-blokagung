'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalFilterSantri({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Filter Lanjutan Data Santri (16 Kategori)" maxWidth="xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Pilih kriteria filter untuk menyaring data santri secara akurat.</p>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200">Batal</button>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg bg-madin-700 text-white">Terapkan Filter</button>
        </div>
      </div>
    </Dialog>
  );
}
