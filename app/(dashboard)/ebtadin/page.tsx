'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  UserCheck,
  Building2,
  Lock,
  Unlock,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  Award,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { useEbtadinStore } from '@/stores/useEbtadinStore';
export default function DataEbtadinHubPage() {
  const {
    tahunList,
    activeTahun,
    formasiList,
    santriList,
    asatidzList,
    isProcessingRpc,
    fetchTahunList,
    setActiveTahun,
    daftarKelasEbtadin,
    sinkronkanDariMaster,
    tetapkanDataEbtadin,
  } = useEbtadinStore();
  const [showConfirmLockModal, setShowConfirmLockModal] = useState(false);
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    fetchTahunList();
  }, [fetchTahunList]);
  const handleDaftarKelas = async () => {
    if (!activeTahun) return;
    const res = await daftarKelasEbtadin(activeTahun.id);
    setFeedbackMsg({ type: res.success ? 'success' : 'error', text: res.message });
  };
  const handleSyncMaster = async () => {
    if (!activeTahun) return;
    const res = await sinkronkanDariMaster(activeTahun.id);
    setFeedbackMsg({ type: res.success ? 'success' : 'error', text: res.message });
  };
  const handleExecuteLock = async () => {
    if (!activeTahun || confirmKeyword.trim().toUpperCase() !== 'TETAPKAN') return;
    const res = await tetapkanDataEbtadin(activeTahun.id, 'Admin');
    setShowConfirmLockModal(false);
    setConfirmKeyword('');
    setFeedbackMsg({ type: res.success ? 'success' : 'error', text: res.message });
  };
  const isLocked = activeTahun?.status === 'LOCKED';
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-xl bg-emerald-100 text-[#0f766e] flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-2xs">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                  Pusat Kendali Data EBTADIN
                </h1>
                {isLocked ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Lock className="w-3 h-3 text-amber-700" />
                    DATA DITETAPKAN (LOCKED)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Unlock className="w-3 h-3 text-emerald-600" />
                    SINKRON AKTIF (DRAFT)
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Pengelolaan berkas kelulusan santri jenjang 4 Ula, 2 Wustho, dan 2 Ulya Madrasah Diniyyah Al-Amiriyyah.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={activeTahun?.id || ''}
              onChange={(e) => {
                const found = tahunList.find((t) => t.id === e.target.value);
                if (found) setActiveTahun(found);
              }}
              className="text-xs font-bold py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-madin-600"
            >
              {tahunList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_angkatan} {t.status === 'LOCKED' ? '(Terkunci)' : '(Aktif)'}
                </option>
              ))}
            </select>
            {!isLocked && (
              <>
                <button
                  type="button"
                  onClick={handleDaftarKelas}
                  disabled={isProcessingRpc}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Daftar Kelas</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncMaster}
                  disabled={isProcessingRpc}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isProcessingRpc ? 'animate-spin' : ''}`} />
                  <span>Sinkronkan Ulang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmLockModal(true)}
                  disabled={isProcessingRpc}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-2xs flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-950" />
                  <span>Tetapkan Data</span>
                </button>
              </>
            )}
          </div>
        </div>
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Rombel Ebtadin</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formasiList.length} Rombel</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">4 Ula, 2 Wustho, 2 Ulya</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Santri Peserta</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{santriList.length} Santri</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Memiliki No. Seri Ijazah</p>
            </div>
            <div className="p-2.5 rounded-lg bg-cyan-100 text-cyan-800">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mustahiq & Penguji</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{asatidzList.length} Asatidz</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Pengawas Ruang Ujian</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Ijazah</p>
              <h3 className="text-base font-bold text-slate-900 mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Siap Diterbitkan
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Format Standar MDN</p>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-800">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/ebtadin/santri"
          className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
              Data Santri Ebtadin
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Daftar seluruh calon penerima ijazah jenjang akhir lengkap dengan nomor seri ijazah resmi.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Buka Data Santri</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          href="/ebtadin/asatidz"
          className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-800 flex items-center justify-center mb-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
              Data Asatidz & Penguji
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Direktori para Mustahiq, pengawas ruang, dan penguji EBTADIN kelas 4 Ula, 2 Wustho, 2 Ulya.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Buka Data Asatidz</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          href="/ebtadin/formasi/pa"
          className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
              Formasi Kelas Putra
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Pemetaan ruang KBM Diniyyah Malam dan Takror Siang khusus rombel santri putra peserta ujian akhir.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Buka Formasi Putra</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          href="/ebtadin/formasi/pi"
          className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 shadow-2xs hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
              Formasi Kelas Putri
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tabel kop resmi pemetaan ruang Diniyyah & Takror santri putri (sesuai tata letak Gambar 1).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Buka Formasi Putri</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          href="/ebtadin/serah-ijazah"
          className="group p-5 rounded-2xl bg-gradient-to-br from-[#0b4731] to-emerald-950 text-white border border-amber-400/30 hover:border-amber-400 shadow-md transition flex flex-col justify-between md:col-span-2"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                Menu Utama EBTADIN
              </span>
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition">
              Serah Ijazah Santri
            </h4>
            <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
              Pemantauan, tanda terima, dan serah terima map ijazah santri per kelas binaan (sesuai tata letak Gambar 2).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-800/80 flex items-center justify-between text-xs font-bold text-amber-300">
            <span>Masuk ke Modul Serah Ijazah</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
      {showConfirmLockModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Tetapkan Data EBTADIN Permanen?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tindakan ini akan <strong>memutuskan sinkronisasi</strong> dengan master santri aktif dan mengunci data kelulusan angkatan ini sebagai arsip abadi. Data di EBTADIN tidak akan hilang meskipun master data KBM asli di-reset pada tahun ajaran baru.
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Ketik kata <span className="text-rose-600 font-mono">TETAPKAN</span> untuk konfirmasi:
              </label>
              <input
                type="text"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder="TETAPKAN"
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 font-mono text-center tracking-widest uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmLockModal(false);
                  setConfirmKeyword('');
                }}
                className="w-1/2 py-2 px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteLock}
                disabled={confirmKeyword.trim().toUpperCase() !== 'TETAPKAN'}
                className="w-1/2 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition disabled:opacity-40"
              >
                Kunci &amp; Tetapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
