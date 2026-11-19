'use client';

import React, { useMemo, useState } from 'react';
import { Users, Calendar, BookOpen, Search } from 'lucide-react';
import DatabaseTaHeader from '@/components/modules/database-ta/DatabaseTaHeader';
import { useDatabaseTaSync } from '@/components/modules/database-ta/useDatabaseTaSync';
import { StrictTingkatTA } from '@/types/database-ta';

type RekapTab = 'santri-formasi' | 'kbm-asatidz' | 'hafalan-piagam';
type FilterTingkat = 'ALL' | StrictTingkatTA;

export default function DatabaseTahunAjaranRekapPage() {
  const {
    activeTahunAjaran,
    activeSavedSnapshot,
    timelineSnapshots,
    selectedTA,
    setSelectedTA,
    selectedSnapshot,
    isLoading,
    isSaving,
    refreshAllData,
    captureActiveTA,
  } = useDatabaseTaSync();

  const [activeTab, setActiveTab] = useState<RekapTab>('santri-formasi');
  const [filterTingkat, setFilterTingkat] = useState<FilterTingkat>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCapture = async () => {
    setNotice(null);
    const res = await captureActiveTA();
    if (res.ok) {
      setNotice({
        type: 'success',
        text: `Rekap TA ${activeTahunAjaran} berhasil diperbarui ke arsip tahunan.`,
      });
    } else {
      setNotice({ type: 'error', text: res.error || 'Gagal menyimpan snapshot tahun ajaran.' });
    }
  };

  const filteredRows = useMemo(() => {
    return selectedSnapshot.rekap_per_kelas.filter((row) => {
      if (filterTingkat !== 'ALL' && row.tingkat !== filterTingkat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!row.label_kelas.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [selectedSnapshot.rekap_per_kelas, filterTingkat, searchQuery]);

  const totals = useMemo(() => {
    const santriPa = filteredRows.reduce((s, r) => s + r.santri_pa, 0);
    const santriPi = filteredRows.reduce((s, r) => s + r.santri_pi, 0);
    const totalSantri = santriPa + santriPi;
    const formasiPa = filteredRows.reduce((s, r) => s + r.formasi_pa, 0);
    const formasiPi = filteredRows.reduce((s, r) => s + r.formasi_pi, 0);
    const formasiUnggulan = filteredRows.reduce((s, r) => s + r.formasi_unggulan, 0);
    const totalFormasi = filteredRows.reduce((s, r) => s + r.total_formasi, 0);
    const slotTerisi = filteredRows.reduce((s, r) => s + r.slot_kbm_terisi, 0);
    const slotTotal = filteredRows.reduce((s, r) => s + r.slot_kbm_total, 0);
    const sesiHadir = filteredRows.reduce((s, r) => s + r.sesi_absensi_hadir, 0);
    const sesiTotal = filteredRows.reduce((s, r) => s + r.sesi_absensi_total, 0);
    const wajibSantri = filteredRows.reduce((s, r) => s + r.setoran_wajib_santri, 0);
    const sunnahSantri = filteredRows.reduce((s, r) => s + r.setoran_sunnah_santri, 0);
    const kitabSantri = filteredRows.reduce((s, r) => s + r.setoran_kitab_santri, 0);
    const piagam = filteredRows.reduce((s, r) => s + r.serah_piagam_count, 0);

    return {
      santriPa,
      santriPi,
      totalSantri,
      formasiPa,
      formasiPi,
      formasiUnggulan,
      totalFormasi,
      slotTerisi,
      slotTotal,
      kbmPct: slotTotal > 0 ? Math.round((slotTerisi / slotTotal) * 100) : 0,
      sesiHadir,
      sesiTotal,
      hadirPct: sesiTotal > 0 ? Math.round((sesiHadir / sesiTotal) * 100) : 0,
      wajibSantri,
      sunnahSantri,
      kitabSantri,
      wajibPct: totalSantri > 0 ? Math.round((wajibSantri / totalSantri) * 100) : 0,
      piagam,
    };
  }, [filteredRows]);

  const tabs: Array<{ id: RekapTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'santri-formasi', label: 'Santri & Formasi Kelas', icon: Users },
    { id: 'kbm-asatidz', label: 'KBM & Kehadiran Asatidz', icon: Calendar },
    { id: 'hafalan-piagam', label: 'Hafalan & Serah Piagam', icon: BookOpen },
  ];

  return (
    <div className="space-y-5 pb-10">
      <DatabaseTaHeader
        title="Rekap Kelas & Akademik (1-4 ULA, 1-2 WUSTHO, 1-2 ULYA)"
        subtitle="Matriks ringkas perkembangan tiap tingkat kelas madrasah diniyyah dalam satu halaman bertab."
        activeTahunAjaran={activeTahunAjaran}
        activeSavedSnapshot={activeSavedSnapshot}
        isLoading={isLoading}
        isSaving={isSaving}
        onRefresh={refreshAllData}
        onCaptureActive={handleCapture}
        notice={notice}
      />

      {/* Toolbar Filter + 3 Tab Internal */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* 3 Tab Internal */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`tab-db-ta-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filter TA, Tingkat & Pencarian */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedTA}
              onChange={(e) => setSelectedTA(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              {timelineSnapshots.map((snap) => (
                <option key={snap.tahun_ajaran_masehi} value={snap.tahun_ajaran_masehi}>
                  TA {snap.tahun_ajaran_masehi} ({snap.is_live_preview ? 'Live' : snap.status_arsip.toUpperCase()})
                </option>
              ))}
            </select>

            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value as FilterTingkat)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Tingkat (1-4 ULA, 1-2 WST, 1-2 ULY)</option>
              <option value="ULA">ULA (Kelas 1-4 ULA)</option>
              <option value="WUSTHO">WUSTHO (Kelas 1-2 WUSTHO)</option>
              <option value="ULYA">ULYA (Kelas 1-2 ULYA)</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari tingkat..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none w-36"
              />
            </div>
          </div>
        </div>

        {/* Tabel Isi Sesuai Tab Aktif */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          {activeTab === 'santri-formasi' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">Jenjang Kelas</th>
                  <th className="py-2.5 px-3">Tingkat</th>
                  <th className="py-2.5 px-3 text-right">Santri Putra (PA)</th>
                  <th className="py-2.5 px-3 text-right">Santri Putri (PI)</th>
                  <th className="py-2.5 px-3 text-right">Total Santri</th>
                  <th className="py-2.5 px-3 text-right">Rombel PA</th>
                  <th className="py-2.5 px-3 text-right">Rombel PI</th>
                  <th className="py-2.5 px-3 text-right">Unggulan</th>
                  <th className="py-2.5 px-3 text-right">Total Formasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.label_kelas}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {row.tingkat}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-sky-700 font-semibold">{row.santri_pa}</td>
                    <td className="py-2.5 px-3 text-right text-rose-700 font-semibold">{row.santri_pi}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{row.total_santri}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{row.formasi_pa}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{row.formasi_pi}</td>
                    <td className="py-2.5 px-3 text-right text-amber-700 font-semibold">{row.formasi_unggulan}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{row.total_formasi}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/70 border-t-2 border-emerald-200 font-bold text-slate-900">
                  <td className="py-2.5 px-3" colSpan={2}>Total Terfilter ({filteredRows.length} Jenjang)</td>
                  <td className="py-2.5 px-3 text-right text-sky-800">{totals.santriPa}</td>
                  <td className="py-2.5 px-3 text-right text-rose-800">{totals.santriPi}</td>
                  <td className="py-2.5 px-3 text-right">{totals.totalSantri}</td>
                  <td className="py-2.5 px-3 text-right">{totals.formasiPa}</td>
                  <td className="py-2.5 px-3 text-right">{totals.formasiPi}</td>
                  <td className="py-2.5 px-3 text-right text-amber-800">{totals.formasiUnggulan}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-900">{totals.totalFormasi}</td>
                </tr>
              </tfoot>
            </table>
          )}

          {activeTab === 'kbm-asatidz' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">Jenjang Kelas</th>
                  <th className="py-2.5 px-3 text-right">Rombel Kelas</th>
                  <th className="py-2.5 px-3 text-right">Slot Jadwal Terisi</th>
                  <th className="py-2.5 px-3 text-right">Total Slot Jadwal</th>
                  <th className="py-2.5 px-3 text-right">Keterisian Jadwal</th>
                  <th className="py-2.5 px-3 text-right">Sesi Hadir Asatidz</th>
                  <th className="py-2.5 px-3 text-right">Total Sesi Presensi</th>
                  <th className="py-2.5 px-3 text-right">Kehadiran Asatidz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.label_kelas}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">{row.total_formasi}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-teal-700">{row.slot_kbm_terisi}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{row.slot_kbm_total}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {row.keterisian_kbm_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-amber-700">{row.sesi_absensi_hadir}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{row.sesi_absensi_total}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {row.kehadiran_asatidz_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/70 border-t-2 border-emerald-200 font-bold text-slate-900">
                  <td className="py-2.5 px-3">Total Terfilter</td>
                  <td className="py-2.5 px-3 text-right">{totals.totalFormasi}</td>
                  <td className="py-2.5 px-3 text-right text-teal-800">{totals.slotTerisi}</td>
                  <td className="py-2.5 px-3 text-right">{totals.slotTotal}</td>
                  <td className="py-2.5 px-3 text-right text-teal-900">{totals.kbmPct}%</td>
                  <td className="py-2.5 px-3 text-right text-amber-800">{totals.sesiHadir}</td>
                  <td className="py-2.5 px-3 text-right">{totals.sesiTotal}</td>
                  <td className="py-2.5 px-3 text-right text-amber-900">{totals.hadirPct}%</td>
                </tr>
              </tfoot>
            </table>
          )}

          {activeTab === 'hafalan-piagam' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3">Jenjang Kelas</th>
                  <th className="py-2.5 px-3 text-right">Total Santri</th>
                  <th className="py-2.5 px-3 text-right">Hafalan Wajib (Santri)</th>
                  <th className="py-2.5 px-3 text-right">Capaian Wajib (%)</th>
                  <th className="py-2.5 px-3 text-right">Hafalan Sunnah (Santri)</th>
                  <th className="py-2.5 px-3 text-right">Hafalan Kitab (Santri)</th>
                  <th className="py-2.5 px-3 text-right">Serah Piagam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{row.label_kelas}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{row.total_santri}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-indigo-700">{row.setoran_wajib_santri}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {row.capaian_wajib_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-700 font-semibold">{row.setoran_sunnah_santri}</td>
                    <td className="py-2.5 px-3 text-right text-sky-700 font-semibold">{row.setoran_kitab_santri}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">{row.serah_piagam_count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/70 border-t-2 border-emerald-200 font-bold text-slate-900">
                  <td className="py-2.5 px-3">Total Terfilter</td>
                  <td className="py-2.5 px-3 text-right">{totals.totalSantri}</td>
                  <td className="py-2.5 px-3 text-right text-indigo-800">{totals.wajibSantri}</td>
                  <td className="py-2.5 px-3 text-right text-indigo-900">{totals.wajibPct}%</td>
                  <td className="py-2.5 px-3 text-right text-amber-800">{totals.sunnahSantri}</td>
                  <td className="py-2.5 px-3 text-right text-sky-800">{totals.kitabSantri}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-900">{totals.piagam}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
