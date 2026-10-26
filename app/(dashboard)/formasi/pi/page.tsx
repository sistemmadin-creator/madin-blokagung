'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { FormasiWithStats } from '@/types/formasi';
import { getWaliKelasSyncInfo, getSantriInFormasi } from '@/lib/utils/formasiSync';
import { compressImageFile } from '@/lib/utils/image';
import {
  Search,
  Printer,
  FileSpreadsheet,
  Building,
  Camera,
  Star,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ModalInputFormasi from '@/components/modules/formasi/ModalInputFormasi';
import ModalDetailFormasi from '@/components/modules/formasi/ModalDetailFormasi';
import ModalGeneratorFormasi from '@/components/modules/formasi/ModalGeneratorFormasi';
import ModalFotoFormasi from '@/components/modules/formasi/ModalFotoFormasi';
import ModalPengaturanBlokKelas from '@/components/modules/formasi/ModalPengaturanBlokKelas';

export default function FormasiPiPage() {
  const {
    formasiList,
    fetchFormasi,
    openDetailModal,
    openFotoModal,
    openBlokModal,
    quickUploadFoto,
  } = useFormasiStore();

  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [selectedTingkat, setSelectedTingkat] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [uploadTarget, setUploadTarget] = useState<{
    id: string;
    jenis: 'takror' | 'diniyyah';
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    kelasId: string;
    namaKelas: string;
    currentBlok: string;
  } | null>(null);

  const quickFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    fetchFormasi();
    if (santriList.length === 0) fetchSantri();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchFormasi, fetchSantri, fetchAsatidz, santriList.length, asatidzList.length]);

  // Enrich formasi PI with stats & Asatidz sync
  const enrichedList: FormasiWithStats[] = useMemo(() => {
    const listPI = formasiList.filter((f) => f.pa_pi === 'PI');

    return listPI.map((f) => {
      const syncInfo = getWaliKelasSyncInfo(f, asatidzList);
      const matchingSantri = getSantriInFormasi(f, santriList);
      const count = matchingSantri.length;
      const kapasitas = f.kapasitas_maksimal || 80;
      const persentase = Math.round((count / kapasitas) * 100);

      return {
        ...f,
        jumlah_santri: count,
        persentase,
        wali_kelas_text: syncInfo.waliKelasText,
        matched_asatidz: syncInfo.matchedAsatidz,
        domisili_sync: syncInfo.domisili,
        takror_sync: syncInfo.lokasiTakror,
        diniyyah_sync: syncInfo.lokasiDiniyyah,
        foto_takror_sync: syncInfo.fotoTakror,
        foto_diniyyah_sync: syncInfo.fotoDiniyyah,
      };
    });
  }, [formasiList, asatidzList, santriList]);

  // Filtered by Tingkat & Search
  const filteredList = useMemo(() => {
    return enrichedList.filter((f) => {
      if (selectedTingkat && f.tingkat.toUpperCase() !== selectedTingkat.toUpperCase()) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const text = `${f.din_kls} ${f.din_bag} ${f.tingkat} ${f.wali_kelas_text} ${f.domisili_sync || ''} ${f.takror_sync || ''} ${f.diniyyah_sync || ''} ${f.blok || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedList, selectedTingkat, search]);

  // Sorted list: Tingkat -> Din. Kelas -> Din. Bagian
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

      return String(a.din_bag || '').localeCompare(String(b.din_bag || ''));
    });
  }, [filteredList]);

  // Quick photo upload trigger
  const handleTriggerQuickFoto = (
    e: React.MouseEvent,
    id: string,
    jenis: 'takror' | 'diniyyah'
  ) => {
    e.stopPropagation();
    setUploadTarget({ id, jenis });
    if (quickFileInputRef.current) {
      quickFileInputRef.current.value = '';
      quickFileInputRef.current.click();
    }
  };

  const handleQuickFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file berupa gambar (JPG/PNG/WEBP).');
      return;
    }

    setIsUploading(true);
    try {
      const base64 = await compressImageFile(file, 800, 0.75);
      const success = await quickUploadFoto(uploadTarget.id, uploadTarget.jenis, base64);
      if (success) {
        // Refreshed
      }
    } catch (err) {
      alert('Gagal memproses foto: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsUploading(false);
      setUploadTarget(null);
      e.target.value = '';
    }
  };

  const handleLihatFoto = (
    e: React.MouseEvent,
    f: FormasiWithStats,
    jenis: 'takror' | 'diniyyah'
  ) => {
    e.stopPropagation();
    const isTakror = jenis === 'takror';
    const url = isTakror
      ? f.foto_takror_sync || f.foto_takror || ''
      : f.foto_diniyyah_sync || f.foto_diniyyah || '';
    const label = isTakror
      ? `Lokal Takror: ${f.takror_sync || f.lokasi_takror || '-'}`
      : `Lokasi Diniyyah: ${f.diniyyah_sync || f.lokasi_diniyyah || '-'}`;
    const namaKelas = `${f.din_kls || ''} ${f.din_bag || ''} ${f.tingkat || ''}`.trim();

    openFotoModal({
      id: f.id || '',
      jenis,
      url,
      label,
      namaKelas,
    });
  };

  const handleExportExcel = () => {
    if (sortedList.length === 0) {
      alert('Tidak ada data formasi putri untuk diekspor.');
      return;
    }

    const data = sortedList.map((f, idx) => ({
      NO: idx + 1,
      KELAS: `${f.din_kls || ''} ${f.din_bag || ''} ${f.tingkat || ''}`.trim(),
      TINGKAT: f.tingkat || '-',
      DOMISILI: (f.domisili_sync || f.domisili || '-').replace(/^Blok\s+/i, ''),
      MUSTAHIQ: f.wali_kelas_text || '-',
      'LOKAL TAKROR': f.takror_sync || f.lokasi_takror || '-',
      'LOKAL DINIYYAH': f.diniyyah_sync || f.lokasi_diniyyah || '-',
      BLOK: f.blok || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Formasi_Putri');
    XLSX.writeFile(wb, 'Formasi_Kelas_Putri_Madin.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Card Sesuai Gambar 5 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 md:p-5 space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-2xs">
              ♀
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Formasi Kelas Putri
              </h1>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Formasi Ruang Diniyyah dan Takror Khusus Santri Putri (PI)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => openBlokModal('PI')}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-2xs flex items-center gap-2"
            >
              <Building className="w-4 h-4 text-pink-600" />
              <span>Atur Blok Kelas Putri</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-2xs flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white transition shadow-2xs flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Print</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Tingkat Diniyyah:
            </label>
            <select
              value={selectedTingkat}
              onChange={(e) => setSelectedTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-madin-600 font-medium"
            >
              <option value="">Semua Tingkat</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
            </select>
          </div>

          <div className="sm:col-span-6 relative">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Pencarian Cepat:
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Kelas / Nama Mustahiq / Domisili / Lokal..."
                className="w-full text-xs pl-8 pr-8 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="sm:col-span-3 text-right">
            <span className="inline-block px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
              Total: {sortedList.length} Kelas
            </span>
          </div>
        </div>
      </div>

      {/* 2. Kartu Dokumen Resmi & Tabel Header 2-Level Sesuai Gambar 5 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 md:p-6 space-y-4 print:border-none print:shadow-none print:p-0">
        {/* Kop Dokumen Resmi */}
        <div className="text-center space-y-0.5 mb-5">
          <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-wide uppercase m-0">
            FORMASI RUANG DINIYYAH DAN TAKROR PUTRI
          </h2>
          <h3 className="text-xs md:text-sm font-semibold text-slate-700 uppercase m-0">
            MADRASAH DINIYYAH AL AMIRIYYAH
          </h3>
          <h4 className="text-xs font-bold text-[#0f766e] uppercase tracking-wider m-0 pt-0.5">
            TAHUN AJARAN 2026-2027 M / 1447-1448 H
          </h4>
        </div>

        {/* Tabel 2-Level Header Resmi */}
        <div className="table-responsive overflow-x-auto border border-slate-300 rounded-lg print:border-slate-400">
          <table className="w-full text-xs text-left align-middle border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-300 text-center">
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 w-12 align-middle">
                  NO.
                </th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 w-32 align-middle">
                  KELAS
                </th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 w-32 align-middle">
                  DOMISILI
                </th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 min-w-[200px] align-middle">
                  MUSTAHIQ
                </th>
                <th colSpan={2} className="py-1.5 px-3 text-center border-b border-slate-300 font-bold">
                  LOKAL
                </th>
              </tr>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-300 text-center">
                <th className="py-2 px-3 border-r border-slate-300 min-w-[190px]">
                  TAKROR
                </th>
                <th className="py-2 px-3 min-w-[190px]">
                  DINIYYAH
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ada rombel kelas putri yang sesuai dengan filter/pencarian.
                  </td>
                </tr>
              ) : (
                sortedList.map((f, idx) => {
                  const namaKelas = `${f.din_kls || ''} ${f.din_bag || ''} ${f.tingkat || ''}`.trim();
                  const domisiliTeks = (f.domisili_sync || f.domisili || '-').replace(/^Blok\s+/i, '');
                  const blokLabel = f.blok ? `Blok ${f.blok.replace(/^blok\s*/i, '').trim()}` : '';

                  const hasFotoTakror = Boolean(f.foto_takror_sync || f.foto_takror);
                  const hasFotoDiniyyah = Boolean(f.foto_diniyyah_sync || f.foto_diniyyah);

                  return (
                    <tr
                      key={f.id || idx}
                      onClick={() => openDetailModal(f)}
                      onContextMenu={(e) => {
                        if (!f.id) return;
                        e.preventDefault();
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          kelasId: f.id,
                          namaKelas,
                          currentBlok: f.blok || '',
                        });
                      }}
                      className="hover:bg-slate-50 transition cursor-pointer"
                      title="Klik kiri untuk detail kelas, klik kanan untuk pengaturan blok kelas"
                    >
                      {/* NO */}
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-600 border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* KELAS */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        <span className="font-bold text-[#0f766e] text-xs">
                          {namaKelas}
                        </span>
                        {f.is_unggulan && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                              Unggulan
                            </span>
                          </div>
                        )}
                      </td>

                      {/* DOMISILI */}
                      <td className="py-2.5 px-3 text-center text-slate-700 border-r border-slate-200">
                        {domisiliTeks}
                      </td>

                      {/* MUSTAHIQ */}
                      <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">
                        {f.wali_kelas_text || (
                          <span className="text-slate-400 italic font-normal">
                            Belum ditentukan
                          </span>
                        )}
                      </td>

                      {/* LOKAL TAKROR */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-semibold text-slate-800 leading-tight">
                            {f.takror_sync || f.lokasi_takror || '-'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap print:hidden">
                            {blokLabel && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBlokModal('PI', [], f.blok);
                                }}
                                title="Klik untuk mengedit grup blok ini"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-medium transition"
                              >
                                <Building className="w-2.5 h-2.5" />
                                <span>{blokLabel}</span>
                              </button>
                            )}
                            {hasFotoTakror ? (
                              <button
                                type="button"
                                onClick={(e) => handleLihatFoto(e, f, 'takror')}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-medium transition shadow-2xs"
                              >
                                <Camera className="w-2.5 h-2.5 text-madin-700" />
                                <span>Lihat</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => f.id && handleTriggerQuickFoto(e, f.id, 'takror')}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-medium transition shadow-2xs"
                              >
                                <Camera className="w-2.5 h-2.5 text-slate-400" />
                                <span>+Foto</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* LOKASI DINIYYAH */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-semibold text-slate-800 leading-tight">
                            {f.diniyyah_sync || f.lokasi_diniyyah || '-'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap print:hidden">
                            {blokLabel && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openBlokModal('PI', [], f.blok);
                                }}
                                title="Klik untuk mengedit grup blok ini"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-[10px] font-medium transition"
                              >
                                <Building className="w-2.5 h-2.5" />
                                <span>{blokLabel}</span>
                              </button>
                            )}
                            {hasFotoDiniyyah ? (
                              <button
                                type="button"
                                onClick={(e) => handleLihatFoto(e, f, 'diniyyah')}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-medium transition shadow-2xs"
                              >
                                <Camera className="w-2.5 h-2.5 text-madin-700" />
                                <span>Lihat</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => f.id && handleTriggerQuickFoto(e, f.id, 'diniyyah')}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-medium transition shadow-2xs"
                              >
                                <Camera className="w-2.5 h-2.5 text-slate-400" />
                                <span>+Foto</span>
                              </button>
                            )}
                          </div>
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

      {/* Hidden file input for quick photo uploads */}
      <input
        type="file"
        ref={quickFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleQuickFileSelected}
      />

      {/* Loading overlay for quick upload */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3 text-xs font-bold text-slate-700">
            <RefreshCw className="w-4 h-4 text-madin-700 animate-spin" />
            <span>Mengompres &amp; Menyimpan Foto...</span>
          </div>
        </div>
      )}

      {/* Context Menu Klik Kanan Pengaturan Blok */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[210px] text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-700 bg-slate-50">
            Kelas {contextMenu.namaKelas}
          </div>
          {contextMenu.currentBlok ? (
            <button
              type="button"
              onClick={() => {
                openBlokModal('PI', [], contextMenu.currentBlok);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-pink-50 text-slate-700 font-medium flex items-center gap-2"
            >
              <Building className="w-3.5 h-3.5 text-pink-600" />
              <span>Edit Grup &ldquo;{contextMenu.currentBlok}&rdquo;</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                openBlokModal('PI', [contextMenu.kelasId]);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-pink-50 text-slate-700 font-medium flex items-center gap-2"
            >
              <Building className="w-3.5 h-3.5 text-pink-600" />
              <span>Masukkan ke Pengaturan Blok</span>
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      <ModalInputFormasi gender="PI" />
      <ModalDetailFormasi />
      <ModalGeneratorFormasi gender="PI" />
      <ModalFotoFormasi />
      <ModalPengaturanBlokKelas fixedGender="PI" />
    </div>
  );
}
