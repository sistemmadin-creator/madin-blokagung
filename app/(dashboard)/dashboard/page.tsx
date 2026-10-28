'use client';

import React, { useEffect, useState } from 'react';
import DashboardHeader from '@/components/modules/dashboard/DashboardHeader';
import LiveStatusBanner from '@/components/modules/dashboard/LiveStatusBanner';
import KpiCardGrid from '@/components/modules/dashboard/KpiCardGrid';
import AbsensiTrendLineChart from '@/components/modules/dashboard/AbsensiTrendLineChart';
import MuhafadzohProgressWidget from '@/components/modules/dashboard/MuhafadzohProgressWidget';
import ClassKbmMatrixWidget from '@/components/modules/dashboard/ClassKbmMatrixWidget';
import LeaderboardWidget from '@/components/modules/dashboard/LeaderboardWidget';
import DemografiSantriWidget from '@/components/modules/dashboard/DemografiSantriWidget';
import QuickActionHub from '@/components/modules/dashboard/QuickActionHub';
import RecentActivityTicker from '@/components/modules/dashboard/RecentActivityTicker';

import { useDashboardStore } from '@/stores/useDashboardStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useBeritaStore } from '@/stores/useBeritaStore';

export default function DashboardPage() {
  const {
    timeRange,
    setTimeRange,
    kpiData,
    liveKbm,
    chartPoints,
    muhafadzohStats,
    recentActivities,
    recomputeAggregates,
  } = useDashboardStore();

  const [lastUpdated, setLastUpdated] = useState<string>('Memuat...');

  // Integrasi data dari store-store modul aplikasi
  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { savedRecords, fetchAbsensi } = useAbsensiStore();
  const { setoranList, fetchSetoranData } = useMuhafadzohStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { posts, fetchPosts } = useBeritaStore();

  useEffect(() => {
    // Format timestamp lokal saat komponen dimuat
    const now = new Date();
    setLastUpdated(
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    );

    // Ambil data jika store masih kosong
    if (santriList.length === 0) fetchSantri();
    if (asatidzList.length === 0) fetchAsatidz();
    if (setoranList.length === 0) fetchSetoranData();
    if (formasiList.length === 0) fetchFormasi();
    if (posts.length === 0) fetchPosts();
    fetchAbsensi();
  }, []);

  // Re-kalkulasi agregat secara reaktif ketika data modul termutasi
  useEffect(() => {
    recomputeAggregates({
      santri: santriList,
      asatidz: asatidzList,
      absensi: Object.values(savedRecords || {}),
      setoran: setoranList,
      formasi: formasiList,
      posts,
    });
  }, [santriList, asatidzList, savedRecords, setoranList, formasiList, posts]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Time-Slice Filter Selector */}
      <DashboardHeader
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        lastUpdated={lastUpdated}
      />

      {/* 2. Live KBM Status & Early Warning System Alert */}
      <LiveStatusBanner
        currentJam={liveKbm.currentJam}
        coveredClasses={liveKbm.coveredClasses}
        totalClasses={liveKbm.totalClasses}
        uncoveredCount={liveKbm.uncoveredCount}
      />

      {/* 3. 4 Hero KPI Cards dengan Mini Sparkline & Delta */}
      <KpiCardGrid timeRange={timeRange} data={kpiData} />

      {/* 4. Baris Chart: Linechart Absensi & Progress Muhafadzoh */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AbsensiTrendLineChart
          timeRange={timeRange}
          points={chartPoints}
          avgHadir={kpiData.kehadiranGuruPct}
        />
        <MuhafadzohProgressWidget
          timeRange={timeRange}
          stats={muhafadzohStats}
        />
      </div>

      {/* 5. Baris Matriks KBM 6 Hari x 4 Jam & Peringkat/Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClassKbmMatrixWidget />
        <LeaderboardWidget />
      </div>

      {/* 6. Sebaran Geografis & Demografi Santri */}
      <DemografiSantriWidget />

      {/* 7. Pusat Aksi Cepat Operasional */}
      <QuickActionHub />

      {/* 8. Denyut Aktivitas Lapangan (Real-time Stream) */}
      <RecentActivityTicker activities={recentActivities} />
    </div>
  );
}
