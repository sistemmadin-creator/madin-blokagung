'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalHideColumns({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Sembunyikan / Tampilkan Kolom (34 Kolom)" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Centang kolom yang ingin ditampilkan pada tabel (Kolom &quot;Nama Lengkap&quot; terkunci).</p>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg bg-madin-700 text-white">Selesai</button>
        </div>
      </div>
    </Dialog>
  );
}
