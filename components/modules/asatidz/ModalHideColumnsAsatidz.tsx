'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalHideColumnsAsatidz({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Sembunyikan / Tampilkan Kolom Asatidz" maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Pilih kolom tabel asatidz yang ingin ditampilkan.</p>
      </div>
    </Dialog>
  );
}
