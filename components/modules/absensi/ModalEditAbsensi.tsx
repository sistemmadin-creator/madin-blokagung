'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalEditAbsensi({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Koreksi / Edit Presensi Asatidz" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Sesuaikan status kehadiran, pengajar pengganti (badal), atau menit terlambat.</p>
      </div>
    </Dialog>
  );
}
