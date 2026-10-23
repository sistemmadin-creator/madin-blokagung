'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

export default function CameraCaptureModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Ambil Foto Santri Langsung (Webcam)" maxWidth="md">
      <div className="space-y-4 text-center">
        <div className="w-full h-64 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 text-xs">
          Area Stream Kamera WebRTC
        </div>
        <div className="flex justify-center gap-3">
          <button className="px-4 py-2 text-xs rounded-lg bg-madin-700 text-white font-semibold">Jepret Foto</button>
        </div>
      </div>
    </Dialog>
  );
}
