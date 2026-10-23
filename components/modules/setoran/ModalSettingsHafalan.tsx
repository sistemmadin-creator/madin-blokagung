'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalSettingsHafalan({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Konfigurasi Target Hafalan (Wajib, Sunnah, Kitab)" maxWidth="lg">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Tentukan batas minimal target setoran muhafadzoh santri per tingkatan.</p>
      </div>
    </Dialog>
  );
}
