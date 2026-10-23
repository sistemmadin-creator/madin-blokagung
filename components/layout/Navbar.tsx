'use client';

import React from 'react';
import { Menu, Bell, UserCircle } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

export default function Navbar() {
  const { toggleSidebar } = useAppStore();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 z-30 px-4 md:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-madin-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            MA
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-slate-800 leading-tight">
              Madin Al Amiriyyah Blokagung
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Sistem Database Santri, Asatidz & Presensi KBM
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          KBM Semester Gasal Aktif
        </div>
        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
          <Bell className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <UserCircle className="w-8 h-8 text-madin-700" />
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">Master Admin</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Admin Utama</p>
          </div>
        </div>
      </div>
    </header>
  );
}
