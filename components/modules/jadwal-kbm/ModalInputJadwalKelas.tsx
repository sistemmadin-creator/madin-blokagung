'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalInputJadwalKelas({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Atur Slot Jadwal Mengajar Kelas" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Pilih hari, jam sesi (1-4), fan pelajaran, dan asatidz pengampu.</p>
      </div>
    </Dialog>
  );
}
