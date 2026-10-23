'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalNotifAbsenBlok({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Pemberitahuan Presensi Kosong Blok" maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Peringatan blok asrama yang belum menyelesaikan presensi sesi aktif.</p>
      </div>
    </Dialog>
  );
}
