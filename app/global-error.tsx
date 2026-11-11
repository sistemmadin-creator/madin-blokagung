'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureAppError } from '@/lib/services/errorMonitoring';

export default function GlobalLayoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureAppError(error, {
      digest: error.digest,
      source: 'global-error.tsx',
    });
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800 antialiased">
        <div
          data-testid="global-error-container"
          className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-red-100">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">
            Kendala Fatal Sistem
          </h1>

          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Terjadi kendala pada sistem tata letak utama aplikasi. Sistem telah merekam kejadian ini untuk perbaikan.
          </p>

          <button
            type="button"
            data-testid="global-error-retry-button"
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Muat Ulang Halaman
          </button>
        </div>
      </body>
    </html>
  );
}
