'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  ExternalLink,
  Search,
  Edit3,
  Trash2,
  CalendarRange,
  AlertTriangle,
  EyeOff,
} from 'lucide-react';
import { useKepengurusanStore } from '@/stores/useKepengurusanStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  BAGIAN_KEPENGURUSAN_META,
  KategoriBagianKepengurusan,
  KELOMPOK_KEPENGURUSAN_META,
  KepengurusanJabatan,
  KepengurusanPeriode,
} from '@/types/kepengurusan';
import ModalFormJabatanKepengurusan from '@/components/modules/kepengurusan/ModalFormJabatanKepengurusan';
import ModalFormPeriodeKepengurusan from '@/components/modules/kepengurusan/ModalFormPeriodeKepengurusan';

export default function KelolaKepengurusanAdminPage() {
  const {
    periodes,
    jabatans,
    isLoading,
    isTableMissing,
    error,
    fetchKepengurusan,
    createPeriode,
    updatePeriode,
    createJabatan,
    updateJabatan,
    deleteJabatan,
  } = useKepengurusanStore();

  const { canCreate, canEdit, canDelete } = usePagePermission('kelola-kepengurusan');

  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>('');
  const [filterBagian, setFilterBagian] = useState<'all' | KategoriBagianKepengurusan>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isJabatanModalOpen, setIsJabatanModalOpen] = useState(false);
  const [editingJabatan, setEditingJabatan] = useState<KepengurusanJabatan | null>(null);

  const [isPeriodeModalOpen, setIsPeriodeModalOpen] = useState(false);
  const [editingPeriode, setEditingPeriode] = useState<KepengurusanPeriode | null>(null);

  useEffect(() => {
    fetchKepengurusan(true);
  }, [fetchKepengurusan]);

  const activePeriode = useMemo(() => {
    if (selectedPeriodeId) {
      const found = periodes.find((p) => p.id === selectedPeriodeId);
      if (found) return found;
    }
    return periodes.find((p) => p.is_current) || periodes[0] || null;
  }, [periodes, selectedPeriodeId]);

  const filteredJabatans = useMemo(() => {
    if (!activePeriode) return [];
    const q = searchQuery.trim().toLowerCase();
    return jabatans
      .filter((j) => j.periode_id === activePeriode.id)
      .filter((j) => filterBagian === 'all' || j.kategori_bagian === filterBagian)
      .filter((j) => {
        if (!q) return true;
        return (
          j.nama_jabatan.toLowerCase().includes(q) ||
          j.anggota.some(
            (a) =>
              a.nama.toLowerCase().includes(q) ||
              (a.sub_label && a.sub_label.toLowerCase().includes(q))
          )
        );
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [jabatans, activePeriode, filterBagian, searchQuery]);

  const handleSaveJabatan = async (
    payload: Omit<KepengurusanJabatan, 'id' | 'created_at' | 'updated_at'>,
    editingId?: string
  ) => {
    if (editingId) {
      return await updateJabatan(editingId, payload);
    }
    return await createJabatan(payload);
  };

  const handleDeleteJabatan = async (jab: KepengurusanJabatan) => {
    if (!confirm(`Hapus unit jabatan "${jab.nama_jabatan}" beserta daftar anggotanya?`)) {
      return;
    }
    await deleteJabatan(jab.id);
  };

  const handleSavePeriode = async (
    payload: { nama_periode: string; catatan: string; is_current: boolean },
    editingId?: string
  ) => {
    if (editingId) {
      return await updatePeriode(editingId, payload);
    }
    const created = await createPeriode(payload);
    if (created) {
      setSelectedPeriodeId(created.id);
      return true;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header Admin */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b5751] to-[#147a71] text-amber-300 flex items-center justify-center shrink-0 shadow-md">
            <Users className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
                Kelola Kepengurusan Putra &amp; Putri
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                PKM. Media Madin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Tambah, ubah, atur urutan, atau hapus struktur jabatan dan personalia pengurus per masa khidmah untuk halaman publik <strong>Kepengurusan</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditingPeriode(activePeriode);
                setIsPeriodeModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <CalendarRange className="w-4 h-4 text-amber-600" />
              <span>Edit Periode</span>
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setEditingPeriode(null);
                setIsPeriodeModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>Periode Baru</span>
            </button>
          )}

          <Link
            href="/kepengurusan"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/80 text-xs font-bold transition shadow-2xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Lihat Halaman Publik</span>
          </Link>

          {canCreate && activePeriode && (
            <button
              type="button"
              disabled={isTableMissing}
              onClick={() => {
                setEditingJabatan(null);
                setIsJabatanModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 transition shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-950 stroke-[2.5]" />
              <span>Tambah Unit Jabatan</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning jika migrasi SQL belum diterapkan */}
      {isTableMissing && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold">
              Migrasi Database Belum Diterapkan di Supabase
            </p>
            <p>
              Saat ini tampilan memakai data awal bawaan (read-only). Terapkan file migrasi{' '}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-xs">
                supabase/migrations/20261116_kepengurusan_dan_public_daftar_hafalan.sql
              </code>{' '}
              di Supabase SQL Editor agar fitur tambah/ubah/hapus tersimpan permanen.
            </p>
          </div>
        </div>
      )}

      {error && !isTableMissing && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* Toolbar Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {periodes.length > 0 && (
            <select
              aria-label="Pilih Periode"
              value={activePeriode?.id || ''}
              onChange={(e) => setSelectedPeriodeId(e.target.value)}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
            >
              {periodes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_periode} {p.is_current ? '(Aktif Publik)' : ''}
                </option>
              ))}
            </select>
          )}

          {(['all', 'bersama', 'putra', 'putri'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterBagian(tab)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterBagian === tab
                  ? 'bg-[#0b5751] text-white'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab === 'all'
                ? 'Semua Bagian'
                : BAGIAN_KEPENGURUSAN_META[tab].shortLabel}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jabatan atau nama..."
            className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Daftar Unit Jabatan */}
      {isLoading && filteredJabatans.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredJabatans.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
          Belum ada unit jabatan yang sesuai filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJabatans.map((jab) => (
            <article
              key={jab.id}
              className={`rounded-2xl border bg-white dark:bg-slate-800 p-5 shadow-xs flex flex-col justify-between gap-4 ${
                jab.is_active === false
                  ? 'border-dashed border-slate-300 dark:border-slate-600 opacity-75'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        #{jab.sort_order}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                        {KELOMPOK_KEPENGURUSAN_META[jab.kelompok].badge}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          jab.kategori_bagian === 'putra'
                            ? 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            : jab.kategori_bagian === 'putri'
                            ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {BAGIAN_KEPENGURUSAN_META[jab.kategori_bagian].shortLabel}
                      </span>
                      {jab.is_active === false && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                          <EyeOff className="w-3 h-3" /> Disembunyikan
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-serif">
                      {jab.nama_jabatan}
                    </h2>
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-700/70 pt-3">
                  {jab.anggota.map((ang) => (
                    <li key={ang.id} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-2 shrink-0" />
                      <span>
                        {ang.sub_label ? (
                          <>
                            <strong className="text-slate-900 dark:text-white">
                              {ang.sub_label}:
                            </strong>{' '}
                            {ang.nama}
                          </>
                        ) : (
                          ang.nama
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {(canEdit || canDelete) && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/70">
                  {canEdit && (
                    <button
                      type="button"
                      disabled={isTableMissing}
                      onClick={() => {
                        setEditingJabatan(jab);
                        setIsJabatanModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah</span>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      disabled={isTableMissing}
                      onClick={() => handleDeleteJabatan(jab)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Modals */}
      {activePeriode && (
        <ModalFormJabatanKepengurusan
          isOpen={isJabatanModalOpen}
          onClose={() => setIsJabatanModalOpen(false)}
          periodeId={activePeriode.id}
          editingJabatan={editingJabatan}
          onSubmit={handleSaveJabatan}
        />
      )}

      <ModalFormPeriodeKepengurusan
        isOpen={isPeriodeModalOpen}
        onClose={() => setIsPeriodeModalOpen(false)}
        editingPeriode={editingPeriode}
        onSave={handleSavePeriode}
      />
    </div>
  );
}
