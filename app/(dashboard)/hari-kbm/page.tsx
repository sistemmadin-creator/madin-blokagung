'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useJadwalStore, LIST_HARI, HariKbm } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { Asatidz } from '@/types/asatidz';
import {
  CalendarDays,
  Table as TableIcon,
  LayoutGrid,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Search,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface TeacherDaySlot {
  jam: 1 | 2;
  fan: string;
  kelas: string;
}

interface TeacherDayRow {
  nama_asatidz: string;
  nia: string;
  jah: string;
  blok: string;
  kamar: string;
  tingkat: string;
  jam1: TeacherDaySlot[];
  jam2: TeacherDaySlot[];
  totalJam: number;
}

export default function HariKbmPage() {
  const { jadwalMap, fetchJadwal, isLoading } = useJadwalStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [selectedHari, setSelectedHari] = useState<HariKbm>('Sabtu');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [search, setSearch] = useState('');
  const [fltTingkat, setFltTingkat] = useState('');
  const [fltJam, setFltJam] = useState<'semua' | '1' | '2'>('semua');

  useEffect(() => {
    fetchJadwal();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchJadwal, fetchAsatidz, asatidzList.length]);

  // Transform schedule by selected day
  const teacherDayList: TeacherDayRow[] = useMemo(() => {
    const hariKey = selectedHari.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';

    const asatidzMap = new Map<string, Asatidz>();
    asatidzList.forEach((a) => {
      if (a.nama_asatidz) {
        asatidzMap.set(a.nama_asatidz.trim().toUpperCase(), a);
      }
    });

    const rows: TeacherDayRow[] = [];

    Object.values(jadwalMap).forEach((teacherRow) => {
      const nama = String(teacherRow.nama_asatidz || '').trim();
      if (!nama) return;

      const dayStr = teacherRow[hariKey] || '';
      if (!dayStr.trim()) return;

      const lines = dayStr
        .split(/\r?\n|;;/)
        .map((s) => s.trim())
        .filter(Boolean);

      const j1: TeacherDaySlot[] = [];
      const j2: TeacherDaySlot[] = [];

      lines.forEach((line) => {
        const parts = line.split('|').map((s) => s.trim());
        const jamStr = parts[0] || '';
        const fan = parts[1] || '';
        const kelas = parts[2] || '';

        const m = jamStr.match(/\d+/);
        const jamNum = m ? parseInt(m[0], 10) : 0;
        if (jamNum === 1) j1.push({ jam: 1, fan, kelas });
        if (jamNum === 2) j2.push({ jam: 2, fan, kelas });
      });

      if (j1.length === 0 && j2.length === 0) return;

      const a = asatidzMap.get(nama.toUpperCase());

      rows.push({
        nama_asatidz: nama,
        nia: a?.nia || '-',
        jah: a?.jah_asatidz || '-',
        blok: a?.blok ? `Blok ${a.blok}` : '-',
        kamar: a?.kamar || '-',
        tingkat: a?.tingkat_asatidz || '',
        jam1: j1,
        jam2: j2,
        totalJam: j1.length + j2.length,
      });
    });

    return rows.sort((a, b) => a.nama_asatidz.localeCompare(b.nama_asatidz));
  }, [selectedHari, jadwalMap, asatidzList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return teacherDayList.filter((row) => {
      if (fltTingkat && !row.tingkat.toUpperCase().includes(fltTingkat.toUpperCase())) {
        return false;
      }
      if (fltJam === '1' && row.jam1.length === 0) return false;
      if (fltJam === '2' && row.jam2.length === 0) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const text = `${row.nama_asatidz} ${row.nia} ${row.jah} ${row.blok} ${row.jam1.map(s => `${s.fan} ${s.kelas}`).join(' ')} ${row.jam2.map(s => `${s.fan} ${s.kelas}`).join(' ')}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [teacherDayList, fltTingkat, fltJam, search]);

  const totalJamKeseluruhan = useMemo(() => {
    return filteredList.reduce((acc, cur) => acc + cur.totalJam, 0);
  }, [filteredList]);

  const handleExportExcel = () => {
    const data = filteredList.map((r, idx) => ({
      NO: idx + 1,
      NIA: r.nia,
      'NAMA ASATIDZ': r.nama_asatidz,
      JAH: r.jah,
      'JAM 1': r.jam1.map((s) => `${s.kelas} (${s.fan})`).join(' / ') || '-',
      'JAM 2': r.jam2.map((s) => `${s.kelas} (${s.fan})`).join(' / ') || '-',
      'TOTAL JAM': r.totalJam,
      LOKASI: `${r.blok} / Kamar ${r.kamar}`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Hari_${selectedHari}`);
    XLSX.writeFile(wb, `Jadwal_Harian_Asatidz_${selectedHari}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai hari-kbm.html */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-6 h-6 text-madin-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Hari KBM (Jadwal Harian Asatidz)
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Daftar asatidz yang aktif mengajar beserta penugasan kelas dan jam pada hari yang dipilih
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Toggle */}
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition ${
                  viewMode === 'table' ? 'bg-madin-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition ${
                  viewMode === 'card' ? 'bg-madin-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kartu</span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchJadwal}
              disabled={isLoading}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
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
              <span>Cetak / Print</span>
            </button>
          </div>
        </div>

        {/* Toolbar Switch Hari (Sabtu s/d Kamis) */}
        <div className="flex items-center flex-wrap gap-2.5 mt-4 pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <CalendarDays className="w-4 h-4 text-madin-700" />
            Pilih Hari KBM:
          </span>

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 shadow-xs flex-wrap">
            {LIST_HARI.map((hari) => (
              <button
                key={hari}
                type="button"
                onClick={() => setSelectedHari(hari)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${
                  selectedHari === hari
                    ? 'bg-madin-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {hari}
              </button>
            ))}
          </div>

          <span className="ml-auto px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
            Hari Aktif: <b>{selectedHari}</b>
          </span>
        </div>

        {/* Filter Bar & Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end mt-4">
          <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Pencarian Cepat:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Nama / NIA / Fan / Kelas..."
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
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Tingkat Diniyyah:
            </label>
            <select
              value={fltTingkat}
              onChange={(e) => setFltTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none"
            >
              <option value="">Semua Tingkat</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Pilihan Jam:
            </label>
            <select
              value={fltJam}
              onChange={(e) => setFltJam(e.target.value as 'semua' | '1' | '2')}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none"
            >
              <option value="semua">Semua Jam</option>
              <option value="1">Hanya Jam 1</option>
              <option value="2">Hanya Jam 2</option>
            </select>
          </div>

          <div className="flex items-center gap-2 justify-end pb-1">
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              {filteredList.length} Asatidz
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-madin-50 border border-madin-200 text-xs font-bold text-madin-800">
              {totalJamKeseluruhan} Total Jam
            </span>
          </div>
        </div>
      </div>

      {/* 2. Tampilan Dokumen Cetak / Tabel / Kartu */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm" id="areaPrintHariKBM">
        <div className="text-center mb-4">
          <h5 className="font-bold text-sm md:text-base text-slate-800 uppercase tracking-wide m-0">
            JADWAL HARIAN MENGAJAR ASATIDZ - HARI {selectedHari.toUpperCase()}
          </h5>
          <h6 className="font-bold text-slate-500 text-xs md:text-sm m-0 mt-1">
            Madrasah Diniyyah Al Amiriyyah
          </h6>
        </div>

        {viewMode === 'table' ? (
          <div className="table-responsive overflow-x-auto">
            <table className="tabel-kbm-resmi w-full">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>NO</th>
                  <th style={{ width: 65 }}>NIA</th>
                  <th style={{ minWidth: 180 }}>NAMA ASATIDZ</th>
                  <th style={{ width: 120 }}>JAH</th>
                  <th style={{ minWidth: 200 }}>JAM 1</th>
                  <th style={{ minWidth: 200 }}>JAM 2</th>
                  <th style={{ width: 60 }}>TOTAL</th>
                  <th style={{ minWidth: 140 }}>LOKASI / BLOK</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-slate-400">
                      Tidak ada asatidz yang mengajar pada hari {selectedHari} dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((row, idx) => (
                    <tr key={row.nama_asatidz} className="hover:bg-slate-50 transition">
                      <td className="text-center font-semibold text-slate-600">{idx + 1}</td>
                      <td className="cell-kg font-mono font-bold">{row.nia}</td>
                      <td className="font-semibold text-slate-800 px-2">{row.nama_asatidz}</td>
                      <td className="text-xs text-slate-600 px-2">{row.jah}</td>
                      <td className="px-2">
                        {row.jam1.length > 0 ? (
                          row.jam1.map((s, i) => (
                            <span key={i} className="inline-block mr-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                              <strong>{s.kelas}</strong>: {s.fan}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-2">
                        {row.jam2.length > 0 ? (
                          row.jam2.map((s, i) => (
                            <span key={i} className="inline-block mr-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs font-medium">
                              <strong>{s.kelas}</strong>: {s.fan}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="text-center font-bold text-madin-700">{row.totalJam} Jam</td>
                      <td className="text-xs text-slate-600 px-2">{row.blok}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((row) => (
              <div key={row.nama_asatidz} className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{row.nama_asatidz}</h4>
                    <span className="font-mono text-xs text-slate-500">NIA: {row.nia}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-madin-50 text-madin-800 border border-madin-200 text-[10px] font-bold">
                    {row.totalJam} Jam
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-14 font-semibold text-slate-500">Jam 1:</span>
                    {row.jam1.length > 0 ? (
                      <span className="font-medium text-slate-800">
                        {row.jam1.map((s) => `${s.kelas} (${s.fan})`).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 font-semibold text-slate-500">Jam 2:</span>
                    {row.jam2.length > 0 ? (
                      <span className="font-medium text-slate-800">
                        {row.jam2.map((s) => `${s.kelas} (${s.fan})`).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span>Jah: {row.jah}</span>
                  <span>{row.blok}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
