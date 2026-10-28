'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ArrowUpRight,
  Newspaper,
  LayoutDashboard,
  Settings,
  Sliders,
  LayoutList,
  ShieldCheck,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useSidebarConfigStore, DEFAULT_SIDEBAR_GROUPS } from '@/stores/useSidebarConfigStore';
import { ConfigMenuItem, ConfigMenuGroup, ConfigSubMenuItem } from '@/types/sidebar-config';

// Registry of Lucide icons for dynamic rendering
const ICON_REGISTRY: Record<string, React.ReactNode> = {
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
};

const SUB_ICON_REGISTRY: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="w-4 h-4 text-cyan-300" />,
  CalendarDays: <CalendarDays className="w-4 h-4 text-amber-300" />,
  Sliders: <Sliders className="w-4 h-4 text-emerald-300" />,
  LayoutList: <LayoutList className="w-4 h-4 text-amber-300" />,
  BookOpen: <BookOpen className="w-4 h-4 text-rose-300" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4 text-teal-300" />,
};

export default function SidebarDesktop() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebarCollapse } = useAppStore();
  const { groups } = useSidebarConfigStore();
  const [mounted, setMounted] = useState(false);

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    'Jadwal KBM': true,
    'Pengaturan': true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeGroups = mounted ? groups : DEFAULT_SIDEBAR_GROUPS;

  // Automatically keep parent submenu open if current path is a child
  useEffect(() => {
    activeGroups.forEach((grp: ConfigMenuGroup) => {
      grp.items.forEach((item: ConfigMenuItem) => {
        if (item.children) {
          const isChildActive = item.children.some((sub: ConfigSubMenuItem) => sub.href === pathname);
          if (isChildActive) {
            setOpenSubmenus((prev) => ({ ...prev, [item.title]: true }));
          }
        }
      });
    });
  }, [pathname, activeGroups]);

  const toggleSubmenu = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
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
          <div className="font-bold text-white text-base tracking-tight truncate">
            Madrasah Diniyyah
          </div>
        )}

        {/* Tombol Bulat Melayang di Perbatasan Kanan Header Sidebar */}
        <button
          type="button"
          onClick={toggleSidebarCollapse}
          title={isSidebarCollapsed ? 'Perlebar Sidebar' : 'Lipat Sidebar'}
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
            const visibleItems = grp.items.filter((item: ConfigMenuItem) => !item.hidden);
            if (visibleItems.length === 0) return null;

            return (
              <div key={grp.id || grp.group} className="space-y-1">
                {/* Judul Grup */}
                {!isSidebarCollapsed ? (
                  <div className="text-[10px] font-bold tracking-wider text-white/45 uppercase px-3 pt-2 pb-1">
                    {grp.group}
                  </div>
                ) : (
                  <div className="border-t border-white/10 my-2 mx-2" />
                )}

                {visibleItems.map((item: ConfigMenuItem) => {
                  const visibleChildren = item.children?.filter((sub: ConfigSubMenuItem) => !sub.hidden);
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

      {/* Tautan Balik ke Halaman Profil Madrasah */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        {!isSidebarCollapsed ? (
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 hover:text-amber-200 transition-all text-xs font-semibold border border-amber-400/25 shadow-sm group"
            title="Kembali ke Halaman Profil Madrasah"
          >
            <BookOpen className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform flex-shrink-0" />
            <div className="flex flex-col truncate">
              <span className="truncate leading-tight">Profil Madrasah</span>
              <span className="text-[10px] text-white/60 font-normal leading-tight">Web Resmi Publik</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-white/60 ml-auto group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform flex-shrink-0" />
          </Link>
        ) : (
          <div className="flex justify-center">
            <Link
              href="/"
              className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 flex items-center justify-center transition-all border border-amber-400/25 group"
              title="Kembali ke Halaman Profil Madrasah"
            >
              <BookOpen className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
