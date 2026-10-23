'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalImportExcelAsatidz({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Import Data Asatidz dari Excel (.xlsx)" maxWidth="lg">
      <div className="space-y-4">
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
          Pilih atau seret file Excel (.xlsx) data asatidz ke sini
        </div>
      </div>
    </Dialog>
  );
}
