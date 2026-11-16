'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  X,
  Shield,
  GraduationCap,
  Briefcase,
  Award,
  CalendarRange,
} from 'lucide-react';
import { useKepengurusanStore } from '@/stores/useKepengurusanStore';
import {
  KelompokKepengurusan,
  KepengurusanJabatan,
} from '@/types/kepengurusan';

type BagianTab = 'putra' | 'putri';

function filterByBagianAndSearch(
  list: KepengurusanJabatan[],
  periodeId: string,
  bagian: BagianTab,
  query: string
): KepengurusanJabatan[] {
  const q = query.trim().toLowerCase();
  return list
    .filter((j) => j.periode_id === periodeId && j.is_active !== false)
    .filter((j) => j.kategori_bagian === 'bersama' || j.kategori_bagian === bagian)
    .map((j) => {
      if (!q) return j;
      const jabatanMatches = j.nama_jabatan.toLowerCase().includes(q);
      if (jabatanMatches) return j;
      const filteredAnggota = j.anggota.filter(
        (a) =>
          a.nama.toLowerCase().includes(q) ||
          (a.sub_label && a.sub_label.toLowerCase().includes(q))
      );
      if (filteredAnggota.length === 0) return null;
      return { ...j, anggota: filteredAnggota };
    })
    .filter((j): j is KepengurusanJabatan => j !== null)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export default function KepengurusanPublicView() {
  const { periodes, jabatans, fetchKepengurusan, isLoading } = useKepengurusanStore();
  const [activeBagian, setActiveBagian] = useState<BagianTab>('putra');
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchKepengurusan(false);
  }, [fetchKepengurusan]);

  const activePeriodes = useMemo(
    () => periodes.filter((p) => p.is_active !== false),
    [periodes]
  );

  const currentPeriode = useMemo(() => {
    if (selectedPeriodeId) {
      const found = activePeriodes.find((p) => p.id === selectedPeriodeId);
      if (found) return found;
    }
    return activePeriodes.find((p) => p.is_current) || activePeriodes[0] || null;
  }, [activePeriodes, selectedPeriodeId]);

  const visibleJabatans = useMemo(() => {
    if (!currentPeriode) return [];
    return filterByBagianAndSearch(jabatans, currentPeriode.id, activeBagian, searchQuery);
  }, [jabatans, currentPeriode, activeBagian, searchQuery]);

  const byKelompok = useMemo(() => {
    const grouped: Record<KelompokKepengurusan, KepengurusanJabatan[]> = {
      pimpinan: [],
      kepala_madrasah: [],
      pkm_dan_koordinator: [],
      panitia_dan_luar: [],
    };
    visibleJabatans.forEach((j) => {
      grouped[j.kelompok]?.push(j);
    });
    return grouped;
  }, [visibleJabatans]);

  return (
    <div className="space-y-8">
      {/* Header Judul & Identitas Periode */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-950 via-[#0a443c] to-emerald-900 text-white p-6 sm:p-9 shadow-xl border border-emerald-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-bold tracking-wide">
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Masa Khidmah {currentPeriode?.nama_periode || '1446-1447 H / 2025-2026 M'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-serif tracking-tight">
              Personalia Kepengurusan {activeBagian === 'putra' ? 'Putra' : 'Putri'}
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/85 leading-relaxed">
              {currentPeriode?.catatan ||
                'Madrasah Diniyyah Al-Amiriyyah Pondok Pesantren Darussalam Blokagung Banyuwangi.'}
            </p>
          </div>

          {/* Segmented Switcher Putra / Putri */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div
              role="tablist"
              aria-label="Pilih Bagian Kepengurusan"
              className="inline-flex p-1.5 rounded-2xl bg-emerald-950/70 border border-emerald-700/60"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeBagian === 'putra'}
                onClick={() => setActiveBagian('putra')}
                className={`min-h-[42px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeBagian === 'putra'
                    ? 'bg-amber-400 text-emerald-950 shadow-md'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                Kepengurusan Putra
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeBagian === 'putri'}
                onClick={() => setActiveBagian('putri')}
                className={`min-h-[42px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeBagian === 'putri'
                    ? 'bg-amber-400 text-emerald-950 shadow-md'
                    : 'text-emerald-100 hover:text-white'
                }`}
              >
                Kepengurusan Putri
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar Pencarian & Pemilih Periode (jika >1 periode aktif) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pengurus, PKM, atau unit..."
            className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activePeriodes.length > 1 && (
            <select
              aria-label="Pilih Masa Khidmah"
              value={currentPeriode?.id || ''}
              onChange={(e) => setSelectedPeriodeId(e.target.value)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              {activePeriodes.map((p) => (
                <option key={p.id} value={p.id}>
                  Masa Khidmah {p.nama_periode}
                </option>
              ))}
            </select>
          )}

          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-300">
            <Users className="w-3.5 h-3.5" />
            <span>{visibleJabatans.length} Unit Struktur</span>
          </span>
        </div>
      </div>

      {isLoading && visibleJabatans.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : visibleJabatans.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            Tidak ada struktur atau nama yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
          </p>
          <p className="text-xs text-slate-500">
            Coba kata kunci lain atau ubah filter bagian Putra/Putri.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Tier 1: Dewan Pimpinan */}
          {byKelompok.pimpinan.length > 0 && (
            <section aria-labelledby="tier-pimpinan" className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                <h2
                  id="tier-pimpinan"
                  className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300"
                >
                  Dewan Pimpinan &amp; Penasehat
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {byKelompok.pimpinan.map((jab) => (
                  <article
                    key={jab.id}
                    className="rounded-2xl overflow-hidden border border-emerald-900/15 dark:border-emerald-700/40 bg-white dark:bg-slate-900 shadow-xs"
                  >
                    <div className="bg-[#1b4d47] text-white px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wider">
                      {jab.nama_jabatan}
                    </div>
                    <div className="p-4 text-center space-y-1.5">
                      {jab.anggota.map((ang) => (
                        <p
                          key={ang.id}
                          className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif"
                        >
                          {ang.nama}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Tier 2: Kepala Madrasah */}
          {byKelompok.kepala_madrasah.length > 0 && (
            <section aria-labelledby="tier-kamad" className="space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-amber-800 dark:text-amber-400" />
                <h2
                  id="tier-kamad"
                  className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300"
                >
                  Kepala Madrasah Per Jenjang
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {byKelompok.kepala_madrasah.map((jab) => (
                  <article
                    key={jab.id}
                    className="rounded-2xl overflow-hidden border border-amber-800/20 dark:border-amber-700/40 bg-white dark:bg-slate-900 shadow-xs"
                  >
                    <div className="bg-[#7b5239] text-white px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wider">
                      {jab.nama_jabatan}
                    </div>
                    <div className="p-4 text-center space-y-1.5">
                      {jab.anggota.map((ang) => (
                        <p
                          key={ang.id}
                          className="text-sm font-bold text-slate-800 dark:text-slate-100"
                        >
                          {ang.nama}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Tier 3: PKM & Koordinator */}
          {byKelompok.pkm_dan_koordinator.length > 0 && (
            <section aria-labelledby="tier-pkm" className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h2
                  id="tier-pkm"
                  className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200"
                >
                  Bidang PKM &amp; Koordinator Program
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {byKelompok.pkm_dan_koordinator.map((jab) => (
                  <article
                    key={jab.id}
                    className="rounded-2xl overflow-hidden border border-amber-500/25 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs flex flex-col"
                  >
                    <div className="bg-gradient-to-r from-[#b97d22] to-[#cb8f2c] text-white px-4 py-2.5 flex items-center justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                        {jab.nama_jabatan}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">
                        {jab.anggota.length} Personel
                      </span>
                    </div>
                    <ul className="p-4 space-y-2 flex-1">
                      {jab.anggota.map((ang) => (
                        <li
                          key={ang.id}
                          className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 mt-1.5 shrink-0" />
                          <span className="font-medium leading-snug">
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
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Tier 4: Panitia Evaluasi & Koor. Madin Luar */}
          {byKelompok.panitia_dan_luar.length > 0 && (
            <section aria-labelledby="tier-panitia" className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h2
                  id="tier-panitia"
                  className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300"
                >
                  Panitia Evaluasi &amp; Koordinator Madin Luar
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {byKelompok.panitia_dan_luar.map((jab) => (
                  <article
                    key={jab.id}
                    className="rounded-2xl overflow-hidden border border-emerald-700/20 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs"
                  >
                    <div className="bg-[#0e745c] text-white px-4 py-2.5 flex items-center justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                        {jab.nama_jabatan}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">
                        {jab.anggota.length} Tugas
                      </span>
                    </div>
                    <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                      {jab.anggota.map((ang) => (
                        <div
                          key={ang.id}
                          className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2 border border-slate-100 dark:border-slate-800"
                        >
                          <span className="w-2 h-2 rounded-xs bg-emerald-700 dark:bg-emerald-400 mt-1.5 shrink-0" />
                          <div className="min-w-0 text-xs sm:text-sm">
                            {ang.sub_label && (
                              <dt className="font-extrabold text-emerald-900 dark:text-emerald-300">
                                {ang.sub_label}:
                              </dt>
                            )}
                            <dd className="font-medium text-slate-700 dark:text-slate-200 leading-snug">
                              {ang.nama}
                            </dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
