'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  CalendarRange,
  Shield,
  Tag,
  User,
  LayoutGrid,
} from 'lucide-react';
import {
  BAGIAN_KEPENGURUSAN_META,
  getInitialsFromName,
  KELOMPOK_KEPENGURUSAN_META,
  KelompokKepengurusan,
  KepengurusanJabatan,
  KepengurusanPeriode,
  sanitizeMemberPhotoUrl,
} from '@/types/kepengurusan';

export interface SelectedKepengurusanModalState {
  jabatan: KepengurusanJabatan;
  mode: 'member' | 'unit';
  memberIndex: number;
}

interface ModalDetailPengurusProps {
  selection: SelectedKepengurusanModalState | null;
  periode: KepengurusanPeriode | null;
  onClose: () => void;
  onChangeSelection: (next: SelectedKepengurusanModalState) => void;
}

const TIER_HEADER_CLASSES: Record<KelompokKepengurusan, string> = {
  pimpinan: 'bg-[#1b4d47] text-white',
  kepala_madrasah: 'bg-[#7b5239] text-white',
  pkm_dan_koordinator: 'bg-gradient-to-r from-[#8f5b10] to-[#a36a14] text-white',
  panitia_dan_luar: 'bg-[#0e745c] text-white',
};

export default function ModalDetailPengurus({
  selection,
  periode,
  onClose,
  onChangeSelection,
}: ModalDetailPengurusProps) {
  const [brokenPhotoKeys, setBrokenPhotoKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selection) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (selection.mode === 'member' && selection.jabatan.anggota.length > 1) {
        if (e.key === 'ArrowRight') {
          const nextIdx = (selection.memberIndex + 1) % selection.jabatan.anggota.length;
          onChangeSelection({ ...selection, memberIndex: nextIdx });
        } else if (e.key === 'ArrowLeft') {
          const prevIdx =
            (selection.memberIndex - 1 + selection.jabatan.anggota.length) %
            selection.jabatan.anggota.length;
          onChangeSelection({ ...selection, memberIndex: prevIdx });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selection, onClose, onChangeSelection]);

  if (!selection) return null;

  const { jabatan, mode, memberIndex } = selection;
  const members = jabatan.anggota || [];
  const safeIndex =
    members.length > 0 ? Math.min(Math.max(0, memberIndex), members.length - 1) : 0;
  const currentMember = members[safeIndex] || null;
  const headerColorClass = TIER_HEADER_CLASSES[jabatan.kelompok] || 'bg-[#0b5751] text-white';

  const markBrokenPhoto = (key: string) => {
    setBrokenPhotoKeys((prev) => ({ ...prev, [key]: true }));
  };

  const renderMemberPhoto = (
    fotoUrlRaw: string | undefined,
    nama: string,
    keyId: string,
    sizeClass: string,
    isCompact = false
  ) => {
    const validUrl = sanitizeMemberPhotoUrl(fotoUrlRaw);
    const isBroken = Boolean(brokenPhotoKeys[keyId]);

    if (validUrl && !isBroken) {
      return (
        <img
          src={validUrl}
          alt={`Foto ${nama}`}
          onError={() => markBrokenPhoto(keyId)}
          className={`${sizeClass} object-cover object-top`}
        />
      );
    }

    return (
      <div
        className={`${sizeClass} bg-emerald-50 dark:bg-slate-800 flex flex-col items-center justify-center text-emerald-900 dark:text-emerald-200 select-none px-2 text-center`}
      >
        <span
          className={`${
            isCompact ? 'text-sm' : 'text-3xl sm:text-4xl'
          } font-extrabold font-serif tracking-tight`}
        >
          {getInitialsFromName(nama)}
        </span>
        {!isCompact && (
          <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <User className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Foto belum diunggah</span>
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-detail-pengurus-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      >
        {/* Header Modal */}
        <div className={`px-5 py-4 flex items-center justify-between gap-3 ${headerColorClass}`}>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/85 truncate">
              {KELOMPOK_KEPENGURUSAN_META[jabatan.kelompok]?.label || 'Struktur Kepengurusan'}
            </p>
            <h2
              id="modal-detail-pengurus-title"
              className="text-base sm:text-lg font-extrabold uppercase tracking-wide truncate"
            >
              {jabatan.nama_jabatan}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog profil pengurus"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl bg-black/15 hover:bg-black/25 text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {mode === 'member' && currentMember ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Bingkai Foto Pengurus */}
                <div className="shrink-0">
                  <div className="w-44 h-56 sm:w-48 sm:h-60 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-sm">
                    {renderMemberPhoto(
                      currentMember.foto_url,
                      currentMember.nama,
                      `${jabatan.id}-${currentMember.id}`,
                      'w-full h-full'
                    )}
                  </div>
                </div>

                {/* Biodata & Keterangan Jabatan */}
                <div className="flex-1 min-w-0 w-full text-center sm:text-left space-y-4">
                  <div className="space-y-1.5">
                    {currentMember.sub_label && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 border border-amber-300/60 dark:border-amber-800 text-xs font-extrabold text-amber-900 dark:text-amber-200">
                        <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{currentMember.sub_label}</span>
                      </span>
                    )}
                    <h3 className="text-xl sm:text-2xl font-extrabold font-serif text-slate-900 dark:text-white leading-snug break-words">
                      {currentMember.nama}
                    </h3>
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                      {jabatan.nama_jabatan}
                    </p>
                  </div>

                  <dl className="grid grid-cols-1 gap-2.5 text-left pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                      <Shield
                        className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <dt className="font-semibold text-slate-600 dark:text-slate-300">
                          Kelompok &amp; Bagian
                        </dt>
                        <dd className="font-bold text-slate-900 dark:text-white">
                          {KELOMPOK_KEPENGURUSAN_META[jabatan.kelompok]?.badge} ({BAGIAN_KEPENGURUSAN_META[jabatan.kategori_bagian]?.label})
                        </dd>
                      </div>
                    </div>

                    {periode && (
                      <div className="flex items-start gap-2.5 text-xs sm:text-sm">
                        <CalendarRange
                          className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <div>
                          <dt className="font-semibold text-slate-600 dark:text-slate-300">
                            Masa Khidmah
                          </dt>
                          <dd className="font-bold text-slate-900 dark:text-white">
                            {periode.nama_periode}
                          </dd>
                        </div>
                      </div>
                    )}

                    {currentMember.catatan && (
                      <div className="mt-1 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                        {currentMember.catatan}
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  Pilih salah satu pengurus di bawah ini untuk melihat foto dan detail lengkapnya.
                </p>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <Users className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{members.length} Personel</span>
                </span>
              </div>

              {members.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-6 text-center text-sm text-slate-600 dark:text-slate-300">
                  Belum ada data personalia pada unit jabatan ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map((ang, idx) => (
                    <button
                      key={ang.id}
                      type="button"
                      onClick={() =>
                        onChangeSelection({
                          jabatan,
                          mode: 'member',
                          memberIndex: idx,
                        })
                      }
                      className="min-h-[68px] flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-emerald-50/80 dark:hover:bg-slate-800 hover:border-emerald-500/50 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 cursor-pointer"
                    >
                      <div className="w-12 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shrink-0">
                        {renderMemberPhoto(
                          ang.foto_url,
                          ang.nama,
                          `unit-${jabatan.id}-${ang.id}`,
                          'w-full h-full',
                          true
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {ang.sub_label && (
                          <span className="inline-block text-[11px] font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-0.5">
                            {ang.sub_label}
                          </span>
                        )}
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                          {ang.nama}
                        </p>
                      </div>
                      <ChevronRight
                        className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigasi Antar Pengurus */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 flex flex-wrap items-center justify-between gap-2">
          {mode === 'member' && members.length > 1 ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChangeSelection({
                      jabatan,
                      mode: 'member',
                      memberIndex: (safeIndex - 1 + members.length) % members.length,
                    })
                  }
                  className="min-h-[44px] inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-emerald-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  <span>Sebelumnya</span>
                </button>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1.5">
                  {safeIndex + 1} / {members.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onChangeSelection({
                      jabatan,
                      mode: 'member',
                      memberIndex: (safeIndex + 1) % members.length,
                    })
                  }
                  className="min-h-[44px] inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-emerald-700 cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onChangeSelection({ jabatan, mode: 'unit', memberIndex: safeIndex })}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 focus-visible:outline-2 focus-visible:outline-emerald-700 cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Daftar Unit ({members.length})</span>
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {periode ? `Masa Khidmah ${periode.nama_periode}` : 'Madin Blokagung'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold focus-visible:outline-2 focus-visible:outline-emerald-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
