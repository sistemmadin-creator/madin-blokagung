'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2,
  Layers,
  FileText,
  RefreshCw,
  Camera,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { DatabaseTahunAjaranRekap } from '@/types/database-ta';

interface DatabaseTaHeaderProps {
  title: string;
  subtitle: string;
  activeTahunAjaran: string;
  activeSavedSnapshot: DatabaseTahunAjaranRekap | null;
  isLoading: boolean;
  isSaving: boolean;
  canEdit?: boolean;
  onRefresh: () => void;
  onCaptureActive?: () => void;
  notice?: { type: 'success' | 'error'; text: string } | null;
  extraActions?: React.ReactNode;
}

const NAV_ITEMS = [
  {
    href: '/database-ta',
    label: 'Progres Lintas Tahun',
    icon: BarChart2,
  },
  {
    href: '/database-ta/rekap',
    label: 'Rekap Kelas & Akademik',
    icon: Layers,
  },
  {
    href: '/database-ta/arsip',
    label: 'Arsip & Ekspor Tahunan',
    icon: FileText,
  },
];

export default function DatabaseTaHeader({
  title,
  subtitle,
  activeTahunAjaran,
  activeSavedSnapshot,
  isLoading,
  isSaving,
  canEdit = true,
  onRefresh,
  onCaptureActive,
  notice,
  extraActions,
}: DatabaseTaHeaderProps) {
  const pathname = usePathname();
  const isLocked = activeSavedSnapshot?.status_arsip === 'terkunci';

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                <BarChart2 className="w-5 h-5" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 m-0">
                {title}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                TA Aktif {activeTahunAjaran}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <ShieldCheck className="w-3 h-3" />
                Khusus 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA (Non-EBTADIN)
              </span>
            </div>
            <p className="text-xs text-slate-500 m-0">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>

            {onCaptureActive && canEdit && (
              <button
                type="button"
                data-testid="btn-capture-snapshot-ta"
                onClick={onCaptureActive}
                disabled={isSaving || isLocked}
                title={
                  isLocked
                    ? `Arsip TA ${activeTahunAjaran} sudah terkunci`
                    : `Simpan / perbarui rekap tahunan TA ${activeTahunAjaran}`
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-60 ${
                  isLocked
                    ? 'bg-slate-200 text-slate-600 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                }`}
              >
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>
                  {isLocked
                    ? `TA ${activeTahunAjaran} Terkunci`
                    : activeSavedSnapshot
                    ? `Perbarui Rekap TA ${activeTahunAjaran}`
                    : `Rekam Snapshot TA ${activeTahunAjaran}`}
                </span>
              </button>
            )}

            {extraActions}
          </div>
        </div>

        {/* Sub-Navigasi 3 Halaman Database Tahun Ajaran */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            {activeSavedSnapshot ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Snapshot TA {activeTahunAjaran} tersimpan ({activeSavedSnapshot.status_arsip.toUpperCase()})
              </span>
            ) : (
              <span className="text-amber-700 font-semibold">
                TA {activeTahunAjaran} masih berstatus Pratinjau Langsung (belum direkam ke arsip)
              </span>
            )}
          </div>
        </div>
      </div>

      {notice && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-medium ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}
