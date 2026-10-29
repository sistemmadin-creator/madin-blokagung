'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { FormasiWithStats } from '@/types/formasi';
import { getWaliKelasSyncInfo, getSantriInFormasi } from '@/lib/utils/formasiSync';
import {
  Plus,
  Sparkles,
  Filter,
  EyeOff,
  Trash2,
  Edit,
  Search,
  Star,
  ChevronDown,
  Building,
  FolderTree,
} from 'lucide-react';
import ModalInputFormasi from '@/components/modules/formasi/ModalInputFormasi';
import ModalDetailFormasi from '@/components/modules/formasi/ModalDetailFormasi';
import ModalGeneratorFormasi from '@/components/modules/formasi/ModalGeneratorFormasi';
import ModalFilterFormasi from '@/components/modules/formasi/ModalFilterFormasi';
import ModalHideFormasi from '@/components/modules/formasi/ModalHideFormasi';
import ModalFotoFormasi from '@/components/modules/formasi/ModalFotoFormasi';
import ModalHierarkiBlokKBM from '@/components/modules/formasi/ModalHierarkiBlokKBM';

export default function FormasiMasterPage() {
  const {
    formasiList,
    fetchFormasi,
    openInputModal,
    openGeneratorModal,
    openDetailModal,
    openFilterModal,
    openHideModal,
    openFotoModal,
    openBlokModal,
    isHierarkiModalOpen,
    hierarkiModalDefaultCategory,
    openHierarkiModal,
    closeHierarkiModal,
    deleteFormasi,
    bulkDeleteFormasi,
    hiddenColumns,
    customFilters,
    isFilterModalOpen,
    closeFilterModal,
    isHideModalOpen,
    closeHideModal,
  } = useFormasiStore();

  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isBulkDropdownOpen, setIsBulkDropdownOpen] = useState(false);

  useEffect(() => {
    fetchFormasi();
    if (santriList.length === 0) fetchSantri();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchFormasi, fetchSantri, fetchAsatidz, santriList.length, asatidzList.length]);

  // Enrich formasi with stats, Wali Kelas, and Santri count
  const enrichedList: FormasiWithStats[] = useMemo(() => {
    return formasiList.map((f) => {
      const syncInfo = getWaliKelasSyncInfo(f, asatidzList);
      const matchingSantri = getSantriInFormasi(f, santriList);
      const count = matchingSantri.length;
      const kapasitas = f.kapasitas_maksimal || 80;
      const persentase = Math.round((count / kapasitas) * 100);

      const mustahiqKG = syncInfo.matchedAsatidz[0]?.nia || '-';

      return {
        ...f,
        jumlah_santri: count,
        persentase,
        wali_kelas_text: syncInfo.waliKelasText,
        mustahiq_kg: mustahiqKG,
        matched_asatidz: syncInfo.matchedAsatidz,
        domisili_sync: syncInfo.domisili,
        takror_sync: syncInfo.lokasiTakror,
        diniyyah_sync: syncInfo.lokasiDiniyyah,
        blok_takror_sync: syncInfo.blokTakror,
        blok_diniyyah_sync: syncInfo.blokDiniyyah,
        foto_takror_sync: syncInfo.fotoTakror,
        foto_diniyyah_sync: syncInfo.fotoDiniyyah,
      };
    });
  }, [formasiList, asatidzList, santriList]);

  // Filtered by Search & Custom Filters
  const filteredList = useMemo(() => {
    return enrichedList.filter((f) => {
      // 1. Custom filters
      if (customFilters.tingkat && f.tingkat.toUpperCase() !== customFilters.tingkat.toUpperCase()) {
        return false;
      }
      if (customFilters.pa_pi && f.pa_pi.toUpperCase() !== customFilters.pa_pi.toUpperCase()) {
        return false;
      }
      if (customFilters.wali_kelas) {
        const wk = (f.wali_kelas_text || '').toLowerCase();
        if (!wk.includes(customFilters.wali_kelas.toLowerCase())) return false;
      }
      if (customFilters.domisili) {
        const dom = (f.domisili_sync || f.domisili || '').toLowerCase();
        if (!dom.includes(customFilters.domisili.toLowerCase())) return false;
      }
      if (customFilters.blok) {
        const blk = (f.blok_diniyyah || f.blok_diniyyah_sync || f.blok_takror || f.blok_takror_sync || '').toLowerCase();
        if (!blk.includes(customFilters.blok.toLowerCase())) return false;
      }

      // 2. Keyword Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const text = `${f.din_kls} ${f.din_bag} ${f.tingkat} ${f.pa_pi} ${f.wali_kelas_text} ${f.domisili_sync || ''} ${f.blok_takror || f.blok_takror_sync || ''} ${f.takror_sync || ''} ${f.blok_diniyyah || f.blok_diniyyah_sync || ''} ${f.diniyyah_sync || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [enrichedList, search, customFilters]);

  // Sorting: Tingkat -> Din. Kelas -> Din. Bagian -> Gender
  const sortedList = useMemo(() => {
    const tingkatRank: Record<string, number> = {
      "ISTI'DAD": 1,
      ULA: 2,
      WUSTHO: 3,
      ULYA: 4,
    };

    return [...filteredList].sort((a, b) => {
      const rA = tingkatRank[(a.tingkat || '').toUpperCase()] || 99;
      const rB = tingkatRank[(b.tingkat || '').toUpperCase()] || 99;
      if (rA !== rB) return rA - rB;

      const kA = parseInt(a.din_kls, 10) || 0;
      const kB = parseInt(b.din_kls, 10) || 0;
      if (kA !== kB) return kA - kB;

      const bagCompare = String(a.din_bag || '').localeCompare(String(b.din_bag || ''));
      if (bagCompare !== 0) return bagCompare;

      return String(a.pa_pi || '').localeCompare(String(b.pa_pi || ''));
    });
  }, [filteredList]);

  // Pagination
  const totalPages = Math.ceil(sortedList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedList.slice(start, start + pageSize);
  }, [sortedList, currentPage, pageSize]);

  // Checkbox handlers
  const isAllSelected =
    paginatedList.length > 0 &&
    paginatedList.every((item) => item.id && selectedIds.includes(item.id));

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const pageIds = paginatedList.map((f) => f.id).filter(Boolean) as string[];
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = paginatedList.map((f) => f.id).filter(Boolean) as string[];
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    setIsBulkDropdownOpen(false);
    if (selectedIds.length === 0) {
      alert('Centang minimal satu data formasi!');
      return;
    }
    const success = await bulkDeleteFormasi(selectedIds);
    if (success) {
      setSelectedIds([]);
    }
  };

  const isColHidden = (colId: number) => hiddenColumns.includes(colId);

  return (
    <div className="space-y-4">
      {/* 1. Header Sesuai madinblokagung-main Gambar 3 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
            Formasi Kelas Madin
          </h1>
          <p className="text-slate-500 text-xs m-0 mt-1">
            Manajemen ruang kelas, wali kelas, dan kapasitas santri berdasarkan database ter-normalisasi.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/formasi/pa"
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-sky-600 text-sky-700 bg-white hover:bg-sky-50 transition shadow-2xs flex items-center gap-1.5"
          >
            <span>♂</span>
            <span>Kelas Putra</span>
          </Link>

          <Link
            href="/formasi/pi"
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-rose-500 text-rose-700 bg-white hover:bg-rose-50 transition shadow-2xs flex items-center gap-1.5"
          >
            <span>♀</span>
            <span>Kelas Putri</span>
          </Link>

          <button
            type="button"
            onClick={() => openHierarkiModal('diniyyah')}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition shadow-2xs flex items-center gap-1.5"
            title="Kelola Hierarki Blok KBM (Diniyyah & Takror)"
          >
            <FolderTree className="w-3.5 h-3.5 text-[#0f766e]" />
            <span>Hierarki Blok KBM</span>
          </button>

          <button
            type="button"
            onClick={() => openInputModal(null)}
            title="Tambah Formasi Kelas Baru"
            className="p-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition flex items-center justify-center"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => openGeneratorModal()}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generator</span>
          </button>
        </div>
      </div>

      {/* 2. Card Panel & Toolbar DataTables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
        {/* DataTables Control Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Show Entries */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2.5 rounded-md border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          {/* Action Group: Bulk Delete, Sembunyikan, Filter, Search */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Dropdown Hapus Terpilih */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsBulkDropdownOpen((prev) => !prev)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {isBulkDropdownOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="w-full text-left px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Terpilih ({selectedIds.length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sembunyikan Kolom Modal */}
            <button
              type="button"
              onClick={openHideModal}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Sembunyikan</span>
              {hiddenColumns.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold">
                  {hiddenColumns.length}
                </span>
              )}
            </button>

            {/* Filter Modal */}
            <button
              type="button"
              onClick={openFilterModal}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-sky-300 text-sky-700 hover:bg-sky-50 transition flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5 text-sky-600" />
              <span>Filter</span>
              {Object.keys(customFilters).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-sky-200 text-sky-800 text-[10px] font-bold">
                  {Object.keys(customFilters).length}
                </span>
              )}
            </button>

            {/* Live Search */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 hidden sm:inline">Cari Kelas:</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Ketik pencarian..."
                  className="w-40 sm:w-52 text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Master Table */}
        <div className="table-responsive overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left align-middle">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="py-2.5 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-madin-700"
                  />
                </th>
                {!isColHidden(1) && <th className="py-2.5 px-3">Tingkat</th>}
                {!isColHidden(2) && <th className="py-2.5 px-3">Kelas</th>}
                {!isColHidden(3) && <th className="py-2.5 px-3">Bagian</th>}
                {!isColHidden(4) && <th className="py-2.5 px-3 text-center">Gender</th>}
                {!isColHidden(5) && <th className="py-2.5 px-3 text-center">Kapasitas</th>}
                {!isColHidden(6) && <th className="py-2.5 px-3">Wali Kelas</th>}
                {!isColHidden(7) && <th className="py-2.5 px-3">Domisili</th>}
                {!isColHidden(8) && <th className="py-2.5 px-3">Blok Takror</th>}
                {!isColHidden(9) && <th className="py-2.5 px-3">Lokal Takror</th>}
                {!isColHidden(10) && <th className="py-2.5 px-3">Blok Diniyyah</th>}
                {!isColHidden(11) && <th className="py-2.5 px-3">Lokasi Diniyyah</th>}
                <th className="py-2.5 px-3 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    Tidak ada data formasi kelas yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedList.map((f) => {
                  const isChecked = f.id ? selectedIds.includes(f.id) : false;
                  const isFull = f.jumlah_santri >= (f.kapasitas_maksimal || 80);
                  const namaKelas = `${f.din_kls} ${f.din_bag} ${f.tingkat}`;

                  return (
                    <tr
                      key={f.id || `${f.tingkat}-${f.din_kls}-${f.din_bag}-${f.pa_pi}`}
                      onClick={() => openDetailModal(f)}
                      className="hover:bg-slate-50 transition cursor-pointer"
                      title="Klik baris untuk melihat detail rombel & santri"
                    >
                      {/* Checkbox */}
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => f.id && handleSelectRow(f.id)}
                          className="rounded border-slate-300 text-madin-700"
                        />
                      </td>

                      {/* 1. Tingkat */}
                      {!isColHidden(1) && (
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {f.tingkat}
                        </td>
                      )}

                      {/* 2. Kelas */}
                      {!isColHidden(2) && (
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {f.din_kls}
                        </td>
                      )}

                      {/* 3. Bagian */}
                      {!isColHidden(3) && (
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          <span className="flex items-center gap-1">
                            <span>{f.din_bag}</span>
                            {f.is_unggulan && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                Unggulan
                              </span>
                            )}
                          </span>
                        </td>
                      )}

                      {/* 4. Gender */}
                      {!isColHidden(4) && (
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`font-bold ${
                              f.pa_pi === 'PA' ? 'text-sky-700' : 'text-rose-600'
                            }`}
                          >
                            {f.pa_pi}
                          </span>
                        </td>
                      )}

                      {/* 5. Kapasitas */}
                      {!isColHidden(5) && (
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFull
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {f.jumlah_santri} / {f.kapasitas_maksimal || 80} Santri
                          </span>
                        </td>
                      )}

                      {/* 6. Wali Kelas */}
                      {!isColHidden(6) && (
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800 flex items-center gap-1 flex-wrap">
                            <span>{f.wali_kelas_text || '-'}</span>
                            {f.mustahiq_kg && f.mustahiq_kg !== '-' && (
                              <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-mono border border-slate-200">
                                {f.mustahiq_kg}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 7. Domisili */}
                      {!isColHidden(7) && (
                        <td className="py-2.5 px-3 text-slate-600">
                          {f.domisili_sync || f.domisili || '-'}
                        </td>
                      )}

                      {/* 8. Blok Takror */}
                      {!isColHidden(8) && (
                        <td
                          className="py-2.5 px-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(f.blok_takror || f.blok_takror_sync) && (f.blok_takror || f.blok_takror_sync) !== '-' ? (
                            <button
                              type="button"
                              onClick={() => openHierarkiModal('takror')}
                              title="Kelola Hierarki Blok Takror"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold transition"
                            >
                              <Building className="w-2.5 h-2.5 text-amber-700" />
                              <span>{f.blok_takror || f.blok_takror_sync}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openHierarkiModal('takror')}
                              title="Buka Hierarki Blok Takror"
                              className="text-slate-400 hover:text-slate-600 text-[11px] font-medium transition"
                            >
                              -
                            </button>
                          )}
                        </td>
                      )}

                      {/* 9. Lokal Takror */}
                      {!isColHidden(9) && (
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {(f.foto_takror_sync || f.foto_takror) && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={f.foto_takror_sync || f.foto_takror}
                                alt="Takror"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openFotoModal({
                                    id: f.id || '',
                                    jenis: 'takror',
                                    url: f.foto_takror_sync || f.foto_takror || '',
                                    label: `Lokal Takror: ${f.takror_sync || f.lokasi_takror || '-'}`,
                                    namaKelas,
                                  });
                                }}
                                className="w-7 h-7 rounded object-cover border border-slate-200 cursor-zoom-in flex-shrink-0"
                              />
                            )}
                            <span className="text-slate-700">
                              {f.takror_sync || f.lokasi_takror || '-'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* 10. Blok Diniyyah */}
                      {!isColHidden(10) && (
                        <td
                          className="py-2.5 px-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(f.blok_diniyyah || f.blok_diniyyah_sync) && (f.blok_diniyyah || f.blok_diniyyah_sync) !== '-' ? (
                            <button
                              type="button"
                              onClick={() => openHierarkiModal('diniyyah')}
                              title="Kelola Hierarki Blok Diniyyah"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold transition"
                            >
                              <Building className="w-2.5 h-2.5 text-emerald-700" />
                              <span>{f.blok_diniyyah || f.blok_diniyyah_sync}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openHierarkiModal('diniyyah')}
                              title="Buka Hierarki Blok Diniyyah"
                              className="text-slate-400 hover:text-slate-600 text-[11px] font-medium transition"
                            >
                              -
                            </button>
                          )}
                        </td>
                      )}

                      {/* 11. Lokasi Diniyyah */}
                      {!isColHidden(11) && (
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {(f.foto_diniyyah_sync || f.foto_diniyyah) && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={f.foto_diniyyah_sync || f.foto_diniyyah}
                                alt="Diniyyah"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openFotoModal({
                                    id: f.id || '',
                                    jenis: 'diniyyah',
                                    url: f.foto_diniyyah_sync || f.foto_diniyyah || '',
                                    label: `Lokasi Diniyyah: ${f.diniyyah_sync || f.lokasi_diniyyah || '-'}`,
                                    namaKelas,
                                  });
                                }}
                                className="w-7 h-7 rounded object-cover border border-slate-200 cursor-zoom-in flex-shrink-0"
                              />
                            )}
                            <span className="text-slate-700">
                              {f.diniyyah_sync || f.lokasi_diniyyah || '-'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* 11. Aksi */}
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openInputModal(f)}
                            className="p-1 rounded text-amber-600 hover:bg-amber-50 transition"
                            title="Edit Formasi"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => f.id && deleteFormasi(f.id)}
                            className="p-1 rounded text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus Formasi"
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

        {/* 4. Pagination & Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pt-1">
          <div>
            Menampilkan{' '}
            {paginatedList.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} sampai{' '}
            {Math.min(currentPage * pageSize, sortedList.length)} dari {sortedList.length}{' '}
            kelas {search || Object.keys(customFilters).length > 0 ? '(difilter)' : ''}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="px-2 font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModalInputFormasi />
      <ModalDetailFormasi />
      <ModalGeneratorFormasi />
      <ModalFilterFormasi isOpen={isFilterModalOpen} onClose={closeFilterModal} />
      <ModalHideFormasi isOpen={isHideModalOpen} onClose={closeHideModal} />
      <ModalFotoFormasi />
      <ModalHierarkiBlokKBM
        isOpen={isHierarkiModalOpen}
        onClose={closeHierarkiModal}
        defaultCategory={hierarkiModalDefaultCategory}
      />
    </div>
  );
}
