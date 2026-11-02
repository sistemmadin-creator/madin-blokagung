'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, BellRing, Smartphone, CheckCircle2, AlertCircle, Send, X, RefreshCw } from 'lucide-react';
import { WebPushClientService, PushPermissionStatus } from '@/lib/services/webPushClient';

export default function NotificationBellPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<PushPermissionStatus>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Periksa status dukungan dan subscription saat mount
  useEffect(() => {
    async function checkStatus() {
      const status = WebPushClientService.getPermission();
      setPermission(status);

      if (status === 'granted') {
        const sub = await WebPushClientService.getExistingSubscription();
        setIsSubscribed(!!sub);
      }
    }
    checkStatus();
  }, []);

  // Menutup popup saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSubscribe = async () => {
    setLoading(true);
    setErrorMsg(null);
    setTestStatus(null);

    const result = await WebPushClientService.requestAndSubscribe();
    setPermission(result.permission);

    if (result.success) {
      setIsSubscribed(true);
      setTestStatus('Notifikasi HP berhasil diaktifkan!');
    } else {
      setErrorMsg(result.error || 'Gagal mengaktifkan notifikasi.');
    }
    setLoading(false);
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    setErrorMsg(null);
    const result = await WebPushClientService.unsubscribe();
    if (result.success) {
      setIsSubscribed(false);
      setTestStatus('Langganan notifikasi dinonaktifkan.');
    } else {
      setErrorMsg(result.error || 'Gagal membatalkan notifikasi.');
    }
    setLoading(false);
  };

  const handleSendTest = async () => {
    setLoading(true);
    setErrorMsg(null);
    setTestStatus('Mengirim notifikasi ke HP...');

    const res = await WebPushClientService.sendTestPushToCurrentDevice(
      'Madin Blokagung',
      'Tes Notifikasi Berhasil! Layanan notifikasi HP siap menerima info presensi & pengumuman.'
    );

    if (res.success) {
      setTestStatus('Notifikasi terkirim! Silakan cek bilah atas layar HP Anda.');
    } else {
      setErrorMsg(res.error || 'Gagal mengirim pesan tes.');
      setTestStatus(null);
    }
    setLoading(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Tombol Lonceng di Navbar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Pengaturan Notifikasi HP"
        title="Notifikasi HP Madin Blokagung"
        className={`relative p-2 rounded-full border transition-all duration-200 flex items-center justify-center ${
          isSubscribed
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        {isSubscribed ? (
          <BellRing className="w-4 h-4 text-emerald-600" />
        ) : (
          <Bell className="w-4 h-4 text-slate-500" />
        )}

        {/* Titik indikator status */}
        <span
          className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-white ${
            isSubscribed ? 'bg-emerald-500' : permission === 'denied' ? 'bg-rose-500' : 'bg-amber-400'
          }`}
        />
      </button>

      {/* Popover Pengaturan Notifikasi */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Popover */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Notifikasi HP (Push)</h3>
                <p className="text-[11px] text-slate-500">Pemberitahuan resmi langsung ke layar ponsel</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Badan */}
          <div className="my-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Status Perangkat Ini:</span>
              {isSubscribed ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif Terhubung
                </span>
              ) : permission === 'denied' ? (
                <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full text-[11px]">
                  <AlertCircle className="w-3 h-3 text-rose-600" /> Izin Diblokir
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full text-[11px]">
                  <BellOff className="w-3 h-3 text-amber-600" /> Belum Aktif
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Dapatkan pembaruan instan untuk presensi santri, surat tugas badal asatidz, pengumuman libur, dan jadwal KBM meskipun aplikasi sedang ditutup.
            </p>

            {/* Alert pesan sukses / info */}
            {testStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{testStatus}</span>
              </div>
            )}

            {/* Alert error */}
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Tombol Aksi */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            {!isSubscribed ? (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition shadow-xs active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <BellRing className="w-3.5 h-3.5" />
                )}
                <span>Aktifkan Notifikasi di HP Ini</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition shadow-xs active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Kirim Notifikasi Uji Coba ke HP Ini</span>
                </button>

                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-medium transition cursor-pointer"
                >
                  <BellOff className="w-3 h-3" />
                  <span>Matikan notifikasi di perangkat ini</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
