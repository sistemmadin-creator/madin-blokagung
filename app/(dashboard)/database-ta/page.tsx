'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Building,
  UserCheck,
  Calendar,
  BookOpen,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { usePagePermission } from '@/stores/useRbacStore';
import DatabaseTaHeader from '@/components/modules/database-ta/DatabaseTaHeader';
import { useDatabaseTaSync } from '@/components/modules/database-ta/useDatabaseTaSync';
import { computeDeltaYoY, YoYDeltaResult } from '@/lib/utils/databaseTahunAjaranHelper';
import { StrictTingkatTA } from '@/types/database-ta';

function DeltaBadge({ delta, compareLabel }: { delta: YoYDeltaResult | null; compareLabel?: string }) {
  if (!delta) {
    return (
      <span className="text-[10px] font-medium text-slate-400">
        Tahun pembanding awal
      </span>
    );
  }
  const colorClass =
    delta.direction === 'up'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : delta.direction === 'down'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-slate-100 text-slate-600 border-slate-200';
  const Icon =
    delta.direction === 'up' ? TrendingUp : delta.direction === 'down' ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}>
      <Icon className="w-3 h-3" />
      <span>{delta.label}</span>
      {compareLabel && <span className="font-normal opacity-80">vs {compareLabel}</span>}
    </span>
  );
}

export default function DatabaseTahunAjaranProgresPage() {
  const { canEdit } = usePagePermission('database-ta');
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

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCapture = async () => {
    setNotice(null);
    const res = await captureActiveTA();
    if (res.ok) {
      setNotice({
        type: 'success',
        text: `Rekap progres TA ${activeTahunAjaran} (1-4 ULA, 1-2 WUSTHO, 1-2 ULYA) berhasil disimpan.`,
      });
    } else {
      setNotice({ type: 'error', text: res.error || 'Gagal menyimpan snapshot tahun ajaran.' });
    }
  };

  const selectedIndex = timelineSnapshots.findIndex(
    (s) => s.tahun_ajaran_masehi === selectedSnapshot.tahun_ajaran_masehi
  );
  const previousSnapshot = selectedIndex > 0 ? timelineSnapshots[selectedIndex - 1] : null;
  const r = selectedSnapshot.ringkasan_umum;
  const prevR = previousSnapshot?.ringkasan_umum;
  const prevLabel = previousSnapshot?.tahun_ajaran_masehi;

  const jenjangSummary = useMemo(() => {
    const tiers: Array<{ key: StrictTingkatTA; label: string; subtitle: string }> = [
      { key: 'ULA', label: 'Tingkat ULA (1-4 ULA)', subtitle: 'Kelas 1 ULA s/d 4 ULA' },
      { key: 'WUSTHO', label: 'Tingkat WUSTHO (1-2 WUSTHO)', subtitle: 'Kelas 1 WUSTHO & 2 WUSTHO' },
      { key: 'ULYA', label: 'Tingkat ULYA (1-2 ULYA)', subtitle: 'Kelas 1 ULYA & 2 ULYA' },
    ];
    return tiers.map((t) => {
      const rows = selectedSnapshot.rekap_per_kelas.filter((row) => row.tingkat === t.key);
      const totalSantri = rows.reduce((s, row) => s + row.total_santri, 0);
      const totalFormasi = rows.reduce((s, row) => s + row.total_formasi, 0);
      const slotTerisi = rows.reduce((s, row) => s + row.slot_kbm_terisi, 0);
      const slotTotal = rows.reduce((s, row) => s + row.slot_kbm_total, 0);
      const wajibSantri = rows.reduce((s, row) => s + row.setoran_wajib_santri, 0);
      const piagamCount = rows.reduce((s, row) => s + row.serah_piagam_count, 0);
      return {
        ...t,
        totalSantri,
        totalFormasi,
        kbmPct: slotTotal > 0 ? Math.round((slotTerisi / slotTotal) * 100) : 0,
        wajibPct: totalSantri > 0 ? Math.round((wajibSantri / totalSantri) * 100) : 0,
        piagamCount,
      };
    });
  }, [selectedSnapshot]);

  const kpiCards = [
    {
      label: 'Total Santri (1-4 ULA, 1-2 WST/ULY)',
      value: r.total_santri.toLocaleString('id-ID'),
      sub: `PA ${r.santri_pa} | PI ${r.santri_pi}`,
      delta: computeDeltaYoY(r.total_santri, prevR?.total_santri),
      icon: Users,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Formasi Rombel Kelas',
      value: r.total_formasi_kelas.toLocaleString('id-ID'),
      sub: `Reguler ${r.formasi_reguler} | Unggulan ${r.formasi_unggulan}`,
      delta: computeDeltaYoY(r.total_formasi_kelas, prevR?.total_formasi_kelas),
      icon: Building,
      tone: 'text-sky-700 bg-sky-50 border-sky-200',
    },
    {
      label: 'Asatidz Aktif & Keterisian Jadwal KBM',
      value: `${r.keterisian_kbm_pct}%`,
      sub: `${r.total_asatidz_aktif} Asatidz Aktif | ${r.slot_kbm_terisi}/${r.slot_kbm_total} Slot`,
      delta: computeDeltaYoY(r.keterisian_kbm_pct, prevR?.keterisian_kbm_pct, '%'),
      icon: Calendar,
      tone: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    {
      label: 'Kehadiran Asatidz KBM & Konsorsium',
      value: `${r.kehadiran_asatidz_pct}%`,
      sub: `Konsorsium ${r.kehadiran_konsorsium_pct}% hadir`,
      delta: computeDeltaYoY(r.kehadiran_asatidz_pct, prevR?.kehadiran_asatidz_pct, '%'),
      icon: UserCheck,
      tone: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      label: 'Capaian Hafalan Wajib & Log Setoran',
      value: `${r.capaian_wajib_pct}%`,
      sub: `${r.total_setoran_hafalan.toLocaleString('id-ID')} entri setoran tercatat`,
      delta: computeDeltaYoY(r.capaian_wajib_pct, prevR?.capaian_wajib_pct, '%'),
      icon: BookOpen,
      tone: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      label: 'Serah Piagam & Agenda Kalender',
      value: r.total_serah_piagam.toLocaleString('id-ID'),
      sub: `${r.total_agenda_kalender} agenda kalender kegiatan`,
      delta: computeDeltaYoY(r.total_serah_piagam, prevR?.total_serah_piagam),
      icon: Award,
      tone: 'text-rose-700 bg-rose-50 border-rose-200',
    },
  ];

  return (
    <div className="space-y-5 pb-10">
      <DatabaseTaHeader
        title="Progres Lintas Tahun Ajaran"
        subtitle="Ringkasan akumulatif perkembangan santri, formasi kelas, KBM, kehadiran asatidz, dan muhafadzoh antar tahun ajaran."
        activeTahunAjaran={activeTahunAjaran}
        activeSavedSnapshot={activeSavedSnapshot}
        isLoading={isLoading}
        isSaving={isSaving}
        canEdit={canEdit}
        onRefresh={refreshAllData}
        onCaptureActive={handleCapture}
        notice={notice}
      />

      {/* Pemilih Tahun Tinjauan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-800 m-0">Tahun Ajaran Ditinjau</p>
          <p className="text-[11px] text-slate-500 m-0 mt-0.5">
            {selectedSnapshot.is_live_preview
              ? 'Menampilkan kalkulasi langsung (Pratinjau Live). Klik Rekam Snapshot untuk menyimpan permanen.'
              : `Data arsip tersimpan (${selectedSnapshot.status_arsip.toUpperCase()}) • Terakhir diperbarui oleh ${selectedSnapshot.diperbarui_oleh}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTA}
            onChange={(e) => setSelectedTA(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-none cursor-pointer"
          >
            {timelineSnapshots.map((snap) => (
              <option key={snap.tahun_ajaran_masehi} value={snap.tahun_ajaran_masehi}>
                TA {snap.tahun_ajaran_masehi} ({snap.tahun_ajaran_hijriyah} H)
                {snap.is_live_preview ? ' - Live' : ` - ${snap.status_arsip.toUpperCase()}`}
              </option>
            ))}
          </select>

          <Link
            href="/database-ta/rekap"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Rincian 8 Jenjang</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Grid KPI Lintas Tahun */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide m-0">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 mb-0">
                    {card.value}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] text-slate-500 font-medium">{card.sub}</span>
                <DeltaBadge delta={card.delta} compareLabel={prevLabel} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Ringkasan per Jenjang (Strict 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {jenjangSummary.map((tier) => (
          <div
            key={tier.key}
            className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 m-0">{tier.label}</h3>
                <p className="text-[11px] text-slate-500 m-0">{tier.subtitle}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {tier.totalSantri} Santri
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-[10px] text-slate-500 block">Formasi Rombel</span>
                <span className="font-bold text-slate-800">{tier.totalFormasi} Kelas</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-[10px] text-slate-500 block">Slot Jadwal KBM</span>
                <span className="font-bold text-slate-800">{tier.kbmPct}% Terisi</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-[10px] text-slate-500 block">Hafalan Wajib</span>
                <span className="font-bold text-emerald-700">{tier.wajibPct}% Santri</span>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-[10px] text-slate-500 block">Serah Piagam</span>
                <span className="font-bold text-slate-800">{tier.piagamCount} Piagam</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabel Matriks Komparasi Antar Tahun Ajaran */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">
              Komparasi Progres Madrasah Lintas Tahun Ajaran
            </h2>
            <p className="text-[11px] text-slate-500 m-0">
              Membandingkan metrik inti tahun ke tahun (khusus 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA).
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {timelineSnapshots.length} Siklus Tahun Ajaran
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3">Tahun Ajaran</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Santri (PA / PI)</th>
                <th className="py-2.5 px-3 text-right">Asatidz</th>
                <th className="py-2.5 px-3 text-right">Formasi</th>
                <th className="py-2.5 px-3 text-right">Slot KBM</th>
                <th className="py-2.5 px-3 text-right">Hadir Asatidz</th>
                <th className="py-2.5 px-3 text-right">Hafalan Wajib</th>
                <th className="py-2.5 px-3 text-right">Piagam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timelineSnapshots.map((snap) => {
                const ru = snap.ringkasan_umum;
                const isSelected = snap.tahun_ajaran_masehi === selectedSnapshot.tahun_ajaran_masehi;
                return (
                  <tr
                    key={snap.tahun_ajaran_masehi}
                    onClick={() => setSelectedTA(snap.tahun_ajaran_masehi)}
                    className={`cursor-pointer transition ${
                      isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      TA {snap.tahun_ajaran_masehi}
                      <span className="block text-[10px] font-normal text-slate-500">
                        {snap.tahun_ajaran_hijriyah} H
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {snap.is_live_preview ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Pratinjau Live
                        </span>
                      ) : snap.status_arsip === 'terkunci' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Terkunci
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Draf Tersimpan
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-800">
                      {ru.total_santri.toLocaleString('id-ID')}
                      <span className="block text-[10px] font-normal text-slate-500">
                        {ru.santri_pa} PA / {ru.santri_pi} PI
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {ru.total_asatidz_aktif}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {ru.total_formasi_kelas}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-teal-700">
                      {ru.keterisian_kbm_pct}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-amber-700">
                      {ru.kehadiran_asatidz_pct}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-indigo-700">
                      {ru.capaian_wajib_pct}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                      {ru.total_serah_piagam}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
