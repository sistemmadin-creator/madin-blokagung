'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalInputSantri({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Formulir Biodata Santri Lengkap" maxWidth="4xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Isi kelengkapan data santri, foto, wali, wilayah, dan hierarki kamar.</p>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg border border-slate-200">Tutup</button>
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-lg bg-madin-700 text-white">Simpan Santri</button>
        </div>
      </div>
    </Dialog>
  );
}
