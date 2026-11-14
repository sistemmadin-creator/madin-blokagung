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
  User,
  Phone,
  MessageCircle,
  Hash,
  School,
  FileCheck,
  MapPin,
} from 'lucide-react';
import { useSidebarConfigStore, DEFAULT_SIDEBAR_GROUPS } from '@/stores/useSidebarConfigStore';
import { ConfigMenuGroup, ConfigMenuItem, ConfigSubMenuItem } from '@/types/sidebar-config';
import { useRbacStore } from '@/stores/useRbacStore';
import { canViewPage, resolvePageIdFromPathname } from '@/lib/utils/rbacHelper';
import { useKalenderStore } from '@/stores/useKalenderStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import {
  useSetorMustahiqStore,
  buildSantriSetorRow,
  computeMateriProgressForSantri,
  getMateriOptionsWithStatusForSantri,
} from '@/stores/useSetorMustahiqStore';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useJadwalStore, LIST_HARI } from '@/stores/useJadwalStore';
import {
  getJadwalGuruFromMap,
  parseJadwalCell_Client,
  formatTampilanKelas,
} from '@/lib/utils/jadwalHelper';
import {
  VALID_JAH_WALIKELAS,
  findWaliKelasAsatidz,
  getSantriInFormasi,
  norm,
} from '@/lib/utils/formasiSync';
import { formatTargetPreview, cariMustahiqSantri } from '@/lib/utils/setoranHelper';
import { useSaprasStore, buildKelasSaprasRows } from '@/stores/useSaprasStore';
import { KondisiSapras, KONDISI_SAPRAS_META, KelasSaprasRow } from '@/types/sapras';
import { Santri } from '@/types/santri';
import { Asatidz } from '@/types/asatidz';

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

  // Data stores untuk Fitur Pencarian Cerdas Universal (Omni-Search)
  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();

  // Setor Mustahiq, Muhafadzoh, & Absensi data stores untuk integrasi kartu progres & keaktifan
  const { config: hafalanConfig, fetchSetoranData } = useMuhafadzohStore();
  const {
    logs: setoranLogs,
    activeStates: setoranActiveStates,
    fetchMustahiqData,
  } = useSetorMustahiqStore();
  const { absensiMapByDate, fetchAbsensi } = useAbsensiStore();
  const { jadwalMap, fetchJadwal, activeHari } = useJadwalStore();
  const {
    overrides: saprasOverrides,
    fetchSaprasData,
    updateKondisiCepatKelas,
  } = useSaprasStore();

  const [activeAsatidzMobileTab, setActiveAsatidzMobileTab] = useState<'profil' | 'jadwal'>('profil');
  const [activeKelasMobileTab, setActiveKelasMobileTab] = useState<'info' | 'inventaris'>('info');
  const [isUpdatingSapras, setIsUpdatingSapras] = useState(false);
  const [saprasSuccessNotice, setSaprasSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchSantri();
    fetchAsatidz();
    fetchFormasi();
    fetchSetoranData();
    fetchMustahiqData();
    fetchAbsensi();
    fetchJadwal();
    fetchSaprasData();
  }, [
    fetchSantri,
    fetchAsatidz,
    fetchFormasi,
    fetchSetoranData,
    fetchMustahiqData,
    fetchAbsensi,
    fetchJadwal,
    fetchSaprasData,
  ]);

  // Modal State untuk Pop-up Detail Omni-Search
  const [selectedSantriModal, setSelectedSantriModal] = useState<Santri | null>(null);
  const [selectedAsatidzModal, setSelectedAsatidzModal] = useState<Asatidz | null>(null);
  const [selectedKelasModal, setSelectedKelasModal] = useState<{
    label: string;
    tingkat: string;
    din_kls: string;
    din_bag: string;
    pa_pi: string;
    mustahiq: string;
    totalSantri: number;
    santriDiKelas: Santri[];
  } | null>(null);

  // State Tab Responsif Modal Santri (< lg)
  const [activeSantriMobileTab, setActiveSantriMobileTab] = useState<'profil' | 'capaian'>('profil');
  const [filterCapaianKategori, setFilterCapaianKategori] = useState<'ALL' | 'Wajib' | 'Sunnah' | 'Kitab' | 'Tahfidz'>('ALL');

  // ================= PERHITUNGAN KARTU PROGRES SETORAN & DAFTAR CAPAIAN SANTRI (GAMBAR 1, 2, 3) =================
  const santriSetoranDetail = useMemo(() => {
    if (!selectedSantriModal) return null;
    try {
      const s = selectedSantriModal;
      const tahun = activeTahunAjaran ? parseInt(activeTahunAjaran.split('/')[0], 10) || new Date().getFullYear() : new Date().getFullYear();
      const row = buildSantriSetorRow(
        s,
        hafalanConfig,
        setoranLogs,
        setoranActiveStates,
        asatidzList,
        formasiList,
        tahun
      );
      const prog = computeMateriProgressForSantri(
        s.no_induk,
        row.active_item,
        setoranLogs,
        tahun
      );

      const configKey = `${row.tingkat}_${row.din_kls}`;
      const activeState = setoranActiveStates[s.no_induk];
      const allMateriOptions = getMateriOptionsWithStatusForSantri(
        s.no_induk,
        configKey,
        hafalanConfig,
        setoranLogs,
        activeState,
        tahun
      );

      const listWajib = allMateriOptions.filter((o) => o.kategori === 'Wajib');
      const listSunnah = allMateriOptions.filter((o) => o.kategori === 'Sunnah');
      const listKitab = allMateriOptions.filter((o) => o.kategori === 'Kitab');
      const listTahfidz = allMateriOptions.filter((o) => o.kategori === 'Tahfidz');

      const countWajibSelesai = listWajib.filter((o) => o.isCompleted).length;
      const countSunnahSelesai = listSunnah.filter((o) => o.isCompleted).length;
      const countKitabSelesai = listKitab.filter((o) => o.isCompleted).length;
      const countTahfidzSelesai = listTahfidz.filter((o) => o.isCompleted).length;

      return {
        row,
        prog,
        isCompleted: prog.isCompleted,
        mustahiq:
          row.mustahiq ||
          cariMustahiqSantri(
            s.tingkat || '',
            s.din_bag || '',
            s.din_kls || '',
            s.pa_pi || 'PA',
            asatidzList,
            formasiList
          ),
        allMateriOptions,
        listWajib,
        listSunnah,
        listKitab,
        listTahfidz,
        countWajibSelesai,
        countSunnahSelesai,
        countKitabSelesai,
        countTahfidzSelesai,
      };
    } catch {
      return null;
    }
  }, [
    selectedSantriModal,
    hafalanConfig,
    setoranLogs,
    setoranActiveStates,
    asatidzList,
    formasiList,
    activeTahunAjaran,
  ]);

  // ================= PERHITUNGAN KEAKTIFAN ABSENSI ASATIDZ (GAMBAR 4) =================
  const asatidzAbsensiStat = useMemo(() => {
    if (!selectedAsatidzModal) return null;
    const a = selectedAsatidzModal;
    const targetNia = String(a.nia || '').trim();
    const targetNama = norm(a.nama_asatidz || '');

    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;
    let terlambatCount = 0;

    Object.values(absensiMapByDate || {}).forEach((dateBucket) => {
      ([1, 2, 3, 4] as const).forEach((jam) => {
        const records = dateBucket[jam] || [];
        records.forEach((r) => {
          const matchNia = targetNia && r.nia && String(r.nia).trim() === targetNia;
          const matchNama = targetNama && norm(r.nama_asatidz) === targetNama;
          if (matchNia || matchNama) {
            const st = String(r.status || '').toUpperCase();
            if (st === 'H' || st === 'HADIR') hadir++;
            else if (st === 'I' || st === 'IZIN') izin++;
            else if (st === 'S' || st === 'SAKIT') sakit++;
            else if (st === 'A' || st === 'ALFA' || st === 'ALPHA') alfa++;
            if (r.menit_terlambat && r.menit_terlambat > 0) terlambatCount++;
          }
        });
      });
    });

    const totalTerjadwal = hadir + izin + sakit + alfa;
    const pct = totalTerjadwal > 0 ? Math.round((hadir / totalTerjadwal) * 100) : 100;

    let predikat = 'Sangat Aktif';
    let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let barColor = 'bg-emerald-500';

    if (totalTerjadwal === 0) {
      predikat = 'Belum Ada Sesi';
      badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
      barColor = 'bg-slate-400';
    } else if (pct >= 90) {
      predikat = 'Sangat Aktif';
      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      barColor = 'bg-emerald-500';
    } else if (pct >= 75) {
      predikat = 'Aktif';
      badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
      barColor = 'bg-teal-500';
    } else if (pct >= 60) {
      predikat = 'Cukup Aktif';
      badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
      barColor = 'bg-amber-500';
    } else {
      predikat = 'Perlu Evaluasi';
      badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
      barColor = 'bg-rose-500';
    }

    return {
      totalTerjadwal,
      hadir,
      izin,
      sakit,
      alfa,
      terlambatCount,
      pct,
      predikat,
      badgeColor,
      barColor,
    };
  }, [selectedAsatidzModal, absensiMapByDate]);

  // ================= PERHITUNGAN SANTRI KELAS BINAAN JIKA WALIKELAS (GAMBAR 4) =================
  const asatidzWaliKelasInfo = useMemo(() => {
    if (!selectedAsatidzModal) return null;
    const a = selectedAsatidzModal;
    const jah = norm(a.jah_asatidz);
    const isWali = VALID_JAH_WALIKELAS.includes(jah);

    // Cari Formasi Kelas yang diampu oleh asatidz ini
    const formasi = formasiList.find((f) => {
      const matchWali = findWaliKelasAsatidz(f, [a]);
      if (matchWali.length > 0) return true;

      const fTingkat = norm(f.tingkat);
      const fKls = norm(f.din_kls);
      const fBag = norm(f.din_bag);
      const fGender = norm(f.pa_pi);

      const matchT = norm(a.tingkat_asatidz) === fTingkat;
      const matchK = norm(a.din_kls_asatidz) === fKls;
      const matchB = norm(a.din_bag_asatidz) === fBag;
      const matchG = !fGender || !a.pa_pi || norm(a.pa_pi) === fGender;
      return matchT && matchK && matchB && matchG;
    });

    if (!isWali && !formasi) return null;
    if (!formasi) {
      return {
        isWali: true,
        formasi: null,
        kelasLabel:
          `${a.din_kls_asatidz || ''} ${a.din_bag_asatidz || ''} ${a.tingkat_asatidz || ''}`.trim() ||
          'Kelas Belum Terhubung',
        santriBinaan: [] as Santri[],
      };
    }

    const santriBinaan = getSantriInFormasi(formasi, santriList);
    const kelasLabel = `${formasi.din_kls} ${formasi.din_bag} ${formasi.tingkat} (${formasi.pa_pi === 'PI' ? 'Putri' : 'Putra'})`;

    return {
      isWali: true,
      formasi,
      kelasLabel,
      santriBinaan,
    };
  }, [selectedAsatidzModal, formasiList, santriList]);

  // ================= PERHITUNGAN JADWAL MENGAJAR JAM 1 & JAM 2 (SABTU S/D KAMIS) =================
  const asatidzJadwalJam12 = useMemo(() => {
    if (!selectedAsatidzModal) return null;
    const a = selectedAsatidzModal;
    const jdwObj = getJadwalGuruFromMap(a.nama_asatidz, jadwalMap);

    let totalJam12 = 0;
    const days = LIST_HARI.map((h) => {
      const hKey = h.toLowerCase() as keyof typeof jdwObj;
      const rawVal = jdwObj[hKey] || '';
      const formatted = formatTampilanKelas(rawVal);
      const allSlots = parseJadwalCell_Client(formatted);
      // HANYA JAM 1 DAN 2 UNTUK SELURUH JAH ASATIDZ
      const filtered = allSlots.filter((slot) => slot.jam === 1 || slot.jam === 2);
      totalJam12 += filtered.length;

      const parsedSlots = filtered.map((s) => {
        const rawLokasi = (s.lokasi || '').trim();
        let kelas = '-';
        let ruang = '';

        const matchRuang = rawLokasi.match(/^(.*?)\s*\(([^()]+)\)$/);
        if (matchRuang && matchRuang[1] && matchRuang[2]) {
          kelas = matchRuang[1].trim();
          ruang = matchRuang[2].trim();
        } else {
          kelas = rawLokasi || '-';
        }

        return {
          jam: s.jam,
          fan: s.fan || 'Pelajaran Terjadwal',
          kelas,
          ruang,
        };
      });

      const jam1 = parsedSlots.find((s) => s.jam === 1) || null;
      const jam2 = parsedSlots.find((s) => s.jam === 2) || null;
      const isHariAktif = activeHari ? h.toLowerCase() === activeHari.toLowerCase() : false;

      return {
        hari: h,
        isHariAktif,
        hasSchedule: filtered.length > 0,
        jam1,
        jam2,
        count: filtered.length,
      };
    });

    return {
      totalJam12,
      days,
    };
  }, [selectedAsatidzModal, jadwalMap, activeHari]);

  // ================= PERHITUNGAN INVENTARIS SARANA KELAS (GAMBAR 1 & 2) =================
  const selectedKelasSaprasRow = useMemo<KelasSaprasRow | null>(() => {
    if (!selectedKelasModal) return null;
    const kls = String(selectedKelasModal.din_kls || '1').trim();
    const tk = String(selectedKelasModal.tingkat || 'ULA').trim().toUpperCase();
    const bag = String(selectedKelasModal.din_bag || 'A').trim().toUpperCase();
    const papi = (selectedKelasModal.pa_pi || 'PA').trim().toUpperCase() === 'PI' ? 'PI' : 'PA';
    const targetKey = `${kls}_${tk}_${bag}`;

    const allRows = buildKelasSaprasRows(formasiList, santriList, saprasOverrides);
    const found = allRows.find(
      (r) =>
        r.kelasKey === targetKey ||
        (r.din_kls === kls && r.tingkat === tk && r.din_bag === bag && r.pa_pi === papi)
    );

    if (found) return found;

    // Fallback default jika belum tersimpan di formasiList
    const ov = saprasOverrides[targetKey];
    const papanKondisi: KondisiSapras = ov?.papanTulisKondisi || 'BAIK';
    const mejaKondisi: KondisiSapras = ov?.mejaGuruKondisi || 'BAIK';
    const penghapusKondisi: KondisiSapras = ov?.penghapusKondisi || 'BAIK';
    const spidolKondisi: KondisiSapras = ov?.spidolKondisi || 'BAIK';

    return {
      kelasKey: targetKey,
      shortBadge: `${kls}${bag}`,
      kelasLabel: selectedKelasModal.label,
      tingkat: tk,
      din_kls: kls,
      din_bag: bag,
      pa_pi: papi,
      mustahiq: selectedKelasModal.mustahiq,
      blokDiniyyah: 'Gedung Madrasah',
      lokasiDiniyyah: `Ruang ${selectedKelasModal.label}`,
      blokTakror: '-',
      lokasiTakror: '-',
      papanTulisKondisi: papanKondisi,
      papanTulisJumlah: ov?.papanTulisJumlah ?? 1,
      papanTulisSpesifikasi: ov?.papanTulisSpesifikasi || 'Whiteboard Kelas Standar (120 x 240 cm)',
      mejaGuruKondisi: mejaKondisi,
      mejaGuruJumlah: ov?.mejaGuruJumlah ?? 1,
      mejaGuruSpesifikasi: ov?.mejaGuruSpesifikasi || 'Meja Guru / Dampar Kayu Asatidz',
      penghapusKondisi,
      spidolKondisi,
      itemTambahan: ov?.itemTambahan || [],
      catatanKelas: ov?.catatanKelas,
      updatedAt: ov?.updatedAt || new Date().toISOString(),
      isFullyHealthy:
        papanKondisi === 'BAIK' &&
        mejaKondisi === 'BAIK' &&
        penghapusKondisi === 'BAIK' &&
        spidolKondisi === 'BAIK',
    };
  }, [selectedKelasModal, formasiList, santriList, saprasOverrides]);

  const handleUpdateKondisiSaprasCepat = async (
    field: 'papanTulisKondisi' | 'mejaGuruKondisi' | 'penghapusKondisi' | 'spidolKondisi',
    nextKondisi: KondisiSapras
  ) => {
    if (!selectedKelasSaprasRow) return;
    setIsUpdatingSapras(true);
    try {
      await updateKondisiCepatKelas(
        selectedKelasSaprasRow,
        field,
        nextKondisi,
        currentAccount?.full_name || currentAccount?.username || 'Pengurus Beranda'
      );
      setSaprasSuccessNotice(`Status ${KONDISI_SAPRAS_META[nextKondisi].shortLabel} tersimpan.`);
      setTimeout(() => setSaprasSuccessNotice(null), 3000);
    } finally {
      setIsUpdatingSapras(false);
    }
  };

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

  // Data Kelas Universal untuk Navigasi Cepat & Omni-Search
  const daftarKelasUniversal = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        tingkat: string;
        din_kls: string;
        din_bag: string;
        pa_pi: string;
        mustahiq: string;
        totalSantri: number;
        santriDiKelas: Santri[];
      }
    >();

    // 1. Dari formasiList
    (formasiList || []).forEach((f) => {
      const kls = String(f.din_kls || '1').trim();
      const bag = String(f.din_bag || 'A').trim().toUpperCase();
      const tk = String(f.tingkat || 'ULA').trim().toUpperCase();
      const papi = String(f.pa_pi || 'PA').trim().toUpperCase();
      const key = `${kls}_${bag}_${tk}_${papi}`;
      const label = `${kls} ${bag} ${tk}`;

      const santriDiKelas = (santriList || []).filter((s) => {
        const sKls = String(s.din_kls || '').trim();
        const sBag = String(s.din_bag || '').trim().toUpperCase();
        const sTk = String(s.tingkat || '').trim().toUpperCase();
        const sPapi = String(s.pa_pi || 'PA').trim().toUpperCase();
        return sKls === kls && sBag === bag && (sTk === tk || sTk.includes(tk)) && sPapi === papi;
      });

      const matchedMustahiq = (asatidzList || []).find(
        (a) => a.nia === f.id_mustahiq || String(a.id) === String(f.id_mustahiq)
      );
      const mustahiqName =
        matchedMustahiq?.nama_asatidz ||
        (f as { wali_kelas_text?: string }).wali_kelas_text ||
        'Belum Ditentukan';

      map.set(key, {
        label,
        tingkat: tk,
        din_kls: kls,
        din_bag: bag,
        pa_pi: papi,
        mustahiq: mustahiqName,
        totalSantri: santriDiKelas.length || (f as { jumlah_santri?: number }).jumlah_santri || 0,
        santriDiKelas,
      });
    });

    // 2. Fallback jika formasiList kosong, ekstrak dari santriList
    if (map.size === 0 && santriList && santriList.length > 0) {
      santriList.forEach((s) => {
        const kls = String(s.din_kls || '1').trim();
        const bag = String(s.din_bag || 'A').trim().toUpperCase();
        const tk = String(s.tingkat || 'ULA').trim().toUpperCase();
        const papi = String(s.pa_pi || 'PA').trim().toUpperCase();
        const key = `${kls}_${bag}_${tk}_${papi}`;
        const label = `${kls} ${bag} ${tk}`;
        if (!map.has(key)) {
          map.set(key, {
            label,
            tingkat: tk,
            din_kls: kls,
            din_bag: bag,
            pa_pi: papi,
            mustahiq: 'Mustahiq Terdata',
            totalSantri: 0,
            santriDiKelas: [],
          });
        }
        const item = map.get(key)!;
        item.totalSantri += 1;
        item.santriDiKelas.push(s);
      });
    }

    return Array.from(map.values());
  }, [formasiList, santriList, asatidzList]);

  // Hasil Pencarian Cerdas Universal (Omni-Search: Santri, Asatidz, Kelas)
  const omniSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) {
      return { santri: [], asatidz: [], kelas: [] };
    }

    const matchedSantri = (santriList || [])
      .filter((s) => {
        const nama = (s.nama || '').toLowerCase();
        const noInduk = (s.no_induk || '').toLowerCase();
        const kamar = (s.kamar || '').toLowerCase();
        const kelas = `${s.din_kls || ''} ${s.din_bag || ''} ${s.tingkat || ''}`.toLowerCase();
        return nama.includes(q) || noInduk.includes(q) || kamar.includes(q) || kelas.includes(q);
      })
      .slice(0, 6);

    const matchedAsatidz = (asatidzList || [])
      .filter((a) => {
        const nama = (a.nama_asatidz || '').toLowerCase();
        const nia = (a.nia || '').toLowerCase();
        const jabatan = (a.jah_asatidz || '').toLowerCase();
        return nama.includes(q) || nia.includes(q) || jabatan.includes(q);
      })
      .slice(0, 6);

    const matchedKelas = daftarKelasUniversal
      .filter((c) => {
        const labelWithPapi = `${c.label} ${c.pa_pi}`.toLowerCase();
        const label = c.label.toLowerCase();
        const mustahiq = c.mustahiq.toLowerCase();
        const tingkat = c.tingkat.toLowerCase();
        return labelWithPapi.includes(q) || label.includes(q) || mustahiq.includes(q) || tingkat.includes(q);
      })
      .slice(0, 6);

    return {
      santri: matchedSantri,
      asatidz: matchedAsatidz,
      kelas: matchedKelas,
    };
  }, [searchQuery, santriList, asatidzList, daftarKelasUniversal]);

  const hasOmniResults =
    omniSearchResults.santri.length > 0 ||
    omniSearchResults.asatidz.length > 0 ||
    omniSearchResults.kelas.length > 0;

  // Pintasan Cepat Populer (Quick Access: Hari KBM, Rekap Hafalan, Rekap Status Absensi, Jadwal, Inventaris, Dashboard)
  const quickAccessShortcuts = [
    {
      title: 'Hari KBM',
      desc: 'Monitoring tugas mengajar & lokasi',
      href: '/hari-kbm',
      icon: <Calendar className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 border-amber-200 text-amber-900',
    },
    {
      title: 'Rekapitulasi Hafalan Pertingkatan',
      desc: 'Capaian wajib, sunnah & kitab',
      href: '/rekap-hafalan',
      icon: <BarChart2 className="w-5 h-5 text-emerald-700" />,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    },
    {
      title: 'Rekap Status Absensi Asatidz',
      desc: 'Persentase hadir per jenjang',
      href: '/rekap-absensi/status',
      icon: <ClipboardCheck className="w-5 h-5 text-[#0f766e]" />,
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

        {/* Fitur Pencarian Cerdas Universal (Omni-Search): Santri, Asatidz, Kelas */}
        {searchQuery.trim().length >= 2 && hasOmniResults && (
          <div className="pt-3 border-t border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hasil Pencarian Cerdas Universal
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  (Klik kartu untuk melihat rincian detail)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {omniSearchResults.santri.length + omniSearchResults.asatidz.length + omniSearchResults.kelas.length} Entitas Ditemukan
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Kolom 1: Santri */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                    Santri ({omniSearchResults.santri.length})
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">Pangkalan Santri</span>
                </div>
                {omniSearchResults.santri.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center italic">Tidak ada santri yang cocok</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {omniSearchResults.santri.map((s) => (
                      <button
                        key={s.no_induk}
                        type="button"
                        onClick={() => setSelectedSantriModal(s)}
                        className="w-full text-left p-2 rounded-lg bg-white border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/70 transition shadow-2xs group cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 truncate">
                            {s.nama}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            NIS: {s.no_induk} • {s.din_kls} {s.din_bag} {s.tingkat} • Kamar: {s.kamar || '-'}
                          </p>
                        </div>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-100 text-emerald-800 flex-shrink-0">
                          Detail
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kolom 2: Asatidz */}
              <div className="rounded-xl border border-teal-200/80 bg-teal-50/30 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-teal-100 pb-1.5">
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                    Asatidz ({omniSearchResults.asatidz.length})
                  </span>
                  <span className="text-[10px] text-teal-700 font-medium">Dewan Pengajar</span>
                </div>
                {omniSearchResults.asatidz.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center italic">Tidak ada asatidz yang cocok</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {omniSearchResults.asatidz.map((a) => (
                      <button
                        key={a.nia || String(a.id)}
                        type="button"
                        onClick={() => setSelectedAsatidzModal(a)}
                        className="w-full text-left p-2 rounded-lg bg-white border border-teal-100 hover:border-teal-300 hover:bg-teal-50/70 transition shadow-2xs group cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-teal-800 truncate">
                            {a.nama_asatidz}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            NIA: {a.nia || '-'} • {a.jah_asatidz || 'Dewan Pengajar'}
                          </p>
                        </div>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-teal-100 text-teal-800 flex-shrink-0">
                          Detail
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kolom 3: Kelas & Rombel */}
              <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-blue-100 pb-1.5">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-blue-700" />
                    Kelas / Rombel ({omniSearchResults.kelas.length})
                  </span>
                  <span className="text-[10px] text-blue-700 font-medium">Formasi KBM</span>
                </div>
                {omniSearchResults.kelas.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center italic">Tidak ada kelas yang cocok</p>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {omniSearchResults.kelas.map((k) => (
                      <button
                        key={`${k.label}_${k.pa_pi}`}
                        type="button"
                        data-testid="btn-omni-kelas-item"
                        onClick={() => setSelectedKelasModal(k)}
                        className="w-full text-left p-2 rounded-lg bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50/70 transition shadow-2xs group cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-800">
                              {k.label}
                            </span>
                            <span
                              className={`px-1 py-0.2 text-[9px] font-bold rounded ${
                                k.pa_pi === 'PA'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {k.pa_pi}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            Mustahiq: {k.mustahiq} • {k.totalSantri} Santri
                          </p>
                        </div>
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-100 text-blue-800 flex-shrink-0">
                          Detail
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Katalog Direktori Grup Menu (Hierarki 3 Kolom Responsif) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
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
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200 flex flex-col"
              >
                {/* LEVEL 1: Header Grup Menu (Dapat diklik untuk expand/collapse) */}
                <div
                  onClick={() => toggleGroup(group.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/80 transition bg-slate-50/40 border-b border-slate-100"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex-shrink-0">
                      {groupIcon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate">
                          {group.group}
                        </h2>
                        <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex-shrink-0">
                          {group.items.length} Menu
                        </span>
                      </div>
                      {/* Caption/Deskripsi: Sembunyi di HP (hidden sm:block), Tampil di Layar Lebih Besar */}
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 hidden sm:block">
                        {groupDesc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pl-2 flex-shrink-0">
                    <span className="text-[11px] font-semibold text-slate-400 hidden md:inline-block">
                      {isExpanded ? 'Tutup' : 'Buka'}
                    </span>
                    <div
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 bg-slate-100' : ''
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* LEVEL 2 & 3: Daftar Menu dan Sub-Menu di dalam Grup (Tata Letak List Vertikal Rapi) */}
                {isExpanded && (
                  <div className="p-3 sm:p-3.5 space-y-2 bg-white">
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
                              className="w-full p-2.5 sm:p-3 flex items-center justify-between text-left hover:bg-slate-100/70 transition select-none group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-slate-700 flex-shrink-0">
                                  {itemIcon}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 truncate">
                                    {item.title}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium">
                                    {permittedChildren.length} Sub-Menu
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200 hidden sm:inline-block">
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
                              <div className="px-2.5 pb-2.5 pt-1 space-y-1 border-t border-slate-200/60 bg-white">
                                {permittedChildren.map((sub) => {
                                  return (
                                    <Link
                                      key={sub.id || sub.href}
                                      href={sub.href}
                                      className="flex items-center justify-between p-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-[#0b5751] hover:bg-emerald-50/70 transition group/sub"
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
                          className="p-2.5 sm:p-3 rounded-xl border border-slate-200/90 bg-white hover:border-[#0f766e]/50 hover:bg-emerald-50/20 hover:shadow-2xs transition flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 group-hover:bg-emerald-50 group-hover:border-emerald-200 group-hover:text-[#0f766e] transition flex-shrink-0">
                              {itemIcon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 group-hover:text-[#0b5751] transition truncate">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                Buka Modul
                              </div>
                            </div>
                          </div>

                          <div className="w-5 h-5 rounded-md bg-slate-50 group-hover:bg-emerald-100/70 text-slate-400 group-hover:text-[#0f766e] flex items-center justify-center transition flex-shrink-0">
                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
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

      {/* ================= MODAL DETAIL SANTRI (DIPERLEBAR & DAFTAR CAPAIAN SANTRI) ================= */}
      {selectedSantriModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-[#0b5751] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Rincian Data Santri</h3>
                  <p className="text-[11px] text-emerald-200">
                    NIS: {selectedSantriModal.no_induk}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSantriModal(null)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Tab Switcher (< lg) */}
            <div className="lg:hidden px-4 py-2 bg-slate-100/90 border-b border-slate-200/80 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveSantriMobileTab('profil')}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSantriMobileTab === 'profil'
                    ? 'bg-[#0b5751] text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profil &amp; Target</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSantriMobileTab('capaian')}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeSantriMobileTab === 'capaian'
                    ? 'bg-[#0b5751] text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Daftar Capaian Santri</span>
              </button>
            </div>

            {/* Body: Split View 2 Kolom di Desktop (>= lg) */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* ================= KOLOM KIRI: PROFIL & TARGET AKTIF (lg:col-span-5) ================= */}
                <div
                  className={`space-y-3.5 lg:col-span-5 ${
                    activeSantriMobileTab === 'capaian' ? 'hidden lg:block' : 'block'
                  }`}
                >
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Nama Lengkap Santri</span>
                    <p className="text-base font-bold text-slate-800">{selectedSantriModal.nama}</p>
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        Kelas: {selectedSantriModal.din_kls} {selectedSantriModal.din_bag} {selectedSantriModal.tingkat}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-medium">
                        Kamar: {selectedSantriModal.kamar || '-'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[11px] font-medium">
                        Gender: {selectedSantriModal.pa_pi === 'PA' ? 'Putra (PA)' : 'Putri (PI)'}
                      </span>
                    </div>
                  </div>

                  {/* KARTU PROGRES SETORAN HAFALAN AKTIF (GAMBAR 3) */}
                  {santriSetoranDetail && (
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
                            <BookOpen className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              Progres Setoran Hafalan
                            </h4>
                            <p className="text-[10px] text-slate-500">
                              Mustahiq: <span className="font-semibold text-slate-700">{santriSetoranDetail.mustahiq}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          {santriSetoranDetail.row.is_tahfidz && (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10px] font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-cyan-600" />
                              <span>Tahfidz</span>
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            Hafalan {santriSetoranDetail.row.active_kategori}
                          </span>
                        </div>
                      </div>

                      {/* Target Hafalan Saat Ini */}
                      <div className="flex items-start justify-between text-xs gap-2 pt-0.5">
                        <span className="text-slate-500 shrink-0">Target Saat Ini:</span>
                        <span className="font-bold text-slate-800 text-right">
                          {santriSetoranDetail.row.active_item?.nama || '-'} (
                          {formatTargetPreview(santriSetoranDetail.row.active_item)})
                        </span>
                      </div>

                      {/* Capaian Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium text-[11px]">
                            Capaian Setoran Hafalan:
                          </span>
                          <span className="font-bold text-emerald-800 font-mono text-[11px]">
                            {santriSetoranDetail.row.status_badge_text} ({santriSetoranDetail.row.progress_pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${santriSetoranDetail.row.progress_pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Status Banner */}
                      {santriSetoranDetail.isCompleted ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold block">Target Telah Tuntas (100%)!</span>
                            <span className="text-[11px] text-emerald-700">
                              Santri telah menyelesaikan materi hafalan aktif ini dengan lengkap.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold block">Sedang Dalam Proses Setoran</span>
                            <span className="text-[11px] text-amber-700">
                              Progress berjalan: {santriSetoranDetail.row.status_badge_text}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DATA ORANG TUA & KONTAK */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                      <span className="text-[10px] text-slate-400 block font-semibold">Nama Ayah / Wali</span>
                      <p className="font-bold text-slate-700">{selectedSantriModal.nama_ayah || '-'}</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                      <span className="text-[10px] text-slate-400 block font-semibold">Kontak Wali / Telepon</span>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-700 font-mono">{selectedSantriModal.telepon || '-'}</p>
                        {selectedSantriModal.telepon && (
                          <a
                            href={`https://wa.me/${selectedSantriModal.telepon.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>Chat WA</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ================= KOLOM KANAN: DAFTAR CAPAIAN SANTRI (GAMBAR 1) (lg:col-span-7) ================= */}
                <div
                  className={`space-y-3.5 lg:col-span-7 ${
                    activeSantriMobileTab === 'profil' ? 'hidden lg:block' : 'block'
                  }`}
                >
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                    {/* Header Capaian */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 shadow-2xs">
                          <Award className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Daftar Capaian Santri
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            Rincian status setoran per kategori (Wajib, Sunnah, Kitab, Tahfidz)
                          </p>
                        </div>
                      </div>

                      {/* Ringkasan Status Gabungan */}
                      {santriSetoranDetail && (
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              santriSetoranDetail.countWajibSelesai > 0 && santriSetoranDetail.countSunnahSelesai > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : santriSetoranDetail.countWajibSelesai > 0
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {santriSetoranDetail.countWajibSelesai > 0 && santriSetoranDetail.countSunnahSelesai > 0
                              ? 'Wajib & Sunnah'
                              : santriSetoranDetail.countWajibSelesai > 0
                              ? 'Hanya Wajib'
                              : 'Belum Tuntas'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ringkasan Pills 4 Kategori (Wajib, Sunnah, Kitab, Tahfidz) */}
                    {santriSetoranDetail && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                          <span className="text-[10px] text-emerald-700 block font-semibold">Wajib</span>
                          <span className="text-xs font-bold text-emerald-900 font-mono">
                            {santriSetoranDetail.countWajibSelesai} / {santriSetoranDetail.listWajib.length}
                          </span>
                          <span className="text-[9px] text-emerald-600 block">Tuntas</span>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-200/80">
                          <span className="text-[10px] text-blue-700 block font-semibold">Sunnah</span>
                          <span className="text-xs font-bold text-blue-900 font-mono">
                            {santriSetoranDetail.countSunnahSelesai} / {santriSetoranDetail.listSunnah.length}
                          </span>
                          <span className="text-[9px] text-blue-600 block">Tuntas</span>
                        </div>
                        <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
                          <span className="text-[10px] text-indigo-700 block font-semibold">Kitab</span>
                          <span className="text-xs font-bold text-indigo-900 font-mono">
                            {santriSetoranDetail.countKitabSelesai} / {santriSetoranDetail.listKitab.length}
                          </span>
                          <span className="text-[9px] text-indigo-600 block">Tuntas</span>
                        </div>
                        <div className="p-2 rounded-xl bg-cyan-50/70 border border-cyan-200/80">
                          <span className="text-[10px] text-cyan-700 block font-semibold">Tahfidz</span>
                          <span className="text-xs font-bold text-cyan-900 font-mono">
                            {santriSetoranDetail.row.is_tahfidz
                              ? `${santriSetoranDetail.row.tahfidz_progress_juz} / ${santriSetoranDetail.row.tahfidz_target_juz} Juz`
                              : '-'}
                          </span>
                          <span className="text-[9px] text-cyan-600 block">
                            {santriSetoranDetail.row.is_tahfidz ? 'Juz Tuntas' : 'Non-Tahfidz'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Filter Tab Kategori */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
                      {(['ALL', 'Wajib', 'Sunnah', 'Kitab', 'Tahfidz'] as const).map((kategori) => {
                        const isActive = filterCapaianKategori === kategori;
                        return (
                          <button
                            key={kategori}
                            type="button"
                            onClick={() => setFilterCapaianKategori(kategori)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                              isActive
                                ? 'bg-[#0b5751] text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {kategori === 'ALL' ? 'Semua Kategori' : kategori}
                          </button>
                        );
                      })}
                    </div>

                    {/* Daftar Item Materi Capaian */}
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                      {santriSetoranDetail ? (
                        santriSetoranDetail.allMateriOptions
                          .filter((opt) => {
                            if (filterCapaianKategori === 'ALL') return true;
                            if (filterCapaianKategori === 'Tahfidz') return opt.kategori === 'Tahfidz';
                            return opt.kategori === filterCapaianKategori;
                          })
                          .map((opt, idx) => {
                            const isSelesai = opt.isCompleted;
                            const isSedangProses = !isSelesai && opt.currentProgressPct > 0;
                            const badgeColor =
                              opt.kategori === 'Wajib'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : opt.kategori === 'Sunnah'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : opt.kategori === 'Kitab'
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                : 'bg-cyan-100 text-cyan-800 border-cyan-200';

                            return (
                              <div
                                key={opt.item.nama || idx}
                                className={`p-2.5 rounded-xl border transition-all text-xs ${
                                  isSelesai
                                    ? 'bg-emerald-50/40 border-emerald-200'
                                    : isSedangProses
                                    ? 'bg-amber-50/40 border-amber-200'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                                        {opt.kategori}
                                      </span>
                                      <h5 className="font-bold text-slate-800 truncate text-xs">
                                        {opt.item.nama}
                                      </h5>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                      Target: {formatTargetPreview(opt.item)}
                                    </p>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    {isSelesai ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Sudah Tuntas</span>
                                      </span>
                                    ) : isSedangProses ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300">
                                        <Clock className="w-3 h-3 text-amber-600" />
                                        <span>Proses ({opt.currentProgressPct}%)</span>
                                      </span>
                                    ) : (
                                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-medium text-[10px] border border-slate-200">
                                        Belum Setor
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Progress Bar & Rincian */}
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                                    <span>Capaian:</span>
                                    <span className="font-mono font-semibold text-slate-700">
                                      {opt.currentStatusLabel || `${opt.currentProgressPct}%`}
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        isSelesai
                                          ? 'bg-emerald-500'
                                          : isSedangProses
                                          ? 'bg-amber-500'
                                          : 'bg-slate-300'
                                      }`}
                                      style={{ width: `${Math.max(opt.currentProgressPct, 0)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-center py-6 text-slate-400 text-xs">
                          Belum ada data materi hafalan terkonfigurasi.
                        </p>
                      )}

                      {/* Info Khusus Santri Tahfidz jika ada */}
                      {santriSetoranDetail?.row.is_tahfidz && (
                        <div className="p-2.5 rounded-xl border border-cyan-200 bg-cyan-50/50 space-y-1.5 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-cyan-900 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                              <span>Program Khusus Tahfidz Al-Qur&apos;an</span>
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                              Mode: {santriSetoranDetail.row.tahfidz_mode || 'Simultan'}
                            </span>
                          </div>
                          <p className="text-[10px] text-cyan-700">
                            Capaian: {santriSetoranDetail.row.tahfidz_progress_juz} dari {santriSetoranDetail.row.tahfidz_target_juz} Juz tuntas.
                            {(santriSetoranDetail.row.tahfidz_completed_juz?.length ?? 0) > 0 && (
                              <span className="block mt-0.5 font-mono">
                                Juz yang disetorkan: [Juz {santriSetoranDetail.row.tahfidz_completed_juz?.join(', Juz ')}]
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Aksi */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2 shrink-0">
              <Link
                href="/santri"
                onClick={() => setSelectedSantriModal(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition shadow-2xs"
              >
                Buka Data Santri
              </Link>
              <Link
                href="/setoran"
                onClick={() => setSelectedSantriModal(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0b5751] hover:bg-[#08423d] text-white shadow-2xs transition inline-flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lihat Buku Setoran</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL ASATIDZ ================= */}
      {selectedAsatidzModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-[#0f766e] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Rincian Data Asatidz</h3>
                  <p className="text-[11px] text-teal-200">
                    NIA: {selectedAsatidzModal.nia || '-'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAsatidzModal(null)}
                className="p-1 text-teal-200 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Tab Switcher (< lg) */}
            <div className="lg:hidden px-4 py-2 bg-slate-100/90 border-b border-slate-200/80 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveAsatidzMobileTab('profil')}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeAsatidzMobileTab === 'profil'
                    ? 'bg-[#0f766e] text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Profil &amp; Keaktifan</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveAsatidzMobileTab('jadwal')}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeAsatidzMobileTab === 'jadwal'
                    ? 'bg-[#0f766e] text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Jadwal Jam 1 &amp; 2</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[82vh]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* KOLOM KIRI (lg:col-span-5): Profil, Absensi, & Wali Kelas */}
                <div
                  className={`lg:col-span-5 space-y-3.5 ${
                    activeAsatidzMobileTab === 'profil' ? 'block' : 'hidden lg:block'
                  }`}
                >
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Nama Lengkap Asatidz</span>
                    <p className="text-base font-bold text-slate-800">{selectedAsatidzModal.nama_asatidz}</p>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 text-[11px] font-bold">
                        Jabatan: {selectedAsatidzModal.jah_asatidz || 'Dewan Pengajar'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[11px] font-medium font-mono">
                        Kode: {selectedAsatidzModal.kode || '-'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-medium">
                        Gender: {selectedAsatidzModal.pa_pi}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 block font-semibold">Tugas Lokasi &amp; Kamar</span>
                      <p className="font-bold text-slate-700">
                        {selectedAsatidzModal.lokasi_diniyyah || selectedAsatidzModal.lokasi_takror || 'Lokasi Terdaftar'}
                        {selectedAsatidzModal.kamar ? ` • Kamar ${selectedAsatidzModal.kamar}` : ''}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] text-slate-400 block font-semibold">Alamat Asal</span>
                      <p className="text-slate-700 font-medium">
                        {[selectedAsatidzModal.desa, selectedAsatidzModal.kecamatan, selectedAsatidzModal.kabupaten]
                          .filter(Boolean)
                          .join(', ') || 'Darussalam Blokagung'}
                      </p>
                    </div>
                  </div>

                  {/* ================= KEAKTIFAN ABSENSI ASATIDZ (GAMBAR 4) ================= */}
                  {asatidzAbsensiStat && (
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                            <ClipboardCheck className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Keaktifan Absensi Mengajar
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              Tingkat Kehadiran: {asatidzAbsensiStat.pct}%
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${asatidzAbsensiStat.badgeColor}`}>
                          {asatidzAbsensiStat.predikat}
                        </span>
                      </div>

                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${asatidzAbsensiStat.barColor} transition-all duration-300`}
                          style={{ width: `${asatidzAbsensiStat.pct}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                        <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                          <span className="text-[10px] text-emerald-700 block font-medium">Hadir</span>
                          <span className="text-xs font-bold text-emerald-900 font-mono">{asatidzAbsensiStat.hadir}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-blue-50 border border-blue-100">
                          <span className="text-[10px] text-blue-700 block font-medium">Izin</span>
                          <span className="text-xs font-bold text-blue-900 font-mono">{asatidzAbsensiStat.izin}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-100">
                          <span className="text-[10px] text-amber-700 block font-medium">Sakit</span>
                          <span className="text-xs font-bold text-amber-900 font-mono">{asatidzAbsensiStat.sakit}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-100">
                          <span className="text-[10px] text-rose-700 block font-medium">Alfa</span>
                          <span className="text-xs font-bold text-rose-900 font-mono">{asatidzAbsensiStat.alfa}</span>
                        </div>
                      </div>
                      {asatidzAbsensiStat.terlambatCount > 0 && (
                        <p className="text-[10px] text-slate-500 text-center italic">
                          *Tercatat terlambat hadir sebanyak {asatidzAbsensiStat.terlambatCount} sesi.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ================= KELAS BINAAN & DAFTAR SANTRI BILA WALIKELAS (GAMBAR 4) ================= */}
                  {asatidzWaliKelasInfo ? (
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                              Wali Kelas / Mustahiq
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {asatidzWaliKelasInfo.kelasLabel}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {asatidzWaliKelasInfo.santriBinaan.length} Santri
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200/80 bg-slate-50/50">
                        {asatidzWaliKelasInfo.santriBinaan.length === 0 ? (
                          <p className="p-3 text-center text-xs text-slate-400">
                            Belum ada santri terdaftar di formasi kelas ini.
                          </p>
                        ) : (
                          asatidzWaliKelasInfo.santriBinaan.map((santri, idx) => (
                            <button
                              key={santri.no_induk || idx}
                              type="button"
                              onClick={() => {
                                setSelectedAsatidzModal(null);
                                setSelectedSantriModal(santri);
                              }}
                              className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-emerald-50/80 transition-colors group cursor-pointer"
                              title="Klik untuk melihat detail & progres setoran santri ini"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-mono font-bold text-slate-400 w-5 shrink-0">
                                  {idx + 1}.
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-800 truncate">
                                    {santri.nama}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-mono">
                                    NIS: {santri.no_induk} {santri.kamar ? `• Kamar ${santri.kamar}` : ''}
                                  </p>
                                </div>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 transition-colors shrink-0 ml-2" />
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center gap-2 text-xs text-slate-500">
                      <School className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Pengampu Bidang Studi / Fan (Bukan Wali Kelas Rombel)</span>
                    </div>
                  )}
                </div>

                {/* KOLOM KANAN (lg:col-span-7): Jadwal Mengajar (Sabtu s/d Kamis) Khusus Jam 1 & 2 */}
                <div
                  className={`lg:col-span-7 space-y-3.5 ${
                    activeAsatidzMobileTab === 'jadwal' ? 'block' : 'hidden lg:block'
                  }`}
                >
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-2xs">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>Jadwal Mengajar (Sabtu s/d Kamis)</span>
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Khusus Sesi Inti: <span className="font-semibold text-emerald-700">Jam 1 &amp; Jam 2</span>
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs">
                        {asatidzJadwalJam12?.totalJam12 || 0} Jam Terjadwal
                      </span>
                    </div>

                    {/* List 6 Hari: Sabtu s/d Kamis */}
                    <div className="space-y-2.5">
                      {asatidzJadwalJam12?.days.map((d) => (
                        <div
                          key={d.hari}
                          className={`p-3 rounded-xl border transition-all ${
                            d.isHariAktif
                              ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs ring-1 ring-emerald-400/40'
                              : 'bg-slate-50/70 border-slate-200/90'
                          }`}
                        >
                          {/* Header Hari */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                  d.isHariAktif
                                    ? 'bg-emerald-700 text-white shadow-2xs'
                                    : 'bg-white text-slate-800 border border-slate-200/80'
                                }`}
                              >
                                {d.hari}
                              </span>
                              {d.isHariAktif && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wide">
                                  Hari Ini
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] font-semibold text-slate-500">
                              {d.hasSchedule ? `${d.count} Sesi Kelas` : 'Tidak Ada Jadwal'}
                            </span>
                          </div>

                          {/* Sesi Jam 1 & 2 */}
                          {d.hasSchedule ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {/* Jam 1 */}
                              {d.jam1 ? (
                                <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                      Jam 1 (07.30 - 08.40)
                                    </span>
                                  </div>
                                  <p className="text-xs font-extrabold text-slate-800 leading-snug">
                                    {d.jam1.fan}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 flex-wrap pt-0.5">
                                    <span className="font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                      {d.jam1.kelas}
                                    </span>
                                    {d.jam1.ruang && (
                                      <span className="inline-flex items-center gap-0.5 text-slate-500 text-[10px]">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate max-w-[130px]">{d.jam1.ruang}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-xl bg-white/60 border border-dashed border-slate-200 flex items-center justify-center text-center">
                                  <span className="text-[11px] text-slate-400 italic">Jam 1: Kosong</span>
                                </div>
                              )}

                              {/* Jam 2 */}
                              {d.jam2 ? (
                                <div className="p-2.5 rounded-xl bg-white border border-blue-200/80 shadow-2xs space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                                      Jam 2 (08.40 - 09.50)
                                    </span>
                                  </div>
                                  <p className="text-xs font-extrabold text-slate-800 leading-snug">
                                    {d.jam2.fan}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 flex-wrap pt-0.5">
                                    <span className="font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                      {d.jam2.kelas}
                                    </span>
                                    {d.jam2.ruang && (
                                      <span className="inline-flex items-center gap-0.5 text-slate-500 text-[10px]">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate max-w-[130px]">{d.jam2.ruang}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-xl bg-white/60 border border-dashed border-slate-200 flex items-center justify-center text-center">
                                  <span className="text-[11px] text-slate-400 italic">Jam 2: Kosong</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-2 px-3 rounded-lg bg-white/60 border border-slate-200/60 text-center">
                              <span className="text-[11px] text-slate-400 italic">
                                Tidak ada jadwal mengajar pada Jam 1 &amp; Jam 2
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <Link
                  href="/asatidz"
                  onClick={() => setSelectedAsatidzModal(null)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Buka Direktori Asatidz
                </Link>
                <Link
                  href="/hari-kbm"
                  onClick={() => setSelectedAsatidzModal(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0f766e] hover:bg-[#0b5751] text-white shadow-2xs transition inline-flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Lihat Jadwal di Hari KBM</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL KELAS / ROMBEL (DIPERLEBAR & INVENTARIS KELAS) ================= */}
      {selectedKelasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-blue-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-200">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Rincian Data Kelas &amp; Rombel</h3>
                  <p className="text-[11px] text-blue-200">
                    Jenjang: {selectedKelasModal.tingkat} • Gender: {selectedKelasModal.pa_pi === 'PA' ? 'Putra (PA)' : 'Putri (PI)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKelasModal(null)}
                className="p-1 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Tab Switcher (< lg) */}
            <div className="lg:hidden px-4 py-2 bg-slate-100/90 border-b border-slate-200/80 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveKelasMobileTab('info')}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeKelasMobileTab === 'info'
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>Info Kelas &amp; Santri</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveKelasMobileTab('inventaris')}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeKelasMobileTab === 'inventaris'
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Inventaris Kelas</span>
              </button>
            </div>

            {/* Body: Split View 2 Kolom di Desktop (>= lg) */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* ================= KOLOM KIRI: INFO KELAS & DAFTAR SANTRI (lg:col-span-5) ================= */}
                <div
                  className={`space-y-3.5 lg:col-span-5 ${
                    activeKelasMobileTab === 'inventaris' ? 'hidden lg:block' : 'block'
                  }`}
                >
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Nama Kelas Rombel</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          selectedKelasModal.pa_pi === 'PA'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {selectedKelasModal.pa_pi === 'PA' ? 'Putra (PA)' : 'Putri (PI)'}
                      </span>
                    </div>
                    <p className="text-xl font-black text-slate-800 font-mono">{selectedKelasModal.label}</p>
                    <p className="text-xs text-slate-600">
                      Mustahiq / Wali Kelas: <strong className="text-slate-800">{selectedKelasModal.mustahiq}</strong>
                    </p>
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
                        {selectedKelasModal.totalSantri} Santri Terdaftar
                      </span>
                      {selectedKelasSaprasRow?.lokasiDiniyyah && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate">{selectedKelasSaprasRow.lokasiDiniyyah}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Daftar Santri di Kelas Ini */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Daftar Santri Kelas ({selectedKelasModal.santriDiKelas.length})</span>
                      <span className="text-[11px] font-normal text-slate-400">Klik untuk lihat santri</span>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto bg-slate-50/40">
                      {selectedKelasModal.santriDiKelas.length === 0 ? (
                        <p className="p-3 text-center text-xs text-slate-400 italic">Belum ada santri terdata di kelas ini</p>
                      ) : (
                        selectedKelasModal.santriDiKelas.map((s, idx) => (
                          <button
                            key={s.no_induk}
                            type="button"
                            onClick={() => {
                              setSelectedKelasModal(null);
                              setSelectedSantriModal(s);
                            }}
                            className="w-full text-left p-2 hover:bg-blue-50/60 transition flex items-center justify-between text-xs cursor-pointer group"
                          >
                            <span className="font-semibold text-slate-800 group-hover:text-blue-900 truncate">
                              {idx + 1}. {s.nama}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                              {s.kamar || s.no_induk}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* ================= KOLOM KANAN: INVENTARIS SARANA KELAS (GAMBAR 2) (lg:col-span-7) ================= */}
                <div
                  className={`space-y-3.5 lg:col-span-7 ${
                    activeKelasMobileTab === 'info' ? 'hidden lg:block' : 'block'
                  }`}
                >
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                    {/* Header Inventaris Sarana Kelas */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0 shadow-2xs">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Inventaris Sarana Kelas
                          </h4>
                          <p className="text-[10px] text-slate-500">
                            Pemantauan &amp; input status kelayakan langsung (Papan Tulis &amp; Meja Guru)
                          </p>
                        </div>
                      </div>

                      {/* Badge Kelayakan Keseluruhan */}
                      {selectedKelasSaprasRow && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            selectedKelasSaprasRow.isFullyHealthy
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {selectedKelasSaprasRow.isFullyHealthy ? 'Lengkap & Baik' : 'Perlu Perbaikan'}
                        </span>
                      )}
                    </div>

                    {/* Notice Tersimpan */}
                    {saprasSuccessNotice && (
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in duration-150">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{saprasSuccessNotice}</span>
                      </div>
                    )}

                    {selectedKelasSaprasRow ? (
                      <div className="space-y-2.5">
                        {/* 1. PAPAN TULIS KELAS */}
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-bold text-slate-800 text-xs">
                                  1. Papan Tulis ({selectedKelasSaprasRow.papanTulisJumlah} Unit)
                                </h5>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                    KONDISI_SAPRAS_META[selectedKelasSaprasRow.papanTulisKondisi].badgeClass
                                  }`}
                                >
                                  {KONDISI_SAPRAS_META[selectedKelasSaprasRow.papanTulisKondisi].shortLabel}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-slate-500 mt-0.5">
                                {selectedKelasSaprasRow.papanTulisSpesifikasi}
                              </p>
                            </div>

                            {/* Dropdown Input Langsung */}
                            <div className="shrink-0">
                              <select
                                value={selectedKelasSaprasRow.papanTulisKondisi}
                                disabled={isUpdatingSapras}
                                onChange={(e) =>
                                  handleUpdateKondisiSaprasCepat(
                                    'papanTulisKondisi',
                                    e.target.value as KondisiSapras
                                  )
                                }
                                aria-label="Ubah Status Papan Tulis"
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 shadow-2xs focus:border-teal-600 focus:outline-none cursor-pointer"
                              >
                                <option value="BAIK">Baik</option>
                                <option value="RUSAK_RINGAN">Rusak Ringan</option>
                                <option value="RUSAK_BERAT">Rusak Berat</option>
                                <option value="BELUM_ADA">Belum Ada</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* 2. MEJA GURU / DAMPAR */}
                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-bold text-slate-800 text-xs">
                                  2. Meja Guru ({selectedKelasSaprasRow.mejaGuruJumlah} Unit)
                                </h5>
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                    KONDISI_SAPRAS_META[selectedKelasSaprasRow.mejaGuruKondisi].badgeClass
                                  }`}
                                >
                                  {KONDISI_SAPRAS_META[selectedKelasSaprasRow.mejaGuruKondisi].shortLabel}
                                </span>
                              </div>
                              <p className="text-[10.5px] text-slate-500 mt-0.5">
                                {selectedKelasSaprasRow.mejaGuruSpesifikasi}
                              </p>
                            </div>

                            {/* Dropdown Input Langsung */}
                            <div className="shrink-0">
                              <select
                                value={selectedKelasSaprasRow.mejaGuruKondisi}
                                disabled={isUpdatingSapras}
                                onChange={(e) =>
                                  handleUpdateKondisiSaprasCepat(
                                    'mejaGuruKondisi',
                                    e.target.value as KondisiSapras
                                  )
                                }
                                aria-label="Ubah Status Meja Guru"
                                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 shadow-2xs focus:border-teal-600 focus:outline-none cursor-pointer"
                              >
                                <option value="BAIK">Baik</option>
                                <option value="RUSAK_RINGAN">Rusak Ringan</option>
                                <option value="RUSAK_BERAT">Rusak Berat</option>
                                <option value="BELUM_ADA">Belum Ada</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* 3. PERLENGKAPAN PENDUKUNG (PENGHAPUS & SPIDOL) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-slate-800 block truncate">
                                Penghapus Papan
                              </span>
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${
                                  KONDISI_SAPRAS_META[selectedKelasSaprasRow.penghapusKondisi].badgeClass
                                }`}
                              >
                                {KONDISI_SAPRAS_META[selectedKelasSaprasRow.penghapusKondisi].shortLabel}
                              </span>
                            </div>
                            <select
                              value={selectedKelasSaprasRow.penghapusKondisi}
                              disabled={isUpdatingSapras}
                              onChange={(e) =>
                                handleUpdateKondisiSaprasCepat(
                                  'penghapusKondisi',
                                  e.target.value as KondisiSapras
                                )
                              }
                              aria-label="Ubah Status Penghapus Papan"
                              className="px-2 py-0.5 text-[11px] font-semibold rounded-md border border-slate-300 bg-white text-slate-800 focus:outline-none cursor-pointer shrink-0"
                            >
                              <option value="BAIK">Baik</option>
                              <option value="RUSAK_RINGAN">Rusak Ringan</option>
                              <option value="RUSAK_BERAT">Rusak Berat</option>
                              <option value="BELUM_ADA">Belum Ada</option>
                            </select>
                          </div>

                          <div className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold text-slate-800 block truncate">
                                Spidol Boardmaker
                              </span>
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${
                                  KONDISI_SAPRAS_META[selectedKelasSaprasRow.spidolKondisi].badgeClass
                                }`}
                              >
                                {KONDISI_SAPRAS_META[selectedKelasSaprasRow.spidolKondisi].shortLabel}
                              </span>
                            </div>
                            <select
                              value={selectedKelasSaprasRow.spidolKondisi}
                              disabled={isUpdatingSapras}
                              onChange={(e) =>
                                handleUpdateKondisiSaprasCepat(
                                  'spidolKondisi',
                                  e.target.value as KondisiSapras
                                )
                              }
                              aria-label="Ubah Status Spidol Boardmaker"
                              className="px-2 py-0.5 text-[11px] font-semibold rounded-md border border-slate-300 bg-white text-slate-800 focus:outline-none cursor-pointer shrink-0"
                            >
                              <option value="BAIK">Baik</option>
                              <option value="RUSAK_RINGAN">Rusak Ringan</option>
                              <option value="RUSAK_BERAT">Rusak Berat</option>
                              <option value="BELUM_ADA">Belum Ada</option>
                            </select>
                          </div>
                        </div>

                        {/* Catatan / Keterangan Sinkronisasi */}
                        <div className="pt-1 flex items-center justify-between text-[10.5px] text-slate-400">
                          <span>*Perubahan status otomatis tersimpan ke modul PKM. Sapras</span>
                          <Link
                            href="/sapras/inventaris-kelas"
                            onClick={() => setSelectedKelasModal(null)}
                            className="text-teal-700 hover:text-teal-900 font-bold hover:underline"
                          >
                            Buka Modul Sapras &rarr;
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center py-6 text-xs text-slate-400">
                        Memuat data inventaris kelas...
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between gap-2 shrink-0">
              <Link
                href="/jadwal-kbm"
                onClick={() => setSelectedKelasModal(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition shadow-2xs"
              >
                Buka Jadwal KBM
              </Link>
              <Link
                href="/rekap-hafalan"
                onClick={() => setSelectedKelasModal(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-900 hover:bg-blue-950 text-white shadow-2xs transition inline-flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Buka Rekapitulasi Hafalan</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
