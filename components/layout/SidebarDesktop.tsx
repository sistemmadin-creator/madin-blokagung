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
  GraduationCap,
  Grid,
  BarChart2,
  Award,
  ClipboardCheck,
  Zap,
  ChevronLeft,
  ChevronDown,
  BookMarked,
  BookOpen,
  ArrowUpRight
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

interface SubMenuItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
}

interface MenuItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  children?: SubMenuItem[];
}

interface MenuGroup {
  group: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    group: 'Utama',
    items: [
      { title: 'Data Santri', href: '/santri', icon: <Users className="w-5 h-5 flex-shrink-0" /> },
      { title: 'Data Asatidz', href: '/asatidz', icon: <UserCheck className="w-5 h-5 flex-shrink-0" /> },
    ],
  },
  {
    group: 'PKM. Kurikulum',
    items: [
      {
        title: 'Jadwal KBM',
        href: '/jadwal-kbm',
        icon: <Calendar className="w-5 h-5 flex-shrink-0" />,
        children: [
          { title: 'Jadwal KBM Per Kelas', href: '/jadwal-kbm', icon: <Calendar className="w-4 h-4 text-cyan-300" /> },
          { title: 'Hari KBM', href: '/hari-kbm', icon: <CalendarDays className="w-4 h-4 text-amber-300" /> },
        ],
      },
      {
        title: 'Formasi Kelas',
        href: '/formasi',
        icon: <Building2 className="w-5 h-5 flex-shrink-0" />,
        children: [
          { title: 'Semua Kelas (Master)', href: '/formasi' },
          { title: 'Kelas Putra', href: '/formasi/pa' },
          { title: 'Kelas Putri', href: '/formasi/pi' },
        ],
      },
      {
        title: 'Fan Pelajaran',
        href: '/fan/pelajaran',
        icon: <BookMarked className="w-5 h-5 flex-shrink-0" />,
        children: [
          { title: 'Daftar Fan Pelajaran', href: '/fan/pelajaran' },
          { title: 'Pengajar Fan', href: '/fan/pengajar' },
        ],
      },
      { title: 'Daftar Pendidik', href: '/daftar-pendidik', icon: <GraduationCap className="w-5 h-5 flex-shrink-0" /> },
    ],
  },
  {
    group: 'PKM. Muhafadzoh',
    items: [
      { title: 'Setoran', href: '/setoran', icon: <Grid className="w-5 h-5 flex-shrink-0" /> },
      { title: 'Rekap Hafalan', href: '/rekap-hafalan', icon: <BarChart2 className="w-5 h-5 flex-shrink-0" /> },
      { title: 'Cetak Piagam', href: '/piagam', icon: <Award className="w-5 h-5 flex-shrink-0" /> },
    ],
  },
  {
    group: 'PKM. Kesiswaan',
    items: [
      { title: 'Absensi Asatidz', href: '/absensi', icon: <ClipboardCheck className="w-5 h-5 flex-shrink-0" /> },
      { title: 'Absen Cepat', href: '/absen-cepat', icon: <Zap className="w-5 h-5 flex-shrink-0" /> },
      { title: 'Rekap Absensi', href: '/rekap-absensi', icon: <BarChart2 className="w-5 h-5 flex-shrink-0" /> },
    ],
  },
];

export default function SidebarDesktop() {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebarCollapse } = useAppStore();
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    'Jadwal KBM': true,
  });

  // Automatically keep parent submenu open if current path is a child
  useEffect(() => {
    menuGroups.forEach((grp) => {
      grp.items.forEach((item) => {
        if (item.children) {
          const isChildActive = item.children.some((sub) => sub.href === pathname);
          if (isChildActive) {
            setOpenSubmenus((prev) => ({ ...prev, [item.title]: true }));
          }
        }
      });
    });
  }, [pathname]);

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
      {/* Header Sidebar & Tombol Toggle Bulat Melayang Sesuai Gambar 1 */}
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
        {menuGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            {/* Judul Grup */}
            {!isSidebarCollapsed ? (
              <div className="text-[10px] font-bold tracking-wider text-white/45 uppercase px-3 pt-2 pb-1">
                {grp.group}
              </div>
            ) : (
              <div className="border-t border-white/10 my-2 mx-2" />
            )}

            {grp.items.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isSubOpen = openSubmenus[item.title];
              const isParentActive =
                pathname === item.href ||
                (hasChildren && item.children?.some((sub) => sub.href === pathname));

              if (hasChildren) {
                return (
                  <div key={item.title}>
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
                        <span className="flex-shrink-0">{item.icon}</span>
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
                        {item.children?.map((sub) => {
                          const isSubActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-all ${
                                isSubActive
                                  ? 'bg-white/25 text-white font-bold'
                                  : 'text-white/75 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              {sub.icon && <span>{sub.icon}</span>}
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
                  key={item.href}
                  href={item.href || '#'}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isParentActive
                      ? 'bg-white/20 text-white shadow-inner font-semibold'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                  title={isSidebarCollapsed ? item.title : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <span className="truncate whitespace-nowrap">{item.title}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
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
