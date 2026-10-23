'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalGeneratorWA({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Generator Format Pesan WhatsApp Presensi" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Susun pesan otomatis rekap kehadiran asatidz dengan tautan langsung wa.me.</p>
      </div>
    </Dialog>
  );
}
