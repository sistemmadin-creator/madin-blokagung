'use client';

import React, { useState } from 'react';

export default function TestCrashPage() {
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error('Test intentional client-side crash untuk verifikasi error boundary Sentry');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-100">
      <div className="bg-white p-8 rounded-xl shadow border border-slate-200 text-center max-w-md">
        <h1 className="text-lg font-bold text-slate-800 mb-2">
          Halaman Uji Coba Crash Error Boundary
        </h1>
        <p className="text-xs text-slate-500 mb-6">
          Halaman ini digunakan untuk memverifikasi bahwa Error Boundary dan pelacak Sentry menangani unhandled exception secara anggun tanpa white-screen-of-death.
        </p>
        <button
          type="button"
          data-testid="trigger-crash-btn"
          onClick={() => setShouldCrash(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow transition"
        >
          Picu Crash Klien
        </button>
      </div>
    </div>
  );
}
