'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Layers,
  Users,
  BookOpen,
  Clock,
  Newspaper,
  Film,
  BookMarked,
} from 'lucide-react';

interface SubMenuItem {
  label: string;
  href: string;
  description?: string;
  icon?: React.ReactNode;
}

interface NestedMenuGroup {
  groupLabel: string;
  items: SubMenuItem[];
}

interface TopNavEntry {
  id: string;
  label: string;
  href?: string;
  items?: SubMenuItem[];
  nestedGroup?: NestedMenuGroup;
}

const TOP_NAV_ITEMS: TopNavEntry[] = [
  {
    id: 'beranda',
    label: 'Beranda',
    href: '/#hero',
  },
  {
    id: 'tentang-kami',
    label: 'Tentang Kami',
    items: [
      {
        label: 'Statistik',
        href: '/#statistik',
        description: 'Capaian santri, kelas & sejarah lembaga',
        icon: <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
      },
      {
        label: '3 Pilar Program',
        href: '/#program',
        description: 'Reguler, Unggulan & Akselerasi IHFAD',
        icon: <Layers className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
      },
      {
        label: 'Kepengurusan',
        href: '/kepengurusan',
        description: 'Struktur personalia Putra & Putri resmi',
        icon: <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      },
    ],
  },
  {
    id: 'kurikulum',
    label: 'Kurikulum',
    items: [
      {
        label: 'Kurikulum Kitab',
        href: '/#kurikulum',
        description: 'Khazanah kitab kuning per jenjang',
        icon: <BookOpen className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
      },
      {
        label: 'Waktu KBM',
        href: '/#waktu-kbm',
        description: 'Jadwal Takror Siang & Diniyyah Malam',
        icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      },
    ],
  },
  {
    id: 'media-madin',
    label: 'Media Madin',
    items: [
      {
        label: 'Kabar Berita',
        href: '/berita',
        description: 'Warta & dokumentasi kegiatan madrasah',
        icon: <Newspaper className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
      },
      {
        label: 'Galeri Sosmed',
        href: '/galeri-sosmed',
        description: 'Portofolio YouTube, Instagram & TikTok',
        icon: <Film className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      },
    ],
  },
  {
    id: 'muhafadzoh',
    label: 'Muhafadzoh',
    nestedGroup: {
      groupLabel: 'Daftar Hafalan',
      items: [
        {
          label: 'ULA',
          href: '/daftar-hafalan/ula',
          description: 'Target hafalan kelas 1 – 4 Ula',
          icon: <BookMarked className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />,
        },
        {
          label: 'WUSTHO',
          href: '/daftar-hafalan/wustho',
          description: 'Target hafalan kelas 1 – 2 Wustho',
          icon: <BookMarked className="w-4 h-4 text-teal-700 dark:text-teal-400" />,
        },
        {
          label: 'ULYA',
          href: '/daftar-hafalan/ulya',
          description: 'Target hafalan kelas 1 – 2 Ulya',
          icon: <BookMarked className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        },
      ],
    },
  },
  {
    id: 'kontak',
    label: 'Kontak',
    href: '/#kontak',
  },
];

export default function NavbarProfil() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [mobileOpenGroupId, setMobileOpenGroupId] = useState<string | null>('tentang-kami');
  const navRef = useRef<HTMLElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpenedAtRef = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdownId(null);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleOpenDropdownHover = (id: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (openDropdownId !== id) {
      hoverOpenedAtRef.current = { id, at: Date.now() };
    }
    setOpenDropdownId(id);
  };

  const handleToggleDropdownClick = (id: string) => {
    const hoverInfo = hoverOpenedAtRef.current;
    if (hoverInfo && hoverInfo.id === id && Date.now() - hoverInfo.at < 350) {
      hoverOpenedAtRef.current = null;
      setOpenDropdownId(id);
      return;
    }
    hoverOpenedAtRef.current = null;
    setOpenDropdownId((prev) => (prev === id ? null : id));
  };

  const handleCloseDropdownHover = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOpenDropdownId(null);
    }, 120);
  };

  const handleAnchorLinkClick = (href: string) => {
    setOpenDropdownId(null);
    setMobileMenuOpen(false);

    if (pathname === '/' && href.startsWith('/#')) {
      const targetHash = href.slice(1);
      if (window.location.hash === targetHash) {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        const elId = targetHash.slice(1);
        document.getElementById(elId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const isEntryActive = (entry: TopNavEntry) => {
    if (entry.id === 'tentang-kami') return pathname?.startsWith('/kepengurusan');
    if (entry.id === 'media-madin') {
      return pathname?.startsWith('/berita') || pathname?.startsWith('/galeri-sosmed');
    }
    if (entry.id === 'muhafadzoh') return pathname?.startsWith('/daftar-hafalan');
    return false;
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-emerald-900/10 dark:border-emerald-500/20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          {/* Logo & Identitas Madrasah */}
          <Link href="/#hero" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200/90 flex items-center justify-center p-1 group-hover:scale-105 transition-transform">
              <img
                src="/logo-madin.png"
                alt="Logo Madin Blokagung"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-emerald-950 dark:text-emerald-50 font-serif">
                Madin Blokagung
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide">
                Ponpes Darussalam Blokagung
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Navigasi Utama">
            {TOP_NAV_ITEMS.map((entry) => {
              const hasDropdown = Boolean(entry.items || entry.nestedGroup);
              const isOpen = openDropdownId === entry.id;
              const active = isEntryActive(entry);

              if (!hasDropdown && entry.href) {
                return (
                  <a
                    key={entry.id}
                    href={entry.href}
                    onClick={() => handleAnchorLinkClick(entry.href!)}
                    className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    {entry.label}
                  </a>
                );
              }

              return (
                <div
                  key={entry.id}
                  className="relative"
                  onMouseEnter={() => handleOpenDropdownHover(entry.id)}
                  onMouseLeave={handleCloseDropdownHover}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    onClick={() => handleToggleDropdownClick(entry.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                      isOpen || active
                        ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-slate-800'
                        : 'text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{entry.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 mt-1.5 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 shadow-xl shadow-slate-900/10 p-2 z-50"
                    >
                      {entry.items && (
                        <div className="space-y-1">
                          {entry.items.map((sub) => {
                            const isRoute = !sub.href.startsWith('/#');
                            const content = (
                              <>
                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                                  {sub.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover/item:text-emerald-800 dark:group-hover/item:text-emerald-300">
                                    {sub.label}
                                  </div>
                                  {sub.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                      {sub.description}
                                    </p>
                                  )}
                                </div>
                              </>
                            );

                            if (isRoute) {
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  role="menuitem"
                                  onClick={() => setOpenDropdownId(null)}
                                  className="group/item flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-slate-800 transition-colors"
                                >
                                  {content}
                                </Link>
                              );
                            }

                            return (
                              <a
                                key={sub.href}
                                href={sub.href}
                                role="menuitem"
                                onClick={() => handleAnchorLinkClick(sub.href)}
                                className="group/item flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-slate-800 transition-colors"
                              >
                                {content}
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {entry.nestedGroup && (
                        <div className="space-y-1.5">
                          <div className="px-3 pt-1.5 pb-1 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                              {entry.nestedGroup.groupLabel}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="space-y-1">
                            {entry.nestedGroup.items.map((sub) => (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                role="menuitem"
                                onClick={() => setOpenDropdownId(null)}
                                className="group/item flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                                  {sub.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover/item:text-emerald-800 dark:group-hover/item:text-emerald-300">
                                    {sub.label}
                                  </div>
                                  {sub.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                                      {sub.description}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Mobile Menu Toggle Button */}
          <div className="flex lg:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-1.5 max-h-[80vh] overflow-y-auto">
          {TOP_NAV_ITEMS.map((entry) => {
            const hasChildren = Boolean(entry.items || entry.nestedGroup);
            const isMobileOpen = mobileOpenGroupId === entry.id;

            if (!hasChildren && entry.href) {
              return (
                <a
                  key={entry.id}
                  href={entry.href}
                  onClick={() => handleAnchorLinkClick(entry.href!)}
                  className="flex items-center min-h-[44px] px-3 py-2.5 rounded-xl text-base font-semibold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  {entry.label}
                </a>
              );
            }

            return (
              <div key={entry.id} className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isMobileOpen}
                  onClick={() => setMobileOpenGroupId((prev) => (prev === entry.id ? null : entry.id))}
                  className="w-full flex items-center justify-between min-h-[44px] px-3 py-2.5 text-base font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/70 dark:bg-slate-800/40"
                >
                  <span>{entry.label}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isMobileOpen ? 'rotate-180 text-emerald-700' : ''
                    }`}
                  />
                </button>

                {isMobileOpen && (
                  <div className="px-2 py-2 space-y-1 bg-white dark:bg-slate-900">
                    {entry.items?.map((sub) => {
                      const isRoute = !sub.href.startsWith('/#');
                      if (isRoute) {
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800"
                          >
                            {sub.icon}
                            <span>{sub.label}</span>
                          </Link>
                        );
                      }
                      return (
                        <a
                          key={sub.href}
                          href={sub.href}
                          onClick={() => handleAnchorLinkClick(sub.href)}
                          className="flex items-center gap-3 min-h-[44px] px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800"
                        >
                          {sub.icon}
                          <span>{sub.label}</span>
                        </a>
                      );
                    })}

                    {entry.nestedGroup && (
                      <div className="space-y-1">
                        <div className="px-3 pt-1 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          {entry.nestedGroup.groupLabel}
                        </div>
                        {entry.nestedGroup.items.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 min-h-[44px] pl-5 pr-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800"
                          >
                            {sub.icon}
                            <span>{sub.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </header>
  );
}
