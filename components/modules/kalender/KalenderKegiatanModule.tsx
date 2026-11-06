'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Calendar,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  X,
  ArrowRight,
  Moon,
  Sun,
} from 'lucide-react';
import { useKalenderStore } from '@/stores/useKalenderStore';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  DAFTAR_KODE_LEGENDA_RESMI,
  KATALOG_ATURAN_KEGIATAN,
  KategoriLiburAbsensi,
  KodeKegiatanKalender,
  SelKalenderGrid,
} from '@/types/kalender';
import {
  buildGrid13BulanHijriyah,
  buildGrid13BulanMasehi,
  DAFTAR_TAHUN_AJARAN_KALENDER,
  getPasaranJawa,
  masehiToHijri,
  NAMA_HARI_KALENDER,
} from '@/lib/utils/kalenderHijriyahHelper';
import {
  formatTanggalPanjangIndo,
  getNamaHariDariTgl,
  KATEGORI_LIBUR_OPTIONS,
} from '@/lib/utils/absensiHelper';

export function KalenderKegiatanModule() {
  const {
    modeKalender,
    activeTahunAjaran,
    hijriOffsetByTA,
    aturanLiburByKode,
    agendaMapByTA,
    isSyncingAbsensi,
    lastSyncedAt,
    setModeKalender,
    setActiveTahunAjaran,
    fetchKalenderData,
    getCurrentTAConfig,
    getCurrentAgendaMap,
    upsertRentangAgenda,
    deleteAgendaTanggal,
    updateAturanLiburKode,
    regenerateTahunAjaranOtomatis,
    syncKalenderToAbsensiLibur,
  } = useKalenderStore();

  const { liburMapByDate, setSelectedDate: setAbsensiSelectedDate } =
    useAbsensiStore();
  const { currentAccount, canEdit, canDelete } =
    usePagePermission('kalender-kegiatan');

  const [highlightKode, setHighlightKode] =
    useState<KodeKegiatanKalender | null>(null);
  const [searchAgenda, setSearchAgenda] = useState('');
  const [filterStatusKbm, setFilterStatusKbm] = useState<
    'ALL' | 'LIBUR' | 'EFEKTIF'
  >('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal 1: Atur Agenda Tanggal / Rentang Tanggal
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [formStartYMD, setFormStartYMD] = useState('2025-09-07');
  const [formEndYMD, setFormEndYMD] = useState('2025-09-07');
  const [formKode, setFormKode] = useState<KodeKegiatanKalender>('LM');
  const [formNamaKegiatan, setFormNamaKegiatan] = useState('Libur Maulud');
  const [formIsLiburKbm, setFormIsLiburKbm] = useState(true);
  const [formKategoriLibur, setFormKategoriLibur] =
    useState<KategoriLiburAbsensi>('Libur Pondok');
  const [formCatatan, setFormCatatan] = useState('');
  const [hasExistingAgendaOnSelectedDate, setHasExistingAgendaOnSelectedDate] =
    useState(false);

  // Modal 2: Aturan Sinkronisasi Libur KBM & Koreksi Hilal
  const [isAturanModalOpen, setIsAturanModalOpen] = useState(false);
  const [draftAturanLibur, setDraftAturanLibur] =
    useState<Record<KodeKegiatanKalender, boolean>>(aturanLiburByKode);
  const [draftHijriOffset, setDraftHijriOffset] = useState<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    void fetchKalenderData();
  }, [fetchKalenderData]);

  const currentTAConfig = useMemo(() => {
    return getCurrentTAConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTahunAjaran, hijriOffsetByTA]);

  const currentAgendaMap = useMemo(() => {
    return getCurrentAgendaMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTahunAjaran, agendaMapByTA, liburMapByDate]);

  const grid13Bulan = useMemo(() => {
    if (modeKalender === 'HIJRIYAH') {
      return buildGrid13BulanHijriyah(currentTAConfig, currentAgendaMap);
    }
    return buildGrid13BulanMasehi(currentTAConfig, currentAgendaMap);
  }, [modeKalender, currentTAConfig, currentAgendaMap]);

  // Statistik KPI Kalender Tahun Ajaran Aktif
  const kpiStats = useMemo(() => {
    const items = Object.values(currentAgendaMap);
    let totalHariAgenda = 0;
    let totalHariLiburKbm = 0;
    let totalAhadLegi = 0;
    let totalHariUjian = 0;

    items.forEach((it) => {
      totalHariAgenda++;
      if (it.isLiburKbm) totalHariLiburKbm++;
      if (it.kode === 'AL' || it.kode === 'PAL') totalAhadLegi++;
      if (
        it.kode === 'UUB' ||
        it.kode === 'TK' ||
        it.kode === 'DA' ||
        it.kode === 'E & DS'
      ) {
        totalHariUjian++;
      }
    });

    return {
      totalHariAgenda,
      totalHariLiburKbm,
      totalAhadLegi,
      totalHariUjian,
    };
  }, [currentAgendaMap]);

  // Daftar agenda terurut untuk tabel rincian di bawah kalender
  const sortedAgendaList = useMemo(() => {
    const q = searchAgenda.trim().toLowerCase();
    return Object.values(currentAgendaMap)
      .filter((item) => {
        if (filterStatusKbm === 'LIBUR' && !item.isLiburKbm) return false;
        if (filterStatusKbm === 'EFEKTIF' && item.isLiburKbm) return false;
        if (q) {
          const hay = `${item.tanggalMasehi} ${item.kode} ${item.namaKegiatan} ${item.kategoriLibur} ${item.catatan || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.tanggalMasehi.localeCompare(b.tanggalMasehi));
  }, [currentAgendaMap, filterStatusKbm, searchAgenda]);

  const handleClickCellKalender = (cell: SelKalenderGrid) => {
    const existing = currentAgendaMap[cell.tanggalMasehi];
    setFormStartYMD(cell.tanggalMasehi);
    setFormEndYMD(cell.tanggalMasehi);

    if (existing) {
      setFormKode(existing.kode);
      setFormNamaKegiatan(existing.namaKegiatan);
      setFormIsLiburKbm(existing.isLiburKbm);
      setFormKategoriLibur(existing.kategoriLibur);
      setFormCatatan(existing.catatan || '');
      setHasExistingAgendaOnSelectedDate(true);
    } else {
      const defMeta = KATALOG_ATURAN_KEGIATAN.LM;
      setFormKode('LM');
      setFormNamaKegiatan(defMeta.namaKegiatan);
      setFormIsLiburKbm(aturanLiburByKode.LM ?? defMeta.defaultIsLiburKbm);
      setFormKategoriLibur(defMeta.kategoriLiburAbsensi);
      setFormCatatan('');
      setHasExistingAgendaOnSelectedDate(false);
    }
    setIsAgendaModalOpen(true);
  };

  const handleChangeFormKode = (nextKode: KodeKegiatanKalender) => {
    setFormKode(nextKode);
    const meta = KATALOG_ATURAN_KEGIATAN[nextKode];
    setFormNamaKegiatan(meta.namaKegiatan);
    setFormIsLiburKbm(
      typeof aturanLiburByKode[nextKode] === 'boolean'
        ? aturanLiburByKode[nextKode]
        : meta.defaultIsLiburKbm
    );
    setFormKategoriLibur(meta.kategoriLiburAbsensi);
  };

  const handleSubmitAgendaModal = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertRentangAgenda({
      startYMD: formStartYMD,
      endYMD: formEndYMD,
      kode: formKode,
      namaKegiatan: formNamaKegiatan,
      isLiburKbm: formIsLiburKbm,
      kategoriLibur: formKategoriLibur,
      catatan: formCatatan,
      actorName: currentAccount?.full_name || 'PKM. Kurikulum',
    });
    setIsAgendaModalOpen(false);
    showToast(
      `Agenda [${formKode}] berhasil disimpan & disinkronkan ke Pengaturan Libur Absensi.`
    );
  };

  const handleDeleteAgendaModal = async () => {
    await deleteAgendaTanggal(
      formStartYMD,
      currentAccount?.full_name || 'PKM. Kurikulum'
    );
    setIsAgendaModalOpen(false);
    showToast(
      `Agenda pada tanggal ${formStartYMD} dihapus & status libur KBM dinormalkan.`
    );
  };

  const handleOpenAturanModal = () => {
    setDraftAturanLibur({ ...aturanLiburByKode });
    setDraftHijriOffset(hijriOffsetByTA[activeTahunAjaran] ?? 0);
    setIsAturanModalOpen(true);
  };

  const handleSaveAturanModal = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAturanLiburKode(
      draftAturanLibur,
      draftHijriOffset,
      currentAccount?.full_name || 'PKM. Kurikulum'
    );
    setIsAturanModalOpen(false);
    showToast(
      'Aturan sinkronisasi Libur KBM & koreksi Hilal berhasil diperbarui.'
    );
  };

  const handleManualSyncToAbsensi = async () => {
    const count = await syncKalenderToAbsensiLibur(
      currentAccount?.full_name || 'PKM. Kurikulum'
    );
    showToast(
      `Sinkronisasi berhasil! ${count} tanggal libur/ujian aktif di Pengaturan Hari Libur Absensi.`
    );
  };

  const handleExportExcel = () => {
    const rows = sortedAgendaList.map((item, idx) => {
      const hInfo = masehiToHijri(
        item.tanggalMasehi,
        currentTAConfig.hijriOffsetDays
      );
      return {
        No: idx + 1,
        'Tanggal Masehi': item.tanggalMasehi,
        Hari: `${getNamaHariDariTgl(item.tanggalMasehi)} ${getPasaranJawa(
          item.tanggalMasehi
        )}`,
        'Tanggal Hijriyah': `${hInfo.dayH} ${hInfo.monthName} ${hInfo.yearH} H`,
        'Kode Kegiatan': item.kode,
        'Nama Kegiatan': item.namaKegiatan,
        'Status KBM Absensi': item.isLiburKbm
          ? 'Libur KBM Reguler'
          : 'KBM Masuk (Efektif)',
        'Kategori Libur Absensi': item.isLiburKbm ? item.kategoriLibur : '-',
        Keterangan: item.catatan || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kalender_Kegiatan');
    XLSX.writeFile(
      wb,
      `Kalender_Kegiatan_Madin_${activeTahunAjaran.replace('/', '-')}.xlsx`
    );
  };

  const selectedDateHijriPreview = useMemo(() => {
    return masehiToHijri(formStartYMD, currentTAConfig.hijriOffsetDays);
  }, [formStartYMD, currentTAConfig.hijriOffsetDays]);

  return (
    <div className="space-y-6 pb-14">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/30"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ==================== 1. HEADER & KONTROL UTAMA ==================== */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                  PKM. Kurikulum
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                  Sinkron Otomatis ke Absensi Kesiswaan
                </span>
              </div>
              <h1
                data-testid="heading-kalender-kegiatan"
                className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900"
              >
                Kalender Kegiatan Madrasah Diniyyah
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500 max-w-3xl">
                Penanggalan kegiatan akademik 13 bulan (Masehi &amp; Hijriyah) dengan penyesuaian otomatis lintas Tahun Ajaran serta sinkronisasi langsung ke Pengaturan Hari Libur Absensi.
              </p>
            </div>
          </div>

          {/* Switch Masehi / Hijriyah + Pemilih Tahun Ajaran + Aksi */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Tombol Switch Masehi & Hijriyah */}
            <div
              role="group"
              aria-label="Mode Penanggalan Kalender"
              className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200"
            >
              <button
                type="button"
                data-testid="switch-kalender-masehi"
                onClick={() => setModeKalender('MASEHI')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  modeKalender === 'MASEHI'
                    ? 'bg-[#134e3a] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Kalender Masehi</span>
              </button>
              <button
                type="button"
                data-testid="switch-kalender-hijriyah"
                onClick={() => setModeKalender('HIJRIYAH')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  modeKalender === 'HIJRIYAH'
                    ? 'bg-[#134e3a] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Kalender Hijriyah</span>
              </button>
            </div>

            {/* Pemilih Tahun Ajaran (Otomatis Menyesuaikan Tanggal) */}
            <select
              data-testid="select-tahun-ajaran-kalender"
              aria-label="Pilih Tahun Ajaran Kalender"
              value={activeTahunAjaran}
              onChange={(e) => {
                const nextTA = e.target.value;
                setActiveTahunAjaran(nextTA);
                showToast(
                  `Kalender otomatis disesuaikan ke Tahun Ajaran ${nextTA}.`
                );
              }}
              className="bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-extrabold text-slate-800 cursor-pointer"
            >
              {DAFTAR_TAHUN_AJARAN_KALENDER.map((cfg) => (
                <option key={cfg.tahunAjaranMasehi} value={cfg.tahunAjaranMasehi}>
                  TA {cfg.tahunAjaranMasehi} ({cfg.tahunAjaranHijriyah} H)
                </option>
              ))}
            </select>

            {canEdit && (
              <button
                type="button"
                data-testid="btn-open-modal-agenda"
                onClick={() => {
                  const defaultDate = `${currentTAConfig.startYearMasehi}-09-07`;
                  setFormStartYMD(defaultDate);
                  setFormEndYMD(defaultDate);
                  setHasExistingAgendaOnSelectedDate(
                    Boolean(currentAgendaMap[defaultDate])
                  );
                  setIsAgendaModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Atur Agenda / Libur</span>
              </button>
            )}

            <button
              type="button"
              data-testid="btn-open-modal-aturan"
              onClick={handleOpenAturanModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold cursor-pointer"
            >
              <Settings2 className="w-4 h-4" />
              <span>Aturan Libur &amp; Hilal</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 2. KARTU RINGKASAN KPI & STATUS SINKRONISASI ==================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Mode &amp; Tahun Ajaran
          </span>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span
              data-testid="kpi-tahun-ajaran-aktif"
              className="text-lg sm:text-xl font-extrabold font-mono text-slate-900"
            >
              {modeKalender === 'HIJRIYAH'
                ? `${currentTAConfig.tahunAjaranHijriyah} H`
                : currentTAConfig.tahunAjaranMasehi}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
              13 Bulan
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {modeKalender === 'HIJRIYAH'
              ? `Dzulhijjah ${currentTAConfig.startYearHijriyah} s/d Dzulhijjah ${
                  currentTAConfig.startYearHijriyah + 1
                }`
              : `Juni ${currentTAConfig.startYearMasehi} s/d Juni ${
                  currentTAConfig.startYearMasehi + 1
                }`}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Hari Agenda
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              data-testid="kpi-total-agenda"
              className="text-2xl font-extrabold font-mono text-slate-900"
            >
              {kpiStats.totalHariAgenda}
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {kpiStats.totalAhadLegi} AL &amp; PAL
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Termasuk siklus Selapanan Ahad Legi 35 hari
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Hari Libur KBM (Sinkron Absensi)
          </span>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              data-testid="kpi-total-hari-libur-kbm"
              className="text-2xl font-extrabold font-mono text-amber-700"
            >
              {kpiStats.totalHariLiburKbm}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
              Otomatis Libur
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Otomatis menonaktifkan KBM di Absensi Asatidz
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Jembatan Absensi KBM
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-testid="btn-sync-kalender-absensi"
              disabled={isSyncingAbsensi}
              onClick={handleManualSyncToAbsensi}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${isSyncingAbsensi ? 'animate-spin' : ''}`}
              />
              <span>Sinkron Sekarang</span>
            </button>
            <Link
              href="/absensi"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
            >
              <span>Cek Absensi</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 truncate">
            {lastSyncedAt
              ? `Tersinkron: ${lastSyncedAt}`
              : 'Sinkron 2 arah dengan Pengaturan Libur Absensi'}
          </p>
        </div>
      </div>

      {/* ==================== 3. KANVAS POSTER KALENDER 13 BULAN (PERSIS GAMBAR 1 & 2) ==================== */}
      <div
        id="area-cetak-kalender-kegiatan"
        className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5"
      >
        {/* Judul Resmi Kalender seperti Gambar 1 & Gambar 2 */}
        <div className="text-center space-y-0.5 border-b border-slate-100 pb-4">
          <h2
            data-testid="poster-title-kalender"
            className="text-base sm:text-xl font-black tracking-wide text-slate-900 uppercase"
          >
            {modeKalender === 'HIJRIYAH'
              ? 'KALENDER HIJRIYAH KEGIATAN'
              : 'KALENDER MASEHI KEGIATAN'}
          </h2>
          <p className="text-xs sm:text-base font-extrabold text-slate-800 uppercase tracking-wider">
            MADRASAH DINIYYAH AL AMIRIYYAH
          </p>
          <p className="text-[11px] text-slate-500">
            Tahun Ajaran {currentTAConfig.tahunAjaranMasehi} M /{' '}
            {currentTAConfig.tahunAjaranHijriyah} H • Klik tanggal mana pun pada kalender untuk mengatur kegiatan atau status Hari Libur KBM
          </p>
        </div>

        {/* Grid 13 Bulan (4 baris x 3 kolom + baris ke-5 berisi Bulan ke-13 & Legenda Kode Kegiatan) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
          {grid13Bulan.map((bulan) => (
            <div
              key={bulan.id}
              data-testid={`card-bulan-${bulan.id}`}
              className="flex border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs"
            >
              {/* Banner Vertikal Nama Bulan di Sisi Kiri (Persis Gambar 1 & 2) */}
              <div
                className={`w-8 sm:w-9 shrink-0 flex items-center justify-center border-r border-slate-300 select-none ${
                  bulan.sidebarVariant === 'amber'
                    ? 'bg-[#e69138] text-slate-950'
                    : 'bg-[#bfcf25] text-slate-950'
                }`}
              >
                <span
                  className="font-black text-[10px] sm:text-[11px] tracking-wider uppercase whitespace-nowrap"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  {bulan.titleSidebar}
                </span>
              </div>

              {/* Tabel 7 Kolom Hari (AHAD s/d SABTU) */}
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-7 border-b border-slate-300 bg-[#44546a] text-white">
                  {NAMA_HARI_KALENDER.map((hari, hIdx) => (
                    <div
                      key={hari}
                      className={`py-1 px-0.5 text-center text-[8.5px] sm:text-[9.5px] font-extrabold tracking-tight truncate ${
                        hIdx === 5 ? 'bg-[#c00000] text-white' : ''
                      }`}
                    >
                      {hari}
                    </div>
                  ))}
                </div>

                {/* Baris Minggu */}
                <div className="divide-y divide-slate-200">
                  {bulan.weeks.map((week, wIdx) => (
                    <div
                      key={`${bulan.id}-w-${wIdx}`}
                      className="grid grid-cols-7 divide-x divide-slate-200"
                    >
                      {week.map((cell) => {
                        const primaryNumber =
                          modeKalender === 'HIJRIYAH'
                            ? cell.dayHijri
                            : cell.dayMasehi;
                        const secondaryNumber =
                          modeKalender === 'HIJRIYAH'
                            ? cell.dayMasehi
                            : cell.dayHijri;
                        const ag = cell.agenda;
                        const meta = ag
                          ? KATALOG_ATURAN_KEGIATAN[ag.kode] ||
                            KATALOG_ATURAN_KEGIATAN.CUSTOM
                          : null;

                        const isDimmedByHighlight =
                          highlightKode !== null &&
                          (!ag || ag.kode !== highlightKode);

                        const stripedBgStyle =
                          meta?.isStriped
                            ? {
                                backgroundImage: `repeating-linear-gradient(135deg, ${meta.bgHex}, ${meta.bgHex} 5px, #7a2624 5px, #7a2624 9px)`,
                                color: meta.textHex,
                              }
                            : meta
                            ? {
                                backgroundColor: meta.bgHex,
                                color: meta.textHex,
                              }
                            : undefined;

                        return (
                          <button
                            key={cell.tanggalMasehi}
                            type="button"
                            data-testid={`cell-kalender-${
                              bulan.id
                            }-${cell.tanggalMasehi}`}
                            onClick={() => handleClickCellKalender(cell)}
                            title={`${cell.tanggalMasehi} (${
                              cell.dayHijri
                            } ${
                              masehiToHijri(
                                cell.tanggalMasehi,
                                currentTAConfig.hijriOffsetDays
                              ).monthName
                            } ${cell.yearHijri} H)${
                              ag
                                ? ` • [${ag.kode}] ${ag.namaKegiatan} (${
                                    ag.isLiburKbm ? 'Libur KBM' : 'KBM Masuk'
                                  })`
                                : ''
                            }`}
                            style={ag && cell.isCurrentMonth ? stripedBgStyle : undefined}
                            className={`relative h-7 sm:h-8 px-0.5 flex flex-col items-center justify-center text-center transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:z-10 ${
                              !cell.isCurrentMonth
                                ? 'bg-slate-50/70 text-slate-300'
                                : ag
                                ? 'font-extrabold shadow-2xs hover:brightness-95'
                                : cell.isFriday
                                ? 'bg-white hover:bg-rose-50/50 text-[#c00000] font-bold'
                                : 'bg-white hover:bg-emerald-50/50 text-slate-800 font-semibold'
                            } ${isDimmedByHighlight ? 'opacity-25' : ''}`}
                          >
                            {ag && cell.isCurrentMonth ? (
                              <>
                                <span className="text-[9px] sm:text-[10px] font-black leading-none tracking-tighter truncate max-w-full">
                                  {ag.kode === 'CUSTOM'
                                    ? ag.namaKegiatan.slice(0, 5).toUpperCase()
                                    : ag.kode}
                                </span>
                                <span className="text-[7.5px] leading-none opacity-85 font-mono mt-0.5">
                                  {primaryNumber}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] sm:text-[11px] font-mono leading-none">
                                  {primaryNumber}
                                </span>
                                {cell.isCurrentMonth && (
                                  <span className="text-[7px] leading-none text-slate-400 font-mono mt-0.5">
                                    {secondaryNumber}
                                  </span>
                                )}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Panel Legenda Resmi 20 Kode Kegiatan (Menempati Sisa Kolom di Baris ke-5 Seperti Gambar 1 & Gambar 2) */}
          <div className="md:col-span-1 xl:col-span-2 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Keterangan Kode Kegiatan &amp; Filter Sorotan
                </h3>
                <p className="text-[11px] text-slate-500">
                  Klik salah satu kode di bawah ini untuk menyorot tanggal kegiatan tersebut pada kalender.
                </p>
              </div>
              {highlightKode && (
                <button
                  type="button"
                  onClick={() => setHighlightKode(null)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Tampilkan Semua
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {DAFTAR_KODE_LEGENDA_RESMI.map((kode) => {
                const meta = KATALOG_ATURAN_KEGIATAN[kode];
                const isSelected = highlightKode === kode;
                const isLiburAktif =
                  aturanLiburByKode[kode] ?? meta.defaultIsLiburKbm;

                return (
                  <button
                    key={kode}
                    type="button"
                    data-testid={`legend-badge-${kode}`}
                    onClick={() =>
                      setHighlightKode((prev) => (prev === kode ? null : kode))
                    }
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/30'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span
                      style={{
                        backgroundColor: meta.bgHex,
                        color: meta.textHex,
                      }}
                      className="w-11 py-1 rounded text-center text-[9.5px] font-black shrink-0 shadow-2xs"
                    >
                      {meta.labelSingkat}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-800 truncate">
                        {meta.namaKegiatan}
                      </div>
                      <div
                        className={`text-[9.5px] font-semibold ${
                          isLiburAktif ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {isLiburAktif ? '• Libur KBM' : '• KBM Masuk'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Export Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  <span>Cetak Poster Kalender</span>
                </button>
              </div>

              <div className="px-4 py-2 rounded-lg bg-[#e69138] text-slate-950 font-black text-xs uppercase tracking-wider shadow-2xs">
                {modeKalender === 'HIJRIYAH'
                  ? 'KALENDER HIJRIYAH'
                  : 'KALENDER MASEHI'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== 4. TABEL RINCIAN AGENDA & SINKRONISASI LIBUR ABSENSI ==================== */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Daftar Rincian Tanggal Kegiatan &amp; Status Hari Libur Absensi
            </h3>
            <p className="text-xs text-slate-500">
              Setiap baris yang berstatus <strong>Libur KBM Reguler</strong> otomatis menonaktifkan sesi KBM pada menu Absensi Asatidz (Gambar 3).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(
                [
                  { id: 'ALL', label: 'Semua Agenda' },
                  { id: 'LIBUR', label: 'Meliburkan KBM' },
                  { id: 'EFEKTIF', label: 'KBM Tetap Masuk' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatusKbm(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                    filterStatusKbm === tab.id
                      ? 'bg-[#134e3a] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari kode / kegiatan / tanggal..."
                value={searchAgenda}
                onChange={(e) => setSearchAgenda(e.target.value)}
                className="pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
              />
              {searchAgenda && (
                <button
                  type="button"
                  onClick={() => setSearchAgenda('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table
            data-testid="table-rincian-agenda-kalender"
            className="w-full text-left border-collapse text-xs"
          >
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">Tanggal Masehi</th>
                <th className="py-3 px-4">Tanggal Hijriyah</th>
                <th className="py-3 px-4">Kode &amp; Kegiatan</th>
                <th className="py-3 px-4">Status di Menu Absensi</th>
                <th className="py-3 px-4">Kategori Libur (Gambar 3)</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAgendaList.map((item) => {
                const hInfo = masehiToHijri(
                  item.tanggalMasehi,
                  currentTAConfig.hijriOffsetDays
                );
                const meta =
                  KATALOG_ATURAN_KEGIATAN[item.kode] ||
                  KATALOG_ATURAN_KEGIATAN.CUSTOM;

                return (
                  <tr
                    key={item.tanggalMasehi}
                    className="hover:bg-slate-50/80"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {item.tanggalMasehi}{' '}
                      <span className="font-sans font-normal text-slate-500">
                        ({getNamaHariDariTgl(item.tanggalMasehi)}{' '}
                        {getPasaranJawa(item.tanggalMasehi)})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {hInfo.dayH} {hInfo.monthName} {hInfo.yearH} H
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            backgroundColor: meta.bgHex,
                            color: meta.textHex,
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-black shrink-0"
                        >
                          {item.kode}
                        </span>
                        <span className="font-bold text-slate-900">
                          {item.namaKegiatan}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      {item.isLiburKbm ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                          <CalendarOff className="w-3 h-3" />
                          <span>KBM Diliburkan</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>KBM Reguler Masuk</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-semibold">
                      {item.isLiburKbm ? item.kategoriLibur : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href="/absensi"
                          onClick={() =>
                            setAbsensiSelectedDate(item.tanggalMasehi)
                          }
                          data-testid={`link-buka-absensi-${item.tanggalMasehi}`}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold text-[11px]"
                        >
                          Lihat di Absensi
                        </Link>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormStartYMD(item.tanggalMasehi);
                              setFormEndYMD(item.tanggalMasehi);
                              setFormKode(item.kode);
                              setFormNamaKegiatan(item.namaKegiatan);
                              setFormIsLiburKbm(item.isLiburKbm);
                              setFormKategoriLibur(item.kategoriLibur);
                              setFormCatatan(item.catatan || '');
                              setHasExistingAgendaOnSelectedDate(true);
                              setIsAgendaModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODAL 1: ATUR AGENDA TANGGAL & SINKRON LIBUR ABSENSI ==================== */}
      {isAgendaModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-atur-agenda-kalender"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Pengaturan Agenda Kalender &amp; Hari Libur KBM
                  </h3>
                  <p className="text-[11px] text-amber-900 font-medium">
                    {formatTanggalPanjangIndo(formStartYMD)} •{' '}
                    {selectedDateHijriPreview.dayH}{' '}
                    {selectedDateHijriPreview.monthName}{' '}
                    {selectedDateHijriPreview.yearH} H
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAgendaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAgendaModal} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mulai Tanggal (Masehi)
                  </label>
                  <input
                    type="date"
                    data-testid="input-agenda-start-date"
                    value={formStartYMD}
                    onChange={(e) => {
                      setFormStartYMD(e.target.value);
                      if (e.target.value > formEndYMD) {
                        setFormEndYMD(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sampai Tanggal (Masehi)
                  </label>
                  <input
                    type="date"
                    data-testid="input-agenda-end-date"
                    value={formEndYMD}
                    onChange={(e) => setFormEndYMD(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Kegiatan Kalender
                  </label>
                  <select
                    data-testid="select-agenda-kode"
                    value={formKode}
                    onChange={(e) =>
                      handleChangeFormKode(
                        e.target.value as KodeKegiatanKalender
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
                  >
                    {(
                      Object.keys(
                        KATALOG_ATURAN_KEGIATAN
                      ) as KodeKegiatanKalender[]
                    ).map((k) => (
                      <option key={k} value={k}>
                        [{k}] {KATALOG_ATURAN_KEGIATAN[k].namaKegiatan}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama / Label Kegiatan
                  </label>
                  <input
                    type="text"
                    data-testid="input-agenda-nama"
                    value={formNamaKegiatan}
                    onChange={(e) => setFormNamaKegiatan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Sakelar Sinkronisasi Otomatis ke Pengaturan Hari Libur Absensi (Gambar 3) */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="checkbox-agenda-libur-kbm"
                    checked={formIsLiburKbm}
                    onChange={(e) => setFormIsLiburKbm(e.target.checked)}
                    className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="block text-xs font-extrabold text-amber-950">
                      Nonaktifkan / Liburkan Sesi KBM Reguler di Menu Absensi
                    </span>
                    <span className="block text-[11px] text-amber-800">
                      Jika dicentang, tanggal ini otomatis terdaftar di &quot;Pengaturan Hari Libur / Event&quot; pada menu Absensi Asatidz tanpa perlu diinput manual.
                    </span>
                  </div>
                </label>

                {formIsLiburKbm && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Kategori Libur / Event di Absensi (Gambar 3)
                    </label>
                    <select
                      data-testid="select-agenda-kategori-libur"
                      value={formKategoriLibur}
                      onChange={(e) =>
                        setFormKategoriLibur(
                          e.target.value as KategoriLiburAbsensi
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-bold text-slate-800"
                    >
                      {KATEGORI_LIBUR_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  data-testid="input-agenda-catatan"
                  placeholder="Contoh: Sesuai SK Kalender Pendidikan Pondok..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                {hasExistingAgendaOnSelectedDate && canDelete ? (
                  <button
                    type="button"
                    data-testid="btn-hapus-agenda-tanggal"
                    onClick={handleDeleteAgendaModal}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Agenda</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAgendaModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    data-testid="btn-simpan-agenda-kalender"
                    className="px-5 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer"
                  >
                    Simpan &amp; Sinkron Absensi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: ATURAN LIBUR KBM OTOMATIS & KOREKSI HILAL ==================== */}
      {isAturanModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-aturan-kalender"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Aturan Sinkronisasi Libur KBM &amp; Penyesuaian Tahun Ajaran
                </h3>
                <p className="text-xs text-slate-500">
                  Atur kode kegiatan yang otomatis meliburkan sesi KBM reguler di Absensi serta koreksi rukyatul hilal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAturanModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveAturanModal}
              className="p-6 space-y-5 max-h-[80vh] overflow-y-auto"
            >
              {/* Bagian 1: Koreksi Rukyatul Hilal & Regenerate Otomatis */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-extrabold text-emerald-950">
                    Koreksi Rukyatul Hilal ({activeTahunAjaran})
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Geser jatuhnya awal bulan Hijriyah (-2 s/d +2 hari) mengikuti ketetapan pondok.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    data-testid="select-hijri-offset"
                    value={draftHijriOffset}
                    onChange={(e) =>
                      setDraftHijriOffset(Number(e.target.value))
                    }
                    className="px-3 py-2 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-emerald-950"
                  >
                    <option value={-2}>-2 Hari</option>
                    <option value={-1}>-1 Hari</option>
                    <option value={0}>0 Hari (Sesuai Tabel Resmi)</option>
                    <option value={1}>+1 Hari</option>
                    <option value={2}>+2 Hari</option>
                  </select>

                  <button
                    type="button"
                    data-testid="btn-regenerate-ta-otomatis"
                    onClick={async () => {
                      await regenerateTahunAjaranOtomatis(
                        activeTahunAjaran,
                        draftHijriOffset,
                        currentAccount?.full_name || 'PKM. Kurikulum'
                      );
                      setIsAturanModalOpen(false);
                      showToast(
                        `Tanggal kegiatan TA ${activeTahunAjaran} berhasil dihitung ulang secara otomatis.`
                      );
                    }}
                    className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold cursor-pointer"
                  >
                    Susun Ulang Otomatis
                  </button>
                </div>
              </div>

              {/* Bagian 2: Daftar Sakelar Kode Kegiatan yang Meliburkan KBM Reguler */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2.5">
                  Daftar Kode Kegiatan yang Meliburkan Absensi KBM Reguler
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DAFTAR_KODE_LEGENDA_RESMI.map((kode) => {
                    const meta = KATALOG_ATURAN_KEGIATAN[kode];
                    const checked = Boolean(draftAturanLibur[kode]);
                    return (
                      <label
                        key={kode}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition ${
                          checked
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            style={{
                              backgroundColor: meta.bgHex,
                              color: meta.textHex,
                            }}
                            className="w-11 py-1 rounded text-center text-[9.5px] font-black shrink-0"
                          >
                            {meta.labelSingkat}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {meta.namaKegiatan}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {checked
                                ? `Libur: ${meta.kategoriLiburAbsensi}`
                                : 'KBM Reguler Masuk'}
                            </div>
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setDraftAturanLibur((prev) => ({
                              ...prev,
                              [kode]: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAturanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-simpan-aturan-kalender"
                  className="px-5 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Aturan &amp; Sinkron Absensi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default KalenderKegiatanModule;
