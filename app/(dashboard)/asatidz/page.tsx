'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
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
  ChevronDown,
  Trash2,
  EyeOff,
  User,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react';
import { exportToExcel } from '@/lib/utils/excel';
import ModalInputAsatidz from '@/components/modules/asatidz/ModalInputAsatidz';
import ModalDetailAsatidz from '@/components/modules/asatidz/ModalDetailAsatidz';
import ModalFilterAsatidz from '@/components/modules/asatidz/ModalFilterAsatidz';
import ModalHideColumnsAsatidz from '@/components/modules/asatidz/ModalHideColumnsAsatidz';
import ModalImportExcelAsatidz from '@/components/modules/asatidz/ModalImportExcelAsatidz';
import ModalFotoZoomAsatidz from '@/components/modules/asatidz/ModalFotoZoomAsatidz';
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

export default function AsatidzPage() {
  const {
    asatidzList,
    isLoading,
    fetchAsatidz,
    searchKeyword,
    setSearchKeyword,
    filterValues,
    selectedNiaList,
    hiddenColumns,
    page,
    pageSize,
    sortKey,
    sortDirection,
    setPage,
    setPageSize,
    setSort,
    toggleSelectRow,
    toggleSelectAll,
    deleteSelectedAsatidz,
    openInputModal,
    openFilterModal,
    openDetailModal,
    openImportModal,
    openHideModal,
    openFotoZoom,
  } = useAsatidzStore();

  const [isDeleteDropdownOpen, setIsDeleteDropdownOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const deleteDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAsatidz();
  }, [fetchAsatidz]);

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
    let result = asatidzList;

    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      result = result.filter(
        (a) =>
          (a.nama_asatidz && a.nama_asatidz.toLowerCase().includes(q)) ||
          (a.nia && a.nia.toLowerCase().includes(q)) ||
          (a.nis && a.nis.toLowerCase().includes(q)) ||
          (a.kamar && a.kamar.toLowerCase().includes(q)) ||
          (a.asrama && a.asrama.toLowerCase().includes(q)) ||
          (a.blok && a.blok.toLowerCase().includes(q)) ||
          (a.desa && a.desa.toLowerCase().includes(q)) ||
          (a.kabupaten && a.kabupaten.toLowerCase().includes(q)) ||
          (a.jah_asatidz && a.jah_asatidz.toLowerCase().includes(q)) ||
          (a.lokasi_diniyyah && a.lokasi_diniyyah.toLowerCase().includes(q)) ||
          (a.lokasi_takror && a.lokasi_takror.toLowerCase().includes(q))
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

    // Sorting
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let aVal = (a as unknown as Record<string, unknown>)[sortKey] ?? '';
        let bVal = (b as unknown as Record<string, unknown>)[sortKey] ?? '';

        // Khusus kelas diniyyah gabungan
        if (sortKey === 'kelas_diniyyah') {
          aVal = `${a.din_kls_asatidz || ''}${a.din_bag_asatidz || ''} ${a.tingkat_asatidz || ''}`;
          bVal = `${b.din_kls_asatidz || ''}${b.din_bag_asatidz || ''} ${b.tingkat_asatidz || ''}`;
        }

        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [asatidzList, searchKeyword, filterValues, sortKey, sortDirection]);

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const paginatedNiaKeys = paginatedData.map((a) => a.nia);
  const isAllPaginatedSelected =
    paginatedData.length > 0 &&
    paginatedNiaKeys.every((nia) => selectedNiaList.includes(nia));

  const handleExport = () => {
    const exportRows = filteredData.map((a, idx) => ({
      No: idx + 1,
      NIS: a.nis || '-',
      NIA: a.nia,
      'Nama Lengkap': a.nama_asatidz,
      'PA/PI': a.pa_pi,
      Tingkat: a.tingkat_asatidz || '-',
      'Din. Kls': a.din_kls_asatidz || '-',
      'Din. Bag': a.din_bag_asatidz || '-',
      Jah: a.jah_asatidz || '-',
      'Lokasi Diniyyah': a.lokasi_diniyyah || '-',
      'Lokasi Takror': a.lokasi_takror || '-',
      'Tempat Lahir': a.tempat_lahir || '-',
      'Tgl Lahir': `${a.tgl_lahir || ''}-${a.bln_lahir || ''}-${a.thn_lahir || ''}`,
      Blok: a.blok || '-',
      Asrama: a.asrama || '-',
      Kode: a.kode || '-',
      Kamar: a.kamar || '-',
      Dusun: a.dusun || '-',
      Desa: a.desa || '-',
      Kecamatan: a.kecamatan || '-',
      Kabupaten: a.kabupaten || '-',
      Provinsi: a.provinsi || '-',
    }));
    exportToExcel(exportRows, 'Database_Dewan_Asatidz_Madin_Blokagung');
  };

  const handleTriggerBulkDelete = () => {
    if (selectedNiaList.length === 0) {
      alert('Centang minimal satu data Asatidz terlebih dahulu!');
      return;
    }
    setIsDeleteDropdownOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    setIsDeletingBulk(true);
    await deleteSelectedAsatidz();
    setIsDeletingBulk(false);
    setIsDeleteConfirmOpen(false);
  };

  const activeFilterCount = Object.keys(filterValues).length;

  const renderSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-emerald-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-600" />
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Utama Halaman Asatidz */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 shadow-2xs text-emerald-700 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 m-0">Database Asatidz</h1>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Manajemen data tenaga pengajar (Asatidz) Madrasah Diniyyah ({asatidzList.length} asatidz)
            </p>
          </div>
        </div>

        {/* Tombol Aksi Cepat Header */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchAsatidz}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>

          <button
            type="button"
            onClick={openImportModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => openInputModal(null)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white transition shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Asatidz</span>
          </button>
        </div>
      </div>

      {/* 2. Bar Kontrol Tabel (Sesuai Gambar 2: Tampilkan Data, Hapus Dropdown, Sembunyikan, Filter, dan Pencarian) */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Kontrol Sisi Kiri: Page Size, Hapus, Sembunyikan, Filter */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Tampilkan X data */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Tampilkan</span>
            <select
              data-testid="page-size-select"
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="py-1 px-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-700 cursor-pointer"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>data</span>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Tombol Hapus Dropdown */}
          <div className="relative" ref={deleteDropdownRef}>
            <button
              type="button"
              onClick={() => setIsDeleteDropdownOpen(!isDeleteDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
              {selectedNiaList.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px]">
                  {selectedNiaList.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
            </button>

            {isDeleteDropdownOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={handleTriggerBulkDelete}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    Hapus Terpilih {selectedNiaList.length > 0 ? `(${selectedNiaList.length})` : ''}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Tombol Sembunyikan Kolom */}
          <button
            type="button"
            onClick={openHideModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            <span>Sembunyikan</span>
          </button>

          {/* Tombol Filter */}
          <button
            type="button"
            onClick={openFilterModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition ${
              activeFilterCount > 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Kontrol Sisi Kanan: Input Pencarian */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Pencarian: Nama, NIA, NIS, Kamar, Jah..."
            className="w-full pl-9 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-800 placeholder:text-slate-400"
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={() => setSearchKeyword('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 3. Tabel Data Asatidz Komprehensif (14 Kolom Mirip Gambar 2) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-semibold z-10 select-none">
              <tr>
                {/* Checkbox Header */}
                <th className="p-3 w-10 text-center whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={isAllPaginatedSelected}
                    onChange={() => toggleSelectAll(paginatedNiaKeys)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                </th>

                {/* NO */}
                {!hiddenColumns.includes('no') && (
                  <th className="p-3 w-10 text-center whitespace-nowrap">NO</th>
                )}

                {/* FOTO */}
                {!hiddenColumns.includes('foto') && (
                  <th className="p-3 w-14 text-center whitespace-nowrap">FOTO</th>
                )}

                {/* NIS */}
                {!hiddenColumns.includes('nis') && (
                  <th className="p-3 text-center whitespace-nowrap">NIS</th>
                )}

                {/* NIA */}
                {!hiddenColumns.includes('nia') && (
                  <th
                    onClick={() => setSort('nia')}
                    className="p-3 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>NIA</span>
                      {renderSortIcon('nia')}
                    </div>
                  </th>
                )}

                {/* PA/PI */}
                {!hiddenColumns.includes('pa_pi') && (
                  <th className="p-3 text-center whitespace-nowrap">PA/PI</th>
                )}

                {/* KELAS DINIYYAH */}
                {!hiddenColumns.includes('kelas_diniyyah') && (
                  <th
                    onClick={() => setSort('kelas_diniyyah')}
                    className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>KELAS DINIYYAH</span>
                      {renderSortIcon('kelas_diniyyah')}
                    </div>
                  </th>
                )}

                {/* BLOK */}
                {!hiddenColumns.includes('blok') && (
                  <th
                    onClick={() => setSort('blok')}
                    className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>BLOK</span>
                      {renderSortIcon('blok')}
                    </div>
                  </th>
                )}

                {/* NAMA ASATIDZ */}
                {!hiddenColumns.includes('nama_asatidz') && (
                  <th
                    onClick={() => setSort('nama_asatidz')}
                    className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>NAMA ASATIDZ</span>
                      {renderSortIcon('nama_asatidz')}
                    </div>
                  </th>
                )}

                {/* JAH */}
                {!hiddenColumns.includes('jah_asatidz') && (
                  <th
                    onClick={() => setSort('jah_asatidz')}
                    className="p-3 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition group"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>JAH</span>
                      {renderSortIcon('jah_asatidz')}
                    </div>
                  </th>
                )}

                {/* LOKASI DINIYYAH */}
                {!hiddenColumns.includes('lokasi_diniyyah') && (
                  <th
                    onClick={() => setSort('lokasi_diniyyah')}
                    className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>LOKASI DINIYYAH</span>
                      {renderSortIcon('lokasi_diniyyah')}
                    </div>
                  </th>
                )}

                {/* LOKASI TAKROR */}
                {!hiddenColumns.includes('lokasi_takror') && (
                  <th className="p-3 whitespace-nowrap">LOKASI TAKROR</th>
                )}

                {/* TTL */}
                {!hiddenColumns.includes('ttl') && (
                  <th className="p-3 whitespace-nowrap">TTL</th>
                )}

                {/* PENEMPATAN KAMAR */}
                {!hiddenColumns.includes('penempatan_kamar') && (
                  <th className="p-3 whitespace-nowrap">PENEMPATAN KAMAR</th>
                )}

                {/* ALAMAT ASAL (Opsional via Hide Columns) */}
                {!hiddenColumns.includes('alamat_asal') && (
                  <th className="p-3 whitespace-nowrap">ALAMAT ASAL</th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={15} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Sedang memuat direktori asatidz dari database Supabase...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-12 text-center text-slate-400">
                    Data Asatidz tidak ditemukan atau tidak cocok dengan filter/pencarian.
                  </td>
                </tr>
              ) : (
                paginatedData.map((a, idx) => {
                  const rowNumber = startIndex + idx + 1;
                  const isChecked = selectedNiaList.includes(a.nia);
                  const isMustahiq = /mustahiq/i.test(a.jah_asatidz || '');
                  const kelasStr = `${a.din_kls_asatidz || ''}${a.din_bag_asatidz || ''} ${a.tingkat_asatidz || ''}`.trim();
                  const ttlStr = `${a.tempat_lahir || '-'}, ${a.tgl_lahir || ''} ${a.bln_lahir || ''} ${a.thn_lahir || ''}`.trim();
                  const kamarStr = `${a.blok || '-'} - ${a.asrama || '-'} - ${a.kode || '-'} - ${a.kamar || '-'}`;

                  return (
                    <tr
                      key={a.nia || idx}
                      onClick={() => openDetailModal(a)}
                      className={`hover:bg-slate-50/90 transition cursor-pointer ${
                        isChecked ? 'bg-emerald-50/40' : ''
                      }`}
                      title="Klik baris untuk melihat rincian & santri binaan"
                    >
                      {/* Checkbox Baris */}
                      <td
                        className="p-3 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(a.nia)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* NO */}
                      {!hiddenColumns.includes('no') && (
                        <td className="p-3 text-center text-slate-400 whitespace-nowrap">
                          {rowNumber}
                        </td>
                      )}

                      {/* FOTO THUMBNAIL (Klik Zoom) */}
                      {!hiddenColumns.includes('foto') && (
                        <td
                          className="p-3 text-center whitespace-nowrap"
                          onClick={(e) => {
                            if (a.foto_asatidz) {
                              e.stopPropagation();
                              openFotoZoom(a.foto_asatidz, a.nama_asatidz, a.nia);
                            }
                          }}
                        >
                          {a.foto_asatidz ? (
                            <img
                              src={a.foto_asatidz}
                              alt={a.nama_asatidz}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs mx-auto hover:scale-110 transition cursor-zoom-in"
                              title="Klik untuk memperbesar foto profil"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                      )}

                      {/* NIS */}
                      {!hiddenColumns.includes('nis') && (
                        <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
                          {a.nis || '-'}
                        </td>
                      )}

                      {/* NIA */}
                      {!hiddenColumns.includes('nia') && (
                        <td className="p-3 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                          {a.nia}
                        </td>
                      )}

                      {/* PA/PI */}
                      {!hiddenColumns.includes('pa_pi') && (
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              a.pa_pi === 'PA'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-pink-50 text-pink-700 border-pink-200'
                            }`}
                          >
                            {a.pa_pi}
                          </span>
                        </td>
                      )}

                      {/* KELAS DINIYYAH (Badge Hijau Rounded Pill Khas Gambar 2) */}
                      {!hiddenColumns.includes('kelas_diniyyah') && (
                        <td className="p-3 whitespace-nowrap">
                          {kelasStr ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-700 text-white shadow-2xs">
                              {kelasStr}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}

                      {/* BLOK */}
                      {!hiddenColumns.includes('blok') && (
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {a.blok || '-'}
                        </td>
                      )}

                      {/* NAMA ASATIDZ */}
                      {!hiddenColumns.includes('nama_asatidz') && (
                        <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                          {a.nama_asatidz}
                        </td>
                      )}

                      {/* JAH */}
                      {!hiddenColumns.includes('jah_asatidz') && (
                        <td className="p-3 text-center whitespace-nowrap">
                          {a.jah_asatidz ? (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${
                                isMustahiq
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {a.jah_asatidz}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}

                      {/* LOKASI DINIYYAH */}
                      {!hiddenColumns.includes('lokasi_diniyyah') && (
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {a.lokasi_diniyyah || '-'}
                        </td>
                      )}

                      {/* LOKASI TAKROR */}
                      {!hiddenColumns.includes('lokasi_takror') && (
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {a.lokasi_takror || '-'}
                        </td>
                      )}

                      {/* TTL */}
                      {!hiddenColumns.includes('ttl') && (
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {ttlStr || '-'}
                        </td>
                      )}

                      {/* PENEMPATAN KAMAR */}
                      {!hiddenColumns.includes('penempatan_kamar') && (
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {kamarStr}
                        </td>
                      )}

                      {/* ALAMAT ASAL */}
                      {!hiddenColumns.includes('alamat_asal') && (
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {a.kabupaten || a.desa || '-'}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Footer Paginasi */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            Menampilkan{' '}
            <span className="font-semibold text-slate-800">
              {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + pageSize, totalItems)}
            </span>{' '}
            dari <span className="font-semibold text-slate-800">{totalItems}</span> asatidz
            {selectedNiaList.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {selectedNiaList.length} asatidz dicentang
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {getPaginationNumbers(currentPage, totalPages).map((pNum, pIdx) => {
                if (pNum === '...') {
                  return (
                    <span key={`dots-${pIdx}`} className="px-2 py-1 text-slate-400">
                      ...
                    </span>
                  );
                }
                const isActive = pNum === currentPage;
                return (
                  <button
                    key={`p-${pNum}`}
                    type="button"
                    onClick={() => setPage(pNum as number)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
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

      {/* 5. Dialog Konfirmasi Hapus Massal */}
      <Dialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => !isDeletingBulk && setIsDeleteConfirmOpen(false)}
        title="Konfirmasi Hapus Data Terpilih"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-900">
                Peringatan: Tindakan ini permanen
              </h4>
              <p className="text-xs text-rose-700 leading-relaxed">
                Anda akan menghapus sebanyak <strong>{selectedNiaList.length} data asatidz</strong> dari database. Data yang dihapus tidak dapat dikembalikan lagi.
              </p>
            </div>
          </div>

          <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeletingBulk}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isDeletingBulk}
              onClick={handleConfirmBulkDelete}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeletingBulk ? 'Menghapus...' : 'Ya, Hapus Terpilih'}</span>
            </button>
          </div>
        </div>
      </Dialog>

      {/* 6. Seluruh Modal Asatidz */}
      <ModalInputAsatidz />
      <ModalDetailAsatidz />
      <ModalFilterAsatidz />
      <ModalHideColumnsAsatidz />
      <ModalImportExcelAsatidz />
      <ModalFotoZoomAsatidz />
    </div>
  );
}
