'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalGrupAsal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Kelola Master Grup Asal Fan" maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Kelola klasifikasi asal muasal materi atau kurikulum fan.</p>
      </div>
    </Dialog>
  );
}
