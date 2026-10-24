'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFanStore } from '@/stores/useFanStore';
import {
  BookMarked,
  RefreshCw,
  Search,
  FileSpreadsheet,
  Printer,
  Sliders,
  UserCheck,
  Grid,
  BookOpen,
  Star,
  X,
  Edit,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ModalPengaturanFan from '@/components/modules/fan/ModalPengaturanFan';
import ModalAturFanMS from '@/components/modules/fan/ModalAturFanMS';

export default function FanPelajaranPage() {
  const {
    fanItems,
    isLoading,
    fetchFanData,
    openModalFan,
    deleteFanItem,
  } = useFanStore();

  const [search, setSearch] = useState('');
  const [switchMode, setSwitchMode] = useState<'semua' | 'reguler' | 'unggulan'>('semua');
  const [showModalFanMS, setShowModalFanMS] = useState(false);

  useEffect(() => {
    fetchFanData();
  }, [fetchFanData]);

  const filteredItems = useMemo(() => {
    return fanItems.filter((f) => {
      const isUg = f.nama.toLowerCase().includes('ug') || f.kitab.toLowerCase().includes('ug');
      if (switchMode === 'reguler' && isUg) return false;
      if (switchMode === 'unggulan' && !isUg) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          f.nama.toLowerCase().includes(q) ||
          f.kitab.toLowerCase().includes(q) ||
          f.tingkat.toLowerCase().includes(q) ||
          (f.grupAsal && f.grupAsal.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [fanItems, switchMode, search]);

  const handleExportExcel = () => {
    const data = filteredItems.map((f, idx) => ({
      NO: idx + 1,
      TINGKAT: f.tingkat,
      KELAS: f.din_kls ? `${f.din_kls} ${f.din_bag || ''}` : '-',
      'NAMA FAN': f.nama,
      'KITAB RUJUKAN': f.kitab,
      'GRUP ASAL': f.grupAsal || '-',
      'TOTAL JAM': f.alokasiJam || 2,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fan_Pelajaran');
    XLSX.writeFile(wb, 'Fan_Pelajaran_Madrasah_Diniyyah.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai fan.html */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <BookMarked className="w-6 h-6 text-madin-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Fan Pelajaran
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Daftar Mata Pelajaran &amp; Konfigurasi Kelas Madin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => openModalFan(null)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-madin-700" />
              <span>Atur Item Fan</span>
            </button>

            <button
              type="button"
              onClick={() => setShowModalFanMS(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-madin-700" />
              <span>Atur Fan MS</span>
            </button>

            <button
              type="button"
              onClick={fetchFanData}
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

        {/* Switch Kategori Fan Pelajaran */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
          <div className="inline-flex rounded-lg border border-madin-700 p-0.5 bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setSwitchMode('semua')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                switchMode === 'semua'
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'text-madin-700 hover:bg-madin-50'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Fan Pelajaran Semua</span>
            </button>

            <button
              type="button"
              onClick={() => setSwitchMode('reguler')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                switchMode === 'reguler'
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'text-madin-700 hover:bg-madin-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Fan Pelajaran Reguler</span>
            </button>

            <button
              type="button"
              onClick={() => setSwitchMode('unggulan')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                switchMode === 'unggulan'
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'text-madin-700 hover:bg-madin-50'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Fan Pelajaran Unggulan</span>
            </button>
          </div>

          <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
            Menampilkan:{' '}
            <b>
              {switchMode === 'semua'
                ? 'Semua Kategori'
                : switchMode === 'reguler'
                ? 'Kategori Reguler'
                : 'Kategori Unggulan'}
            </b>
          </span>
        </div>

        {/* Bar Pencarian */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Fan / Mata Pelajaran / Kitab / Jenjang..."
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
            Total: <b>{filteredItems.length}</b> Fan Pelajaran
          </span>
        </div>
      </div>

      {/* 2. Area Tabel Fan Pelajaran Sesuai fan.html */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm">
        <div className="table-responsive overflow-x-auto">
          <table className="tabel-kbm-resmi w-full">
            <thead>
              <tr>
                <th style={{ width: 45 }}>NO</th>
                <th style={{ width: 85 }}>TINGKAT</th>
                <th style={{ minWidth: 200 }}>NAMA FAN / MAPEL</th>
                <th style={{ minWidth: 220 }}>KITAB RUJUKAN</th>
                <th style={{ width: 100 }}>ALOKASI JAM</th>
                <th style={{ width: 130 }}>GRUP ASAL</th>
                <th style={{ width: 90 }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    Tidak ada mata pelajaran yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((f, idx) => {
                  let badgeClass = 'badge-tingkat-ula';
                  if (f.tingkat === 'WUSTHO') badgeClass = 'badge-tingkat-wustho';
                  else if (f.tingkat === 'ULYA') badgeClass = 'badge-tingkat-ulya';
                  else if (f.tingkat === "ISTI'DAD") badgeClass = 'badge-tingkat-istidad';

                  return (
                    <tr key={f.id} className="hover:bg-slate-50 transition">
                      <td className="text-center font-bold text-slate-600">{idx + 1}</td>
                      <td className="text-center">
                        <span className={badgeClass}>{f.tingkat}</span>
                      </td>
                      <td className="font-bold text-slate-800 px-3">{f.nama}</td>
                      <td className="text-xs text-slate-700 px-3 font-medium">{f.kitab}</td>
                      <td className="text-center font-bold text-madin-700">
                        {f.alokasiJam || 2} Jam/Mgg
                      </td>
                      <td className="text-xs text-slate-600 text-center">{f.grupAsal || '-'}</td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openModalFan(f)}
                            className="p-1 text-slate-500 hover:text-madin-700 hover:bg-slate-100 rounded transition"
                            title="Edit Fan"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus fan pelajaran "${f.nama}"?`)) {
                                deleteFanItem(f.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Hapus Fan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ModalPengaturanFan />
      <ModalAturFanMS
        isOpen={showModalFanMS}
        onClose={() => setShowModalFanMS(false)}
      />
    </div>
  );
}
