'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalDetailFormasi({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Detail Formasi & Roster Santri Kelas" maxWidth="2xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Daftar santri yang terdaftar di kelas ini beserta status kamar.</p>
      </div>
    </Dialog>
  );
}
