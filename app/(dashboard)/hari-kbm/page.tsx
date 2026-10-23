'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useJadwalStore, LIST_HARI, HariKbm } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { Asatidz } from '@/types/asatidz';
import { Clock, Search, RefreshCw } from 'lucide-react';

export default function HariKbmPage() {
  const { jadwalMap, fetchJadwal, isLoading } = useJadwalStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  // Automatic day detection (Jumat redirects to Sabtu)
  const initialDay: HariKbm = useMemo(() => {
    const dayNum = new Date().getDay();
    const mapDay: Record<number, HariKbm> = {
      0: 'Ahad',
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Sabtu', // Jumat libur -> Sabtu
      6: 'Sabtu',
    };
    return mapDay[dayNum] || 'Sabtu';
  }, []);

  const [selectedHari, setSelectedHari] = useState<HariKbm>(initialDay);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchJadwal();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchJadwal, fetchAsatidz, asatidzList.length]);

  // Aggregate schedule for selected day: map teacher to their slots (jam 1, 2, 3, 4)
  const dailyTeacherRows = useMemo(() => {
    const hariKey = selectedHari.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
    const rows: {
      nama_asatidz: string;
      nia: string;
      blok: string;
      kamar: string;
      jah: string;
      j1: string;
      j2: string;
      j3: string;
      j4: string;
      totalJamHari: number;
    }[] = [];

    // Map asatidz lookup
    const asatidzMap = new Map<string, Asatidz>();
    asatidzList.forEach((a) => {
      asatidzMap.set(a.nama_asatidz.toUpperCase(), a);
      if (a.nia) asatidzMap.set(a.nia.toUpperCase(), a);
    });

    Object.values(jadwalMap).forEach((teacherRow) => {
      const teacherName = teacherRow.nama_asatidz;
      const dayStr = teacherRow[hariKey] || '';
      if (!dayStr) return;

      const lines = dayStr.split(';;').map((s) => s.trim()).filter(Boolean);
      if (lines.length === 0) return;

      let j1 = '', j2 = '', j3 = '', j4 = '';
      let total = 0;

      lines.forEach((l) => {
        const parts = l.split('|').map((s) => s.trim());
        const jamNum = parseInt((parts[0] || '').replace(/\D/g, ''), 10);
        const kelas = parts[1] || '';
        const fan = parts[2] || '';
        const desc = `${kelas} (${fan})`;

        if (jamNum === 1) { j1 = desc; total++; }
        if (jamNum === 2) { j2 = desc; total++; }
        if (jamNum === 3) { j3 = desc; total++; }
        if (jamNum === 4) { j4 = desc; total++; }
      });

      const asatidzObj = asatidzMap.get(teacherName.toUpperCase());

      rows.push({
        nama_asatidz: teacherName,
        nia: asatidzObj?.nia || '-',
        blok: asatidzObj?.blok ? `Blok ${asatidzObj.blok}` : 'Blok Belum Diatur',
        kamar: asatidzObj?.kamar || '-',
        jah: asatidzObj?.jah_asatidz || '-',
        j1,
        j2,
        j3,
        j4,
        totalJamHari: total,
      });
    });

    // Grouping / Sorting
    return rows.sort((a, b) => a.nama_asatidz.localeCompare(b.nama_asatidz));
  }, [jadwalMap, asatidzList, selectedHari]);

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return dailyTeacherRows;
    return dailyTeacherRows.filter(
      (r) =>
        r.nama_asatidz.toLowerCase().includes(q) ||
        r.nia.toLowerCase().includes(q) ||
        r.blok.toLowerCase().includes(q) ||
        r.jah.toLowerCase().includes(q) ||
        r.j1.toLowerCase().includes(q) ||
        r.j2.toLowerCase().includes(q) ||
        r.j3.toLowerCase().includes(q) ||
        r.j4.toLowerCase().includes(q)
    );
  }, [dailyTeacherRows, search]);

  return (
    <div className="space-y-6">
      {/* Header Halaman Hari KBM */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-madin-50 text-madin-700 flex items-center justify-center shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Hari KBM (Jadwal Harian Asatidz)</h1>
            <p className="text-xs text-slate-500">
              Filter Jadwal Mengajar Harian Sesuai Hari Aktif & Blok Kamar ({filteredRows.length} Asatidz Bertugas)
            </p>
          </div>
        </div>

        <button
          onClick={fetchJadwal}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Tabs Pilihan Hari */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {LIST_HARI.map((hari) => (
            <button
              key={hari}
              onClick={() => setSelectedHari(hari)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                selectedHari === hari
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Hari {hari}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari asatidz, kelas, blok..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600"
          />
        </div>
      </div>

      {/* Tabel Jadwal Harian Asatidz */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold z-10 select-none">
              <tr>
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3 whitespace-nowrap">Nama Dewan Asatidz</th>
                <th className="p-3 whitespace-nowrap">NIA / Jah</th>
                <th className="p-3 whitespace-nowrap">Domisili Blok</th>
                <th className="p-3 whitespace-nowrap bg-emerald-50/70 border-x border-slate-200 text-center">
                  Jam 1 (MS)
                </th>
                <th className="p-3 whitespace-nowrap bg-emerald-50/70 border-r border-slate-200 text-center">
                  Jam 2 (MS)
                </th>
                <th className="p-3 whitespace-nowrap bg-blue-50/70 border-r border-slate-200 text-center">
                  Jam 3 (MB)
                </th>
                <th className="p-3 whitespace-nowrap bg-blue-50/70 border-r border-slate-200 text-center">
                  Jam 4 (MB)
                </th>
                <th className="p-3 text-center whitespace-nowrap">Total Jam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    Tidak ada jadwal mengajar asatidz pada hari {selectedHari}.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.nama_asatidz || idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                      {row.nama_asatidz}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono text-slate-600">{row.nia}</span>
                      {row.jah !== '-' && (
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {row.jah}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {row.blok} {row.kamar !== '-' && `(${row.kamar})`}
                    </td>

                    {/* Jam 1 */}
                    <td className="p-2.5 text-center font-semibold border-x border-slate-100 whitespace-nowrap">
                      {row.j1 ? (
                        <span className="inline-block px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                          {row.j1}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Jam 2 */}
                    <td className="p-2.5 text-center font-semibold border-r border-slate-100 whitespace-nowrap">
                      {row.j2 ? (
                        <span className="inline-block px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                          {row.j2}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Jam 3 */}
                    <td className="p-2.5 text-center font-semibold border-r border-slate-100 whitespace-nowrap">
                      {row.j3 ? (
                        <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[11px]">
                          {row.j3}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Jam 4 */}
                    <td className="p-2.5 text-center font-semibold border-r border-slate-100 whitespace-nowrap">
                      {row.j4 ? (
                        <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[11px]">
                          {row.j4}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="p-3 text-center font-bold text-slate-800 font-mono">
                      {row.totalJamHari} Jam
                    </td>
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
