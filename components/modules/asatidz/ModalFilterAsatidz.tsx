'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalFilterAsatidz({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Filter Dewan Asatidz" maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Filter berdasarkan PA/PI, Kelas Diniyyah, Blok, dan Jah.</p>
      </div>
    </Dialog>
  );
}
