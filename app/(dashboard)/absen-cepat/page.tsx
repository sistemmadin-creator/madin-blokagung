'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Zap,
  Calendar,
  Bell,
  MessageSquare,
  CheckCheck,
  Save,
  Search,
  X,
  Building2,
  Check,
  CheckCircle2,
  CalendarOff,
} from 'lucide-react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useFanStore } from '@/stores/useFanStore';
import {
  JamKbm,
  SesiJadwalHarian,
  StatusAbsensi,
} from '@/types/absensi';
import { getSesiKey } from '@/lib/utils/absensiHelper';
import {
  bandingkanBlokHariKBM,
  formatLabelBlokHariKBM,
  buildMasterStrukturKelasKBM,
} from '@/lib/utils/jadwalHelper';
import ModalDetailAbsenCepat from '@/components/modules/absen-cepat/ModalDetailAbsenCepat';
import ModalNotifAbsenBlok from '@/components/modules/absen-cepat/ModalNotifAbsenBlok';
import ModalGeneratorWA from '@/components/modules/rekap-absensi/ModalGeneratorWA';

type SortOptionCepat = 'kelas_asc' | 'blok_asc' | 'nama_asc';

export default function AbsenCepatPage() {
  const {
    selectedDate,
    hari,
    selectedJam,
    sesiHariIni,
    savedRecords,
    liburMapByDate,
    setSelectedDate,
    setSelectedJam,
    fetchAbsensi,
    syncSesiHariIni,
    getSesiStatusData,
    setSesiStatusData,
    terapkanStatusMassal,
    tandaiSemuaHadirJam,
    simpanAbsensiJam,
  } = useAbsensiStore();

  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { jadwalMap, fetchJadwal } = useJadwalStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { fanConfig, fetchFanData } = useFanStore();

  // Filter & Selection State
  const [search, setSearch] = useState<string>('');
  const [filterBlok, setFilterBlok] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOptionCepat>('kelas_asc');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modals State
  const [detailSesi, setDetailSesi] = useState<SesiJadwalHarian | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isWAOpen, setIsWAOpen] = useState<boolean>(false);

  // Toast State
  const [toastMsg, setToastMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Drag Selection & Double-Tap Refs
  const isDraggingSelectRef = useRef<boolean>(false);
  const dragTargetStateRef = useRef<boolean>(true);
  const lastTapRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const swipeTouchStartRef = useRef<{ x: number; y: number } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3200);
  };

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

  // Reset pilihan saat berganti tanggal atau jam
  useEffect(() => {
    setSelectedKeys([]);
  }, [selectedDate, selectedJam]);

  // Global mouseup listener untuk mengakhiri drag-select
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingSelectRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const currentLibur = liburMapByDate[selectedDate] || null;
  const isHariJumat = hari === 'Jumat';
  const allSesiJam = useMemo(
    () => sesiHariIni[selectedJam] || [],
    [sesiHariIni, selectedJam]
  );

  // Hitung progres sesi yang sudah tersimpan pada jam aktif
  const savedCountJam = useMemo(() => {
    return allSesiJam.filter((s) => {
      const k = getSesiKey(selectedDate, s);
      return Boolean(savedRecords[k]);
    }).length;
  }, [allSesiJam, selectedDate, savedRecords]);

  // Daftar Blok unik untuk dropdown filter
  const daftarBlokUnik = useMemo(() => {
    const setBlok = new Set<string>();
    ([1, 2, 3, 4] as JamKbm[]).forEach((j) => {
      (sesiHariIni[j] || []).forEach((s) => {
        if (s.blok) setBlok.add(s.blok);
      });
    });
    return Array.from(setBlok).sort((a, b) => bandingkanBlokHariKBM(a, b));
  }, [sesiHariIni]);

  // Filter & Sort Sesi pada jam aktif
  const filteredSesi = useMemo(() => {
    return allSesiJam
      .filter((s) => {
        if (
          filterBlok !== 'ALL' &&
          formatLabelBlokHariKBM(s.blok) !== formatLabelBlokHariKBM(filterBlok)
        ) {
          return false;
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const hay = `${s.nama} ${s.nia} ${s.kelasMengajar} ${s.fan} ${s.lokasi} ${s.blok}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => {
        if (sortBy === 'nama_asc') {
          return a.nama.localeCompare(b.nama, undefined, {
            sensitivity: 'base',
          });
        }
        if (sortBy === 'blok_asc') {
          const cmpB = bandingkanBlokHariKBM(a.blok, b.blok);
          if (cmpB !== 0) return cmpB;
        }
        return a.kelasMengajar.localeCompare(b.kelasMengajar, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
  }, [allSesiJam, filterBlok, search, sortBy]);

  // Kelompokkan berdasarkan Blok (mengikuti urutan bandingkanBlokHariKBM)
  const groupedByBlok = useMemo(() => {
    const map = new Map<string, SesiJadwalHarian[]>();
    filteredSesi.forEach((s) => {
      const bKey = s.blok || 'Belum Diatur';
      if (!map.has(bKey)) map.set(bKey, []);
      map.get(bKey)!.push(s);
    });

    const sortedKeys = Array.from(map.keys()).sort((a, b) =>
      bandingkanBlokHariKBM(a, b)
    );

    return sortedKeys.map((blok) => ({
      blok,
      labelBlok: formatLabelBlokHariKBM(blok).toUpperCase(),
      items: map.get(blok)!,
    }));
  }, [filteredSesi]);

  // Toggle pilih 1 kartu
  const toggleSelectKey = (sKey: string, forceValue?: boolean) => {
    setSelectedKeys((prev) => {
      const exists = prev.includes(sKey);
      const target = forceValue !== undefined ? forceValue : !exists;
      if (target && !exists) return [...prev, sKey];
      if (!target && exists) return prev.filter((k) => k !== sKey);
      return prev;
    });
  };

  // Handler Mouse Down / Enter untuk Drag Selection
  const handleCardMouseDown = (sKey: string, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    isDraggingSelectRef.current = true;
    const isCurrentlySelected = selectedKeys.includes(sKey);
    dragTargetStateRef.current = !isCurrentlySelected;
    toggleSelectKey(sKey, !isCurrentlySelected);
  };

  const handleCardMouseEnter = (sKey: string) => {
    if (!isDraggingSelectRef.current) return;
    toggleSelectKey(sKey, dragTargetStateRef.current);
  };

  // Handler Klik / Double-Tap Mobile untuk membuka Modal Detail
  const handleCardClickOrDoubleTap = (
    sKey: string,
    sesi: SesiJadwalHarian
  ) => {
    const now = Date.now();
    if (
      lastTapRef.current.key === sKey &&
      now - lastTapRef.current.time < 320
    ) {
      setDetailSesi(sesi);
      lastTapRef.current = { key: '', time: 0 };
      return;
    }
    lastTapRef.current = { key: sKey, time: now };
  };

  // Handler Swipe Horizontal untuk berpindah Jam 1 - 4 di layar Mobile
  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    swipeTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    if (!swipeTouchStartRef.current || e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - swipeTouchStartRef.current.x;
    const deltaY = Math.abs(
      e.changedTouches[0].clientY - swipeTouchStartRef.current.y
    );
    swipeTouchStartRef.current = null;

    if (Math.abs(deltaX) > 70 && deltaY < 45) {
      if (deltaX < 0 && selectedJam < 4) {
        setSelectedJam((selectedJam + 1) as JamKbm);
      } else if (deltaX > 0 && selectedJam > 1) {
        setSelectedJam((selectedJam - 1) as JamKbm);
      }
    }
  };

  // Handler Aksi Massal
  const handleBulkStatus = (status: StatusAbsensi) => {
    if (selectedKeys.length === 0) return;
    terapkanStatusMassal(selectedJam, selectedKeys, status);
    const count = selectedKeys.length;
    setSelectedKeys([]);
    showToast(
      'success',
      `Status "${status}" diterapkan pada ${count} pengajar.`
    );
  };

  const handleTandaiSemuaHadir = () => {
    tandaiSemuaHadirJam(selectedJam);
    showToast(
      'success',
      `Semua sesi pada Jam Ke-${selectedJam} ditandai Hadir.`
    );
  };

  const handleSimpanJamIni = async () => {
    setIsSaving(true);
    const res = await simpanAbsensiJam(selectedJam);
    setIsSaving(false);
    if (res.success) {
      setSelectedKeys([]);
      showToast(
        'success',
        `Berhasil menyimpan ${res.count} sesi absensi Jam Ke-${selectedJam}!`
      );
    } else {
      showToast(
        'error',
        res.message || `Gagal menyimpan absensi Jam Ke-${selectedJam}.`
      );
    }
  };

  const getStatusVisual = (status: StatusAbsensi | '') => {
    switch (status) {
      case 'Hadir':
      default:
        return {
          symbol: '✓',
          label: 'Hadir',
          circleClass: 'bg-emerald-100 text-emerald-700 border-emerald-300',
          pillClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      case 'Izin':
        return {
          symbol: 'I',
          label: 'Izin',
          circleClass: 'bg-sky-100 text-sky-700 border-sky-300',
          pillClass: 'bg-sky-50 text-sky-700 border-sky-200',
        };
      case 'Sakit':
        return {
          symbol: 'S',
          label: 'Sakit',
          circleClass: 'bg-amber-100 text-amber-800 border-amber-300',
          pillClass: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'Alfa':
      case 'Jadwal Kosong':
        return {
          symbol: 'A',
          label: status === 'Jadwal Kosong' ? 'Kosong' : 'Alfa',
          circleClass: 'bg-rose-100 text-rose-700 border-rose-300',
          pillClass: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'Terlambat':
        return {
          symbol: 'T',
          label: 'Terlambat',
          circleClass: 'bg-orange-100 text-orange-800 border-orange-300',
          pillClass: 'bg-orange-50 text-orange-800 border-orange-200',
        };
      case 'Digantikan':
      case 'Badal':
        return {
          symbol: 'B',
          label: 'Digantikan',
          circleClass: 'bg-purple-100 text-purple-700 border-purple-300',
          pillClass: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'Tugas Lain':
      case 'Tugas':
        return {
          symbol: 'L',
          label: 'Tugas Lain',
          circleClass: 'bg-slate-200 text-slate-700 border-slate-300',
          pillClass: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const waktuLabel =
    selectedJam === 4 ? '(Malam Sebelumnya)' : '(Siang Hari)';

  return (
    <div
      className="space-y-4 pb-10 select-none"
      onTouchStart={handleSwipeTouchStart}
      onTouchEnd={handleSwipeTouchEnd}
    >
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

      {/* ====================================================================
          HEADER UTAMA: JUDUL, PEMILIH TANGGAL, TOMBOL NOTIF, & TAB JAM 1-4
      ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">
              Absen Cepat
            </h1>
            <p className="text-[11px] text-slate-500">
              Mode presensi ringkas dikelompokkan per Blok Kelas
            </p>
          </div>

          {/* Date Picker + Badge Hari */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 gap-2 ml-0 sm:ml-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
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

          {/* Tombol Notif Monitoring Blok */}
          <button
            type="button"
            onClick={() => setIsNotifOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            Notif
          </button>
        </div>

        {/* Tombol Bulat Pemilih Jam 1, 2, 3, 4 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">
            Pilih Jam:
          </span>
          {([1, 2, 3, 4] as JamKbm[]).map((j) => {
            const listJ = sesiHariIni[j] || [];
            const isComplete =
              listJ.length > 0 &&
              listJ.every((s) => Boolean(savedRecords[getSesiKey(selectedDate, s)]));
            const isActive = selectedJam === j;

            return (
              <button
                key={j}
                type="button"
                onClick={() => setSelectedJam(j)}
                aria-label={`Jam Ke-${j}`}
                className={`relative w-10 h-10 rounded-full font-extrabold text-xs flex items-center justify-center transition-all border ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-md scale-105'
                    : isComplete
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{j}</span>
                {isComplete && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          PANEL KONTROL JAM AKTIF + FILTER & AKSI MASSAL
      ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Baris Kontrol Atas */}
        <div className="px-4 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-extrabold shadow-sm">
              Jam Ke-{selectedJam}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-extrabold text-slate-800">
                  Daftar Pengajar Jam Ke-{selectedJam}
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  {waktuLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Progres: <strong>{savedCountJam}</strong> dari{' '}
                <strong>{allSesiJam.length}</strong> sesi diabsen
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toolbar Aksi Massal Kontekstual */}
            {selectedKeys.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-lg">
                <span className="text-[11px] font-extrabold text-amber-900 mr-1">
                  {selectedKeys.length} Dipilih:
                </span>
                <button
                  type="button"
                  onClick={() => handleBulkStatus('Izin')}
                  className="px-2 py-1 rounded text-[11px] font-bold bg-sky-600 text-white hover:bg-sky-700"
                >
                  Izin
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStatus('Sakit')}
                  className="px-2 py-1 rounded text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-600"
                >
                  Sakit
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkStatus('Alfa')}
                  className="px-2 py-1 rounded text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700"
                >
                  Alfa
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedKeys([])}
                  className="px-2 py-1 rounded text-[11px] font-semibold text-slate-600 hover:bg-amber-100"
                >
                  Batal
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsWAOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              Chat WA
            </button>

            <button
              type="button"
              onClick={handleTandaiSemuaHadir}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              Tandai Semua Hadir
            </button>

            <button
              type="button"
              disabled={isSaving || allSesiJam.length === 0}
              onClick={handleSimpanJamIni}
              aria-label="Simpan Jam Ini"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Menyimpan...' : 'Simpan Jam Ini'}
            </button>
          </div>
        </div>

        {/* Baris Filter Pencarian, Blok, & Urutan */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[210px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Asatidz / Kelas..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={filterBlok}
              onChange={(e) => setFilterBlok(e.target.value)}
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
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOptionCepat)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="kelas_asc">Urut: Kelas (A-Z)</option>
              <option value="blok_asc">Urut: Blok (Kecil-Besar)</option>
              <option value="nama_asc">Urut: Nama (A-Z)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="hidden md:inline text-slate-400">
              Klik/Tahan-Geser: Pilih • Klik 2x: Detail & Status
            </span>
            <span className="font-semibold">
              Menampilkan: <strong>{filteredSesi.length}</strong> dari{' '}
              <strong>{allSesiJam.length}</strong> Sesi
            </span>
          </div>
        </div>

        {/* ==================================================================
            DAFTAR KARTU RINGKAS DIKELOMPOKKAN PER BLOK
        ================================================================== */}
        <div className="p-4 space-y-5">
          {currentLibur ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <CalendarOff className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">
                Hari Libur / Event: {currentLibur.kategori}
              </h3>
              <p className="text-xs text-slate-500">
                {currentLibur.keterangan || 'KBM reguler diliburkan pada tanggal ini.'}
              </p>
            </div>
          ) : isHariJumat ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <CalendarOff className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-800">
                Hari Jumat (Libur Reguler KBM)
              </h3>
              <p className="text-xs text-slate-500">
                Tidak ada sesi jadwal KBM reguler pada hari Jumat.
              </p>
            </div>
          ) : groupedByBlok.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada sesi pengajar yang sesuai kriteria pada Jam Ke-{selectedJam}.
            </div>
          ) : (
            groupedByBlok.map((group) => (
              <div key={group.blok} className="space-y-2">
                {/* Banner Header Kelompok Blok (Hijau Khas Gambar 4) */}
                <div className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-emerald-50/90 border border-emerald-200/80">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-extrabold text-emerald-900 tracking-wide">
                      {group.labelBlok}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">
                    {group.items.length} Asatidz
                  </span>
                </div>

                {/* Daftar Baris Kartu Ringkas */}
                <div className="space-y-1.5">
                  {group.items.map((sesi) => {
                    const sKey = getSesiKey(selectedDate, sesi);
                    const stData = getSesiStatusData(sesi);
                    const vis = getStatusVisual(stData.status || 'Hadir');
                    const isSelected = selectedKeys.includes(sKey);

                    return (
                      <div
                        key={sKey}
                        onMouseDown={(e) => handleCardMouseDown(sKey, e)}
                        onMouseEnter={() => handleCardMouseEnter(sKey)}
                        onClick={() => handleCardClickOrDoubleTap(sKey, sesi)}
                        onDoubleClick={() => setDetailSesi(sesi)}
                        className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 pointer-events-none shrink-0"
                          />

                          {/* Badge Bulat Status (✓ / I / S / A / T / B) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSesi(sesi);
                            }}
                            title={`Status: ${vis.label} (Klik untuk ubah detail)`}
                            className={`w-6 h-6 rounded-full border text-[11px] font-extrabold flex items-center justify-center shrink-0 transition-transform hover:scale-110 ${vis.circleClass}`}
                          >
                            {vis.symbol}
                          </button>

                          {/* Badge Kelas Mengajar */}
                          <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[11px] shrink-0">
                            {sesi.kelasMengajar}
                          </span>

                          {/* Nama Asatidz */}
                          <span className="font-bold text-xs text-slate-800 truncate">
                            {sesi.nama}
                          </span>

                          {sesi.isBentrok && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-extrabold text-[9px] uppercase shrink-0">
                              Bentrok
                            </span>
                          )}
                        </div>

                        {/* Sisi Kanan: Indikator Status Non-Hadir / Tersimpan */}
                        <div className="flex items-center gap-2 shrink-0">
                          {stData.status && stData.status !== 'Hadir' && (
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${vis.pillClass}`}
                            >
                              {vis.label}
                              {stData.namaPengganti
                                ? `: ${stData.namaPengganti}`
                                : stData.menitTerlambat
                                ? ` (${stData.menitTerlambat}m)`
                                : ''}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailSesi(sesi);
                            }}
                            className="text-[10px] font-semibold text-slate-400 hover:text-emerald-700 px-1.5 py-0.5 rounded hover:bg-slate-100"
                          >
                            Detail
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ====================================================================
          MODALS
      ==================================================================== */}
      <ModalDetailAbsenCepat
        isOpen={Boolean(detailSesi)}
        onClose={() => setDetailSesi(null)}
        sesi={detailSesi}
        statusData={detailSesi ? getSesiStatusData(detailSesi) : null}
        asatidzList={asatidzList}
        onApply={(sesi, updates) => {
          setSesiStatusData(sesi, updates);
          showToast(
            'success',
            `Status "${updates.status}" diterapkan untuk ${sesi.nama}.`
          );
        }}
      />

      <ModalNotifAbsenBlok
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        tanggal={selectedDate}
        sesiHariIni={sesiHariIni}
        savedRecords={savedRecords}
        currentJam={selectedJam}
      />

      <ModalGeneratorWA
        isOpen={isWAOpen}
        onClose={() => setIsWAOpen(false)}
        initialJam={selectedJam}
      />
    </div>
  );
}
