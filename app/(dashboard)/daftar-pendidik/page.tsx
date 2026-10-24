'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useJadwalStore, LIST_HARI } from '@/stores/useJadwalStore';
import {
  GraduationCap,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DaftarPendidikPage() {
  const { asatidzList, fetchAsatidz, isLoading: loadingAsatidz } = useAsatidzStore();
  const { jadwalMap, fetchJadwal, isLoading: loadingJadwal } = useJadwalStore();

  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAsatidz();
    fetchJadwal();
  }, [fetchAsatidz, fetchJadwal]);

  // Aggregate educator dossier with weekly workload and presence on Jam 1 & 2
  const dossierRows = useMemo(() => {
    return asatidzList.map((a) => {
      const teacherKey = a.nama_asatidz.toUpperCase();
      const jadwalRow = jadwalMap[teacherKey];

      // Weekly analysis
      const dayPresence: Record<string, { j1: string; j2: string }> = {
        sabtu: { j1: '', j2: '' },
        ahad: { j1: '', j2: '' },
        senin: { j1: '', j2: '' },
        selasa: { j1: '', j2: '' },
        rabu: { j1: '', j2: '' },
        kamis: { j1: '', j2: '' },
      };

      // Jenjang counts
      const tingkatCounts = {
        ula1: 0,
        ula2: 0,
        ula3: 0,
        ula4: 0,
        wst1: 0,
        wst2: 0,
        ulya1: 0,
        ulya2: 0,
      };

      let totalHours = 0;

      if (jadwalRow) {
        LIST_HARI.forEach((hari) => {
          const k = hari.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
          const dayStr = jadwalRow[k] || '';
          if (!dayStr) return;

          const lines = dayStr.split(';;').map((s) => s.trim()).filter(Boolean);
          lines.forEach((l) => {
            const parts = l.split('|').map((s) => s.trim());
            const jamNum = parseInt((parts[0] || '').replace(/\D/g, ''), 10);
            const kelas = parts[1] || '';

            if (jamNum === 1) dayPresence[k].j1 = kelas || '✓';
            if (jamNum === 2) dayPresence[k].j2 = kelas || '✓';

            const kelasUpper = kelas.toUpperCase();
            if (kelasUpper.includes('ULA') || kelasUpper.includes('1 ') || kelasUpper.includes('2 ')) {
              if (kelasUpper.includes('1')) tingkatCounts.ula1++;
              else if (kelasUpper.includes('2')) tingkatCounts.ula2++;
              else if (kelasUpper.includes('3')) tingkatCounts.ula3++;
              else tingkatCounts.ula4++;
            } else if (kelasUpper.includes('WST') || kelasUpper.includes('WUSTHO')) {
              if (kelasUpper.includes('1')) tingkatCounts.wst1++;
              else tingkatCounts.wst2++;
            } else if (kelasUpper.includes('ULYA')) {
              if (kelasUpper.includes('1')) tingkatCounts.ulya1++;
              else tingkatCounts.ulya2++;
            }

            if (jamNum === 1 || jamNum === 2) {
              totalHours++;
            }
          });
        });
      }

      return {
        kode: a.nia || '-',
        nama: a.nama_asatidz,
        asal: a.blok ? `Blok ${a.blok}` : (a.kamar ? `Kamar ${a.kamar}` : '-'),
        jah: a.jah_asatidz || '-',
        dayPresence,
        tingkatCounts,
        totalHours,
      };
    }).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [asatidzList, jadwalMap]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return dossierRows;
    const q = search.toLowerCase().trim();
    return dossierRows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.kode.toLowerCase().includes(q) ||
        r.asal.toLowerCase().includes(q) ||
        r.jah.toLowerCase().includes(q)
    );
  }, [dossierRows, search]);

  const handleExportExcel = () => {
    const data = filteredRows.map((r, idx) => ({
      NO: idx + 1,
      KODE: r.kode,
      'NAMA ASATIDZ': r.nama,
      ASAL: r.asal,
      JAH: r.jah,
      'SABTU I': r.dayPresence.sabtu.j1 || '-',
      'SABTU II': r.dayPresence.sabtu.j2 || '-',
      'AHAD I': r.dayPresence.ahad.j1 || '-',
      'AHAD II': r.dayPresence.ahad.j2 || '-',
      'SENIN I': r.dayPresence.senin.j1 || '-',
      'SENIN II': r.dayPresence.senin.j2 || '-',
      'SELASA I': r.dayPresence.selasa.j1 || '-',
      'SELASA II': r.dayPresence.selasa.j2 || '-',
      'RABU I': r.dayPresence.rabu.j1 || '-',
      'RABU II': r.dayPresence.rabu.j2 || '-',
      'KAMIS I': r.dayPresence.kamis.j1 || '-',
      'KAMIS II': r.dayPresence.kamis.j2 || '-',
      'TOTAL JAM': r.totalHours,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar_Pendidik');
    XLSX.writeFile(wb, 'Daftar_Tenaga_Pendidik_Madin.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai madinblokagung-main daftar-pendidik.html */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-madin-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Daftar Tenaga Pendidik
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Madrasah Diniyyah Al Amiriyyah Blokagung
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                fetchAsatidz();
                fetchJadwal();
              }}
              disabled={loadingAsatidz || loadingJadwal}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAsatidz ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-madin-700" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-madin-700 hover:bg-madin-800 text-white transition shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Cetak Dokumen</span>
            </button>
          </div>
        </div>

        {/* Bar Pencarian */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Kode / Nama / Asal / Jah..."
              className="w-full text-xs pl-8 pr-7 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-madin-700/20"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs font-semibold text-slate-600">
            Menampilkan <b>{filteredRows.length}</b> dari {dossierRows.length} Tenaga Pendidik
          </span>
        </div>
      </div>

      {/* 2. Area Tabel Dokumen Resmi Sesuai daftar-pendidik.html */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm" id="areaPrintDaftarPendidik">
        <div className="text-center mb-4">
          <h5 className="font-bold text-sm md:text-base text-slate-800 uppercase tracking-wide m-0">
            Daftar Tenaga Pendidik
          </h5>
          <h6 className="font-bold text-slate-500 text-xs md:text-sm m-0 mt-1">
            Madrasah Diniyyah Al Amiriyyah
          </h6>
        </div>

        <div className="table-responsive overflow-x-auto">
          <table className="tabel-daftar-pendidik w-full">
            <thead>
              {/* Baris Header 1 */}
              <tr>
                <th rowSpan={3} style={{ width: 45 }}>KODE</th>
                <th rowSpan={3} style={{ minWidth: 180 }}>NAMA</th>
                <th rowSpan={3} style={{ width: 80 }}>ASAL</th>
                <th rowSpan={3} style={{ width: 100 }}>JAH</th>
                <th colSpan={12}>HARI &amp; JAM</th>
                <th colSpan={8}>TINGKAT dan KODE</th>
                <th rowSpan={3} style={{ width: 45 }}>JML</th>
              </tr>
              {/* Baris Header 2 (Nama Hari & Jenjang) */}
              <tr>
                <th colSpan={2}>Sabtu</th>
                <th colSpan={2}>Ahad</th>
                <th colSpan={2}>Senin</th>
                <th colSpan={2}>Selasa</th>
                <th colSpan={2}>Rabu</th>
                <th colSpan={2}>Kamis</th>
                <th colSpan={4}>ULA</th>
                <th colSpan={2}>WST</th>
                <th colSpan={2}>ULYA</th>
              </tr>
              {/* Baris Header 3 (Sub-Kolom Jam I, II & Kelas I-IV) */}
              <tr>
                <th style={{ width: 28 }}>I</th><th style={{ width: 28 }}>II</th>
                <th style={{ width: 28 }}>I</th><th style={{ width: 28 }}>II</th>
                <th style={{ width: 28 }}>I</th><th style={{ width: 28 }}>II</th>
                <th style={{ width: 28 }}>I</th><th style={{ width: 28 }}>II</th>
                <th style={{ width: 28 }}>I</th><th style={{ width: 28 }}>II</th>
                <th style={{ width: 28 }}>I</th><th style={{ width: 28 }}>II</th>
                <th style={{ width: 28 }}>I</th><th style={{ width: 28 }}>II</th><th style={{ width: 28 }}>III</th><th style={{ width: 28 }}>IV</th>
                <th style={{ width: 28 }}>I</th><th style={{ width: 28 }}>II</th>
                <th style={{ width: 28 }}>I</th><th style={{ width: 28 }}>II</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={25} className="text-center py-6 text-slate-400">
                    Tidak ada data tenaga pendidik yang cocok.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.nama} className="hover:bg-slate-50 transition">
                    <td className="cell-kg font-mono font-bold">{r.kode}</td>
                    <td className="text-left font-semibold text-slate-800 px-2">{r.nama}</td>
                    <td className="text-xs text-slate-600 px-1">{r.asal}</td>
                    <td className="text-xs text-slate-600 px-1">{r.jah}</td>

                    {/* 6 Hari x 2 Jam */}
                    <td className="text-[11px] font-mono">{r.dayPresence.sabtu.j1 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.sabtu.j2 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.ahad.j1 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.ahad.j2 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.senin.j1 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.senin.j2 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.selasa.j1 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.selasa.j2 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.rabu.j1 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.rabu.j2 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.kamis.j1 || '-'}</td>
                    <td className="text-[11px] font-mono">{r.dayPresence.kamis.j2 || '-'}</td>

                    {/* Tingkat & Kode */}
                    <td className="text-[11px]">{r.tingkatCounts.ula1 || '-'}</td>
                    <td className="text-[11px]">{r.tingkatCounts.ula2 || '-'}</td>
                    <td className="text-[11px]">{r.tingkatCounts.ula3 || '-'}</td>
                    <td className="text-[11px]">{r.tingkatCounts.ula4 || '-'}</td>
                    <td className="text-[11px]">{r.tingkatCounts.wst1 || '-'}</td>
                    <td className="text-[11px]">{r.tingkatCounts.wst2 || '-'}</td>
                    <td className="text-[11px]">{r.tingkatCounts.ulya1 || '-'}</td>
                    <td className="text-[11px]">{r.tingkatCounts.ulya2 || '-'}</td>

                    {/* Total Jam */}
                    <td className="font-bold text-madin-700">{r.totalHours}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
