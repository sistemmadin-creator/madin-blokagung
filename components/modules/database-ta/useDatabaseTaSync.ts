'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTahunAjaranStore } from '@/stores/useTahunAjaranStore';
import { useDatabaseTahunAjaranStore } from '@/stores/useDatabaseTahunAjaranStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFanStore } from '@/stores/useFanStore';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useSetorMustahiqStore } from '@/stores/useSetorMustahiqStore';
import { useSerahPiagamStore } from '@/stores/useSerahPiagamStore';
import { useKalenderStore } from '@/stores/useKalenderStore';
import { useRbacStore } from '@/stores/useRbacStore';
import {
  buildRekapSnapshotFromLiveData,
  sortSnapshotsByTA,
} from '@/lib/utils/databaseTahunAjaranHelper';
import { DatabaseTahunAjaranRekap } from '@/types/database-ta';

export function useDatabaseTaSync() {
  const currentAccount = useRbacStore((s) => s.currentAccount);
  const { activeTahunAjaran, daftarTahunAjaran, fetchGlobalTahunAjaran } =
    useTahunAjaranStore();
  const {
    snapshots,
    isLoading: isLoadingSnapshots,
    isSaving,
    fetchSnapshots,
    captureSnapshot,
    toggleLockSnapshot,
    updateCatatanEvaluasi,
    deleteSnapshot,
  } = useDatabaseTahunAjaranStore();

  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { jadwalMap, fetchJadwal } = useJadwalStore();
  const { fanConfig, fetchFanData } = useFanStore();
  const { savedRecords, fetchAbsensi } = useAbsensiStore();
  const { sesiList: konsorsiumSesiList, fetchKonsorsiumData } = useKonsorsiumStore();
  const { setoranList, fetchSetoranData } = useMuhafadzohStore();
  const { logs: mustahiqLogs, activeStates, fetchMustahiqData } = useSetorMustahiqStore();
  const { records: serahPiagamRecords, fetchRecords: fetchSerahPiagam } = useSerahPiagamStore();
  const { fetchKalenderData, getCurrentAgendaMap } = useKalenderStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTA, setSelectedTA] = useState<string>('');

  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchGlobalTahunAjaran(),
        fetchSnapshots(),
        fetchSantri(),
        fetchAsatidz(),
        fetchFormasi(),
        fetchJadwal(),
        fetchFanData(),
        fetchAbsensi(),
        fetchKonsorsiumData(),
        fetchSetoranData(),
        fetchMustahiqData(),
        fetchSerahPiagam(),
        fetchKalenderData(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    fetchGlobalTahunAjaran,
    fetchSnapshots,
    fetchSantri,
    fetchAsatidz,
    fetchFormasi,
    fetchJadwal,
    fetchFanData,
    fetchAbsensi,
    fetchKonsorsiumData,
    fetchSetoranData,
    fetchMustahiqData,
    fetchSerahPiagam,
    fetchKalenderData,
  ]);

  useEffect(() => {
    void refreshAllData();
  }, [refreshAllData]);

  useEffect(() => {
    if (!selectedTA && activeTahunAjaran) {
      setSelectedTA(activeTahunAjaran);
    }
  }, [activeTahunAjaran, selectedTA]);

  const activeConfig = useMemo(() => {
    return (
      daftarTahunAjaran.find((t) => t.tahunAjaranMasehi === activeTahunAjaran) || {
        tahunAjaranMasehi: activeTahunAjaran,
        tahunAjaranHijriyah: '1447/1448',
      }
    );
  }, [daftarTahunAjaran, activeTahunAjaran]);

  const agendaMap = getCurrentAgendaMap();

  const liveActiveSnapshot: DatabaseTahunAjaranRekap = useMemo(() => {
    const computed = buildRekapSnapshotFromLiveData({
      tahunAjaranMasehi: activeTahunAjaran,
      santriList,
      asatidzList,
      formasiList,
      jadwalMap,
      fanConfig,
      absensiRecords: Object.values(savedRecords || {}),
      konsorsiumSesiList,
      setoranList,
      mustahiqLogs,
      activeStates,
      serahPiagamRecords,
      agendaMap,
    });
    return {
      tahun_ajaran_masehi: activeTahunAjaran,
      tahun_ajaran_hijriyah: activeConfig.tahunAjaranHijriyah,
      status_arsip: 'draf',
      ringkasan_umum: computed.ringkasan_umum,
      rekap_per_kelas: computed.rekap_per_kelas,
      catatan_evaluasi: '',
      dibuat_oleh: currentAccount?.full_name || 'Administrator',
      diperbarui_oleh: currentAccount?.full_name || 'Administrator',
      is_live_preview: true,
    };
  }, [
    activeTahunAjaran,
    activeConfig.tahunAjaranHijriyah,
    santriList,
    asatidzList,
    formasiList,
    jadwalMap,
    fanConfig,
    savedRecords,
    konsorsiumSesiList,
    setoranList,
    mustahiqLogs,
    activeStates,
    serahPiagamRecords,
    agendaMap,
    currentAccount?.full_name,
  ]);

  // Daftar timeline gabungan: seluruh snapshot tersimpan + preview live TA aktif jika belum direkam
  const timelineSnapshots: DatabaseTahunAjaranRekap[] = useMemo(() => {
    const hasActiveSaved = snapshots.some(
      (s) => s.tahun_ajaran_masehi === activeTahunAjaran
    );
    const base = hasActiveSaved ? snapshots : [...snapshots, liveActiveSnapshot];
    return sortSnapshotsByTA(base);
  }, [snapshots, activeTahunAjaran, liveActiveSnapshot]);

  const activeSavedSnapshot = useMemo(
    () => snapshots.find((s) => s.tahun_ajaran_masehi === activeTahunAjaran) || null,
    [snapshots, activeTahunAjaran]
  );

  const selectedSnapshot: DatabaseTahunAjaranRekap = useMemo(() => {
    const targetTA = selectedTA || activeTahunAjaran;
    const saved = snapshots.find((s) => s.tahun_ajaran_masehi === targetTA);
    if (saved) return saved;
    if (targetTA === activeTahunAjaran) return liveActiveSnapshot;
    return timelineSnapshots[timelineSnapshots.length - 1] || liveActiveSnapshot;
  }, [selectedTA, activeTahunAjaran, snapshots, liveActiveSnapshot, timelineSnapshots]);

  const captureActiveTA = useCallback(async () => {
    return captureSnapshot({
      tahun_ajaran_masehi: liveActiveSnapshot.tahun_ajaran_masehi,
      tahun_ajaran_hijriyah: liveActiveSnapshot.tahun_ajaran_hijriyah,
      ringkasan_umum: liveActiveSnapshot.ringkasan_umum,
      rekap_per_kelas: liveActiveSnapshot.rekap_per_kelas,
      actorName: currentAccount?.full_name || currentAccount?.username || 'Administrator',
    });
  }, [captureSnapshot, liveActiveSnapshot, currentAccount]);

  return {
    currentAccount,
    activeTahunAjaran,
    activeConfig,
    daftarTahunAjaran,
    snapshots,
    timelineSnapshots,
    liveActiveSnapshot,
    activeSavedSnapshot,
    selectedTA: selectedTA || activeTahunAjaran,
    setSelectedTA,
    selectedSnapshot,
    isLoading: isLoadingSnapshots || isRefreshing,
    isSaving,
    refreshAllData,
    captureActiveTA,
    toggleLockSnapshot,
    updateCatatanEvaluasi,
    deleteSnapshot,
  };
}
