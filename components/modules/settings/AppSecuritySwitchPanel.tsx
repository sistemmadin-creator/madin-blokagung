'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldOff,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  X,
  ArrowRight,
  ArrowLeft,
  Lock,
  LogIn,
} from 'lucide-react';
import { useRbacStore } from '@/stores/useRbacStore';

export default function AppSecuritySwitchPanel() {
  const {
    currentAccount,
    isAppSecurityEnabled,
    securityUpdatedAt,
    securityUpdatedBy,
    fetchAppSecurityStatus,
    toggleAppSecurity,
    updateSecurityPassword,
  } = useRbacStore();

  const isLoggedInMasterAdmin =
    Boolean(currentAccount) &&
    (currentAccount?.role === 'master_admin' || currentAccount?.username === 'admin');

  // State Modal Konfirmasi 3 Tahap
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [targetEnable, setTargetEnable] = useState<boolean>(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [ackChecked, setAckChecked] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [securityPassword, setSecurityPassword] = useState('');
  const [showSecPassword, setShowSecPassword] = useState(false);
  const [isSubmittingToggle, setIsSubmittingToggle] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // State Modal Ubah Kata Sandi Khusus Keamanan
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState(false);
  const [currentSecPass, setCurrentSecPass] = useState('');
  const [newSecPass, setNewSecPass] = useState('');
  const [confirmNewSecPass, setConfirmNewSecPass] = useState('');
  const [showChangePass, setShowChangePass] = useState(false);
  const [isSubmittingPass, setIsSubmittingPass] = useState(false);
  const [changePassError, setChangePassError] = useState<string | null>(null);

  // Toast Umpan Balik
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    let active = true;
    setIsCheckingStatus(true);
    fetchAppSecurityStatus().finally(() => {
      if (active) setIsCheckingStatus(false);
    });
    return () => {
      active = false;
    };
  }, [fetchAppSecurityStatus]);

  const requiredPhrase = targetEnable ? 'AKTIFKAN KEAMANAN' : 'NONAKTIFKAN KEAMANAN';
  const isPhraseMatched = confirmPhrase.trim().toUpperCase() === requiredPhrase;

  const openThreeStepModal = (nextEnableState: boolean) => {
    setTargetEnable(nextEnableState);
    setStep(1);
    setAckChecked(false);
    setConfirmPhrase('');
    setSecurityPassword('');
    setShowSecPassword(false);
    setModalError(null);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmToggleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;
    setModalError(null);

    if (!securityPassword.trim()) {
      setModalError('Kata Sandi Khusus Keamanan wajib diisi pada konfirmasi terakhir.');
      return;
    }

    setIsSubmittingToggle(true);
    const res = await toggleAppSecurity(targetEnable, securityPassword.trim());
    setIsSubmittingToggle(false);

    if (!res.ok) {
      setModalError(
        res.error || 'Kata Sandi Khusus Keamanan tidak sesuai. Perubahan dibatalkan.'
      );
      return;
    }

    setIsConfirmModalOpen(false);
    setFeedbackBanner(
      res.is_security_enabled
        ? 'Keamanan Aplikasi MADINA Blokagung berhasil DIAKTIFKAN kembali. Seluruh rute internal kini wajib login.'
        : 'Keamanan Aplikasi MADINA Blokagung berhasil DINONAKTIFKAN. Mode Input Data Tanpa Login kini aktif.'
    );
    setTimeout(() => setFeedbackBanner(null), 6000);
  };

  const openChangePasswordModal = () => {
    setCurrentSecPass('');
    setNewSecPass('');
    setConfirmNewSecPass('');
    setShowChangePass(false);
    setChangePassError(null);
    setIsChangePassModalOpen(true);
  };

  const handleSaveNewSecurityPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);

    if (!currentSecPass.trim()) {
      setChangePassError('Masukkan Kata Sandi Khusus Keamanan saat ini.');
      return;
    }
    if (newSecPass.trim().length < 8) {
      setChangePassError('Kata Sandi Khusus Keamanan baru minimal harus 8 karakter.');
      return;
    }
    if (newSecPass.trim() !== confirmNewSecPass.trim()) {
      setChangePassError('Konfirmasi Kata Sandi Khusus baru tidak cocok.');
      return;
    }

    setIsSubmittingPass(true);
    const res = await updateSecurityPassword(currentSecPass.trim(), newSecPass.trim());
    setIsSubmittingPass(false);

    if (!res.ok) {
      setChangePassError(res.error || 'Gagal memperbarui Kata Sandi Khusus Keamanan.');
      return;
    }

    setIsChangePassModalOpen(false);
    setFeedbackBanner('Kata Sandi Khusus Keamanan Aplikasi berhasil diperbarui.');
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  const formattedUpdatedTime = securityUpdatedAt
    ? new Date(securityUpdatedAt).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      data-testid="panel-app-security-switch"
      className={`rounded-2xl border p-5 sm:p-6 shadow-sm transition-colors ${
        isAppSecurityEnabled
          ? 'bg-white border-emerald-200'
          : 'bg-amber-50/90 border-amber-300'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isAppSecurityEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-100 border-amber-300 text-amber-900'
            }`}
          >
            {isAppSecurityEnabled ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldOff className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Saklar Keamanan Aplikasi MADINA Blokagung
              </h2>
              <span
                data-testid="status-badge-security-switch"
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isAppSecurityEnabled
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-200 text-amber-950 border-amber-400'
                }`}
              >
                {isAppSecurityEnabled
                  ? 'AKTIF (Wajib Login)'
                  : 'NON-AKTIF (Mode Input Data Tanpa Login)'}
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed max-w-3xl">
              {isAppSecurityEnabled
                ? 'Keamanan aplikasi sedang aktif. Seluruh rute di ruang kerja internal wajib melalui autentikasi login sesuai otoritas akun masing-masing pengurus.'
                : 'Keamanan aplikasi sedang dinonaktifkan untuk mempermudah masa input data. Pengurus dapat mengakses seluruh halaman dan fitur operasional secara langsung tanpa login.'}
            </p>

            {formattedUpdatedTime && (
              <p className="text-[11px] text-slate-500 pt-0.5">
                Terakhir diperbarui: <strong>{formattedUpdatedTime}</strong> oleh{' '}
                <span className="font-mono font-semibold">@{securityUpdatedBy || 'admin'}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {isLoggedInMasterAdmin ? (
            <button
              type="button"
              data-testid="btn-open-change-sec-pass"
              onClick={openChangePasswordModal}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-700" />
              <span>Ubah Sandi Khusus</span>
            </button>
          ) : (
            <Link
              href="/login?next=%2Fpengaturan%3Ftab%3Dakun"
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-700" />
              <span>Login Master Admin</span>
            </Link>
          )}

          {isAppSecurityEnabled ? (
            <button
              type="button"
              data-testid="btn-trigger-security-switch"
              disabled={isCheckingStatus}
              onClick={() => openThreeStepModal(false)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <ShieldOff className="w-4 h-4" />
              <span>Nonaktifkan Keamanan Aplikasi</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="btn-trigger-security-switch"
              disabled={isCheckingStatus}
              onClick={() => openThreeStepModal(true)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Aktifkan Kembali Keamanan Aplikasi</span>
            </button>
          )}
        </div>
      </div>

      {feedbackBanner && (
        <div
          role="status"
          aria-live="polite"
          data-testid="security-switch-feedback"
          className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-semibold flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* MODAL KONFIRMASI 3 TAHAP (KONFIRMASI ULANG 3X) */}
      {isConfirmModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="security-switch-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            {/* Header Modal */}
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                targetEnable ? 'bg-[#0b5751]' : 'bg-slate-900'
              }`}
            >
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider mb-1">
                  Konfirmasi Berlapis: Tahap {step} dari 3
                </span>
                <h3 id="security-switch-modal-title" className="text-base font-bold">
                  {targetEnable
                    ? 'Aktifkan Kembali Keamanan Aplikasi MADINA'
                    : 'Nonaktifkan Keamanan Aplikasi MADINA'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                aria-label="Tutup dialog konfirmasi keamanan"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/10 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Indikator Progress 3 Tahap */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2">
              {[
                { num: 1, label: '1. Dampak Operasional' },
                { num: 2, label: '2. Frasa Konfirmasi' },
                { num: 3, label: '3. Sandi Khusus' },
              ].map((item) => {
                const isActive = step === item.num;
                const isDone = step > item.num;
                return (
                  <div
                    key={item.num}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-center border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900'
                        : isDone
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-slate-400 border-slate-200'
                    }`}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>

            {/* Body Modal Per Tahap */}
            <form onSubmit={handleConfirmToggleSubmit} className="p-6 space-y-5">
              {modalError && (
                <div
                  role="alert"
                  data-testid="security-switch-error"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* TAHAP 1: PERINGATAN DAMPAK OPERASIONAL */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-xs text-amber-950">
                    <div className="font-bold flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        {targetEnable
                          ? 'Konfirmasi Ke-1: Penguncian Kembali Ruang Kerja'
                          : 'Konfirmasi Ke-1: Pembukaan Akses Masa Input Data'}
                      </span>
                    </div>
                    <p className="leading-relaxed">
                      {targetEnable
                        ? 'Dengan mengaktifkan kembali Keamanan Aplikasi, seluruh pengunjung tanpa sesi login akan langsung diarahkan ke halaman Login saat mengakses menu internal.'
                        : 'Dengan menonaktifkan Keamanan Aplikasi, seluruh halaman di dalam ruang kerja internal dapat diakses langsung tanpa login (termasuk fitur Tambah, Edit, Hapus, dan Pengaturan) untuk mempermudah pengurus saat masa input data.'}
                    </p>
                  </div>

                  <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/80 transition">
                    <input
                      type="checkbox"
                      data-testid="chk-confirm-step-1"
                      checked={ackChecked}
                      onChange={(e) => setAckChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0b5751] focus:ring-[#0b5751]"
                    />
                    <span className="text-xs font-semibold text-slate-800 leading-relaxed">
                      {targetEnable
                        ? 'Saya memahami bahwa mengaktifkan kembali Keamanan Aplikasi akan mewajibkan seluruh pengurus login untuk mengakses halaman internal.'
                        : 'Saya memahami bahwa menonaktifkan Keamanan Aplikasi akan membuka akses seluruh halaman internal tanpa login selama masa input data.'}
                    </span>
                  </label>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      data-testid="btn-next-step-2"
                      disabled={!ackChecked}
                      onClick={() => {
                        setModalError(null);
                        setStep(2);
                      }}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                    >
                      <span>Lanjut ke Konfirmasi Ke-2</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAHAP 2: KETIK FRASA KONFIRMASI EKSPLISIT */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                    <p className="font-bold text-slate-900">
                      Konfirmasi Ke-2: Verifikasi Ketik Frasa Keamanan
                    </p>
                    <p className="leading-relaxed">
                      Untuk memastikan tindakan ini disengaja, ketik persis frasa di bawah ini pada kolom konfirmasi:
                    </p>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-center text-sm text-slate-900 tracking-wide select-all">
                      {requiredPhrase}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="input-confirm-phrase"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Ketik Frasa Konfirmasi
                    </label>
                    <input
                      id="input-confirm-phrase"
                      data-testid="input-confirm-phrase"
                      type="text"
                      value={confirmPhrase}
                      onChange={(e) => setConfirmPhrase(e.target.value)}
                      placeholder={`Ketik: ${requiredPhrase}`}
                      autoComplete="off"
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setStep(1);
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Tahap 1</span>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-next-step-3"
                      disabled={!isPhraseMatched}
                      onClick={() => {
                        setModalError(null);
                        setStep(3);
                      }}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                    >
                      <span>Lanjut ke Konfirmasi Terakhir (Ke-3)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAHAP 3: KATA SANDI KHUSUS KEAMANAN APLIKASI */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1.5 text-xs text-emerald-950">
                    <div className="font-bold flex items-center gap-2 text-sm">
                      <Lock className="w-4 h-4 text-emerald-800 shrink-0" />
                      <span>Konfirmasi Terakhir (Ke-3): Kata Sandi Khusus Keamanan</span>
                    </div>
                    <p className="leading-relaxed text-emerald-900">
                      Masukkan <strong>Kata Sandi Khusus Keamanan Aplikasi</strong>. Sandi ini wajib berbeda dari kata sandi login Master Admin untuk menjaga keamanan agar saklar tidak diubah sembarangan.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="input-security-password"
                      className="block text-xs font-bold text-slate-800 mb-1.5"
                    >
                      Kata Sandi Khusus Keamanan Aplikasi
                    </label>
                    <div className="relative">
                      <input
                        id="input-security-password"
                        data-testid="input-security-password"
                        type={showSecPassword ? 'text' : 'password'}
                        required
                        value={securityPassword}
                        onChange={(e) => setSecurityPassword(e.target.value)}
                        placeholder="Masukkan Kata Sandi Khusus Keamanan..."
                        autoComplete="off"
                        className="w-full min-h-[42px] pl-3.5 pr-10 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecPassword((prev) => !prev)}
                        aria-label={
                          showSecPassword
                            ? 'Sembunyikan kata sandi khusus'
                            : 'Tampilkan kata sandi khusus'
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800"
                      >
                        {showSecPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isSubmittingToggle}
                      onClick={() => {
                        setModalError(null);
                        setStep(2);
                      }}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Tahap 2</span>
                    </button>

                    <button
                      type="submit"
                      data-testid="btn-submit-security-toggle"
                      disabled={isSubmittingToggle || !securityPassword.trim()}
                      className={`min-h-[40px] px-4 py-2 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition disabled:opacity-40 ${
                        targetEnable
                          ? 'bg-[#0b5751] hover:bg-[#115e59]'
                          : 'bg-amber-700 hover:bg-amber-800'
                      }`}
                    >
                      {isSubmittingToggle ? (
                        <span>Memverifikasi Sandi Khusus...</span>
                      ) : targetEnable ? (
                        <span>Konfirmasi Akhir &amp; Aktifkan Keamanan</span>
                      ) : (
                        <span>Konfirmasi Akhir &amp; Nonaktifkan Keamanan</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL UBAH KATA SANDI KHUSUS KEAMANAN (KHUSUS MASTER ADMIN) */}
      {isChangePassModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="change-sec-pass-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 id="change-sec-pass-title" className="text-base font-bold">
                  Ubah Kata Sandi Khusus Keamanan
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sandi khusus untuk konfirmasi tahap ke-3 saklar keamanan aplikasi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePassModalOpen(false)}
                aria-label="Tutup modal ubah sandi khusus"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSecurityPassword} className="p-6 space-y-4">
              {changePassError && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <span>{changePassError}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="input-current-sec-pass"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Kata Sandi Khusus Saat Ini
                </label>
                <input
                  id="input-current-sec-pass"
                  data-testid="input-current-sec-pass"
                  type={showChangePass ? 'text' : 'password'}
                  required
                  value={currentSecPass}
                  onChange={(e) => setCurrentSecPass(e.target.value)}
                  placeholder="Masukkan sandi khusus saat ini..."
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                />
              </div>

              <div>
                <label
                  htmlFor="input-new-sec-pass"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Kata Sandi Khusus Baru (Minimal 8 Karakter)
                </label>
                <input
                  id="input-new-sec-pass"
                  data-testid="input-new-sec-pass"
                  type={showChangePass ? 'text' : 'password'}
                  required
                  value={newSecPass}
                  onChange={(e) => setNewSecPass(e.target.value)}
                  placeholder="Wajib berbeda dari sandi login Master Admin"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                />
              </div>

              <div>
                <label
                  htmlFor="input-confirm-new-sec-pass"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Ulangi Kata Sandi Khusus Baru
                </label>
                <input
                  id="input-confirm-new-sec-pass"
                  data-testid="input-confirm-new-sec-pass"
                  type={showChangePass ? 'text' : 'password'}
                  required
                  value={confirmNewSecPass}
                  onChange={(e) => setConfirmNewSecPass(e.target.value)}
                  placeholder="Ketik ulang sandi khusus baru..."
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b5751]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowChangePass((prev) => !prev)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5"
                >
                  {showChangePass ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Sembunyikan Sandi</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Tampilkan Sandi</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePassModalOpen(false)}
                  disabled={isSubmittingPass}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-new-sec-pass"
                  disabled={isSubmittingPass}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold transition disabled:opacity-40"
                >
                  {isSubmittingPass ? 'Menyimpan...' : 'Simpan Sandi Khusus Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
