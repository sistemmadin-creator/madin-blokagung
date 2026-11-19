'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Filter,
  Inbox,
  Search,
  Table2,
  X,
} from 'lucide-react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useTahunAjaranStore } from '@/stores/useTahunAjaranStore';
import { usePagePermission } from '@/stores/useRbacStore';
import { exportAoaToExcel } from '@/lib/utils/excel';
import {
  norm,
  normalizeTahunAjaranDash,
  normalizeTahunAjaranSlash,
} from '@/lib/utils/setoranHelper';
import {
  resolveTingkatPertingkatan,
  TingkatPertingkatan,
} from '@/lib/utils/rekapPertingkatanHelper';
import {
  buildRekapRinciExcelSheet,
  buildRekapRinciResult,
  JenisPendidikanRekap,
  RekapRinciFilter,
} from '@/lib/utils/rekapRinciHelper';

export default function RekapHafalanRinciPage() {
  const { santriList, fetchSantri, isLoading: loadingSantri } = useSantriStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { config, setoranList, fetchSetoranData, isLoading: loadingSetoran } =
    useMuhafadzohStore();
  const {
    activeTahunAjaran,
    daftarTahunAjaran,
    fetchGlobalTahunAjaran,
  } = useTahunAjaranStore();
  const {
    currentAccount,
    isMasterAdmin,
    isPersonAllowed,
    isClassAllowed,
  } = usePagePermission('rekap-hafalan-rinci');

  const normalizedActiveTa = normalizeTahunAjaranSlash(
    activeTahunAjaran || '2026/2027'
  );

  // Gender scope dari RBAC (jika akun khusus Putra atau Putri)
  const lockedGender = useMemo<'' | 'PA' | 'PI'>(() => {
    if (!currentAccount || isMasterAdmin) return '';
    const scope = currentAccount.special_authorities?.gender_scope;
    if (scope === 'putra') return 'PA';
    if (scope === 'putri') return 'PI';
    return '';
  }, [currentAccount, isMasterAdmin]);

  const initialFilter: RekapRinciFilter = {
    tahunAjaran: normalizedActiveTa,
    jenisPendidikan: 'Madin',
    tingkat: 'ULA',
    dinKls: '4',
    dinBag: 'A',
    unitFormal: '',
    kelasFormal: '',
    bagFormal: '',
    gender: lockedGender || 'PA',
  };

  const [draftFilter, setDraftFilter] = useState<RekapRinciFilter>(initialFilter);
  const [appliedFilter, setAppliedFilter] = useState<RekapRinciFilter>(initialFilter);
  const [hasUserTriggeredSearch, setHasUserTriggeredSearch] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchSantri();
    fetchFormasi();
    fetchSetoranData();
    fetchGlobalTahunAjaran();
  }, [fetchSantri, fetchFormasi, fetchSetoranData, fetchGlobalTahunAjaran]);

  // Sinkronisasi awal Tahun Ajaran & RBAC gender scope sebelum user mengubah filter manual
  useEffect(() => {
    if (hasUserTriggeredSearch) return;
    setDraftFilter((prev) => ({
      ...prev,
      tahunAjaran: normalizedActiveTa,
      gender: lockedGender || prev.gender,
    }));
    setAppliedFilter((prev) => ({
      ...prev,
      tahunAjaran: normalizedActiveTa,
      gender: lockedGender || prev.gender,
    }));
  }, [normalizedActiveTa, lockedGender, hasUserTriggeredSearch]);

  // Santri yang diizinkan oleh RBAC (blok & gender)
  const allowedSantriList = useMemo(() => {
    return santriList.filter((s) => {
      if (!s?.no_induk || !s?.nama) return false;
      const statusRaw = (s as any).status_santri || (s as any).ket_status;
      if (statusRaw && norm(statusRaw) === 'BOYONG') return false;
      if (!isPersonAllowed({ blok: s.blok, pa_pi: s.pa_pi })) return false;
      if (
        !isClassAllowed(
          {
            tingkat: s.tingkat,
            din_kls: s.din_kls,
            din_bag: s.din_bag,
            pa_pi: s.pa_pi,
          },
          santriList
        )
      ) {
        return false;
      }
      return true;
    });
  }, [santriList, isPersonAllowed, isClassAllowed]);

  // Opsi dropdown Tahun Ajaran
  const taOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: Array<{ slash: string; label: string }> = [];
    const addOpt = (raw: string) => {
      const slash = normalizeTahunAjaranSlash(raw);
      if (!slash || seen.has(slash)) return;
      seen.add(slash);
      opts.push({
        slash,
        label: normalizeTahunAjaranDash(slash),
      });
    };
    addOpt(normalizedActiveTa);
    daftarTahunAjaran.forEach((t) => addOpt(t.tahunAjaranMasehi));
    return opts;
  }, [daftarTahunAjaran, normalizedActiveTa]);

  // Opsi dinamis untuk filter Madin (Kelas & Bagian)
  const madinOptions = useMemo(() => {
    const klsSet = new Set<string>();
    const bagSet = new Set<string>();

    const collectFrom = (tkRaw: unknown, klsRaw: unknown, bagRaw: unknown) => {
      const tk = resolveTingkatPertingkatan(tkRaw);
      if (tk !== draftFilter.tingkat) return;
      const kls = String(klsRaw || '').trim();
      const bag = String(bagRaw || '').trim().toUpperCase();
      if (kls && kls !== '-') klsSet.add(kls);
      if (bag && bag !== '-' && (!draftFilter.dinKls || norm(kls) === norm(draftFilter.dinKls))) {
        bagSet.add(bag);
      }
    };

    formasiList.forEach((f) => collectFrom(f.tingkat, f.din_kls, f.din_bag));
    allowedSantriList.forEach((s) => collectFrom(s.tingkat, s.din_kls, s.din_bag));

    if (klsSet.size === 0) {
      const fallback =
        draftFilter.tingkat === 'ULA' ? ['1', '2', '3', '4'] : ['1', '2'];
      fallback.forEach((k) => klsSet.add(k));
    }

    return {
      kelasList: Array.from(klsSet).sort((a, b) =>
        a.localeCompare(b, 'id', { numeric: true })
      ),
      bagianList: Array.from(bagSet).sort((a, b) => a.localeCompare(b, 'id')),
    };
  }, [formasiList, allowedSantriList, draftFilter.tingkat, draftFilter.dinKls]);

  // Opsi dinamis untuk filter Formal (Unit, Kelas Formal, Bagian Formal)
  const formalOptions = useMemo(() => {
    const unitSet = new Set<string>();
    const kelasSet = new Set<string>();
    const bagSet = new Set<string>();

    allowedSantriList.forEach((s) => {
      const u = String(s.unit || '').trim();
      const k = String(s.kelas || s.semester || '').trim();
      const b = String(s.bag || s.jurusan || '').trim();
      if (u && u !== '-') unitSet.add(u);
      const unitMatches = !draftFilter.unitFormal || norm(u) === norm(draftFilter.unitFormal);
      if (unitMatches && k && k !== '-') kelasSet.add(k);
      const klsMatches = !draftFilter.kelasFormal || norm(k) === norm(draftFilter.kelasFormal);
      if (unitMatches && klsMatches && b && b !== '-') bagSet.add(b);
    });

    return {
      unitList: Array.from(unitSet).sort((a, b) => a.localeCompare(b, 'id')),
      kelasList: Array.from(kelasSet).sort((a, b) =>
        a.localeCompare(b, 'id', { numeric: true })
      ),
      bagList: Array.from(bagSet).sort((a, b) =>
        a.localeCompare(b, 'id', { numeric: true })
      ),
    };
  }, [allowedSantriList, draftFilter.unitFormal, draftFilter.kelasFormal]);

  // Pastikan kelas Madin tetap valid saat Tingkat berubah
  const handleChangeTingkat = (nextTk: TingkatPertingkatan) => {
    const defaultKls = nextTk === 'ULA' ? '1' : '1';
    setDraftFilter((prev) => ({
      ...prev,
      tingkat: nextTk,
      dinKls:
        nextTk === 'ULA' && ['1', '2', '3', '4'].includes(prev.dinKls)
          ? prev.dinKls
          : nextTk !== 'ULA' && ['1', '2'].includes(prev.dinKls)
          ? prev.dinKls
          : defaultKls,
    }));
  };

  // Sinkronisasi awal kelas default (mis. pilih kelas tersedia jika '4' tidak ada)
  useEffect(() => {
    if (hasUserTriggeredSearch) return;
    if (
      madinOptions.kelasList.length > 0 &&
      !madinOptions.kelasList.includes(draftFilter.dinKls)
    ) {
      const fallbackKls = madinOptions.kelasList[0];
      setDraftFilter((prev) => ({ ...prev, dinKls: fallbackKls }));
      setAppliedFilter((prev) => ({ ...prev, dinKls: fallbackKls }));
    }
  }, [madinOptions.kelasList, draftFilter.dinKls, hasUserTriggeredSearch]);

  const handleCariRekap = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasUserTriggeredSearch(true);
    setAppliedFilter({ ...draftFilter });
  };

  const result = useMemo(() => {
    return buildRekapRinciResult({
      santriList: allowedSantriList,
      setoranList,
      config,
      filter: appliedFilter,
    });
  }, [allowedSantriList, setoranList, config, appliedFilter]);

  const isFilterDirty = useMemo(() => {
    return JSON.stringify(draftFilter) !== JSON.stringify(appliedFilter);
  }, [draftFilter, appliedFilter]);

  const handleUnduhExcel = async () => {
    if (result.rows.length === 0) {
      alert('Tidak ada data santri pada filter yang dipilih untuk diekspor.');
      return;
    }
    setIsExporting(true);
    try {
      const sheet = buildRekapRinciExcelSheet(result);
      await exportAoaToExcel({
        filename: result.excelFilename,
        sheets: [sheet],
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loadingSantri || loadingSetoran;

  return (
    <div className="space-y-5">
      {/* Judul Halaman */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight m-0">
          Rekapitulasi Hafalan
        </h1>
        <p className="text-xs text-slate-500 mt-0.5 m-0">
          Rekap hafalan rinci per santri berdasarkan data Setoran Muhafadzoh.
        </p>
      </div>

      {/* Card 1: Filter Rekap Hafalan */}
      <form onSubmit={handleCariRekap} className="space-y-3.5">
        <div className="card-panel border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-start gap-2.5 pb-3 border-b border-slate-100">
            <Filter className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Filter Rekap Hafalan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Pilih filter untuk menampilkan rekapan hafalan santri.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Tahun Ajaran* */}
            <div>
              <label
                htmlFor="rr-tahun-ajaran"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Tahun Ajaran<span className="text-rose-600">*</span>
              </label>
              <div className="relative flex items-center">
                <select
                  id="rr-tahun-ajaran"
                  value={draftFilter.tahunAjaran}
                  onChange={(e) =>
                    setDraftFilter((prev) => ({
                      ...prev,
                      tahunAjaran: e.target.value,
                    }))
                  }
                  className="w-full h-10 pl-3 pr-9 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                >
                  {taOptions.map((opt) => (
                    <option key={opt.slash} value={opt.slash}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {draftFilter.tahunAjaran !== normalizedActiveTa && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraftFilter((prev) => ({
                        ...prev,
                        tahunAjaran: normalizedActiveTa,
                      }))
                    }
                    aria-label="Reset Tahun Ajaran ke aktif"
                    className="absolute right-7 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Jenis Pendidikan* */}
            <div>
              <label
                htmlFor="rr-jenis-pendidikan"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Jenis Pendidikan<span className="text-rose-600">*</span>
              </label>
              <select
                id="rr-jenis-pendidikan"
                value={draftFilter.jenisPendidikan}
                onChange={(e) =>
                  setDraftFilter((prev) => ({
                    ...prev,
                    jenisPendidikan: e.target.value as JenisPendidikanRekap,
                  }))
                }
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
              >
                <option value="Madin">Madin</option>
                <option value="Formal">Formal</option>
              </select>
            </div>

            {draftFilter.jenisPendidikan === 'Madin' ? (
              <>
                {/* 3. Kelas Madin* */}
                <div>
                  <label
                    htmlFor="rr-kelas-madin"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Kelas Madin<span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="rr-kelas-madin"
                    value={draftFilter.dinKls}
                    onChange={(e) =>
                      setDraftFilter((prev) => ({
                        ...prev,
                        dinKls: e.target.value,
                      }))
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    {madinOptions.kelasList.map((kls) => (
                      <option key={kls} value={kls}>
                        Kelas {kls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Bagian Madin (Opsional dengan tombol clear X) */}
                <div>
                  <label
                    htmlFor="rr-bagian-madin"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Bagian Madin
                  </label>
                  <div className="relative flex items-center">
                    <select
                      id="rr-bagian-madin"
                      value={draftFilter.dinBag}
                      onChange={(e) =>
                        setDraftFilter((prev) => ({
                          ...prev,
                          dinBag: e.target.value,
                        }))
                      }
                      className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                    >
                      <option value="">Semua Bagian</option>
                      {madinOptions.bagianList.map((bag) => (
                        <option key={bag} value={bag}>
                          {bag}
                        </option>
                      ))}
                    </select>
                    {draftFilter.dinBag && (
                      <button
                        type="button"
                        data-testid="clear-bagian-madin"
                        onClick={() =>
                          setDraftFilter((prev) => ({ ...prev, dinBag: '' }))
                        }
                        aria-label="Kosongkan Bagian Madin"
                        className="absolute right-7 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 5. Jenjang / Tingkat* */}
                <div>
                  <label
                    htmlFor="rr-jenjang-tingkat"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Jenjang / Tingkat<span className="text-rose-600">*</span>
                  </label>
                  <select
                    id="rr-jenjang-tingkat"
                    value={draftFilter.tingkat}
                    onChange={(e) =>
                      handleChangeTingkat(e.target.value as TingkatPertingkatan)
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                  >
                    <option value="ULA">ULA</option>
                    <option value="WUSTHO">WUSTHO</option>
                    <option value="ULYA">ULYA</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                {/* 3. Unit Formal */}
                <div>
                  <label
                    htmlFor="rr-unit-formal"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Unit Formal
                  </label>
                  <div className="relative flex items-center">
                    <select
                      id="rr-unit-formal"
                      value={draftFilter.unitFormal}
                      onChange={(e) =>
                        setDraftFilter((prev) => ({
                          ...prev,
                          unitFormal: e.target.value,
                          kelasFormal: '',
                          bagFormal: '',
                        }))
                      }
                      className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                    >
                      <option value="">Semua Unit Formal</option>
                      {formalOptions.unitList.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    {draftFilter.unitFormal && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraftFilter((prev) => ({
                            ...prev,
                            unitFormal: '',
                            kelasFormal: '',
                            bagFormal: '',
                          }))
                        }
                        aria-label="Kosongkan Unit Formal"
                        className="absolute right-7 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Kelas Formal */}
                <div>
                  <label
                    htmlFor="rr-kelas-formal"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Kelas Formal
                  </label>
                  <div className="relative flex items-center">
                    <select
                      id="rr-kelas-formal"
                      value={draftFilter.kelasFormal}
                      onChange={(e) =>
                        setDraftFilter((prev) => ({
                          ...prev,
                          kelasFormal: e.target.value,
                          bagFormal: '',
                        }))
                      }
                      className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                    >
                      <option value="">Semua Kelas</option>
                      {formalOptions.kelasList.map((k) => (
                        <option key={k} value={k}>
                          Kelas {k}
                        </option>
                      ))}
                    </select>
                    {draftFilter.kelasFormal && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraftFilter((prev) => ({
                            ...prev,
                            kelasFormal: '',
                            bagFormal: '',
                          }))
                        }
                        aria-label="Kosongkan Kelas Formal"
                        className="absolute right-7 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 5. Bagian / Jurusan Formal */}
                <div>
                  <label
                    htmlFor="rr-bagian-formal"
                    className="block text-xs font-bold text-slate-700 mb-1.5"
                  >
                    Bagian / Jurusan
                  </label>
                  <div className="relative flex items-center">
                    <select
                      id="rr-bagian-formal"
                      value={draftFilter.bagFormal}
                      onChange={(e) =>
                        setDraftFilter((prev) => ({
                          ...prev,
                          bagFormal: e.target.value,
                        }))
                      }
                      className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                    >
                      <option value="">Semua Bagian</option>
                      {formalOptions.bagList.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    {draftFilter.bagFormal && (
                      <button
                        type="button"
                        onClick={() =>
                          setDraftFilter((prev) => ({ ...prev, bagFormal: '' }))
                        }
                        aria-label="Kosongkan Bagian Formal"
                        className="absolute right-7 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 6. Jenis Kelamin (Opsional dengan tombol clear X) */}
            <div>
              <label
                htmlFor="rr-jenis-kelamin"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Jenis Kelamin
              </label>
              <div className="relative flex items-center">
                <select
                  id="rr-jenis-kelamin"
                  value={lockedGender || draftFilter.gender}
                  disabled={Boolean(lockedGender)}
                  onChange={(e) =>
                    setDraftFilter((prev) => ({
                      ...prev,
                      gender: e.target.value as '' | 'PA' | 'PI',
                    }))
                  }
                  className="w-full h-10 pl-3 pr-10 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  {!lockedGender && <option value="">Semua (Putra &amp; Putri)</option>}
                  {(!lockedGender || lockedGender === 'PA') && (
                    <option value="PA">Putra</option>
                  )}
                  {(!lockedGender || lockedGender === 'PI') && (
                    <option value="PI">Putri</option>
                  )}
                </select>
                {!lockedGender && draftFilter.gender && (
                  <button
                    type="button"
                    data-testid="clear-jenis-kelamin"
                    onClick={() =>
                      setDraftFilter((prev) => ({ ...prev, gender: '' }))
                    }
                    aria-label="Kosongkan Jenis Kelamin"
                    className="absolute right-7 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tombol Cari Rekap + Counter Jumlah Santri */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            data-testid="btn-cari-rekap-rinci"
            className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Cari Rekap</span>
          </button>

          <span className="text-xs sm:text-sm italic text-slate-600 font-medium">
            {result.rows.length} santri ditemukan
          </span>

          {isFilterDirty && (
            <span className="text-xs text-amber-700 font-semibold">
              (Filter diubah — klik Cari Rekap untuk memperbarui tabel)
            </span>
          )}
        </div>
      </form>

      {/* Card 2: Hasil Rekap Hafalan */}
      <div className="card-panel border border-slate-200 p-0 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Table2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 m-0">
                Hasil Rekap Hafalan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                {result.filterSummaryText}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-unduh-excel-rinci"
            disabled={isExporting || result.rows.length === 0}
            onClick={() => void handleUnduhExcel()}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Mengunduh...' : 'Unduh Excel'}</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-2" />
            <p className="text-xs text-slate-500 font-medium">
              Memuat data santri dan setoran hafalan...
            </p>
          </div>
        ) : result.rows.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <Inbox className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700 m-0">
              Tidak ada santri yang sesuai filter
            </p>
            <p className="text-xs text-slate-500 m-0">
              Ubah pilihan kelas, bagian, unit, atau kosongkan filter dengan tombol × lalu klik Cari Rekap.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <th className="w-12 py-3 px-3 text-center font-bold">No</th>
                  <th className="w-24 py-3 px-3 text-left font-bold">NOIN</th>
                  <th className="min-w-[200px] py-3 px-3 text-left font-bold">Nama</th>
                  <th className="min-w-[175px] py-3 px-3 text-left font-bold">
                    Kurikulum
                  </th>
                  {result.columns.map((col) => (
                    <th
                      key={col.key}
                      title={col.excelHeaderLabel}
                      className="min-w-[125px] max-w-[165px] py-2.5 px-3 text-center align-bottom"
                    >
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
                        {col.shortGroupLabel}
                      </span>
                      <span className="block text-xs font-bold text-slate-800 mt-0.5 leading-snug">
                        {col.nama}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {result.rows.map((row) => (
                  <tr
                    key={row.noin}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-500">
                      {row.no}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {row.noin}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {row.nama}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {row.kurikulum}
                    </td>
                    {row.statuses.map((done, idx) => (
                      <td
                        key={`${row.noin}_${idx}`}
                        className="py-3 px-3 text-center font-bold"
                      >
                        {done ? (
                          <span
                            aria-label="Tuntas"
                            className="text-emerald-700 text-base leading-none"
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            aria-label="Belum Tuntas"
                            className="text-slate-400 font-normal"
                          >
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Legenda */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <strong className="text-emerald-700">✓</strong> Tuntas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-slate-400">—</span> Belum Tuntas
          </span>
          <span className="text-slate-300">•</span>
          <span>Wajib</span>
          <span className="text-slate-300">•</span>
          <span>Sunnah</span>
          <span className="text-slate-300">•</span>
          <span>Wisuda</span>
        </div>
      </div>
    </div>
  );
}
