'use client';

import { create } from 'zustand';
import { TimeRangeFilter } from '@/components/modules/dashboard/DashboardHeader';
import { Santri } from '@/types/santri';
import { Asatidz } from '@/types/asatidz';
import { Formasi } from '@/types/formasi';
import { RiwayatAbsensiItem } from '@/types/absensi';
import { SetoranHafalan } from '@/types/setoran';
import { WartaBerita } from '@/types/berita';

export interface ChartPoint {
  label: string;
  hadir: number;
  izin: number;
  alfa: number;
  total: number;
}

export interface JenjangHafalanStat {
  nama: string;
  kitab: string;
  totalSantri: number;
  tuntas: number;
  pct: number;
  color: string;
}

export interface ActivityFeedItem {
  id: string;
  waktu: string;
  kategori: 'setoran' | 'absensi' | 'berita' | 'sync';
  judul: string;
  detail: string;
}

export interface KpiDataModel {
  totalSantri: number;
  santriPa: number;
  santriPi: number;
  santriDeltaText: string;

  kehadiranGuruPct: number;
  kehadiranHadirCount: number;
  kehadiranAlfaCount: number;
  kehadiranIzinCount: number;
  kehadiranDeltaText: string;
  isKehadiranUp: boolean;

  totalSetoran: number;
  setoranTuntasPct: number;
  setoranDeltaText: string;

  totalRombel: number;
  kelasUnggulanCount: number;
  solverConflicts: number;
}

export interface LiveKbmStatusModel {
  currentJam: string;
  coveredClasses: number;
  totalClasses: number;
  uncoveredCount: number;
}

interface DashboardState {
  timeRange: TimeRangeFilter;
  setTimeRange: (range: TimeRangeFilter) => void;
  lastUpdated: string;
  isLoading: boolean;

  // Data teragregasi
  kpiData: KpiDataModel;
  liveKbm: LiveKbmStatusModel;
  chartPoints: ChartPoint[];
  muhafadzohStats: JenjangHafalanStat[];
  recentActivities: ActivityFeedItem[];
  topDistrikSantri: { daerah: string; jumlah: number; pct: number }[];

  // Action komputasi
  recomputeAggregates: (params: {
    santri: Santri[];
    asatidz: Asatidz[];
    absensi: RiwayatAbsensiItem[];
    setoran: SetoranHafalan[];
    formasi: Formasi[];
    posts: WartaBerita[];
  }) => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  timeRange: 'hari_ini',
  lastUpdated: 'Baru saja',
  isLoading: false,

  kpiData: {
    totalSantri: 5412,
    santriPa: 2840,
    santriPi: 2572,
    santriDeltaText: '+38 santri',

    kehadiranGuruPct: 96.8,
    kehadiranHadirCount: 148,
    kehadiranAlfaCount: 2,
    kehadiranIzinCount: 3,
    kehadiranDeltaText: '+1.4% vs pekan lalu',
    isKehadiranUp: true,

    totalSetoran: 3840,
    setoranTuntasPct: 78.4,
    setoranDeltaText: '+14% laju setor',

    totalRombel: 161,
    kelasUnggulanCount: 12,
    solverConflicts: 0,
  },

  liveKbm: {
    currentJam: 'Jam 2',
    coveredClasses: 158,
    totalClasses: 161,
    uncoveredCount: 3,
  },

  chartPoints: [
    { label: 'Jam 1', hadir: 98, izin: 2, alfa: 0, total: 100 },
    { label: 'Jam 2', hadir: 97, izin: 2, alfa: 1, total: 100 },
    { label: 'Jam 3', hadir: 95, izin: 4, alfa: 1, total: 100 },
    { label: 'Jam 4', hadir: 96, izin: 3, alfa: 1, total: 100 },
  ],

  muhafadzohStats: [
    {
      nama: 'Kelas Unggulan',
      kitab: 'Takhassus Kutub & Alfiyyah Kubro',
      totalSantri: 360,
      tuntas: 324,
      pct: 90,
      color: 'from-amber-500 to-amber-600',
    },
    {
      nama: 'Tingkat Ula',
      kitab: 'Al-Jurumiyyah & Nadzom Imrithi',
      totalSantri: 2450,
      tuntas: 1960,
      pct: 80,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      nama: 'Tingkat Wustho',
      kitab: 'Alfiyyah Ibnu Malik (Juz 1)',
      totalSantri: 1680,
      tuntas: 1260,
      pct: 75,
      color: 'from-teal-500 to-teal-600',
    },
    {
      nama: 'Tingkat Ulya',
      kitab: 'Alfiyyah (Juz 2) & Jauharul Maknun',
      totalSantri: 922,
      tuntas: 664,
      pct: 72,
      color: 'from-indigo-500 to-indigo-600',
    },
  ],

  recentActivities: [
    {
      id: '1',
      waktu: '10 mnt lalu',
      kategori: 'setoran',
      judul: 'Setoran Nadzom Imrithi Diterima',
      detail: 'M. Ali Ridho (No. Induk 20240192) tuntas Bait 1-50 • Penjaga: Ust. Musthofa',
    },
    {
      id: '2',
      waktu: '25 mnt lalu',
      kategori: 'absensi',
      judul: 'Presensi Sesi Jam 2 Tersimpan',
      detail: 'Kelas 2 A ULA: Ust. Fathurrahman (Fathul Qorib) • Status: Hadir Tepat Waktu',
    },
    {
      id: '3',
      waktu: '1 jam lalu',
      kategori: 'berita',
      judul: 'Warta Pesantren Terbit',
      detail: 'Artikel "Ujian Tasmi\' Nadzom Al-Jurumiyyah Serentak Santri Ula" dipublikasikan',
    },
    {
      id: '4',
      waktu: '2 jam lalu',
      kategori: 'sync',
      judul: 'Sinkronisasi Offline Berhasil',
      detail: '14 Mutasi lokal dari gawai asatidz berhasil disinkronkan ke Supabase Cloud',
    },
  ],

  topDistrikSantri: [
    { daerah: 'Banyuwangi', jumlah: 3120, pct: 57.6 },
    { daerah: 'Jember', jumlah: 1140, pct: 21.0 },
    { daerah: 'Bondowoso / Situbondo', jumlah: 640, pct: 11.8 },
    { daerah: 'Luar Jawa Timur', jumlah: 512, pct: 9.6 },
  ],

  setTimeRange: (range: TimeRangeFilter) => {
    let newChartPoints: ChartPoint[] = [];
    let deltaKehadiran = '+1.4% vs kemarin';
    let deltaSetoran = '+12 setoran hari ini';
    let deltaSantri = '+38 santri';
    let isUp = true;
    let kehadiranPct = 96.8;

    switch (range) {
      case 'hari_ini':
        newChartPoints = [
          { label: 'Jam 1', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Jam 2', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Jam 3', hadir: 95, izin: 4, alfa: 1, total: 100 },
          { label: 'Jam 4', hadir: 96, izin: 3, alfa: 1, total: 100 },
        ];
        kehadiranPct = 96.8;
        deltaKehadiran = '+1.4% vs kemarin';
        deltaSetoran = '+12 setoran hari ini';
        break;

      case 'seminggu':
        newChartPoints = [
          { label: 'Sabtu', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Ahad', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Senin', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Selasa', hadir: 95, izin: 3, alfa: 2, total: 100 },
          { label: 'Rabu', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Kamis', hadir: 94, izin: 4, alfa: 2, total: 100 },
        ];
        kehadiranPct = 96.2;
        deltaKehadiran = '+2.1% vs pekan lalu';
        deltaSetoran = '+84 setoran pekan ini';
        break;

      case 'sebulan':
        newChartPoints = [
          { label: 'Pekan 1', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Pekan 2', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Pekan 3', hadir: 95, izin: 4, alfa: 1, total: 100 },
          { label: 'Pekan 4', hadir: 97, izin: 2, alfa: 1, total: 100 },
        ];
        kehadiranPct = 96.5;
        deltaKehadiran = '+1.8% vs bulan lalu';
        deltaSetoran = '+320 setoran sebulan';
        break;

      case 'setahun':
        newChartPoints = [
          { label: 'Jul', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Agu', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Sep', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Okt', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Nov', hadir: 95, izin: 3, alfa: 2, total: 100 },
          { label: 'Des', hadir: 94, izin: 4, alfa: 2, total: 100 },
          { label: 'Jan', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Feb', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Mar', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Apr', hadir: 93, izin: 5, alfa: 2, total: 100 },
          { label: 'Mei', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Jun', hadir: 98, izin: 2, alfa: 0, total: 100 },
        ];
        kehadiranPct = 96.3;
        deltaKehadiran = '+3.2% vs thn ajaran lalu';
        deltaSetoran = '+1.420 setoran tahunan';
        deltaSantri = '+124 santri (thn ini)';
        break;
    }

    set((state) => ({
      timeRange: range,
      chartPoints: newChartPoints,
      kpiData: {
        ...state.kpiData,
        kehadiranGuruPct: kehadiranPct,
        kehadiranDeltaText: deltaKehadiran,
        setoranDeltaText: deltaSetoran,
        santriDeltaText: deltaSantri,
        isKehadiranUp: isUp,
      },
    }));
  },

  recomputeAggregates: ({ santri, asatidz, absensi, setoran, formasi, posts }) => {
    // 1. Santri
    const totalSantri = santri.length > 0 ? santri.length : 5412;
    const santriPa = santri.length > 0
      ? santri.filter((s) => String(s.pa_pi).toUpperCase() === 'PA').length
      : Math.round(totalSantri * 0.525);
    const santriPi = totalSantri - santriPa;

    // 2. Formasi
    const totalRombel = formasi.length > 0 ? formasi.length : 161;
    const kelasUnggulanCount = formasi.length > 0
      ? formasi.filter((f) => f.is_unggulan || f.tingkat?.toLowerCase().includes('unggulan')).length
      : 12;

    // 3. Setoran
    const totalSetoran = setoran.length > 0 ? setoran.length : 3840;

    // 4. Absensi Kehadiran
    let kehadiranGuruPct = 96.8;
    let hadirCount = 148;
    let alfaCount = 2;
    let izinCount = 3;

    if (absensi.length > 0) {
      const validRows = absensi.filter((r) => r.status);
      if (validRows.length > 0) {
        hadirCount = validRows.filter((r) => r.status === 'Hadir' || r.status === 'Terlambat' || r.status === 'Digantikan').length;
        alfaCount = validRows.filter((r) => r.status === 'Alfa').length;
        izinCount = validRows.filter((r) => r.status === 'Izin' || r.status === 'Sakit').length;
        kehadiranGuruPct = Math.round((hadirCount / validRows.length) * 1000) / 10;
      }
    }

    // 5. Muhafadzoh Jenjang Breakdown
    let ulaTotal = 2450;
    let ulaTuntas = 1960;
    let wusthoTotal = 1680;
    let wusthoTuntas = 1260;
    let ulyaTotal = 922;
    let ulyaTuntas = 664;
    let ugTotal = 360;
    let ugTuntas = 324;

    if (santri.length > 0) {
      const normTingkat = (s: Santri) => String(s.tingkat || s.kelas || '').toUpperCase();
      const ulaSantri = santri.filter((s) => normTingkat(s).includes('ULA') && !normTingkat(s).includes('UNGGULAN'));
      const wusthoSantri = santri.filter((s) => normTingkat(s).includes('WUSTHO'));
      const ulyaSantri = santri.filter((s) => normTingkat(s).includes('ULYA'));
      const ugSantri = santri.filter((s) => normTingkat(s).includes('UNGGULAN') || normTingkat(s).includes('(UG)'));

      if (ulaSantri.length > 0) {
        ulaTotal = ulaSantri.length;
        ulaTuntas = Math.round(ulaTotal * 0.8);
      }
      if (wusthoSantri.length > 0) {
        wusthoTotal = wusthoSantri.length;
        wusthoTuntas = Math.round(wusthoTotal * 0.75);
      }
      if (ulyaSantri.length > 0) {
        ulyaTotal = ulyaSantri.length;
        ulyaTuntas = Math.round(ulyaTotal * 0.72);
      }
      if (ugSantri.length > 0) {
        ugTotal = ugSantri.length;
        ugTuntas = Math.round(ugTotal * 0.9);
      }
    }

    const updatedMuhafadzohStats: JenjangHafalanStat[] = [
      {
        nama: 'Kelas Unggulan',
        kitab: 'Takhassus Kutub & Alfiyyah Kubro',
        totalSantri: ugTotal,
        tuntas: ugTuntas,
        pct: Math.round((ugTuntas / ugTotal) * 100),
        color: 'from-amber-500 to-amber-600',
      },
      {
        nama: 'Tingkat Ula',
        kitab: 'Al-Jurumiyyah & Nadzom Imrithi',
        totalSantri: ulaTotal,
        tuntas: ulaTuntas,
        pct: Math.round((ulaTuntas / ulaTotal) * 100),
        color: 'from-emerald-500 to-emerald-600',
      },
      {
        nama: 'Tingkat Wustho',
        kitab: 'Alfiyyah Ibnu Malik (Juz 1)',
        totalSantri: wusthoTotal,
        tuntas: wusthoTuntas,
        pct: Math.round((wusthoTuntas / wusthoTotal) * 100),
        color: 'from-teal-500 to-teal-600',
      },
      {
        nama: 'Tingkat Ulya',
        kitab: 'Alfiyyah (Juz 2) & Jauharul Maknun',
        totalSantri: ulyaTotal,
        tuntas: ulyaTuntas,
        pct: Math.round((ulyaTuntas / ulyaTotal) * 100),
        color: 'from-indigo-500 to-indigo-600',
      },
    ];

    // 6. Aliran Aktivitas Terkini (Activity Feed)
    const newActivities: ActivityFeedItem[] = [...get().recentActivities];
    if (setoran.length > 0) {
      const latestSetor = setoran[0];
      newActivities[0] = {
        id: `setor-${latestSetor.no_induk || 'new'}`,
        waktu: 'Baru saja',
        kategori: 'setoran',
        judul: `Setoran ${latestSetor.item_hafalan || 'Nadzom'} Masuk`,
        detail: `${latestSetor.nama} (${latestSetor.tingkat || 'Madin'}) • Penjaga: ${latestSetor.penjaga || 'Mustahiq'}`,
      };
    }
    if (posts.length > 0) {
      const latestPost = posts[0];
      newActivities[2] = {
        id: `post-${latestPost.id}`,
        waktu: 'Hari ini',
        kategori: 'berita',
        judul: `Warta: ${latestPost.title}`,
        detail: `${latestPost.author_name} • ${latestPost.views_count} pembaca`,
      };
    }

    set((state) => ({
      kpiData: {
        ...state.kpiData,
        totalSantri,
        santriPa,
        santriPi,
        totalRombel,
        kelasUnggulanCount,
        totalSetoran,
        kehadiranGuruPct,
        kehadiranHadirCount: hadirCount,
        kehadiranAlfaCount: alfaCount,
        kehadiranIzinCount: izinCount,
      },
      liveKbm: {
        ...state.liveKbm,
        totalClasses: totalRombel,
      },
      muhafadzohStats: updatedMuhafadzohStats,
      recentActivities: newActivities,
    }));
  },
}));
