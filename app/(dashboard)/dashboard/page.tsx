'use client';

import React, { useEffect, useMemo, useState } from 'react';
import DashboardHeader from '@/components/modules/dashboard/DashboardHeader';
import LiveStatusBanner from '@/components/modules/dashboard/LiveStatusBanner';
import KpiCardGrid from '@/components/modules/dashboard/KpiCardGrid';
import AbsensiTrendLineChart from '@/components/modules/dashboard/AbsensiTrendLineChart';
import MuhafadzohProgressWidget from '@/components/modules/dashboard/MuhafadzohProgressWidget';
import KalenderAgendaWidget from '@/components/modules/dashboard/KalenderAgendaWidget';
import SaprasOverviewWidget from '@/components/modules/dashboard/SaprasOverviewWidget';
import CatatanTodoWidget from '@/components/modules/dashboard/CatatanTodoWidget';
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
import { useKalenderStore } from '@/stores/useKalenderStore';
import { useSaprasStore } from '@/stores/useSaprasStore';
import { useCatatanStore } from '@/stores/useCatatanStore';

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

  // Integrasi data dari seluruh store modul aplikasi (termasuk modul-modul baru)
  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { savedRecords, fetchAbsensi } = useAbsensiStore();
  const { setoranList, fetchSetoranData } = useMuhafadzohStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { posts, fetchPosts } = useBeritaStore();
  const {
    activeTahunAjaran,
    hijriOffsetByTA,
    fetchKalenderData,
    getCurrentAgendaMap,
  } = useKalenderStore();
  const { fetchSaprasData } = useSaprasStore();
  const { fetchCatatan } = useCatatanStore();

  useEffect(() => {
    const now = new Date();
    setLastUpdated(
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
        ' WIB'
    );

    if (santriList.length === 0) fetchSantri();
    if (asatidzList.length === 0) fetchAsatidz();
    if (setoranList.length === 0) fetchSetoranData();
    if (formasiList.length === 0) fetchFormasi();
    if (posts.length === 0) fetchPosts();
    fetchAbsensi();
    fetchKalenderData();
    fetchSaprasData();
    fetchCatatan();
  }, []);

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

  const hijriOffsetDays = hijriOffsetByTA[activeTahunAjaran] ?? 0;
  const agendaMap = getCurrentAgendaMap();

  const todayAgenda = useMemo(() => {
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')}`;
    return agendaMap[ymd] || null;
  }, [agendaMap]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Time-Slice Filter Selector (Tanpa Ikon Bintang + Lencana Masehi/Pasaran/Hijriyah) */}
      <DashboardHeader
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        lastUpdated={lastUpdated}
        hijriOffsetDays={hijriOffsetDays}
      />

      {/* 2. Live KBM Status & Early Warning System Alert (Sinkron Kalender Kegiatan) */}
      <LiveStatusBanner
        currentJam={liveKbm.currentJam}
        coveredClasses={liveKbm.coveredClasses}
        totalClasses={liveKbm.totalClasses}
        uncoveredCount={liveKbm.uncoveredCount}
        todayAgenda={todayAgenda}
      />

      {/* 3. 4 Hero KPI Cards dengan Mini Sparkline & Delta */}
      <KpiCardGrid timeRange={timeRange} data={kpiData} />

      {/* 4. Baris Analitik KBM & Kalender Kegiatan (Masehi & Hijriyah) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <AbsensiTrendLineChart
            timeRange={timeRange}
            points={chartPoints}
            avgHadir={kpiData.kehadiranGuruPct}
          />
        </div>
        <div className="lg:col-span-5">
          <KalenderAgendaWidget />
        </div>
      </div>

      {/* 5. Baris Operasional Modul Baru: PKM. Sapras, Catatan & To-Do List, serta Muhafadzoh & WA Rapor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SaprasOverviewWidget />
        <CatatanTodoWidget />
        <MuhafadzohProgressWidget
          timeRange={timeRange}
          stats={muhafadzohStats}
        />
      </div>

      {/* 6. Baris Matriks KBM 6 Hari x 4 Jam & Peringkat/Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClassKbmMatrixWidget />
        <LeaderboardWidget />
      </div>

      {/* 7. Sebaran Geografis & Demografi Santri */}
      <DemografiSantriWidget />

      {/* 8. Pusat Aksi Cepat Operasional (8 Modul Terpadu) */}
      <QuickActionHub />

      {/* 9. Denyut Aktivitas Lapangan (Real-time Stream) */}
      <RecentActivityTicker activities={recentActivities} />
    </div>
  );
}
