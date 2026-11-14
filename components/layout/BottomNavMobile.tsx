'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  BookOpen,
  Award,
  ClipboardCheck,
  Settings,
  Home,
  Calendar,
  CalendarDays,
  Building2,
  BookMarked,
  GraduationCap,
  Grid,
  BarChart2,
  Zap,
  ShieldCheck,
  Newspaper,
  LayoutDashboard,
  BellRing,
  MessageSquare,
  FileText,
  Package,
  Wrench,
  CheckSquare,
} from 'lucide-react';
import ModalHierarchyBuilder from '@/components/modules/settings/ModalHierarchyBuilder';
import ModalAuditLogs from '@/components/modules/settings/ModalAuditLogs';
import { useRbacStore } from '@/stores/useRbacStore';
import { canAccessSettingsAuthority } from '@/lib/utils/rbacHelper';
import { useTableViewerStore } from '@/stores/useTableViewerStore';
import FloatingTableTools from '@/components/common/FloatingTableTools';

export default function BottomNavMobile() {
  const pathname = usePathname();
  const router = useRouter();
  const currentAccount = useRbacStore((s) => s.currentAccount);
  const toggleFloatingTools = useTableViewerStore((s) => s.toggleFloatingTools);

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [isHoldingBeranda, setIsHoldingBeranda] = useState(false);

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // Mulai hitung tekan tahan 1.5 detik (Long Press)
  const startBerandaLongPress = () => {
    isLongPressRef.current = false;
    setIsHoldingBeranda(true);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsHoldingBeranda(false);
      // Haptic feedback saat 1.5 detik tercapai
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 50, 40]);
      }
      setActiveMenu(null);
      toggleFloatingTools();
    }, 1500);
  };

  // Batalkan tekan tahan jika jari dilepas sebelum 1.5 detik
  const cancelBerandaLongPress = () => {
    setIsHoldingBeranda(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Handler klik / ketuk tombol Beranda
  const handleBerandaClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Jika aksi tekan tahan 1.5 detik baru saja terpicu, jangan proses ketukan!
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    tapCountRef.current += 1;
    const currentCount = tapCountRef.current;

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }

    // Jeda debounce 220ms untuk membedakan ketuk 1x (Beranda) dan ketuk 2x (Opsi)
    tapTimerRef.current = setTimeout(() => {
      const finalCount = tapCountRef.current;
      tapCountRef.current = 0;

      if (finalCount === 1) {
        // Ketuk 1x: Langsung navigasi ke Halaman Beranda Direktori Modul (Gambar 1)
        setActiveMenu(null);
        router.push('/beranda');
      } else if (finalCount === 2) {
        // Ketuk 2x: Langsung buka menu Opsi / Pengaturan
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(40);
        }
        setActiveMenu((prev) => (prev === 'pengaturan' ? null : 'pengaturan'));
      }
    }, 220);
  };

  const allowSettings = canAccessSettingsAuthority(currentAccount);

  const toggleDropup = (key: string) => {
    setActiveMenu((prev) => (prev === key ? null : key));
  };

  return (
    <>
      {/* Backdrop overlay saat dropup terbuka */}
      {activeMenu && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setActiveMenu(null)}
        />
      )}

      {/* 1. Dropup Menu Grup: UTAMA */}
      {activeMenu === 'utama' && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[45] md:hidden space-y-1 animate-in slide-in-from-bottom-4 duration-200">
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Utama
          </div>
          <Link
            href="/dashboard"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <span>Dashboard Eksekutif</span>
          </Link>
          <Link
            href="/santri"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <span>Data Santri</span>
          </Link>
          <Link
            href="/asatidz"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <span>Data Asatidz</span>
          </Link>
          <Link
            href="/catatan"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <span>Catatan & To-Do List</span>
          </Link>
          <Link
            href="/kelola-berita"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-sm font-semibold text-amber-900 border-t border-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Newspaper className="w-4 h-4" />
            </div>
            <span>Kelola Berita</span>
          </Link>
          <div className="px-3 pt-2 pb-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100">
            PKM. Sapras
          </div>
          <Link
            href="/sapras/inventaris-kelas"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-sm font-semibold text-slate-800"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
            <span>Inventaris Kelas (Papan & Meja Guru)</span>
          </Link>
          <Link
            href="/sapras/perbaikan"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Wrench className="w-4 h-4" />
            </div>
            <span>Kerusakan & Perbaikan Sapras</span>
          </Link>
        </div>
      )}

      {/* 2. Dropup Menu Grup: KURIKULUM */}
      {activeMenu === 'kurikulum' && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[45] md:hidden space-y-1 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            PKM. Kurikulum
          </div>
          <Link
            href="/jadwal-kbm"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Calendar className="w-4 h-4 text-cyan-600" />
            <span>Jadwal KBM Per Kelas</span>
          </Link>
          <Link
            href="/hari-kbm"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <CalendarDays className="w-4 h-4 text-amber-600" />
            <span>Hari KBM</span>
          </Link>
          <Link
            href="/kalender-kegiatan"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>Kalender Kegiatan</span>
          </Link>
          <hr className="my-1 border-slate-100" />
          <Link
            href="/formasi"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Formasi Kelas Madin (Master)</span>
          </Link>
          <Link
            href="/formasi/pa"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Formasi Kelas Putra (PA)</span>
          </Link>
          <Link
            href="/formasi/pi"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <Building2 className="w-4 h-4 text-rose-500" />
            <span>Formasi Kelas Putri (PI)</span>
          </Link>
          <hr className="my-1 border-slate-100" />
          <Link
            href="/fan/pelajaran"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <BookMarked className="w-4 h-4 text-emerald-600" />
            <span>Fan Pelajaran</span>
          </Link>
          <Link
            href="/daftar-pendidik"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            <GraduationCap className="w-4 h-4 text-slate-600" />
            <span>Daftar Pendidik</span>
          </Link>
        </div>
      )}

      {/* 3. Dropup Menu Grup: MUHAFADZOH */}
      {activeMenu === 'muhafadzoh' && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[45] md:hidden space-y-1 animate-in slide-in-from-bottom-4 duration-200">
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            PKM. Muhafadzoh
          </div>
          <Link
            href="/setoran"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <Grid className="w-4 h-4 text-emerald-600" />
            <span>Setoran Muhafadzoh</span>
          </Link>
          <Link
            href="/setor-mustahiq"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <BookOpen className="w-4 h-4 text-teal-600" />
            <span>Setor Kelas (Mustahiq)</span>
          </Link>
          <Link
            href="/setor-mustahiq/rekap"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <BarChart2 className="w-4 h-4 text-emerald-700" />
            <span>Rekap Setor Mustahiq</span>
          </Link>
          <Link
            href="/setor-cepat"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Setor Cepat</span>
          </Link>
          <Link
            href="/linimasa-setor"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-sm font-semibold text-emerald-800"
          >
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>Linimasa Setor Santri</span>
          </Link>
          <Link
            href="/rekap-hafalan"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <BarChart2 className="w-4 h-4 text-cyan-600" />
            <span>Rekap Hafalan</span>
          </Link>
          <Link
            href="/piagam"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>Cetak Piagam / Syahadah</span>
          </Link>
          <Link
            href="/serah-piagam"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-sm font-semibold text-emerald-800"
          >
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>Serah Piagam</span>
          </Link>
          <Link
            href="/kirim-wa"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-sm font-semibold text-emerald-800"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Kirim WhatsApp Rapor</span>
          </Link>
        </div>
      )}

      {/* 4. Dropup Menu Grup: KESISWAAN */}
      {activeMenu === 'kesiswaan' && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[45] md:hidden space-y-1 animate-in slide-in-from-bottom-4 duration-200">
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            PKM. Kesiswaan
          </div>
          <Link
            href="/absensi"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <span>Absensi Asatidz (4 Jam)</span>
          </Link>
          <Link
            href="/absen-cepat"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Absen Cepat</span>
          </Link>
          <Link
            href="/absen-konsorsium"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Absen Konsorsium</span>
          </Link>
          <Link
            href="/rekap-absensi"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <BarChart2 className="w-4 h-4 text-teal-600" />
            <span>Rekap Absensi (Per Asatidz)</span>
          </Link>
          <Link
            href="/rekap-absensi/status"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
            <span>Rekap Status (Semua / Ula / Wustho / Ulya)</span>
          </Link>
        </div>
      )}

      {/* 5. Dropup Menu Grup: PENGATURAN (Diakses melalui Ketuk 2x Tombol Beranda) */}
      {activeMenu === 'pengaturan' && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-[45] md:hidden space-y-1 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Opsi &amp; Pengaturan
            </span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
              Ketuk 2x Beranda
            </span>
          </div>
          <button
            onClick={() => {
              setActiveMenu(null);
              setShowSettingsModal(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800 text-left"
          >
            <Settings className="w-4 h-4 text-madin-700" />
            <span>Atur Hierarki</span>
          </button>
          <Link
            href="/pengaturan?tab=sidebar"
            onClick={() => setActiveMenu(null)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800 text-left"
          >
            <Settings className="w-4 h-4 text-amber-600" />
            <span>Ubah Sidebar &amp; Menu</span>
          </Link>
          <Link
            href="/pengaturan?tab=notifikasi"
            onClick={() => setActiveMenu(null)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800 text-left"
          >
            <BellRing className="w-4 h-4 text-emerald-600" />
            <span>Notifikasi Layar HP (Push)</span>
          </Link>
          <button
            onClick={() => {
              setActiveMenu(null);
              setShowAuditModal(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800 text-left"
          >
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Log Aktivitas Sistem</span>
          </button>
          <Link
            href="/pengaturan"
            onClick={() => setActiveMenu(null)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800 text-left"
          >
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>Semua Aturan Pengaturan</span>
          </Link>
        </div>
      )}

      {/* Floating Toolbar Khusus Pencarian & Zoom Tabel (Muncul saat Ketuk 3x Beranda) */}
      <FloatingTableTools />

      {/* Floating Pill Bottom Bar Khusus Mobile */}
      <nav className="fixed bottom-5 left-4 right-4 h-15 bg-white/95 backdrop-blur-md rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.12)] border border-slate-200/80 z-40 flex items-center justify-between md:hidden px-2 py-1 select-none">
        {/* 1. Kiri 1: UTAMA */}
        <button
          type="button"
          onClick={() => toggleDropup('utama')}
          className={`flex flex-col items-center justify-center py-1 flex-1 relative transition-colors ${
            activeMenu === 'utama' || pathname === '/santri' || pathname === '/asatidz'
              ? 'text-madin-700 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Utama</span>
          {(activeMenu === 'utama' || pathname === '/santri' || pathname === '/asatidz') && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-madin-700 rounded-full" />
          )}
        </button>

        {/* 2. Kiri 2: KURIKULUM */}
        <button
          type="button"
          onClick={() => toggleDropup('kurikulum')}
          className={`flex flex-col items-center justify-center py-1 flex-1 relative transition-colors ${
            activeMenu === 'kurikulum' ||
            pathname.includes('jadwal') ||
            pathname.includes('formasi') ||
            pathname.includes('fan') ||
            pathname.includes('pendidik')
              ? 'text-madin-700 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Kurikulum</span>
          {(activeMenu === 'kurikulum' ||
            pathname.includes('jadwal') ||
            pathname.includes('formasi') ||
            pathname.includes('fan') ||
            pathname.includes('pendidik')) && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-madin-700 rounded-full" />
          )}
        </button>

        {/* 3. TENGAH: TOMBOL BERANDA HERO BULAT BESAR (Pintasan 1x: Beranda /beranda, 2x: Opsi, Tahan 1.5s: Tool Zoom & Cari) */}
        <div className="flex-1 flex flex-col items-center justify-center relative -top-3">
          <button
            type="button"
            onClick={handleBerandaClick}
            onTouchStart={startBerandaLongPress}
            onTouchEnd={cancelBerandaLongPress}
            onTouchCancel={cancelBerandaLongPress}
            onMouseDown={startBerandaLongPress}
            onMouseUp={cancelBerandaLongPress}
            onMouseLeave={cancelBerandaLongPress}
            title="Ketuk 1x: Beranda | 2x: Opsi & Pengaturan | Tekan 1.5 detik: Tool Zoom & Cari"
            aria-label="Tombol Beranda: Ketuk 1 kali ke Beranda, 2 kali ke Opsi, tekan tahan 1.5 detik buka Tool Mengambang"
            className={`w-13.5 h-13.5 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-700 to-teal-600 text-white flex items-center justify-center shadow-[0_8px_20px_rgba(5,150,105,0.45)] border-3 border-white ring-2 ${
              isHoldingBeranda
                ? 'ring-emerald-400 scale-95 ring-4 animate-pulse'
                : 'ring-emerald-500/20 active:scale-90'
            } transition-all duration-200 cursor-pointer`}
          >
            {/* Bentuk ikon rumah diperbesar 15% dari w-6 (24px) menjadi w-7 (28px / +16.7%) */}
            <Home className="w-7 h-7 drop-shadow-xs" />
          </button>
          <span
            className={`text-[9px] font-bold mt-0.5 tracking-tight ${
              pathname === '/beranda' ? 'text-emerald-700 font-extrabold' : 'text-slate-600'
            }`}
          >
            Beranda
          </span>
          {pathname === '/beranda' && (
            <span className="w-4 h-0.5 bg-emerald-700 rounded-full mt-0.5" />
          )}
        </div>

        {/* 4. Kanan 1: HAFALAN */}
        <button
          type="button"
          onClick={() => toggleDropup('muhafadzoh')}
          className={`flex flex-col items-center justify-center py-1 flex-1 relative transition-colors ${
            activeMenu === 'muhafadzoh' ||
            pathname.includes('setoran') ||
            pathname.includes('setor-cepat') ||
            pathname.includes('linimasa-setor') ||
            pathname.includes('rekap-hafalan') ||
            pathname.includes('piagam')
              ? 'text-madin-700 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Award className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Hafalan</span>
          {(activeMenu === 'muhafadzoh' ||
            pathname.includes('setoran') ||
            pathname.includes('rekap-hafalan') ||
            pathname.includes('piagam')) && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-madin-700 rounded-full" />
          )}
        </button>

        {/* 5. Kanan 2: PRESENSI */}
        <button
          type="button"
          onClick={() => toggleDropup('kesiswaan')}
          className={`flex flex-col items-center justify-center py-1 flex-1 relative transition-colors ${
            activeMenu === 'kesiswaan' ||
            pathname.includes('absen')
              ? 'text-madin-700 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Presensi</span>
          {(activeMenu === 'kesiswaan' || pathname.includes('absen')) && (
            <span className="absolute bottom-0 w-8 h-0.5 bg-madin-700 rounded-full" />
          )}
        </button>
      </nav>

      {/* Modals Pengaturan Mobile */}
      <ModalHierarchyBuilder
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
      <ModalAuditLogs
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </>
  );
}
