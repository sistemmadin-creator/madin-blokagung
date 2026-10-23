'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useJadwalStore, LIST_HARI } from '@/stores/useJadwalStore';
import { GraduationCap, Search, RefreshCw, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/utils/excel';

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

      const fanSet = new Set<string>();
      let hoursUla = 0;
      let hoursWustho = 0;
      let hoursUlya = 0;
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
            const fan = parts[2] || '';

            if (jamNum === 1) dayPresence[k].j1 = 'X';
            if (jamNum === 2) dayPresence[k].j2 = 'X';

            if (fan) fanSet.add(fan);

            const kelasUpper = kelas.toUpperCase();
            if (kelasUpper.includes('ULA')) hoursUla++;
            else if (kelasUpper.includes('WUSTHO')) hoursWustho++;
            else if (kelasUpper.includes('ULYA')) hoursUlya++;
            totalHours++;
          });
        });
      }

      return {
        nia: a.nia,
        nis: a.nis || '-',
        nama: a.nama_asatidz,
        pa_pi: a.pa_pi,
        jah: a.jah_asatidz || '-',
        domisili: a.blok ? `Blok ${a.blok} (${a.kamar || '-'})` : '-',
        fanList: Array.from(fanSet).join(', ') || '-',
        dayPresence,
        hoursUla,
        hoursWustho,
        hoursUlya,
        totalHours,
      };
    });
  }, [asatidzList, jadwalMap]);

  const filteredDossier = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return dossierRows;
    return dossierRows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.nia.toLowerCase().includes(q) ||
        r.fanList.toLowerCase().includes(q) ||
        r.jah.toLowerCase().includes(q)
    );
  }, [dossierRows, search]);

  const handleExport = () => {
    const exportData = filteredDossier.map((r) => ({
      NIA: r.nia,
      NIS: r.nis,
      Nama: r.nama,
      Gender: r.pa_pi,
      Jah: r.jah,
      Domisili: r.domisili,
      'Fan Pelajaran': r.fanList,
      'Jam Ula': r.hoursUla,
      'Jam Wustho': r.hoursWustho,
      'Jam Ulya': r.hoursUlya,
      'Total Jam': r.totalHours,
    }));
    exportToExcel(exportData, 'Daftar_Tenaga_Pendidik_Madin_Blokagung');
  };

  const isLoading = loadingAsatidz || loadingJadwal;

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shadow-xs">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Daftar Tenaga Pendidik</h1>
            <p className="text-xs text-slate-500">
              Katalog Profil, Beban Mengajar Mingguan & Distribusi Jam Ula/Wustho/Ulya ({dossierRows.length} Asatidz)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchAsatidz(); fetchJadwal(); }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Bar Pencarian */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pendidik, fan, NIA..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-600"
          />
        </div>
      </div>

      {/* Tabel Dossier Pendidik */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold z-10 select-none">
              <tr>
                <th rowSpan={2} className="p-3 w-10 text-center border-r border-slate-200">No</th>
                <th rowSpan={2} className="p-3 whitespace-nowrap border-r border-slate-200">NIA / NIS</th>
                <th rowSpan={2} className="p-3 whitespace-nowrap border-r border-slate-200">Nama Lengkap Pendidik</th>
                <th rowSpan={2} className="p-3 whitespace-nowrap border-r border-slate-200">Amanah / Domisili</th>
                <th rowSpan={2} className="p-3 whitespace-nowrap border-r border-slate-200">Fan Diampu</th>
                <th colSpan={6} className="p-2 text-center border-r border-slate-200 bg-slate-100">
                  Jadwal Mengajar Jam 1 & 2 Harian
                </th>
                <th colSpan={3} className="p-2 text-center border-r border-slate-200 bg-blue-50">
                  Distribusi Jam Tingkat
                </th>
                <th rowSpan={2} className="p-3 text-center whitespace-nowrap bg-purple-50 text-purple-900">
                  Total Jam
                </th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px]">
                {['Sab', 'Ahd', 'Sen', 'Sel', 'Rab', 'Kam'].map((day) => (
                  <th key={day} className="p-1.5 text-center border-r border-slate-200 w-12 font-mono">
                    {day}
                  </th>
                ))}
                <th className="p-1.5 text-center border-r border-slate-200 w-12 bg-blue-50 font-mono">Ula</th>
                <th className="p-1.5 text-center border-r border-slate-200 w-12 bg-blue-50 font-mono">Wst</th>
                <th className="p-1.5 text-center border-r border-slate-200 w-12 bg-blue-50 font-mono">Uly</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={15} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                    Memuat katalog tenaga pendidik...
                  </td>
                </tr>
              ) : filteredDossier.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-12 text-center text-slate-400">
                    Tidak ditemukan data tenaga pendidik.
                  </td>
                </tr>
              ) : (
                filteredDossier.map((d, idx) => (
                  <tr key={d.nia || idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 text-center text-slate-400 border-r border-slate-100">{idx + 1}</td>
                    <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap border-r border-slate-100">
                      {d.nia}
                    </td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap border-r border-slate-100">
                      {d.nama}
                    </td>
                    <td className="p-3 whitespace-nowrap border-r border-slate-100">
                      <span className="font-semibold text-emerald-800">{d.jah}</span>
                      <span className="text-slate-400 text-[11px] block">{d.domisili}</span>
                    </td>
                    <td className="p-3 border-r border-slate-100 text-slate-600 text-[11px] max-w-xs truncate">
                      {d.fanList}
                    </td>

                    {/* Presensi Jam 1 & 2 per hari */}
                    {(['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'] as const).map((dayKey) => {
                      const p = d.dayPresence[dayKey];
                      const activeCount = (p.j1 ? 1 : 0) + (p.j2 ? 1 : 0);
                      return (
                        <td key={dayKey} className="p-1 text-center font-mono font-bold border-r border-slate-100">
                          {activeCount > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800">
                              {p.j1 && p.j2 ? 'I, II' : p.j1 ? 'I' : 'II'}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Jam Tingkat */}
                    <td className="p-2 text-center font-mono border-r border-slate-100 font-semibold bg-blue-50/40">
                      {d.hoursUla || '-'}
                    </td>
                    <td className="p-2 text-center font-mono border-r border-slate-100 font-semibold bg-blue-50/40">
                      {d.hoursWustho || '-'}
                    </td>
                    <td className="p-2 text-center font-mono border-r border-slate-100 font-semibold bg-blue-50/40">
                      {d.hoursUlya || '-'}
                    </td>

                    {/* Total Jam */}
                    <td className="p-3 text-center font-mono font-bold text-purple-900 bg-purple-50/50 whitespace-nowrap">
                      {d.totalHours} Jam
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
