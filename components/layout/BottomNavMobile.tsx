'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  BookOpen,
  Award,
  ClipboardCheck,
  Settings
} from 'lucide-react';

export default function BottomNavMobile() {
  const pathname = usePathname();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleDropup = (key: string) => {
    setActiveMenu((prev) => (prev === key ? null : key));
  };

  return (
    <>
      {activeMenu && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setActiveMenu(null)}
        />
      )}

      {/* Dropup Menus */}
      {activeMenu === 'utama' && (
        <div className="fixed bottom-16 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 md:hidden space-y-1 animate-in slide-in-from-bottom duration-200">
          <Link
            href="/santri"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-800"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">S</div>
            Data Santri
          </Link>
          <Link
            href="/asatidz"
            onClick={() => setActiveMenu(null)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-800"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">A</div>
            Data Asatidz
          </Link>
        </div>
      )}

      {activeMenu === 'kurikulum' && (
        <div className="fixed bottom-16 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 md:hidden space-y-1 animate-in slide-in-from-bottom duration-200">
          <Link href="/jadwal-kbm" onClick={() => setActiveMenu(null)} className="block px-3 py-2 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Jadwal KBM Per Kelas</Link>
          <Link href="/hari-kbm" onClick={() => setActiveMenu(null)} className="block px-3 py-2 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Hari KBM</Link>
          <hr className="my-1 border-slate-100" />
          <Link href="/formasi/pa" onClick={() => setActiveMenu(null)} className="block px-3 py-2 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Formasi Putra (PA)</Link>
          <Link href="/formasi/pi" onClick={() => setActiveMenu(null)} className="block px-3 py-2 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Formasi Putri (PI)</Link>
          <hr className="my-1 border-slate-100" />
          <Link href="/fan/pelajaran" onClick={() => setActiveMenu(null)} className="block px-3 py-2 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Fan Pelajaran</Link>
          <Link href="/daftar-pendidik" onClick={() => setActiveMenu(null)} className="block px-3 py-2 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Daftar Pendidik</Link>
        </div>
      )}

      {activeMenu === 'muhafadzoh' && (
        <div className="fixed bottom-16 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 md:hidden space-y-1 animate-in slide-in-from-bottom duration-200">
          <Link href="/setoran" onClick={() => setActiveMenu(null)} className="block px-3 py-2.5 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Setoran Muhafadzoh</Link>
          <Link href="/rekap-hafalan" onClick={() => setActiveMenu(null)} className="block px-3 py-2.5 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Rekap Hafalan</Link>
          <Link href="/piagam" onClick={() => setActiveMenu(null)} className="block px-3 py-2.5 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Cetak Piagam / Syahadah</Link>
        </div>
      )}

      {activeMenu === 'kesiswaan' && (
        <div className="fixed bottom-16 left-3 right-3 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 md:hidden space-y-1 animate-in slide-in-from-bottom duration-200">
          <Link href="/absensi" onClick={() => setActiveMenu(null)} className="block px-3 py-2.5 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Absensi Asatidz (4 Jam)</Link>
          <Link href="/absen-cepat" onClick={() => setActiveMenu(null)} className="block px-3 py-2.5 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Absen Cepat</Link>
          <Link href="/rekap-absensi" onClick={() => setActiveMenu(null)} className="block px-3 py-2.5 rounded-lg text-sm text-slate-800 hover:bg-slate-50">Rekap Absensi & Generator WA</Link>
        </div>
      )}

      {/* Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 z-50 flex items-center justify-around md:hidden px-1">
        <button
          onClick={() => toggleDropup('utama')}
          className={`flex flex-col items-center justify-center py-1 flex-1 ${
            activeMenu === 'utama' || pathname === '/santri' || pathname === '/asatidz' ? 'text-madin-700 font-bold' : 'text-slate-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Utama</span>
        </button>

        <button
          onClick={() => toggleDropup('kurikulum')}
          className={`flex flex-col items-center justify-center py-1 flex-1 ${
            activeMenu === 'kurikulum' || pathname.includes('jadwal') || pathname.includes('formasi') ? 'text-madin-700 font-bold' : 'text-slate-500'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Kurikulum</span>
        </button>

        <button
          onClick={() => toggleDropup('muhafadzoh')}
          className={`flex flex-col items-center justify-center py-1 flex-1 ${
            activeMenu === 'muhafadzoh' || pathname.includes('setoran') || pathname.includes('hafalan') ? 'text-madin-700 font-bold' : 'text-slate-500'
          }`}
        >
          <Award className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Muhafadzoh</span>
        </button>

        <button
          onClick={() => toggleDropup('kesiswaan')}
          className={`flex flex-col items-center justify-center py-1 flex-1 ${
            activeMenu === 'kesiswaan' || pathname.includes('absen') ? 'text-madin-700 font-bold' : 'text-slate-500'
          }`}
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Kesiswaan</span>
        </button>

        <button
          onClick={() => toggleDropup('pengaturan')}
          className="flex flex-col items-center justify-center py-1 flex-1 text-slate-500"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Setting</span>
        </button>
      </nav>
    </>
  );
}
