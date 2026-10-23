'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function ModalHierarchyBuilder({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Visual Tree Builder: Hierarki Kamar & Asrama" maxWidth="3xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">Kelola percabangan pohon dropdown: Blok $\to$ Asrama $\to$ Kamar (Tree 1 & Tree 2).</p>
      </div>
    </Dialog>
  );
}
