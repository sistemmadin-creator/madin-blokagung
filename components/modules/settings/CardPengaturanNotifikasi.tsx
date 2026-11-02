'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Smartphone,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Radio,
  Sparkles,
} from 'lucide-react';
import { WebPushClientService, PushPermissionStatus } from '@/lib/services/webPushClient';

export default function CardPengaturanNotifikasi() {
  const [permission, setPermission] = useState<PushPermissionStatus>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Siaran Admin
  const [broadcastTitle, setBroadcastTitle] = useState('Pemberitahuan Madin Blokagung');
  const [broadcastBody, setBroadcastBody] = useState('Informasi penting terkait kegiatan belajar mengajar Madin.');
  const [broadcastRole, setBroadcastRole] = useState('all');

  useEffect(() => {
    async function initStatus() {
      const p = WebPushClientService.getPermission();
      setPermission(p);
      if (p === 'granted') {
        const sub = await WebPushClientService.getExistingSubscription();
        setIsSubscribed(!!sub);
      }
    }
    initStatus();
  }, []);

  const handleToggleSubscribe = async () => {
    setLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    if (isSubscribed) {
      const res = await WebPushClientService.unsubscribe();
      if (res.success) {
        setIsSubscribed(false);
        setStatusMessage('Notifikasi di perangkat ini telah dinonaktifkan.');
      } else {
        setErrorMessage(res.error || 'Gagal menonaktifkan notifikasi');
      }
    } else {
      const res = await WebPushClientService.requestAndSubscribe();
      setPermission(res.permission);
      if (res.success) {
        setIsSubscribed(true);
        setStatusMessage('Perangkat ini berhasil terhubung! Anda akan menerima notifikasi di bilah HP.');
      } else {
        setErrorMessage(res.error || 'Izin notifikasi tidak diberikan');
      }
    }
    setLoading(false);
  };

  const handleSendTest = async () => {
    setLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const res = await WebPushClientService.sendTestPushToCurrentDevice(
      'Madin Blokagung',
      'Tes Berhasil! Notifikasi HP Madin Blokagung aktif dan terhubung.'
    );

    if (res.success) {
      setStatusMessage('Notifikasi uji coba terkirim! Silakan periksa bilah notifikasi di atas layar ponsel Anda.');
    } else {
      setErrorMessage(res.error || 'Gagal mengirim notifikasi tes.');
    }
    setLoading(false);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;

    setBroadcastLoading(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle,
          body: broadcastBody,
          role: broadcastRole === 'all' ? undefined : broadcastRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim siaran notifikasi');
      }

      setStatusMessage(
        `Siaran berhasil dikirim ke ${data.sentCount} perangkat (${data.failedCount} gagal).`
      );
    } catch (err: unknown) {
      const errorObj = err as Error;
      setErrorMessage(errorObj.message || 'Terjadi kesalahan pengiriman.');
    } finally {
      setBroadcastLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Kartu Status Perangkat Lokal */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Integrasi Notifikasi Layar HP (Web Push)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mengirimkan notifikasi langsung ke bilah status ponsel santri, asatidz, dan wali santri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSubscribed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Aktif di Perangkat Ini
              </span>
            ) : permission === 'denied' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Izin Diblokir di Browser
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                Belum Terhubung
              </span>
            )}
          </div>
        </div>

        {/* Notifikasi info / error */}
        {statusMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Konten & Tombol Aksi */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Keunggulan Notifikasi Push Web / PWA:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>Pesan masuk ke bilah notifikasi HP walau aplikasi sedang ditutup.</li>
              <li>Mendukung ponsel Android (Chrome, Edge, Samsung Internet) &amp; iOS 16.4+.</li>
              <li>Pemberitahuan instan: presensi santri (alfa/sakit), surat tugas badal, dan pengumuman.</li>
            </ul>
          </div>

          <div className="flex flex-col justify-center gap-2.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-600">
              Tekan tombol berikut untuk meminta izin browser dan mendaftarkan ponsel Anda:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSubscribe}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                  isSubscribed
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : isSubscribed ? (
                  <Bell className="w-3.5 h-3.5" />
                ) : (
                  <BellRing className="w-3.5 h-3.5" />
                )}
                <span>{isSubscribed ? 'Nonaktifkan Notifikasi' : 'Minta Izin & Aktifkan Notifikasi'}</span>
              </button>

              {isSubscribed && (
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kirim Uji Coba ke HP Ini</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kartu Siaran Notifikasi (Broadcast Admin) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Siaran Notifikasi Massal (Admin Broadcast)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kirimkan pengumuman serentak ke HP pengguna yang sudah mengizinkan notifikasi
            </p>
          </div>
        </div>

        <form onSubmit={handleSendBroadcast} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul Notifikasi
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Contoh: Pemberitahuan Libur KBM Madin"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Penerima
              </label>
              <select
                value={broadcastRole}
                onChange={(e) => setBroadcastRole(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="all">Semua Perangkat Terdaftar</option>
                <option value="asatidz">Khusus Asatidz / Pengajar</option>
                <option value="wali">Khusus Wali Santri</option>
                <option value="admin">Khusus Pengurus / Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Isi Pesan Notifikasi (Maks. 160 karakter untuk keterbacaan optimal di HP)
            </label>
            <textarea
              value={broadcastBody}
              onChange={(e) => setBroadcastBody(e.target.value)}
              placeholder="Tuliskan isi pengumuman..."
              rows={3}
              maxLength={250}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={broadcastLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {broadcastLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Kirimkan Siaran ke Seluruh HP</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
