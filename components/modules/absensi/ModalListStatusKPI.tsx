'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalListStatusKPI({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Indikator Performa & KPI Kehadiran Asatidz" maxWidth="xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Rekapitulasi pencapaian target kehadiran dan keaktifan mengajar dewan asatidz.</p>
      </div>
    </Dialog>
  );
}
