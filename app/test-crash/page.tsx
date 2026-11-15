'use client';

import React, { useState } from 'react';
import { usePagePermission } from '@/stores/useRbacStore';

/**
 * Halaman khusus untuk menguji apakah Global Error Boundary (app/error.tsx)
 * berhasil menangkap crash rendering di sisi Client (Browser) dan menampilkan UI Fallback.
 * Di lingkungan produksi, halaman ini hanya diizinkan untuk Master Admin.
 */
export default function TestCrashPage() {
  const [shouldCrash, setShouldCrash] = useState(false);
  const { isMasterAdmin, isLoadingCurrent } = usePagePermission('pengaturan');

  if (shouldCrash) {
    throw new Error('SIMULATED_CLIENT_RENDER_CRASH: Komponen gagal melakukan render data.');
  }

  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && isLoadingCurrent) {
    return (
      <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <p className="text-sm text-slate-500">Memverifikasi otoritas diagnostik...</p>
      </div>
    );
  }

  if (isProd && !isMasterAdmin) {
    return (
      <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h1 className="text-lg font-bold text-slate-800 mb-2">Akses Diagnostik Dibatasi</h1>
        <p className="text-sm text-slate-600">
          Halaman simulasi crash hanya dapat diakses oleh Master Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-md mx-auto mt-10 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
      <h1 className="text-lg font-bold text-slate-800 mb-2">Halaman Uji Error Boundary</h1>
      <p className="text-sm text-slate-600 mb-6">
        Klik tombol di bawah untuk memicu crash pada komponen React dan menguji tampilan pemulihan
        otomatis.
      </p>
      <button
        type="button"
        data-testid="trigger-crash-btn"
        onClick={() => setShouldCrash(true)}
        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        Picu Crash Komponen
      </button>
    </div>
  );
}
