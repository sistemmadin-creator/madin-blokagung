'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useSantriStore } from '@/stores/useSantriStore';
import { SANTRI_COLUMNS, Santri } from '@/types/santri';
import {
  Users,
  Filter,
  EyeOff,
  UserPlus,
  Download,
  Upload,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { exportToExcel, parseExcelFile } from '@/lib/utils/excel';
import ModalInputSantri from '@/components/modules/santri/ModalInputSantri';
import ModalDetailSantri from '@/components/modules/santri/ModalDetailSantri';
import ModalFilterSantri from '@/components/modules/santri/ModalFilterSantri';
import ModalHideColumns from '@/components/modules/santri/ModalHideColumns';

export default function SantriPage() {
  const {
    santriList,
    isLoading,
    fetchSantri,
    searchKeyword,
    setSearchKeyword,
    filterValues,
    hiddenColumns,
    page,
    pageSize,
    setPage,
    openInputModal,
    openFilterModal,
    openHideModal,
    openDetailModal,
    saveSantri,
  } = useSantriStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSantri();
  }, [fetchSantri]);

  // Client-side filtering across search keyword and multi-token filters
  const filteredData = useMemo(() => {
    let result = santriList;

    // 1. Keyword search (name, no_induk, nisn, kamar, etc)
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      result = result.filter(
        (s) =>
          (s.nama && s.nama.toLowerCase().includes(q)) ||
          (s.no_induk && s.no_induk.toLowerCase().includes(q)) ||
          (s.kamar && s.kamar.toLowerCase().includes(q)) ||
          (s.blok && s.blok.toLowerCase().includes(q)) ||
          (s.desa && s.desa.toLowerCase().includes(q))
      );
    }

    // 2. Token filter categories
    const filterKeys = Object.keys(filterValues);
    if (filterKeys.length > 0) {
      result = result.filter((s) => {
        return filterKeys.every((key) => {
          const expected = filterValues[key];
          if (!expected) return true;
          const actual = String((s as unknown as Record<string, unknown>)[key] || '').trim();
          return actual.toLowerCase() === expected.toLowerCase();
        });
      });
    }

    return result;
  }, [santriList, searchKeyword, filterValues]);

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Active columns
  const visibleColumns = SANTRI_COLUMNS.filter(
    (col) => !hiddenColumns.includes(col.key as string)
  );

  const handleExport = () => {
    exportToExcel(filteredData, 'Data_Santri_Madin_Blokagung');
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
        if (row.no_induk && row.nama) {
          const santriObj: Santri = {
            no_induk: String(row.no_induk),
            nama: String(row.nama).toUpperCase(),
            pa_pi: row.pa_pi === 'PI' ? 'PI' : 'PA',
            no_biro: row.no_biro ? String(row.no_biro) : undefined,
            nisn: row.nisn ? String(row.nisn) : undefined,
            tempat_lahir: row.tempat_lahir,
            tgl_lahir: row.tgl_lahir ? String(row.tgl_lahir) : undefined,
            bln_lahir: row.bln_lahir ? String(row.bln_lahir) : undefined,
            thn_lahir: row.thn_lahir ? String(row.thn_lahir) : undefined,
            blok: row.blok,
            asrama: row.asrama,
            kode: row.kode,
            kamar: row.kamar,
            tingkat: row.tingkat,
            din_kls: row.din_kls ? String(row.din_kls) : undefined,
            din_bag: row.din_bag,
            unit: row.unit,
            jurusan: row.jurusan,
            semester: row.semester ? String(row.semester) : undefined,
            kelas: row.kelas ? String(row.kelas) : undefined,
            bag: row.bag,
            desa: row.desa,
            kecamatan: row.kecamatan,
            kabupaten: row.kabupaten,
            provinsi: row.provinsi,
            telepon: row.telepon ? String(row.telepon) : undefined,
          };
          await saveSantri(santriObj, false);
          successCount++;
        }
      }
      alert(`Berhasil mengimpor ${successCount} data santri dari file Excel!`);
      fetchSantri();
    } catch (err: unknown) {
      alert('Gagal mengimpor file: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activeFilterCount = Object.keys(filterValues).length;

  return (
    <div className="space-y-6">
      {/* Header Halaman Sesuai madinblokagung-main */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-madin-50 text-madin-700 flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Database Santri</h1>
            <p className="text-xs text-slate-500">
              Total {santriList.length} santri terdaftar di Madrasah Diniyyah Al Amiriyyah
            </p>
          </div>
        </div>

        {/* Tombol Aksi Cepat */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchSantri}
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
            <span>Impor Excel</span>
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
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white transition shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Santri</span>
          </button>
        </div>
      </div>

      {/* Bar Pencarian & Tombol Filter Token */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Cari nama, nomor induk, kamar, alamat..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600 focus:border-transparent"
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

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={openFilterModal}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition ${
              activeFilterCount > 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-madin-600" />
            <span>
              Filter Lanjutan (16 Kategori)
              {activeFilterCount > 0 && ` [${activeFilterCount}]`}
            </span>
          </button>

          <button
            onClick={openHideModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            <span>Kolom ({visibleColumns.length}/34)</span>
          </button>
        </div>
      </div>

      {/* Tabel Data Santri Lengkap */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10 select-none">
              <tr>
                <th className="p-3 w-10 text-center whitespace-nowrap">No</th>
                {visibleColumns.map((col) => (
                  <th key={col.key} className="p-3 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-madin-600" />
                    Sedang memuat data santri dari Supabase...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-12 text-center text-slate-400">
                    Tidak ditemukan data santri yang sesuai kriteria filter/pencarian.
                  </td>
                </tr>
              ) : (
                paginatedData.map((s, idx) => {
                  const rowNumber = startIndex + idx + 1;
                  return (
                    <tr
                      key={s.no_induk || idx}
                      onClick={() => openDetailModal(s)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                      title="Klik baris untuk melihat kartu detail lengkap"
                    >
                      <td className="p-3 text-center text-slate-400">{rowNumber}</td>
                      {visibleColumns.map((col) => {
                        const val = s[col.key];

                        if (col.key === 'pa_pi') {
                          return (
                            <td key={col.key} className="p-3 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  val === 'PA'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-pink-50 text-pink-700 border border-pink-200'
                                }`}
                              >
                                {val}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === 'no_induk') {
                          return (
                            <td key={col.key} className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                              {val}
                            </td>
                          );
                        }

                        if (col.key === 'nama') {
                          return (
                            <td key={col.key} className="p-3 font-semibold text-slate-800 whitespace-nowrap">
                              {val}
                            </td>
                          );
                        }

                        return (
                          <td key={col.key} className="p-3 text-slate-600 whitespace-nowrap">
                            {val || '-'}
                          </td>
                        );
                      })}
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
            dari <span className="font-semibold text-slate-800">{totalItems}</span> santri
            {searchKeyword && ` (disaring dari total ${santriList.length})`}
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

      {/* Komponen Modal-Modal Santri */}
      <ModalInputSantri />
      <ModalDetailSantri />
      <ModalFilterSantri />
      <ModalHideColumns />
    </div>
  );
}
