'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalDetailSantri({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Kartu Detail Biodata Santri" maxWidth="2xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Tinjau informasi lengkap santri, kamar, kelas diniyyah, dan orang tua.</p>
      </div>
    </Dialog>
  );
}
