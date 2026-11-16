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
  Eye,
  Star,
  Camera,
  User,
  ChevronDown,
} from 'lucide-react';
import {
  CreatePeriodePayload,
  UpdatePeriodePayload,
  useKepengurusanStore,
} from '@/stores/useKepengurusanStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  BAGIAN_KEPENGURUSAN_META,
  getPeriodeMenuLabel,
  getPeriodeSlug,
  getPublicNavbarPeriodes,
  KategoriBagianKepengurusan,
  KELOMPOK_KEPENGURUSAN_META,
  KepengurusanJabatan,
  KepengurusanPeriode,
  sanitizeMemberPhotoUrl,
  sortPeriodesForDisplay,
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
    deletePeriode,
    createJabatan,
    updateJabatan,
    deleteJabatan,
  } = useKepengurusanStore();

  const { canCreate, canEdit, canDelete } = usePagePermission('kelola-kepengurusan');

  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>('');
  const [filterBagian, setFilterBagian] = useState<'all' | KategoriBagianKepengurusan>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPeriodeManager, setShowPeriodeManager] = useState(true);

  const [isJabatanModalOpen, setIsJabatanModalOpen] = useState(false);
  const [editingJabatan, setEditingJabatan] = useState<KepengurusanJabatan | null>(null);

  const [isPeriodeModalOpen, setIsPeriodeModalOpen] = useState(false);
  const [editingPeriode, setEditingPeriode] = useState<KepengurusanPeriode | null>(null);

  useEffect(() => {
    fetchKepengurusan(true);
  }, [fetchKepengurusan]);

  const sortedPeriodes = useMemo(() => sortPeriodesForDisplay(periodes), [periodes]);

  const navbarVisiblePeriodeIds = useMemo(() => {
    const top3 = getPublicNavbarPeriodes(sortedPeriodes, 3);
    return new Map(top3.map((p, idx) => [p.id, idx + 1]));
  }, [sortedPeriodes]);

  const activePeriode = useMemo(() => {
    if (selectedPeriodeId) {
      const found = sortedPeriodes.find((p) => p.id === selectedPeriodeId);
      if (found) return found;
    }
    return sortedPeriodes.find((p) => p.is_current) || sortedPeriodes[0] || null;
  }, [sortedPeriodes, selectedPeriodeId]);

  const jabatanCountByPeriode = useMemo(() => {
    const counts = new Map<string, number>();
    jabatans.forEach((j) => {
      counts.set(j.periode_id, (counts.get(j.periode_id) || 0) + 1);
    });
    return counts;
  }, [jabatans]);

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
    payload: CreatePeriodePayload | UpdatePeriodePayload,
    editingId?: string
  ) => {
    if (editingId) {
      return await updatePeriode(editingId, payload as UpdatePeriodePayload);
    }
    const created = await createPeriode(payload as CreatePeriodePayload);
    if (created) {
      setSelectedPeriodeId(created.id);
      return true;
    }
    return false;
  };

  const handleSetCurrentPeriode = async (periode: KepengurusanPeriode) => {
    if (periode.is_current) return;
    if (
      !confirm(
        `Jadikan "${getPeriodeMenuLabel(periode)}" sebagai periode kepengurusan sekarang (tampil paling atas di sub-menu)?`
      )
    ) {
      return;
    }
    await updatePeriode(periode.id, { is_current: true, is_active: true });
    setSelectedPeriodeId(periode.id);
  };

  const handleToggleActivePeriode = async (periode: KepengurusanPeriode) => {
    if (periode.is_current) return;
    await updatePeriode(periode.id, { is_active: !(periode.is_active !== false) });
  };

  const handleDeletePeriode = async (periode: KepengurusanPeriode) => {
    if (periode.is_current) {
      alert('Periode aktif utama (sekarang) tidak bisa dihapus. Pindahkan status aktif ke periode lain terlebih dahulu.');
      return;
    }
    const count = jabatanCountByPeriode.get(periode.id) || 0;
    if (
      !confirm(
        `Hapus periode "${periode.nama_periode}" beserta ${count} unit jabatan di dalamnya? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }
    const ok = await deletePeriode(periode.id);
    if (ok && activePeriode?.id === periode.id) {
      setSelectedPeriodeId('');
    }
  };

  const publicUrlForActive = activePeriode
    ? `/kepengurusan/${getPeriodeSlug(activePeriode)}`
    : '/kepengurusan';

  return (
    <div className="space-y-6">
      {/* Header Admin */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b5751] to-[#147a71] text-amber-300 flex items-center justify-center shrink-0 shadow-md">
            <Users className="w-6 h-6 stroke-[1.75]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
                Kelola Kepengurusan Putra &amp; Putri
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                PKM. Media Madin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              Kelola masa khidmah sekarang &amp; periode sebelumnya, atur struktur jabatan, serta unggah foto profil pengurus untuk halaman publik <strong>Kepengurusan</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canEdit && activePeriode && (
            <button
              type="button"
              disabled={isTableMissing}
              onClick={() => {
                setEditingPeriode(activePeriode);
                setIsPeriodeModalOpen(true);
              }}
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <CalendarRange className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span>Edit Periode</span>
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              disabled={isTableMissing}
              onClick={() => {
                setEditingPeriode(null);
                setIsPeriodeModalOpen(true);
              }}
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Periode Baru</span>
            </button>
          )}

          <Link
            href={publicUrlForActive}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/80 text-xs font-bold transition shadow-2xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
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
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 transition shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-950 stroke-[2.5]" aria-hidden="true" />
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
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold">Migrasi Database Belum Diterapkan di Supabase</p>
            <p>
              Saat ini tampilan memakai data awal bawaan (read-only). Terapkan migrasi di Supabase SQL Editor agar fitur kelola periode &amp; upload foto tersimpan permanen.
            </p>
          </div>
        </div>
      )}

      {error && !isTableMissing && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 px-4 py-3 text-xs font-semibold text-rose-800 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      {/* Panel Pengelola Daftar Periode (Sekarang & Sebelumnya) */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPeriodeManager((prev) => !prev)}
          aria-expanded={showPeriodeManager}
          className="w-full px-5 py-3.5 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 flex-wrap">
            <CalendarRange className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
              Daftar Masa Khidmah &amp; Pengaturan Sub-Menu Navbar
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[11px] font-bold">
              {sortedPeriodes.length} Periode
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="hidden sm:inline">Maks. 3 periode aktif terakhir tampil di sub-menu publik</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showPeriodeManager ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </div>
        </button>

        {showPeriodeManager && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sortedPeriodes.map((p) => {
              const isSelected = activePeriode?.id === p.id;
              const navbarRank = navbarVisiblePeriodeIds.get(p.id);
              const totalUnits = jabatanCountByPeriode.get(p.id) || 0;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPeriodeId(p.id)}
                        className="text-left min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {getPeriodeMenuLabel(p)}
                        </div>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                          {p.nama_periode}
                        </div>
                      </button>

                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0">
                        {totalUnits} Unit
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.is_current ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[10px] font-extrabold">
                          <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                          Sekarang (Sub-menu #1)
                        </span>
                      ) : navbarRank ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                          Sub-menu #{navbarRank}
                        </span>
                      ) : p.is_active === false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold">
                          <EyeOff className="w-3 h-3" aria-hidden="true" />
                          Arsip Tersembunyi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                          Arsip (&gt;3 terbaru)
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                        /{getPeriodeSlug(p)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedPeriodeId(p.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                        isSelected
                          ? 'bg-[#0b5751] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Sedang Dikelola' : 'Kelola Data'}
                    </button>

                    <div className="flex items-center gap-1">
                      {canEdit && !p.is_current && (
                        <button
                          type="button"
                          disabled={isTableMissing}
                          onClick={() => handleSetCurrentPeriode(p)}
                          title="Jadikan periode sekarang"
                          className="px-2 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer disabled:opacity-40"
                        >
                          Aktifkan
                        </button>
                      )}
                      {canEdit && !p.is_current && (
                        <button
                          type="button"
                          disabled={isTableMissing}
                          onClick={() => handleToggleActivePeriode(p)}
                          title={
                            p.is_active === false
                              ? 'Tampilkan kembali ke publik'
                              : 'Sembunyikan dari publik'
                          }
                          aria-label={
                            p.is_active === false
                              ? 'Tampilkan periode di publik'
                              : 'Sembunyikan periode dari publik'
                          }
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                        >
                          {p.is_active === false ? (
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          disabled={isTableMissing}
                          onClick={() => {
                            setEditingPeriode(p);
                            setIsPeriodeModalOpen(true);
                          }}
                          title="Ubah detail periode"
                          aria-label={`Ubah periode ${p.nama_periode}`}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                        >
                          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                      {canDelete && !p.is_current && sortedPeriodes.length > 1 && (
                        <button
                          type="button"
                          disabled={isTableMissing}
                          onClick={() => handleDeletePeriode(p)}
                          title="Hapus periode"
                          aria-label={`Hapus periode ${p.nama_periode}`}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Toolbar Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {sortedPeriodes.length > 0 && (
            <select
              aria-label="Pilih Periode"
              value={activePeriode?.id || ''}
              onChange={(e) => setSelectedPeriodeId(e.target.value)}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100"
            >
              {sortedPeriodes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_periode} {p.is_current ? '(Sekarang)' : ''}
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
              {tab === 'all' ? 'Semua Bagian' : BAGIAN_KEPENGURUSAN_META[tab].shortLabel}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jabatan atau nama..."
            aria-label="Cari jabatan atau nama pengurus"
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center text-sm text-slate-600 dark:text-slate-300">
          Belum ada unit jabatan yang sesuai filter pada periode ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJabatans.map((jab) => {
            const totalAnggota = jab.anggota.length;
            const withPhotoCount = jab.anggota.filter(
              (a) => Boolean(sanitizeMemberPhotoUrl(a.foto_url))
            ).length;

            return (
              <article
                key={jab.id}
                className={`rounded-2xl border bg-white dark:bg-slate-800 p-5 shadow-xs flex flex-col justify-between gap-4 ${
                  jab.is_active === false
                    ? 'border-dashed border-slate-300 dark:border-slate-600 opacity-80'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          #{jab.sort_order}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200">
                          {KELOMPOK_KEPENGURUSAN_META[jab.kelompok].badge}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            jab.kategori_bagian === 'putra'
                              ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200'
                              : jab.kategori_bagian === 'putri'
                              ? 'bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200'
                              : 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                          }`}
                        >
                          {BAGIAN_KEPENGURUSAN_META[jab.kategori_bagian].shortLabel}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            withPhotoCount === totalAnggota && totalAnggota > 0
                              ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <Camera className="w-3 h-3" aria-hidden="true" />
                          <span>
                            {withPhotoCount}/{totalAnggota} Foto
                          </span>
                        </span>
                        {jab.is_active === false && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 text-slate-800">
                            <EyeOff className="w-3 h-3" aria-hidden="true" /> Disembunyikan
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-serif">
                        {jab.nama_jabatan}
                      </h2>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 border-t border-slate-100 dark:border-slate-700/70 pt-3">
                    {jab.anggota.map((ang) => {
                      const fotoUrl = sanitizeMemberPhotoUrl(ang.foto_url);
                      return (
                        <li key={ang.id} className="flex items-center gap-2.5">
                          {fotoUrl ? (
                            <img
                              src={fotoUrl}
                              alt=""
                              aria-hidden="true"
                              className="w-7 h-7 rounded-full object-cover object-top border border-slate-200 dark:border-slate-600 shrink-0"
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0"
                            >
                              <User className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span className="min-w-0 leading-snug">
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
                      );
                    })}
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
                        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Ubah &amp; Foto</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        disabled={isTableMissing}
                        onClick={() => handleDeleteJabatan(jab)}
                        className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 disabled:opacity-40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
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
        existingPeriodes={sortedPeriodes}
        onSave={handleSavePeriode}
      />
    </div>
  );
}
