'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalInputFormasi({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Tambah / Edit Formasi Kelas" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Atur tingkat, kelas, kapasitas santri, dan wali kelas.</p>
      </div>
    </Dialog>
  );
}
