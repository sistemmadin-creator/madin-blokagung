'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useJadwalStore, HariKbm } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { JamKbm, RecordSesiAbsensi, StatusAbsensi } from '@/types/absensi';
import { Asatidz } from '@/types/asatidz';
import { Zap, CheckCheck, Save, Search } from 'lucide-react';

const STATUS_OPTIONS: StatusAbsensi[] = ['Hadir', 'Izin', 'Sakit', 'Alfa', 'Badal'];

export default function AbsenCepatPage() {
  const {
    absensiMapByDate,
    selectedDate,
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

  // Mark all Hadir in a specific blok
  const handleMarkAllHadirInBlok = (blokName: string) => {
    setLocalRecords((prev) =>
      prev.map((r) => (r.blok === blokName ? { ...r, status: 'Hadir' } : r))
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
      alert(`Absen cepat Jam Ke-${selectedJam} berhasil disimpan!`);
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
        r.kamar.toLowerCase().includes(q);
      return matchBlok && matchSearch;
    });
  }, [localRecords, selectedBlokFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-xs">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Mode Absen Cepat (Piket Lapangan)</h1>
            <p className="text-xs text-slate-500">
              Presensi Kartu Cepat Per Blok Asrama (Jam Ke-{selectedJam}, {dayNameIndo})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Jam Selector Tabs */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {([1, 2, 3, 4] as JamKbm[]).map((j) => (
              <button
                key={j}
                onClick={() => setSelectedJam(j)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  selectedJam === j
                    ? 'bg-madin-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jam {j}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || localRecords.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Presensi Cepat'}</span>
          </button>
        </div>
      </div>

      {/* Filter Blok & Bar Pencarian */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedBlokFilter('SEMUA')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
              selectedBlokFilter === 'SEMUA'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Semua Blok ({localRecords.length})
          </button>

          {distinctBloks.map((blok) => {
            const count = localRecords.filter((r) => r.blok === blok).length;
            return (
              <button
                key={blok}
                onClick={() => setSelectedBlokFilter(blok)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  selectedBlokFilter === blok
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {blok} ({count})
              </button>
            );
          })}

          {selectedBlokFilter !== 'SEMUA' && (
            <button
              onClick={() => handleMarkAllHadirInBlok(selectedBlokFilter)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 whitespace-nowrap transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Semua Hadir ({selectedBlokFilter})</span>
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ustadz, kamar..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Grid Kartu Cepat Responsif (3 Kolom Desktop / 1 Kolom Mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCards.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            Tidak ada asatidz yang bertugas pada Jam Ke-{selectedJam} di blok ini.
          </div>
        ) : (
          filteredCards.map((card, idx) => {
            const originalIndex = localRecords.findIndex(
              (r) => r.nama_asatidz === card.nama_asatidz && r.kelas === card.kelas
            );

            return (
              <div
                key={`${card.nama_asatidz}-${card.kelas}-${idx}`}
                className={`bg-white rounded-xl border p-4 space-y-3 shadow-2xs transition ${
                  card.status === 'Hadir'
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : card.status === 'Alfa'
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Header Kartu */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">
                      {card.nama_asatidz}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      NIA: {card.nia} | {card.blok} ({card.kamar})
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      card.status === 'Hadir'
                        ? 'bg-emerald-100 text-emerald-800'
                        : card.status === 'Izin'
                        ? 'bg-amber-100 text-amber-800'
                        : card.status === 'Sakit'
                        ? 'bg-blue-100 text-blue-800'
                        : card.status === 'Alfa'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {card.status}
                  </span>
                </div>

                {/* Info Kelas & Fan */}
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{card.kelas}</span>
                  <span className="font-medium text-slate-500">{card.fan}</span>
                </div>

                {/* Tombol Aksi Status Cepat */}
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {STATUS_OPTIONS.map((st) => {
                    const isSelected = card.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusClick(originalIndex, st)}
                        className={`py-1 text-[11px] font-semibold rounded transition text-center ${
                          isSelected
                            ? st === 'Hadir'
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : st === 'Izin'
                              ? 'bg-amber-600 text-white font-bold shadow-xs'
                              : st === 'Sakit'
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : st === 'Alfa'
                              ? 'bg-rose-600 text-white font-bold shadow-xs'
                              : 'bg-purple-600 text-white font-bold shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {st}
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
