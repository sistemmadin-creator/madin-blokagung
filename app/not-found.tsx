import React from 'react';
import Link from 'next/link';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800">
        {/* Badge / Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-8 h-8" />
        </div>

        {/* 404 Text */}
        <div className="space-y-2">
          <p className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 dark:text-emerald-400">
            Error 404
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 font-serif">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Halaman yang Anda tuju tidak tersedia, telah dipindahkan, atau alamat URL yang dimasukkan tidak valid.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold text-sm shadow-md shadow-emerald-900/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Footer Identity */}
        <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          Madrasah Diniyyah Al-Amiriyyah Blokagung
        </p>
      </div>
    </main>
  );
}
