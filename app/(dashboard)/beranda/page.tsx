'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Zap,
  Calendar,
  Layers,
  CheckCircle2,
  SlidersHorizontal,
  Home,
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  BookMarked,
  GraduationCap,
  Grid,
  BarChart2,
  Award,
  ClipboardCheck,
  Newspaper,
  Settings,
  Sliders,
  LayoutList,
  ShieldCheck,
  BookOpen,
  MessageSquare,
  FileText,
  Package,
  Wrench,
  CheckSquare,
  ArrowRight,
  X,
  Clock,
} from 'lucide-react';
import { useSidebarConfigStore, DEFAULT_SIDEBAR_GROUPS } from '@/stores/useSidebarConfigStore';
import { ConfigMenuGroup, ConfigMenuItem, ConfigSubMenuItem } from '@/types/sidebar-config';
import { useRbacStore } from '@/stores/useRbacStore';
import { canViewPage, resolvePageIdFromPathname } from '@/lib/utils/rbacHelper';
import { useKalenderStore } from '@/stores/useKalenderStore';

// Registry of Lucide icons for rich visual rendering
const GROUP_ICON_REGISTRY: Record<string, React.ReactNode> = {
  'grp-beranda': <Home className="w-6 h-6 text-emerald-700" />,
  'grp-utama': <Users className="w-6 h-6 text-[#0f766e]" />,
  'grp-kurikulum': <BookMarked className="w-6 h-6 text-teal-700" />,
  'grp-muhafadzoh': <BookOpen className="w-6 h-6 text-emerald-800" />,
  'grp-kesiswaan': <ClipboardCheck className="w-6 h-6 text-amber-700" />,
  'grp-sapras': <Package className="w-6 h-6 text-cyan-800" />,
  'grp-publikasi': <Newspaper className="w-6 h-6 text-blue-700" />,
  'grp-ebtadin': <GraduationCap className="w-6 h-6 text-emerald-900" />,
  'grp-pengaturan': <Settings className="w-6 h-6 text-slate-700" />,
};

const ITEM_ICON_REGISTRY: Record<string, React.ReactNode> = {
  Home: <Home className="w-4 h-4 text-emerald-600" />,
  LayoutDashboard: <LayoutDashboard className="w-4 h-4 text-emerald-600" />,
  Users: <Users className="w-4 h-4 text-teal-600" />,
  UserCheck: <UserCheck className="w-4 h-4 text-emerald-600" />,
  Calendar: <Calendar className="w-4 h-4 text-amber-600" />,
  CalendarDays: <Calendar className="w-4 h-4 text-amber-600" />,
  Building2: <Building2 className="w-4 h-4 text-slate-600" />,
  BookMarked: <BookMarked className="w-4 h-4 text-teal-700" />,
  GraduationCap: <GraduationCap className="w-4 h-4 text-[#0f766e]" />,
  Grid: <Grid className="w-4 h-4 text-emerald-600" />,
  BarChart2: <BarChart2 className="w-4 h-4 text-teal-600" />,
  Award: <Award className="w-4 h-4 text-amber-600" />,
  ClipboardCheck: <ClipboardCheck className="w-4 h-4 text-emerald-600" />,
  Zap: <Zap className="w-4 h-4 text-amber-500" />,
  Newspaper: <Newspaper className="w-4 h-4 text-blue-600" />,
  Settings: <Settings className="w-4 h-4 text-slate-600" />,
  Sliders: <Sliders className="w-4 h-4 text-slate-600" />,
  LayoutList: <LayoutList className="w-4 h-4 text-slate-600" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4 text-emerald-700" />,
  BookOpen: <BookOpen className="w-4 h-4 text-emerald-700" />,
  MessageSquare: <MessageSquare className="w-4 h-4 text-emerald-600" />,
  FileText: <FileText className="w-4 h-4 text-slate-600" />,
  Package: <Package className="w-4 h-4 text-cyan-700" />,
  Wrench: <Wrench className="w-4 h-4 text-amber-700" />,
  CheckSquare: <CheckSquare className="w-4 h-4 text-emerald-600" />,
};

// Deskripsi penjelas ringkas tiap grup menu
const GROUP_DESCRIPTIONS: Record<string, string> = {
  'grp-beranda': 'Pusat navigasi utama dan dashboard ringkasan statistik madrasah.',
  'grp-utama': 'Pangkalan basis data induk santri, asatidz, dan catatan pengurus.',
  'grp-kurikulum': 'Manajemen jadwal pelajaran, kalender akademik, dan formasi rombel santri.',
  'grp-muhafadzoh': 'Pencatatan setoran nadhom & Al-Qur’an, rekap hafalan, dan sertifikasi piagam.',
  'grp-kesiswaan': 'Presensi kehadiran pengajar, absen cepat gerbang, dan rekapitulasi KBM.',
  'grp-sapras': 'Pengelolaan sarana prasarana, inventaris kelas, dan perbaikan logistik.',
  'grp-publikasi': 'Warta madrasah, publikasi artikel berita, dan informasi santri.',
  'grp-ebtadin': 'Pusat kendali ujian akhir kelulusan (EBTADIN), rekap nilai, dan serah ijazah.',
  'grp-pengaturan': 'Konfigurasi tahun ajaran, manajemen otoritas akun, dan audit log sistem.',
};

export default function BerandaPage() {
  const { groups } = useSidebarConfigStore();
  const currentAccount = useRbacStore((s) => s.currentAccount);
  const isAppSecurityEnabled = useRbacStore((s) => s.isAppSecurityEnabled);
  const activeTahunAjaran = useKalenderStore((s) => s.activeTahunAjaran);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Waktu & Jam Live
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    updateTime();
  }, []);

  // Keyboard shortcut Ctrl+K atau / untuk fokus ke kotak pencarian
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement !== searchInputRef.current)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeGroups = groups && groups.length > 0 ? groups : DEFAULT_SIDEBAR_GROUPS;

  const isMasterAdmin =
    !currentAccount ||
    currentAccount.role === 'master_admin' ||
    currentAccount.username === 'admin';

  const isItemPermitted = (item: ConfigMenuItem): boolean => {
    if (!item.href) return true;
    if (item.href.includes('tab=akun')) {
      return isMasterAdmin && isAppSecurityEnabled;
    }
    const pageId = resolvePageIdFromPathname(item.href);
    if (!pageId) return true;
    return canViewPage(currentAccount, pageId, item.href);
  };

  const isSubPermitted = (sub: ConfigSubMenuItem): boolean => {
    if (!sub.href) return true;
    if (sub.href.includes('tab=akun')) {
      return isMasterAdmin && isAppSecurityEnabled;
    }
    const pageId = resolvePageIdFromPathname(sub.href);
    if (!pageId) return true;
    return canViewPage(currentAccount, pageId, sub.href);
  };

  // Inisialisasi status buka/tutup grup: Secara default terbuka semua grup agar pengguna langsung melihat menu
  useEffect(() => {
    const initialGroupState: Record<string, boolean> = {};
    activeGroups.forEach((g) => {
      initialGroupState[g.id] = true;
    });
    setExpandedGroups(initialGroupState);
  }, [activeGroups.length]);

  // Toggle buka/tutup grup
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Toggle buka/tutup sub-menu di dalam menu utama
  const toggleMenu = (menuId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const handleExpandAll = () => {
    const allGroups: Record<string, boolean> = {};
    const allMenus: Record<string, boolean> = {};
    activeGroups.forEach((g) => {
      allGroups[g.id] = true;
      (g.items || []).forEach((item) => {
        if (item.children && item.children.length > 0) {
          allMenus[item.id] = true;
        }
      });
    });
    setExpandedGroups(allGroups);
    setExpandedMenus(allMenus);
  };

  const handleCollapseAll = () => {
    setExpandedGroups({});
    setExpandedMenus({});
  };

  // Filter Grup dan Menu berdasarkan Kata Kunci Pencarian & Kategori Filter
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return activeGroups
      .filter((g) => {
        if (selectedGroupFilter !== 'ALL' && g.id !== selectedGroupFilter) {
          return false;
        }
        return true;
      })
      .map((g) => {
        // Filter items yang diizinkan oleh hak akses RBAC
        const permittedItems = (g.items || []).filter(isItemPermitted);

        // Jika tidak ada kata kunci, tampilkan seluruh item yang berhak
        if (!query) {
          return {
            ...g,
            items: permittedItems,
          };
        }

        // Jika ada pencarian: Cek apakah nama grup, nama item, atau nama sub-item cocok
        const groupMatches = g.group.toLowerCase().includes(query);

        const matchingItems = permittedItems.filter((item) => {
          const itemTitleMatches = item.title.toLowerCase().includes(query);
          const childMatches = (item.children || []).some(
            (c) => isSubPermitted(c) && c.title.toLowerCase().includes(query)
          );
          return groupMatches || itemTitleMatches || childMatches;
        });

        return {
          ...g,
          items: matchingItems,
        };
      })
      .filter((g) => g.items.length > 0);
  }, [activeGroups, searchQuery, selectedGroupFilter, currentAccount]);

  // Hitung total menu & sub-menu yang ditemukan
  const totalItemsCount = useMemo(() => {
    let count = 0;
    filteredGroups.forEach((g) => {
      count += g.items.length;
      g.items.forEach((it) => {
        if (it.children) count += it.children.length;
      });
    });
    return count;
  }, [filteredGroups]);

  // Otomatis buka grup dan sub-menu saat sedang melakukan pencarian
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const autoExpandGroups: Record<string, boolean> = {};
      const autoExpandMenus: Record<string, boolean> = {};
      filteredGroups.forEach((g) => {
        autoExpandGroups[g.id] = true;
        g.items.forEach((item) => {
          if (item.children && item.children.length > 0) {
            autoExpandMenus[item.id] = true;
          }
        });
      });
      setExpandedGroups(autoExpandGroups);
      setExpandedMenus(autoExpandMenus);
    }
  }, [searchQuery, filteredGroups]);

  // Pintasan Cepat Populer (Quick Access)
  const quickAccessShortcuts = [
    {
      title: 'Absen Cepat',
      desc: 'Presensi asatidz harian',
      href: '/absen-cepat',
      icon: <Zap className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 border-amber-200 text-amber-900',
    },
    {
      title: 'Setoran Santri',
      desc: 'Input muhafadzoh santri',
      href: '/setoran',
      icon: <BookOpen className="w-5 h-5 text-emerald-700" />,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    },
    {
      title: 'Pusat Kendali EBTADIN',
      desc: 'Ujian, yudisium & ijazah',
      href: '/ebtadin',
      icon: <GraduationCap className="w-5 h-5 text-[#0f766e]" />,
      color: 'bg-teal-50 border-teal-200 text-teal-900',
    },
    {
      title: 'Jadwal KBM',
      desc: 'Penyusunan jadwal kelas',
      href: '/jadwal-kbm',
      icon: <Calendar className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-50 border-blue-200 text-blue-900',
    },
    {
      title: 'Inventaris Kelas',
      desc: 'Sarana & audit sapras',
      href: '/sapras/inventaris-kelas',
      icon: <Package className="w-5 h-5 text-cyan-700" />,
      color: 'bg-cyan-50 border-cyan-200 text-cyan-900',
    },
    {
      title: 'Dashboard Statistik',
      desc: 'Grafik & analitik KPI',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5 text-slate-700" />,
      color: 'bg-slate-50 border-slate-200 text-slate-800',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* 1. Header Sambutan Pengurus & Info Waktu */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b5751] via-[#0f766e] to-[#0a4d48] text-white p-6 sm:p-7 shadow-sm border border-emerald-900/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-emerald-100 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Portal Terpadu Pengurus MADINA</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-serif text-white">
              Ahlan Wa Sahlan,{' '}
              <span className="text-amber-300">
                {currentAccount?.full_name || 'Pengurus Madrasah'}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Direktori seluruh grup modul dan fasilitas kerja operasional Madrasah Diniyyah Al-Amiriyyah Blokagung.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-semibold text-emerald-100">
                Tahun Ajaran: {activeTahunAjaran || '2026/2027'}
              </span>
            </div>
            {currentTime && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-emerald-200 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-emerald-300" />
                <span>{currentTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ornamen Grafis Latar Khas Khazanah */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
          <BookOpen className="w-72 h-72 text-white" />
        </div>
      </div>

      {/* 2. Hub Pintasan Akses Cepat (Quick Access) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Akses Cepat Harian
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Paling Sering Digunakan</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickAccessShortcuts.map((shortcut) => (
            <Link
              key={shortcut.title}
              href={shortcut.href}
              className={`p-3.5 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-xs flex flex-col justify-between group ${shortcut.color}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-white/80 shadow-2xs group-hover:bg-white transition">
                  {shortcut.icon}
                </div>
                <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </div>
              <div>
                <div className="text-xs font-bold leading-snug">{shortcut.title}</div>
                <div className="text-[10px] opacity-75 mt-0.5">{shortcut.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Bilah Pencarian Cerdas & Pengatur Tampilan */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Input Pencarian */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari modul, grup, atau sub-menu (contoh: Ujian, Setoran, Absensi, Ijazah, Guru, Inventaris)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f766e] focus:bg-white transition"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded">
                Ctrl K
              </kbd>
            )}
          </div>

          {/* Tombol Kontrol Buka/Tutup Semua */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
              title="Buka semua kartu grup dan sub-menunya"
            >
              <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
              <span>Buka Semua</span>
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
              title="Tutup semua kartu grup"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span>Tutup Semua</span>
            </button>
          </div>
        </div>

        {/* Filter Pills Kategori Grup */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1 flex-shrink-0">
            <SlidersHorizontal className="w-3 h-3" />
            <span>Kategori:</span>
          </span>

          <button
            type="button"
            onClick={() => setSelectedGroupFilter('ALL')}
            className={`px-3 py-1 rounded-full font-semibold transition text-xs flex-shrink-0 ${
              selectedGroupFilter === 'ALL'
                ? 'bg-[#0f766e] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Grup
          </button>

          {activeGroups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedGroupFilter(g.id)}
              className={`px-3 py-1 rounded-full font-semibold transition text-xs flex-shrink-0 ${
                selectedGroupFilter === g.id
                  ? 'bg-[#0f766e] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {g.group}
            </button>
          ))}
        </div>

        {/* Indikator Hasil Pencarian */}
        {searchQuery.trim() && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan hasil pencarian untuk kata kunci &quot;<strong className="text-slate-800">{searchQuery}</strong>&quot;
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200">
              {totalItemsCount} Modul &amp; Sub-Menu Ditemukan
            </span>
          </div>
        )}
      </div>

      {/* 4. Katalog Direktori Grup Menu (Hierarki 3 Level) */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <Search className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">Tidak ada menu yang sesuai</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ditemukan grup, menu, atau sub-menu dengan kata kunci &quot;{searchQuery}&quot;. Coba periksa ejaan atau gunakan kata kunci lain.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedGroupFilter('ALL');
              }}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition inline-flex items-center gap-1.5"
            >
              <span>Reset Pencarian</span>
            </button>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = Boolean(expandedGroups[group.id]);
            const groupIcon = GROUP_ICON_REGISTRY[group.id] || <Layers className="w-6 h-6 text-slate-700" />;
            const groupDesc = GROUP_DESCRIPTIONS[group.id] || 'Grup modul operasional sistem MADINA Blokagung.';

            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200"
              >
                {/* LEVEL 1: Header Grup Menu (Dapat diklik untuk expand/collapse) */}
                <div
                  onClick={() => toggleGroup(group.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/70 transition bg-slate-50/30 border-b border-slate-100"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex-shrink-0">
                      {groupIcon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-800 tracking-tight">
                          {group.group}
                        </h2>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {group.items.length} Menu
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {groupDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-3">
                    <span className="text-xs font-semibold text-slate-400 hidden sm:inline-block">
                      {isExpanded ? 'Tutup' : 'Buka'}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 bg-slate-100' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* LEVEL 2 & 3: Daftar Menu dan Sub-Menu di dalam Grup */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-white">
                    {group.items.map((item) => {
                      const hasChildren = Boolean(item.children && item.children.length > 0);
                      const isMenuExpanded = expandedMenus[item.id] === true;
                      const itemIcon = item.iconName ? (ITEM_ICON_REGISTRY[item.iconName] || <FileText className="w-4 h-4 text-slate-500" />) : <FileText className="w-4 h-4 text-slate-500" />;

                      // Jika Menu Memiliki Anak (Sub-Menu)
                      if (hasChildren) {
                        const permittedChildren = (item.children || []).filter(isSubPermitted);

                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200/90 bg-slate-50/50 hover:border-slate-300 transition overflow-hidden flex flex-col justify-between"
                          >
                            {/* Tombol Header Menu Beranak (Level 2) */}
                            <button
                              type="button"
                              onClick={(e) => toggleMenu(item.id, e)}
                              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/60 transition select-none group"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-slate-700 group-hover:border-slate-300 transition">
                                  {itemIcon}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 truncate">
                                    {item.title}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-medium">
                                    {permittedChildren.length} Sub-Menu
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Akordion
                                </span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                    isMenuExpanded ? 'rotate-180 text-emerald-700' : ''
                                  }`}
                                />
                              </div>
                            </button>

                            {/* LEVEL 3: Sub-Menu Terbuka (Nested Links) */}
                            {isMenuExpanded && (
                              <div className="px-3.5 pb-3.5 pt-1 space-y-1.5 border-t border-slate-200/60 bg-white">
                                {permittedChildren.map((sub) => {
                                  const subIcon = sub.iconName
                                    ? ITEM_ICON_REGISTRY[sub.iconName] || <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                    : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />;

                                  return (
                                    <Link
                                      key={sub.id || sub.href}
                                      href={sub.href}
                                      className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#0b5751] hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition group/sub"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                                        <span className="truncate">{sub.title}</span>
                                      </div>
                                      <ArrowRight className="w-3 h-3 text-slate-300 group-hover/sub:text-[#0f766e] group-hover/sub:translate-x-0.5 transition flex-shrink-0" />
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Jika Menu Mandiri Tanpa Anak (Level 2 Langsung Masuk Halaman)
                      return (
                        <Link
                          key={item.id}
                          href={item.href || '#'}
                          className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-[#0f766e]/50 hover:shadow-xs transition flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 group-hover:bg-emerald-50 group-hover:border-emerald-200 group-hover:text-[#0f766e] transition">
                              {itemIcon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 group-hover:text-[#0b5751] transition truncate">
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-400 font-normal">
                                Buka Modul
                              </div>
                            </div>
                          </div>

                          <div className="w-6 h-6 rounded-lg bg-slate-50 group-hover:bg-emerald-100/70 text-slate-400 group-hover:text-[#0f766e] flex items-center justify-center transition flex-shrink-0">
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
