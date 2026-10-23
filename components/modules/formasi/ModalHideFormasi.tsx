'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalHideFormasi({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Sembunyikan Kolom Formasi" maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Pilih kolom tabel formasi kelas yang ingin ditampilkan.</p>
      </div>
    </Dialog>
  );
}
