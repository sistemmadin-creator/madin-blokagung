'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Check,
  X,
  Calendar,
  UserCheck,
  CalendarDays,
  Settings,
  Plus,
  Trash2,
  TrendingUp,
  BarChart2,
  AlertTriangle,
  ChevronRight,
  Edit2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEbtadinStore } from '@/stores/useEbtadinStore';
import { useEbtadinUjianStore } from '@/stores/useEbtadinUjianStore';
import { EbtadinPesertaUjian, EbtadinAlasanOption } from '@/types/ebtadin';

export default function RekapUjianPage() {
  const { tahunList, activeTahun, formasiList, fetchTahunList, setActiveTahun } = useEbtadinStore();
  const {
    records,
    alasanOptions,
    isLoading,
    filterTingkat,
    filterKelas,
    filterStatus,
    searchKeyword,
    fetchRecords,
    fetchAlasanOptions,
    toggleIkutUjian,
    updateDetailUjian,
    batchSetKelasIkut,
    addAlasanOption,
    deleteAlasanOption,
    setFilterTingkat,
    setFilterKelas,
    setFilterStatus,
    setSearchKeyword,
  } = useEbtadinUjianStore();

  // State untuk Modal Catat Alasan Tidak Ikut
  const [selectedSantri, setSelectedSantri] = useState<EbtadinPesertaUjian | null>(null);
  const [selectedAlasanKode, setSelectedAlasanKode] = useState<string>('');
  const [selectedCatatan, setSelectedCatatan] = useState<string>('');

  // State untuk Modal Pengaturan Alasan
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newAlasanLabel, setNewAlasanLabel] = useState('');
  const [isAddingAlasan, setIsAddingAlasan] = useState(false);

  useEffect(() => {
    fetchTahunList();
    fetchAlasanOptions();
  }, [fetchTahunList, fetchAlasanOptions]);

  useEffect(() => {
    if (activeTahun?.id) {
      fetchRecords(activeTahun.id);
    }
  }, [activeTahun?.id, fetchRecords]);

  // Statistik Utama
  const totalSantri = records.length;
  const totalIkut = records.filter((r) => r.is_ikut_ujian).length;
  const totalTidakIkut = totalSantri - totalIkut;
  const persenIkut = totalSantri > 0 ? Math.round((totalIkut / totalSantri) * 100) : 0;
  const persenTidakIkut = totalSantri > 0 ? Math.round((totalTidakIkut / totalSantri) * 100) : 0;

  // Analisis Peringkat Alasan (Terbanyak & Tersedikit)
  const rankingAlasan = useMemo(() => {
    const counts: Record<string, { label: string; count: number; kode: string }> = {};

    // Inisialisasi opsi alasan aktif
    alasanOptions.forEach((opt) => {
      counts[opt.kode] = { label: opt.label, count: 0, kode: opt.kode };
    });

    // Hitung frekuensi santri tidak ikut
    records.forEach((r) => {
      if (!r.is_ikut_ujian) {
        const kode = r.alasan_kode || 'LAINNYA';
        const label = r.alasan_teks || 'Alasan Khusus Lainnya';
        if (!counts[kode]) {
          counts[kode] = { label, count: 0, kode };
        }
        counts[kode].count += 1;
      }
    });

    const list = Object.values(counts).sort((a, b) => b.count - a.count);
    const withCount = list.filter((item) => item.count > 0);

    const terbanyak = withCount.length > 0 ? withCount[0] : null;
    const tersedikit = withCount.length > 1 ? withCount[withCount.length - 1] : null;

    return { list, terbanyak, tersedikit, totalTidakIkut };
  }, [records, alasanOptions, totalTidakIkut]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterTingkat && r.tingkat.toUpperCase() !== filterTingkat.toUpperCase()) return false;
      if (filterKelas && `${r.din_kls} ${r.din_bag}`.toLowerCase() !== filterKelas.toLowerCase()) return false;
      if (filterStatus === 'IKUT' && !r.is_ikut_ujian) return false;
      if (filterStatus === 'TIDAK_IKUT' && r.is_ikut_ujian) return false;
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchesName = r.nama_santri.toLowerCase().includes(q);
        const matchesInduk = r.no_induk.includes(q);
        const matchesAlasan = (r.alasan_teks || '').toLowerCase().includes(q);
        if (!matchesName && !matchesInduk && !matchesAlasan) return false;
      }
      return true;
    });
  }, [records, filterTingkat, filterKelas, filterStatus, searchKeyword]);

  // Grouping per rombel
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

  // Toggle handler
  const handleToggle = (santri: EbtadinPesertaUjian) => {
    if (santri.is_ikut_ujian) {
      // Buka modal untuk memilih alasan jika diubah menjadi Tidak Ikut
      setSelectedSantri(santri);
      setSelectedAlasanKode(santri.alasan_kode || alasanOptions[0]?.kode || 'SAKIT');
      setSelectedCatatan(santri.catatan || '');
    } else {
      // Langsung ubah ke Ikut Ujian
      toggleIkutUjian(santri.id, false, null, null, 'Petugas EBTADIN');
    }
  };

  const handleSaveAlasanModal = () => {
    if (!selectedSantri) return;
    const opt = alasanOptions.find((o) => o.kode === selectedAlasanKode);
    const label = opt ? opt.label : 'Alasan Lainnya';

    updateDetailUjian(selectedSantri.id, {
      is_ikut_ujian: false,
      alasan_kode: selectedAlasanKode,
      alasan_teks: label,
      catatan: selectedCatatan.trim() || null,
      dicatat_oleh: 'Petugas EBTADIN',
    });
    setSelectedSantri(null);
  };

  // Tambah Alasan Baru
  const handleAddAlasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlasanLabel.trim()) return;
    setIsAddingAlasan(true);
    const res = await addAlasanOption(newAlasanLabel);
    if (res.success) {
      setNewAlasanLabel('');
    } else {
      alert(res.message || 'Gagal menambahkan opsi alasan');
    }
    setIsAddingAlasan(false);
  };

  // Ekspor Excel
  const handleExportExcel = () => {
    if (records.length === 0) return;
    const data = records.map((r, idx) => ({
      No: idx + 1,
      'NIS': r.no_induk,
      'Nama Santri': r.nama_santri,
      Tingkat: r.tingkat,
      Kelas: `${r.din_kls} ${r.din_bag}`,
      'Status Ujian': r.is_ikut_ujian ? 'Ikut Ujian' : 'Tidak Ikut',
      'Alasan Tidak Ikut': r.is_ikut_ujian ? '-' : r.alasan_teks || '-',
      Catatan: r.catatan || '-',
      Petugas: r.dicatat_oleh || '-',
      'Tanggal Verifikasi': r.tanggal_verifikasi
        ? new Date(r.tanggal_verifikasi).toLocaleDateString('id-ID')
        : '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Keikutsertaan Ujian');
    XLSX.writeFile(
      workbook,
      `Rekap_Ujian_EBTADIN_${activeTahun?.tahun_masehi || new Date().getFullYear()}.xlsx`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Utama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-[#0f766e] border border-emerald-100 flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 m-0">
                Rekap Keikutsertaan Ujian
              </h1>

              {/* Pemilih Tahun Angkatan */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300">
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
              Pencatatan kehadiran peserta ujian EBTADIN per rombel dan pemetaan alasan ketidakhadiran santri.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
            title="Kelola daftar pilihan alasan ketidakhadiran ujian"
          >
            <Settings className="w-3.5 h-3.5 text-slate-600" />
            <span>Pengaturan Alasan</span>
          </button>
          <button
            type="button"
            onClick={() => activeTahun && fetchRecords(activeTahun.id)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ekspor Excel</span>
          </button>
          <Link
            href="/ebtadin/ujian/rekap-angkatan"
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white transition shadow-2xs flex items-center gap-1.5"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Arsip Ujian Angkatan</span>
          </Link>
        </div>
      </div>

      {/* 4 Kartu Metrik Ringkasan & Peringkat Alasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metrik 1: Total Peserta */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Total Peserta Ujian
            </span>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {totalSantri} <span className="text-xs font-medium text-slate-500">Santri</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Terdaftar di kelas binaan EBTADIN
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 2: Ikut Ujian */}
        <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
              Hadir Mengikuti Ujian
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {totalIkut} <span className="text-xs font-semibold text-emerald-800">({persenIkut}%)</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Telah terverifikasi hadir
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 3: Alasan Terbanyak */}
        <div className="p-4 rounded-xl bg-white border border-rose-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 block">
              Alasan Terbanyak
            </span>
            <div className="text-lg font-bold text-rose-800 mt-1 truncate">
              {rankingAlasan.terbanyak
                ? `${rankingAlasan.terbanyak.label} (${rankingAlasan.terbanyak.count})`
                : 'Belum Ada'}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {totalTidakIkut > 0
                ? `${totalTidakIkut} santri berhalangan hadir`
                : 'Seluruh santri hadir ujian'}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metrik 4: Alasan Tersedikit */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Alasan Tersedikit
            </span>
            <div className="text-lg font-bold text-slate-700 mt-1 truncate">
              {rankingAlasan.tersedikit
                ? `${rankingAlasan.tersedikit.label} (${rankingAlasan.tersedikit.count})`
                : rankingAlasan.terbanyak
                ? `${rankingAlasan.terbanyak.label} (${rankingAlasan.terbanyak.count})`
                : 'Belum Ada'}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Frekuensi ketidakhadiran minimal
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100 flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Papan Peringkat / Distribusi Alasan (Visual Breakdown) */}
      {totalTidakIkut > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#0f766e]" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Distribusi Alasan Ketidakhadiran Santri (Peringkat Terbanyak s.d Tersedikit)
              </h2>
            </div>
            <span className="text-xs font-bold text-rose-700">
              Total {totalTidakIkut} santri tidak ikut
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rankingAlasan.list
              .filter((item) => item.count > 0)
              .map((item, idx) => {
                const pct = Math.round((item.count / totalTidakIkut) * 100);
                return (
                  <div
                    key={item.kode}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] inline-flex items-center justify-center font-bold">
                          #{idx + 1}
                        </span>
                        <span>{item.label}</span>
                      </span>
                      <span className="text-xs font-extrabold text-[#0f766e]">
                        {item.count} santri
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-[#0f766e] h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 text-right">
                      {pct}% dari santri tidak ujian
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama santri, NIS, atau alasan..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
              <option value="SEMUA">Semua Status Kehadiran</option>
              <option value="IKUT">Ikut Ujian</option>
              <option value="TIDAK_IKUT">Tidak Ikut Ujian</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Kartu Rombel Peserta Ujian */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedCards.map(({ formasi, santri }) => {
          const countIkut = santri.filter((s) => s.is_ikut_ujian).length;
          const ratio = `${countIkut}/${santri.length}`;
          const progressPercent = Math.round((countIkut / santri.length) * 100);

          return (
            <div
              key={formasi.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between"
            >
              {/* Header Kartu Rombel */}
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
                  <span className="text-xs font-bold text-slate-600 font-mono">{ratio} Ikut</span>
                </div>

                {/* Identitas Mustahiq / Mustahiqoh Rombel */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                        formasi.pa_pi === 'PI'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-[#0f766e]'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="text-[11px] font-semibold text-slate-500 mr-1">
                        {formasi.pa_pi === 'PI' ? 'Mustahiqoh:' : 'Mustahiq:'}
                      </span>
                      <span className="font-bold text-slate-800 text-[11px]">
                        {formasi.wali_kelas_text
                          ? `${formasi.pa_pi === 'PI' ? 'Usth. ' : 'Ust. '}${formasi.wali_kelas_text.replace(/^(ust\.|ustadz\.|ustadzah\.|usth\.)\s*/i, '')}`
                          : 'Belum ditentukan'}
                      </span>
                    </div>
                  </div>
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
                      <th className="py-1.5 px-3">Nama Santri &amp; Status</th>
                      <th className="py-1.5 px-3 text-center w-20">Ikut Ujian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {santri.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 text-slate-500 font-medium align-top">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900 leading-snug">{s.nama_santri}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            NIS: {s.no_induk}
                          </p>

                          {/* Info Status / Alasan */}
                          {s.is_ikut_ujian ? (
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-emerald-800 font-semibold bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/60 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              <span>Ikut Ujian</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-rose-800 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 w-fit">
                              <XCircle className="w-3 h-3 text-rose-600 flex-shrink-0" />
                              <span>{s.alasan_teks || 'Tidak Ikut'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSantri(s);
                                  setSelectedAlasanKode(s.alasan_kode || alasanOptions[0]?.kode || 'SAKIT');
                                  setSelectedCatatan(s.catatan || '');
                                }}
                                className="text-slate-400 hover:text-rose-700 ml-0.5 p-0.5 rounded transition"
                                title="Ubah alasan tidak ujian"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center align-top">
                          <button
                            type="button"
                            onClick={() => handleToggle(s)}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition shadow-2xs ${
                              s.is_ikut_ujian
                                ? 'bg-[#0f766e] text-white hover:bg-[#0d655e]'
                                : 'border border-rose-300 bg-rose-50 hover:border-rose-400 text-rose-600'
                            }`}
                            title={
                              s.is_ikut_ujian
                                ? 'Klik untuk menandai santri tidak ikut ujian'
                                : 'Klik untuk menandai santri hadir ikut ujian'
                            }
                          >
                            {s.is_ikut_ujian ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <X className="w-4 h-4 stroke-[3]" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Kartu Rombel */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => batchSetKelasIkut(formasi.id, true, 'Petugas EBTADIN')}
                  className="text-[#0f766e] hover:underline font-semibold"
                  title="Tandai seluruh santri di rombel ini hadir ujian"
                >
                  Semua Ikut (Hadir)
                </button>
                <span className="text-slate-400 text-[10px] font-medium">
                  {santri.length} Santri Terdaftar
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Catat Alasan Tidak Ikut Ujian */}
      {selectedSantri && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Alasan Tidak Ikut Ujian
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedSantri.nama_santri} ({selectedSantri.no_induk})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSantri(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Alasan Ketidakhadiran:
                </label>
                <select
                  value={selectedAlasanKode}
                  onChange={(e) => setSelectedAlasanKode(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                >
                  {alasanOptions
                    .filter((o) => o.is_active)
                    .map((opt) => (
                      <option key={opt.id} value={opt.kode}>
                        {opt.label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Keterangan Tambahan:
                </label>
                <textarea
                  rows={3}
                  placeholder="Misal: Surat dokter terlampir di poskestren / izin pulang keperluan keluarga..."
                  value={selectedCatatan}
                  onChange={(e) => setSelectedCatatan(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
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
                onClick={handleSaveAlasanModal}
                className="py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs"
              >
                Simpan Alasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Pengaturan Opsi Alasan Ujian Dinamis */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#0f766e] flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Pengaturan Pilihan Alasan Ujian
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tambah, perbarui, atau hapus opsi alasan ketidakhadiran ujian santri.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Tambah Opsi Alasan */}
            <form onSubmit={handleAddAlasan} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ketik alasan baru (misal: Tugas Pondok / Khidmah)..."
                value={newAlasanLabel}
                onChange={(e) => setNewAlasanLabel(e.target.value)}
                className="flex-1 text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <button
                type="submit"
                disabled={isAddingAlasan || !newAlasanLabel.trim()}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white transition flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </form>

            {/* List Alasan Aktif */}
            <div className="space-y-2 divide-y divide-slate-100 max-h-60 overflow-y-auto pt-2">
              {alasanOptions.map((opt, idx) => (
                <div key={opt.id} className="pt-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] inline-flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{opt.label}</span>
                    <span className="text-[10px] font-mono text-slate-400">({opt.kode})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Hapus opsi alasan "${opt.label}"?`)) {
                        deleteAlasanOption(opt.id);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Hapus opsi alasan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
