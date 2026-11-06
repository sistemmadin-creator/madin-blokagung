'use client';

import React, { Suspense } from 'react';
import KirimWaHafalanModule from '@/components/modules/kirim-wa/KirimWaHafalanModule';

export default function KirimWaPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">
          Memuat modul Kirim WhatsApp Rapor Hafalan...
        </div>
      }
    >
      <KirimWaHafalanModule />
    </Suspense>
  );
}
