'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { Asatidz } from '@/types/asatidz';
import {
  UserCheck,
  Filter,
  UserPlus,
  Download,
  Upload,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { exportToExcel, parseExcelFile } from '@/lib/utils/excel';
import ModalInputAsatidz from '@/components/modules/asatidz/ModalInputAsatidz';
import ModalDetailAsatidz from '@/components/modules/asatidz/ModalDetailAsatidz';
import ModalFilterAsatidz from '@/components/modules/asatidz/ModalFilterAsatidz';

export default function AsatidzPage() {
  const {
    asatidzList,
    isLoading,
    fetchAsatidz,
    searchKeyword,
    setSearchKeyword,
    filterValues,
    page,
    pageSize,
    setPage,
    openInputModal,
    openFilterModal,
    openDetailModal,
    saveAsatidz,
  } = useAsatidzStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAsatidz();
  }, [fetchAsatidz]);

  // Client-side filtering
  const filteredData = useMemo(() => {
    let result = asatidzList;

    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      result = result.filter(
        (a) =>
          (a.nama_asatidz && a.nama_asatidz.toLowerCase().includes(q)) ||
          (a.nia && a.nia.toLowerCase().includes(q)) ||
          (a.nis && a.nis.toLowerCase().includes(q)) ||
          (a.kamar && a.kamar.toLowerCase().includes(q)) ||
          (a.blok && a.blok.toLowerCase().includes(q)) ||
          (a.jah_asatidz && a.jah_asatidz.toLowerCase().includes(q))
      );
    }

    const filterKeys = Object.keys(filterValues);
    if (filterKeys.length > 0) {
      result = result.filter((a) => {
        return filterKeys.every((key) => {
          const expected = filterValues[key];
          if (!expected) return true;
          const actual = String((a as unknown as Record<string, unknown>)[key] || '').trim();
          return actual.toLowerCase() === expected.toLowerCase();
        });
      });
    }

    return result;
  }, [asatidzList, searchKeyword, filterValues]);

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const handleExport = () => {
    exportToExcel(filteredData, 'Data_Dewan_Asatidz_Madin_Blokagung');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseExcelFile(file);
      if (!Array.isArray(rows) || rows.length === 0) {
        alert('File Excel kosong atau format tidak sesuai.');
        return;
      }

      let successCount = 0;
      for (const row of rows) {
        if (row.nia && row.nama_asatidz) {
          const asatidzObj: Asatidz = {
            nia: String(row.nia),
            nama_asatidz: String(row.nama_asatidz).toUpperCase(),
            pa_pi: row.pa_pi === 'PI' ? 'PI' : 'PA',
            nis: row.nis ? String(row.nis) : undefined,
            jah_asatidz: row.jah_asatidz,
            tempat_lahir: row.tempat_lahir,
            tgl_lahir: row.tgl_lahir ? String(row.tgl_lahir) : undefined,
            bln_lahir: row.bln_lahir ? String(row.bln_lahir) : undefined,
            thn_lahir: row.thn_lahir ? String(row.thn_lahir) : undefined,
            blok: row.blok,
            asrama: row.asrama,
            kode: row.kode,
            kamar: row.kamar,
            tingkat_asatidz: row.tingkat_asatidz,
            din_kls_asatidz: row.din_kls_asatidz ? String(row.din_kls_asatidz) : undefined,
            din_bag_asatidz: row.din_bag_asatidz,
            lokasi_diniyyah: row.lokasi_diniyyah,
            lokasi_takror: row.lokasi_takror,
            desa: row.desa,
            kecamatan: row.kecamatan,
            kabupaten: row.kabupaten,
            provinsi: row.provinsi,
          };
          await saveAsatidz(asatidzObj, false);
          successCount++;
        }
      }
      alert(`Berhasil mengimpor ${successCount} data asatidz dari Excel!`);
      fetchAsatidz();
    } catch (err: unknown) {
      alert('Gagal mengimpor file: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activeFilterCount = Object.keys(filterValues).length;

  return (
    <div className="space-y-6">
      {/* Header Halaman Asatidz */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-xs">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Data Dewan Asatidz</h1>
            <p className="text-xs text-slate-500">
              Direktori Tenaga Pendidik & Pengajar Madrasah Diniyyah ({asatidzList.length} asatidz)
            </p>
          </div>
        </div>

        {/* Tombol Aksi Cepat */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAsatidz}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls"
            onChange={handleImportExcel}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => openInputModal(null)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Asatidz</span>
          </button>
        </div>
      </div>

      {/* Bar Pencarian & Tombol Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Cari nama asatidz, NIA, NIS, kamar, Jah..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openFilterModal}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition ${
              activeFilterCount > 0
                ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>
              Filter (PA/PI, Kelas, Blok, Jah)
              {activeFilterCount > 0 && ` [${activeFilterCount}]`}
            </span>
          </button>
        </div>
      </div>

      {/* Tabel Data Asatidz */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10 select-none">
              <tr>
                <th className="p-3 w-10 text-center whitespace-nowrap">No</th>
                <th className="p-3 whitespace-nowrap">NIA</th>
                <th className="p-3 whitespace-nowrap">NIS</th>
                <th className="p-3 whitespace-nowrap">Gender</th>
                <th className="p-3 whitespace-nowrap">Nama Lengkap Asatidz</th>
                <th className="p-3 whitespace-nowrap">Amanah / Jah</th>
                <th className="p-3 whitespace-nowrap">Domisili Kamar</th>
                <th className="p-3 whitespace-nowrap">Tugas Mengajar</th>
                <th className="p-3 whitespace-nowrap">Lokasi KBM</th>
                <th className="p-3 whitespace-nowrap">Alamat Asal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Sedang memuat direktori asatidz dari Supabase...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    Tidak ditemukan data asatidz yang cocok dengan pencarian/filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((a, idx) => {
                  const rowNumber = startIndex + idx + 1;
                  return (
                    <tr
                      key={a.nia || idx}
                      onClick={() => openDetailModal(a)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      title="Klik untuk melihat profil lengkap"
                    >
                      <td className="p-3 text-center text-slate-400">{rowNumber}</td>
                      <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                        {a.nia}
                      </td>
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                        {a.nis || '-'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            a.pa_pi === 'PA'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {a.pa_pi}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                        {a.nama_asatidz}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {a.jah_asatidz ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {a.jah_asatidz}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {a.blok ? `Blok ${a.blok} (${a.kamar || '-'})` : '-'}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {a.tingkat_asatidz ? `${a.tingkat_asatidz} ${a.din_kls_asatidz || ''}${a.din_bag_asatidz || ''}` : '-'}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {a.lokasi_diniyyah || '-'}
                      </td>
                      <td className="p-3 text-slate-600 whitespace-nowrap">
                        {a.kabupaten || a.desa || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Paginasi */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Menampilkan{' '}
            <span className="font-semibold text-slate-800">
              {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + pageSize, totalItems)}
            </span>{' '}
            dari <span className="font-semibold text-slate-800">{totalItems}</span> asatidz
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <span className="px-3 py-1 text-slate-500 font-medium">
              Hal {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Komponen Modal-Modal Asatidz */}
      <ModalInputAsatidz />
      <ModalDetailAsatidz />
      <ModalFilterAsatidz />
    </div>
  );
}
