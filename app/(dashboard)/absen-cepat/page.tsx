'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useJadwalStore, HariKbm } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { JamKbm, RecordSesiAbsensi, StatusAbsensi } from '@/types/absensi';
import { Asatidz } from '@/types/asatidz';
import { Zap, Bell, CheckCheck, Save, Search } from 'lucide-react';

const STATUS_OPTIONS: { status: StatusAbsensi; label: string; color: string; activeColor: string }[] = [
  { status: 'Hadir', label: 'Hadir', color: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50', activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-xs' },
  { status: 'Izin', label: 'Izin', color: 'border-blue-300 text-blue-700 hover:bg-blue-50', activeColor: 'bg-blue-600 text-white border-blue-600 shadow-xs' },
  { status: 'Sakit', label: 'Sakit', color: 'border-amber-300 text-amber-700 hover:bg-amber-50', activeColor: 'bg-amber-500 text-white border-amber-500 shadow-xs' },
  { status: 'Alfa', label: 'Alfa', color: 'border-rose-300 text-rose-700 hover:bg-rose-50', activeColor: 'bg-rose-600 text-white border-rose-600 shadow-xs' },
  { status: 'Badal', label: 'Badal', color: 'border-purple-300 text-purple-700 hover:bg-purple-50', activeColor: 'bg-purple-600 text-white border-purple-600 shadow-xs' },
];

export default function AbsenCepatPage() {
  const {
    absensiMapByDate,
    selectedDate,
    setSelectedDate,
    selectedJam,
    setSelectedJam,
    fetchAbsensi,
    saveSessionRecords,
  } = useAbsensiStore();

  const { jadwalMap, fetchJadwal } = useJadwalStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [localRecords, setLocalRecords] = useState<(RecordSesiAbsensi & { blok: string; kamar: string })[]>([]);
  const [selectedBlokFilter, setSelectedBlokFilter] = useState('SEMUA');
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAbsensi();
    fetchJadwal();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchAbsensi, fetchJadwal, fetchAsatidz, asatidzList.length]);

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
      5: 'Sabtu',
      6: 'Sabtu',
    };
    return map[dayIndex] || 'Sabtu';
  }, [selectedDate]);

  // Extract schedule for (dayNameIndo, selectedJam)
  const scheduledSessions = useMemo(() => {
    const hariKey = dayNameIndo.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
    const list: (RecordSesiAbsensi & { blok: string; kamar: string })[] = [];

    const asatidzMap = new Map<string, Asatidz>();
    asatidzList.forEach((a) => {
      asatidzMap.set(a.nama_asatidz.toUpperCase(), a);
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
            status: 'Hadir',
            blok: aObj?.blok ? `Blok ${aObj.blok}` : 'Blok Belum Diatur',
            kamar: aObj?.kamar || '-',
          });
        }
      });
    });

    return list;
  }, [jadwalMap, asatidzList, dayNameIndo, selectedJam]);

  // Sync with stored session
  useEffect(() => {
    const existing = absensiMapByDate[selectedDate]?.[selectedJam];
    if (existing && existing.length > 0) {
      const asatidzMap = new Map<string, Asatidz>();
      asatidzList.forEach((a) => asatidzMap.set(a.nama_asatidz.toUpperCase(), a));

      const enriched = existing.map((r) => {
        const aObj = asatidzMap.get(r.nama_asatidz.toUpperCase());
        return {
          ...r,
          blok: aObj?.blok ? `Blok ${aObj.blok}` : 'Blok Belum Diatur',
          kamar: aObj?.kamar || '-',
        };
      });
      setLocalRecords(enriched);
    } else {
      setLocalRecords(scheduledSessions);
    }
  }, [absensiMapByDate, selectedDate, selectedJam, scheduledSessions, asatidzList]);

  // Extract distinct bloks
  const distinctBloks = useMemo(() => {
    const set = new Set<string>();
    localRecords.forEach((r) => set.add(r.blok));
    return Array.from(set).sort();
  }, [localRecords]);

  // Handle status click
  const handleStatusClick = (index: number, status: StatusAbsensi) => {
    setLocalRecords((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status };
      return copy;
    });
  };

  // Mark all Hadir in a specific blok or all
  const handleMarkAllHadir = (blokName?: string) => {
    setLocalRecords((prev) =>
      prev.map((r) => (!blokName || r.blok === blokName ? { ...r, status: 'Hadir' } : r))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    const cleanRecords: RecordSesiAbsensi[] = localRecords.map((r) => ({
      nia: r.nia,
      nama_asatidz: r.nama_asatidz,
      kelas: r.kelas,
      fan: r.fan,
      jam: r.jam,
      status: r.status,
      keterangan: r.keterangan,
      asatidz_pengganti: r.asatidz_pengganti,
    }));
    const success = await saveSessionRecords(selectedDate, selectedJam, cleanRecords);
    setIsSaving(false);

    if (success) {
      alert(`Absen Cepat Jam Ke-${selectedJam} berhasil disimpan!`);
    }
  };

  // Filtered
  const filteredCards = useMemo(() => {
    return localRecords.filter((r) => {
      const matchBlok = selectedBlokFilter === 'SEMUA' || r.blok === selectedBlokFilter;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.nama_asatidz.toLowerCase().includes(q) ||
        r.nia.toLowerCase().includes(q) ||
        r.kelas.toLowerCase().includes(q) ||
        r.kamar.toLowerCase().includes(q) ||
        r.fan.toLowerCase().includes(q);
      return matchBlok && matchSearch;
    });
  }, [localRecords, selectedBlokFilter, search]);

  return (
    <div className="space-y-4">
      {/* Header Halaman (Identik dengan absen-cepat.html) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs text-emerald-700 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 fill-emerald-600 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 m-0">Absen Cepat</h1>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Mode absensi ringkas — 100% sinkron dengan Absensi Asatidz
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 shadow-xs focus:ring-1 focus:ring-[#0f766e] focus:outline-none"
          />
          <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 py-1.5 px-3 rounded-lg text-xs font-bold shadow-2xs">
            {dayNameIndo}
          </span>
          <button
            type="button"
            onClick={() => alert('Fitur notifikasi blok pengguna aktif.')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100 transition shadow-2xs"
            title="Notifikasi Status Absen Blok Pengguna"
          >
            <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Notif</span>
          </button>
        </div>
      </div>

      {/* Tab Sesi Jam (1, 2, 3, 4) */}
      <div className="flex items-center gap-2">
        {([1, 2, 3, 4] as JamKbm[]).map((j) => {
          const isActive = selectedJam === j;
          return (
            <button
              key={j}
              type="button"
              onClick={() => setSelectedJam(j)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition border ${
                isActive
                  ? 'bg-[#0f766e] text-white border-[#0f766e] shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Jam {j}
            </button>
          );
        })}
      </div>

      {/* Header Kontrol & Aksi Massal */}
      <div className="card-panel border-0 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMarkAllHadir()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Hadirkan Semua (Jam {selectedJam})</span>
          </button>
          <span className="text-xs text-slate-500">
            Total Sesi: <b className="text-slate-800">{localRecords.length}</b>
          </span>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || localRecords.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white shadow-xs transition disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Presensi Cepat'}</span>
        </button>
      </div>

      {/* Bar Filter & Pencarian */}
      <div className="card-panel border-0 bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Pills Blok */}
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedBlokFilter('SEMUA')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              selectedBlokFilter === 'SEMUA'
                ? 'bg-[#0f766e] text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Semua ({localRecords.length})
          </button>
          {distinctBloks.map((b) => {
            const count = localRecords.filter((r) => r.blok === b).length;
            const isSelected = selectedBlokFilter === b;
            return (
              <button
                key={b}
                onClick={() => setSelectedBlokFilter(b)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#0f766e] text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {b} ({count})
              </button>
            );
          })}
        </div>

        {/* Input Pencarian */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Asatidz / Fan / Kelas..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
          />
        </div>
      </div>

      {/* Grid Kartu Pengajar Berkelompok per Blok */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCards.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300 text-xs">
            Tidak ada jadwal mengajar pada Jam {selectedJam} untuk filter yang dipilih.
          </div>
        ) : (
          filteredCards.map((record, idx) => {
            const globalIndex = localRecords.findIndex(
              (r) => r.nama_asatidz === record.nama_asatidz && r.kelas === record.kelas && r.jam === record.jam
            );

            return (
              <div
                key={`${record.nama_asatidz}-${record.kelas}-${idx}`}
                className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs hover:border-emerald-300 transition flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {record.nama_asatidz}
                    </h3>
                    <span className="badge bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {record.nia}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mb-2">
                    <span className="badge bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[11px]">
                      {record.kelas}
                    </span>
                    <span className="font-semibold text-slate-700">{record.fan}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-[11px] text-slate-500">{record.blok} ({record.kamar})</span>
                  </div>
                </div>

                {/* Status Selector Buttons */}
                <div className="grid grid-cols-5 gap-1 pt-2 border-t border-slate-100">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = record.status === opt.status;
                    return (
                      <button
                        key={opt.status}
                        type="button"
                        onClick={() => handleStatusClick(globalIndex >= 0 ? globalIndex : idx, opt.status)}
                        className={`py-1 text-[11px] font-bold rounded border transition text-center ${
                          isSelected ? opt.activeColor : opt.color
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
