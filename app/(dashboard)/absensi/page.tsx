'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  UserCheck,
  Calendar,
  CalendarOff,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  Info,
  AlertTriangle,
  Clock,
  ListChecks,
  Lock,
  Unlock,
  CheckCheck,
  Save,
  Search,
  X,
  MoreHorizontal,
  History,
  FileSpreadsheet,
  Printer,
  LayoutGrid,
  Table as TableIcon,
  Edit3,
  Trash2,
  MapPin,
  BookOpen,
  Building2,
} from 'lucide-react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useFanStore } from '@/stores/useFanStore';
import {
  JamKbm,
  KpiKategori,
  SesiJadwalHarian,
  StatusAbsensi,
  RiwayatAbsensiItem,
} from '@/types/absensi';
import {
  ARRAY_HARI_IND,
  getSesiKey,
  bangunDaftarRiwayatAbsensi,
  formatTanggalPanjangIndo,
  getLabelWaktuJamKBM,
} from '@/lib/utils/absensiHelper';
import {
  bandingkanBlokHariKBM,
  formatLabelBlokHariKBM,
  buildMasterStrukturKelasKBM,
} from '@/lib/utils/jadwalHelper';
import ModalAturLibur from '@/components/modules/absensi/ModalAturLibur';
import ModalListStatusKPI from '@/components/modules/absensi/ModalListStatusKPI';
import ModalEditAbsensi from '@/components/modules/absensi/ModalEditAbsensi';
import ModalGeneratorWA from '@/components/modules/rekap-absensi/ModalGeneratorWA';

type JamSortOption = 'kelas_asc' | 'blok_asc' | 'blok_desc' | 'nama_asc';

interface JamFilterState {
  search: string;
  blok: string;
  sort: JamSortOption;
}

const DEFAULT_JAM_FILTER: JamFilterState = {
  search: '',
  blok: 'ALL',
  sort: 'kelas_asc',
};

const EXTRA_STATUS_LIST: Array<{ value: StatusAbsensi; label: string }> = [
  { value: 'Terlambat', label: '⏳ Terlambat' },
  { value: 'Digantikan', label: '🔄 Digantikan (Badal)' },
  { value: 'Tugas Lain', label: '📋 Tugas Lain' },
  { value: 'Jadwal Kosong', label: '⚪ Jadwal Kosong' },
];

export default function AbsensiAsatidzPage() {
  const {
    selectedDate,
    hari,
    isLoading,
    rawBucketMap,
    liburMapByDate,
    sesiHariIni,
    savedRecords,
    unlockedJams,
    savedJams,
    setSelectedDate,
    fetchAbsensi,
    syncSesiHariIni,
    getSesiStatusData,
    setSesiStatusData,
    terapkanStatusMassal,
    tandaiSemuaHadirJam,
    bukaPaksaKunciJam,
    simpanAbsensiJam,
    editRekamanRiwayat,
    hapusRekamanRiwayat,
    setHariLibur,
  } = useAbsensiStore();

  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { jadwalMap, fetchJadwal } = useJadwalStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { fanConfig, fetchFanData } = useFanStore();

  // Tab: 'harian' | 'riwayat'
  const [activeTab, setActiveTab] = useState<'harian' | 'riwayat'>('harian');

  // State per-jam filters & bulk selection
  const [jamFilters, setJamFilters] = useState<Record<JamKbm, JamFilterState>>({
    1: { ...DEFAULT_JAM_FILTER },
    2: { ...DEFAULT_JAM_FILTER },
    3: { ...DEFAULT_JAM_FILTER },
    4: { ...DEFAULT_JAM_FILTER },
  });
  const [selectedByJam, setSelectedByJam] = useState<Record<JamKbm, string[]>>({
    1: [],
    2: [],
    3: [],
    4: [],
  });
  const [savingJam, setSavingJam] = useState<Record<JamKbm, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
  });
  const [openExtraDropdownKey, setOpenExtraDropdownKey] = useState<string | null>(
    null
  );
  const [toastMsg, setToastMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Modals state
  const [isLiburModalOpen, setIsLiburModalOpen] = useState(false);
  const [isWAModalOpen, setIsWAModalOpen] = useState(false);
  const [activeKpiModal, setActiveKpiModal] = useState<KpiKategori | null>(null);
  const [editingRecord, setEditingRecord] = useState<RiwayatAbsensiItem | null>(
    null
  );

  // State Tab 2: Riwayat & Rekap Data
  const [riwayatTglDari, setRiwayatTglDari] = useState<string>('');
  const [riwayatTglSampai, setRiwayatTglSampai] = useState<string>('');
  const [riwayatHari, setRiwayatHari] = useState<string>('ALL');
  const [riwayatJam, setRiwayatJam] = useState<string>('ALL');
  const [riwayatBlok, setRiwayatBlok] = useState<string>('ALL');
  const [riwayatStatus, setRiwayatStatus] = useState<string>('ALL');
  const [riwayatNama, setRiwayatNama] = useState<string>('');
  const [riwayatQuickSearch, setRiwayatQuickSearch] = useState<string>('');
  const [riwayatViewMode, setRiwayatViewMode] = useState<'table' | 'card'>(
    'table'
  );
  const [riwayatPage, setRiwayatPage] = useState<number>(1);
  const [riwayatPageSize, setRiwayatPageSize] = useState<number>(25);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Load initial master & absensi data
  useEffect(() => {
    fetchAbsensi();
    if (asatidzList.length === 0) fetchAsatidz();
    if (Object.keys(jadwalMap).length === 0) fetchJadwal();
    if (formasiList.length === 0) fetchFormasi();
    if (Object.keys(fanConfig).length === 0) fetchFanData();
  }, [
    fetchAbsensi,
    fetchAsatidz,
    fetchJadwal,
    fetchFormasi,
    fetchFanData,
    asatidzList.length,
    jadwalMap,
    formasiList.length,
    fanConfig,
  ]);

  // Sinkronisasi ekstraksi jadwal setiap kali master data atau tanggal berubah
  useEffect(() => {
    if (asatidzList.length > 0 || Object.keys(jadwalMap).length > 0) {
      const masterStrukturKelas = buildMasterStrukturKelasKBM(
        formasiList,
        asatidzList,
        jadwalMap,
        fanConfig
      );
      syncSesiHariIni(
        asatidzList,
        jadwalMap,
        formasiList,
        fanConfig,
        masterStrukturKelas
      );
    }
  }, [
    selectedDate,
    asatidzList,
    jadwalMap,
    formasiList,
    fanConfig,
    syncSesiHariIni,
  ]);

  // Bersihkan pilihan checkbox saat tanggal berganti
  useEffect(() => {
    setSelectedByJam({ 1: [], 2: [], 3: [], 4: [] });
    setOpenExtraDropdownKey(null);
  }, [selectedDate]);

  const currentLibur = liburMapByDate[selectedDate] || null;
  const isHariJumat = hari === 'Jumat';

  // Hitung KPI Hari Ini lintas Jam 1 - 4
  const kpiStats = useMemo(() => {
    if (isHariJumat || currentLibur) {
      return { total: 0, hadir: 0, izinSakit: 0, alfa: 0, terlambatGanti: 0 };
    }

    let total = 0;
    let hadir = 0;
    let izinSakit = 0;
    let alfa = 0;
    let terlambatGanti = 0;

    ([1, 2, 3, 4] as JamKbm[]).forEach((j) => {
      (sesiHariIni[j] || []).forEach((sesi) => {
        total++;
        const st = getSesiStatusData(sesi).status || 'Hadir';
        if (st === 'Hadir') {
          hadir++;
        } else if (
          st === 'Izin' ||
          st === 'Sakit' ||
          st === 'Tugas Lain' ||
          st === 'Tugas'
        ) {
          izinSakit++;
        } else if (st === 'Alfa' || st === 'Jadwal Kosong') {
          alfa++;
        } else if (
          st === 'Terlambat' ||
          st === 'Digantikan' ||
          st === 'Badal'
        ) {
          terlambatGanti++;
        }
      });
    });

    return { total, hadir, izinSakit, alfa, terlambatGanti };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesiHariIni, getSesiStatusData, savedRecords, useAbsensiStore.getState().pendingStatus]);

  // Daftar Blok unik untuk filter dropdown
  const daftarBlokUnik = useMemo(() => {
    const setBlok = new Set<string>();
    ([1, 2, 3, 4] as JamKbm[]).forEach((j) => {
      (sesiHariIni[j] || []).forEach((s) => {
        if (s.blok) setBlok.add(s.blok);
      });
    });
    formasiList.forEach((f) => {
      const blk = f.blok_diniyyah || f.blok_takror;
      if (blk && blk !== '-') setBlok.add(blk);
    });
    return Array.from(setBlok).sort((a, b) => bandingkanBlokHariKBM(a, b));
  }, [sesiHariIni, formasiList]);

  // Handler filter per-jam
  const updateJamFilter = (jam: JamKbm, partial: Partial<JamFilterState>) => {
    setJamFilters((prev) => ({
      ...prev,
      [jam]: { ...prev[jam], ...partial },
    }));
  };

  // Handler checkbox kartu per-jam
  const toggleSelectCard = (jam: JamKbm, sKey: string) => {
    setSelectedByJam((prev) => {
      const list = prev[jam] || [];
      const exists = list.includes(sKey);
      return {
        ...prev,
        [jam]: exists ? list.filter((k) => k !== sKey) : [...list, sKey],
      };
    });
  };

  const clearSelectionJam = (jam: JamKbm) => {
    setSelectedByJam((prev) => ({ ...prev, [jam]: [] }));
  };

  const handleBulkStatusJam = (jam: JamKbm, status: StatusAbsensi) => {
    const keys = selectedByJam[jam] || [];
    if (keys.length === 0) return;
    terapkanStatusMassal(jam, keys, status);
    clearSelectionJam(jam);
    showToast(
      'success',
      `Status "${status}" diterapkan pada ${keys.length} sesi di Jam Ke-${jam}.`
    );
  };

  const handleTandaiSemuaHadir = (jam: JamKbm) => {
    tandaiSemuaHadirJam(jam);
    showToast(
      'success',
      `Semua sesi pada Jam Ke-${jam} ditandai Hadir. Klik "Simpan Jam Ini" untuk menyimpan.`
    );
  };

  const handleSimpanJam = async (jam: JamKbm) => {
    setSavingJam((prev) => ({ ...prev, [jam]: true }));
    const res = await simpanAbsensiJam(jam);
    setSavingJam((prev) => ({ ...prev, [jam]: false }));
    if (res.success) {
      clearSelectionJam(jam);
      showToast(
        'success',
        `Berhasil menyimpan ${res.count} sesi absensi Jam Ke-${jam}!`
      );
    } else {
      showToast('error', res.message || `Gagal menyimpan absensi Jam Ke-${jam}.`);
    }
  };

  const handleRefreshAll = async () => {
    await fetchAbsensi(true);
    await Promise.all([
      fetchAsatidz(),
      fetchJadwal(),
      fetchFormasi(),
      fetchFanData(),
    ]);
    showToast('success', 'Data jadwal dan absensi berhasil disegarkan.');
  };

  // ============================================================================
  // DATA TAB 2: RIWAYAT & REKAP DATA
  // ============================================================================
  const semuaRiwayatList = useMemo(() => {
    return bangunDaftarRiwayatAbsensi(rawBucketMap, asatidzList, formasiList);
  }, [rawBucketMap, asatidzList, formasiList]);

  const filteredRiwayatList = useMemo(() => {
    return semuaRiwayatList.filter((item) => {
      if (riwayatTglDari && item.tanggal < riwayatTglDari) return false;
      if (riwayatTglSampai && item.tanggal > riwayatTglSampai) return false;
      if (riwayatHari !== 'ALL' && item.hari !== riwayatHari) return false;
      if (riwayatJam !== 'ALL' && item.jamKe !== riwayatJam) return false;
      if (
        riwayatBlok !== 'ALL' &&
        formatLabelBlokHariKBM(item.blok) !== formatLabelBlokHariKBM(riwayatBlok)
      ) {
        return false;
      }
      if (riwayatStatus !== 'ALL' && item.status !== riwayatStatus) return false;
      if (riwayatNama.trim()) {
        const qNama = riwayatNama.trim().toLowerCase();
        const qNamaClean = qNama.replace(/\s+/g, '');
        const namaClean = item.nama.toLowerCase().replace(/\s+/g, '');
        const niaClean = item.nia.toLowerCase().replace(/\s+/g, '');
        if (
          !item.nama.toLowerCase().includes(qNama) &&
          !item.nia.toLowerCase().includes(qNama) &&
          !namaClean.includes(qNamaClean) &&
          !niaClean.includes(qNamaClean)
        ) {
          return false;
        }
      }
      if (riwayatQuickSearch.trim()) {
        const q = riwayatQuickSearch.trim().toLowerCase();
        const qClean = q.replace(/\s+/g, '');
        const hay = `${item.nama} ${item.nia} ${item.kelasMengajar} ${item.fan} ${item.blok} ${item.status} ${item.keterangan}`.toLowerCase();
        const hayClean = hay.replace(/\s+/g, '');
        if (!hay.includes(q) && !hayClean.includes(qClean)) return false;
      }
      return true;
    });
  }, [
    semuaRiwayatList,
    riwayatTglDari,
    riwayatTglSampai,
    riwayatHari,
    riwayatJam,
    riwayatBlok,
    riwayatStatus,
    riwayatNama,
    riwayatQuickSearch,
  ]);

  const totalRiwayatPages = Math.max(
    1,
    Math.ceil(filteredRiwayatList.length / riwayatPageSize)
  );
  const paginatedRiwayat = useMemo(() => {
    const start = (riwayatPage - 1) * riwayatPageSize;
    return filteredRiwayatList.slice(start, start + riwayatPageSize);
  }, [filteredRiwayatList, riwayatPage, riwayatPageSize]);

  const handleResetFilterRiwayat = () => {
    setRiwayatTglDari('');
    setRiwayatTglSampai('');
    setRiwayatHari('ALL');
    setRiwayatJam('ALL');
    setRiwayatBlok('ALL');
    setRiwayatStatus('ALL');
    setRiwayatNama('');
    setRiwayatQuickSearch('');
    setRiwayatPage(1);
  };

  const handleExportRiwayatExcel = () => {
    if (filteredRiwayatList.length === 0) {
      showToast('error', 'Tidak ada data riwayat untuk diekspor.');
      return;
    }
    const rows = filteredRiwayatList.map((r, idx) => ({
      No: idx + 1,
      'ID Absensi': r.id,
      Tanggal: r.tanggal,
      Hari: r.hari,
      'Jam Ke': r.jamKe,
      'Nama Asatidz': r.nama,
      NIA: r.nia,
      Tingkat: r.tingkat,
      'Kelas Mengajar': r.kelasMengajar,
      'Fan / Mapel': r.fan,
      'Lokasi / Ruang': r.lokasi,
      Blok: formatLabelBlokHariKBM(r.blok),
      'Status Kehadiran': r.status,
      'Menit Terlambat': r.menitTerlambat || '-',
      'Guru Pengganti (Badal)': r.namaPengganti || '-',
      Keterangan: r.keterangan || '-',
      'Diinput Oleh': r.diinputOleh || '-',
      'Waktu Update': r.waktuUpdate || r.timestamp || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Absensi');
    XLSX.writeFile(wb, `Riwayat_Absensi_Asatidz_${selectedDate}.xlsx`);
  };

  const handleDeleteRiwayat = async (item: RiwayatAbsensiItem) => {
    if (
      !window.confirm(
        `Hapus rekaman absensi "${item.nama}" pada ${item.tanggal} (${item.jamKe})?`
      )
    ) {
      return;
    }
    const ok = await hapusRekamanRiwayat(item.id);
    if (ok) {
      showToast('success', 'Rekaman riwayat absensi berhasil dihapus.');
    } else {
      showToast('error', 'Gagal menghapus rekaman absensi.');
    }
  };

  const getStatusBadgeClasses = (st: string) => {
    switch (st) {
      case 'Hadir':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Izin':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Sakit':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Alfa':
      case 'Jadwal Kosong':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Terlambat':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Digantikan':
      case 'Badal':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold animate-in fade-in slide-in-from-bottom-4 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-700'
              : 'bg-rose-700 text-white border-rose-600'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Datalist global untuk input Nama Pengganti (Badal) */}
      <datalist id="datalist-asatidz-pengganti">
        {asatidzList.map((a) => (
          <option key={a.nia} value={a.nama_asatidz} />
        ))}
      </datalist>

      {/* ====================================================================
          HEADER UTAMA & FILTER TANGGAL
      ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">
              Absensi Asatidz
            </h1>
            <p className="text-xs text-slate-500">
              Pencatatan kehadiran mengajar harian (Jam Ke-1 s/d Jam Ke-4) terintegrasi Jadwal KBM
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWAModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat WA
          </button>

          {/* Pemilih Tanggal + Badge Hari */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
            />
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                isHariJumat
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {hari}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsLiburModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
          >
            <CalendarOff className="w-3.5 h-3.5" />
            Libur / Event
          </button>

          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        </div>
      </div>

      {/* ====================================================================
          5 KARTU RINGKASAN KPI (INTERAKTIF)
      ==================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setActiveKpiModal('SEMUA')}
          className="bg-white hover:bg-slate-50 transition-all p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800 leading-none">
              {kpiStats.total}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Total Sesi Hari Ini
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveKpiModal('Hadir')}
          className="bg-white hover:bg-emerald-50/40 transition-all p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-700 leading-none">
              {kpiStats.hadir}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Hadir
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveKpiModal('IZIN_SAKIT')}
          className="bg-white hover:bg-sky-50/40 transition-all p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-sky-700 leading-none">
              {kpiStats.izinSakit}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Izin / Sakit
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveKpiModal('ALFA')}
          className="bg-white hover:bg-rose-50/40 transition-all p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-left group"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-700 leading-none">
              {kpiStats.alfa}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Alfa / Kosong
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveKpiModal('TERLAMBAT_GANTI')}
          className="bg-white hover:bg-amber-50/40 transition-all p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-left group col-span-2 md:col-span-1"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-amber-700 leading-none">
              {kpiStats.terlambatGanti}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-1">
              Terlambat / Ganti
            </div>
          </div>
        </button>
      </div>

      {/* ====================================================================
          BANNER PERINGATAN HARI LIBUR / EVENT KHUSUS
      ==================================================================== */}
      {currentLibur && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-amber-900">
                  KBM Diliburkan: {currentLibur.kategori}
                </h3>
                <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                  {formatTanggalPanjangIndo(selectedDate)}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Keterangan: <strong>{currentLibur.keterangan || '-'}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHariLibur(selectedDate, null)}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-sm transition-colors shrink-0"
          >
            Batalkan Status Libur
          </button>
        </div>
      )}

      {/* ====================================================================
          NAVIGASI 2 PILL TAB UTAMA
      ==================================================================== */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 w-fit shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('harian')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'harian'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          Form Absensi Harian (Bertahap Jam 1 - 4)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('riwayat')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'riwayat'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat & Rekap Data ({semuaRiwayatList.length})
        </button>
      </div>

      {/* ====================================================================
          TAB 1: FORM ABSENSI HARIAN BERTAHAP (JAM 1 - 4)
      ==================================================================== */}
      {activeTab === 'harian' && (
        <div className="space-y-6">
          {isHariJumat ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <CalendarOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">
                Hari Jumat (Libur Reguler KBM Madrasah Diniyyah)
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Kegiatan Belajar Mengajar reguler diliburkan setiap hari Jumat. Silakan pilih tanggal lain untuk mengisi absensi harian.
              </p>
            </div>
          ) : currentLibur ? (
            <div className="bg-white rounded-xl border border-amber-200 p-10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <CalendarOff className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">
                Kegiatan Pembelajaran Diliburkan: {currentLibur.kategori}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {currentLibur.keterangan || 'KBM reguler diliburkan pada tanggal ini.'}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setHariLibur(selectedDate, null)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition shadow-xs"
                >
                  Batalkan Status Libur
                </button>
              </div>
            </div>
          ) : (
            ([1, 2, 3, 4] as JamKbm[]).map((jamNum) => {
              const allSesiJam = sesiHariIni[jamNum] || [];
              const filter = jamFilters[jamNum];
              const isUnlocked = unlockedJams[jamNum];
              const isSavedJam = savedJams[jamNum];
              const selectedKeys = selectedByJam[jamNum] || [];
              const isSaving = savingJam[jamNum];

              // Hitung progres sesi yang sudah tersimpan di DB pada jam ini
              const savedCount = allSesiJam.filter((s) => {
                const k = getSesiKey(selectedDate, s);
                return Boolean(savedRecords[k]);
              }).length;

              // Filter & Sort sesi pada jam ini
              const filteredSesi = allSesiJam
                .filter((s) => {
                  if (
                    filter.blok !== 'ALL' &&
                    formatLabelBlokHariKBM(s.blok) !==
                      formatLabelBlokHariKBM(filter.blok)
                  ) {
                    return false;
                  }
                  if (filter.search.trim()) {
                    const q = filter.search.trim().toLowerCase();
                    const qClean = q.replace(/\s+/g, '');
                    const hay = `${s.nama} ${s.nia} ${s.kelasMengajar} ${s.fan} ${s.lokasi} ${s.blok}`.toLowerCase();
                    const hayClean = hay.replace(/\s+/g, '');
                    if (!hay.includes(q) && !hayClean.includes(qClean)) return false;
                  }
                  return true;
                })
                .slice()
                .sort((a, b) => {
                  if (filter.sort === 'nama_asc') {
                    return a.nama.localeCompare(b.nama, undefined, {
                      sensitivity: 'base',
                    });
                  }
                  if (filter.sort === 'blok_asc') {
                    const cmp = bandingkanBlokHariKBM(a.blok, b.blok);
                    if (cmp !== 0) return cmp;
                  }
                  if (filter.sort === 'blok_desc') {
                    const cmp = bandingkanBlokHariKBM(b.blok, a.blok);
                    if (cmp !== 0) return cmp;
                  }
                  return a.kelasMengajar.localeCompare(
                    b.kelasMengajar,
                    undefined,
                    { numeric: true, sensitivity: 'base' }
                  );
                });

              const waktuInfo = getLabelWaktuJamKBM(jamNum);

              return (
                <section
                  key={jamNum}
                  className="relative bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden"
                >
                  {/* Lock Overlay untuk Jam 2, 3, 4 bila belum dibuka */}
                  {!isUnlocked && (
                    <div className="absolute inset-0 z-20 bg-slate-900/45 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 max-w-md space-y-3">
                        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                          <Lock className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800">
                          Sesi Jam Ke-{jamNum} Masih Terkunci
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Selesaikan dan simpan absensi <strong>Jam Ke-{jamNum - 1}</strong> terlebih dahulu, atau klik tombol di bawah untuk membuka kunci secara manual.
                        </p>
                        <button
                          type="button"
                          onClick={() => bukaPaksaKunciJam(jamNum)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Buka Kunci Jam Ini
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Header Blok Jam */}
                  <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-extrabold shadow-sm ${
                          isSavedJam
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        Jam Ke-{jamNum}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-sm font-extrabold text-slate-800">
                            Daftar Pengajar Jam Ke-{jamNum}
                          </h2>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${waktuInfo.badgeClass}`}
                            title={waktuInfo.deskripsi}
                          >
                            {waktuInfo.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Progres: <strong>{savedCount}</strong> dari{' '}
                          <strong>{allSesiJam.length}</strong> sesi tersimpan
                        </p>
                      </div>
                    </div>

                    {/* Tombol Aksi Massal & Simpan Jam */}
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedKeys.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg">
                          <span className="text-[11px] font-extrabold text-amber-900 mr-1">
                            {selectedKeys.length} Dipilih:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleBulkStatusJam(jamNum, 'Izin')}
                            className="px-2 py-1 rounded text-[11px] font-bold bg-sky-600 text-white hover:bg-sky-700"
                          >
                            Izin
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkStatusJam(jamNum, 'Sakit')}
                            className="px-2 py-1 rounded text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600"
                          >
                            Sakit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBulkStatusJam(jamNum, 'Alfa')}
                            className="px-2 py-1 rounded text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700"
                          >
                            Alfa
                          </button>
                          <button
                            type="button"
                            onClick={() => clearSelectionJam(jamNum)}
                            className="px-2 py-1 rounded text-[11px] font-semibold text-slate-600 hover:bg-amber-100"
                          >
                            Batal
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTandaiSemuaHadir(jamNum)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Tandai Semua Hadir
                      </button>

                      <button
                        type="button"
                        disabled={isSaving || allSesiJam.length === 0}
                        onClick={() => handleSimpanJam(jamNum)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? 'Menyimpan...' : 'Simpan Jam Ini'}
                      </button>
                    </div>
                  </div>

                  {/* Bar Filter Per-Jam */}
                  <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <div className="relative min-w-[220px] flex-1 max-w-xs">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={filter.search}
                          onChange={(e) =>
                            updateJamFilter(jamNum, { search: e.target.value })
                          }
                          placeholder="Cari Asatidz / Kelas..."
                          className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {filter.search && (
                          <button
                            type="button"
                            onClick={() =>
                              updateJamFilter(jamNum, { search: '' })
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <select
                        value={filter.blok}
                        onChange={(e) =>
                          updateJamFilter(jamNum, { blok: e.target.value })
                        }
                        className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="ALL">Semua Blok</option>
                        {daftarBlokUnik.map((b) => (
                          <option key={b} value={b}>
                            {formatLabelBlokHariKBM(b)}
                          </option>
                        ))}
                      </select>

                      <select
                        value={filter.sort}
                        onChange={(e) =>
                          updateJamFilter(jamNum, {
                            sort: e.target.value as JamSortOption,
                          })
                        }
                        className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="kelas_asc">Urut: Kelas (A-Z)</option>
                        <option value="blok_asc">Urut: Blok (Kecil-Besar)</option>
                        <option value="blok_desc">Urut: Blok (Besar-Kecil)</option>
                        <option value="nama_asc">Urut: Nama (A-Z)</option>
                      </select>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-500">
                      Menampilkan: <strong>{filteredSesi.length}</strong> dari{' '}
                      <strong>{allSesiJam.length}</strong> Sesi
                    </div>
                  </div>

                  {/* Grid 2 Kolom Kartu Sesi Pengajar */}
                  <div className="p-4">
                    {filteredSesi.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 text-xs">
                        Tidak ada sesi mengajar yang cocok untuk Jam Ke-{jamNum}.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {filteredSesi.map((sesi) => {
                          const sKey = getSesiKey(selectedDate, sesi);
                          const stData = getSesiStatusData(sesi);
                          const status = stData.status || 'Hadir';
                          const isChecked = selectedKeys.includes(sKey);
                          const isExtraStatus = [
                            'Terlambat',
                            'Digantikan',
                            'Badal',
                            'Tugas Lain',
                            'Tugas',
                            'Jadwal Kosong',
                          ].includes(status);
                          const showMenit = status === 'Terlambat';
                          const showPengganti = [
                            'Digantikan',
                            'Badal',
                            'Izin',
                            'Sakit',
                          ].includes(status);

                          return (
                            <div
                              key={sKey}
                              className={`rounded-xl border p-3.5 transition-all space-y-2.5 ${
                                isChecked
                                  ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                                  : stData.isSaved
                                  ? 'border-emerald-200/90 bg-white'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              {/* Baris 1: Checkbox + Nama Guru + NIA/Blok + Badge Kelas */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() =>
                                      toggleSelectCard(jamNum, sKey)
                                    }
                                    className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-extrabold text-xs text-slate-800 truncate">
                                        {sesi.nama}
                                      </span>
                                      {sesi.isBentrok && (
                                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold text-[9px] uppercase">
                                          Bentrok Kelas
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                                      <span className="font-mono">
                                        NIA: {sesi.nia}
                                      </span>
                                      <span>•</span>
                                      <span className="text-emerald-700 font-semibold">
                                        {formatLabelBlokHariKBM(sesi.blok)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <span className="px-2.5 py-1 rounded-md bg-emerald-700 text-white font-extrabold text-[11px] shrink-0 shadow-sm">
                                  {sesi.kelasMengajar}
                                </span>
                              </div>

                              {/* Baris 2: Badge Fan, Lokasi, Status Simpan */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100 text-[10px]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                                    <BookOpen className="w-3 h-3 text-slate-400" />
                                    {sesi.fan}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {sesi.lokasi}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                                    <Building2 className="w-3 h-3" />
                                    {formatLabelBlokHariKBM(sesi.blok)}
                                  </span>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                                    stData.isSaved
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {stData.isSaved ? '✓ Tersimpan' : 'Belum Disimpan'}
                                </span>
                              </div>

                              {/* Baris 3: Tombol Status Kehadiran + Dropdown Extra + Input Keterangan */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSesiStatusData(sesi, { status: 'Hadir' })
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                                    status === 'Hadir'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  ✓ Hadir
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setSesiStatusData(sesi, { status: 'Izin' })
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                                    status === 'Izin'
                                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  Izin
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setSesiStatusData(sesi, { status: 'Sakit' })
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                                    status === 'Sakit'
                                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  Sakit
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setSesiStatusData(sesi, { status: 'Alfa' })
                                  }
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                                    status === 'Alfa'
                                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  Alfa
                                </button>

                                {/* Tombol Dropdown Status Tambahan (...) */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenExtraDropdownKey(
                                        openExtraDropdownKey === sKey
                                          ? null
                                          : sKey
                                      )
                                    }
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-all ${
                                      isExtraStatus
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                    title="Status kehadiran lainnya"
                                  >
                                    {isExtraStatus ? (
                                      <span>{status}</span>
                                    ) : (
                                      <MoreHorizontal className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {openExtraDropdownKey === sKey && (
                                    <div className="absolute left-0 top-full mt-1 z-30 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-xs">
                                      {EXTRA_STATUS_LIST.map((ext) => (
                                        <button
                                          key={ext.value}
                                          type="button"
                                          onClick={() => {
                                            setSesiStatusData(sesi, {
                                              status: ext.value,
                                            });
                                            setOpenExtraDropdownKey(null);
                                          }}
                                          className={`w-full text-left px-3 py-1.5 font-semibold hover:bg-slate-100 ${
                                            status === ext.value
                                              ? 'text-emerald-700 bg-emerald-50'
                                              : 'text-slate-700'
                                          }`}
                                        >
                                          {ext.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <input
                                  type="text"
                                  value={stData.keterangan}
                                  onChange={(e) =>
                                    setSesiStatusData(sesi, {
                                      keterangan: e.target.value,
                                    })
                                  }
                                  placeholder="Keterangan opsional..."
                                  className="flex-1 min-w-[130px] px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              {/* Baris 4 (Kondisional): Input Menit Terlambat & Guru Pengganti */}
                              {(showMenit || showPengganti) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-dashed border-slate-200">
                                  {showMenit && (
                                    <div className="flex items-center gap-2">
                                      <label className="text-[10px] font-bold text-orange-700 shrink-0">
                                        Menit Telat:
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        max={120}
                                        value={stData.menitTerlambat}
                                        onChange={(e) =>
                                          setSesiStatusData(sesi, {
                                            menitTerlambat: e.target.value,
                                          })
                                        }
                                        placeholder="Contoh: 15"
                                        className="w-full px-2.5 py-1 text-[11px] bg-orange-50/50 border border-orange-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                                      />
                                    </div>
                                  )}

                                  {showPengganti && (
                                    <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                                      <label className="text-[10px] font-bold text-purple-700 shrink-0">
                                        Guru Pengganti (Badal):
                                      </label>
                                      <input
                                        type="text"
                                        list="datalist-asatidz-pengganti"
                                        value={stData.namaPengganti}
                                        onChange={(e) =>
                                          setSesiStatusData(sesi, {
                                            namaPengganti: e.target.value,
                                          })
                                        }
                                        placeholder="Ketik atau pilih nama asatidz pengganti..."
                                        className="w-full px-2.5 py-1 text-[11px] bg-purple-50/40 border border-purple-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 2: RIWAYAT & REKAP DATA ABSENSI
      ==================================================================== */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4">
          {/* Panel 6 Filter Riwayat */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">
                  Filter Riwayat & Rekap Kehadiran
                </h2>
                <p className="text-[11px] text-slate-500">
                  Saring rekaman absensi tersimpan berdasarkan rentang tanggal, hari, jam, blok, atau status
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilterRiwayat}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Reset Filter
                </button>
                <button
                  type="button"
                  onClick={handleExportRiwayatExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export Excel
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Cetak Rekap
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={riwayatTglDari}
                  onChange={(e) => {
                    setRiwayatTglDari(e.target.value);
                    setRiwayatPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={riwayatTglSampai}
                  onChange={(e) => {
                    setRiwayatTglSampai(e.target.value);
                    setRiwayatPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Hari KBM
                </label>
                <select
                  value={riwayatHari}
                  onChange={(e) => {
                    setRiwayatHari(e.target.value);
                    setRiwayatPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="ALL">Semua Hari</option>
                  {ARRAY_HARI_IND.filter((h) => h !== 'Jumat').map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Jam Mengajar
                </label>
                <select
                  value={riwayatJam}
                  onChange={(e) => {
                    setRiwayatJam(e.target.value);
                    setRiwayatPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="ALL">Semua Jam (1-4)</option>
                  <option value="Jam 1">Jam 1</option>
                  <option value="Jam 2">Jam 2</option>
                  <option value="Jam 3">Jam 3</option>
                  <option value="Jam 4">Jam 4</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Blok Kelas
                </label>
                <select
                  value={riwayatBlok}
                  onChange={(e) => {
                    setRiwayatBlok(e.target.value);
                    setRiwayatPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="ALL">Semua Blok</option>
                  {daftarBlokUnik.map((b) => (
                    <option key={b} value={b}>
                      {formatLabelBlokHariKBM(b)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Status Kehadiran
                </label>
                <select
                  value={riwayatStatus}
                  onChange={(e) => {
                    setRiwayatStatus(e.target.value);
                    setRiwayatPage(1);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Hadir">Hadir</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Alfa">Alfa</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Digantikan">Digantikan (Badal)</option>
                  <option value="Tugas Lain">Tugas Lain</option>
                  <option value="Jadwal Kosong">Jadwal Kosong</option>
                </select>
              </div>
            </div>
          </div>

          {/* Toolbar Tabel Riwayat: Pencarian Cepat, Page Size, Toggle Tabel/Kartu */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative min-w-[240px] max-w-sm flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={riwayatQuickSearch}
                    onChange={(e) => {
                      setRiwayatQuickSearch(e.target.value);
                      setRiwayatPage(1);
                    }}
                    placeholder="Cari nama asatidz, NIA, kelas, fan..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {riwayatQuickSearch && (
                    <button
                      type="button"
                      onClick={() => setRiwayatQuickSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={riwayatPageSize}
                  onChange={(e) => {
                    setRiwayatPageSize(Number(e.target.value));
                    setRiwayatPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-700"
                >
                  <option value={25}>25 Baris</option>
                  <option value={50}>50 Baris</option>
                  <option value={100}>100 Baris</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Total: <strong>{filteredRiwayatList.length}</strong> Rekaman
                </span>
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setRiwayatViewMode('table')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                      riwayatViewMode === 'table'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    Tabel
                  </button>
                  <button
                    type="button"
                    onClick={() => setRiwayatViewMode('card')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                      riwayatViewMode === 'card'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Kartu
                  </button>
                </div>
              </div>
            </div>

            {/* Mode Tabel 12 Kolom */}
            {riwayatViewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-10">NO</th>
                      <th className="py-2.5 px-3 text-left">TANGGAL / HARI</th>
                      <th className="py-2.5 px-3 text-center">JAM</th>
                      <th className="py-2.5 px-3 text-left">NAMA ASATIDZ</th>
                      <th className="py-2.5 px-3 text-center">NIA</th>
                      <th className="py-2.5 px-3 text-left">KELAS MENGAJAR</th>
                      <th className="py-2.5 px-3 text-left">FAN / MAPEL</th>
                      <th className="py-2.5 px-3 text-left">LOKASI</th>
                      <th className="py-2.5 px-3 text-center">BLOK</th>
                      <th className="py-2.5 px-3 text-center">STATUS</th>
                      <th className="py-2.5 px-3 text-left">DETAIL / BADAL</th>
                      <th className="py-2.5 px-3 text-center w-20">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRiwayat.length === 0 ? (
                      <tr>
                        <td
                          colSpan={12}
                          className="py-12 text-center text-slate-400"
                        >
                          Belum ada rekaman riwayat absensi yang sesuai filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedRiwayat.map((item, idx) => {
                        const rowNum =
                          (riwayatPage - 1) * riwayatPageSize + idx + 1;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                              {rowNum}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-800">
                                {item.tanggal}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {item.hari}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                                {item.jamKe}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {item.nama}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                              {item.nia}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700">
                              {item.kelasMengajar}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {item.fan}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {item.lokasi}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                                {formatLabelBlokHariKBM(item.blok)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full border font-bold text-[10px] ${getStatusBadgeClasses(
                                  item.status
                                )}`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600">
                              {item.menitTerlambat && (
                                <span className="block text-orange-700 font-semibold">
                                  Telat: {item.menitTerlambat} mnt
                                </span>
                              )}
                              {item.namaPengganti && (
                                <span className="block text-purple-700 font-semibold">
                                  Badal: {item.namaPengganti}
                                </span>
                              )}
                              {item.keterangan && (
                                <span className="block text-slate-500">
                                  {item.keterangan}
                                </span>
                              )}
                              {!item.menitTerlambat &&
                                !item.namaPengganti &&
                                !item.keterangan &&
                                '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingRecord(item)}
                                  title="Edit rekaman"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRiwayat(item)}
                                  title="Hapus rekaman"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
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
            ) : (
              /* Mode Kartu Riwayat */
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedRiwayat.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                    Belum ada rekaman riwayat absensi yang sesuai filter.
                  </div>
                ) : (
                  paginatedRiwayat.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-800">
                            {item.nama}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.hari}, {item.tanggal} • {item.jamKe}
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full border font-bold text-[10px] ${getStatusBadgeClasses(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                        <div>
                          Kelas:{' '}
                          <strong className="text-emerald-700">
                            {item.kelasMengajar}
                          </strong>{' '}
                          • {formatLabelBlokHariKBM(item.blok)}
                        </div>
                        <div>
                          Fan: <strong>{item.fan}</strong> • Ruang: {item.lokasi}
                        </div>
                        {item.namaPengganti && (
                          <div className="text-purple-700 font-semibold">
                            Badal: {item.namaPengganti}
                          </div>
                        )}
                        {item.menitTerlambat && (
                          <div className="text-orange-700 font-semibold">
                            Terlambat: {item.menitTerlambat} menit
                          </div>
                        )}
                        {item.keterangan && (
                          <div className="text-slate-500 italic">
                            &ldquo;{item.keterangan}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setEditingRecord(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRiwayat(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Halaman <strong>{riwayatPage}</strong> dari{' '}
                <strong>{totalRiwayatPages}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={riwayatPage <= 1}
                  onClick={() => setRiwayatPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={riwayatPage >= totalRiwayatPages}
                  onClick={() =>
                    setRiwayatPage((p) => Math.min(totalRiwayatPages, p + 1))
                  }
                  className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODALS
      ==================================================================== */}
      <ModalAturLibur
        isOpen={isLiburModalOpen}
        onClose={() => setIsLiburModalOpen(false)}
        selectedDate={selectedDate}
        currentLibur={currentLibur}
        onSave={async (info) => {
          const ok = await setHariLibur(selectedDate, info);
          if (ok) {
            showToast(
              'success',
              info
                ? `Tanggal ${selectedDate} ditetapkan sebagai ${info.kategori}.`
                : `Status libur pada ${selectedDate} dibatalkan.`
            );
          }
        }}
      />

      <ModalListStatusKPI
        isOpen={Boolean(activeKpiModal)}
        onClose={() => setActiveKpiModal(null)}
        kategori={activeKpiModal}
        tanggal={selectedDate}
        sesiHariIni={sesiHariIni}
        getSesiStatusData={getSesiStatusData}
      />

      <ModalEditAbsensi
        isOpen={Boolean(editingRecord)}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        asatidzList={asatidzList}
        onSave={async (id, updates) => {
          const ok = await editRekamanRiwayat(id, updates);
          if (ok) {
            showToast('success', 'Rekaman absensi berhasil diperbarui.');
          }
          return ok;
        }}
      />

      <ModalGeneratorWA
        isOpen={isWAModalOpen}
        onClose={() => setIsWAModalOpen(false)}
        initialJam="ALL"
      />
    </div>
  );
}
