'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalDetailAsatidz({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Detail Profil Dewan Asatidz" maxWidth="xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Tinjau biodata, alamat, jadwal tugas mengajar, dan status kamar.</p>
      </div>
    </Dialog>
  );
}
