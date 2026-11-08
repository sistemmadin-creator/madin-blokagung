'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Award,
  CheckSquare,
  Search,
  Filter,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  X,
  Users,
} from 'lucide-react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { usePagePermission } from '@/stores/useRbacStore';
import { useSerahPiagamStore } from '@/stores/useSerahPiagamStore';
import {
  KelasSerahPiagamGroup,
  SantriSerahPiagamRow,
  StatusFilterSerahPiagam,
} from '@/types/serah-piagam';
import { DEFAULT_HAFALAN_WAJIB, norm } from '@/lib/utils/setoranHelper';
import WidgetStatistikSerahPiagam from './WidgetStatistikSerahPiagam';
import KartuKelasSerahPiagam from './KartuKelasSerahPiagam';

const CARDS_PER_PAGE = 9; // 3 baris x 3 kolom desktop

function getTargetMateriForClass(tingkatRaw: string, dinKlsRaw: string): string {
  const normTk = norm(tingkatRaw);
  const normKls = norm(dinKlsRaw) || '1';
  const cleanTk = normTk.includes('WUST')
    ? 'WUSTHO'
    : normTk.includes('ULYA')
    ? 'ULYA'
    : 'ULA';
  const key = `${cleanTk}_${normKls}`;
  const targets = DEFAULT_HAFALAN_WAJIB[key] || DEFAULT_HAFALAN_WAJIB.ULA_1;
  return targets && targets.length > 0 ? targets[0] : "Juz Amma'";
}

export default function SerahPiagamModule() {
  const { santriList, fetchSantri, isLoading: isLoadingSantri } = useSantriStore();
  const { fetchFormasi } = useFormasiStore();
  const {
    records,
    isLoading: isLoadingRecords,
    isSaving,
    tahun,
    filterStatus,
    searchKeyword,
    filterTingkat,
    filterKelas,
    filterGender,
    fetchRecords,
    toggleMenerima,
    batchSetKelasMenerima,
    setFilterStatus,
    setSearchKeyword,
    setFilterTingkat,
    setFilterKelas,
    setFilterGender,
    setTahun,
    resetFilters,
  } = useSerahPiagamStore();

  const { canEdit, isPersonAllowed } = usePagePermission('serah-piagam');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Inisialisasi data santri & catatan serah piagam
  useEffect(() => {
    fetchSantri();
    fetchFormasi();
    fetchRecords();
  }, [fetchSantri, fetchFormasi, fetchRecords]);

  // 1. Transformasi seluruh data santri ke baris serah piagam
  const allRows: SantriSerahPiagamRow[] = useMemo(() => {
    return santriList
      .filter((s) => {
        if (!s.no_induk || !s.nama) return false;
        const statusRaw = (s as any).status_santri || (s as any).ket_status;
        if (statusRaw && norm(statusRaw) === 'BOYONG') return false;
        if (!isPersonAllowed(s)) return false;
        return true;
      })
      .map((s) => {
        const rawTk = norm(s.tingkat);
        const tingkat = rawTk.includes('WUST')
          ? 'WUSTHO'
          : rawTk.includes('ULYA')
          ? 'ULYA'
          : 'ULA';
        const rawKls = norm(s.din_kls);
        const dinKls = !rawKls || rawKls === '-' ? '1' : rawKls;
        const rawBag = norm(s.din_bag);
        const dinBag = !rawBag || rawBag === '-' ? 'A' : rawBag;
        const paPi = norm(s.pa_pi) === 'PI' ? 'PI' : 'PA';

        const recKey = `${s.no_induk}_${tahun}`;
        const existingRec = records[recKey];
        const isMenerima = Boolean(existingRec?.is_menerima);

        return {
          no_induk: s.no_induk,
          nama: s.nama,
          kamar: s.kamar || '-',
          tingkat,
          din_kls: dinKls,
          din_bag: dinBag,
          pa_pi: paPi,
          short_kelas_badge: `${dinKls}${dinBag}`,
          kelas_label: `${dinKls} ${tingkat} ${dinBag}`,
          target_materi: getTargetMateriForClass(tingkat, dinKls),
          is_menerima: isMenerima,
          tanggal_serah: existingRec?.tanggal_serah || null,
          diserahkan_oleh: existingRec?.diserahkan_oleh || null,
        };
      });
  }, [santriList, records, tahun, isPersonAllowed]);

  // 2. Statistik Global (Total Santri, Total Menerima, Total Belum)
  const statsGlobal = useMemo(() => {
    const total = allRows.length;
    const menerima = allRows.filter((r) => r.is_menerima).length;
    const belum = total - menerima;
    return { total, menerima, belum };
  }, [allRows]);

  // 3. Daftar Opsi Kelas untuk Filter Toolbar
  const availableClassOptions = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => {
      set.add(`${r.din_kls}_${r.tingkat}_${r.din_bag}`);
    });
    return Array.from(set).sort();
  }, [allRows]);

  // 4. Pengelompokan Kartu per Kelas
  const rawClassGroups: KelasSerahPiagamGroup[] = useMemo(() => {
    const map = new Map<string, KelasSerahPiagamGroup>();

    allRows.forEach((r) => {
      const gKey = `${r.din_kls}_${r.tingkat}_${r.din_bag}`;
      if (!map.has(gKey)) {
        map.set(gKey, {
          groupKey: gKey,
          shortBadge: r.short_kelas_badge,
          kelasLabel: r.kelas_label,
          tingkat: r.tingkat,
          din_kls: r.din_kls,
          din_bag: r.din_bag,
          targetMateri: r.target_materi,
          totalSantri: 0,
          menerimaCount: 0,
          belumMenerimaCount: 0,
          ratioText: '0/0',
          percentage: 0,
          students: [],
        });
      }

      const g = map.get(gKey)!;
      g.students.push(r);
      g.totalSantri += 1;
      if (r.is_menerima) {
        g.menerimaCount += 1;
      } else {
        g.belumMenerimaCount += 1;
      }
    });

    // Urutkan kelas: ULA -> WUSTHO -> ULYA, lalu angka kelas, lalu bagian A/B/C
    const orderTk: Record<string, number> = { ULA: 1, WUSTHO: 2, ULYA: 3 };
    return Array.from(map.values())
      .map((g) => {
        const pct = g.totalSantri > 0 ? Math.round((g.menerimaCount / g.totalSantri) * 100) : 0;
        return {
          ...g,
          ratioText: `${g.menerimaCount}/${g.totalSantri}`,
          percentage: pct,
          students: g.students.sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
        };
      })
      .sort((a, b) => {
        const tA = orderTk[a.tingkat] || 99;
        const tB = orderTk[b.tingkat] || 99;
        if (tA !== tB) return tA - tB;
        const kCmp = a.din_kls.localeCompare(b.din_kls, 'id', { numeric: true });
        if (kCmp !== 0) return kCmp;
        return a.din_bag.localeCompare(b.din_bag, 'id');
      });
  }, [allRows]);

  // 5. Filter Interaktif (Pencarian, Tingkat, Kelas, Gender, dan Status Widget Menerima/Belum)
  const filteredClassGroups = useMemo(() => {
    const q = norm(searchKeyword);

    return rawClassGroups
      .map((g) => {
        // Cek filter tingkat
        if (filterTingkat !== 'ALL' && g.tingkat !== filterTingkat) {
          return null;
        }

        // Cek filter kelas spesifik
        if (filterKelas !== 'ALL' && g.groupKey !== filterKelas) {
          return null;
        }

        // Filter santri di dalam kelas
        const matchingStudents = g.students.filter((s) => {
          // Search query
          if (q) {
            const matchName = norm(s.nama).includes(q);
            const matchNis = norm(s.no_induk).includes(q);
            const matchKamar = norm(s.kamar).includes(q);
            if (!matchName && !matchNis && !matchKamar) return false;
          }

          // Filter Gender
          if (filterGender !== 'ALL' && s.pa_pi !== filterGender) {
            return false;
          }

          // Filter Interaktif dari Widget Header: 'menerima' | 'belum' | 'all'
          if (filterStatus === 'menerima' && !s.is_menerima) {
            return false;
          }
          if (filterStatus === 'belum' && s.is_menerima) {
            return false;
          }

          return true;
        });

        // Jika ada filter aktif (status, search, gender) dan kelas tidak memiliki santri yang cocok, sembunyikan kartu
        if (
          (filterStatus !== 'all' || q !== '' || filterGender !== 'ALL') &&
          matchingStudents.length === 0
        ) {
          return null;
        }

        return {
          group: g,
          filteredStudents: matchingStudents,
        };
      })
      .filter(Boolean) as Array<{
      group: KelasSerahPiagamGroup;
      filteredStudents: SantriSerahPiagamRow[];
    }>;
  }, [
    rawClassGroups,
    searchKeyword,
    filterTingkat,
    filterKelas,
    filterGender,
    filterStatus,
  ]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword, filterTingkat, filterKelas, filterGender, filterStatus]);

  // 6. Pagination 3 Kolom
  const totalPages = Math.max(1, Math.ceil(filteredClassGroups.length / CARDS_PER_PAGE));
  const paginatedGroups = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * CARDS_PER_PAGE;
    return filteredClassGroups.slice(start, start + CARDS_PER_PAGE);
  }, [filteredClassGroups, currentPage, totalPages]);

  // Ekspor Rekap Serah Piagam (CSV Ringan)
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['No', 'No Induk', 'Nama Santri', 'Kelas', 'Tingkat', 'Kamar', 'Status Piagam', 'Tanggal Serah'];
      const rows = allRows.map((s, idx) => [
        idx + 1,
        `"${s.no_induk}"`,
        `"${s.nama}"`,
        `"${s.kelas_label}"`,
        s.tingkat,
        `"${s.kamar}"`,
        s.is_menerima ? 'SUDAH MENERIMA' : 'BELUM MENERIMA',
        s.tanggal_serah ? `"${new Date(s.tanggal_serah).toLocaleString('id-ID')}"` : '-',
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `rekap_serah_piagam_madina_${tahun}_${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const activeFilterCount =
    (filterStatus !== 'all' ? 1 : 0) +
    (filterTingkat !== 'ALL' ? 1 : 0) +
    (filterKelas !== 'ALL' ? 1 : 0) +
    (filterGender !== 'ALL' ? 1 : 0) +
    (searchKeyword.trim() ? 1 : 0);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-2xs">
              <CheckSquare className="w-5 h-5 text-[#0b5751]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-serif">
                  Serah Piagam Santri
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Tahun {tahun}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Pemantauan dan pencatatan tanda terima penyerahan piagam muhafadzoh santri per kelas binaan.
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Aksi Atas */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => fetchRecords()}
            disabled={isLoadingRecords}
            title="Segarkan data dari server"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRecords ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Statistical Widgets (Menerima, Belum Menerima, Total Santri) */}
      <WidgetStatistikSerahPiagam
        totalSantri={statsGlobal.total}
        totalMenerima={statsGlobal.menerima}
        totalBelumMenerima={statsGlobal.belum}
        filterStatus={filterStatus}
        onSelectFilter={setFilterStatus}
      />

      {/* 3. Toolbar Filter dan Pencarian Santri */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Kolom Pencarian */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari nama santri, NIS, atau kamar..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b5751]/20 focus:border-[#0b5751] transition"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sederet Filter Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Tingkat */}
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              aria-label="Filter Tingkat"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b5751]/20 focus:border-[#0b5751] transition"
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="ULA">Tingkat ULA</option>
              <option value="WUSTHO">Tingkat WUSTHO</option>
              <option value="ULYA">Tingkat ULYA</option>
            </select>

            {/* Filter Kelas */}
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              aria-label="Filter Kelas"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b5751]/20 focus:border-[#0b5751] transition max-w-[150px]"
            >
              <option value="ALL">Semua Kelas</option>
              {availableClassOptions.map((opt) => (
                <option key={opt} value={opt}>
                  Kelas {opt.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            {/* Filter Gender */}
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              aria-label="Filter Gender"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b5751]/20 focus:border-[#0b5751] transition"
            >
              <option value="ALL">Semua Santri</option>
              <option value="PA">Putra (PA)</option>
              <option value="PI">Putri (PI)</option>
            </select>

            {/* Selector Tahun */}
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              aria-label="Tahun Ajaran"
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs font-bold text-slate-800 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0b5751]/20 focus:border-[#0b5751] transition"
            >
              <option value={2026}>Tahun 2026</option>
              <option value={2025}>Tahun 2025</option>
              <option value={2027}>Tahun 2027</option>
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Tampilan 3 Kolom Kartu Kelas Desktop (Permintaan Khusus User: 3 Kolom Kartu Desktop) */}
      {isLoadingSantri && allRows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-sm">
          <div className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p>Memuat data santri dan formasi kelas...</p>
        </div>
      ) : filteredClassGroups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            Tidak ada kartu kelas yang sesuai dengan filter yang dipilih.
          </p>
          <p className="text-xs text-slate-400">
            Coba ubah kata kunci pencarian atau klik widget &apos;Total Santri&apos; untuk menampilkan semua kelas.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <>
          {/* GRID 3 KOLOM KARTU DALAM SATU HALAMAN DESKTOP */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedGroups.map(({ group, filteredStudents }) => (
              <KartuKelasSerahPiagam
                key={group.groupKey}
                group={group}
                filteredStudents={filteredStudents}
                canEdit={canEdit}
                onToggleMenerima={toggleMenerima}
                onBatchSetKelas={batchSetKelasMenerima}
              />
            ))}
          </div>

          {/* 5. Pagination Bar */}
          {totalPages > 1 && (
            <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan halaman <strong className="text-slate-800">{currentPage}</strong> dari{' '}
                <strong className="text-slate-800">{totalPages}</strong> ({filteredClassGroups.length} kelas)
              </span>

              <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  aria-label="Halaman Sebelumnya"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                        currentPage === pNum
                          ? 'bg-[#0b5751] text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Halaman Berikutnya"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
