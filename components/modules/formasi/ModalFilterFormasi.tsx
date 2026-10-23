'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalFilterFormasi({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Filter Formasi Kelas" maxWidth="md">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Filter formasi berdasarkan tingkat dan rasio kelas.</p>
      </div>
    </Dialog>
  );
}
