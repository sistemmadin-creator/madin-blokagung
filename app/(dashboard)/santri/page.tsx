'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Trash2,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Settings,
} from 'lucide-react';
import { exportToExcel, parseExcelFile } from '@/lib/utils/excel';
import ModalInputSantri from '@/components/modules/santri/ModalInputSantri';
import ModalDetailSantri from '@/components/modules/santri/ModalDetailSantri';
import ModalFilterSantri from '@/components/modules/santri/ModalFilterSantri';
import ModalHideColumns from '@/components/modules/santri/ModalHideColumns';
import ModalHierarchyBuilder from '@/components/modules/settings/ModalHierarchyBuilder';
import Dialog from '@/components/ui/Dialog';

function getPaginationNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

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
    setPageSize,
    sortKey,
    sortDirection,
    setSort,
    selectedNoInduk,
    toggleSelectRow,
    toggleSelectAll,
    deleteSelectedSantri,
    deleteAllSantri,
    openInputModal,
    openFilterModal,
    openHideModal,
    openDetailModal,
    saveSantri,
  } = useSantriStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteDropdownRef = useRef<HTMLDivElement>(null);

  const [isHierarchyOpen, setIsHierarchyOpen] = useState(false);
  const [isDeleteDropdownOpen, setIsDeleteDropdownOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // 2-Step Modal State untuk Hapus Semua Data
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deleteAllStep, setDeleteAllStep] = useState<1 | 2>(1);
  const [confirmInputText, setConfirmInputText] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    fetchSantri();
  }, [fetchSantri]);

  // Tutup dropdown Hapus saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        deleteDropdownRef.current &&
        !deleteDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDeleteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Client-side filtering & sorting
  const filteredData = useMemo(() => {
    let result = santriList;

    // 1. Keyword search (nama, no_induk, nisn, kamar, blok, desa)
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

    // 3. Client-side Column Sorting
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[sortKey] ?? '';
        const bVal = (b as unknown as Record<string, unknown>)[sortKey] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [santriList, searchKeyword, filterValues, sortKey, sortDirection]);

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

  // Select all checkbox state
  const isAllSelected =
    paginatedData.length > 0 &&
    paginatedData.every((s) => selectedNoInduk.includes(s.no_induk));
  const isSomeSelected =
    !isAllSelected &&
    paginatedData.some((s) => selectedNoInduk.includes(s.no_induk));

  const handleToggleSelectAll = () => {
    toggleSelectAll(paginatedData.map((s) => s.no_induk));
  };

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
            nik: row.nik ? String(row.nik) : undefined,
            no_kk: row.no_kk ? String(row.no_kk) : undefined,
            nama_ayah: row.nama_ayah ? String(row.nama_ayah) : undefined,
            nik_ayah: row.nik_ayah ? String(row.nik_ayah) : undefined,
            nama_ibu: row.nama_ibu ? String(row.nama_ibu) : undefined,
            nik_ibu: row.nik_ibu ? String(row.nik_ibu) : undefined,
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

  const handleDeleteSelected = async () => {
    setIsDeleteDropdownOpen(false);
    if (selectedNoInduk.length === 0) return;
    if (confirm(`Yakin ingin menghapus ${selectedNoInduk.length} data santri terpilih?`)) {
      await deleteSelectedSantri();
    }
  };

  const handleOpenDeleteAllModal = () => {
    setIsDeleteDropdownOpen(false);
    setDeleteAllStep(1);
    setConfirmInputText('');
    setIsDeleteAllModalOpen(true);
  };

  const handleConfirmDeleteAll = async () => {
    if (confirmInputText !== 'HAPUS SEMUA') return;
    setIsDeletingAll(true);
    const ok = await deleteAllSantri();
    setIsDeletingAll(false);
    if (ok) {
      setIsDeleteAllModalOpen(false);
    }
  };

  const activeFilterCount = Object.keys(filterValues).length;
  const paginationNumbers = getPaginationNumbers(currentPage, totalPages);

  return (
    <div className="space-y-6" data-hydrated={isHydrated}>
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
            type="button"
            onClick={() => setIsHierarchyOpen(true)}
            title="Pengaturan Hierarki Dropdown (Blok > Asrama > Kode > Kamar)"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <Settings className="w-3.5 h-3.5 text-madin-700" />
            <span className="hidden sm:inline">Hierarki Kamar</span>
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

      {/* Bar Kontrol Tabel: Page Size, Bulk Delete, Search, Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Kontrol Sisi Kiri: Tampilkan Data & Dropdown Hapus Bulk */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Tampilkan</span>
            <select
              data-testid="page-size-select"
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-madin-600"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>data</span>
          </div>

          {/* Dropdown Hapus Bulk (Terpilih & Semua) */}
          <div className="relative" ref={deleteDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDeleteDropdownOpen(!isDeleteDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                selectedNoInduk.length > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                Hapus
                {selectedNoInduk.length > 0 && ` (${selectedNoInduk.length})`}
              </span>
              <ChevronDown className="w-3 h-3 ml-0.5" />
            </button>

            {isDeleteDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-30 animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  disabled={selectedNoInduk.length === 0}
                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hapus Terpilih ({selectedNoInduk.length})</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={handleOpenDeleteAllModal}
                  className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 text-rose-600 hover:bg-rose-50 font-semibold transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hapus Semua Data</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Kontrol Sisi Kanan: Search & Filter Lanjutan */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari nama, nomor induk, kamar..."
              className="w-full pl-9 pr-7 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600 focus:border-transparent"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

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
              Filter Lanjutan
              {activeFilterCount > 0 && ` [${activeFilterCount}]`}
            </span>
          </button>

          <button
            onClick={openHideModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            <span>Kolom ({visibleColumns.length}/{SANTRI_COLUMNS.length})</span>
          </button>
        </div>
      </div>

      {/* Tabel Data Santri Lengkap */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10 select-none">
              <tr>
                {/* Checkbox Select All */}
                <th className="p-3 w-10 text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    title="Pilih Semua di Halaman Ini"
                    className="w-4 h-4 rounded text-madin-700 focus:ring-madin-600 cursor-pointer"
                  />
                </th>

                <th className="p-3 w-10 text-center whitespace-nowrap">No</th>

                {/* Kolom-kolom dengan Fitur Click to Sort */}
                {visibleColumns.map((col) => {
                  const isCurrentSort = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => setSort(col.key)}
                      title={`Klik untuk mengurutkan berdasarkan ${col.label}`}
                      className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition"
                    >
                      <div className="flex items-center gap-1.5 group">
                        <span>{col.label}</span>
                        {isCurrentSort ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-madin-700" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-madin-700" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-madin-600" />
                    Sedang memuat data santri dari Supabase...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="p-12 text-center text-slate-400">
                    Tidak ditemukan data santri yang sesuai kriteria filter/pencarian.
                  </td>
                </tr>
              ) : (
                paginatedData.map((s, idx) => {
                  const rowNumber = startIndex + idx + 1;
                  const isSelected = selectedNoInduk.includes(s.no_induk);

                  return (
                    <tr
                      key={s.no_induk || idx}
                      onClick={() => openDetailModal(s)}
                      className={`transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/60 hover:bg-emerald-100/70'
                          : 'hover:bg-slate-50/80'
                      }`}
                      title="Klik baris untuk melihat kartu detail lengkap"
                    >
                      {/* Checkbox Baris */}
                      <td
                        className="p-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(s.no_induk)}
                          className="w-4 h-4 rounded text-madin-700 focus:ring-madin-600 cursor-pointer"
                        />
                      </td>

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

        {/* Footer Paginasi Numerik */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Menampilkan{' '}
            <span className="font-semibold text-slate-800">
              {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + pageSize, totalItems)}
            </span>{' '}
            dari <span className="font-semibold text-slate-800">{totalItems}</span> santri
            {selectedNoInduk.length > 0 && (
              <span className="ml-2 font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {selectedNoInduk.length} terpilih
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* Tombol Sebelumnya */}
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            {/* Nomor-nomor Halaman */}
            {paginationNumbers.map((pNum, index) => {
              if (pNum === '...') {
                return (
                  <span key={`dots-${index}`} className="px-2 py-1 text-slate-400 select-none">
                    ...
                  </span>
                );
              }

              const isCurrent = pNum === currentPage;
              return (
                <button
                  key={`page-${pNum}`}
                  onClick={() => setPage(pNum as number)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                    isCurrent
                      ? 'bg-madin-700 text-white shadow-xs'
                      : 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {pNum}
                </button>
              );
            })}

            {/* Tombol Berikutnya */}
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium text-xs"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2-Step Verification Modal untuk Hapus Semua Data */}
      <Dialog
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        title="Pengosongan Database Santri"
        maxWidth="md"
      >
        <div className="space-y-4">
          {deleteAllStep === 1 ? (
            <div className="space-y-4 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-900">
                    AWAS! Hapus SELURUH Data Santri?
                  </h4>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                    Tindakan ini akan menghapus <strong>seluruh {santriList.length} santri</strong> dari database Supabase secara permanen. Data yang telah dihapus tidak dapat dipulihkan kembali!
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteAllStep(2)}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
                >
                  Lanjut ke Verifikasi (Langkah 2)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                Ketik teks <span className="font-mono font-bold text-rose-600 select-all">HAPUS SEMUA</span> di bawah ini untuk mengonfirmasi pengosongan seluruh database:
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ketik Konfirmasi
                </label>
                <input
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder="HAPUS SEMUA"
                  className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteAllStep(1)}
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
                >
                  Kembali
                </button>

                <button
                  type="button"
                  disabled={confirmInputText !== 'HAPUS SEMUA' || isDeletingAll}
                  onClick={handleConfirmDeleteAll}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingAll ? 'Mengosongkan Database...' : 'Konfirmasi Kosongkan'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Komponen Modal-Modal Santri */}
      <ModalInputSantri />
      <ModalDetailSantri />
      <ModalFilterSantri />
      <ModalHideColumns />
      <ModalHierarchyBuilder
        isOpen={isHierarchyOpen}
        onClose={() => setIsHierarchyOpen(false)}
      />
    </div>
  );
}
