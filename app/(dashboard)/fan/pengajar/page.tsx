'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { exportToExcel } from '@/lib/utils/excel';
import {
  Users,
  Search,
  RefreshCw,
  Printer,
  Download,
  RotateCcw,
} from 'lucide-react';
import Dialog from '@/components/ui/Dialog';

export default function PengajarFanPage() {
  const { fanItems, pengajarMap, fetchFanData, setPengajarFan, isLoading: loadingFan } = useFanStore();
  const { asatidzList, fetchAsatidz, isLoading: loadingAsatidz } = useAsatidzStore();
  const { jadwalMap, fetchJadwal } = useJadwalStore();

  const [search, setSearch] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');
  const [filterJah, setFilterJah] = useState('');

  // Modal Atur Fan Asatidz
  const [editingAsatidz, setEditingAsatidz] = useState<string | null>(null);
  const [selectedFansForAsatidz, setSelectedFansForAsatidz] = useState<string[]>([]);

  useEffect(() => {
    fetchFanData();
    fetchJadwal();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchFanData, fetchJadwal, fetchAsatidz, asatidzList.length]);

  // Distinct Jah list
  const jahOptions = useMemo(() => {
    const s = new Set<string>();
    asatidzList.forEach((a) => {
      if (a.jah_asatidz) s.add(a.jah_asatidz);
    });
    return Array.from(s).sort();
  }, [asatidzList]);

  // Aggregate fans taught by each asatidz from both manual pengajarMap and schedule records
  const asatidzFanData = useMemo(() => {
    return asatidzList.map((a) => {
      const namaUpper = a.nama_asatidz.toUpperCase();

      // Find from jadwal
      const scheduledFans = new Set<string>();
      const teacherSchedule = Object.values(jadwalMap).find(
        (j) => j.nama_asatidz.toUpperCase() === namaUpper
      );

      if (teacherSchedule) {
        (['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'] as const).forEach((d) => {
          const val = teacherSchedule[d];
          if (val) {
            val.split(';;').forEach((entry) => {
              const parts = entry.split('|').map((s) => s.trim());
              const fanName = parts[2] || '';
              const klsName = parts[1] || '';
              if (fanName) scheduledFans.add(`${fanName}${klsName ? ` (${klsName})` : ''}`);
            });
          }
        });
      }

      // Also merge any assigned from pengajarMap
      Object.entries(pengajarMap).forEach(([fanName, teachers]) => {
        if (teachers.some((t) => t.toUpperCase() === namaUpper)) {
          scheduledFans.add(fanName);
        }
      });

      const fanList = Array.from(scheduledFans);

      return {
        nia: a.nia || '-',
        nama: a.nama_asatidz,
        asal: a.kabupaten || a.blok || '-',
        jah: a.jah_asatidz || '-',
        tingkat: a.tingkat_asatidz || '',
        fans: fanList,
        totalFan: fanList.length,
      };
    });
  }, [asatidzList, jadwalMap, pengajarMap]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return asatidzFanData.filter((row) => {
      if (filterTingkat && row.tingkat.toUpperCase() !== filterTingkat.toUpperCase()) {
        return false;
      }
      if (filterJah && row.jah !== filterJah) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = `${row.nia} ${row.nama} ${row.asal} ${row.jah} ${row.fans.join(' ')}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [asatidzFanData, filterTingkat, filterJah, search]);

  const handleExport = () => {
    const data = filteredRows.map((r, idx) => ({
      No: idx + 1,
      KODE: r.nia,
      NAMA: r.nama,
      ASAL: r.asal,
      JAH: r.jah,
      'MENGAJAR FAN': r.fans.join(', '),
      'JUMLAH FAN': r.totalFan,
    }));
    exportToExcel(data, 'Daftar_Pengajar_Fan_Pelajaran');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenEditFan = (nama: string) => {
    setEditingAsatidz(nama);
    const assigned: string[] = [];
    Object.entries(pengajarMap).forEach(([fanName, teachers]) => {
      if (teachers.some((t) => t.toUpperCase() === nama.toUpperCase())) {
        assigned.push(fanName);
      }
    });
    setSelectedFansForAsatidz(assigned);
  };

  const handleToggleFan = (fanName: string) => {
    if (selectedFansForAsatidz.includes(fanName)) {
      setSelectedFansForAsatidz(selectedFansForAsatidz.filter((f) => f !== fanName));
    } else {
      setSelectedFansForAsatidz([...selectedFansForAsatidz, fanName]);
    }
  };

  const handleSaveFanAssignment = async () => {
    if (!editingAsatidz) return;

    // Update each fanItem
    for (const item of fanItems) {
      const isSelected = selectedFansForAsatidz.includes(item.nama);
      const currentTeachers = pengajarMap[item.nama] || [];
      const hasTeacher = currentTeachers.some((t) => t.toUpperCase() === editingAsatidz.toUpperCase());

      if (isSelected && !hasTeacher) {
        await setPengajarFan(item.nama, [...currentTeachers, editingAsatidz]);
      } else if (!isSelected && hasTeacher) {
        await setPengajarFan(
          item.nama,
          currentTeachers.filter((t) => t.toUpperCase() !== editingAsatidz.toUpperCase())
        );
      }
    }

    setEditingAsatidz(null);
  };

  const totalFilled = asatidzFanData.filter((r) => r.totalFan > 0).length;
  const persentase = asatidzFanData.length > 0 ? Math.round((totalFilled / asatidzFanData.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header Halaman (Identik dengan #page-pengajar-fan pada fan.html) */}
      <div className="card-panel border-0 bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs text-emerald-700 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 m-0">Pengajar Fan</h1>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Rekapitulasi Fan Mata Pelajaran yang Diajarkan oleh Masing-Masing Asatidz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                fetchFanData();
                fetchJadwal();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFan || loadingAsatidz ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white shadow-xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Cetak Dokumen</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 pt-3 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Kode / Nama / Fan / Jah..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
            >
              <option value="">Semua Tingkat</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={filterJah}
              onChange={(e) => setFilterJah(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
            >
              <option value="">Semua Jah</option>
              {jahOptions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center justify-end gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilterTingkat('');
                setFilterJah('');
              }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <span className="badge bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2.5 py-1 rounded-lg font-semibold">
              {filteredRows.length} Asatidz
            </span>
            <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-lg font-semibold">
              Terisi: {persentase}%
            </span>
          </div>
        </div>
      </div>

      {/* Area Tabel Resmi Dokumen Cetak */}
      <div className="card-panel border-0 bg-white p-4 rounded-xl border border-slate-200 shadow-xs print:p-0 print:border-none print:shadow-none">
        <div className="text-center mb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide m-0">
            DAFTAR PENGAJAR FAN MATA PELAJARAN
          </h2>
          <h3 className="text-xs font-semibold text-slate-500 m-0 mt-0.5">
            MADRASAH DINIYYAH AL AMIRIYYAH
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="tabel-kbm-resmi w-full text-xs">
            <thead>
              <tr>
                <th style={{ width: '60px' }} className="text-center">KODE</th>
                <th style={{ minWidth: '180px' }}>NAMA ASATIDZ</th>
                <th style={{ width: '80px' }} className="text-center">ASAL</th>
                <th style={{ width: '70px' }} className="text-center">JAH</th>
                <th>MENGAJAR FAN</th>
                <th style={{ width: '60px' }} className="text-center">JML</th>
                <th style={{ width: '70px' }} className="text-center print:hidden">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Tidak ada data pengajar fan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="text-center font-mono font-semibold text-slate-700">{row.nia}</td>
                    <td className="font-bold text-slate-900">{row.nama}</td>
                    <td className="text-center text-slate-600">{row.asal}</td>
                    <td className="text-center font-semibold text-slate-700">{row.jah}</td>
                    <td>
                      {row.fans.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.fans.map((f, fIdx) => (
                            <span
                              key={fIdx}
                              className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-semibold"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">- Belum Diatur -</span>
                      )}
                    </td>
                    <td className="text-center font-bold text-emerald-700">{row.totalFan}</td>
                    <td className="text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => handleOpenEditFan(row.nama)}
                        className="px-2 py-1 text-[11px] font-bold rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 transition"
                      >
                        Atur
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog Atur Fan Asatidz */}
      <Dialog
        isOpen={!!editingAsatidz}
        onClose={() => setEditingAsatidz(null)}
        title={`Atur Fan: ${editingAsatidz || ''}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Pilih mata pelajaran fan yang diampu oleh <b>{editingAsatidz}</b>:
          </p>
          <div className="max-h-72 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
            {fanItems.map((f) => {
              const isChecked = selectedFansForAsatidz.includes(f.nama);
              return (
                <label
                  key={f.id}
                  onClick={() => handleToggleFan(f.nama)}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer text-xs font-semibold border transition ${
                    isChecked
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <span className="font-bold">{f.nama}</span>
                    {f.kitab && <span className="text-[11px] text-slate-500 ml-1.5">({f.kitab})</span>}
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    readOnly
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setEditingAsatidz(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveFanAssignment}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white"
            >
              Simpan Penugasan
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
