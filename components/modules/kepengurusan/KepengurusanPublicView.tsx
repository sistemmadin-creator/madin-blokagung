'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  X,
  Shield,
  GraduationCap,
  Briefcase,
  Award,
  CalendarRange,
  ChevronRight,
  History,
  AlertCircle,
} from 'lucide-react';
import { useKepengurusanStore } from '@/stores/useKepengurusanStore';
import {
  AnggotaKepengurusan,
  getInitialsFromName,
  getPeriodeMenuLabel,
  getPeriodeSlug,
  KelompokKepengurusan,
  KepengurusanJabatan,
  sanitizeMemberPhotoUrl,
  sortPeriodesForDisplay,
} from '@/types/kepengurusan';
import ModalDetailPengurus, {
  SelectedKepengurusanModalState,
} from '@/components/modules/kepengurusan/ModalDetailPengurus';

type BagianTab = 'putra' | 'putri';

interface KepengurusanPublicViewProps {
  periodeSlug?: string;
}

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

function MemberMiniAvatar({
  anggota,
  accentClass,
}: {
  anggota: AnggotaKepengurusan;
  accentClass: string;
}) {
  const [broken, setBroken] = useState(false);
  const url = sanitizeMemberPhotoUrl(anggota.foto_url);

  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        onError={() => setBroken(true)}
        className="w-8 h-8 rounded-full object-cover object-top border border-slate-200 dark:border-slate-700 shrink-0"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${accentClass}`}
    >
      {getInitialsFromName(anggota.nama)}
    </span>
  );
}

export default function KepengurusanPublicView({
  periodeSlug,
}: KepengurusanPublicViewProps) {
  const router = useRouter();
  const { periodes, jabatans, fetchKepengurusan, isLoading, hasFetched, error, isTableMissing } =
    useKepengurusanStore();

  const [activeBagian, setActiveBagian] = useState<BagianTab>('putra');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalSelection, setModalSelection] =
    useState<SelectedKepengurusanModalState | null>(null);

  useEffect(() => {
    fetchKepengurusan(false);
  }, [fetchKepengurusan]);

  const activePeriodes = useMemo(
    () => sortPeriodesForDisplay(periodes.filter((p) => p.is_active !== false)),
    [periodes]
  );

  const runningPeriode = useMemo(
    () => activePeriodes.find((p) => p.is_current) || activePeriodes[0] || null,
    [activePeriodes]
  );

  const currentPeriode = useMemo(() => {
    if (periodeSlug) {
      const normalizedSlug = periodeSlug.trim().toLowerCase();
      return (
        activePeriodes.find(
          (p) =>
            getPeriodeSlug(p).toLowerCase() === normalizedSlug ||
            p.id.toLowerCase() === normalizedSlug
        ) || null
      );
    }
    return runningPeriode;
  }, [activePeriodes, periodeSlug, runningPeriode]);

  const isSlugNotFound = Boolean(periodeSlug && hasFetched && !isLoading && !currentPeriode);

  // Gunakan seluruh anggota asli jabatan untuk modal navigasi agar index selalu akurat meski sedang mencari
  const fullJabatanMap = useMemo(() => {
    const map = new Map<string, KepengurusanJabatan>();
    jabatans.forEach((j) => map.set(j.id, j));
    return map;
  }, [jabatans]);

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

  const openMemberModal = (jab: KepengurusanJabatan, anggotaId: string) => {
    const fullJab = fullJabatanMap.get(jab.id) || jab;
    const idx = fullJab.anggota.findIndex((a) => a.id === anggotaId);
    setModalSelection({
      jabatan: fullJab,
      mode: 'member',
      memberIndex: idx >= 0 ? idx : 0,
    });
  };

  const openUnitModal = (jab: KepengurusanJabatan) => {
    const fullJab = fullJabatanMap.get(jab.id) || jab;
    if (fullJab.anggota.length === 1) {
      setModalSelection({
        jabatan: fullJab,
        mode: 'member',
        memberIndex: 0,
      });
      return;
    }
    setModalSelection({
      jabatan: fullJab,
      mode: 'unit',
      memberIndex: 0,
    });
  };

  const handleSelectPeriode = (periodeId: string) => {
    const target = activePeriodes.find((p) => p.id === periodeId);
    if (!target) return;
    router.push(`/kepengurusan/${getPeriodeSlug(target)}`);
  };

  if (isSlugNotFound) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center mx-auto">
          <CalendarRange className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-lg sm:text-xl font-extrabold font-serif text-slate-900 dark:text-white">
            Periode Kepengurusan Tidak Ditemukan
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Data kepengurusan untuk periode tersebut belum tersedia atau tidak ditampilkan di halaman publik.
          </p>
        </div>
        {runningPeriode && (
          <Link
            href={`/kepengurusan/${getPeriodeSlug(runningPeriode)}`}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold transition"
          >
            <span>Lihat {getPeriodeMenuLabel(runningPeriode)}</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Banner Arsip jika melihat periode sebelumnya */}
      {currentPeriode && !currentPeriode.is_current && runningPeriode && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-amber-950 dark:text-amber-200">
            <History className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <p className="text-xs sm:text-sm font-semibold">
              Anda sedang melihat arsip kepengurusan periode sebelumnya (
              <strong>{currentPeriode.nama_periode}</strong>).
            </p>
          </div>
          <Link
            href={`/kepengurusan/${getPeriodeSlug(runningPeriode)}`}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold transition shrink-0"
          >
            <span>Ke {getPeriodeMenuLabel(runningPeriode)}</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Header Judul & Identitas Periode */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-950 via-[#0a443c] to-emerald-900 text-white p-6 sm:p-9 shadow-xl border border-emerald-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-bold tracking-wide">
              <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                Masa Khidmah {currentPeriode?.nama_periode || '1447-1448 H / 2026-2027 M'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-serif tracking-tight">
              Personalia Kepengurusan {activeBagian === 'putra' ? 'Putra' : 'Putri'}
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
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
                className={`min-h-[44px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300 ${
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
                className={`min-h-[44px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300 ${
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

      {/* Toolbar Pencarian & Pemilih Periode */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pengurus, PKM, atau unit..."
            aria-label="Cari nama pengurus, PKM, atau unit"
            className="w-full min-h-[44px] pl-10 pr-11 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activePeriodes.length > 1 && (
            <select
              aria-label="Pilih Masa Khidmah"
              value={currentPeriode?.id || ''}
              onChange={(e) => handleSelectPeriode(e.target.value)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              {activePeriodes.map((p) => (
                <option key={p.id} value={p.id}>
                  {getPeriodeMenuLabel(p)} {p.is_current ? '(Sekarang)' : ''}
                </option>
              ))}
            </select>
          )}

          <span className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{visibleJabatans.length} Unit Struktur</span>
          </span>
        </div>
      </div>

      {error && !isTableMissing && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-3.5 flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-rose-800 dark:text-rose-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && visibleJabatans.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Memuat data kepengurusan">
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
            {searchQuery
              ? `Tidak ada struktur atau nama yang cocok dengan pencarian "${searchQuery}".`
              : 'Belum ada data struktur kepengurusan untuk periode ini.'}
          </p>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            {searchQuery
              ? 'Coba kata kunci lain atau ubah filter bagian Putra/Putri.'
              : 'Data personalia akan tampil setelah ditambahkan oleh pengelola media.'}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Tier 1: Dewan Pimpinan */}
          {byKelompok.pimpinan.length > 0 && (
            <section aria-labelledby="tier-pimpinan" className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-800 dark:text-emerald-400" aria-hidden="true" />
                <h2
                  id="tier-pimpinan"
                  className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300"
                >
                  Dewan Pimpinan &amp; Penasehat
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {byKelompok.pimpinan.map((jab) => {
                  const singleMember = jab.anggota.length === 1 ? jab.anggota[0] : null;
                  if (singleMember) {
                    return (
                      <button
                        key={jab.id}
                        type="button"
                        onClick={() => openMemberModal(jab, singleMember.id)}
                        className="group w-full text-left rounded-2xl overflow-hidden border border-emerald-900/15 dark:border-emerald-700/40 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-emerald-700/40 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 cursor-pointer"
                      >
                        <div className="bg-[#1b4d47] text-white px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wider">
                          {jab.nama_jabatan}
                        </div>
                        <div className="p-4 flex items-center justify-center gap-3">
                          <MemberMiniAvatar
                            anggota={singleMember}
                            accentClass="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                          />
                          <div className="min-w-0 text-left">
                            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-serif group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition-colors">
                              {singleMember.nama}
                            </p>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              Klik untuk lihat foto &amp; profil
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <article
                      key={jab.id}
                      className="rounded-2xl overflow-hidden border border-emerald-900/15 dark:border-emerald-700/40 bg-white dark:bg-slate-900 shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => openUnitModal(jab)}
                        className="w-full min-h-[44px] bg-[#1b4d47] hover:bg-[#153f3a] text-white px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-wider cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                      >
                        <span className="truncate">{jab.nama_jabatan}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 shrink-0">
                          {jab.anggota.length} Personel
                        </span>
                      </button>
                      <div className="p-3 space-y-1">
                        {jab.anggota.map((ang) => (
                          <button
                            key={ang.id}
                            type="button"
                            onClick={() => openMemberModal(jab, ang.id)}
                            className="w-full min-h-[44px] flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 text-left transition cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700"
                          >
                            <MemberMiniAvatar
                              anggota={ang}
                              accentClass="bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                            />
                            <span className="text-sm font-bold text-slate-900 dark:text-white font-serif">
                              {ang.nama}
                            </span>
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tier 2: Kepala Madrasah */}
          {byKelompok.kepala_madrasah.length > 0 && (
            <section aria-labelledby="tier-kamad" className="space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap
                  className="w-4 h-4 text-amber-800 dark:text-amber-400"
                  aria-hidden="true"
                />
                <h2
                  id="tier-kamad"
                  className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-300"
                >
                  Kepala Madrasah Per Jenjang
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {byKelompok.kepala_madrasah.map((jab) => {
                  const singleMember = jab.anggota.length === 1 ? jab.anggota[0] : null;
                  if (singleMember) {
                    return (
                      <button
                        key={jab.id}
                        type="button"
                        onClick={() => openMemberModal(jab, singleMember.id)}
                        className="group w-full text-left rounded-2xl overflow-hidden border border-amber-800/20 dark:border-amber-700/40 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-amber-700/50 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 cursor-pointer"
                      >
                        <div className="bg-[#7b5239] text-white px-4 py-2.5 text-center text-xs font-extrabold uppercase tracking-wider">
                          {jab.nama_jabatan}
                        </div>
                        <div className="p-4 flex items-center justify-center gap-3">
                          <MemberMiniAvatar
                            anggota={singleMember}
                            accentClass="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                          />
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-900 dark:group-hover:text-amber-300 transition-colors">
                              {singleMember.nama}
                            </p>
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              Klik untuk lihat foto &amp; profil
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <article
                      key={jab.id}
                      className="rounded-2xl overflow-hidden border border-amber-800/20 dark:border-amber-700/40 bg-white dark:bg-slate-900 shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => openUnitModal(jab)}
                        className="w-full min-h-[44px] bg-[#7b5239] hover:bg-[#69442e] text-white px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-wider cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                      >
                        <span className="truncate">{jab.nama_jabatan}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 shrink-0">
                          {jab.anggota.length} Personel
                        </span>
                      </button>
                      <div className="p-3 space-y-1">
                        {jab.anggota.map((ang) => (
                          <button
                            key={ang.id}
                            type="button"
                            onClick={() => openMemberModal(jab, ang.id)}
                            className="w-full min-h-[44px] flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-800 text-left transition cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-700"
                          >
                            <MemberMiniAvatar
                              anggota={ang}
                              accentClass="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                            />
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {ang.nama}
                            </span>
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tier 3: PKM & Koordinator */}
          {byKelompok.pkm_dan_koordinator.length > 0 && (
            <section aria-labelledby="tier-pkm" className="space-y-4">
              <div className="flex items-center gap-2">
                <Briefcase
                  className="w-4 h-4 text-amber-700 dark:text-amber-400"
                  aria-hidden="true"
                />
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
                    <button
                      type="button"
                      onClick={() => openUnitModal(jab)}
                      className="w-full min-h-[44px] bg-gradient-to-r from-[#8f5b10] to-[#a36a14] hover:from-[#7d4f0d] hover:to-[#915d10] text-white px-4 py-2.5 flex items-center justify-between gap-2 text-left transition cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                      title="Klik untuk melihat seluruh foto personel unit ini"
                    >
                      <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide truncate">
                        {jab.nama_jabatan}
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-black/20 shrink-0">
                        {jab.anggota.length} Personel
                      </span>
                    </button>
                    <ul className="p-2.5 space-y-1 flex-1">
                      {jab.anggota.map((ang) => (
                        <li key={ang.id}>
                          <button
                            type="button"
                            onClick={() => openMemberModal(jab, ang.id)}
                            className="w-full min-h-[44px] flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-amber-50/90 dark:hover:bg-slate-800 text-left text-sm text-slate-800 dark:text-slate-100 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-700"
                          >
                            <MemberMiniAvatar
                              anggota={ang}
                              accentClass="bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200"
                            />
                            <span className="font-medium leading-snug flex-1 min-w-0">
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
                            <ChevronRight
                              className="w-4 h-4 text-slate-400 shrink-0"
                              aria-hidden="true"
                            />
                          </button>
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
                <Award
                  className="w-4 h-4 text-emerald-700 dark:text-emerald-400"
                  aria-hidden="true"
                />
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
                    <button
                      type="button"
                      onClick={() => openUnitModal(jab)}
                      className="w-full min-h-[44px] bg-[#0e745c] hover:bg-[#0b5e4b] text-white px-4 py-2.5 flex items-center justify-between gap-2 text-left transition cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                      title="Klik untuk melihat seluruh foto personel unit ini"
                    >
                      <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide truncate">
                        {jab.nama_jabatan}
                      </h3>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-black/20 shrink-0">
                        {jab.anggota.length} Tugas
                      </span>
                    </button>
                    <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {jab.anggota.map((ang) => (
                        <button
                          key={ang.id}
                          type="button"
                          onClick={() => openMemberModal(jab, ang.id)}
                          className="min-h-[52px] flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-slate-800 px-3 py-2 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-500/40 text-left transition cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-700"
                        >
                          <MemberMiniAvatar
                            anggota={ang}
                            accentClass="bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200"
                          />
                          <div className="min-w-0 flex-1 text-xs sm:text-sm">
                            {ang.sub_label && (
                              <div className="font-extrabold text-emerald-900 dark:text-emerald-300">
                                {ang.sub_label}
                              </div>
                            )}
                            <div className="font-semibold text-slate-800 dark:text-slate-100 leading-snug break-words">
                              {ang.nama}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal Pop-up Detail & Foto Pengurus */}
      <ModalDetailPengurus
        selection={modalSelection}
        periode={currentPeriode}
        onClose={() => setModalSelection(null)}
        onChangeSelection={(next) => setModalSelection(next)}
      />
    </div>
  );
}
