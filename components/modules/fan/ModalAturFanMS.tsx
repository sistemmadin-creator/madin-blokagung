'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalAturFanMS({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Alokasi Jam Mengajar Standar (MS) & Bebas (MB)" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Konfigurasi bobot jam mengajar untuk masing-masing fan pelajaran.</p>
      </div>
    </Dialog>
  );
}
