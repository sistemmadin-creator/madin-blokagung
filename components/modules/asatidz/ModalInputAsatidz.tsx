'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalInputAsatidz({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Formulir Tambah / Edit Asatidz" maxWidth="3xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Kelola informasi identitas, NIA, NIS, dan penugasan mengajar diniyyah.</p>
      </div>
    </Dialog>
  );
}
