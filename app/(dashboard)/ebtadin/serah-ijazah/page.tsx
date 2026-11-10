'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Search,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Check,
  Clock,
  Users,
  Calendar,
  Edit2,
  X,
  UserCheck,
  CalendarDays,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEbtadinStore } from '@/stores/useEbtadinStore';
import { useSerahIjazahStore } from '@/stores/useSerahIjazahStore';
import { EbtadinSerahIjazah } from '@/types/ebtadin';

export default function SerahIjazahPage() {
  const { tahunList, activeTahun, formasiList, fetchTahunList, setActiveTahun } = useEbtadinStore();
  const {
    records,
    isLoading,
    filterTingkat,
    filterKelas,
    filterStatus,
    searchKeyword,
    fetchRecords,
    toggleMenerima,
    updateDetailSerah,
    batchSetKelasMenerima,
    batchSetKelasMenerimaWithDate,
    setFilterTingkat,
    setFilterKelas,
    setFilterStatus,
    setSearchKeyword,
  } = useSerahIjazahStore();

  // State untuk modal edit tanggal & penerima satuan
  const [selectedSantri, setSelectedSantri] = useState<EbtadinSerahIjazah | null>(null);
  const [editTanggal, setEditTanggal] = useState<string>('');
  const [editPenerimaTipe, setEditPenerimaTipe] = useState<'santri' | 'wali' | 'lainnya'>('santri');
  const [editPenerimaNama, setEditPenerimaNama] = useState<string>('');
  const [editCatatan, setEditCatatan] = useState<string>('');

  // State untuk modal serah terima massal per rombel
  const [batchModalFormasi, setBatchModalFormasi] = useState<{ id: string; name: string } | null>(null);
  const [batchTanggal, setBatchTanggal] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchTahunList();
  }, [fetchTahunList]);

  useEffect(() => {
    if (activeTahun?.id) {
      fetchRecords(activeTahun.id);
    }
  }, [activeTahun?.id, fetchRecords]);

  // Saat santri dipilih untuk diedit, isi form
  useEffect(() => {
    if (selectedSantri) {
      const defaultDate = selectedSantri.tanggal_serah
        ? new Date(selectedSantri.tanggal_serah).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      setEditTanggal(defaultDate);
      setEditPenerimaNama(selectedSantri.penerima_nama || selectedSantri.nama_santri);
      setEditCatatan(selectedSantri.catatan || '');
      setEditPenerimaTipe(
        selectedSantri.penerima_nama && selectedSantri.penerima_nama !== selectedSantri.nama_santri
          ? 'wali'
          : 'santri'
      );
    }
  }, [selectedSantri]);

  const totalSantri = records.length;
  const totalMenerima = records.filter((r) => r.is_menerima).length;
  const totalBelum = totalSantri - totalMenerima;
  const persenMenerima = totalSantri > 0 ? Math.round((totalMenerima / totalSantri) * 100) : 0;
  const persenBelum = totalSantri > 0 ? Math.round((totalBelum / totalSantri) * 100) : 0;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterTingkat && r.tingkat.toUpperCase() !== filterTingkat.toUpperCase()) return false;
      if (filterKelas && `${r.din_kls} ${r.din_bag}`.toLowerCase() !== filterKelas.toLowerCase()) return false;
      if (filterStatus === 'SUDAH' && !r.is_menerima) return false;
      if (filterStatus === 'BELUM' && r.is_menerima) return false;
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchesName = r.nama_santri.toLowerCase().includes(q);
        const matchesInduk = r.no_induk.includes(q);
        const matchesIjazah = (r.nomor_seri_ijazah || '').toLowerCase().includes(q);
        if (!matchesName && !matchesInduk && !matchesIjazah) return false;
      }
      return true;
    });
  }, [records, filterTingkat, filterKelas, filterStatus, searchKeyword]);

  const groupedCards = useMemo(() => {
    const map = new Map<string, { formasi: any; santri: typeof records }>();
    formasiList.forEach((f) => {
      map.set(f.id, { formasi: f, santri: [] });
    });
    filteredRecords.forEach((r) => {
      const entry = map.get(r.ebtadin_formasi_id);
      if (entry) {
        entry.santri.push(r);
      }
    });
    return Array.from(map.values()).filter((g) => g.santri.length > 0);
  }, [formasiList, filteredRecords]);

  const handleExportExcel = () => {
    if (records.length === 0) return;
    const data = records.map((r, idx) => ({
      No: idx + 1,
      'No. Induk': r.no_induk,
      'Nama Santri': r.nama_santri,
      Tingkat: r.tingkat,
      Kelas: `${r.din_kls} ${r.din_bag}`,
      'No. Seri Ijazah': r.nomor_seri_ijazah || '-',
      'Status Ijazah': r.is_menerima ? 'Sudah Menerima' : 'Belum Menerima',
      'Tanggal Serah': r.tanggal_serah
        ? new Date(r.tanggal_serah).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '-',
      'Nama Penerima': r.penerima_nama || (r.is_menerima ? r.nama_santri : '-'),
      'Diserahkan Oleh': r.diserahkan_oleh || '-',
      Catatan: r.catatan || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Serah_Ijazah_EBTADIN');
    XLSX.writeFile(wb, `Serah_Ijazah_EBTADIN_${activeTahun?.tahun_masehi || 2026}.xlsx`);
  };

  const handleSaveDetail = async () => {
    if (!selectedSantri) return;
    const tgl = editTanggal ? new Date(editTanggal).toISOString() : new Date().toISOString();
    const penerima =
      editPenerimaTipe === 'santri'
        ? selectedSantri.nama_santri
        : editPenerimaNama.trim() || selectedSantri.nama_santri;

    await updateDetailSerah(selectedSantri.id, {
      is_menerima: true,
      tanggal_serah: tgl,
      penerima_nama: penerima,
      diserahkan_oleh: 'Petugas',
      catatan: editCatatan.trim() || null,
    });
    setSelectedSantri(null);
  };

  const handleExecuteBatchDate = async () => {
    if (!batchModalFormasi) return;
    const tgl = batchTanggal ? new Date(batchTanggal).toISOString() : new Date().toISOString();
    await batchSetKelasMenerimaWithDate(batchModalFormasi.id, true, tgl, 'Petugas');
    setBatchModalFormasi(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-xl bg-emerald-100 text-[#0f766e] flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-2xs">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                  Serah Ijazah Santri
                </h1>

                {/* Dropdown Pemilih Angkatan (Multi-Tahun) */}
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-300">
                  <CalendarDays className="w-3.5 h-3.5 text-[#0f766e]" />
                  <select
                    value={activeTahun?.id || ''}
                    onChange={(e) => {
                      const found = tahunList.find((t) => t.id === e.target.value);
                      if (found) {
                        setActiveTahun(found);
                        fetchRecords(found.id);
                      }
                    }}
                    className="text-xs font-bold bg-transparent text-[#0f766e] focus:outline-none cursor-pointer"
                  >
                    {tahunList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama_angkatan} {t.status === 'LOCKED' ? '(Terkunci)' : '(Aktif)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Pemantauan dan pencatatan tanda terima penyerahan ijazah kelulusan santri lengkap dengan tanggal serah terima.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => activeTahun && fetchRecords(activeTahun.id)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white transition shadow-2xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>

        {/* 3 Kartu Metrik */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                MENERIMA
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-extrabold text-slate-900">{totalMenerima}</h3>
                <span className="text-xs font-bold text-slate-500">({persenMenerima}%)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Santri telah menerima fisik ijazah</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                BELUM MENERIMA
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-extrabold text-slate-900">{totalBelum}</h3>
                <span className="text-xs font-bold text-slate-500">({persenBelum}%)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Ijazah masih tersimpan di kantor</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                TOTAL PESERTA EBTADIN
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-extrabold text-slate-900">{totalSantri}</h3>
                <span className="text-xs font-bold text-slate-500">Santri</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">4 Ula, 2 Wustho, 2 Ulya Aktif</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari nama santri, NIS, atau no ijazah..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
            />
          </div>
          <div className="sm:col-span-3">
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="">Semua Tingkat</option>
              <option value="ULA">4 ULA</option>
              <option value="WUSTHO">2 WUSTHO</option>
              <option value="ULYA">2 ULYA</option>
            </select>
          </div>
          <div className="sm:col-span-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="SEMUA">Semua Status Penerimaan</option>
              <option value="SUDAH">Sudah Menerima</option>
              <option value="BELUM">Belum Menerima</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Kartu Rombel Penyerahan Ijazah */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedCards.map(({ formasi, santri }) => {
          const countMenerima = santri.filter((s) => s.is_menerima).length;
          const ratio = `${countMenerima}/${santri.length}`;
          const progressPercent = Math.round((countMenerima / santri.length) * 100);
          return (
            <div
              key={formasi.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#0f766e] text-xs font-bold">
                      {formasi.din_kls} {formasi.din_bag}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {formasi.tingkat} ({formasi.pa_pi})
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-600 font-mono">{ratio}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-[#0f766e] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Tabel Santri dalam Rombel */}
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-1.5 px-3 w-8">No</th>
                      <th className="py-1.5 px-3">Nama Santri &amp; Info</th>
                      <th className="py-1.5 px-3 text-center w-20">Menerima</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {santri.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 text-slate-500 font-medium align-top">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900 leading-snug">{s.nama_santri}</p>
                          <p className="text-[10px] font-mono text-emerald-700 mt-0.5">
                            {s.nomor_seri_ijazah || `NIS: ${s.no_induk}`}
                          </p>

                          {/* Info Tanggal Penerimaan & Penerima */}
                          {s.is_menerima ? (
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-800 font-semibold bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/60 w-fit">
                              <Calendar className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              <span>
                                {s.tanggal_serah
                                  ? new Date(s.tanggal_serah).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Hari ini'}
                              </span>
                              {s.penerima_nama && s.penerima_nama !== s.nama_santri && (
                                <span className="text-slate-600 font-normal">
                                  ({s.penerima_nama})
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedSantri(s)}
                                className="text-slate-400 hover:text-emerald-700 ml-0.5 p-0.5 rounded transition"
                                title="Ubah tanggal atau penerima"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 italic">
                              <span>Belum diserahkan</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center align-top">
                          <button
                            type="button"
                            onClick={() => toggleMenerima(s.id, s.is_menerima, 'Petugas')}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition shadow-2xs ${
                              s.is_menerima
                                ? 'bg-[#0f766e] text-white hover:bg-[#0d655e]'
                                : 'border border-slate-300 hover:border-slate-400 text-transparent'
                            }`}
                            title={s.is_menerima ? 'Klik untuk membatalkan penerimaan' : 'Klik: tandai menerima hari ini'}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Kartu Rombel dengan Opsi Tanggal Massal */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => batchSetKelasMenerima(formasi.id, true, 'Petugas')}
                    className="text-[#0f766e] hover:underline font-semibold"
                    title="Tandai semua santri di rombel ini menerima hari ini"
                  >
                    Semua (Hari Ini)
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setBatchModalFormasi({
                        id: formasi.id,
                        name: `${formasi.tingkat} ${formasi.din_kls} ${formasi.din_bag} (${formasi.pa_pi})`,
                      })
                    }
                    className="text-slate-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1"
                    title="Tandai serah terima serentak dengan memilih tanggal tertentu"
                  >
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Pilih Tgl</span>
                  </button>
                </div>
                <span className="text-slate-400 text-[10px] truncate max-w-[120px]">
                  {formasi.wali_kelas_text || '-'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Edit Detail Tanggal & Penerima Satuan */}
      {selectedSantri && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0f766e] flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ubah Tanggal &amp; Penerima</h3>
                  <p className="text-[11px] text-slate-500">{selectedSantri.nama_santri} ({selectedSantri.no_induk})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSantri(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nomor Seri Ijazah Resmi:
                </label>
                <p className="font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold">
                  {selectedSantri.nomor_seri_ijazah || '-'}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tanggal Penyerahan Ijazah:
                </label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Diterima Oleh:
                </label>
                <div className="flex items-center gap-4 mb-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="penerimaTipe"
                      checked={editPenerimaTipe === 'santri'}
                      onChange={() => {
                        setEditPenerimaTipe('santri');
                        setEditPenerimaNama(selectedSantri.nama_santri);
                      }}
                      className="text-[#0f766e] focus:ring-emerald-500"
                    />
                    <span>Santri Sendiri</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="penerimaTipe"
                      checked={editPenerimaTipe === 'wali'}
                      onChange={() => setEditPenerimaTipe('wali')}
                      className="text-[#0f766e] focus:ring-emerald-500"
                    />
                    <span>Orang Tua / Wali</span>
                  </label>
                </div>
                {editPenerimaTipe === 'wali' && (
                  <input
                    type="text"
                    placeholder="Tuliskan nama lengkap orang tua/wali penerima..."
                    value={editPenerimaNama === selectedSantri.nama_santri ? '' : editPenerimaNama}
                    onChange={(e) => setEditPenerimaNama(e.target.value)}
                    className="w-full py-1.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional):
                </label>
                <input
                  type="text"
                  placeholder="Misal: Diambil saat wisuda purna siswa..."
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  className="w-full py-1.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSantri(null)}
                className="py-2 px-3.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveDetail}
                className="py-2 px-4 rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white text-xs font-bold transition shadow-2xs"
              >
                Simpan Tanggal &amp; Penerima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Serah Terima Massal per Rombel dengan Tanggal Terpilih */}
      {batchModalFormasi && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Serah Ijazah Massal</h3>
              <button
                type="button"
                onClick={() => setBatchModalFormasi(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Tandai seluruh santri di kelas <strong>{batchModalFormasi.name}</strong> telah menerima ijazah secara serentak pada tanggal berikut:
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Tanggal Penyerahan Serentak:
              </label>
              <input
                type="date"
                value={batchTanggal}
                onChange={(e) => setBatchTanggal(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBatchModalFormasi(null)}
                className="py-1.5 px-3 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchDate}
                className="py-1.5 px-3.5 rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white text-xs font-bold transition shadow-2xs"
              >
                Tandai Semua Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
