'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Menu, ChevronDown, Settings, LogOut, ShieldCheck, User, Undo2, Redo2, BookOpen } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import ModalHierarchyBuilder from '@/components/modules/settings/ModalHierarchyBuilder';
import ModalAuditLogs from '@/components/modules/settings/ModalAuditLogs';

export default function Navbar() {
  const { isSidebarCollapsed, toggleSidebar } = useAppStore();
  const { undoStack, redoStack, undo, redo, isExecuting } = useUndoRedoStore();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      alert('Sesi telah diakhiri.');
      window.location.reload();
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 right-0 h-[70px] bg-white/85 backdrop-blur-md border-b border-slate-200/80 z-30 px-4 md:px-7 flex items-center justify-between transition-all duration-300 ease-in-out shadow-xs ${
          isSidebarCollapsed ? 'left-0 md:left-[88px]' : 'left-0 md:left-[260px]'
        }`}
      >
        {/* Kiri: Brand & Logo Resmi Madin Blokagung */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
            title="Toggle Menu Mobile"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-[38px] h-[38px] rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center p-1">
              <img
                src="https://drive.google.com/thumbnail?id=1Fkm2_aiu-me47Fm1weDrpHMCHZBThzrD&sz=w200"
                alt="Logo Madin Blokagung"
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="font-bold text-slate-800 text-base md:text-lg tracking-tight select-none">
              Madin Blokagung
            </span>
          </div>
        </div>

        {/* Kanan: Undo/Redo & Menu Profil */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tombol Undo & Redo (Maksimal 5 Langkah) */}
          <div className="flex items-center bg-slate-100/90 border border-slate-200/80 rounded-full p-1 shadow-xs">
            <button
              type="button"
              onClick={() => undo()}
              disabled={undoStack.length === 0 || isExecuting}
              title={
                undoStack.length > 0
                  ? `Batalkan (Ctrl+Z): ${undoStack[undoStack.length - 1].title}`
                  : 'Undo (Ctrl+Z): Belum ada riwayat perubahan'
              }
              aria-label="Batalkan perubahan (Undo)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all select-none ${
                undoStack.length > 0 && !isExecuting
                  ? 'text-slate-700 hover:text-emerald-700 hover:bg-white active:scale-95 cursor-pointer shadow-xs'
                  : 'text-slate-400 opacity-40 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Undo</span>
              {undoStack.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white leading-none">
                  {undoStack.length}
                </span>
              )}
            </button>

            <div className="w-[1px] h-3.5 bg-slate-300 mx-0.5" />

            <button
              type="button"
              onClick={() => redo()}
              disabled={redoStack.length === 0 || isExecuting}
              title={
                redoStack.length > 0
                  ? `Ulangi (Ctrl+Y): ${redoStack[redoStack.length - 1].title}`
                  : 'Redo (Ctrl+Y): Belum ada riwayat untuk diulang'
              }
              aria-label="Ulangi perubahan (Redo)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all select-none ${
                redoStack.length > 0 && !isExecuting
                  ? 'text-slate-700 hover:text-emerald-700 hover:bg-white active:scale-95 cursor-pointer shadow-xs'
                  : 'text-slate-400 opacity-40 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Redo</span>
              {redoStack.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold bg-slate-700 text-white leading-none">
                  {redoStack.length}
                </span>
              )}
            </button>
          </div>

          {/* Menu Profil Pill */}
          <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="rounded-full bg-white border border-slate-200 px-3 py-1.5 flex items-center gap-2.5 shadow-xs hover:bg-slate-50 transition cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-full bg-madin-700 text-white flex items-center justify-center shadow-xs">
              <User className="w-4 h-4" />
            </div>

            <div className="text-left hidden sm:block">
              <div className="font-bold text-slate-800 text-xs leading-none">
                Menu Profil
              </div>
              <div className="text-slate-400 text-[10px] mt-0.5 leading-none">
                Pengaturan &amp; Keluar
              </div>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Dropdown Menu Profil */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 text-center border-b border-slate-100 bg-slate-50 rounded-xl mb-2">
                <div className="font-bold text-slate-800 text-sm">Master Administrator</div>
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold rounded-full">
                  Master Admin
                </span>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setShowAuditModal(true);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 transition"
              >
                <ShieldCheck className="w-4 h-4 text-madin-700" />
                <span>Log Aktivitas Sistem</span>
              </button>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setShowSettingsModal(true);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 transition"
              >
                <Settings className="w-4 h-4 text-madin-700" />
                <span>Pusat Kendali Admin</span>
              </button>

              <Link
                href="/"
                onClick={() => setDropdownOpen(false)}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-lg flex items-center gap-2.5 transition"
              >
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>Lihat Profil Madrasah (Web)</span>
              </Link>

              <hr className="my-1.5 border-slate-100" />

              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2.5 transition"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Keluar / Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </header>

      {/* Modals Pengaturan & Audit */}
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
