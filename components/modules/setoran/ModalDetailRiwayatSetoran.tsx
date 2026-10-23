'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalDetailRiwayatSetoran({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Histori Riwayat Setoran Hafalan Santri" maxWidth="2xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Daftar rekaman setoran hafalan santri yang telah divalidasi oleh dewan asatidz.</p>
      </div>
    </Dialog>
  );
}
