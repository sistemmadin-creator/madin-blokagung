'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useJadwalStore, HariKbm } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { JamKbm, RecordSesiAbsensi, StatusAbsensi } from '@/types/absensi';
import { Asatidz } from '@/types/asatidz';
import {
  UserCheck,
  Calendar,
  RefreshCw,
  MessageSquare,
  Slash,
  CheckCircle2,
  AlertCircle,
  UserX,
  Repeat,
  Save
} from 'lucide-react';
import ModalAturLibur from '@/components/modules/absensi/ModalAturLibur';
import ModalListStatusKPI from '@/components/modules/absensi/ModalListStatusKPI';
import ModalGeneratorWA from '@/components/modules/rekap-absensi/ModalGeneratorWA';

const STATUS_OPTIONS: { label: StatusAbsensi; color: string }[] = [
  { label: 'Hadir', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { label: 'Badal', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { label: 'Izin', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { label: 'Sakit', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { label: 'Alfa', color: 'bg-rose-100 text-rose-800 border-rose-300' },
];

export default function AbsensiPage() {
  const {
    absensiMapByDate,
    liburMapByDate,
    selectedDate,
    setSelectedDate,
    selectedJam,
    setSelectedJam,
    fetchAbsensi,
    saveSessionRecords,
  } = useAbsensiStore();

  const { jadwalMap, fetchJadwal } = useJadwalStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [showModalLibur, setShowModalLibur] = useState(false);
  const [showModalKPI, setShowModalKPI] = useState(false);
  const [showModalWA, setShowModalWA] = useState(false);
  const [localRecords, setLocalRecords] = useState<RecordSesiAbsensi[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAbsensi();
    fetchJadwal();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchAbsensi, fetchJadwal, fetchAsatidz, asatidzList.length]);

  // Determine day name in Indonesian
  const dayNameIndo: HariKbm = useMemo(() => {
    if (!selectedDate) return 'Sabtu';
    const d = new Date(selectedDate);
    const map: Record<number, HariKbm> = {
      0: 'Ahad',
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Sabtu',
      6: 'Sabtu',
    };
    return map[d.getDay()] || 'Sabtu';
  }, [selectedDate]);

  // Load schedule for this day and merge with saved records
  useEffect(() => {
    const hariKey = dayNameIndo.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
    const savedRecordsForSession = absensiMapByDate[selectedDate]?.[selectedJam] || [];

    if (savedRecordsForSession.length > 0) {
      setLocalRecords(savedRecordsForSession);
      return;
    }

    // Generate from schedule
    const asatidzMap = new Map<string, Asatidz>();
    asatidzList.forEach((a) => {
      if (a.nama_asatidz) asatidzMap.set(a.nama_asatidz.toUpperCase(), a);
    });

    const generated: RecordSesiAbsensi[] = [];

    Object.values(jadwalMap).forEach((teacherRow) => {
      const nama = teacherRow.nama_asatidz;
      const dayStr = teacherRow[hariKey] || '';
      if (!dayStr) return;

      const lines = dayStr.split(';;').map((s) => s.trim()).filter(Boolean);
      lines.forEach((l) => {
        const parts = l.split('|').map((s) => s.trim());
        const jamNum = parseInt((parts[0] || '').replace(/\D/g, ''), 10);
        const kelas = parts[1] || '';
        const fan = parts[2] || '';

        if (jamNum === selectedJam) {
          const aObj = asatidzMap.get(nama.toUpperCase());
          generated.push({
            jam: selectedJam,
            nama_asatidz: nama,
            nia: aObj?.nia || '-',
            kelas,
            fan,
            status: 'Hadir',
            keterangan: '',
          });
        }
      });
    });

    setLocalRecords(generated.sort((a, b) => a.nama_asatidz.localeCompare(b.nama_asatidz)));
  }, [selectedDate, selectedJam, dayNameIndo, absensiMapByDate, jadwalMap, asatidzList]);

  // Compute 5 KPI stats
  const kpiStats = useMemo(() => {
    const allSessions = absensiMapByDate[selectedDate] || {};
    let total = 0;
    let hadir = 0;
    let badal = 0;
    let izinSakit = 0;
    let alfa = 0;

    [1, 2, 3, 4].forEach((j) => {
      const records = (allSessions[j as JamKbm] || (j === selectedJam ? localRecords : []));
      total += records.length;
      records.forEach((r) => {
        if (r.status === 'Hadir') hadir++;
        else if (r.status === 'Badal') badal++;
        else if (r.status === 'Izin' || r.status === 'Sakit') izinSakit++;
        else if (r.status === 'Alfa') alfa++;
      });
    });

    return { total, hadir, badal, izinSakit, alfa };
  }, [absensiMapByDate, selectedDate, selectedJam, localRecords]);

  const handleStatusChange = (index: number, newStatus: StatusAbsensi) => {
    setLocalRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
  };

  const handlePenggantiChange = (index: number, pengganti: string) => {
    setLocalRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], asatidz_pengganti: pengganti };
      return updated;
    });
  };

  const handleKeteranganChange = (index: number, keterangan: string) => {
    setLocalRecords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], keterangan };
      return updated;
    });
  };

  const handleMarkAllHadir = () => {
    setLocalRecords((prev) => prev.map((r) => ({ ...r, status: 'Hadir' })));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await saveSessionRecords(selectedDate, selectedJam, localRecords);
    setIsSaving(false);
    alert('Data presensi berhasil disimpan!');
  };

  const isLibur = !!liburMapByDate[selectedDate];

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai absensi.html */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-6 h-6 text-madin-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Absensi Asatidz
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Presensi berbasis integrasi jadwal harian (Sabtu s/d Kamis)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowModalWA(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat WA</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
              />
            </div>

            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
              {dayNameIndo}
            </span>

            <button
              type="button"
              onClick={() => setShowModalLibur(true)}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 transition shadow-xs flex items-center gap-1"
            >
              <Slash className="w-3.5 h-3.5" />
              <span>Libur / Event</span>
            </button>

            <button
              type="button"
              onClick={fetchAbsensi}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* Banner Alert Libur Jika Ada */}
        {isLibur && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
            <span>
              <strong>Hari Libur Aktif:</strong> {liburMapByDate[selectedDate]?.kategori} -{' '}
              {liburMapByDate[selectedDate]?.keterangan}
            </span>
          </div>
        )}
      </div>

      {/* 2. 5 Kartu KPI Interaktif Sesuai absensi.html */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setShowModalKPI(true)}
          className="kpi-card cursor-pointer"
          title="Klik untuk detail sesi"
        >
          <div className="kpi-icon-wrapper bg-emerald-50 text-emerald-700">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="kpi-title">Total Sesi</div>
            <div className="kpi-value">{kpiStats.total}</div>
          </div>
        </div>

        <div
          onClick={() => setShowModalKPI(true)}
          className="kpi-card cursor-pointer"
          title="Klik untuk detail hadir"
        >
          <div className="kpi-icon-wrapper bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="kpi-title">Hadir</div>
            <div className="kpi-value text-emerald-700">{kpiStats.hadir}</div>
          </div>
        </div>

        <div
          onClick={() => setShowModalKPI(true)}
          className="kpi-card cursor-pointer"
          title="Klik untuk detail badal"
        >
          <div className="kpi-icon-wrapper bg-blue-50 text-blue-700">
            <Repeat className="w-5 h-5" />
          </div>
          <div>
            <div className="kpi-title">Terisi / Badal</div>
            <div className="kpi-value text-blue-700">{kpiStats.badal}</div>
          </div>
        </div>

        <div
          onClick={() => setShowModalKPI(true)}
          className="kpi-card cursor-pointer"
          title="Klik untuk detail izin/sakit"
        >
          <div className="kpi-icon-wrapper bg-amber-50 text-amber-700">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="kpi-title">Izin / Sakit</div>
            <div className="kpi-value text-amber-600">{kpiStats.izinSakit}</div>
          </div>
        </div>

        <div
          onClick={() => setShowModalKPI(true)}
          className="kpi-card cursor-pointer"
          title="Klik untuk detail alfa"
        >
          <div className="kpi-icon-wrapper bg-rose-50 text-rose-700">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="kpi-title">Kosong / Alfa</div>
            <div className="kpi-value text-rose-600">{kpiStats.alfa}</div>
          </div>
        </div>
      </div>

      {/* 3. Tab Sesi Jam 1-4 & Tombol Tandai Hadir Semua */}
      <div className="card-panel border-0 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {([1, 2, 3, 4] as JamKbm[]).map((j) => (
            <button
              key={j}
              type="button"
              onClick={() => setSelectedJam(j)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                selectedJam === j
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Jam Ke-{j}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedJam === j ? 'bg-white/20' : 'bg-slate-200'}`}>
                {absensiMapByDate[selectedDate]?.[j]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllHadir}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition"
          >
            Tandai Hadir Semua
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-madin-700 hover:bg-madin-800 text-white transition shadow-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Presensi'}</span>
          </button>
        </div>
      </div>

      {/* 4. Tabel Presensi Asatidz */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm">
        <div className="table-responsive overflow-x-auto">
          <table className="tabel-kbm-resmi w-full">
            <thead>
              <tr>
                <th style={{ width: 40 }}>NO</th>
                <th style={{ width: 65 }}>NIA</th>
                <th style={{ minWidth: 180 }}>NAMA ASATIDZ</th>
                <th style={{ minWidth: 160 }}>KELAS &amp; FAN</th>
                <th style={{ minWidth: 260 }}>STATUS KEHADIRAN</th>
                <th style={{ minWidth: 160 }}>GURU PENGGANTI (BADAL)</th>
                <th style={{ minWidth: 160 }}>KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              {localRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    Tidak ada jadwal mengajar pada jam ke-{selectedJam} hari {dayNameIndo}.
                  </td>
                </tr>
              ) : (
                localRecords.map((r, idx) => (
                  <tr key={`${r.nama_asatidz}-${r.kelas}-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="text-center font-bold text-slate-600">{idx + 1}</td>
                    <td className="cell-kg font-mono font-bold">{r.nia}</td>
                    <td className="font-semibold text-slate-800 px-2">{r.nama_asatidz}</td>
                    <td className="px-2 text-xs">
                      <strong>{r.kelas}</strong> <span className="text-slate-500">({r.fan})</span>
                    </td>
                    <td className="px-2">
                      <div className="flex gap-1 flex-wrap">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleStatusChange(idx, opt.label)}
                            className={`px-2 py-0.5 text-[11px] font-bold rounded border transition ${
                              r.status === opt.label
                                ? opt.color + ' shadow-xs'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-2">
                      {r.status === 'Badal' ? (
                        <input
                          type="text"
                          value={r.asatidz_pengganti || ''}
                          onChange={(e) => handlePenggantiChange(idx, e.target.value)}
                          placeholder="Nama guru pengganti..."
                          className="w-full text-xs p-1 rounded border border-blue-300 bg-blue-50/50"
                        />
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-2">
                      <input
                        type="text"
                        value={r.keterangan || ''}
                        onChange={(e) => handleKeteranganChange(idx, e.target.value)}
                        placeholder="Keterangan..."
                        className="w-full text-xs p-1 rounded border border-slate-200 bg-transparent focus:bg-white"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ModalAturLibur
        isOpen={showModalLibur}
        onClose={() => setShowModalLibur(false)}
        targetDate={selectedDate}
      />
      <ModalListStatusKPI
        isOpen={showModalKPI}
        onClose={() => setShowModalKPI(false)}
      />
      <ModalGeneratorWA
        isOpen={showModalWA}
        onClose={() => setShowModalWA(false)}
      />
    </div>
  );
}
