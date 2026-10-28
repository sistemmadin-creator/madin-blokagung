'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  LayoutGrid, 
  Menu, 
  X, 
  ChevronRight
} from 'lucide-react';

export default function NavbarProfil() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Beranda', href: '#hero' },
    { label: 'Statistik', href: '#statistik' },
    { label: '3 Pilar Program', href: '#program' },
    { label: 'Kurikulum Kitab', href: '#kurikulum' },
    { label: 'Waktu KBM', href: '#waktu-kbm' },
    { label: 'Kontak', href: '#kontak' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-emerald-900/10 dark:border-emerald-500/20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo & Identitas Madrasah */}
          <Link href="#hero" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-950 flex items-center justify-center shadow-md shadow-emerald-900/20 group-hover:scale-105 transition-transform border border-amber-400/30">
              <BookOpen className="w-5 h-5 text-amber-300" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-emerald-950 dark:text-emerald-50 font-serif">
                  MADINA
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
                  1951 M
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide">
                PP. Darussalam Blokagung
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-slate-800/60 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Action Button: Gateway to KBM System */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/jadwal-kbm"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-800 hover:from-emerald-800 hover:to-teal-900 shadow-md shadow-emerald-900/25 hover:shadow-lg hover:shadow-emerald-900/35 active:scale-[0.98] transition-all border border-emerald-500/30"
              title="Buka Sistem Informasi KBM & Administrasi Madin"
            >
              <LayoutGrid className="w-4 h-4 text-amber-300" />
              <span>Masuk Sistem KBM</span>
              <ChevronRight className="w-4 h-4 text-emerald-300/80" />
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href="/jadwal-kbm"
              className="p-2 rounded-lg bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
              title="Masuk Sistem"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-amber-300" />
              <span>Sistem</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              href="/jadwal-kbm"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-bold text-white bg-gradient-to-r from-emerald-700 to-teal-800 shadow-md shadow-emerald-900/30"
            >
              <LayoutGrid className="w-5 h-5 text-amber-300" />
              <span>Buka Sistem Akademik KBM</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
