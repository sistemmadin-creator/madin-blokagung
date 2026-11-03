'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Users,
  Copy,
  Check,
  X,
  Send,
  RefreshCw,
  BellRing,
  ClipboardCheck,
  MessageSquare,
} from 'lucide-react';
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

const WhatsAppIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

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

  // Multi-checkbox jam: default [1, 2] (Diniyyah Jam 1 & 2)
  const [selectedJams, setSelectedJams] = useState<number[]>([1, 2]);
  // Radio gender: 'SEMUA' | 'PA' | 'PI'
  const [filterGender, setFilterGender] = useState<'SEMUA' | 'PA' | 'PI'>('SEMUA');
  const [waText, setWaText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialJam === 'ALL') {
        setSelectedJams([1, 2, 3, 4]);
      } else if (initialJam === 3) {
        setSelectedJams([3]);
      } else if (initialJam === 4) {
        setSelectedJams([4]);
      } else {
        setSelectedJams([1, 2]);
      }
      setFilterGender('SEMUA');
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

  // Pastikan sesiHariIni tersinkronisasi bila dibuka dari halaman Rekap Absensi atau saat formasi selesai dimuat
  useEffect(() => {
    if (isOpen && asatidzList.length > 0) {
      const totalSesi =
        (sesiHariIni[1]?.length || 0) +
        (sesiHariIni[2]?.length || 0) +
        (sesiHariIni[3]?.length || 0) +
        (sesiHariIni[4]?.length || 0);
      const hasUnresolved = (sesiHariIni[1] || []).some(
        (s) => s.blok === 'Belum Diatur' || !s.blok
      );
      if (totalSesi === 0 || (formasiList.length > 0 && hasUnresolved)) {
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
    syncSesiHariIni,
  ]);

  const regenerateText = () => {
    const infoLibur = liburMapByDate[selectedDate] || null;
    const isLibur = Boolean(infoLibur);

    const text = generateLaporanWAText({
      tanggal: selectedDate,
      sesiHariIni,
      getSesiStatus: getSesiStatusData,
      selectedJams,
      filterGender,
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
  }, [isOpen, selectedDate, selectedJams, filterGender, sesiHariIni, liburMapByDate]);

  if (!isOpen) return null;

  const handleToggleJam = (jams: number[]) => {
    setSelectedJams((prev) => {
      const allPresent = jams.every((j) => prev.includes(j));
      if (allPresent) {
        return prev.filter((j) => !jams.includes(j));
      } else {
        return Array.from(new Set([...prev, ...jams]));
      }
    });
  };

  const isDiniyyahChecked = selectedJams.includes(1) || selectedJams.includes(2);
  const isJam3Checked = selectedJams.includes(3);
  const isJam4Checked = selectedJams.includes(4);

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
    if (!waText) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSendPush = async () => {
    if (!waText) return;
    setPushLoading(true);
    setPushResult(null);
    try {
      const listJudul: string[] = [];
      if (isDiniyyahChecked) listJudul.push('Diniyyah');
      if (isJam3Checked) listJudul.push('Bandongan');
      if (isJam4Checked) listJudul.push('Takror');
      const jamLabel = listJudul.length > 0 ? listJudul.join(' & ') : 'Absensi';

      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Laporan Presensi KBM (${jamLabel}) - Madin Blokagung`,
          body: waText,
          url: '/absen-cepat',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim notifikasi');
      setPushResult(`Berhasil terkirim ke ${data.sentCount} perangkat HP!`);
      setTimeout(() => setPushResult(null), 4000);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setPushResult(`Error: ${errorObj.message}`);
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-wa-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header (Hijau WhatsApp resmi persis referensi) */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 shadow-xs">
              <WhatsAppIcon className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3
                id="modal-wa-title"
                aria-label="Generator Laporan Absensi WhatsApp"
                className="text-base font-bold tracking-tight text-white flex items-center gap-1.5"
              >
                Generator Laporan Absensi WhatsApp
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                Format pesan otomatis terstruktur per Blok & Kelas
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
        <div className="p-6 space-y-4 bg-slate-50/50">
          {/* Pilihan Sesi Jam & Filter Kategori (2 Kolom Persis Gambar 2) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* 1. Pilih Sesi Jam Laporan */}
            <div className="md:col-span-7 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <label className="flex items-center text-xs font-bold text-slate-800 mb-2.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0" />
                1. Pilih Sesi Jam Laporan:
              </label>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDiniyyahChecked}
                    onChange={() => handleToggleJam([1, 2])}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-colors"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Diniyyah (Jam 1 &amp; 2)
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isJam3Checked}
                    onChange={() => handleToggleJam([3])}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-colors"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Bandongan &amp; Syawir (Jam 3)
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isJam4Checked}
                    onChange={() => handleToggleJam([4])}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-colors"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Takror (Jam 4)
                  </span>
                </label>
              </div>
            </div>

            {/* 2. Kategori Putra / Putri */}
            <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <label className="flex items-center text-xs font-bold text-slate-800 mb-2.5">
                <Users className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0" />
                2. Kategori Putra / Putri:
              </label>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="wa_filter_gender"
                    value="SEMUA"
                    checked={filterGender === 'SEMUA'}
                    onChange={() => setFilterGender('SEMUA')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-colors"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Semua
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="wa_filter_gender"
                    value="PA"
                    checked={filterGender === 'PA'}
                    onChange={() => setFilterGender('PA')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-colors"
                  />
                  <span className="text-xs font-semibold text-blue-700">
                    Putra (PA)
                  </span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="wa_filter_gender"
                    value="PI"
                    checked={filterGender === 'PI'}
                    onChange={() => setFilterGender('PI')}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-colors"
                  />
                  <span className="text-xs font-semibold text-rose-700">
                    Putri (PI)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Area Preview Teks WhatsApp */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center text-xs font-bold text-slate-800">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 mr-1.5 shrink-0" />
                Pratinjau Teks Laporan WhatsApp:
              </label>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200">
                  {waText.length} Karakter
                </span>
                <button
                  type="button"
                  onClick={regenerateText}
                  title="Susun ulang pratinjau teks"
                  className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Alert Hasil Kirim Push */}
            {pushResult && (
              <div
                className={`p-2.5 mb-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  pushResult.startsWith('Error')
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}
              >
                <BellRing className="w-4 h-4 shrink-0" />
                <span>{pushResult}</span>
              </div>
            )}

            <textarea
              rows={12}
              value={waText}
              onChange={(e) => setWaText(e.target.value)}
              className="w-full p-3 font-mono text-[12px] bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed shadow-2xs"
            />

            {/* Legenda Simbol Persis Gambar 2 */}
            <small className="text-slate-500 text-[11px] italic block mt-2">
              *Ket: ✅ Hadir &bull; 🅰️ Alfa/Kosong &bull; ℹ️ Izin &bull; 🤒 Sakit &bull; ⏳ Terlambat &bull; 🔄 Digantikan
            </small>
          </div>
        </div>

        {/* Modal Footer (Persis Gambar 2) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Tutup
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Tombol Web Push Notif */}
            <button
              type="button"
              onClick={handleSendPush}
              disabled={pushLoading || !waText}
              title="Kirim Notifikasi Web Push ke seluruh perangkat HP yang terdaftar"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {pushLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Kirim Notif</span>
            </button>

            {/* Tombol Salin Teks */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border border-emerald-600 text-emerald-700 hover:bg-emerald-50 transition-colors shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>

            {/* Tombol Kirim ke WhatsApp */}
            <button
              type="button"
              onClick={handleSendWA}
              disabled={!waText}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <WhatsAppIcon className="w-4 h-4 fill-current" />
              <span>Kirim ke WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
