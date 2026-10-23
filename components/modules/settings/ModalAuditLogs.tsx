'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalAuditLogs({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Log Jejak Aktivitas & Audit Sistem" maxWidth="4xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Rekaman jejak penambahan, perubahan, dan penghapusan data madin oleh pengguna.</p>
      </div>
    </Dialog>
  );
}
