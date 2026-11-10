'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useSetorMustahiqStore } from '@/stores/useSetorMustahiqStore';
import {
  Printer,
  Download,
  Inbox,
  GraduationCap,
  CheckCircle2,
  Layers,
  Search,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { cariMustahiqSantri, norm } from '@/lib/utils/setoranHelper';
import * as XLSX from 'xlsx';

type FilterTingkat = 'ALL' | 'ULA' | 'WUSTHO' | 'ULYA';
type FilterGender = 'ALL' | 'PA' | 'PI';

interface SantriStatusRow {
  no: number;
  noInduk: string;
  nama: string;
  isTahfidz?: boolean;
  tahfidzMode?: string;
  tahfidzProgressJuz?: number;
  tahfidzTargetJuz?: number;
  hasWajib: boolean;
  hasSunnah: boolean;
  hasKitab: boolean;
  hasWajibDanSunnah: boolean;
  hasWajibSunnahKitab: boolean;
}

interface ClassRekapRow {
  id: string;
  tingkat: 'ULA' | 'WUSTHO' | 'ULYA';
  din_kls: string;
  din_bag: string;
  pa_pi: 'PA' | 'PI';
  kelasLabel: string; // e.g. "1 A ULA"
  waliKelas: string;
  totalSantri: number;
  // Wajib
  wajibCount: number;
  wajibPct: number;
  // Sunnah
  sunnahCount: number;
  sunnahPct: number;
  // Kitab
  kitabCount: number;
  kitabPct: number;
  // Gabungan
  wajibDanSunnahCount: number;
  wajibDanSunnahPct: number;
  wajibSunnahKitabCount: number;
  wajibSunnahKitabPct: number;
  // Santri details
  santriList: SantriStatusRow[];
}

export default function RekapHafalanPage() {
  const { santriList, fetchSantri, isLoading: loadingSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { config, setoranList, fetchSetoranData, isLoading: loadingSetoran } = useMuhafadzohStore();
  const { logs: mustahiqLogs, activeStates, fetchMustahiqData, isLoading: loadingMustahiq } =
    useSetorMustahiqStore();

  const [filterTingkat, setFilterTingkat] = useState<FilterTingkat>('ALL');
  const [filterGender, setFilterGender] = useState<FilterGender>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Status Gabungan
  const [selectedClassModal, setSelectedClassModal] = useState<ClassRekapRow | null>(null);

  useEffect(() => {
    fetchSantri();
    fetchAsatidz();
    fetchFormasi();
    fetchSetoranData();
    fetchMustahiqData();
  }, [fetchSantri, fetchAsatidz, fetchFormasi, fetchSetoranData, fetchMustahiqData]);

  // Map riwayat setoran per santri: Map<no_induk, Set<'WAJIB' | 'SUNNAH' | 'KITAB'>>
  const santriCategoryParticipationMap = useMemo(() => {
    const map = new Map<string, Set<'WAJIB' | 'SUNNAH' | 'KITAB'>>();

    const addEntry = (noIndukRaw: string, kategoriRaw: string) => {
      const id = norm(noIndukRaw);
      if (!id) return;
      const k = norm(kategoriRaw);
      if (!map.has(id)) {
        map.set(id, new Set());
      }
      const set = map.get(id)!;
      if (k.includes('WAJIB')) set.add('WAJIB');
      if (k.includes('SUNNAH')) set.add('SUNNAH');
      if (k.includes('KITAB')) set.add('KITAB');
    };

    // 1. Dari Mustahiq Logs
    mustahiqLogs.forEach((l) => {
      addEntry(l.no_induk, l.kategori);
    });

    // 2. Dari Muhafadzoh Store setoranList
    setoranList.forEach((s) => {
      addEntry(s.no_induk, s.kategori || 'Wajib');
    });

    // 3. Dari activeStates (completed materi)
    Object.entries(activeStates).forEach(([noInduk, state]) => {
      if (state.completed_materi && state.completed_materi.length > 0) {
        addEntry(noInduk, state.active_kategori || 'Wajib');
      }
    });

    return map;
  }, [mustahiqLogs, setoranList, activeStates]);

  // Distinct classes list
  const distinctClasses = useMemo(() => {
    const map = new Map<string, { tingkat: 'ULA' | 'WUSTHO' | 'ULYA'; din_kls: string; din_bag: string; pa_pi: 'PA' | 'PI' }>();

    // 1. Dari formasiList
    formasiList.forEach((f) => {
      const rawTk = norm(f.tingkat);
      const tk: 'ULA' | 'WUSTHO' | 'ULYA' = rawTk.includes('WUSTHO') || rawTk.includes('WUSTHA')
        ? 'WUSTHO'
        : rawTk.includes('ULYA')
        ? 'ULYA'
        : 'ULA';
      const kls = String(f.din_kls || '1').trim();
      const bag = String(f.din_bag || 'A').trim().toUpperCase();
      const papi: 'PA' | 'PI' = norm(f.pa_pi) === 'PI' ? 'PI' : 'PA';

      const key = `${tk}_${kls}_${bag}_${papi}`;
      if (!map.has(key)) {
        map.set(key, { tingkat: tk, din_kls: kls, din_bag: bag, pa_pi: papi });
      }
    });

    // 2. Dari santriList jika ada kelas yang belum terdaftar di formasi
    santriList.forEach((s: any) => {
      const rawTk = norm(s.tingkat || s[26]);
      const tk: 'ULA' | 'WUSTHO' | 'ULYA' = rawTk.includes('WUSTHO') || rawTk.includes('WUSTHA')
        ? 'WUSTHO'
        : rawTk.includes('ULYA')
        ? 'ULYA'
        : 'ULA';
      const rawKls = String(s.din_kls || s[24] || '').trim();
      const kls = rawKls && rawKls !== '-' ? rawKls : '1';
      const rawBag = String(s.din_bag || s[25] || '').trim().toUpperCase();
      const bag = rawBag && rawBag !== '-' ? rawBag : 'A';
      const papi: 'PA' | 'PI' = norm(s.pa_pi || s[4]) === 'PI' ? 'PI' : 'PA';

      const key = `${tk}_${kls}_${bag}_${papi}`;
      if (!map.has(key)) {
        map.set(key, { tingkat: tk, din_kls: kls, din_bag: bag, pa_pi: papi });
      }
    });

    const arr = Array.from(map.values());

    // Sort order: ULA (1) -> WUSTHO (2) -> ULYA (3), then kelas 1..4, then bag A..Z, then PA then PI
    const orderTk: Record<string, number> = { ULA: 1, WUSTHO: 2, ULYA: 3 };
    arr.sort((a, b) => {
      const tA = orderTk[a.tingkat] || 99;
      const tB = orderTk[b.tingkat] || 99;
      if (tA !== tB) return tA - tB;

      const kComp = a.din_kls.localeCompare(b.din_kls, 'id', { numeric: true });
      if (kComp !== 0) return kComp;

      const bComp = a.din_bag.localeCompare(b.din_bag, 'id');
      if (bComp !== 0) return bComp;

      return a.pa_pi.localeCompare(b.pa_pi);
    });

    return arr;
  }, [formasiList, santriList]);

  // Aggregate rekapitulasi data per kelas
  const allClassRekapRows = useMemo<ClassRekapRow[]>(() => {
    return distinctClasses.map((cls) => {
      const { tingkat, din_kls, din_bag, pa_pi } = cls;
      const id = `${tingkat}_${din_kls}_${din_bag}_${pa_pi}`;
      const kelasLabel = `${din_kls} ${din_bag} ${tingkat}`;

      // Cari Mustahiq / Wali Kelas
      const waliKelas = cariMustahiqSantri(
        tingkat,
        din_bag,
        din_kls,
        pa_pi,
        asatidzList,
        formasiList
      );

      // Filter santri di kelas ini
      const matchingSantri = santriList.filter((s: any) => {
        const sTk = norm(s.tingkat || s[26]);
        const sKls = norm(s.din_kls || s[24]);
        const sBag = norm(s.din_bag || s[25]);
        const sPapi = norm(s.pa_pi || s[4]) === 'PI' ? 'PI' : 'PA';

        const matchTk = sTk === tingkat || sTk.includes(tingkat);
        const matchKls = sKls === din_kls;
        const matchBag = sBag === din_bag;
        const matchPapi = sPapi === pa_pi;

        return matchTk && matchKls && matchBag && matchPapi;
      });

      const totalSantri = matchingSantri.length;

      // Status per santri
      const santriStatusList: SantriStatusRow[] = matchingSantri
        .sort((a: any, b: any) =>
          String(a.nama || a[5] || '').localeCompare(String(b.nama || b[5] || ''), 'id')
        )
        .map((s: any, idx: number) => {
          const noInduk = String(s.no_induk || s[1] || '').trim();
          const nama = String(s.nama || s[5] || '-').trim();
          const pSet = santriCategoryParticipationMap.get(norm(noInduk)) || new Set();

          const hasWajib = pSet.has('WAJIB');
          const hasSunnah = pSet.has('SUNNAH');
          const hasKitab = pSet.has('KITAB');

          // Data Tahfidz jika terdaftar
          const tahfidzItem = (config?.tahfidz?.santriTahfidzList || []).find(
            (ts) => norm(ts.no_induk) === norm(noInduk)
          );
          const isTahfidz = Boolean(tahfidzItem);
          const tahfidzTargetJuz = tahfidzItem?.customTargetJuz || config?.tahfidz?.standarMaksimalJuz || 3;
          const tahfidzMode = tahfidzItem?.mode || 'simultan';

          let tahfidzProgressJuz = 0;
          if (isTahfidz) {
            const completedJuzSet = new Set<number>();
            mustahiqLogs
              .filter(
                (l) =>
                  norm(l.no_induk) === norm(noInduk) &&
                  (l.kategori === 'Tahfidz' ||
                    (l.materi_nama && l.materi_nama.toLowerCase().startsWith('juz ')))
              )
              .forEach((l) => {
                const match = (l.materi_nama || '').match(/\d+/);
                if (match) completedJuzSet.add(parseInt(match[0], 10));
              });
            tahfidzProgressJuz = completedJuzSet.size;
          }

          return {
            no: idx + 1,
            noInduk,
            nama,
            isTahfidz,
            tahfidzMode,
            tahfidzProgressJuz,
            tahfidzTargetJuz,
            hasWajib,
            hasSunnah,
            hasKitab,
            hasWajibDanSunnah: hasWajib && hasSunnah,
            hasWajibSunnahKitab: hasWajib && hasSunnah && hasKitab,
          };
        });

      let wajibCount = 0;
      let sunnahCount = 0;
      let kitabCount = 0;
      let wajibDanSunnahCount = 0;
      let wajibSunnahKitabCount = 0;

      santriStatusList.forEach((s) => {
        if (s.hasWajib) wajibCount++;
        if (s.hasSunnah) sunnahCount++;
        if (s.hasKitab) kitabCount++;
        if (s.hasWajibDanSunnah) wajibDanSunnahCount++;
        if (s.hasWajibSunnahKitab) wajibSunnahKitabCount++;
      });

      const wajibPct = totalSantri > 0 ? Math.round((wajibCount / totalSantri) * 100) : 0;
      const sunnahPct = totalSantri > 0 ? Math.round((sunnahCount / totalSantri) * 100) : 0;
      const kitabPct = totalSantri > 0 ? Math.round((kitabCount / totalSantri) * 100) : 0;
      const wajibDanSunnahPct =
        totalSantri > 0 ? Math.round((wajibDanSunnahCount / totalSantri) * 100) : 0;
      const wajibSunnahKitabPct =
        totalSantri > 0 ? Math.round((wajibSunnahKitabCount / totalSantri) * 100) : 0;

      return {
        id,
        tingkat,
        din_kls,
        din_bag,
        pa_pi,
        kelasLabel,
        waliKelas,
        totalSantri,
        wajibCount,
        wajibPct,
        sunnahCount,
        sunnahPct,
        kitabCount,
        kitabPct,
        wajibDanSunnahCount,
        wajibDanSunnahPct,
        wajibSunnahKitabCount,
        wajibSunnahKitabPct,
        santriList: santriStatusList,
      };
    });
  }, [distinctClasses, santriList, asatidzList, formasiList, santriCategoryParticipationMap]);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return allClassRekapRows.filter((r) => {
      // Filter Tingkat
      if (filterTingkat !== 'ALL' && r.tingkat !== filterTingkat) {
        return false;
      }
      // Filter Gender
      if (filterGender !== 'ALL' && r.pa_pi !== filterGender) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = norm(searchQuery);
        const matchKelas = norm(r.kelasLabel).includes(q);
        const matchWali = norm(r.waliKelas).includes(q);
        if (!matchKelas && !matchWali) return false;
      }
      return true;
    });
  }, [allClassRekapRows, filterTingkat, filterGender, searchQuery]);

  // Overall totals
  const overallStats = useMemo(() => {
    let santriSum = 0;
    let wajibSum = 0;
    let sunnahSum = 0;
    let kitabSum = 0;

    filteredRows.forEach((r) => {
      santriSum += r.totalSantri;
      wajibSum += r.wajibCount;
      sunnahSum += r.sunnahCount;
      kitabSum += r.kitabCount;
    });

    return {
      totalKelas: filteredRows.length,
      totalSantri: santriSum,
      totalWajib: wajibSum,
      totalSunnah: sunnahSum,
      totalKitab: kitabSum,
    };
  }, [filteredRows]);

  // Export Excel Handler
  const handleExport = () => {
    if (filteredRows.length === 0) {
      alert('Tidak ada data rekapitulasi untuk diekspor.');
      return;
    }

    const aoa: any[][] = [
      ['REKAPITULASI HAFALAN PERTINGKATAN MADRASAH DINIYYAH'],
      ['Pondok Pesantren Darussalam Blokagung Banyuwangi'],
      [
        `Filter: Tingkat ${filterTingkat === 'ALL' ? 'Semua Tingkat' : filterTingkat} | Gender ${
          filterGender === 'ALL' ? 'Semua (PA/PI)' : filterGender
        }`,
      ],
      [],
      [
        'No',
        'Kelas',
        'Nama Mustahiq/qoh',
        'PA/PI',
        'Total Santri',
        'Hafalan Wajib (%)',
        'Hafalan Wajib (Rasio)',
        'Hafalan Sunnah (%)',
        'Hafalan Sunnah (Rasio)',
        'Hafalan Kitab (%)',
        'Hafalan Kitab (Rasio)',
        'Wajib & Sunnah (%)',
        'Wajib, Sunnah & Kitab (%)',
      ],
    ];

    filteredRows.forEach((r, idx) => {
      aoa.push([
        idx + 1,
        r.kelasLabel,
        r.waliKelas,
        r.pa_pi,
        r.totalSantri,
        `${r.wajibPct}%`,
        `${r.wajibCount}/${r.totalSantri}`,
        `${r.sunnahPct}%`,
        `${r.sunnahCount}/${r.totalSantri}`,
        `${r.kitabPct}%`,
        `${r.kitabCount}/${r.totalSantri}`,
        `${r.wajibDanSunnahPct}% (${r.wajibDanSunnahCount}/${r.totalSantri})`,
        `${r.wajibSunnahKitabPct}% (${r.wajibSunnahKitabCount}/${r.totalSantri})`,
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Pertingkatan');
    XLSX.writeFile(
      wb,
      `Rekap_Hafalan_Pertingkatan_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  const isLoading = loadingSantri || loadingSetoran || loadingMustahiq;

  return (
    <div className="space-y-4">
      {/* 1. Header & Toolbar */}
      <div className="border border-slate-200 bg-white p-4 rounded-xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                <GraduationCap className="w-5 h-5 text-emerald-700" />
              </span>
              <h1 className="text-xl font-bold text-slate-800 m-0">
                Rekapitulasi Hafalan Pertingkatan
              </h1>
            </div>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Rekapitulasi capaian hafalan santri kategori Wajib, Sunnah, dan Kitab per kelas madrasah diniyyah.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tingkat */}
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value as FilterTingkat)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 shadow-2xs focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="ULA">Tingkat ULA</option>
              <option value="WUSTHO">Tingkat WUSTHO</option>
              <option value="ULYA">Tingkat ULYA</option>
            </select>

            {/* Filter Gender */}
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value as FilterGender)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 shadow-2xs focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua (PA / PI)</option>
              <option value="PA">Putra (PA)</option>
              <option value="PI">Putri (PI)</option>
            </select>

            {/* Input Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kelas / wali..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none shadow-2xs"
              />
            </div>

            {/* Tombol Cetak A4 */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak A4</span>
            </button>

            {/* Tombol Export Excel */}
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Singkat Counter */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 flex-wrap text-xs">
          <span className="text-slate-500 font-medium">Ringkasan Terpilih:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold">
            {overallStats.totalKelas} Kelas Terdaftar
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
            {overallStats.totalSantri} Total Santri
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
            Wajib: {overallStats.totalWajib} Santri
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
            Sunnah: {overallStats.totalSunnah} Santri
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 font-semibold">
            Kitab: {overallStats.totalKitab} Santri
          </span>
        </div>
      </div>

      {/* 2. Loading State */}
      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-2"></div>
          <p className="text-xs text-slate-500 font-medium">
            Sedang memuat dan mengkalkulasi rekapitulasi hafalan pertingkatan...
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-slate-200 shadow-xs rounded-xl bg-white">
          <Inbox className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h6 className="font-bold text-slate-700 text-sm mb-1">Data Kelas Tidak Ditemukan</h6>
          <p className="text-xs text-slate-500 mb-3">
            Tidak ada data kelas yang cocok dengan filter atau kata kunci pencarian.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterTingkat('ALL');
              setFilterGender('ALL');
              setSearchQuery('');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        /* 3. TABEL UTAMA REKAPITULASI HAFALAN PERTINGKATAN */
        <div className="border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-rekap tabel-kbm-resmi w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700">
                  <th style={{ width: '45px' }} className="text-center py-3">
                    NO
                  </th>
                  <th style={{ width: '130px' }} className="text-center py-3">
                    KELAS
                  </th>
                  <th style={{ minWidth: '180px' }} className="py-3">
                    NAMA MUSTAHIQ/QOH
                  </th>
                  <th style={{ width: '70px' }} className="text-center py-3">
                    PA/PI
                  </th>
                  <th style={{ minWidth: '150px' }} className="text-center py-3">
                    HAFALAN WAJIB
                  </th>
                  <th style={{ minWidth: '150px' }} className="text-center py-3">
                    HAFALAN SUNNAH
                  </th>
                  <th style={{ minWidth: '150px' }} className="text-center py-3">
                    HAFALAN KITAB
                  </th>
                  <th style={{ width: '130px' }} className="text-center py-3">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r, idx) => {
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* NO */}
                      <td className="text-center text-slate-400 font-mono py-3">
                        {idx + 1}
                      </td>

                      {/* KELAS (DAPAT DIKLIK UNTUK MEMUNCULKAN POPUP RINCIAN REKAP HAFALAN KELAS) */}
                      <td className="text-center font-bold text-slate-900 font-mono py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedClassModal(r)}
                          className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-all font-mono font-bold cursor-pointer inline-flex items-center gap-1 shadow-2xs group/btn-kls"
                          title={`Klik untuk melihat Rincian Rekap Hafalan Kelas ${r.kelasLabel} (${r.pa_pi})`}
                        >
                          <span>{r.kelasLabel}</span>
                        </button>
                      </td>

                      {/* NAMA MUSTAHIQ/QOH (DAPAT DIKLIK UNTUK MEMUNCULKAN POPUP RINCIAN REKAP HAFALAN KELAS) */}
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedClassModal(r)}
                          className="text-left group/mustahiq cursor-pointer block hover:opacity-95 transition-all"
                          title={`Klik untuk melihat Rincian Rekap Hafalan Kelas ${r.kelasLabel} (${r.pa_pi})`}
                        >
                          <span className="font-bold text-slate-800 group-hover/mustahiq:text-emerald-800 transition-colors block">
                            {r.waliKelas}
                          </span>
                          <span className="block text-[11px] text-slate-400 font-normal group-hover/mustahiq:text-emerald-600 transition-colors">
                            {r.totalSantri} Santri
                          </span>
                        </button>
                      </td>

                      {/* PA/PI */}
                      <td className="text-center py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                            r.pa_pi === 'PA'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {r.pa_pi}
                        </span>
                      </td>

                      {/* HAFALAN WAJIB */}
                      <td className="text-center py-3 px-3">
                        <div className="space-y-1 max-w-[130px] mx-auto">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-emerald-800">{r.wajibPct}%</span>
                            <span className="text-slate-500 font-mono">
                              {r.wajibCount}/{r.totalSantri}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(r.wajibPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* HAFALAN SUNNAH */}
                      <td className="text-center py-3 px-3">
                        <div className="space-y-1 max-w-[130px] mx-auto">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-blue-800">{r.sunnahPct}%</span>
                            <span className="text-slate-500 font-mono">
                              {r.sunnahCount}/{r.totalSantri}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(r.sunnahPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* HAFALAN KITAB */}
                      <td className="text-center py-3 px-3">
                        <div className="space-y-1 max-w-[130px] mx-auto">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-indigo-800">{r.kitabPct}%</span>
                            <span className="text-slate-500 font-mono">
                              {r.kitabCount}/{r.totalSantri}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(r.kitabPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* STATUS (BISA DIKLIK UNTUK MODAL RINCIAN GABUNGAN) */}
                      <td className="text-center py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedClassModal(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 shadow-2xs transition-all cursor-pointer"
                          title="Klik untuk melihat rincian total % gabungan hafalan"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Rincian</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== MODAL POPUP RINCIAN STATUS GABUNGAN ==================== */}
      {selectedClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Rincian Rekap Hafalan Kelas {selectedClassModal.kelasLabel} ({selectedClassModal.pa_pi})
                  </h3>
                  <p className="text-xs text-slate-300">
                    Mustahiq: <strong>{selectedClassModal.waliKelas}</strong> • Total:{' '}
                    <strong>{selectedClassModal.totalSantri} Santri</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Kartu Ringkasan Gabungan 1 & 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Gabungan 1: Wajib + Sunnah */}
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Wajib + Sunnah
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {selectedClassModal.wajibDanSunnahCount} / {selectedClassModal.totalSantri} Santri
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-800">
                      {selectedClassModal.wajibDanSunnahPct}%
                    </span>
                    <span className="text-xs text-emerald-700">Telah setor kedua kategori</span>
                  </div>
                  <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full"
                      style={{ width: `${Math.min(selectedClassModal.wajibDanSunnahPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Gabungan 2: Wajib + Sunnah + Kitab */}
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                      Wajib + Sunnah + Kitab
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {selectedClassModal.wajibSunnahKitabCount} / {selectedClassModal.totalSantri} Santri
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-indigo-800">
                      {selectedClassModal.wajibSunnahKitabPct}%
                    </span>
                    <span className="text-xs text-indigo-700">Telah setor ketiga kategori</span>
                  </div>
                  <div className="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: `${Math.min(selectedClassModal.wajibSunnahKitabPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Rincian Capaian Individu Santri di Kelas Ini */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Daftar Capaian Santri ({selectedClassModal.santriList.length} Santri)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Menampilkan partisipasi setoran per santri
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3 text-center w-10">No</th>
                        <th className="py-2 px-3 text-left">Nama Santri</th>
                        <th className="py-2 px-3 text-center">Wajib</th>
                        <th className="py-2 px-3 text-center">Sunnah</th>
                        <th className="py-2 px-3 text-center">Kitab</th>
                        <th className="py-2 px-3 text-center">Status Gabungan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedClassModal.santriList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                            Belum ada santri terdaftar pada kelas ini.
                          </td>
                        </tr>
                      ) : (
                        selectedClassModal.santriList.map((s) => (
                          <tr key={s.noInduk} className="hover:bg-slate-50/70 transition">
                            <td className="py-2 px-3 text-center text-slate-400 font-mono">
                              {s.no}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{s.nama}</span>
                                {s.isTahfidz && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                                    <Sparkles className="w-2.5 h-2.5 text-cyan-600" />
                                    <span>Tahfidz: Juz {s.tahfidzProgressJuz}/{s.tahfidzTargetJuz}</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono font-normal">
                                NIS: {s.noInduk}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {s.hasWajib ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Sudah</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {s.hasSunnah ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                  <span>Sudah</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {s.hasKitab ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                  <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                                  <span>Sudah</span>
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {s.hasWajibSunnahKitab ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                                  Lengkap (3 Kategori)
                                </span>
                              ) : s.hasWajibDanSunnah ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  Wajib &amp; Sunnah
                                </span>
                              ) : s.hasWajib ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                  Hanya Wajib
                                </span>
                              ) : s.hasSunnah || s.hasKitab ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                                  Sunnah/Kitab
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                  Belum Setor
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedClassModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
