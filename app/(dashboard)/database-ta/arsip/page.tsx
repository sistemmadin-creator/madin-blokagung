'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  Lock,
  Unlock,
  Trash2,
  Save,
  FileSpreadsheet,
  Archive,
} from 'lucide-react';
import { usePagePermission } from '@/stores/useRbacStore';
import { exportAoaToExcel } from '@/lib/utils/excel';
import DatabaseTaHeader from '@/components/modules/database-ta/DatabaseTaHeader';
import { useDatabaseTaSync } from '@/components/modules/database-ta/useDatabaseTaSync';
import { DatabaseTahunAjaranRekap } from '@/types/database-ta';

export default function DatabaseTahunAjaranArsipPage() {
  const { canEdit, canDelete } = usePagePermission('database-ta-arsip');
  const {
    currentAccount,
    activeTahunAjaran,
    activeSavedSnapshot,
    snapshots,
    timelineSnapshots,
    selectedTA,
    setSelectedTA,
    selectedSnapshot,
    isLoading,
    isSaving,
    refreshAllData,
    captureActiveTA,
    toggleLockSnapshot,
    updateCatatanEvaluasi,
    deleteSnapshot,
  } = useDatabaseTaSync();

  const actorName = currentAccount?.full_name || currentAccount?.username || 'Administrator';
  const [catatanInput, setCatatanInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setCatatanInput(selectedSnapshot.catatan_evaluasi || '');
  }, [selectedSnapshot.tahun_ajaran_masehi, selectedSnapshot.catatan_evaluasi]);

  const handleCapture = async () => {
    setNotice(null);
    const res = await captureActiveTA();
    if (res.ok) {
      setNotice({
        type: 'success',
        text: `Arsip rekap TA ${activeTahunAjaran} berhasil direkam.`,
      });
    } else {
      setNotice({ type: 'error', text: res.error || 'Gagal merekam snapshot tahun ajaran.' });
    }
  };

  const handleSaveCatatan = async () => {
    setNotice(null);
    if (selectedSnapshot.is_live_preview) {
      setNotice({
        type: 'error',
        text: 'Rekam snapshot TA ini terlebih dahulu sebelum menyimpan catatan evaluasi tahunan.',
      });
      return;
    }
    const res = await updateCatatanEvaluasi(
      selectedSnapshot.tahun_ajaran_masehi,
      catatanInput,
      actorName
    );
    if (res.ok) {
      setNotice({
        type: 'success',
        text: `Catatan evaluasi TA ${selectedSnapshot.tahun_ajaran_masehi} berhasil disimpan.`,
      });
    } else {
      setNotice({ type: 'error', text: res.error || 'Gagal menyimpan catatan evaluasi.' });
    }
  };

  const handleToggleLock = async (taMasehi: string) => {
    setNotice(null);
    const res = await toggleLockSnapshot(taMasehi, actorName);
    if (res.ok) {
      setNotice({
        type: 'success',
        text: `Status kunci arsip TA ${taMasehi} diperbarui.`,
      });
    } else {
      setNotice({ type: 'error', text: res.error || 'Gagal mengubah status kunci.' });
    }
  };

  const handleDeleteSnapshot = async (taMasehi: string) => {
    setNotice(null);
    const res = await deleteSnapshot(taMasehi, actorName);
    if (res.ok) {
      setNotice({
        type: 'success',
        text: `Draf snapshot TA ${taMasehi} telah dihapus.`,
      });
    } else {
      setNotice({ type: 'error', text: res.error || 'Gagal menghapus snapshot.' });
    }
  };

  const handleExportExcel = async (target: DatabaseTahunAjaranRekap) => {
    setIsExporting(true);
    try {
      const ru = target.ringkasan_umum;
      const summaryRows: Array<Array<string | number>> = [
        ['DATABASE TAHUN AJARAN - MADRASAH DINIYYAH AL-AMIRIYYAH BLOKAGUNG'],
        [`Tahun Ajaran: ${target.tahun_ajaran_masehi} (${target.tahun_ajaran_hijriyah} H)`],
        ['Cakupan Resmi: Khusus Kelas 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA (Non-EBTADIN)'],
        [`Status Arsip: ${target.is_live_preview ? 'Pratinjau Live' : target.status_arsip.toUpperCase()}`],
        [],
        ['Indikator Utama', 'Nilai'],
        ['Total Santri (1-4 ULA, 1-2 WUSTHO, 1-2 ULYA)', ru.total_santri],
        ['Santri Putra (PA)', ru.santri_pa],
        ['Santri Putri (PI)', ru.santri_pi],
        ['Asatidz Aktif', ru.total_asatidz_aktif],
        ['Total Formasi Rombel', ru.total_formasi_kelas],
        ['Formasi Reguler', ru.formasi_reguler],
        ['Formasi Unggulan', ru.formasi_unggulan],
        ['Slot Jadwal KBM Terisi / Total', `${ru.slot_kbm_terisi} / ${ru.slot_kbm_total} (${ru.keterisian_kbm_pct}%)`],
        ['Kehadiran Asatidz KBM (%)', `${ru.kehadiran_asatidz_pct}%`],
        ['Kehadiran Konsorsium Asatidz (%)', `${ru.kehadiran_konsorsium_pct}%`],
        ['Capaian Hafalan Wajib (%)', `${ru.capaian_wajib_pct}%`],
        ['Total Entri Setoran Hafalan', ru.total_setoran_hafalan],
        ['Total Penerima Serah Piagam', ru.total_serah_piagam],
        ['Agenda Kalender Kegiatan', ru.total_agenda_kalender],
        [],
        ['Catatan Evaluasi Pimpinan', target.catatan_evaluasi || '-'],
      ];

      const classRows: Array<Array<string | number>> = [
        [`REKAP PER JENJANG KELAS (1-4 ULA, 1-2 WUSTHO, 1-2 ULYA) - TA ${target.tahun_ajaran_masehi}`],
        [],
        [
          'Kelas',
          'Tingkat',
          'Santri PA',
          'Santri PI',
          'Total Santri',
          'Formasi PA',
          'Formasi PI',
          'Formasi Unggulan',
          'Total Formasi',
          'Slot KBM',
          'Hadir Asatidz (%)',
          'Wajib Santri (%)',
          'Serah Piagam',
        ],
        ...target.rekap_per_kelas.map((row) => [
          row.label_kelas,
          row.tingkat,
          row.santri_pa,
          row.santri_pi,
          row.total_santri,
          row.formasi_pa,
          row.formasi_pi,
          row.formasi_unggulan,
          row.total_formasi,
          `${row.slot_kbm_terisi}/${row.slot_kbm_total} (${row.keterisian_kbm_pct}%)`,
          `${row.kehadiran_asatidz_pct}%`,
          `${row.setoran_wajib_santri} (${row.capaian_wajib_pct}%)`,
          row.serah_piagam_count,
        ]),
      ];

      const comparisonRows: Array<Array<string | number>> = [
        ['TREN KOMPARASI ANTAR TAHUN AJARAN (NON-EBTADIN)'],
        [],
        [
          'Tahun Ajaran',
          'Hijriyah',
          'Status',
          'Total Santri',
          'Asatidz Aktif',
          'Formasi Kelas',
          'KBM Terisi (%)',
          'Hadir Asatidz (%)',
          'Hafalan Wajib (%)',
          'Serah Piagam',
        ],
        ...timelineSnapshots.map((s) => [
          s.tahun_ajaran_masehi,
          s.tahun_ajaran_hijriyah,
          s.is_live_preview ? 'Pratinjau Live' : s.status_arsip.toUpperCase(),
          s.ringkasan_umum.total_santri,
          s.ringkasan_umum.total_asatidz_aktif,
          s.ringkasan_umum.total_formasi_kelas,
          `${s.ringkasan_umum.keterisian_kbm_pct}%`,
          `${s.ringkasan_umum.kehadiran_asatidz_pct}%`,
          `${s.ringkasan_umum.capaian_wajib_pct}%`,
          s.ringkasan_umum.total_serah_piagam,
        ]),
      ];

      const safeFilename = target.tahun_ajaran_masehi.replace(/\//g, '-');
      await exportAoaToExcel({
        filename: `Database_TA_${safeFilename}.xlsx`,
        sheets: [
          { name: 'Ringkasan Umum', rows: summaryRows, colWidths: [44, 36] },
          {
            name: 'Rekap 1-4 ULA 1-2 WST ULY',
            rows: classRows,
            colWidths: [14, 12, 11, 11, 13, 12, 12, 16, 14, 16, 16, 16, 14],
          },
          {
            name: 'Tren Lintas Tahun',
            rows: comparisonRows,
            colWidths: [16, 14, 16, 13, 14, 14, 14, 16, 16, 14],
          },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      <DatabaseTaHeader
        title="Arsip & Ekspor Tahunan"
        subtitle="Kelola penguncian snapshot tahunan, catatan evaluasi pimpinan, serta ekspor buku rekap Excel lintas tahun."
        activeTahunAjaran={activeTahunAjaran}
        activeSavedSnapshot={activeSavedSnapshot}
        isLoading={isLoading}
        isSaving={isSaving}
        canEdit={canEdit}
        onRefresh={refreshAllData}
        onCaptureActive={handleCapture}
        notice={notice}
        extraActions={
          <button
            type="button"
            disabled={isExporting}
            onClick={() => handleExportExcel(selectedSnapshot)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-60"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Mengekspor...' : `Ekspor Excel TA ${selectedSnapshot.tahun_ajaran_masehi}`}</span>
          </button>
        }
      />

      {/* Grid 2 Kolom: Daftar Arsip Snapshot + Catatan Evaluasi Pimpinan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Kolom Kiri: Daftar Arsip Snapshot */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900 m-0">
                Daftar Arsip Rekap Tahun Ajaran
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {snapshots.length} Arsip Tersimpan
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {timelineSnapshots.map((snap) => {
              const isSelected = snap.tahun_ajaran_masehi === selectedSnapshot.tahun_ajaran_masehi;
              const isLocked = snap.status_arsip === 'terkunci';
              return (
                <div
                  key={snap.tahun_ajaran_masehi}
                  onClick={() => setSelectedTA(snap.tahun_ajaran_masehi)}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition ${
                    isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        TA {snap.tahun_ajaran_masehi}
                      </span>
                      <span className="text-xs text-slate-500">({snap.tahun_ajaran_hijriyah} H)</span>
                      {snap.is_live_preview ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Belum Direkam
                        </span>
                      ) : isLocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Terkunci
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Draf
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 m-0">
                      {snap.ringkasan_umum.total_santri} Santri | {snap.ringkasan_umum.total_formasi_kelas} Formasi | KBM {snap.ringkasan_umum.keterisian_kbm_pct}% | Wajib {snap.ringkasan_umum.capaian_wajib_pct}%
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleExportExcel(snap)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition cursor-pointer"
                      title="Ekspor Excel Tahun Ini"
                    >
                      <Download className="w-3 h-3" />
                      <span>Excel</span>
                    </button>

                    {!snap.is_live_preview && canEdit && (
                      <button
                        type="button"
                        onClick={() => handleToggleLock(snap.tahun_ajaran_masehi)}
                        disabled={isSaving}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                          isLocked
                            ? 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800'
                            : 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{isLocked ? 'Buka Kunci' : 'Kunci'}</span>
                      </button>
                    )}

                    {!snap.is_live_preview && !isLocked && canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSnapshot(snap.tahun_ajaran_masehi)}
                        disabled={isSaving}
                        title="Hapus draf snapshot"
                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Catatan Evaluasi Tahunan */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 m-0">
              Catatan Evaluasi TA {selectedSnapshot.tahun_ajaran_masehi}
            </h2>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Catat hasil evaluasi tahunan pengurus madrasah untuk TA ini sebagai bahan acuan tahun berikutnya.
            </p>
          </div>

          <textarea
            rows={7}
            value={catatanInput}
            onChange={(e) => setCatatanInput(e.target.value)}
            disabled={selectedSnapshot.is_live_preview || !canEdit}
            placeholder={
              selectedSnapshot.is_live_preview
                ? 'Rekam snapshot TA terlebih dahulu untuk mengisi catatan evaluasi.'
                : 'Contoh: Kenaikan partisipasi hafalan wajib di kelas 1-2 ULA membaik, perlu penguatan kedisiplinan jam kedua di tingkat Wustho...'
            }
            className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none disabled:bg-slate-50"
          />

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              {selectedSnapshot.updated_at
                ? `Terakhir diubah: ${new Date(selectedSnapshot.updated_at).toLocaleString('id-ID')}`
                : 'Belum tersimpan di arsip'}
            </span>

            {canEdit && (
              <button
                type="button"
                disabled={isSaving || selectedSnapshot.is_live_preview}
                onClick={handleSaveCatatan}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Catatan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
