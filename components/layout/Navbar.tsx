'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, ChevronDown, LogOut, LogIn, ShieldCheck, ShieldOff, User, Undo2, Redo2, BookOpen, Sliders, LayoutList, UserCog } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import { useRbacStore } from '@/stores/useRbacStore';
import { canAccessSettingsAuthority } from '@/lib/utils/rbacHelper';
import ModalHierarchyBuilder from '@/components/modules/settings/ModalHierarchyBuilder';
import ModalAuditLogs from '@/components/modules/settings/ModalAuditLogs';
import NotificationBellPrompt from '@/components/common/NotificationBellPrompt';
import { supabase } from '@/lib/supabase/client';
import { extractUserProfile, type ActiveUserProfile } from '@/lib/utils/authHelper';
import { logActivity } from '@/lib/utils/audit';

export default function Navbar() {
  const router = useRouter();
  const { isSidebarCollapsed, toggleSidebar } = useAppStore();
  const { undoStack, redoStack, undo, redo, isExecuting } = useUndoRedoStore();
  const currentAccount = useRbacStore((s) => s.currentAccount);
  const isAppSecurityEnabled = useRbacStore((s) => s.isAppSecurityEnabled);
  const clearCurrentAccount = useRbacStore((s) => s.clearCurrentAccount);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ActiveUserProfile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted) {
        setActiveProfile(extractUserProfile(user));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setActiveProfile(extractUserProfile(session?.user || null));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setDropdownOpen(false);
    try {
      await logActivity(
        'LOGOUT SISTEM',
        `Mengakhiri sesi kerja internal (${currentAccount?.username || activeProfile?.username || 'admin'})`
      );
      clearCurrentAccount();
      await supabase.auth.signOut();
    } finally {
      setIsLoggingOut(false);
      router.replace('/login');
      router.refresh();
    }
  };

  const isLoggedIn = Boolean(currentAccount || activeProfile);
  const displayFullName =
    currentAccount?.full_name ||
    activeProfile?.fullName ||
    (!isAppSecurityEnabled ? 'Mode Input Terbuka' : 'Master Administrator');
  const displayRoleLabel =
    currentAccount?.role_label ||
    activeProfile?.roleLabel ||
    (!isAppSecurityEnabled ? 'Tanpa Login (Akses Penuh)' : 'Master Admin');
  const displayUsername =
    currentAccount?.username ||
    activeProfile?.username ||
    (!isAppSecurityEnabled ? 'tanpa_login' : 'admin');
  const isMasterAdmin =
    !isLoggedIn ||
    (currentAccount?.role || activeProfile?.role) === 'master_admin' ||
    displayUsername === 'admin';
  const isKurikulumRole = !isMasterAdmin;
  const allowSettings = canAccessSettingsAuthority(currentAccount);

  return (
    <>
      <header
        className={`fixed top-0 right-0 h-[70px] bg-white/85 backdrop-blur-md border-b border-slate-200/80 z-30 px-4 md:px-7 flex items-center justify-between transition-all duration-300 ease-in-out shadow-xs ${
          isSidebarCollapsed ? 'left-0 md:left-[88px]' : 'left-0 md:left-[260px]'
        }`}
      >
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
                src="/logo-madin.png"
                alt="Logo Madin Blokagung"
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://drive.google.com/thumbnail?id=1Fkm2_aiu-me47Fm1weDrpHMCHZBThzrD&sz=w200';
                }}
              />
            </div>
            <span className="font-bold text-slate-800 text-base md:text-lg tracking-tight select-none">
              Madin Blokagung
            </span>
            {!isAppSecurityEnabled && (
              <Link
                href="/pengaturan?tab=akun"
                data-testid="badge-open-security-mode"
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold hover:bg-amber-200 transition"
                title="Keamanan Aplikasi sedang Non-Aktif (Mode Input Data Tanpa Login)"
              >
                <ShieldOff className="w-3.5 h-3.5 text-amber-700" />
                <span>Mode Input Terbuka</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-slate-100/90 border border-slate-200/80 rounded-full p-1 shadow-xs">
            <button
              type="button"
              onClick={() => undo()}
              disabled={undoStack.length === 0 || isExecuting}
              title={
                undoStack.length > 0
                  ? `Batalkan (Ctrl+Z): [${undoStack[undoStack.length - 1].module.toUpperCase()}] ${undoStack[undoStack.length - 1].title}`
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
                  ? `Ulangi (Ctrl+Y): [${redoStack[redoStack.length - 1].module.toUpperCase()}] ${redoStack[redoStack.length - 1].title}`
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

          <NotificationBellPrompt />

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-expanded={dropdownOpen}
              aria-haspopup="menu"
              className="rounded-full bg-white border border-slate-200 px-3 py-1.5 flex items-center gap-2.5 shadow-xs hover:bg-slate-50 transition cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
            >
              <div className="w-8 h-8 rounded-full bg-madin-700 text-white flex items-center justify-center shadow-xs">
                <User className="w-4 h-4" />
              </div>

              <div className="text-left hidden sm:block">
                <div className="font-bold text-slate-800 text-xs leading-none">
                  {displayFullName}
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5 leading-none">
                  Pengaturan &amp; Keluar
                </div>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="px-3 py-2 text-center border-b border-slate-100 bg-slate-50 rounded-xl mb-2">
                  <div className="font-bold text-slate-800 text-sm">{displayFullName}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">@{displayUsername}</div>
                  <span
                    className={`inline-block mt-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                      isKurikulumRole
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border-rose-200'
                    }`}
                  >
                    {displayRoleLabel}
                  </span>
                </div>

                <Link
                  href="/"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-lg flex items-center gap-2.5 transition"
                >
                  <BookOpen className="w-4 h-4 text-emerald-700" />
                  <span>Lihat Profil Madrasah (Web)</span>
                </Link>

                {allowSettings && (
                  <div className="my-1.5 pt-1.5 border-t border-slate-100">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Pengaturan</span>
                      <Link
                        href="/pengaturan"
                        onClick={() => setDropdownOpen(false)}
                        className="text-[10px] text-amber-700 hover:underline font-semibold"
                      >
                        Buka Hub ↗
                      </Link>
                    </div>

                    {isMasterAdmin && isAppSecurityEnabled && (
                      <Link
                        href="/pengaturan?tab=akun"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 transition"
                      >
                        <UserCog className="w-4 h-4 text-madin-700" />
                        <span>Kelola Akun &amp; Otoritas</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        setShowSettingsModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 transition"
                    >
                      <Sliders className="w-4 h-4 text-madin-700" />
                      <span>Pusat Kendali Admin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        setShowAuditModal(true);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 transition"
                    >
                      <ShieldCheck className="w-4 h-4 text-madin-700" />
                      <span>Log Aktivitas Sistem</span>
                    </button>

                    <Link
                      href="/pengaturan?tab=sidebar"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2.5 transition"
                    >
                      <LayoutList className="w-4 h-4 text-madin-700" />
                      <span>Ubah Sidebar &amp; Menu</span>
                    </Link>
                  </div>
                )}

                <hr className="my-1.5 border-slate-100" />

                {isLoggedIn ? (
                  <button
                    type="button"
                    disabled={isLoggingOut}
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-2.5 transition disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4 text-rose-700" />
                    <span>{isLoggingOut ? 'Mengakhiri sesi...' : 'Keluar / Logout'}</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 rounded-lg flex items-center gap-2.5 transition"
                  >
                    <LogIn className="w-4 h-4 text-emerald-700" />
                    <span>Login Pengurus / Master Admin</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

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
