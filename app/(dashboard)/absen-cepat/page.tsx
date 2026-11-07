'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Users,
  BellRing,
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
import { getSesiKey, getLabelWaktuJamKBM } from '@/lib/utils/absensiHelper';
import {
  bandingkanBlokHariKBM,
  formatLabelBlokHariKBM,
  buildMasterStrukturKelasKBM,
  bandingkanUrutanKelasUniversal,
} from '@/lib/utils/jadwalHelper';
import ModalDetailAbsenCepat from '@/components/modules/absen-cepat/ModalDetailAbsenCepat';
import ModalNotifAbsenBlok from '@/components/modules/absen-cepat/ModalNotifAbsenBlok';
import ModalGeneratorWA from '@/components/modules/rekap-absensi/ModalGeneratorWA';
import ModalKirimNotifCepat from '@/components/modules/absen-cepat/ModalKirimNotifCepat';
import ModalPresensiMassal from '@/components/modules/absen-cepat/ModalPresensiMassal';

type SortOptionCepat = 'kelas_asc' | 'blok_asc' | 'nama_asc';

export default function AbsenCepatPage() {
  const {
    selectedDate,
    hari,
    selectedJam,
    sesiHariIni,
    savedRecords,
    pendingStatus,
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
  const [sortBy, setSortBy] = useState<SortOptionCepat>('blok_asc');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modals State
  const [detailSesi, setDetailSesi] = useState<SesiJadwalHarian | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isWAOpen, setIsWAOpen] = useState<boolean>(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);

  // Toast State
  const [toastMsg, setToastMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Smooth Swipe & Slide Animation State (Mode HP)
  const [swipeDragX, setSwipeDragX] = useState<number>(0);
  const [isSwipingHorizontal, setIsSwipingHorizontal] = useState<boolean>(false);
  const [slidePhase, setSlidePhase] = useState<
    'idle' | 'from-right' | 'from-left'
  >('idle');

  // Drag Selection & Double-Tap Refs
  const isDraggingSelectRef = useRef<boolean>(false);
  const dragTargetStateRef = useRef<boolean>(true);
  const isTouchDeviceRef = useRef<boolean>(false);
  const preDoubleTapSelectedRef = useRef<boolean>(false);
  const lastTapRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });
  const swipeTouchStartRef = useRef<{
    x: number;
    y: number;
    lockedAxis: 'x' | 'y' | null;
  } | null>(null);

  const isAnyModalOpen = Boolean(
    detailSesi || isNotifOpen || isWAOpen || isPushModalOpen || isBulkModalOpen
  );

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Fungsi berpindah Jam dengan animasi slide smooth
  const handleSelectJamWithSlide = useCallback(
    (targetJam: JamKbm) => {
      if (targetJam === selectedJam) return;
      const direction = targetJam > selectedJam ? 'from-right' : 'from-left';
      setSlidePhase(direction);
      setSelectedJam(targetJam);
      const timer = setTimeout(() => {
        setSlidePhase('idle');
      }, 40);
      return () => clearTimeout(timer);
    },
    [selectedJam, setSelectedJam]
  );

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

  // Hitung jumlah sesi yang telah diubah (pendingStatus) namun belum disimpan ke DB pada jam aktif
  const unsavedCountJam = useMemo(() => {
    return allSesiJam.filter((s) => {
      const k = getSesiKey(selectedDate, s);
      const p = pendingStatus[k];
      return Boolean(p && !p.isSaved);
    }).length;
  }, [allSesiJam, selectedDate, pendingStatus]);

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
          const qClean = q.replace(/\s+/g, '');
          const hay = `${s.nama} ${s.nia} ${s.kelasMengajar} ${s.fan} ${s.lokasi} ${s.blok}`.toLowerCase();
          const hayClean = hay.replace(/\s+/g, '');
          if (!hay.includes(q) && !hayClean.includes(qClean)) return false;
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
        return (
          bandingkanUrutanKelasUniversal(a.kelasMengajar, b.kelasMengajar) ||
          a.nama.localeCompare(b.nama, undefined, { sensitivity: 'base' })
        );
      });
  }, [allSesiJam, filterBlok, search, sortBy]);

  // Reset ke halaman 1 saat filter pencarian, blok, jam, urutan, atau pageSize berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedJam, filterBlok, search, sortBy, pageSize]);

  // Total Halaman
  const totalPages =
    pageSize === -1 ? 1 : Math.max(1, Math.ceil(filteredSesi.length / pageSize));

  // Peta total sesi per blok & indeks posisi item dalam bloknya di seluruh filteredSesi
  const { totalPerBlokMap, itemIndexInBlokMap, allKeysPerBlokMap } = useMemo(() => {
    const totals = new Map<string, number>();
    const indices = new Map<string, number>();
    const keysByBlok = new Map<string, string[]>();

    filteredSesi.forEach((s) => {
      const bKey = s.blok || 'Belum Diatur';
      const sKey = getSesiKey(selectedDate, s);
      const nextIdx = (totals.get(bKey) || 0) + 1;
      totals.set(bKey, nextIdx);
      indices.set(sKey, nextIdx);
      if (!keysByBlok.has(bKey)) keysByBlok.set(bKey, []);
      keysByBlok.get(bKey)!.push(sKey);
    });

    return {
      totalPerBlokMap: totals,
      itemIndexInBlokMap: indices,
      allKeysPerBlokMap: keysByBlok,
    };
  }, [filteredSesi, selectedDate]);

  // Sesi yang dipaginasi pada halaman aktif
  const paginatedSesi = useMemo(() => {
    if (pageSize === -1) return filteredSesi;
    const start = (currentPage - 1) * pageSize;
    return filteredSesi.slice(start, start + pageSize);
  }, [filteredSesi, currentPage, pageSize]);

  // Kelompokkan sesi pada halaman aktif berdasarkan Blok secara berkesinambungan
  const groupedByBlok = useMemo(() => {
    const map = new Map<string, SesiJadwalHarian[]>();
    const blokOrder: string[] = [];

    paginatedSesi.forEach((s) => {
      const bKey = s.blok || 'Belum Diatur';
      if (!map.has(bKey)) {
        map.set(bKey, []);
        blokOrder.push(bKey);
      }
      map.get(bKey)!.push(s);
    });

    return blokOrder.map((blok) => {
      const items = map.get(blok)!;
      const totalInBlok = totalPerBlokMap.get(blok) || items.length;
      const firstItemKey = getSesiKey(selectedDate, items[0]);
      const lastItemKey = getSesiKey(selectedDate, items[items.length - 1]);
      const firstIdx = itemIndexInBlokMap.get(firstItemKey) || 1;
      const lastIdx = itemIndexInBlokMap.get(lastItemKey) || items.length;
      const isLanjutan = firstIdx > 1;
      const blokKeys = allKeysPerBlokMap.get(blok) || [];

      return {
        blok,
        isLanjutan,
        labelBlok: formatLabelBlokHariKBM(blok).toUpperCase(),
        firstIdx,
        lastIdx,
        totalInBlok,
        blokKeys,
        items,
      };
    });
  }, [
    paginatedSesi,
    totalPerBlokMap,
    itemIndexInBlokMap,
    allKeysPerBlokMap,
    selectedDate,
  ]);

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

  // Toggle pilih seluruh sesi dalam 1 blok
  const handleToggleSelectBlok = (blokKeys: string[]) => {
    if (blokKeys.length === 0) return;
    const allSelected = blokKeys.every((k) => selectedKeys.includes(k));
    if (allSelected) {
      setSelectedKeys((prev) => prev.filter((k) => !blokKeys.includes(k)));
    } else {
      setSelectedKeys((prev) => Array.from(new Set([...prev, ...blokKeys])));
    }
  };

  // Handler Mouse Down / Enter untuk Drag Selection (Desktop)
  const handleCardMouseDown = (sKey: string, e: React.MouseEvent) => {
    if (isTouchDeviceRef.current) return;
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('button, a, select, input')) return;
    isDraggingSelectRef.current = true;
    const isCurrentlySelected = selectedKeys.includes(sKey);
    dragTargetStateRef.current = !isCurrentlySelected;
    toggleSelectKey(sKey, !isCurrentlySelected);
  };

  const handleCardMouseEnter = (sKey: string) => {
    if (isTouchDeviceRef.current || !isDraggingSelectRef.current) return;
    toggleSelectKey(sKey, dragTargetStateRef.current);
  };

  // Handler Klik / Double-Tap untuk memilih kartu atau membuka Modal Detail
  const handleCardClickOrDoubleTap = (
    sKey: string,
    sesi: SesiJadwalHarian,
    e: React.MouseEvent
  ) => {
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('button, a, select, input')) return;

    const now = Date.now();
    if (
      lastTapRef.current.key === sKey &&
      now - lastTapRef.current.time < 320
    ) {
      // Kembalikan state pilihan sebelum double-tap agar double-click tidak mengubah centang secara tidak sengaja
      toggleSelectKey(sKey, preDoubleTapSelectedRef.current);
      setDetailSesi(sesi);
      lastTapRef.current = { key: '', time: 0 };
      return;
    }

    preDoubleTapSelectedRef.current = selectedKeys.includes(sKey);
    if (isTouchDeviceRef.current) {
      toggleSelectKey(sKey);
    }
    lastTapRef.current = { key: sKey, time: now };
  };

  // Handler Swipe Horizontal dengan Animasi Smooth untuk berpindah Jam 1 - 4 di layar Mobile
  const handleSwipeTouchStart = (e: React.TouchEvent) => {
    isTouchDeviceRef.current = true;
    if (isAnyModalOpen || e.touches.length !== 1) return;
    const targetEl = e.target as HTMLElement;
    if (targetEl.closest('input, select, textarea')) return;

    swipeTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      lockedAxis: null,
    };
  };

  const handleSwipeTouchMove = (e: React.TouchEvent) => {
    if (
      isAnyModalOpen ||
      !swipeTouchStartRef.current ||
      e.touches.length !== 1
    ) {
      return;
    }

    const dx = e.touches[0].clientX - swipeTouchStartRef.current.x;
    const dy = e.touches[0].clientY - swipeTouchStartRef.current.y;

    if (!swipeTouchStartRef.current.lockedAxis) {
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
        swipeTouchStartRef.current.lockedAxis =
          Math.abs(dx) > Math.abs(dy) * 1.25 ? 'x' : 'y';
      }
    }

    if (swipeTouchStartRef.current.lockedAxis === 'x') {
      // Berikan efek rubber-band halus ketika berada di ujung Jam 1 atau Jam 4
      const isAtEdge =
        (selectedJam === 1 && dx > 0) || (selectedJam === 4 && dx < 0);
      const damping = isAtEdge ? 0.16 : 0.42;
      const clampedOffset = Math.max(-110, Math.min(110, dx * damping));
      setIsSwipingHorizontal(true);
      setSwipeDragX(clampedOffset);
    }
  };

  const handleSwipeTouchEnd = (e: React.TouchEvent) => {
    if (
      isAnyModalOpen ||
      !swipeTouchStartRef.current ||
      e.changedTouches.length !== 1
    ) {
      setSwipeDragX(0);
      setIsSwipingHorizontal(false);
      swipeTouchStartRef.current = null;
      return;
    }

    const deltaX = e.changedTouches[0].clientX - swipeTouchStartRef.current.x;
    const deltaY = Math.abs(
      e.changedTouches[0].clientY - swipeTouchStartRef.current.y
    );
    const lockedAxis = swipeTouchStartRef.current.lockedAxis;

    swipeTouchStartRef.current = null;
    setSwipeDragX(0);
    setIsSwipingHorizontal(false);

    if (
      (lockedAxis === 'x' || Math.abs(deltaX) > deltaY * 1.3) &&
      Math.abs(deltaX) > 55 &&
      deltaY < 65
    ) {
      if (deltaX < 0 && selectedJam < 4) {
        handleSelectJamWithSlide((selectedJam + 1) as JamKbm);
      } else if (deltaX > 0 && selectedJam > 1) {
        handleSelectJamWithSlide((selectedJam - 1) as JamKbm);
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
      `Status "${status}" diterapkan pada ${count} pengajar. Jangan lupa klik "Simpan Jam Ini".`
    );
  };

  const handleTandaiSemuaHadir = () => {
    tandaiSemuaHadirJam(selectedJam);
    showToast(
      'success',
      `Semua sesi pada Jam Ke-${selectedJam} ditandai Hadir. Klik "Simpan Jam Ini" untuk menyimpan.`
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

  const waktuInfo = getLabelWaktuJamKBM(selectedJam);

  // Hitung gaya transformasi untuk efek swipe & slide yang halus (Smooth 60fps)
  const slideTransformStyle: React.CSSProperties = useMemo(() => {
    if (isSwipingHorizontal && swipeDragX !== 0) {
      return {
        transform: `translate3d(${swipeDragX}px, 0, 0)`,
        transition: 'none',
        willChange: 'transform',
      };
    }
    if (slidePhase === 'from-right') {
      return {
        transform: 'translate3d(28px, 0, 0)',
        opacity: 0.35,
        transition: 'none',
        willChange: 'transform, opacity',
      };
    }
    if (slidePhase === 'from-left') {
      return {
        transform: 'translate3d(-28px, 0, 0)',
        opacity: 0.35,
        transition: 'none',
        willChange: 'transform, opacity',
      };
    }
    return {
      transform: 'translate3d(0, 0, 0)',
      opacity: 1,
      transition:
        'transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease-out',
    };
  }, [isSwipingHorizontal, swipeDragX, slidePhase]);

  return (
    <div
      className="space-y-4 pb-10 select-none overflow-x-hidden"
      onTouchStart={handleSwipeTouchStart}
      onTouchMove={handleSwipeTouchMove}
      onTouchEnd={handleSwipeTouchEnd}
    >
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-20 md:bottom-5 right-4 md:right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold animate-in fade-in slide-in-from-bottom-4 ${
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
            const hasPendingJam = listJ.some((s) => {
              const p = pendingStatus[getSesiKey(selectedDate, s)];
              return Boolean(p && !p.isSaved);
            });
            const isActive = selectedJam === j;

            return (
              <button
                key={j}
                type="button"
                onClick={() => handleSelectJamWithSlide(j)}
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
                {!isComplete && hasPendingJam && (
                  <span
                    title="Ada perubahan status yang belum disimpan pada jam ini"
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          PANEL KONTROL JAM AKTIF + FILTER & AKSI MASSAL (DENGAN ANIMASI SLIDE)
      ==================================================================== */}
      <div
        data-testid="absen-cepat-jam-panel"
        style={slideTransformStyle}
        className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden"
      >
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
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-xs ${waktuInfo.badgeClass}`}
                  title={waktuInfo.deskripsi}
                >
                  {waktuInfo.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span>
                  Progres: <strong>{savedCountJam}</strong> dari{' '}
                  <strong>{allSesiJam.length}</strong> sesi diabsen
                </span>
                {unsavedCountJam > 0 && (
                  <span
                    data-testid="badge-unsaved-changes"
                    className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px]"
                  >
                    {unsavedCountJam} perubahan belum disimpan
                  </span>
                )}
              </div>
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
                  onClick={() => handleBulkStatus('Hadir')}
                  className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Hadir
                </button>
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

            {/* Tombol Penetapan Presensi Massal (Inspirasi LPTQ) */}
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Presensi Massal</span>
            </button>

            <button
              type="button"
              onClick={() => setIsWAOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              Chat WA
            </button>

            {/* Tombol Kirim Notif (Web Push ke HP) */}
            <button
              type="button"
              onClick={() => setIsPushModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-xs transition-colors"
            >
              <BellRing className="w-3.5 h-3.5 text-emerald-200" />
              Kirim Notif
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
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50 ${
                unsavedCountJam > 0
                  ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving
                ? 'Menyimpan...'
                : unsavedCountJam > 0
                ? `Simpan Jam Ini (${unsavedCountJam})`
                : 'Simpan Jam Ini'}
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
              <option value="blok_asc">Urut: Blok &amp; Kelas (Rekomendasi)</option>
              <option value="kelas_asc">Urut: Seluruh Kelas (Lintas Blok)</option>
              <option value="nama_asc">Urut: Nama Asatidz (A-Z)</option>
            </select>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={15}>15 Sesi / Hal</option>
              <option value={25}>25 Sesi / Hal</option>
              <option value={50}>50 Sesi / Hal</option>
              <option value={-1}>Semua Sesi</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="hidden md:inline text-slate-400">
              Klik/Tahan-Geser: Pilih • Klik 2x: Detail &amp; Status
            </span>
            <span className="font-semibold">
              Menampilkan:{' '}
              <strong>
                {pageSize === -1 || filteredSesi.length === 0
                  ? filteredSesi.length
                  : `${(currentPage - 1) * pageSize + 1} - ${Math.min(
                      currentPage * pageSize,
                      filteredSesi.length
                    )}`}
              </strong>{' '}
              dari <strong>{filteredSesi.length}</strong> Sesi
              {pageSize !== -1 && totalPages > 1 && (
                <span className="ml-1 text-slate-400 font-normal">
                  (Hal {currentPage}/{totalPages})
                </span>
              )}
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
            groupedByBlok.map((group) => {
              const isAllBlokSelected =
                group.blokKeys.length > 0 &&
                group.blokKeys.every((k) => selectedKeys.includes(k));

              return (
                <div key={group.blok} className="space-y-2">
                  {/* Banner Header Kelompok Blok */}
                  <div
                    data-testid="group-blok-header"
                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-lg bg-emerald-50/90 border border-emerald-200/80"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-700" />
                      <span className="text-xs font-extrabold text-emerald-900 tracking-wide flex items-center gap-1.5">
                        <span>{group.labelBlok}</span>
                        {group.isLanjutan && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-200/80 text-emerald-800">
                            (Lanjutan)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectBlok(group.blokKeys)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors"
                      >
                        {isAllBlokSelected ? 'Batal Pilih Blok' : 'Pilih Blok'}
                      </button>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold">
                        {group.totalInBlok > group.items.length
                          ? `Sesi ${group.firstIdx} - ${group.lastIdx} dari ${group.totalInBlok} Asatidz`
                          : `${group.items.length} Asatidz`}
                      </span>
                    </div>
                  </div>

                  {/* Daftar Baris Kartu Ringkas */}
                  <div className="space-y-1.5">
                    {group.items.map((sesi) => {
                      const sKey = getSesiKey(selectedDate, sesi);
                      const stData = getSesiStatusData(sesi);
                      const vis = getStatusVisual(stData.status || 'Hadir');
                      const isSelected = selectedKeys.includes(sKey);
                      const hasUnsavedItem = Boolean(
                        pendingStatus[sKey] && !pendingStatus[sKey].isSaved
                      );

                      return (
                        <div
                          key={sKey}
                          onMouseDown={(e) => handleCardMouseDown(sKey, e)}
                          onMouseEnter={() => handleCardMouseEnter(sKey)}
                          onClick={(e) => handleCardClickOrDoubleTap(sKey, sesi, e)}
                          onDoubleClick={() => setDetailSesi(sesi)}
                          className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500'
                              : hasUnsavedItem
                              ? 'bg-amber-50/30 hover:bg-amber-50/60 border-amber-300'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectKey(sKey)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
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
                            <span
                              data-testid="badge-kelas-cepat"
                              className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[11px] shrink-0"
                            >
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

                          {/* Sisi Kanan: Indikator Status Non-Hadir / Belum Disimpan / Tersimpan */}
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
                            {hasUnsavedItem && (
                              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                Belum disimpan
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
              );
            })
          )}
        </div>

        {/* Footer Pagination Halaman Absen Cepat */}
        {pageSize !== -1 && totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 font-medium">
              Menampilkan{' '}
              <strong>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
              <strong>{Math.min(currentPage * pageSize, filteredSesi.length)}</strong>{' '}
              dari <strong>{filteredSesi.length}</strong> Sesi (Halaman{' '}
              <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
              >
                Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => {
                if (
                  num === 1 ||
                  num === totalPages ||
                  (num >= currentPage - 2 && num <= currentPage + 2)
                ) {
                  const isActive = num === currentPage;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCurrentPage(num)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition border ${
                        isActive
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  );
                }
                if (num === currentPage - 3 || num === currentPage + 3) {
                  return (
                    <span key={num} className="px-1 text-slate-400">
                      ...
                    </span>
                  );
                }
                return null;
              })}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
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

      <ModalKirimNotifCepat
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        initialJam={selectedJam}
      />

      <ModalPresensiMassal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        tanggal={selectedDate}
        initialJam={selectedJam}
        sesiHariIni={sesiHariIni}
        getSesiStatusData={getSesiStatusData}
        daftarBlok={daftarBlokUnik}
        onJamChange={(jam) => {
          handleSelectJamWithSlide(jam);
        }}
        onApplyBulk={(jam, sKeys, status) => {
          terapkanStatusMassal(jam, sKeys, status);
          showToast(
            'success',
            `Status "${status}" diterapkan ke ${sKeys.length} asatidz Jam Ke-${jam}. Klik "Simpan Jam Ini" untuk menyimpan.`
          );
        }}
        onQuickChangeSingle={(sesi, updates) => {
          setSesiStatusData(sesi, updates);
          showToast(
            'success',
            `Status "${updates.status}" diterapkan untuk ${sesi.nama}.`
          );
        }}
      />
    </div>
  );
}
