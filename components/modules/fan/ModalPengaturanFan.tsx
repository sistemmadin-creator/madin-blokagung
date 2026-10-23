'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalPengaturanFan({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Pengaturan Master Fan Pelajaran" maxWidth="xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Tambah dan kelola mata pelajaran kurikulum madin serta alokasi kitab.</p>
      </div>
    </Dialog>
  );
}
