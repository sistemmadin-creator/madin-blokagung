'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, User, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { resolveLoginEmail, sanitizeNextPath, extractUserProfile } from '@/lib/utils/authHelper';
import { logActivity } from '@/lib/utils/audit';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = sanitizeNextPath(searchParams.get('next'));

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setErrorMsg('Username dan kata sandi wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      const email = resolveLoginEmail(trimmedUser);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        setErrorMsg(
          'Username atau kata sandi tidak sesuai. Periksa kembali ejaan akun Anda.'
        );
        setIsSubmitting(false);
        return;
      }

      const profile = extractUserProfile(data.user);
      await logActivity(
        'LOGIN SISTEM',
        `Masuk ke ruang kerja internal sebagai ${profile?.fullName || trimmedUser} (${profile?.roleLabel || 'Pengurus'})`
      );

      router.replace(nextPath);
      router.refresh();
    } catch {
      setErrorMsg(
        'Gagal menghubungi server autentikasi. Periksa sambungan internet Anda lalu coba lagi.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-slate-200 border-t-4 border-t-[#0b5751] rounded-2xl shadow-sm p-6 sm:p-8">
      <div className="flex items-center gap-3.5 pb-6 border-b border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 shrink-0">
          <img
            src="/logo-madin.png"
            alt="Logo Madrasah Diniyyah Al-Amiriyyah Blokagung"
            className="w-9 h-9 object-contain"
          />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold font-serif text-slate-900 leading-snug">
            Portal Pengurus MADINA
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Madrasah Diniyyah Al-Amiriyyah Blokagung
          </p>
        </div>
      </div>

      <div className="mt-5 mb-6">
        <h2 className="text-sm font-bold text-slate-900">
          Masuk ke Ruang Kerja Internal
        </h2>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          Gunakan akun resmi pengurus yang terdaftar untuk mengakses database santri, dewan asatidz, jadwal KBM, dan muhafadzoh.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-2.5 text-xs leading-relaxed"
        >
          <AlertCircle
            className="w-4 h-4 text-rose-700 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="login-username"
            className="block text-xs font-bold text-slate-800 mb-1.5"
          >
            Username Pengurus
          </label>
          <div className="relative">
            <User
              className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              required
              disabled={isSubmitting}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: admin atau kurikulum"
              className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:border-[#0f766e] disabled:bg-slate-100 disabled:text-slate-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-xs font-bold text-slate-800 mb-1.5"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <Lock
              className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan kata sandi akun"
              className="w-full min-h-[44px] pl-10 pr-12 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:border-[#0f766e] disabled:bg-slate-100 disabled:text-slate-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0b5751] hover:bg-[#115e59] active:bg-[#042f2e] text-white font-bold text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Memverifikasi kredensial...' : 'Masuk ke Ruang Kerja'}
          </button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-[44px] px-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#0b5751] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Kembali ke Beranda Publik</span>
        </Link>
        <span className="text-[11px] text-slate-600 font-medium">
          PP. Darussalam Blokagung
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center px-4 py-8">
      <Suspense
        fallback={
          <div
            role="status"
            aria-live="polite"
            className="w-full max-w-md bg-white border border-slate-200 border-t-4 border-t-[#0b5751] rounded-2xl shadow-sm p-8 text-center text-xs font-semibold text-slate-700"
          >
            Memuat formulir autentikasi pengurus...
          </div>
        }
      >
        <LoginFormContent />
      </Suspense>
    </main>
  );
}
