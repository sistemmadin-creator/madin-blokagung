'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalDetailSelJadwal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Detail Slot Jadwal Mengajar" maxWidth="sm">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Informasi detail asatidz, mata pelajaran, ruang kelas, dan jam sesi.</p>
      </div>
    </Dialog>
  );
}
