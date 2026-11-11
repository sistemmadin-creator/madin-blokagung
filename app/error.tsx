'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { captureAppError } from '@/lib/services/errorMonitoring';

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [errorRef, setErrorRef] = useState<string>('');

  useEffect(() => {
    // 1. Rekam error ke Sentry dengan sanitasi data otomatis
    const eventId = captureAppError(error, {
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });

    setErrorRef(error.digest || eventId || `ERR-${Date.now().toString(36).toUpperCase()}`);
  }, [error]);

  return (
    <div
      data-testid="error-boundary-container"
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8 text-center">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-amber-100">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">
          Terjadi Kendala Sistem
        </h1>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Mohon maaf, halaman yang Anda buka mengalami kendala teknis tak terduga. Laporan kendala ini telah dicatat secara otomatis untuk ditinjau oleh tim pengembang.
        </p>

        {errorRef && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              Kode Referensi
            </span>
            <code
              data-testid="error-reference-code"
              className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 font-semibold"
            >
              {errorRef}
            </code>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            data-testid="error-retry-button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition shadow-sm hover:shadow"
          >
            <RefreshCw className="w-4 h-4" />
            Coba Lagi
          </button>

          <a
            href="/"
            data-testid="error-home-button"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
          >
            <Home className="w-4 h-4" />
            Ke Beranda
          </a>
        </div>
      </div>
    </div>
  );
}
