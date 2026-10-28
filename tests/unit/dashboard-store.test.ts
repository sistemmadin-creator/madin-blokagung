import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { Santri } from '@/types/santri';
import { Asatidz } from '@/types/asatidz';
import { Formasi } from '@/types/formasi';
import { SetoranHafalan } from '@/types/setoran';
import { RiwayatAbsensiItem } from '@/types/absensi';
import { WartaBerita } from '@/types/berita';

describe('useDashboardStore - Fase 2 Agregasi & Time-Slice Engine', () => {
  beforeEach(() => {
    // Reset state ke default
    useDashboardStore.getState().setTimeRange('hari_ini');
  });

  it('default time range is hari_ini with 4 KBM jam slots', () => {
    const state = useDashboardStore.getState();
    expect(state.timeRange).toBe('hari_ini');
    expect(state.chartPoints).toHaveLength(4);
    expect(state.chartPoints[0].label).toBe('Jam 1');
    expect(state.chartPoints[3].label).toBe('Jam 4');
  });

  it('setTimeRange seminggu updates chart to 6 KBM days (Sabtu-Kamis)', () => {
    useDashboardStore.getState().setTimeRange('seminggu');
    const state = useDashboardStore.getState();

    expect(state.timeRange).toBe('seminggu');
    expect(state.chartPoints).toHaveLength(6);
    expect(state.chartPoints.map((p) => p.label)).toEqual([
      'Sabtu',
      'Ahad',
      'Senin',
      'Selasa',
      'Rabu',
      'Kamis',
    ]);
    expect(state.kpiData.setoranDeltaText).toContain('pekan ini');
  });

  it('setTimeRange sebulan updates chart to 4 weeks (Pekan 1 - 4)', () => {
    useDashboardStore.getState().setTimeRange('sebulan');
    const state = useDashboardStore.getState();

    expect(state.timeRange).toBe('sebulan');
    expect(state.chartPoints).toHaveLength(4);
    expect(state.chartPoints.map((p) => p.label)).toEqual([
      'Pekan 1',
      'Pekan 2',
      'Pekan 3',
      'Pekan 4',
    ]);
    expect(state.kpiData.setoranDeltaText).toContain('sebulan');
  });

  it('setTimeRange setahun updates chart to 12 academic months (Jul-Jun)', () => {
    useDashboardStore.getState().setTimeRange('setahun');
    const state = useDashboardStore.getState();

    expect(state.timeRange).toBe('setahun');
    expect(state.chartPoints).toHaveLength(12);
    expect(state.chartPoints[0].label).toBe('Jul');
    expect(state.chartPoints[11].label).toBe('Jun');
    expect(state.kpiData.santriDeltaText).toContain('thn ini');
  });

  it('recomputeAggregates correctly computes Santri, Rombel, and Setoran counts', () => {
    const mockSantri: Partial<Santri>[] = [
      { no_induk: '001', nama: 'Santri 1', pa_pi: 'PA', tingkat: '1 ULA' },
      { no_induk: '002', nama: 'Santri 2', pa_pi: 'PA', tingkat: '2 ULA' },
      { no_induk: '003', nama: 'Santri 3', pa_pi: 'PI', tingkat: '1 WUSTHO' },
      { no_induk: '004', nama: 'Santri 4', pa_pi: 'PI', tingkat: '1 ULYA' },
      { no_induk: '005', nama: 'Santri 5', pa_pi: 'PA', tingkat: 'UNGGULAN ULA' },
    ];

    const mockFormasi: Partial<Formasi>[] = [
      { id: '1', tingkat: '1 ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PA', is_unggulan: false },
      { id: '2', tingkat: '2 ULA', din_kls: '2', din_bag: 'A', pa_pi: 'PA', is_unggulan: true },
    ];

    const mockSetoran: Partial<SetoranHafalan>[] = [
      { no_induk: '001', nama: 'Santri 1', item_hafalan: 'Imrithi Bait 1-20', tingkat: 'ULA' },
      { no_induk: '002', nama: 'Santri 2', item_hafalan: 'Alfiyyah Bait 1-50', tingkat: 'WUSTHO' },
    ];

    const mockAbsensi: Partial<RiwayatAbsensiItem>[] = [
      { id: 'a1', status: 'Hadir', nama: 'Ust. A' },
      { id: 'a2', status: 'Hadir', nama: 'Ust. B' },
      { id: 'a3', status: 'Alfa', nama: 'Ust. C' },
    ];

    const mockPosts: Partial<WartaBerita>[] = [
      { id: 'p1', title: 'Haflah Imtihan', author_name: 'Redaksi', views_count: 150 },
    ];

    useDashboardStore.getState().recomputeAggregates({
      santri: mockSantri as Santri[],
      asatidz: [] as Asatidz[],
      absensi: mockAbsensi as RiwayatAbsensiItem[],
      setoran: mockSetoran as SetoranHafalan[],
      formasi: mockFormasi as Formasi[],
      posts: mockPosts as WartaBerita[],
    });

    const state = useDashboardStore.getState();

    // Verifikasi Santri
    expect(state.kpiData.totalSantri).toBe(5);
    expect(state.kpiData.santriPa).toBe(3);
    expect(state.kpiData.santriPi).toBe(2);

    // Verifikasi Formasi
    expect(state.kpiData.totalRombel).toBe(2);
    expect(state.kpiData.kelasUnggulanCount).toBe(1);

    // Verifikasi Setoran
    expect(state.kpiData.totalSetoran).toBe(2);

    // Verifikasi Absensi (2 Hadir dari 3 = 66.7%)
    expect(state.kpiData.kehadiranHadirCount).toBe(2);
    expect(state.kpiData.kehadiranAlfaCount).toBe(1);
    expect(state.kpiData.kehadiranGuruPct).toBe(66.7);

    // Verifikasi Activity Ticker di-update
    expect(state.recentActivities[0].judul).toContain('Imrithi Bait 1-20');
    expect(state.recentActivities[2].judul).toContain('Haflah Imtihan');
  });
});
