'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  KelasKonsorsium,
  SesiPresensiKonsorsium,
  JenisKonsorsium,
} from '@/types/konsorsium';
import KartuKelasKonsorsium from '@/components/modules/konsorsium/KartuKelasKonsorsium';
import ModalBuatKelasKonsorsium from '@/components/modules/konsorsium/ModalBuatKelasKonsorsium';
import ModalDaftarAsatidzKonsorsium from '@/components/modules/konsorsium/ModalDaftarAsatidzKonsorsium';
import ModalInputPresensiKonsorsium from '@/components/modules/konsorsium/ModalInputPresensiKonsorsium';
import ModalRiwayatPresensiKonsorsium from '@/components/modules/konsorsium/ModalRiwayatPresensiKonsorsium';
import ModalDetailMatriksTahunan from '@/components/modules/konsorsium/ModalDetailMatriksTahunan';
import {
  BookOpen,
  Plus,
  Users,
  CalendarCheck,
  Search,
  RefreshCw,
  Layers,
} from 'lucide-react';

const TINGKAT_FILTERS = ['SEMUA', 'ULA', 'WUSTHO', 'ULYA', "ISTI'DAD"];

export default function AbsenKonsorsiumPage() {
  const {
    kelasList,
    anggotaList,
    sesiList,
    isLoading,
    fetchKonsorsiumData,
    selectedTingkat,
    setSelectedTingkat,
    searchKeyword,
    setSearchKeyword,
  } = useKonsorsiumStore();

  const { fetchFanData, fanConfig } = useFanStore();
  const { fetchAsatidz, asatidzList } = useAsatidzStore();
  const { canEdit } = usePagePermission('absen-konsorsium');

  // Filter Jenis Konsor State ('SEMUA' | 'Mustahiq/qoh' | 'Munawib/bah')
  const [filterJenis, setFilterJenis] = useState<'SEMUA' | JenisKonsorsium>('SEMUA');

  // Modal States
  const [isModalBuatOpen, setIsModalBuatOpen] = useState(false);
  const [editKelasTarget, setEditKelasTarget] = useState<KelasKonsorsium | null>(null);

  const [isModalDaftarOpen, setIsModalDaftarOpen] = useState(false);
  const [targetKelasDaftar, setTargetKelasDaftar] = useState<KelasKonsorsium | null>(null);

  const [isModalPresensiOpen, setIsModalPresensiOpen] = useState(false);
  const [targetKelasPresensi, setTargetKelasPresensi] = useState<KelasKonsorsium | null>(null);
  const [editSesiTarget, setEditSesiTarget] = useState<SesiPresensiKonsorsium | null>(null);

  const [isModalRiwayatOpen, setIsModalRiwayatOpen] = useState(false);
  const [targetKelasRiwayat, setTargetKelasRiwayat] = useState<KelasKonsorsium | null>(null);

  const [isModalMatriksOpen, setIsModalMatriksOpen] = useState(false);
  const [targetKelasMatriks, setTargetKelasMatriks] = useState<KelasKonsorsium | null>(null);

  useEffect(() => {
    fetchKonsorsiumData();
    if (Object.keys(fanConfig).length === 0) fetchFanData();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchKonsorsiumData, fetchFanData, fetchAsatidz, fanConfig, asatidzList.length]);

  // Hitung jumlah kelas per jenis konsor
  const countsByJenis = useMemo(() => {
    let mustahiq = 0;
    let munawib = 0;
    kelasList.forEach((k) => {
      if ((k.jenisKonsor || 'Mustahiq/qoh') === 'Mustahiq/qoh') mustahiq++;
      else munawib++;
    });
    return { semua: kelasList.length, mustahiq, munawib };
  }, [kelasList]);

  // Filter Kelas Konsorsium (Tingkat + Jenis Konsor + Pencarian)
  const filteredKelasList = useMemo(() => {
    return kelasList.filter((k) => {
      const matchTingkat =
        selectedTingkat === 'SEMUA' || k.tingkat === selectedTingkat;

      const currentJenis = k.jenisKonsor || 'Mustahiq/qoh';
      const matchJenis = filterJenis === 'SEMUA' || currentJenis === filterJenis;

      const q = searchKeyword.toLowerCase().trim();
      if (!q) return matchTingkat && matchJenis;

      // Cari berdasarkan nama kelas, nama pembimbing, atau keterangan
      const matchText =
        k.namaKelas.toLowerCase().includes(q) ||
        k.pembimbingNama.toLowerCase().includes(q) ||
        (k.keterangan && k.keterangan.toLowerCase().includes(q));

      // Atau cari apakah ada asatidz terdaftar dengan nama/nia tersebut di kelas ini
      const matchAnggota = anggotaList.some(
        (a) =>
          a.kelasId === k.id &&
          (a.nama.toLowerCase().includes(q) || a.nia.toLowerCase().includes(q))
      );

      return matchTingkat && matchJenis && (matchText || matchAnggota);
    });
  }, [kelasList, selectedTingkat, filterJenis, searchKeyword, anggotaList]);

  // Statistik Ringkasan KPI
  const stats = useMemo(() => {
    const totalKelas = kelasList.length;
    const uniqueAsatidz = new Set(anggotaList.map((a) => a.nia)).size;
    const totalSesi = sesiList.length;

    return { totalKelas, uniqueAsatidz, totalSesi };
  }, [kelasList.length, anggotaList, sesiList.length]);

  // Handlers untuk interaksi kelas
  const handleOpenBuatKelas = () => {
    setEditKelasTarget(null);
    setIsModalBuatOpen(true);
  };

  const handleOpenEditKelas = (kelas: KelasKonsorsium) => {
    setEditKelasTarget(kelas);
    setIsModalBuatOpen(true);
  };

  const handleOpenDaftarkanAsatidz = (kelas: KelasKonsorsium) => {
    setTargetKelasDaftar(kelas);
    setIsModalDaftarOpen(true);
  };

  const handleOpenInputPresensi = (kelas: KelasKonsorsium, _tanggal?: string) => {
    setTargetKelasPresensi(kelas);
    setEditSesiTarget(null);
    setIsModalPresensiOpen(true);
  };

  const handleOpenLihatRiwayat = (kelas: KelasKonsorsium) => {
    setTargetKelasRiwayat(kelas);
    setIsModalRiwayatOpen(true);
  };

  const handleOpenDetailMatriks = (kelas: KelasKonsorsium) => {
    setTargetKelasMatriks(kelas);
    setIsModalMatriksOpen(true);
  };

  const handleEditSesiDariRiwayat = (sesi: SesiPresensiKonsorsium) => {
    setIsModalRiwayatOpen(false);
    setEditSesiTarget(sesi);
    setIsModalPresensiOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Action Utama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Absen Konsorsium
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Presensi forum konsorsium asatidz (Mustahiq/qoh &amp; Munawib/bah) per kelas fan pelajaran
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={() => fetchKonsorsiumData()}
            className="p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={handleOpenBuatKelas}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm hover:shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Kelas Konsorsium</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Banner KPI Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 flex-shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">
              {stats.totalKelas}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total Kelas Konsorsium
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">
              {stats.uniqueAsatidz}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Asatidz Terdaftar Aktif
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100 flex-shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800 leading-tight">
              {stats.totalSesi}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Sesi Pertemuan Tercatat
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pengelompokan Tab Utama Berdasarkan 'Jenis Konsor' */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilterJenis('SEMUA')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            filterJenis === 'SEMUA'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Semua Konsorsium</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${filterJenis === 'SEMUA' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {countsByJenis.semua}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterJenis('Mustahiq/qoh')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            filterJenis === 'Mustahiq/qoh'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50/70'
          }`}
        >
          <span>Konsorsium Mustahiq/qoh</span>
          <span className="text-[10px] font-normal opacity-90">(Setiap Hari Kamis)</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${filterJenis === 'Mustahiq/qoh' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            {countsByJenis.mustahiq}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterJenis('Munawib/bah')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            filterJenis === 'Munawib/bah'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-teal-900 hover:bg-teal-50/70'
          }`}
        >
          <span>Konsorsium Munawib/bah</span>
          <span className="text-[10px] font-normal opacity-90">(Setiap Hari Selasa)</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${filterJenis === 'Munawib/bah' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'}`}>
            {countsByJenis.munawib}
          </span>
        </button>
      </div>

      {/* 4. Toolbar Pencarian & Filter Tingkat */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        {/* Filter Tingkat Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {TINGKAT_FILTERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTingkat(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedTingkat === t
                  ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t === 'SEMUA' ? 'Semua Tingkat' : t}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Cari kelas fan, pembimbing, asatidz..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
          />
        </div>
      </div>

      {/* 5. Daftar Kelas Konsorsium (Kartu / Kelompok Tabel) */}
      {filteredKelasList.length === 0 ? (
        <div className="py-16 text-center px-4 rounded-3xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center max-w-xl mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {kelasList.length === 0
              ? 'Belum Ada Kelas Konsorsium'
              : 'Tidak Ditemukan Kelas yang Sesuai'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">
            {kelasList.length === 0
              ? 'Buat kelas konsorsium terlebih dahulu dengan menentukan tingkat kelas, jenis konsor (Mustahiq/qoh atau Munawib/bah), nama kelas, dan pembimbing kelas.'
              : 'Coba ubah kata kunci pencarian, ganti filter tingkat, atau pilih grup jenis konsor yang lain.'}
          </p>

          {canEdit && kelasList.length === 0 && (
            <button
              type="button"
              onClick={handleOpenBuatKelas}
              className="mt-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Kelas Konsorsium Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredKelasList.map((kelas) => (
            <KartuKelasKonsorsium
              key={kelas.id}
              kelas={kelas}
              onDaftarkanAsatidz={handleOpenDaftarkanAsatidz}
              onInputPresensi={handleOpenInputPresensi}
              onLihatRiwayat={handleOpenLihatRiwayat}
              onEditKelas={handleOpenEditKelas}
              onLihatDetailMatriks={handleOpenDetailMatriks}
            />
          ))}
        </div>
      )}

      {/* 6. Modals */}
      <ModalBuatKelasKonsorsium
        isOpen={isModalBuatOpen}
        onClose={() => setIsModalBuatOpen(false)}
        editData={editKelasTarget}
      />

      <ModalDaftarAsatidzKonsorsium
        isOpen={isModalDaftarOpen}
        onClose={() => setIsModalDaftarOpen(false)}
        kelas={targetKelasDaftar}
      />

      <ModalInputPresensiKonsorsium
        isOpen={isModalPresensiOpen}
        onClose={() => setIsModalPresensiOpen(false)}
        kelas={targetKelasPresensi}
        editSesi={editSesiTarget}
      />

      <ModalRiwayatPresensiKonsorsium
        isOpen={isModalRiwayatOpen}
        onClose={() => setIsModalRiwayatOpen(false)}
        kelas={targetKelasRiwayat}
        onEditSesi={handleEditSesiDariRiwayat}
      />

      <ModalDetailMatriksTahunan
        isOpen={isModalMatriksOpen}
        onClose={() => setIsModalMatriksOpen(false)}
        kelas={targetKelasMatriks}
        onInputPresensi={handleOpenInputPresensi}
      />
    </div>
  );
}
