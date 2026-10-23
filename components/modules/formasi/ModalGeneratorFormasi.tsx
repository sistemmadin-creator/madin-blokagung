'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalGeneratorFormasi({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Generator Otomatis Formasi Kelas" maxWidth="xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Membagi santri ke kelas-kelas secara otomatis sesuai kapasitas dan kriteria.</p>
      </div>
    </Dialog>
  );
}
