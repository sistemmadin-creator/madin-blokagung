'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalDetailAbsenCepat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Detail Presensi Cepat" maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Penyesuaian cepat status, menit keterlambatan, dan catatan absensi.</p>
      </div>
    </Dialog>
  );
}
