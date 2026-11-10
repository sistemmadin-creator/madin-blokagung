'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, User, ArrowLeft, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { resolveLoginEmail, sanitizeNextPath, extractUserProfile } from '@/lib/utils/authHelper';
import { logActivity } from '@/lib/utils/audit';
import { normalizeSpecialAuthorities } from '@/lib/utils/rbacHelper';
import {
  clearPersistentDeviceSession,
  hasPersistentDeviceSession,
  restorePersistentDeviceSession,
  savePersistentDeviceSession,
} from '@/lib/utils/deviceSessionVault';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNextParam = searchParams.get('next');
  const nextPath = sanitizeNextPath(rawNextParam);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoringDeviceSession, setIsRestoringDeviceSession] = useState(false);
  const [publicPortalUrl, setPublicPortalUrl] = useState('/');

  // Deteksi URL portal publik agar tombol kembali mengarah ke domain utama
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      if (host.includes('localhost') || host === '127.0.0.1') {
        const port = window.location.port ? `:${window.location.port}` : '';
        setPublicPortalUrl(`http://localhost${port}/`);
      } else {
        setPublicPortalUrl('https://www.madinblokagung.com/');
      }
    }
  }, []);

  // Jika perangkat ini memiliki sesi Otoritas Spesial (Perangkat Tetap Absen Cepat) yang aktif,
  // pulihkan sesi secara otomatis tanpa perlu mengetik username & kata sandi lagi.
  useEffect(() => {
    let active = true;
    if (!hasPersistentDeviceSession()) return;

    setIsRestoringDeviceSession(true);
    restorePersistentDeviceSession()
      .then((res) => {
        if (!active) return;
        if (res.restored) {
          router.replace(res.targetPath || '/absen-cepat');
          router.refresh();
        } else {
          setIsRestoringDeviceSession(false);
        }
      })
      .catch(() => {
        if (active) setIsRestoringDeviceSession(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

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

      // Periksa apakah akun yang login memiliki Otoritas Spesial: Sesi Perangkat Tetap & Langsung ke Absen Cepat
      const appMeta = (data.user.app_metadata || {}) as Record<string, unknown>;
      let isPersistentAbsenCepat = Boolean(
        normalizeSpecialAuthorities(
          appMeta.special_authorities as Record<string, unknown> | undefined
        ).persistent_absen_cepat
      );

      const { data: accRow } = await supabase
        .from('user_accounts')
        .select('special_authorities')
        .eq('id', data.user.id)
        .maybeSingle();

      if (accRow?.special_authorities) {
        isPersistentAbsenCepat = Boolean(
          normalizeSpecialAuthorities(
            accRow.special_authorities as Record<string, unknown>
          ).persistent_absen_cepat
        );
      }

      if (isPersistentAbsenCepat) {
        savePersistentDeviceSession({
          userId: data.user.id,
          username: trimmedUser.toLowerCase(),
          email,
          password,
          accessToken: data.session?.access_token,
          refreshToken: data.session?.refresh_token,
        });
      } else {
        clearPersistentDeviceSession();
      }

      const profile = extractUserProfile(data.user);
      void logActivity(
        'LOGIN SISTEM',
        `Masuk ke ruang kerja internal sebagai ${profile?.fullName || trimmedUser} (${profile?.roleLabel || 'Pengurus'})${
          isPersistentAbsenCepat ? ' [Otoritas Spesial Perangkat Tetap -> Absen Cepat]' : ''
        }`
      );

      const finalTarget = isPersistentAbsenCepat
        ? '/absen-cepat'
        : nextPath;

      window.location.assign(finalTarget);
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

      {isRestoringDeviceSession && (
        <div
          role="status"
          aria-live="polite"
          data-testid="banner-restoring-device-session"
          className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-2.5 text-xs font-semibold leading-relaxed"
        >
          <Smartphone className="w-4 h-4 text-emerald-700 shrink-0 animate-pulse" />
          <span>
            Sesi perangkat tetap terdeteksi. Mengarahkan langsung ke halaman Absen Cepat...
          </span>
        </div>
      )}

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
        <a
          href={publicPortalUrl}
          className="inline-flex items-center gap-2 min-h-[44px] px-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#0b5751] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Kembali ke Beranda Publik</span>
        </a>
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
