'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalDetailKelasKBM({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Detail Jadwal Mengajar Per Kelas" maxWidth="3xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Tinjau seluruh jadwal KBM satu kelas dari hari Sabtu s.d. Kamis.</p>
      </div>
    </Dialog>
  );
}
