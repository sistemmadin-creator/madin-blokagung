'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Copy, Check, X, Send, RefreshCw } from 'lucide-react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useFanStore } from '@/stores/useFanStore';
import { JamKbm } from '@/types/absensi';
import { generateLaporanWAText } from '@/lib/utils/absensiHelper';

interface ModalGeneratorWAProps {
  isOpen: boolean;
  onClose: () => void;
  initialJam?: JamKbm | 'ALL';
}

export default function ModalGeneratorWA({
  isOpen,
  onClose,
  initialJam = 'ALL',
}: ModalGeneratorWAProps) {
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
  const [waText, setWaText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setJamPilihan(String(initialJam));
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

  // Pastikan sesiHariIni tersinkronisasi bila dibuka dari halaman Rekap Absensi
  useEffect(() => {
    if (isOpen && asatidzList.length > 0) {
      const totalSesi =
        (sesiHariIni[1]?.length || 0) +
        (sesiHariIni[2]?.length || 0) +
        (sesiHariIni[3]?.length || 0) +
        (sesiHariIni[4]?.length || 0);
      if (totalSesi === 0) {
        syncSesiHariIni(
          asatidzList,
          jadwalMap,
          formasiList,
          fanConfig
        );
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
    setWaText(text);
  };

  useEffect(() => {
    if (isOpen) {
      regenerateText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedDate, jamPilihan, sesiHariIni, liburMapByDate]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(waText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
    }
  };

  const handleSendWA = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Generator Laporan WhatsApp
              </h3>
              <p className="text-[11px] text-emerald-100">
                Format pesan otomatis dikelompokkan per Blok & Kelas
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

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">
                Cakupan Jam:
              </label>
              <select
                value={jamPilihan}
                onChange={(e) => setJamPilihan(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Jam (Jam 1 - 4)</option>
                <option value="1">Khusus Jam Ke-1</option>
                <option value="2">Khusus Jam Ke-2</option>
                <option value="3">Khusus Jam Ke-3</option>
                <option value="4">Khusus Jam Ke-4</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px]">
                {waText.length} Karakter
              </span>
              <button
                type="button"
                onClick={regenerateText}
                title="Susun ulang teks"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <textarea
              rows={13}
              value={waText}
              onChange={(e) => setWaText(e.target.value)}
              className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Tutup
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Salin Teks WhatsApp
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendWA}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Kirim ke WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
