'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { Printer, Download, Search } from 'lucide-react';
import { exportToExcel } from '@/lib/utils/excel';

type RekapMode = 'wajib' | 'tahfidz';
type TingkatMadin = 'ULA' | 'WUSTHO' | 'ULYA';

const DEFAULT_TARGET_WAJIB: Record<string, string[]> = {
  ULA_1: ['Aqidatul Awam', 'Hidayatus Shibyan', 'Taisirul Khalaq'],
  ULA_2: ['Jurumiyyah', 'Tuhfatul Athfal', 'Washoya'],
  ULA_3: ['Nadhom Maqsud', 'Al-Amtsilah At-Tashrifiyyah', 'Tanbihul Mutaallim'],
  ULA_4: ['Imrithi', 'Qowaidul Irob', 'Sulmul Munawroq'],
  WUSTHO_1: ['Alfiyah Ibnu Malik (Bait 1-500)', 'Fathul Qorib', 'Jawahirul Kalamiyyah'],
  WUSTHO_2: ['Alfiyah Ibnu Malik (Bait 501-1002)', 'Ghayatul Wushul', 'Uqudul Lujain'],
  ULYA_1: ['Ibnu Aqil', 'Fathul Muin', 'Al-Balaghah'],
  ULYA_2: ['Kafrawi', 'Tafsir Jalalain', 'Shahih Bukhari'],
};

export default function RekapHafalanPage() {
  const { setoranList, fetchSetoranData, isLoading: loadingSetoran } = useMuhafadzohStore();
  const { santriList, fetchSantri, isLoading: loadingSantri } = useSantriStore();

  const [mode, setMode] = useState<RekapMode>('wajib');
  const [tingkat, setTingkat] = useState<TingkatMadin>('ULA');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSetoranData();
    if (santriList.length === 0) fetchSantri();
  }, [fetchSetoranData, fetchSantri, santriList.length]);

  // Filter santri by selected tingkat
  const santriTingkat = useMemo(() => {
    return santriList.filter((s) => String(s.tingkat || '').toUpperCase() === tingkat);
  }, [santriList, tingkat]);

  // Map setoran by no_induk: Map<no_induk, Map<item_hafalan_norm, { date, nilai }>>
  const setoranMap = useMemo(() => {
    const map = new Map<string, Map<string, { tgl: string; nilai: string }>>();

    setoranList.forEach((setoran) => {
      const noInduk = String(setoran.no_induk || '').trim();
      const hafalan = String(setoran.item_hafalan || '').trim().toLowerCase();
      const tgl = setoran.tanggal || '-';
      const nilai = setoran.nilai || 'A';

      if (!noInduk || !hafalan) return;

      if (!map.has(noInduk)) {
        map.set(noInduk, new Map());
      }
      const sub = map.get(noInduk)!;
      if (!sub.has(hafalan)) {
        sub.set(hafalan, { tgl, nilai });
      }
    });

    return map;
  }, [setoranList]);

  // Tahfidz Map: Map<no_induk, { juzSet: Set<string>, lastDate: string }>
  const tahfidzMap = useMemo(() => {
    const map = new Map<string, { juzSet: Set<string>; lastDate: string }>();

    setoranList.forEach((row) => {
      const noInduk = String(row.no_induk || '').trim();
      const hafalan = String(row.item_hafalan || '').trim();
      const kategori = String(row.kategori || '').toUpperCase();
      const tgl = row.tanggal || '-';

      const isTahfidz = kategori.includes('TAHFIDZ') || hafalan.toUpperCase().startsWith('JUZ ');
      if (!noInduk || !isTahfidz) return;

      if (!map.has(noInduk)) {
        map.set(noInduk, { juzSet: new Set(), lastDate: tgl });
      }
      const entry = map.get(noInduk)!;
      entry.juzSet.add(hafalan);
      entry.lastDate = tgl;
    });

    return map;
  }, [setoranList]);

  // Classes for current tingkat
  const kelasList = useMemo(() => {
    if (tingkat === 'WUSTHO' || tingkat === 'ULYA') return ['1', '2'];
    return ['1', '2', '3', '4'];
  }, [tingkat]);

  // Export Excel
  const handleExport = () => {
    if (mode === 'wajib') {
      const rows: Record<string, unknown>[] = [];
      let no = 1;

      kelasList.forEach((kls) => {
        const configKey = `${tingkat}_${kls}`;
        const targetItems = DEFAULT_TARGET_WAJIB[configKey] || [];
        const santriKelas = santriTingkat.filter((s) => String(s.din_kls || '').trim() === kls);

        santriKelas.forEach((s) => {
          const subMap = setoranMap.get(String(s.no_induk || '').trim());
          let completedCount = 0;

          const rowData: Record<string, unknown> = {
            No: no++,
            'Tingkat / Kelas': `${tingkat} ${kls}-${s.din_bag || ''}`,
            'No. Induk': s.no_induk,
            'Nama Santri': s.nama,
            'PA/PI': s.pa_pi,
          };

          targetItems.forEach((target) => {
            const hasPassed = subMap?.has(target.toLowerCase());
            if (hasPassed) completedCount++;
            rowData[target] = hasPassed ? `Lulus (${subMap?.get(target.toLowerCase())?.tgl})` : '-';
          });

          rowData['Total Capaian'] = `${completedCount} / ${targetItems.length}`;
          rowData['Status'] = completedCount >= targetItems.length && targetItems.length > 0 ? 'Tuntas' : 'Belum Tuntas';
          rows.push(rowData);
        });
      });

      exportToExcel(rows, `Rekap_Hafalan_Wajib_${tingkat}`);
    } else {
      const rows = santriTingkat.map((s, idx) => {
        const entry = tahfidzMap.get(String(s.no_induk || '').trim());
        const juzList = entry ? Array.from(entry.juzSet).join(', ') : '-';
        const totalJuz = entry ? entry.juzSet.size : 0;

        return {
          No: idx + 1,
          'No. Induk': s.no_induk,
          'Nama Santri': s.nama,
          'Kelas Diniyyah': `${tingkat} ${s.din_kls || ''}-${s.din_bag || ''}`,
          'PA/PI': s.pa_pi,
          'Daftar Juz Selesai': juzList,
          'Total Juz': totalJuz,
          'Tanggal Setoran Terakhir': entry?.lastDate || '-',
        };
      });

      exportToExcel(rows, `Rekap_Hafalan_Tahfidz_${tingkat}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading = loadingSetoran || loadingSantri;

  return (
    <div className="space-y-4">
      {/* Header & Toolbar (Identik dengan rekap-hafalan.html) */}
      <div className="card-panel border-0 bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 m-0">Rekapitulasi Hafalan Pertingkatan</h1>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Pantau progress hafalan santri kategori wajib maupun tahfidz per tingkatan madrasah diniyyah
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switch Pills */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setMode('wajib')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  mode === 'wajib'
                    ? 'bg-[#0f766e] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hafalan Wajib
              </button>
              <button
                type="button"
                onClick={() => setMode('tahfidz')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  mode === 'tahfidz'
                    ? 'bg-[#0f766e] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hafalan Tahfidz
              </button>
            </div>

            {/* Select Tingkat */}
            <select
              value={tingkat}
              onChange={(e) => setTingkat(e.target.value as TingkatMadin)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 shadow-xs focus:ring-1 focus:ring-[#0f766e] focus:outline-none"
            >
              <option value="ULA">Tingkat ULA</option>
              <option value="WUSTHO">Tingkat WUSTHO</option>
              <option value="ULYA">Tingkat ULYA</option>
            </select>

            {/* Tombol Cetak A4 */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak A4</span>
            </button>

            {/* Tombol Export Excel */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Search input in card */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari santri / nomor induk..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total Santri Tingkat {tingkat}: <b className="text-slate-800">{santriTingkat.length}</b>
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-2"></div>
          <p className="text-xs text-slate-500">Sedang memuat data rekapitulasi hafalan...</p>
        </div>
      ) : mode === 'wajib' ? (
        /* ================= MODE HAFALAN WAJIB ================= */
        <div className="space-y-6">
          {kelasList.map((kls) => {
            const configKey = `${tingkat}_${kls}`;
            const targetItems = DEFAULT_TARGET_WAJIB[configKey] || [];
            let santriKelas = santriTingkat.filter((s) => String(s.din_kls || '').trim() === kls);

            if (search.trim()) {
              const q = search.toLowerCase();
              santriKelas = santriKelas.filter(
                (s) => s.nama.toLowerCase().includes(q) || s.no_induk.toLowerCase().includes(q)
              );
            }

            if (santriKelas.length === 0) return null;

            return (
              <div
                key={kls}
                className="card-panel border-0 bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:p-0 print:border-none print:shadow-none"
              >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs">
                      Kelas {kls} {tingkat}
                    </span>
                    <h2 className="text-sm font-bold text-slate-800">
                      Target Hafalan: {targetItems.join(' • ') || 'Belum Diatur'}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    Jumlah: <b className="text-slate-800">{santriKelas.length} Santri</b>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="tabel-kbm-resmi w-full text-xs">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }} className="text-center">NO</th>
                        <th style={{ width: '100px' }} className="text-center">NO INDUK</th>
                        <th>NAMA SANTRI</th>
                        <th style={{ width: '50px' }} className="text-center">BAG</th>
                        <th style={{ width: '50px' }} className="text-center">PA/PI</th>
                        {targetItems.map((item, idx) => (
                          <th key={idx} className="text-center px-3">
                            {item}
                          </th>
                        ))}
                        <th style={{ width: '80px' }} className="text-center">CAPAIAN</th>
                        <th style={{ width: '100px' }} className="text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {santriKelas.map((s, idx) => {
                        const subMap = setoranMap.get(String(s.no_induk || '').trim());
                        let completedCount = 0;

                        return (
                          <tr key={s.no_induk} className="hover:bg-slate-50">
                            <td className="text-center text-slate-500">{idx + 1}</td>
                            <td className="text-center font-mono font-semibold text-slate-700">{s.no_induk}</td>
                            <td className="font-bold text-slate-900">{s.nama}</td>
                            <td className="text-center font-bold">{s.din_bag || '-'}</td>
                            <td className="text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  s.pa_pi === 'PA' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                                }`}
                              >
                                {s.pa_pi}
                              </span>
                            </td>
                            {targetItems.map((target, tIdx) => {
                              const match = subMap?.get(target.toLowerCase());
                              const isCompleted = !!match;
                              if (isCompleted) completedCount++;

                              return (
                                <td key={tIdx} className="text-center">
                                  {isCompleted ? (
                                    <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                                      ✓ {match.tgl.split(' ')[0]}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-mono">-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center font-bold text-slate-700">
                              {completedCount} / {targetItems.length}
                            </td>
                            <td className="text-center">
                              {targetItems.length === 0 ? (
                                <span className="text-slate-400 text-[10px]">-</span>
                              ) : completedCount >= targetItems.length ? (
                                <span className="badge bg-emerald-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                                  Tuntas
                                </span>
                              ) : completedCount > 0 ? (
                                <span className="badge bg-amber-500 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                                  {completedCount}/{targetItems.length}
                                </span>
                              ) : (
                                <span className="badge bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                                  Belum Setor
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= MODE HAFALAN TAHFIDZ ================= */
        <div className="card-panel border-0 bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:p-0 print:border-none print:shadow-none">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-800">
              Rekapitulasi Santri Tahfidz Qur&apos;an - Tingkat {tingkat}
            </h2>
            <span className="text-xs text-slate-500">
              Total: <b className="text-slate-800">{santriTingkat.length} Santri</b>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="tabel-kbm-resmi w-full text-xs">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} className="text-center">NO</th>
                  <th style={{ width: '100px' }} className="text-center">NO INDUK</th>
                  <th>NAMA SANTRI</th>
                  <th style={{ width: '80px' }} className="text-center">KELAS</th>
                  <th style={{ width: '50px' }} className="text-center">PA/PI</th>
                  <th>DAFTAR JUZ SELESAI</th>
                  <th style={{ width: '90px' }} className="text-center">TOTAL JUZ</th>
                  <th style={{ width: '110px' }} className="text-center">TGL TERAKHIR</th>
                </tr>
              </thead>
              <tbody>
                {santriTingkat.map((s, idx) => {
                  const entry = tahfidzMap.get(String(s.no_induk || '').trim());
                  const juzArray = entry ? Array.from(entry.juzSet) : [];

                  return (
                    <tr key={s.no_induk} className="hover:bg-slate-50">
                      <td className="text-center text-slate-500">{idx + 1}</td>
                      <td className="text-center font-mono font-semibold text-slate-700">{s.no_induk}</td>
                      <td className="font-bold text-slate-900">{s.nama}</td>
                      <td className="text-center font-semibold">
                        {tingkat} {s.din_kls}-{s.din_bag}
                      </td>
                      <td className="text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            s.pa_pi === 'PA' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                          }`}
                        >
                          {s.pa_pi}
                        </span>
                      </td>
                      <td>
                        {juzArray.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {juzArray.map((juz, jIdx) => (
                              <span
                                key={jIdx}
                                className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold"
                              >
                                {juz}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="text-center font-bold text-emerald-700">
                        {juzArray.length > 0 ? `${juzArray.length} Juz` : '-'}
                      </td>
                      <td className="text-center text-slate-600 font-mono text-[11px]">
                        {entry?.lastDate || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
