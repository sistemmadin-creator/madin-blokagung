'use client';

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useFanStore } from '@/stores/useFanStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import {
  getDaftarKelasUnikDariMaster,
  getDaftarKelasUnggulanUnik,
  toRomanNumeralKls,
  parseFanItemString,
  URUTAN_TINGKAT,
} from '@/lib/utils/fanHelper';
import * as XLSX from 'xlsx';
import ModalPengaturanFan from '@/components/modules/fan/ModalPengaturanFan';
import ModalAturFanMS from '@/components/modules/fan/ModalAturFanMS';
import ModalPilihAsatidzFan from '@/components/modules/fan/ModalPilihAsatidzFan';
import {
  BookMarked,
  Trash2,
  Clock,
  Users,
  Settings,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Search,
  X,
  Grid,
  BookOpen,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';

export default function FanPelajaranPage() {
  const {
    fanConfig,
    fanDetail,
    switchMode,
    keywordCariFan,
    autoSaveStatus,
    isLoading,
    fetchFanData,
    setSwitchMode,
    setKeywordCariFan,
    openModalConfig,
    openModalAturFanMS,
    openModalPilihAsatidz,
    updateJamItem,
    updateKeteranganKelas,
    bulkClearJam,
    bulkClearPengajar,
  } = useFanStore();

  const { formasiList, fetchFormasi } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [isDropdownHapusOpen, setIsDropdownHapusOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFanData();
    if (formasiList.length === 0) fetchFormasi();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchFanData, fetchFormasi, fetchAsatidz, formasiList.length, asatidzList.length]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownHapusOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const listMasterReguler = useMemo(
    () => getDaftarKelasUnikDariMaster(formasiList, asatidzList),
    [formasiList, asatidzList]
  );
  const listMasterUnggulan = useMemo(() => getDaftarKelasUnggulanUnik(formasiList), [formasiList]);

  // Kelompokkan kelas berdasarkan switchMode
  const itemsToRender = useMemo(() => {
    const list: Array<{
      klsNum: string;
      tingkat: string;
      kelasKey: string;
      fallbackKey?: string;
      romawiKls: string;
      isUg: boolean;
      bag?: string;
    }> = [];

    // 1. Reguler
    if (switchMode === 'semua' || switchMode === 'reguler') {
      listMasterReguler.forEach((c) => {
        list.push({
          klsNum: c.kls,
          tingkat: c.tingkat,
          kelasKey: `${c.kls} ${c.tingkat}`,
          romawiKls: toRomanNumeralKls(c.kls),
          isUg: false,
        });
      });
    }

    // 2. Unggulan
    if (switchMode === 'semua' || switchMode === 'unggulan') {
      listMasterUnggulan.forEach((c) => {
        const keyUg = `${c.kls} ${c.tingkat} (Ug)`;
        list.push({
          klsNum: c.kls,
          tingkat: c.tingkat,
          kelasKey: keyUg,
          fallbackKey: `${c.kls} ${c.tingkat}`,
          romawiKls: toRomanNumeralKls(c.kls),
          isUg: true,
        });
      });
    }

    return list;
  }, [switchMode, listMasterReguler, listMasterUnggulan]);

  // Filter pencarian
  const getItemsFanTersaring = useCallback(
    (c: (typeof itemsToRender)[0]) => {
      const semua =
        fanConfig[c.kelasKey] || (c.fallbackKey ? fanConfig[c.fallbackKey] : null) || [];
      const kw = keywordCariFan.toLowerCase().trim();
      if (!kw) return semua;

      const norm = (s: string) => String(s || '').replace(/\s+/g, ' ').toLowerCase();
      const ketKelas = (fanDetail.kelas && fanDetail.kelas[c.kelasKey]?.keterangan) || '';
      const teksKelas = norm(
        `${c.kelasKey} ${c.klsNum} ${c.romawiKls} ${c.tingkat} ${c.isUg ? 'unggulan' : ''} ${ketKelas}`
      );

      if (kw.length >= 3 && teksKelas.includes(kw)) return semua;

      return semua.filter((rawItem) => {
        const itemKey = `${c.kelasKey}||${rawItem}`;
        const det = (fanDetail.item && fanDetail.item[itemKey]) || {};
        const guru = Array.isArray(det.asatidz) ? det.asatidz.join(' ') : '';
        return norm(`${rawItem} ${det.pengajar || ''} ${guru}`).includes(kw);
      });
    },
    [fanConfig, keywordCariFan, fanDetail]
  );

  const filteredItemsToRender = useMemo(() => {
    if (!keywordCariFan) return itemsToRender;
    return itemsToRender.filter((c) => getItemsFanTersaring(c).length > 0);
  }, [itemsToRender, keywordCariFan, getItemsFanTersaring]);

  const totalItemCari = useMemo(() => {
    if (!keywordCariFan) return 0;
    return filteredItemsToRender.reduce((s, c) => s + getItemsFanTersaring(c).length, 0);
  }, [filteredItemsToRender, keywordCariFan, getItemsFanTersaring]);

  // Kelompokkan per Tingkat (ULA -> WUSTHO -> ULYA -> ISTI'DAD)
  const groupedByTingkat = useMemo(() => {
    const groups: Record<string, typeof filteredItemsToRender> = {};
    filteredItemsToRender.forEach((c) => {
      const t = c.tingkat;
      if (!groups[t]) groups[t] = [];
      groups[t].push(c);
    });

    const sortedTingkatKeys = Object.keys(groups).sort(
      (a, b) => (URUTAN_TINGKAT[a] || 99) - (URUTAN_TINGKAT[b] || 99)
    );

    return sortedTingkatKeys.map((tingkat) => ({
      tingkat,
      classes: groups[tingkat],
    }));
  }, [filteredItemsToRender]);

  // Export Excel
  const handleExportExcel = () => {
    if (listMasterReguler.length === 0) {
      alert('Data belum siap untuk diexport!');
      return;
    }

    const rows: (string | number)[][] = [
      ['NO', 'KLS', 'TNK', 'FAN', 'JAM', 'MATA PELAJARAN', 'PENGAJAR', 'JML ASATIDZ', 'KETERANGAN'],
    ];

    const groups: Record<string, typeof listMasterReguler> = {};
    listMasterReguler.forEach((k) => {
      const t = String(k.tingkat || '').trim().toUpperCase();
      if (!groups[t]) groups[t] = [];
      groups[t].push(k);
    });

    Object.keys(groups).forEach((tingkat) => {
      groups[tingkat].forEach((c) => {
        const kelasKey = `${c.kls} ${c.tingkat}`;
        const items = fanConfig[kelasKey] || [];
        const romawiKls = toRomanNumeralKls(c.kls);
        const ketKelas = fanDetail.kelas?.[kelasKey]?.keterangan || '';

        if (items.length === 0) {
          rows.push([1, romawiKls, tingkat, '-', '', 'Belum ada item Fan', '-', '-', ketKelas]);
        } else {
          items.forEach((rawItem, idx) => {
            const parsed = parseFanItemString(rawItem);
            const itemKey = `${kelasKey}||${rawItem}`;
            const itemDetail = fanDetail.item?.[itemKey] || {};
            const jmlGuru = Array.isArray(itemDetail.asatidz) ? itemDetail.asatidz.length : 0;
            rows.push([
              idx + 1,
              romawiKls,
              tingkat,
              parsed.fan,
              itemDetail.jam !== undefined ? itemDetail.jam : '',
              parsed.mapel,
              itemDetail.pengajar || '-',
              jmlGuru > 0 ? `${jmlGuru} Asatidz` : '-',
              idx === 0 ? ketKelas : '',
            ]);
          });
        }
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fan Pelajaran');
    XLSX.writeFile(wb, 'Daftar_Mata_Pelajaran_Kelas_Madin.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleHapusJam = async () => {
    if (
      confirm(
        'Hapus Isi Seluruh Jam?\n\nSeluruh angka Jam Pelajaran di semua Fan dan Kelas akan dikosongkan secara permanen.\nTindakan ini tidak dapat dibatalkan!'
      )
    ) {
      await bulkClearJam();
      setIsDropdownHapusOpen(false);
    }
  };

  const handleHapusPengajar = async () => {
    if (
      confirm(
        'Hapus Isi Seluruh Pengajar?\n\nSeluruh Asatidz Pengajar & Kategori (MS/MB) di semua Fan dan Kelas akan dikosongkan secara permanen.\nTindakan ini tidak dapat dibatalkan!'
      )
    ) {
      await bulkClearPengajar();
      setIsDropdownHapusOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar Card */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <BookMarked className="w-6 h-6 text-emerald-700" />
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
            {/* 1. Dropdown Tombol Hapus Massal */}
            <div className="relative inline-block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownHapusOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {isDropdownHapusOpen && (
                <div className="absolute left-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-20">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-rose-600 tracking-wider flex items-center gap-1 border-b border-slate-100">
                    <AlertCircle className="w-3 h-3 text-rose-500" />
                    <span>PEMBERSIHAN DATA</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleHapusJam}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Hapus Isi Seluruh Jam</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleHapusPengajar}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Hapus Isi Seluruh Pengajar</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Tombol Atur Item Fan */}
            <button
              type="button"
              onClick={openModalConfig}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-xs transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Atur Item Fan</span>
            </button>

            {/* 3. Tombol Atur Fan MS */}
            <button
              type="button"
              onClick={openModalAturFanMS}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-xs transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Atur Fan MS</span>
            </button>

            {/* 4. Tombol Segarkan Data */}
            <button
              type="button"
              onClick={() => {
                fetchFanData();
                fetchFormasi();
                fetchAsatidz();
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>

            {/* 5. Tombol Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            {/* 6. Tombol Cetak / Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Print</span>
            </button>
          </div>
        </div>

        {/* Switch Kategori Fan Pelajaran */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100 shadow-xs">
            <button
              type="button"
              onClick={() => setSwitchMode('semua')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${
                switchMode === 'semua'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Fan Pelajaran Semua</span>
            </button>
            <button
              type="button"
              onClick={() => setSwitchMode('reguler')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${
                switchMode === 'reguler'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Fan Pelajaran Reguler</span>
            </button>
            <button
              type="button"
              onClick={() => setSwitchMode('unggulan')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-md transition-all ${
                switchMode === 'unggulan'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Fan Pelajaran Unggulan</span>
            </button>
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
            Menampilkan:{' '}
            <b className="text-emerald-700">
              {switchMode === 'semua'
                ? 'Semua Kategori'
                : switchMode === 'reguler'
                ? 'Kelas Reguler Saja'
                : 'Kelas Unggulan (Ug) Saja'}
            </b>
          </span>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-3 border-t border-slate-200 mt-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={keywordCariFan}
              onChange={(e) => setKeywordCariFan(e.target.value)}
              placeholder="Cari Kelas / Fan / Mata Pelajaran / Pengajar..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 shadow-xs"
            />
            {keywordCariFan && (
              <button
                type="button"
                onClick={() => setKeywordCariFan('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {keywordCariFan && (
            <span className="text-xs text-slate-500">
              Ditemukan: <b className="text-emerald-600">{totalItemCari}</b> mata pelajaran di{' '}
              <b>{filteredItemsToRender.length}</b> kelas
            </span>
          )}
        </div>
      </div>

      {/* 2. Area Tabel Dokumen Matriks */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm bg-white rounded-xl">
        <div className="text-center mb-4">
          <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-800 m-0">
            DAFTAR MATA PELAJARAN KELAS
          </h3>
          <h4 className="text-xs font-bold text-slate-500 m-0 mt-0.5">
            Madrasah Diniyyah Al Amiriyyah
          </h4>
        </div>

        <div className="overflow-x-auto border border-slate-300 rounded-lg">
          <table className="w-full text-xs border-collapse text-left border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold text-center">
                <th className="py-2 px-2 border-r border-slate-300 w-[42px]">NO</th>
                <th className="py-2 px-2 border-r border-slate-300 w-[60px]">KLS</th>
                <th className="py-2 px-2 border-r border-slate-300 w-[55px]">TNK</th>
                <th className="py-2 px-3 border-r border-slate-300 w-[140px]">FAN</th>
                <th className="py-2 px-2 border-r border-slate-300 w-[70px]">JAM</th>
                <th className="py-2 px-3 border-r border-slate-300">MATA PELAJARAN</th>
                <th className="py-2 px-2 border-r border-slate-300 w-[110px]">PENGAJAR</th>
                <th className="py-2 px-3 border-slate-300 w-[220px]">KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {filteredItemsToRender.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    {keywordCariFan ? (
                      <div>
                        <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                        Tidak ditemukan hasil untuk &quot;<b>{keywordCariFan}</b>&quot;.
                      </div>
                    ) : switchMode === 'unggulan' ? (
                      <div>
                        <Star className="w-6 h-6 mx-auto mb-2 text-amber-400 fill-amber-400" />
                        Belum ada kelas yang dilabeli Unggulan.<br />
                        <span className="italic text-[11px] text-slate-400">
                          Centang opsi Kelas Unggulan pada menu Formasi Kelas untuk menetapkannya.
                        </span>
                      </div>
                    ) : (
                      'Data kelas belum tersedia.'
                    )}
                  </td>
                </tr>
              ) : (
                groupedByTingkat.map(({ tingkat, classes }) => {
                  let totalRowsTingkat = 0;
                  classes.forEach((c) => {
                    const items = getItemsFanTersaring(c);
                    totalRowsTingkat += Math.max(items.length, 1);
                  });

                  let isFirstRowInTingkat = true;

                  return classes.map((c) => {
                    const kelasKey = c.kelasKey;
                    const items = getItemsFanTersaring(c);
                    const totalRowsKelas = Math.max(items.length, 1);
                    const ketKelasVal = fanDetail.kelas?.[kelasKey]?.keterangan || '';

                    if (items.length === 0) {
                      const showTingkatCell = isFirstRowInTingkat;
                      if (isFirstRowInTingkat) isFirstRowInTingkat = false;

                      return (
                        <tr key={kelasKey} className="border-b border-slate-200">
                          <td className="text-center font-bold py-2 px-2 border-r border-slate-200 text-slate-400">
                            1
                          </td>
                          <td className="text-center font-bold py-2 px-2 border-r border-slate-200 bg-slate-50/50">
                            <span className="text-slate-800">{c.romawiKls}</span>
                            {c.isUg && (
                              <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1 rounded">
                                Ug
                              </span>
                            )}
                          </td>
                          {showTingkatCell && (
                            <td
                              rowSpan={totalRowsTingkat}
                              className="text-center font-bold py-2 px-2 border-r border-slate-200 bg-slate-50 text-slate-700 align-middle"
                            >
                              {tingkat}
                            </td>
                          )}
                          <td className="text-center text-slate-300 py-2 px-2 border-r border-slate-200">
                            -
                          </td>
                          <td className="text-center text-slate-300 py-2 px-2 border-r border-slate-200">
                            -
                          </td>
                          <td
                            colSpan={2}
                            className="py-2 px-3 text-center text-slate-400 italic border-r border-slate-200 text-xs"
                          >
                            Belum ada item Fan untuk kelas ini (Atur via tombol &quot;Atur Item Fan&quot;)
                          </td>
                          <td className="p-1.5 align-middle bg-white">
                            <textarea
                              rows={2}
                              value={ketKelasVal}
                              onChange={(e) => updateKeteranganKelas(kelasKey, e.target.value)}
                              placeholder="Catatan / Keterangan..."
                              className="w-full text-xs p-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                            />
                          </td>
                        </tr>
                      );
                    }

                    return items.map((rawItem, idx) => {
                      const parsed = parseFanItemString(rawItem);
                      const itemKey = `${kelasKey}||${rawItem}`;
                      const itemDetail = fanDetail.item?.[itemKey] || {};
                      const jamVal = itemDetail.jam !== undefined ? itemDetail.jam : '';
                      const pengajarVal = itemDetail.pengajar || '';
                      const listGuru = Array.isArray(itemDetail.asatidz) ? itemDetail.asatidz : [];

                      const showTingkatCell = isFirstRowInTingkat;
                      if (isFirstRowInTingkat) isFirstRowInTingkat = false;

                      return (
                        <tr
                          key={itemKey}
                          className="border-b border-slate-200 hover:bg-emerald-50/20 transition-colors"
                        >
                          <td className="text-center font-semibold py-2 px-2 border-r border-slate-200 text-slate-500">
                            {idx + 1}
                          </td>

                          {idx === 0 && (
                            <td
                              rowSpan={totalRowsKelas}
                              className="text-center font-bold py-2 px-2 border-r border-slate-200 bg-slate-50/70 align-middle"
                            >
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-slate-800">{c.romawiKls}</span>
                                {c.isUg && (
                                  <span className="mt-0.5 text-[9px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                    Ug
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {showTingkatCell && (
                            <td
                              rowSpan={totalRowsTingkat}
                              className="text-center font-extrabold py-2 px-2 border-r border-slate-200 bg-slate-100/70 text-slate-800 align-middle tracking-wide"
                            >
                              {tingkat}
                            </td>
                          )}

                          <td className="text-center font-bold text-emerald-700 py-2 px-3 border-r border-slate-200">
                            {parsed.fan}
                          </td>

                          <td className="text-center py-1.5 px-2 border-r border-slate-200">
                            <input
                              type="number"
                              min={0}
                              max={6}
                              value={jamVal}
                              onChange={(e) => updateJamItem(itemKey, e.target.value)}
                              className="w-12 text-center text-xs py-1 px-1 rounded border border-slate-300 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 mx-auto"
                              title="Jam pelajaran per fan (maksimal 6)"
                            />
                          </td>

                          <td className="py-2 px-3 border-r border-slate-200 font-medium text-slate-800">
                            {parsed.mapel}
                          </td>

                          {/* PENGAJAR CELL (Clickable) */}
                          <td
                            onClick={() => openModalPilihAsatidz(itemKey)}
                            className="p-1 border-r border-slate-200 cursor-pointer text-center align-middle"
                            title="Klik untuk memilih & menetapkan Asatidz"
                          >
                            <div className="p-1 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 flex flex-col items-center justify-center min-h-[42px] transition-all">
                              {pengajarVal ? (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    pengajarVal.includes('MS')
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                                  }`}
                                >
                                  {pengajarVal}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  Belum Diatur
                                </span>
                              )}

                              {listGuru.length === 1 ? (
                                <span
                                  className="text-[11px] font-semibold text-slate-800 truncate max-w-[95px] mt-0.5"
                                  title={listGuru[0]}
                                >
                                  {listGuru[0]}
                                </span>
                              ) : listGuru.length > 1 ? (
                                <span
                                  className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-bold px-1.5 py-0.2 rounded mt-0.5"
                                  title={listGuru.join(', ')}
                                >
                                  {listGuru.length} Asatidz
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic mt-0.5">
                                  Pilih Asatidz
                                </span>
                              )}
                            </div>
                          </td>

                          {/* KETERANGAN CELL (Merged vertically per class) */}
                          {idx === 0 && (
                            <td
                              rowSpan={totalRowsKelas}
                              className="p-1.5 align-middle bg-white border-slate-200"
                            >
                              <textarea
                                value={ketKelasVal}
                                onChange={(e) => updateKeteranganKelas(kelasKey, e.target.value)}
                                placeholder="Catatan / Keterangan Kelas..."
                                className="w-full text-xs p-1.5 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
                                style={{ minHeight: '80px', height: '90%' }}
                              />
                            </td>
                          )}
                        </tr>
                      );
                    });
                  });
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & AutoSave status */}
        <div className="flex justify-between items-center mt-3 text-xs flex-wrap gap-2">
          <span className="text-slate-500 italic font-medium">
            *MS (Mustahiq) &bull; MB (Munawib)
          </span>

          <div className="flex items-center gap-1.5">
            {autoSaveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Menyimpan...</span>
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tersimpan otomatis</span>
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Gagal simpan!</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModalPengaturanFan />
      <ModalAturFanMS />
      <ModalPilihAsatidzFan />
    </div>
  );
}
