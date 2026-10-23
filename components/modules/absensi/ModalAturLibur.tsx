'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalAturLibur({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Atur Status Hari Libur / Kegiatan Insidental" maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Tentukan tanggal libur atau acara khusus agar absensi tidak dihitung alfa.</p>
      </div>
    </Dialog>
  );
}
