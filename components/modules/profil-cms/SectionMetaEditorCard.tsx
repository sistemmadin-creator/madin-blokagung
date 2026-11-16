'use client';

import React, { useEffect, useState } from 'react';
import { Save, Type, Check, AlertTriangle } from 'lucide-react';
import { ProfilSectionKey } from '@/types/profil-konten';
import { useProfilKontenStore } from '@/stores/useProfilKontenStore';

interface SectionMetaEditorCardProps {
  sectionKey: ProfilSectionKey;
  canEdit: boolean;
}

export default function SectionMetaEditorCard({
  sectionKey,
  canEdit,
}: SectionMetaEditorCardProps) {
  const { sectionMeta, isTableMissing, updateSectionMeta } = useProfilKontenStore();
  const current = sectionMeta[sectionKey];

  const [badgeLabel, setBadgeLabel] = useState(current.badge_label);
  const [judul, setJudul] = useState(current.judul);
  const [deskripsi, setDeskripsi] = useState(current.deskripsi);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    setBadgeLabel(current.badge_label);
    setJudul(current.judul);
    setDeskripsi(current.deskripsi);
  }, [current.badge_label, current.judul, current.deskripsi]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !judul.trim()) return;
    setIsSaving(true);
    await updateSectionMeta(sectionKey, {
      badge_label: badgeLabel,
      judul,
      deskripsi,
    });
    setIsSaving(false);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1800);
  };

  return (
    <div className="space-y-4">
      {isTableMissing && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs sm:text-sm"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-bold">Tabel CMS Profil Landing Page Belum Dimigrasi di Supabase</p>
            <p className="mt-0.5">
              Perubahan sementara tersimpan di browser lokal. Jalankan file{' '}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-xs">
                supabase/migrations/20261116_profil_landing_cms_modules.sql
              </code>{' '}
              di Supabase SQL Editor agar tersinkron ke seluruh perangkat dan halaman publik.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h2 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
              Pengaturan Heading &amp; Deskripsi Seksi
            </h2>
          </div>

          {canEdit && (
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              {savedFlag ? (
                <>
                  <Check className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tersimpan</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Heading'}</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Label Pill Atas
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={badgeLabel}
              onChange={(e) => setBadgeLabel(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white disabled:opacity-60"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Judul Utama Seksi *
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold text-slate-900 dark:text-white disabled:opacity-60"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Deskripsi Pengantar
            </label>
            <textarea
              rows={2}
              disabled={!canEdit}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-700 dark:text-slate-200 disabled:opacity-60"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
