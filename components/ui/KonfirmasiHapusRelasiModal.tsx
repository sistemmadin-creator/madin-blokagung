'use client';

import React, { useEffect, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import {
  AlertTriangle,
  Archive,
  Database,
  Loader2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  DeleteHistoryMode,
  DeleteHistoryOptionText,
  DeleteImpactAnalysis,
} from '@/lib/services/relationDeleteTypes';

interface KonfirmasiHapusRelasiModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  analysis: DeleteImpactAnalysis | null;
  isAnalyzing?: boolean;
  isDeleting?: boolean;
  historyOptions?: DeleteHistoryOptionText;
  confirmButtonText?: string;
  onConfirm: (historyMode: DeleteHistoryMode) => Promise<void> | void;
}

const DEFAULT_HISTORY_OPTIONS: DeleteHistoryOptionText = {
  sectionTitle: 'PENANGANAN RIWAYAT TERKAIT',
  keepLabel: 'Pertahankan Arsip Histori (Rekomendasi Audit)',
  keepDesc:
    'Data utama dihapus dari daftar aktif dan relasi penugasan dilepas, sementara riwayat histori tetap disimpan dengan label [Dihapus].',
  purgeLabel: 'Hapus Bersih Beserta Riwayat Terkait',
  purgeDesc:
    'Menghapus permanen data utama sekaligus seluruh catatan riwayat terkait pada modul lain.',
};

export default function KonfirmasiHapusRelasiModal({
  isOpen,
  onClose,
  title,
  subtitle = 'Periksa ringkasan dampak penghapusan sebelum melanjutkan.',
  analysis,
  isAnalyzing = false,
  isDeleting = false,
  historyOptions = DEFAULT_HISTORY_OPTIONS,
  confirmButtonText = 'Ya, Hapus Permanen',
  onConfirm,
}: KonfirmasiHapusRelasiModalProps) {
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [historyMode, setHistoryMode] = useState<DeleteHistoryMode>('keep_history');

  useEffect(() => {
    if (isOpen) {
      setRiskAccepted(false);
      setHistoryMode('keep_history');
    }
  }, [isOpen, analysis?.items.length]);

  const items = analysis?.items || [];
  const impacts = analysis?.impacts || [];
  const activeWarnings = analysis?.activeWarnings || [];
  const hasActiveRisk = activeWarnings.length > 0;
  const isConfirmDisabled = isAnalyzing || isDeleting || (hasActiveRisk && !riskAccepted);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      title={title}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 -mt-1">{subtitle}</p>

        {/* 1. Ringkasan Target Entitas */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
          {items.length <= 1 ? (
            items[0] ? (
              <div className="space-y-1.5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-mono text-[11px] font-bold tracking-wide">
                  {items[0].code || '-'}
                </span>
                <p className="text-sm font-bold text-slate-900">{items[0].name}</p>
                {items[0].meta && <p className="text-xs text-slate-500">{items[0].meta}</p>}
              </div>
            ) : null
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold">
                  {items.length} Data Terpilih
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Pratinjau target penghapusan
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5">
                {items.map((item, idx) => (
                  <span
                    key={`${item.code}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs"
                  >
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      {item.code || '-'}
                    </span>
                    <span className="font-semibold truncate max-w-[180px]">{item.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Ringkasan Dampak Relasi Data */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>DAMPAK RELASI DATA</span>
          </div>

          {isAnalyzing ? (
            <div className="flex items-center gap-2.5 py-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>Memindai keterikatan data di modul terkait...</span>
            </div>
          ) : impacts.length > 0 ? (
            <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
              {impacts.map((line, i) => (
                <li key={i} className="leading-relaxed">
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">
              Tidak ditemukan keterikatan data aktif atau riwayat terkait pada modul lain.
            </p>
          )}

          {analysis?.safeArchiveNote && !isAnalyzing && (
            <p className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
              {analysis.safeArchiveNote}
            </p>
          )}
        </div>

        {/* 3. Peringatan Relasi Aktif + Checkbox Konfirmasi Risiko */}
        {!isAnalyzing && hasActiveRisk && (
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/90 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <h4 className="text-xs font-bold text-amber-950">
                  {analysis?.activeWarningTitle || 'Terdeteksi Relasi / Penugasan Aktif'}
                </h4>
                <ul className="space-y-1 text-xs text-amber-900 list-disc pl-4">
                  {activeWarnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            </div>

            <label className="flex items-start gap-2.5 pt-2 border-t border-amber-200/80 cursor-pointer min-h-[44px] py-1">
              <input
                type="checkbox"
                checked={riskAccepted}
                onChange={(e) => setRiskAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-amber-400 text-rose-700 focus:ring-rose-600 cursor-pointer shrink-0"
              />
              <span className="text-xs font-semibold text-amber-950 leading-relaxed select-none">
                {analysis?.activeRiskCheckboxLabel ||
                  'Saya mengerti risikonya dan tetap ingin memaksa penghapusan data ini beserta pelepasan relasi aktif di atas.'}
              </span>
            </label>
          </div>
        )}

        {/* 4. Opsi Penanganan Riwayat Terkait */}
        {!isAnalyzing && (analysis?.hasHistoricalRecords ?? true) && (
          <div className="space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {historyOptions.sectionTitle}
            </p>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer min-h-[44px] ${
                  historyMode === 'keep_history'
                    ? 'border-slate-800 bg-slate-50/80 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="delete-history-mode"
                  value="keep_history"
                  checked={historyMode === 'keep_history'}
                  onChange={() => setHistoryMode('keep_history')}
                  className="mt-0.5 w-4 h-4 text-slate-900 focus:ring-slate-700 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Archive className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-xs font-bold text-slate-900">
                      {historyOptions.keepLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {historyOptions.keepDesc}
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer min-h-[44px] ${
                  historyMode === 'purge_all'
                    ? 'border-rose-700 bg-rose-50/50 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="delete-history-mode"
                  value="purge_all"
                  checked={historyMode === 'purge_all'}
                  onChange={() => setHistoryMode('purge_all')}
                  className="mt-0.5 w-4 h-4 text-rose-700 focus:ring-rose-600 cursor-pointer shrink-0"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                    <span className="text-xs font-bold text-slate-900">
                      {historyOptions.purgeLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {historyOptions.purgeDesc}
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* 5. Footer Aksi */}
        <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isConfirmDisabled}
            onClick={() => onConfirm(historyMode)}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-rose-700 hover:bg-rose-800 text-white shadow-sm transition disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>{isDeleting ? 'Memproses...' : confirmButtonText}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
