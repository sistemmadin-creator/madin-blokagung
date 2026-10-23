'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalSelectSantriPiagam({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Pilih Santri Penerima Piagam" maxWidth="3xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Pilih santri secara massal atau satuan untuk dicetak sertifikat kelulusan hafalannya.</p>
      </div>
    </Dialog>
  );
}
