'use client';

import React, { useState, useEffect } from 'react';
import { BellRing, CheckCircle2, AlertCircle, RefreshCw, X, Send, Smartphone } from 'lucide-react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useFanStore } from '@/stores/useFanStore';
import { JamKbm } from '@/types/absensi';
import { generateLaporanWAText } from '@/lib/utils/absensiHelper';

interface ModalKirimNotifCepatProps {
  isOpen: boolean;
  onClose: () => void;
  initialJam?: JamKbm | 'ALL';
}

export default function ModalKirimNotifCepat({
  isOpen,
  onClose,
  initialJam = 'ALL',
}: ModalKirimNotifCepatProps) {
  const {
    selectedDate,
    sesiHariIni,
    liburMapByDate,
    getSesiStatusData,
    syncSesiHariIni,
  } = useAbsensiStore();

  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { jadwalMap, fetchJadwal } = useJadwalStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { fanConfig, fetchFanData } = useFanStore();

  const [jamPilihan, setJamPilihan] = useState<string>(String(initialJam));
  const [targetRole, setTargetRole] = useState<string>('all');
  const [notifText, setNotifText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setJamPilihan(String(initialJam));
      setStatusMsg(null);
      setErrorMsg(null);
      if (asatidzList.length === 0) fetchAsatidz();
      if (Object.keys(jadwalMap).length === 0) fetchJadwal();
      if (formasiList.length === 0) fetchFormasi();
      if (Object.keys(fanConfig).length === 0) fetchFanData();
    }
  }, [
    isOpen,
    initialJam,
    asatidzList.length,
    jadwalMap,
    formasiList.length,
    fanConfig,
    fetchAsatidz,
    fetchJadwal,
    fetchFormasi,
    fetchFanData,
  ]);

  useEffect(() => {
    if (isOpen && asatidzList.length > 0) {
      const totalSesi =
        (sesiHariIni[1]?.length || 0) +
        (sesiHariIni[2]?.length || 0) +
        (sesiHariIni[3]?.length || 0) +
        (sesiHariIni[4]?.length || 0);
      if (totalSesi === 0) {
        syncSesiHariIni(asatidzList, jadwalMap, formasiList, fanConfig);
      }
    }
  }, [
    isOpen,
    asatidzList,
    jadwalMap,
    formasiList,
    fanConfig,
    sesiHariIni,
    syncSesiHariIni,
  ]);

  const regenerateText = () => {
    const infoLibur = liburMapByDate[selectedDate] || null;
    const isLibur = Boolean(infoLibur);
    const jamNums: JamKbm[] =
      jamPilihan === 'ALL'
        ? [1, 2, 3, 4]
        : [parseInt(jamPilihan, 10) as JamKbm];

    const text = generateLaporanWAText({
      tanggal: selectedDate,
      sesiHariIni,
      getSesiStatus: getSesiStatusData,
      jamNums,
      judulJamLabel:
        jamPilihan === 'ALL' ? undefined : `JAM KE-${jamPilihan}`,
      isLibur,
      infoLibur,
    });
    setNotifText(text);
  };

  useEffect(() => {
    if (isOpen) {
      regenerateText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedDate, jamPilihan, sesiHariIni, liburMapByDate]);

  if (!isOpen) return null;

  const handleKirimNotif = async () => {
    if (!notifText.trim()) return;

    setLoading(true);
    setStatusMsg(null);
    setErrorMsg(null);

    const jamLabel =
      jamPilihan === 'ALL' ? 'Semua Jam' : `Jam Ke-${jamPilihan}`;
    const title = `Laporan Presensi KBM (${jamLabel}) - Madin Blokagung`;

    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body: notifText,
          url: '/absen-cepat',
          role: targetRole === 'all' ? undefined : targetRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim notifikasi push');
      }

      setStatusMsg(
        `Notifikasi berhasil dikirim ke ${data.sentCount} perangkat HP (${data.failedCount} tidak aktif).`
      );
    } catch (err: unknown) {
      const errorObj = err as Error;
      setErrorMsg(errorObj.message || 'Terjadi kesalahan saat pengiriman.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-800 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <BellRing className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Kirim Notifikasi HP (Laporan Presensi)</h3>
              <p className="text-[11px] text-emerald-100">
                Mengirim laporan presensi langsung ke bilah notifikasi ponsel pengguna
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Isi Modal */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Pilihan Cakupan Jam & Target Penerima */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cakupan Jam:
              </label>
              <select
                value={jamPilihan}
                onChange={(e) => setJamPilihan(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Jam (Jam 1 - 4)</option>
                <option value="1">Khusus Jam Ke-1</option>
                <option value="2">Khusus Jam Ke-2</option>
                <option value="3">Khusus Jam Ke-3</option>
                <option value="4">Khusus Jam Ke-4</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target HP:
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Perangkat Terdaftar</option>
                <option value="asatidz">Khusus Asatidz / Pengajar</option>
                <option value="wali">Khusus Wali Santri</option>
                <option value="admin">Khusus Pengurus / Admin</option>
              </select>
            </div>
          </div>

          {/* Feedback Banner */}
          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Teks Isi Notifikasi (Sama dengan WA) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                Isi Notifikasi (Sesuai Chat WA):
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {notifText.length} Karakter
              </span>
            </div>
            <textarea
              rows={11}
              value={notifText}
              onChange={(e) => setNotifText(e.target.value)}
              placeholder="Format laporan presensi..."
              className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleKirimNotif}
            disabled={loading || !notifText.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Kirim Notif Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
