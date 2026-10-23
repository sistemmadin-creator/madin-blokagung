'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalDrilldownRekap({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Rincian Drilldown Presensi Asatidz" maxWidth="2xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Histori kehadiran per tanggal dan jam sesi untuk asatidz terpilih.</p>
      </div>
    </Dialog>
  );
}
