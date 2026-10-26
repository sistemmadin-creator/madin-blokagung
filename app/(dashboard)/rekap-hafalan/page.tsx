'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { Printer, Download, Inbox, GraduationCap, BookOpen, CheckCircle2, Star, Hourglass } from 'lucide-react';
import { DEFAULT_HAFALAN_WAJIB, norm } from '@/lib/utils/setoranHelper';
import * as XLSX from 'xlsx';

type RekapMode = 'wajib' | 'tahfidz';
type TingkatMadin = 'ULA' | 'WUSTHO' | 'ULYA';

// Helper to safely resolve santri tingkat with fallbacks
function resolveSantriTingkat(s: any): TingkatMadin | '' {
  const direct = norm(s.tingkat || s[26]);
  if (direct === 'ULA' || direct === 'WUSTHO' || direct === 'ULYA') {
    return direct as TingkatMadin;
  }
  const combined = norm(`${s.kelas || ''} ${s.din_kls || ''} ${s[20] || ''}`);
  if (combined.includes('WUSTHO')) return 'WUSTHO';
  if (combined.includes('ULYA')) return 'ULYA';
  if (combined.includes('ULA')) return 'ULA';
  return '';
}

// Helper to safely resolve santri class (din_kls)
function resolveSantriKelas(s: any): string {
  const raw = String(s.din_kls || s[24] || '').trim();
  if (raw) return raw;
  const fallback = String(s.kelas || s[20] || '').trim();
  const match = fallback.match(/^([1-4])/);
  return match ? match[1] : '';
}

export default function RekapHafalanPage() {
  const { setoranList, config, fetchSetoranData, isLoading: loadingSetoran } = useMuhafadzohStore();
  const { santriList, fetchSantri, isLoading: loadingSantri } = useSantriStore();

  const [mode, setMode] = useState<RekapMode>('wajib');
  const [tingkat, setTingkat] = useState<TingkatMadin>('ULA');

  useEffect(() => {
    fetchSetoranData();
    if (santriList.length === 0) fetchSantri();
  }, [fetchSetoranData, fetchSantri, santriList.length]);

  // Hitung jumlah santri aktif per tingkatan
  const tingkatCounts = useMemo(() => {
    const counts: Record<TingkatMadin, number> = { ULA: 0, WUSTHO: 0, ULYA: 0 };
    santriList.forEach((s: any) => {
      const t = resolveSantriTingkat(s);
      if (t && counts[t] !== undefined) {
        counts[t]++;
      }
    });
    return counts;
  }, [santriList]);

  // Filter santri by selected tingkat (with robust fallback matching)
  const santriTingkat = useMemo(() => {
    return santriList.filter((s: any) => resolveSantriTingkat(s) === tingkat);
  }, [santriList, tingkat]);

  // Map setoran by no_induk: Map<no_induk, Map<hafalan_norm, tgl>>
  const setoranMap = useMemo(() => {
    const map = new Map<string, Map<string, string>>();

    setoranList.forEach((row) => {
      const noInduk = norm(row.no_induk);
      const hafalan = norm(row.item_hafalan);
      const tgl = row.tanggal || '-';

      if (!noInduk || !hafalan) return;

      if (!map.has(noInduk)) {
        map.set(noInduk, new Map());
      }
      const m = map.get(noInduk)!;
      if (!m.has(hafalan)) {
        m.set(hafalan, tgl);
      }
    });

    return map;
  }, [setoranList]);

  // Tahfidz Map: Map<no_induk, { juzSet: Set<string>, lastDate: string }>
  const tahfidzMap = useMemo(() => {
    const map = new Map<string, { juzSet: Set<string>; lastDate: string }>();

    setoranList.forEach((row) => {
      const noInduk = norm(row.no_induk);
      const hafalan = String(row.item_hafalan || '').trim();
      const kategori = norm(row.kategori);
      const tgl = row.tanggal || '-';

      const isTahfidz = kategori.includes('TAHFIDZ') || norm(hafalan).startsWith('JUZ ');
      if (!noInduk || !isTahfidz) return;

      if (!map.has(noInduk)) {
        map.set(noInduk, {
          juzSet: new Set(),
          lastDate: tgl,
        });
      }
      const entry = map.get(noInduk)!;
      entry.juzSet.add(hafalan);
      entry.lastDate = tgl;
    });

    return map;
  }, [setoranList]);

  // Daftar kelas sesuai tingkatan
  const kelasList = useMemo(() => {
    if (tingkat === 'WUSTHO' || tingkat === 'ULYA') return ['1', '2'];
    return ['1', '2', '3', '4'];
  }, [tingkat]);

  // Konfigurasi target hafalan wajib dari store atau fallback default
  const hafWajibConfig = useMemo(() => {
    return config.hafWajib && Object.keys(config.hafWajib).length > 0
      ? config.hafWajib
      : DEFAULT_HAFALAN_WAJIB;
  }, [config.hafWajib]);

  // Processed Wajib Groups per Class
  const processedWajibGroups = useMemo(() => {
    if (santriTingkat.length === 0) return [];

    return kelasList
      .map((kls) => {
        const santriKelas = santriTingkat
          .filter((s: any) => resolveSantriKelas(s) === kls)
          .sort((a: any, b: any) => {
            const bagA = String(a.din_bag || a[25] || '');
            const bagB = String(b.din_bag || b[25] || '');
            if (bagA !== bagB) return bagA.localeCompare(bagB);
            return String(a.nama || a[5] || '').localeCompare(String(b.nama || b[5] || ''));
          });

        if (santriKelas.length === 0) return null;

        const configKey = `${tingkat}_${kls}`;
        const rawReq = hafWajibConfig[configKey];
        const requiredList: string[] = Array.isArray(rawReq)
          ? rawReq
          : typeof rawReq === 'string'
          ? String(rawReq).split(',').map((s) => s.trim()).filter(Boolean)
          : [];

        let totalTuntas = 0;

        const rows = santriKelas.map((s: any, idx: number) => {
          const sInduk = String(s.no_induk || s[1] || '').trim();
          const sNama = s.nama || s[5] || '-';
          const sDinBag = s.din_bag || s[25] || '-';
          const sGender = s.pa_pi || s[4] || '-';

          const santriSetoran = setoranMap.get(norm(sInduk)) || new Map<string, string>();
          const itemStatus: Record<string, { completed: boolean; tgl: string }> = {};
          let completedCount = 0;

          requiredList.forEach((item) => {
            const itemNorm = norm(item);
            let completed = false;
            let tgl = '';

            if (santriSetoran.has(itemNorm)) {
              completed = true;
              tgl = santriSetoran.get(itemNorm)!;
            } else {
              Array.from(santriSetoran.entries()).some(([k, v]) => {
                if (k.includes(itemNorm) || itemNorm.includes(k)) {
                  completed = true;
                  tgl = v;
                  return true;
                }
                return false;
              });
            }

            if (completed) {
              completedCount++;
              itemStatus[item] = { completed: true, tgl };
            } else {
              itemStatus[item] = { completed: false, tgl: '-' };
            }
          });

          const isTuntas = requiredList.length > 0 && completedCount >= requiredList.length;
          if (isTuntas) totalTuntas++;

          return {
            no: idx + 1,
            noInduk: sInduk,
            nama: sNama,
            dinBag: sDinBag,
            gender: sGender,
            itemStatus,
            completedCount,
            isTuntas,
          };
        });

        const persenTuntas = santriKelas.length > 0 ? Math.round((totalTuntas / santriKelas.length) * 100) : 0;

        return {
          kls,
          tingkat,
          requiredList,
          santriCount: santriKelas.length,
          totalTuntas,
          persenTuntas,
          rows,
        };
      })
      .filter(Boolean) as Array<{
      kls: string;
      tingkat: string;
      requiredList: string[];
      santriCount: number;
      totalTuntas: number;
      persenTuntas: number;
      rows: any[];
    }>;
  }, [santriTingkat, kelasList, hafWajibConfig, tingkat, setoranMap]);

  // Processed Tahfidz Data
  const processedTahfidzData = useMemo(() => {
    if (santriTingkat.length === 0) return [];

    const list = santriTingkat.map((s: any) => {
      const sInduk = String(s.no_induk || s[1] || '').trim();
      const sNama = s.nama || s[5] || '-';
      const sDinKls = s.din_kls || s[24] || '-';
      const sDinBag = s.din_bag || s[25] || '-';
      const sGender = s.pa_pi || s[4] || '-';

      const entry = tahfidzMap.get(norm(sInduk));
      const rawJuzList = entry ? Array.from(entry.juzSet) : [];

      const sortedJuzList = rawJuzList.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      return {
        noInduk: sInduk,
        nama: sNama,
        dinKls: sDinKls,
        dinBag: sDinBag,
        gender: sGender,
        juzList: sortedJuzList,
        juzCount: sortedJuzList.length,
        lastDate: entry ? entry.lastDate : '-',
      };
    });

    // Urutkan juz terbanyak di atas, lalu nama alfabetis
    list.sort((a, b) => {
      if (b.juzCount !== a.juzCount) return b.juzCount - a.juzCount;
      return a.nama.localeCompare(b.nama);
    });

    return list;
  }, [santriTingkat, tahfidzMap]);

  // Cetak A4 (Printing Isolation)
  const handlePrint = () => {
    document.body.classList.add('printing-rekap-hafalan');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-rekap-hafalan');
      }, 500);
    }, 200);
  };

  // Export Excel Resmi Multi-Sheet
  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    if (mode === 'wajib') {
      if (processedWajibGroups.length === 0) {
        alert('Tidak ada data hafalan wajib untuk diekspor.');
        return;
      }

      processedWajibGroups.forEach((group) => {
        const aoa: any[][] = [
          [`REKAPITULASI HAFALAN WAJIB - KELAS ${group.kls} TINGKAT ${tingkat}`],
          [`Madrasah Diniyyah Al Amiriyyah Blokagung`],
          [],
          ['No', 'No. Induk', 'Nama Santri', 'Bagian', 'Gender', ...group.requiredList, 'Total Selesai', 'Status'],
        ];

        group.rows.forEach((r, idx) => {
          aoa.push([
            idx + 1,
            r.noInduk,
            r.nama,
            r.dinBag,
            r.gender,
            ...group.requiredList.map((item) => (r.itemStatus[item]?.completed ? r.itemStatus[item].tgl : '-')),
            `${r.completedCount} / ${group.requiredList.length}`,
            r.isTuntas ? 'TUNTAS' : r.completedCount > 0 ? 'PROGRES' : 'BELUM SETOR',
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, `Kelas ${group.kls}`);
      });

      XLSX.writeFile(wb, `Rekap_Hafalan_Wajib_${tingkat}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      if (processedTahfidzData.length === 0) {
        alert('Tidak ada data hafalan tahfidz untuk diekspor.');
        return;
      }

      const aoa: any[][] = [
        [`REKAPITULASI HAFALAN TAHFIDZ AL-QUR'AN - TINGKAT ${tingkat}`],
        [`Madrasah Diniyyah Al Amiriyyah Blokagung`],
        [],
        ['No', 'No. Induk', 'Nama Santri', 'Kelas', 'Bagian', 'Gender', 'Daftar Juz Disetorkan', 'Total Juz', 'Tgl Terakhir Setor', 'Status'],
      ];

      processedTahfidzData.forEach((r, idx) => {
        aoa.push([
          idx + 1,
          r.noInduk,
          r.nama,
          r.dinKls,
          r.dinBag,
          r.gender,
          r.juzList.join(', '),
          r.juzCount,
          r.lastDate || '-',
          r.juzCount >= 30 ? 'KHATAM 30 JUZ' : r.juzCount > 0 ? 'AKTIF' : 'BELUM SETOR',
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, `Tahfidz ${tingkat}`);
      XLSX.writeFile(wb, `Rekap_Hafalan_Tahfidz_${tingkat}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  const isLoading = loadingSetoran || loadingSantri;

  // Stats for Tahfidz Mode
  const totalSantriTahfidz = processedTahfidzData.filter((p) => p.juzCount > 0).length;
  const totalKhatamTahfidz = processedTahfidzData.filter((p) => p.juzCount >= 30).length;

  return (
    <div className="space-y-4">
      {/* 1. Header & Toolbar Sesuai rekap-hafalan.html (Gambar 2) */}
      <div className="card-panel border-0 bg-white p-4 rounded-xl border border-slate-200 shadow-xs card-panel-header">
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
                    ? 'bg-emerald-700 text-white shadow-2xs'
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
                    ? 'bg-emerald-700 text-white shadow-2xs'
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
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 shadow-2xs focus:border-emerald-600 focus:outline-none"
            >
              <option value="ULA">Tingkat ULA ({tingkatCounts.ULA} Santri)</option>
              <option value="WUSTHO">Tingkat WUSTHO ({tingkatCounts.WUSTHO} Santri)</option>
              <option value="ULYA">Tingkat ULYA ({tingkatCounts.ULYA} Santri)</option>
            </select>

            {/* Tombol Cetak A4 */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak A4</span>
            </button>

            {/* Tombol Export Excel */}
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Loading State */}
      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-2"></div>
          <p className="text-xs text-slate-500">Sedang memuat data rekapitulasi hafalan...</p>
        </div>
      ) : santriTingkat.length === 0 ? (
        /* 3. Empty State (Gambar 2: Data Santri Tidak Ditemukan) */
        <div className="card-panel text-center py-12 text-slate-500 border border-slate-200 shadow-sm rounded-xl bg-white">
          <Inbox className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h6 className="font-bold text-slate-700 text-sm mb-1">Data Santri Tidak Ditemukan</h6>
          <p className="text-xs text-slate-500 mb-3">
            Belum ada data santri yang terdaftar pada Tingkat <b>{tingkat}</b>.
          </p>

          {/* Quick Action jika ada santri di tingkatan lain */}
          {(() => {
            const alternative = (['ULA', 'WUSTHO', 'ULYA'] as TingkatMadin[]).find(
              (t) => t !== tingkat && tingkatCounts[t] > 0
            );
            if (alternative) {
              return (
                <div className="inline-flex flex-col sm:flex-row items-center gap-2 p-2.5 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 mt-1 shadow-2xs">
                  <span>
                    Ditemukan <b>{tingkatCounts[alternative]}</b> santri terdaftar pada Tingkat <b>{alternative}</b>.
                  </span>
                  <button
                    type="button"
                    onClick={() => setTingkat(alternative)}
                    className="font-bold text-emerald-700 hover:text-emerald-900 underline ml-1 cursor-pointer"
                  >
                    Buka Tingkat {alternative} &rarr;
                  </button>
                </div>
              );
            }
            return (
              <a
                href="/santri"
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition"
              >
                <span>Kelola Data Santri</span>
              </a>
            );
          })()}
        </div>
      ) : mode === 'wajib' ? (
        /* 4. MODE HAFALAN WAJIB (Grouped per Kelas) */
        <div className="space-y-6">
          {processedWajibGroups.length === 0 ? (
            <div className="card-panel text-center py-10 text-slate-400 bg-white border border-slate-200 rounded-xl">
              <p className="text-xs mb-0">Belum ada santri pada kelas di tingkat ini.</p>
            </div>
          ) : (
            processedWajibGroups.map((group) => (
              <div
                key={group.kls}
                className="card-panel border border-slate-200 bg-white p-4 rounded-xl shadow-xs"
              >
                {/* Header Group Kelas */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
                  <div>
                    <h6 className="font-bold m-0 text-emerald-800 text-sm uppercase flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      Kelas {group.kls} - Tingkat {group.tingkat}
                    </h6>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Target Wajib:{' '}
                      {group.requiredList.length > 0 ? (
                        <span className="font-semibold text-slate-700">{group.requiredList.join(', ')}</span>
                      ) : (
                        <span className="text-rose-500 font-semibold">Belum ada konfigurasi</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      Total Santri: <b>{group.santriCount}</b>
                    </span>
                    <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Tuntas: <b>{group.totalTuntas} ({group.persenTuntas}%)</b>
                    </span>
                  </div>
                </div>

                {/* Table Rekap Hafalan Wajib */}
                <div className="overflow-x-auto">
                  <table className="table-rekap tabel-kbm-resmi w-full text-xs">
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }} className="text-center">NO</th>
                        <th style={{ width: '110px' }} className="text-center">NO. INDUK</th>
                        <th style={{ minWidth: '160px' }}>NAMA SANTRI</th>
                        <th style={{ width: '60px' }} className="text-center">BAG</th>
                        <th style={{ width: '65px' }} className="text-center">GENDER</th>
                        {group.requiredList.map((item, idx) => (
                          <th key={idx} className="text-center px-3" style={{ minWidth: '130px' }}>
                            {item}
                          </th>
                        ))}
                        <th style={{ width: '95px' }} className="text-center">PROGRESS</th>
                        <th style={{ width: '115px' }} className="text-center">STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((r, idx) => {
                        const rowClass = r.isTuntas ? 'highlight-progress' : '';

                        return (
                          <tr key={r.noInduk || idx} className={`${rowClass} hover:bg-slate-50/70 transition`}>
                            <td className="text-center text-slate-400 font-mono">{r.no}</td>
                            <td className="font-mono font-semibold text-slate-700 text-center">{r.noInduk}</td>
                            <td className="font-bold text-slate-900">{r.nama}</td>
                            <td className="text-center font-bold">{r.dinBag}</td>
                            <td className="text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  r.gender === 'PA'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                {r.gender}
                              </span>
                            </td>

                            {/* Dynamic Target Item Columns */}
                            {group.requiredList.map((item, tIdx) => {
                              const status = r.itemStatus[item];
                              const isCompleted = status?.completed;

                              return (
                                <td key={tIdx} className="text-center">
                                  {isCompleted ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      title={`Lulus pada ${status.tgl}`}
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      <span>{status.tgl.split(' ')[0]}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-mono">-</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="text-center font-bold text-slate-700">
                              {r.completedCount} / {group.requiredList.length}
                            </td>

                            <td className="text-center">
                              {group.requiredList.length === 0 ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                  Belum Dikonfigurasi
                                </span>
                              ) : r.isTuntas ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white shadow-2xs">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Tuntas</span>
                                </span>
                              ) : r.completedCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                                  <Hourglass className="w-3 h-3" />
                                  <span>{r.completedCount}/{group.requiredList.length}</span>
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
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
            ))
          )}
        </div>
      ) : (
        /* 5. MODE HAFALAN TAHFIDZ */
        <div className="card-panel border border-slate-200 bg-white p-4 rounded-xl shadow-xs">
          {/* Header Banner Tahfidz */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-200 gap-2">
            <div>
              <h6 className="font-bold m-0 text-emerald-800 text-sm uppercase flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                Rekapitulasi Hafalan Tahfidz Al-Qur&apos;an - Tingkat {tingkat}
              </h6>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Daftar capaian setoran juz Al-Qur&apos;an santri madrasah diniyyah
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Total Santri: <b>{processedTahfidzData.length}</b>
              </span>
              <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Aktif Tahfidz: <b>{totalSantriTahfidz}</b>
              </span>
              <span className="inline-block px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Khatam 30 Juz: <b>{totalKhatamTahfidz}</b>
              </span>
            </div>
          </div>

          {/* Table Tahfidz */}
          <div className="overflow-x-auto">
            <table className="table-rekap tabel-kbm-resmi w-full text-xs">
              <thead>
                <tr>
                  <th style={{ width: '45px' }} className="text-center">NO</th>
                  <th style={{ width: '110px' }} className="text-center">NO. INDUK</th>
                  <th style={{ minWidth: '160px' }}>NAMA SANTRI</th>
                  <th style={{ width: '80px' }} className="text-center">KELAS</th>
                  <th style={{ width: '65px' }} className="text-center">GENDER</th>
                  <th>DAFTAR JUZ YANG DISETORKAN</th>
                  <th style={{ width: '100px' }} className="text-center">TOTAL</th>
                  <th style={{ width: '120px' }} className="text-center">TGL TERAKHIR</th>
                  <th style={{ width: '125px' }} className="text-center">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {processedTahfidzData.map((p, idx) => {
                  const isKhatam = p.juzCount >= 30;
                  const rowClass = isKhatam ? 'highlight-progress' : '';

                  return (
                    <tr key={p.noInduk || idx} className={`${rowClass} hover:bg-slate-50/70 transition`}>
                      <td className="text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="font-mono font-semibold text-slate-700 text-center">{p.noInduk}</td>
                      <td className="font-bold text-slate-900">{p.nama}</td>
                      <td className="text-center font-bold">
                        {p.dinKls} {p.dinBag}
                      </td>
                      <td className="text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            p.gender === 'PA'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {p.gender}
                        </span>
                      </td>

                      {/* Flex Badges Juz Disetorkan */}
                      <td>
                        {p.juzList.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.juzList.map((juz, jIdx) => (
                              <span
                                key={jIdx}
                                className="inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                              >
                                {juz}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      <td className="text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                            p.juzCount > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.juzCount} Juz
                        </span>
                      </td>

                      <td className="text-center text-slate-600 font-mono whitespace-nowrap">
                        {p.lastDate}
                      </td>

                      <td className="text-center">
                        {isKhatam ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white shadow-2xs">
                            <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                            <span>Khatam 30 Juz</span>
                          </span>
                        ) : p.juzCount > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Aktif Menghafal
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Belum Ada Setoran
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
      )}
    </div>
  );
}
