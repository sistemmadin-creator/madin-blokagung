'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useJadwalStore, HariKbm } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { JamKbm, RecordSesiAbsensi, StatusAbsensi } from '@/types/absensi';
import { Asatidz } from '@/types/asatidz';
import {
  ClipboardCheck,
  Calendar,
  Lock,
  Unlock,
  Save,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import ModalAturLibur from '@/components/modules/absensi/ModalAturLibur';

const STATUS_LIST: StatusAbsensi[] = ['Hadir', 'Izin', 'Sakit', 'Alfa', 'Badal', 'Tugas'];

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
  const [localRecords, setLocalRecords] = useState<RecordSesiAbsensi[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAbsensi();
    fetchJadwal();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchAbsensi, fetchJadwal, fetchAsatidz, asatidzList.length]);

  // Determine day name in Indonesian from selectedDate
  const dayNameIndo: HariKbm = useMemo(() => {
    if (!selectedDate) return 'Sabtu';
    const d = new Date(selectedDate);
    const dayIndex = d.getDay();
    const map: Record<number, HariKbm> = {
      0: 'Ahad',
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Sabtu', // Jumat
      6: 'Sabtu',
    };
    return map[dayIndex] || 'Sabtu';
  }, [selectedDate]);

  // Check if today is a holiday
  const holidayInfo = liburMapByDate[selectedDate];
  const isLibur = !!holidayInfo;

  // Derive which jams are saved and unlocked
  const { savedJams, unlockedJams } = useMemo(() => {
    const saved: Record<JamKbm, boolean> = { 1: false, 2: false, 3: false, 4: false };
    const unlocked: Record<JamKbm, boolean> = { 1: true, 2: false, 3: false, 4: false };

    const dateSessions = absensiMapByDate[selectedDate];
    if (dateSessions) {
      ([1, 2, 3, 4] as JamKbm[]).forEach((j) => {
        if (dateSessions[j] && dateSessions[j].length > 0) {
          saved[j] = true;
        }
      });
    }

    if (saved[1]) unlocked[2] = true;
    if (saved[2]) unlocked[3] = true;
    if (saved[3]) unlocked[4] = true;

    return { savedJams: saved, unlockedJams: unlocked };
  }, [absensiMapByDate, selectedDate]);

  // Build the roster of teachers scheduled to teach for (dayNameIndo, selectedJam)
  const scheduledSessions: RecordSesiAbsensi[] = useMemo(() => {
    const hariKey = dayNameIndo.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
    const list: RecordSesiAbsensi[] = [];

    // Map asatidz lookup
    const asatidzMap = new Map<string, Asatidz>();
    asatidzList.forEach((a) => {
      asatidzMap.set(a.nama_asatidz.toUpperCase(), a);
      if (a.nia) asatidzMap.set(a.nia.toUpperCase(), a);
    });

    Object.values(jadwalMap).forEach((teacherRow) => {
      const teacherName = teacherRow.nama_asatidz;
      const dayStr = teacherRow[hariKey] || '';
      if (!dayStr) return;

      const lines = dayStr.split(';;').map((s) => s.trim()).filter(Boolean);
      lines.forEach((l) => {
        const parts = l.split('|').map((s) => s.trim());
        const jamNum = parseInt((parts[0] || '').replace(/\D/g, ''), 10) as JamKbm;
        const kelas = parts[1] || '';
        const fan = parts[2] || '';

        if (jamNum === selectedJam) {
          const aObj = asatidzMap.get(teacherName.toUpperCase());
          list.push({
            nia: aObj?.nia || '-',
            nama_asatidz: teacherName,
            kelas,
            fan,
            jam: selectedJam,
            status: 'Hadir', // Default Hadir
          });
        }
      });
    });

    return list.sort((a, b) => a.kelas.localeCompare(b.kelas));
  }, [jadwalMap, asatidzList, dayNameIndo, selectedJam]);

  // Sync scheduled sessions with already saved records
  useEffect(() => {
    const existing = absensiMapByDate[selectedDate]?.[selectedJam];
    if (existing && existing.length > 0) {
      setLocalRecords(existing);
    } else {
      setLocalRecords(scheduledSessions);
    }
  }, [absensiMapByDate, selectedDate, selectedJam, scheduledSessions]);

  const handleStatusChange = (index: number, newStatus: StatusAbsensi) => {
    setLocalRecords((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: newStatus };
      return copy;
    });
  };

  const handleBadalChange = (index: number, pengganti: string) => {
    setLocalRecords((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], asatidz_pengganti: pengganti };
      return copy;
    });
  };

  const handleSave = async () => {
    if (isLibur) {
      alert('Tidak dapat menyimpan presensi karena tanggal ini disetel sebagai HARI LIBUR.');
      return;
    }

    setIsSaving(true);
    const success = await saveSessionRecords(selectedDate, selectedJam, localRecords);
    setIsSaving(false);

    if (success) {
      alert(`Presensi Jam Ke-${selectedJam} berhasil disimpan!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Presensi 4 Jam */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-madin-50 text-madin-700 flex items-center justify-center shadow-xs">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Presensi KBM 4 Jam Asatidz</h1>
            <p className="text-xs text-slate-500">
              Sistem Presensi Berurutan Jam 1 s.d. Jam 4 ({dayNameIndo}, {selectedDate})
            </p>
          </div>
        </div>

        {/* Date Selector & Holiday Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold bg-transparent text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setShowModalLibur(true)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition ${
              isLibur
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isLibur ? 'Status: Libur' : 'Atur Hari Libur'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isLibur || !unlockedJams[selectedJam]}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : `Simpan Jam Ke-${selectedJam}`}</span>
          </button>
        </div>
      </div>

      {/* Holiday Banner if Date is Libur */}
      {isLibur && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800">
          <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
          <div className="text-xs">
            <h4 className="font-bold text-sm">Pemberitahuan Hari Libur Madrasah</h4>
            <p>
              Tanggal {selectedDate} disetel sebagai: <strong>{holidayInfo?.kategori}</strong>
              {holidayInfo?.keterangan ? ` (${holidayInfo.keterangan})` : ''}.
              Kegiatan belajar mengajar ditiadakan dan input presensi dinonaktifkan.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Jam 1, Jam 2, Jam 3, Jam 4 with Sequential Lock Indicator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([1, 2, 3, 4] as JamKbm[]).map((j) => {
          const isActive = selectedJam === j;
          const isUnlocked = unlockedJams[j];
          const isSaved = savedJams[j];

          return (
            <button
              key={j}
              disabled={!isUnlocked}
              onClick={() => setSelectedJam(j)}
              className={`p-4 rounded-xl border text-left transition flex items-center justify-between ${
                isActive
                  ? 'bg-madin-700 text-white border-madin-700 shadow-md ring-2 ring-madin-500/20'
                  : isUnlocked
                  ? 'bg-white text-slate-700 border-slate-200 hover:border-madin-300'
                  : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
              }`}
            >
              <div>
                <p className="text-[11px] opacity-80 uppercase font-semibold">
                  {j <= 2 ? 'Madin Sore (MS)' : 'Madin Malam (MB)'}
                </p>
                <p className="text-base font-bold">Jam Ke-{j}</p>
                <span className="text-[10px] block mt-0.5">
                  {isSaved ? '✓ Tersimpan Resmi' : isUnlocked ? 'Siap Diisi' : 'Terkunci'}
                </span>
              </div>

              <div>
                {isUnlocked ? (
                  isSaved ? (
                    <CheckCircle2 className={`w-5 h-5 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                  ) : (
                    <Unlock className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  )
                ) : (
                  <Lock className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Matriks Presensi Jam Aktif */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h2 className="font-bold text-slate-800 text-sm">
              Daftar Jadwal Mengajar Jam Ke-{selectedJam} ({localRecords.length} Asatidz Terjadwal)
            </h2>
            <p className="text-xs text-slate-400">
              Pilih status kehadiran untuk masing-masing pengajar sebelum menekan tombol simpan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Hadir
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Izin
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Sakit
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Alfa
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> Badal
            </span>
          </div>
        </div>

        {/* Tabel Pengajar Jam Ke-X */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
              <tr>
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">Nama Asatidz</th>
                <th className="p-3">NIA</th>
                <th className="p-3">Kelas & Fan Pelajaran</th>
                <th className="p-3 text-center">Status Kehadiran</th>
                <th className="p-3">Catatan / Asatidz Pengganti (Badal)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {localRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    Tidak ada jadwal mengajar yang terdaftar untuk Jam Ke-{selectedJam} pada hari {dayNameIndo}.
                  </td>
                </tr>
              ) : (
                localRecords.map((item, idx) => (
                  <tr key={`${item.nama_asatidz}-${item.kelas}-${idx}`} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">
                      {item.nama_asatidz}
                    </td>
                    <td className="p-3 font-mono text-slate-500">{item.nia}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{item.kelas}</span>
                      <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                        {item.fan}
                      </span>
                    </td>

                    {/* Status Buttons */}
                    <td className="p-3 text-center">
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 gap-1">
                        {STATUS_LIST.map((st) => {
                          const isSel = item.status === st;
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(idx, st)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                                isSel
                                  ? st === 'Hadir'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : st === 'Izin'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : st === 'Sakit'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : st === 'Alfa'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : st === 'Badal'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Input Badal */}
                    <td className="p-3">
                      {item.status === 'Badal' ? (
                        <input
                          type="text"
                          value={item.asatidz_pengganti || ''}
                          onChange={(e) => handleBadalChange(idx, e.target.value)}
                          placeholder="Nama Ustadz Badal / Pengganti..."
                          className="w-full text-xs py-1 px-2.5 rounded border border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-600 bg-purple-50/50"
                        />
                      ) : (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalAturLibur
        isOpen={showModalLibur}
        onClose={() => setShowModalLibur(false)}
        targetDate={selectedDate}
      />
    </div>
  );
}
