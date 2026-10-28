'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  BookOpen,
  Award,
  ClipboardCheck,
  Settings,
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
  LayoutDashboard
} from 'lucide-react';
import ModalHierarchyBuilder from '@/components/modules/settings/ModalHierarchyBuilder';
import ModalAuditLogs from '@/components/modules/settings/ModalAuditLogs';

export default function BottomNavMobile() {
  const pathname = usePathname();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

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
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 md:hidden space-y-1 animate-in slide-in-from-bottom-4 duration-200">
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
            href="/kelola-berita"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-sm font-semibold text-amber-900 border-t border-slate-100"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Newspaper className="w-4 h-4" />
            </div>
            <span>Kelola Berita</span>
          </Link>
        </div>
      )}

      {/* 2. Dropup Menu Grup: KURIKULUM */}
      {activeMenu === 'kurikulum' && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 md:hidden space-y-1 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
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
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 md:hidden space-y-1 animate-in slide-in-from-bottom-4 duration-200">
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
        </div>
      )}

      {/* 4. Dropup Menu Grup: KESISWAAN */}
      {activeMenu === 'kesiswaan' && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 md:hidden space-y-1 animate-in slide-in-from-bottom-4 duration-200">
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
            href="/rekap-absensi"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800"
          >
            <BarChart2 className="w-4 h-4 text-teal-600" />
            <span>Rekap Absensi &amp; WhatsApp</span>
          </Link>
        </div>
      )}

      {/* 5. Dropup Menu Grup: PENGATURAN */}
      {activeMenu === 'pengaturan' && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 md:hidden space-y-1 animate-in slide-in-from-bottom-4 duration-200">
          <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Pengaturan Sistem
          </div>
          <button
            onClick={() => {
              setActiveMenu(null);
              setShowSettingsModal(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800 text-left"
          >
            <Settings className="w-4 h-4 text-madin-700" />
            <span>Pusat Kendali Admin</span>
          </button>
          <Link
            href="/pengaturan?tab=sidebar"
            onClick={() => setActiveMenu(null)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-800 text-left"
          >
            <Settings className="w-4 h-4 text-amber-600" />
            <span>Ubah Sidebar &amp; Menu</span>
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
          <Link
            href="/"
            onClick={() => setActiveMenu(null)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-sm font-semibold text-emerald-800 text-left border-t border-slate-100"
          >
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <span>Lihat Profil Madrasah</span>
          </Link>
        </div>
      )}

      {/* Floating Pill Bottom Bar Khusus Mobile */}
      <nav className="fixed bottom-5 left-4 right-4 h-15 bg-white/95 backdrop-blur-md rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.12)] border border-slate-200/80 z-50 flex items-center justify-around md:hidden px-2 py-1 select-none">
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

        <button
          type="button"
          onClick={() => toggleDropup('muhafadzoh')}
          className={`flex flex-col items-center justify-center py-1 flex-1 relative transition-colors ${
            activeMenu === 'muhafadzoh' ||
            pathname.includes('setoran') ||
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

        <button
          type="button"
          onClick={() => toggleDropup('pengaturan')}
          className={`flex flex-col items-center justify-center py-1 flex-1 relative transition-colors ${
            activeMenu === 'pengaturan'
              ? 'text-madin-700 font-bold'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Opsi</span>
          {activeMenu === 'pengaturan' && (
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
