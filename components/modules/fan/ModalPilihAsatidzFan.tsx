'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalPilihAsatidzFan({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Pilih Pengajar Fan Pelajaran" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Tugaskan dewan asatidz yang mengampu materi fan pelajaran ini.</p>
      </div>
    </Dialog>
  );
}
