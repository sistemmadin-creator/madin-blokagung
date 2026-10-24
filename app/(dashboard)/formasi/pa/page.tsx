'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { FormasiWithStats } from '@/types/formasi';
import {
  Sparkles,
  Plus,
  Search,
  Printer,
  FileSpreadsheet,
  Table as TableIcon,
  LayoutGrid,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ModalInputFormasi from '@/components/modules/formasi/ModalInputFormasi';
import ModalDetailFormasi from '@/components/modules/formasi/ModalDetailFormasi';
import ModalGeneratorFormasi from '@/components/modules/formasi/ModalGeneratorFormasi';

export default function FormasiPaPage() {
  const { formasiList, fetchFormasi, openInputModal, openGeneratorModal, openDetailModal } = useFormasiStore();
  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [selectedTingkat, setSelectedTingkat] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');

  useEffect(() => {
    fetchFormasi();
    if (santriList.length === 0) fetchSantri();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchFormasi, fetchSantri, fetchAsatidz, santriList.length, asatidzList.length]);

  // Enrich formasi PA with santri counts and wali kelas matching
  const enrichedFormasiList: FormasiWithStats[] = useMemo(() => {
    const listPA = formasiList.filter((f) => f.pa_pi === 'PA');

    return listPA.map((f) => {
      const matchingSantri = santriList.filter(
        (s) =>
          s.pa_pi === 'PA' &&
          String(s.tingkat || '').toUpperCase() === String(f.tingkat).toUpperCase() &&
          String(s.din_kls || '').toUpperCase() === String(f.din_kls).toUpperCase() &&
          String(s.din_bag || '').toUpperCase() === String(f.din_bag).toUpperCase()
      );
      const count = matchingSantri.length;
      const kapasitas = f.kapasitas_maksimal || 45;
      const persentase = Math.round((count / kapasitas) * 100);

      const matchedAsatidz = asatidzList.filter((a) => {
        const jah = String(a.jah_asatidz || '').toUpperCase();
        const validJah = ['MUSTAHIQ', 'MS & KOOR', 'MUSTAHIQOH'];
        if (!validJah.includes(jah)) return false;

        return (
          a.pa_pi === 'PA' &&
          String(a.tingkat_asatidz || '').toUpperCase() === String(f.tingkat).toUpperCase() &&
          String(a.din_kls_asatidz || '').toUpperCase() === String(f.din_kls).toUpperCase() &&
          String(a.din_bag_asatidz || '').toUpperCase() === String(f.din_bag).toUpperCase()
        );
      });

      const waliKelasText =
        matchedAsatidz.length > 0
          ? matchedAsatidz.map((a) => a.nama_asatidz).join(', ')
          : f.id_mustahiq || '-';

      const mustahiqKG = matchedAsatidz.length > 0 ? matchedAsatidz[0].nia || '-' : '-';

      return {
        ...f,
        jumlah_santri: count,
        persentase,
        wali_kelas_text: waliKelasText,
        mustahiq_kg: mustahiqKG,
      } as FormasiWithStats & { mustahiq_kg?: string };
    });
  }, [formasiList, santriList, asatidzList]);

  // Filtered by Tingkat and Search
  const filteredList = useMemo(() => {
    return enrichedFormasiList.filter((f) => {
      if (selectedTingkat && f.tingkat.toUpperCase() !== selectedTingkat.toUpperCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const text = `${f.din_kls} ${f.din_bag} ${f.tingkat} ${f.wali_kelas_text} ${f.domisili || ''} ${f.lokasi_diniyyah || ''} ${f.lokasi_takror || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedFormasiList, selectedTingkat, search]);

  const handleExportExcel = () => {
    const data = filteredList.map((f, idx) => ({
      NO: idx + 1,
      TINGKAT: f.tingkat,
      KELAS: f.din_kls,
      BAGIAN: f.din_bag,
      'DOMISILI ASRAMA': f.domisili || '-',
      'RUANG TAKROR': f.lokasi_takror || '-',
      'RUANG DINIYYAH': f.lokasi_diniyyah || '-',
      'WALI KELAS / MUSTAHIQ': f.wali_kelas_text || '-',
      KAPASITAS: f.kapasitas_maksimal,
      'JUMLAH SANTRI': f.jumlah_santri,
      STATUS: f.jumlah_santri >= f.kapasitas_maksimal ? 'PENUH' : 'TERSEDIA',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formasi_Putra');
    XLSX.writeFile(wb, 'Formasi_Kelas_Putra_Madin.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai madinblokagung-main formasi.html */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-xs">
              ♂
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                  Formasi Kelas Putra
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  PA (Putra)
                </span>
              </div>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Formasi Ruang Diniyyah dan Takror Khusus Santri Putra (PA)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
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

            <button
              type="button"
              onClick={openGeneratorModal}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generator Rombel</span>
            </button>

            <button
              type="button"
              onClick={() => openInputModal(null)}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-sky-700 hover:bg-sky-800 text-white transition shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end mt-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Tingkat Diniyyah:
            </label>
            <select
              value={selectedTingkat}
              onChange={(e) => setSelectedTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none"
            >
              <option value="">Semua Tingkat</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
            </select>
          </div>

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
                placeholder="Cari Kelas / Mustahiq / Domisili / Ruang..."
                className="w-full text-xs pl-8 pr-7 py-2 rounded-lg border border-slate-300 focus:outline-none"
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

          <div className="text-right pb-1">
            <span className="inline-block px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
              Total: {filteredList.length} Kelas
            </span>
          </div>
        </div>
      </div>

      {/* 2. Dokumen Resmi / Tabel / Kartu */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm" id="fg-print-area">
        <div className="text-center mb-4">
          <h5 className="font-bold text-sm md:text-base text-slate-800 uppercase tracking-wide m-0">
            FORMASI KELAS PUTRA (PA) RUANG DINIYYAH DAN TAKROR
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
                  <th style={{ width: 75 }}>TINGKAT</th>
                  <th style={{ width: 60 }}>KELAS</th>
                  <th style={{ width: 45 }}>BAG</th>
                  <th style={{ minWidth: 150 }}>DOMISILI ASRAMA</th>
                  <th style={{ minWidth: 150 }}>RUANG TAKROR</th>
                  <th style={{ minWidth: 150 }}>RUANG DINIYYAH</th>
                  <th style={{ minWidth: 180 }}>WALI KELAS / MUSTAHIQ</th>
                  <th style={{ width: 70 }}>KAPASITAS</th>
                  <th style={{ width: 70 }}>SANTRI</th>
                  <th style={{ width: 75 }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-6 text-slate-400">
                      Tidak ada rombel kelas putra yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((f, idx) => {
                    const isFull = f.jumlah_santri >= f.kapasitas_maksimal;
                    let badgeClass = 'badge-tingkat-ula';
                    if (f.tingkat === 'WUSTHO') badgeClass = 'badge-tingkat-wustho';
                    else if (f.tingkat === 'ULYA') badgeClass = 'badge-tingkat-ulya';
                    else if (f.tingkat === "ISTI'DAD") badgeClass = 'badge-tingkat-istidad';

                    return (
                      <tr
                        key={f.id || `${f.tingkat}-${f.din_kls}-${f.din_bag}`}
                        onClick={() => openDetailModal(f)}
                        className="hover:bg-slate-50 transition cursor-pointer"
                        title="Klik untuk lihat detail rombel"
                      >
                        <td className="text-center font-bold text-slate-600">{idx + 1}</td>
                        <td className="text-center">
                          <span className={badgeClass}>{f.tingkat}</span>
                        </td>
                        <td className="text-center font-bold text-slate-800">{f.din_kls}</td>
                        <td className="text-center font-bold text-slate-800">{f.din_bag}</td>
                        <td className="px-2 text-xs">{f.domisili || '-'}</td>
                        <td className="px-2 text-xs font-semibold text-slate-700">{f.lokasi_takror || '-'}</td>
                        <td className="px-2 text-xs font-semibold text-madin-700">{f.lokasi_diniyyah || '-'}</td>
                        <td className="px-2 font-medium">{f.wali_kelas_text || '-'}</td>
                        <td className="text-center text-xs font-bold text-slate-600">{f.kapasitas_maksimal}</td>
                        <td className="text-center text-xs font-bold text-blue-700">{f.jumlah_santri}</td>
                        <td className="text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFull
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isFull ? 'Penuh' : 'Tersedia'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((f) => (
              <div
                key={f.id || `${f.tingkat}-${f.din_kls}-${f.din_bag}`}
                onClick={() => openDetailModal(f)}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase">{f.tingkat}</span>
                    <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                      Kelas {f.din_kls} - {f.din_bag}
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      f.jumlah_santri >= f.kapasitas_maksimal
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {f.jumlah_santri} / {f.kapasitas_maksimal}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-slate-600">
                  <div><strong>Wali Kelas:</strong> {f.wali_kelas_text}</div>
                  <div><strong>Diniyyah:</strong> {f.lokasi_diniyyah || '-'}</div>
                  <div><strong>Takror:</strong> {f.lokasi_takror || '-'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ModalInputFormasi gender="PA" />
      <ModalDetailFormasi />
      <ModalGeneratorFormasi gender="PA" />
    </div>
  );
}
