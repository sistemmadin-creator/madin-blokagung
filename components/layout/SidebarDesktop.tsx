'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  UserCheck,
  Calendar,
  Clock,
  Layers,
  BookOpen,
  Award,
  ClipboardCheck,
  Zap,
  BarChart2,
  ChevronDown,
  GraduationCap
} from 'lucide-react';

interface MenuItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  children?: { title: string; href: string }[];
}

const menuGroups: { group: string; items: MenuItem[] }[] = [
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
        icon: <Calendar className="w-5 h-5 flex-shrink-0" />,
        children: [
          { title: 'Jadwal KBM Per Kelas', href: '/jadwal-kbm' },
          { title: 'Hari KBM', href: '/hari-kbm' },
        ],
      },
      {
        title: 'Formasi Kelas',
        icon: <Layers className="w-5 h-5 flex-shrink-0" />,
        children: [
          { title: 'Formasi Putra (PA)', href: '/formasi/pa' },
          { title: 'Formasi Putri (PI)', href: '/formasi/pi' },
        ],
      },
      {
        title: 'Fan Pelajaran',
        icon: <BookOpen className="w-5 h-5 flex-shrink-0" />,
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
      { title: 'Setoran', href: '/setoran', icon: <Clock className="w-5 h-5 flex-shrink-0" /> },
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
  const [isHovered, setIsHovered] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-16 left-0 bottom-0 bg-madin-900 text-white z-20 hidden md:flex flex-col transition-all duration-300 ease-in-out shadow-xl overflow-y-auto ${
        isHovered ? 'w-64' : 'w-18'
      }`}
    >
      <div className="py-4 space-y-6 flex-1 px-3">
        {menuGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            {isHovered && (
              <p className="px-3 text-[10px] font-bold tracking-wider text-madin-300 uppercase select-none">
                {grp.group}
              </p>
            )}
            {grp.items.map((item) => {
              if (item.children) {
                const isOpen = openSubmenus[item.title];
                return (
                  <div key={item.title}>
                    <button
                      onClick={() => toggleSubmenu(item.title)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-slate-200 hover:bg-madin-800 transition"
                      title={!isHovered ? item.title : undefined}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        {isHovered && <span className="font-medium whitespace-nowrap">{item.title}</span>}
                      </div>
                      {isHovered && (
                        <ChevronDown
                          className={`w-4 h-4 text-madin-400 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>
                    {isHovered && isOpen && (
                      <div className="ml-8 mt-1 space-y-1 border-l-2 border-madin-700 pl-2">
                        {item.children.map((sub) => {
                          const active = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`block px-2.5 py-1.5 text-xs rounded-md transition ${
                                active
                                  ? 'bg-madin-700 text-white font-semibold'
                                  : 'text-slate-300 hover:text-white hover:bg-madin-800'
                              }`}
                            >
                              {sub.title}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href || '#'}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                    active
                      ? 'bg-madin-700 text-white font-semibold shadow-inner'
                      : 'text-slate-200 hover:bg-madin-800 hover:text-white'
                  }`}
                  title={!isHovered ? item.title : undefined}
                >
                  {item.icon}
                  {isHovered && <span className="font-medium whitespace-nowrap">{item.title}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
