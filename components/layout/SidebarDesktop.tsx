'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  UserCheck,
  Calendar,
  CalendarDays,
  Building2,
  BookMarked,
  GraduationCap,
  Grid,
  BarChart2,
  Award,
  ClipboardCheck,
  Zap,
  ChevronDown,
  ChevronLeft,
  BookOpen,
  Newspaper,
  LayoutDashboard,
  Settings,
  Sliders,
  LayoutList,
  ShieldCheck,
  MessageSquare,
  FileText,
  Package,
  Wrench,
  CheckSquare,
  Home,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useSidebarConfigStore, DEFAULT_SIDEBAR_GROUPS } from '@/stores/useSidebarConfigStore';
import { ConfigMenuItem, ConfigMenuGroup, ConfigSubMenuItem } from '@/types/sidebar-config';
import { useRbacStore } from '@/stores/useRbacStore';
import { canViewPage, resolvePageIdFromPathname } from '@/lib/utils/rbacHelper';

// Registry of Lucide icons for dynamic rendering
const ICON_REGISTRY: Record<string, React.ReactNode> = {
  Home: <Home className="w-5 h-5 flex-shrink-0" />,
  LayoutDashboard: <LayoutDashboard className="w-5 h-5 flex-shrink-0" />,
  Users: <Users className="w-5 h-5 flex-shrink-0" />,
  UserCheck: <UserCheck className="w-5 h-5 flex-shrink-0" />,
  Calendar: <Calendar className="w-5 h-5 flex-shrink-0" />,
  CalendarDays: <CalendarDays className="w-5 h-5 flex-shrink-0" />,
  Building2: <Building2 className="w-5 h-5 flex-shrink-0" />,
  BookMarked: <BookMarked className="w-5 h-5 flex-shrink-0" />,
  GraduationCap: <GraduationCap className="w-5 h-5 flex-shrink-0" />,
  Grid: <Grid className="w-5 h-5 flex-shrink-0" />,
  BarChart2: <BarChart2 className="w-5 h-5 flex-shrink-0" />,
  Award: <Award className="w-5 h-5 flex-shrink-0" />,
  ClipboardCheck: <ClipboardCheck className="w-5 h-5 flex-shrink-0" />,
  Zap: <Zap className="w-5 h-5 flex-shrink-0" />,
  Newspaper: <Newspaper className="w-5 h-5 flex-shrink-0" />,
  Settings: <Settings className="w-5 h-5 flex-shrink-0" />,
  Sliders: <Sliders className="w-5 h-5 flex-shrink-0" />,
  LayoutList: <LayoutList className="w-5 h-5 flex-shrink-0" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5 flex-shrink-0" />,
  BookOpen: <BookOpen className="w-5 h-5 flex-shrink-0" />,
  MessageSquare: <MessageSquare className="w-5 h-5 flex-shrink-0" />,
  FileText: <FileText className="w-5 h-5 flex-shrink-0" />,
  Package: <Package className="w-5 h-5 flex-shrink-0" />,
  Wrench: <Wrench className="w-5 h-5 flex-shrink-0" />,
  CheckSquare: <CheckSquare className="w-5 h-5 flex-shrink-0" />,
};

const SUB_ICON_REGISTRY: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="w-4 h-4 text-cyan-300" />,
  CalendarDays: <CalendarDays className="w-4 h-4 text-amber-300" />,
  Sliders: <Sliders className="w-4 h-4 text-emerald-300" />,
  LayoutList: <LayoutList className="w-4 h-4 text-amber-300" />,
  BookOpen: <BookOpen className="w-4 h-4 text-rose-300" />,
  BarChart2: <BarChart2 className="w-4 h-4 text-emerald-300" />,
  ClipboardCheck: <ClipboardCheck className="w-4 h-4 text-amber-300" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4 text-teal-300" />,
};

export default function SidebarDesktop() {
  const pathname = usePathname();
  const router = useRouter();
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isSidebarCollapsed, toggleSidebarCollapse } = useAppStore();

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const handleFloatingButtonClick = () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      router.back();
    }, 220);
  };

  const handleFloatingButtonDoubleClick = () => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    toggleSidebarCollapse();
  };
  const { groups } = useSidebarConfigStore();
  const currentAccount = useRbacStore((s) => s.currentAccount);
  const isAppSecurityEnabled = useRbacStore((s) => s.isAppSecurityEnabled);
  const [mounted, setMounted] = useState(false);

  const isMasterAdmin =
    !currentAccount ||
    currentAccount.role === 'master_admin' ||
    currentAccount.username === 'admin';

  const isHrefPermitted = (href?: string, subId?: string): boolean => {
    if (!href) return true;
    if (subId === 'sub-akun' || href.includes('tab=akun')) {
      return isMasterAdmin && isAppSecurityEnabled;
    }
    const pageId = resolvePageIdFromPathname(href);
    if (!pageId) return true;
    return canViewPage(currentAccount, pageId, href);
  };

  const OPEN_GROUPS_KEY = 'madina_sidebar_open_groups_v1';
  const OPEN_SUBMENUS_KEY = 'madina_sidebar_open_submenus_v1';

  // Default semua grup & submenu tertutup saat pertama kali masuk
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
    try {
      const savedGroups = window.localStorage.getItem(OPEN_GROUPS_KEY);
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        if (parsed && typeof parsed === 'object') setOpenGroups(parsed);
      }
      const savedSubs = window.localStorage.getItem(OPEN_SUBMENUS_KEY);
      if (savedSubs) {
        const parsed = JSON.parse(savedSubs);
        if (parsed && typeof parsed === 'object') setOpenSubmenus(parsed);
      }
    } catch {
      // Abaikan error localStorage
    }
  }, []);

  const activeGroups = mounted ? groups : DEFAULT_SIDEBAR_GROUPS;

  // Pertahankan grup & submenu yang sudah dibuka, serta otomatis buka induk rute aktif
  useEffect(() => {
    if (!mounted) return;
    let groupChanged = false;
    let subChanged = false;
    const nextGroups: Record<string, boolean> = { ...openGroups };
    const nextSubs: Record<string, boolean> = { ...openSubmenus };

    activeGroups.forEach((grp: ConfigMenuGroup) => {
      const grpKey = grp.id || grp.group;
      grp.items.forEach((item: ConfigMenuItem) => {
        const isDirectMatch = item.href && item.href === pathname;
        const isChildMatch =
          item.children && item.children.some((sub: ConfigSubMenuItem) => sub.href === pathname);

        if (isDirectMatch || isChildMatch) {
          if (!nextGroups[grpKey]) {
            nextGroups[grpKey] = true;
            groupChanged = true;
          }
          if (isChildMatch && !nextSubs[item.title]) {
            nextSubs[item.title] = true;
            subChanged = true;
          }
        }
      });
    });

    if (groupChanged) {
      setOpenGroups(nextGroups);
      try {
        window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(nextGroups));
      } catch {}
    }
    if (subChanged) {
      setOpenSubmenus(nextSubs);
      try {
        window.localStorage.setItem(OPEN_SUBMENUS_KEY, JSON.stringify(nextSubs));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mounted, activeGroups]);

  const toggleGroup = (grpKey: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [grpKey]: !prev[grpKey] };
      try {
        window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleSubmenu = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenSubmenus((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        window.localStorage.setItem(OPEN_SUBMENUS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 h-screen bg-[#0b5751] text-white z-40 hidden md:flex flex-col transition-all duration-300 ease-in-out shadow-xl select-none ${
        isSidebarCollapsed ? 'w-[88px]' : 'w-[260px]'
      }`}
    >
      {/* Header Sidebar & Tombol Toggle Bulat Melayang */}
      <div className="h-[70px] relative flex items-center px-5 flex-shrink-0 border-b border-white/10">
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-white text-sm uppercase tracking-[0.14em] truncate leading-tight">
                PUSAT SISTEM
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75 truncate mt-0.5">
                Madina Blokagung
              </div>
            </div>
          </div>
        )}

        {/* Tombol Bulat Melayang di Perbatasan Kanan Header Sidebar */}
        <button
          type="button"
          onClick={handleFloatingButtonClick}
          onDoubleClick={handleFloatingButtonDoubleClick}
          title="Klik 1x: Kembali | Klik 2x: Lipat/Perlebar Sidebar"
          aria-label="Klik 1x untuk kembali ke halaman sebelumnya, klik 2x untuk buka atau tutup sidebar"
          className="absolute -right-4 top-[19px] w-8 h-8 rounded-full bg-white text-slate-800 shadow-md flex items-center justify-center cursor-pointer border border-slate-200 z-50 hover:scale-110 active:scale-95 transition-all"
        >
          <ChevronLeft
            className={`w-4 h-4 text-slate-700 transition-transform duration-300 ${
              isSidebarCollapsed ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Navigasi Menu Berkelompok */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-4">
        {activeGroups
          .filter((grp: ConfigMenuGroup) => !grp.hidden)
          .map((grp: ConfigMenuGroup) => {
            const visibleItems = grp.items.filter((item: ConfigMenuItem) => {
              if (item.hidden) return false;
              if (item.children && item.children.length > 0) {
                const allowedChildren = item.children.filter(
                  (sub: ConfigSubMenuItem) =>
                    !sub.hidden && isHrefPermitted(sub.href, sub.id)
                );
                return allowedChildren.length > 0;
              }
              return isHrefPermitted(item.href, item.id);
            });
            if (visibleItems.length === 0) return null;

            const grpKey = grp.id || grp.group;
            const isGroupOpen = Boolean(openGroups[grpKey]);
            const hasActiveChildInGroup = visibleItems.some(
              (it) =>
                it.href === pathname ||
                it.children?.some((sub) => sub.href === pathname)
            );

            return (
              <div key={grpKey} className="space-y-1">
                {/* Judul Grup (Dropdown Accordion) */}
                {!isSidebarCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(grpKey)}
                    aria-expanded={isGroupOpen}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer ${
                      hasActiveChildInGroup
                        ? 'text-emerald-200 bg-white/10'
                        : isGroupOpen
                          ? 'text-white/80 bg-white/5 hover:bg-white/10'
                          : 'text-white/55 hover:text-white/85 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      {hasActiveChildInGroup && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                      )}
                      <span>{grp.group}</span>
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                        isGroupOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                ) : (
                  <div className="border-t border-white/10 my-2 mx-2" />
                )}

                {(isSidebarCollapsed || isGroupOpen) && visibleItems.map((item: ConfigMenuItem) => {
                  const visibleChildren = item.children?.filter(
                    (sub: ConfigSubMenuItem) =>
                      !sub.hidden && isHrefPermitted(sub.href, sub.id)
                  );
                  const hasChildren = visibleChildren && visibleChildren.length > 0;
                  const isSubOpen = openSubmenus[item.title];
                  const isParentActive =
                    pathname === item.href ||
                    (hasChildren && visibleChildren?.some((sub) => sub.href === pathname));
                  const iconElement = ICON_REGISTRY[item.iconName] || <Settings className="w-5 h-5 flex-shrink-0" />;

                  if (hasChildren) {
                    return (
                      <div key={item.id || item.title}>
                        <button
                          type="button"
                          onClick={(e) => {
                            if (isSidebarCollapsed) {
                              toggleSidebarCollapse();
                            } else {
                              toggleSubmenu(item.title, e);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-all ${
                            isParentActive
                              ? 'bg-white/20 text-white shadow-inner font-semibold'
                              : 'text-white/85 hover:bg-white/10 hover:text-white'
                          }`}
                          title={isSidebarCollapsed ? item.title : undefined}
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex-shrink-0">{iconElement}</span>
                            {!isSidebarCollapsed && (
                              <span className="truncate whitespace-nowrap">{item.title}</span>
                            )}
                          </div>

                          {!isSidebarCollapsed && (
                            <span className="p-1 rounded hover:bg-white/10 transition">
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${
                                  isSubOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </span>
                          )}
                        </button>

                        {/* Sub-menu Anak */}
                        {!isSidebarCollapsed && isSubOpen && (
                          <div className="ml-4 mt-1 pl-3 border-l border-white/15 space-y-1">
                            {visibleChildren?.map((sub: ConfigSubMenuItem) => {
                              const isSubActive = pathname === sub.href;
                              const subIconElement = sub.iconName ? (SUB_ICON_REGISTRY[sub.iconName] || ICON_REGISTRY[sub.iconName]) : null;
                              return (
                                <Link
                                  key={sub.id || sub.href}
                                  href={sub.href}
                                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all ${
                                    isSubActive
                                      ? 'bg-white/25 text-white font-bold'
                                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  {subIconElement && <span>{subIconElement}</span>}
                                  <span className="truncate">{sub.title}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.id || item.href}
                      href={item.href || '#'}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isParentActive
                          ? 'bg-white/20 text-white shadow-inner font-semibold'
                          : 'text-white/85 hover:bg-white/10 hover:text-white'
                      }`}
                      title={isSidebarCollapsed ? item.title : undefined}
                    >
                      <span className="flex-shrink-0">{iconElement}</span>
                      {!isSidebarCollapsed && (
                        <span className="truncate whitespace-nowrap">{item.title}</span>
                      )}
                      {!isSidebarCollapsed && item.badge && (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
      </nav>

      {/* Tautan Langsung ke Halaman Pengaturan */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        {!isSidebarCollapsed ? (
          <Link
            href="/pengaturan"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold border shadow-sm group ${
              pathname.startsWith('/pengaturan')
                ? 'bg-white text-emerald-950 border-white'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
            }`}
            title="Buka Halaman Pengaturan"
          >
            <Settings
              className={`w-4 h-4 flex-shrink-0 group-hover:rotate-45 transition-transform ${
                pathname.startsWith('/pengaturan') ? 'text-emerald-700' : 'text-amber-300'
              }`}
            />
            <span className="truncate leading-tight">Pengaturan</span>
          </Link>
        ) : (
          <div className="flex justify-center">
            <Link
              href="/pengaturan"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border group ${
                pathname.startsWith('/pengaturan')
                  ? 'bg-white text-emerald-950 border-white'
                  : 'bg-white/10 hover:bg-white/20 text-amber-300 border-white/15'
              }`}
              title="Pengaturan"
            >
              <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
