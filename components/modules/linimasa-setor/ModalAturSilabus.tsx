'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useKalenderStore } from '@/stores/useKalenderStore';
import { getDaftarTingkatKelasDiniyyah } from '@/lib/utils/setoranHelper';
import {
  SilabusConfigMap,
  SilabusHolidayEntry,
  SilabusItemRule,
  SilabusNumericMode,
} from '@/types/setoran';
import {
  ACADEMIC_MONTHS_LIST,
  computeDisplayOffsetsForRules,
  computeNumericRuleSchedule,
  syncSilabusRulesWithConfig,
} from '@/lib/utils/silabusHelper';
import { getAcademicYearMonths } from '@/lib/utils/sundayHelper';
import {
  BookOpen,
  Save,
  Copy,
  Info,
  CheckCircle2,
  ArrowRight,
  CalendarOff,
  CalendarCheck2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  Hash,
} from 'lucide-react';

export const ACADEMIC_MONTHS = ACADEMIC_MONTHS_LIST;

interface ModalAturSilabusProps {
  isOpen: boolean;
  onClose: () => void;
  startYear?: number;
}

export default function ModalAturSilabus({
  isOpen,
  onClose,
  startYear = 2026,
}: ModalAturSilabusProps) {
  const {
    config,
    silabusConfig,
    silabusHolidays,
    saveSilabusConfig,
    saveSilabusHolidays,
  } = useMuhafadzohStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { santriList, fetchSantri } = useSantriStore();
  const { agendaMapByTA, fetchKalenderData } = useKalenderStore();

  const taKey = `${startYear}/${startYear + 1}`;

  // Sub-tab utama modal: Materi & Target vs Liburan Global
  const [modalSection, setModalSection] = useState<'materi' | 'liburan'>('materi');

  // Tab filter tingkat (Semua, ULA, WUSTHO, ULYA, ISTI'DAD)
  const [activeTab, setActiveTab] = useState<'semua' | 'ULA' | 'WUSTHO' | 'ULYA' | "ISTI'DAD">('semua');
  const [localSilabus, setLocalSilabus] = useState<SilabusConfigMap>({});
  const [localHolidaysTA, setLocalHolidaysTA] = useState<Record<string, SilabusHolidayEntry>>({});
  const [defaultHolidayLabel, setDefaultHolidayLabel] = useState<string>('LIBURAN');
  const [copySource, setCopySource] = useState<Record<string, string>>({});
  const [expandedWeeklyKey, setExpandedWeeklyKey] = useState<string | null>(null);
  const [isSyncingCal, setIsSyncingCal] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const academicMonths = useMemo(() => getAcademicYearMonths(startYear), [startYear]);

  useEffect(() => {
    if (isOpen) {
      if (formasiList.length === 0) fetchFormasi();
      if (santriList.length === 0) fetchSantri();
    }
  }, [isOpen, formasiList.length, santriList.length, fetchFormasi, fetchSantri]);

  const pairs = useMemo(() => {
    return getDaftarTingkatKelasDiniyyah(formasiList, santriList);
  }, [formasiList, santriList]);

  const hasIstidad = useMemo(
    () => pairs.some((p) => p.tk.toUpperCase().includes('ISTI')),
    [pairs]
  );

  // Inisialisasi localSilabus & localHolidaysTA saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const nextMap: SilabusConfigMap = { ...(silabusConfig || {}) };

      pairs.forEach((p) => {
        nextMap[p.key] = syncSilabusRulesWithConfig(
          nextMap[p.key] || [],
          config,
          p.key
        );
      });

      setLocalSilabus(nextMap);
      setLocalHolidaysTA({ ...(silabusHolidays?.[taKey] || {}) });
      setExpandedWeeklyKey(null);
      setSyncMessage(null);
      setSaveSuccess(false);
      setModalSection('materi');
    }
  }, [isOpen, pairs, config, silabusConfig, silabusHolidays, taKey]);

  const updateRule = (
    pairKey: string,
    materiIdx: number,
    updater: (rule: SilabusItemRule) => SilabusItemRule
  ) => {
    setLocalSilabus((prev) => {
      const currentList = [...(prev[pairKey] || [])];
      if (!currentList[materiIdx]) return prev;
      currentList[materiIdx] = updater({ ...currentList[materiIdx] });
      return {
        ...prev,
        [pairKey]: currentList,
      };
    });
  };

  // Update bulan untuk item tertentu
  const handleMonthChange = (
    pairKey: string,
    materiIdx: number,
    field: 'dari' | 'sampai',
    newIndex: number
  ) => {
    updateRule(pairKey, materiIdx, (rule) => {
      if (field === 'dari') {
        rule.dari_bulan_index = newIndex;
        rule.dari_bulan_nama = ACADEMIC_MONTHS[newIndex]?.name || 'Juli';
        if (rule.sampai_bulan_index < newIndex) {
          rule.sampai_bulan_index = newIndex;
          rule.sampai_bulan_nama = ACADEMIC_MONTHS[newIndex]?.name || 'Juli';
        }
      } else {
        rule.sampai_bulan_index = newIndex;
        rule.sampai_bulan_nama = ACADEMIC_MONTHS[newIndex]?.name || 'Juni';
        if (rule.dari_bulan_index > newIndex) {
          rule.dari_bulan_index = newIndex;
          rule.dari_bulan_nama = ACADEMIC_MONTHS[newIndex]?.name || 'Juli';
        }
      }
      return rule;
    });
  };

  // Salin silabus dari kelas lain
  const handleCopyFromClass = (targetKey: string, sourceKey: string) => {
    if (!sourceKey || !localSilabus[sourceKey]) return;
    const srcRules = localSilabus[sourceKey];
    setLocalSilabus((prev) => ({
      ...prev,
      [targetKey]: JSON.parse(JSON.stringify(srcRules)),
    }));
  };

  // Toggle satu hari Minggu sebagai LIBURAN
  const handleToggleHolidaySunday = (isoDate: string) => {
    setLocalHolidaysTA((prev) => {
      const next = { ...prev };
      if (next[isoDate]) {
        delete next[isoDate];
      } else {
        next[isoDate] = {
          label: defaultHolidayLabel.trim() || 'LIBURAN',
          source: 'manual',
        };
      }
      return next;
    });
  };

  // Toggle seluruh hari Minggu pada 1 bulan sebagai LIBURAN / Aktif
  const handleToggleHolidayMonth = (monthSundays: Array<{ tanggal: string }>) => {
    const allHoliday =
      monthSundays.length > 0 && monthSundays.every((s) => Boolean(localHolidaysTA[s.tanggal]));

    setLocalHolidaysTA((prev) => {
      const next = { ...prev };
      monthSundays.forEach((s) => {
        if (allHoliday) {
          delete next[s.tanggal];
        } else {
          next[s.tanggal] = {
            label: defaultHolidayLabel.trim() || 'LIBURAN',
            source: 'manual',
          };
        }
      });
      return next;
    });
  };

  // Sinkronkan hari Minggu libur dari Kalender Kegiatan
  const handleSyncFromKalender = async () => {
    setIsSyncingCal(true);
    setSyncMessage(null);
    try {
      await fetchKalenderData();
      const latestMap =
        useKalenderStore.getState().agendaMapByTA?.[taKey] || agendaMapByTA?.[taKey] || {};
      let addedCount = 0;

      setLocalHolidaysTA((prev) => {
        const next = { ...prev };
        academicMonths.forEach((m) => {
          m.sundays.forEach((sun) => {
            const agenda = latestMap[sun.tanggal];
            if (agenda && agenda.isLiburKbm) {
              if (!next[sun.tanggal]) addedCount++;
              next[sun.tanggal] = {
                label: defaultHolidayLabel.trim() || 'LIBURAN',
                source: 'kalender',
              };
            }
          });
        });
        return next;
      });

      setSyncMessage(
        addedCount > 0
          ? `${addedCount} minggu libur dari Kalender Kegiatan (${taKey}) berhasil ditandai.`
          : `Tidak ada hari Minggu tambahan berstatus libur KBM di Kalender Kegiatan (${taKey}).`
      );
    } finally {
      setIsSyncingCal(false);
    }
  };

  // Simpan konfigurasi silabus & liburan
  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const okSilabus = await saveSilabusConfig(localSilabus);
      const nextHolidaysPayload = {
        ...(silabusHolidays || {}),
        [taKey]: localHolidaysTA,
      };
      const okHolidays = await saveSilabusHolidays(nextHolidaysPayload);

      if (okSilabus && okHolidays) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 700);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPairs = useMemo(() => {
    if (activeTab === 'semua') return pairs;
    return pairs.filter((p) => p.tk.toUpperCase() === activeTab);
  }, [pairs, activeTab]);

  const totalHolidaysCount = Object.keys(localHolidaysTA).length;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Atur Silabus Target Hafalan Santri"
      maxWidth="4xl"
      headerActions={
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
            TA {startYear} / {startYear + 1}
          </span>
        </div>
      }
    >
      <div className="flex flex-col h-[78vh]">
        {/* Banner Penjelasan & Switch Sub-Tab */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-slate-800">Petunjuk Silabus Target: </span>
              Atur kolom <b>Dari Bulan</b>, <b>Sampai Bulan</b>, serta target mingguan untuk materi angka (Nadzom/Bait/Baris){' '}
              <span className="text-emerald-700 font-semibold">(Wajib &amp; Sunnah)</span> per tingkat/kelas, dan tentukan minggu <b>Liburan</b>.
              Hasil input ini menentukan jadwal di tab <b>Silabus</b> dan warna stabilo baris santri di Linimasa Setor:
              <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                Merah
              </span>
              (melewati batas bulan atau tertinggal target mingguan),
              <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                Kuning
              </span>
              (sesuai target di bulan capaian), dan
              <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                Putih
              </span>
              (aman / tuntas / belum masuk jadwal).
            </div>
          </div>

          {/* Sub-Tab Utama Modal + Filter Jenjang */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {/* Switch Section: Materi & Target vs Pengaturan Liburan */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 border border-slate-300/60 gap-1 self-start">
              <button
                type="button"
                onClick={() => setModalSection('materi')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modalSection === 'materi'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Materi &amp; Target</span>
              </button>
              <button
                type="button"
                onClick={() => setModalSection('liburan')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  modalSection === 'liburan'
                    ? 'bg-white text-rose-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarOff className="w-3.5 h-3.5" />
                <span>Pengaturan Liburan</span>
                {totalHolidaysCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-mono">
                    {totalHolidaysCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Jenjang (tampil saat di section Materi) */}
            {modalSection === 'materi' && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {[
                  { id: 'semua', label: `Semua Kelas (${pairs.length})` },
                  { id: 'ULA', label: 'Tingkat ULA' },
                  { id: 'WUSTHO', label: 'Tingkat WUSTHO' },
                  { id: 'ULYA', label: 'Tingkat ULYA' },
                  ...(hasIstidad ? [{ id: "ISTI'DAD", label: "Tingkat ISTI'DAD" }] : []),
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/50">
          {modalSection === 'liburan' ? (
            /* SECTION 2: PENGATURAN LIBURAN GLOBAL PER TAHUN AJARAN */
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Kalender Liburan Silabus (Berlaku Global Semua Kelas TA {taKey})
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Klik minggu atau tombol satu bulan untuk menandai <b>LIBURAN</b>. Minggu liburan dilewati dalam perhitungan target bait/baris mingguan.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSyncFromKalender}
                      disabled={isSyncingCal}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCal ? 'animate-spin' : ''}`} />
                      <span>Sinkronkan Kalender Kegiatan</span>
                    </button>

                    {totalHolidaysCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setLocalHolidaysTA({})}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Kosongkan ({totalHolidaysCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Label Default Liburan */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-100">
                  <label
                    htmlFor="silabus-holiday-label"
                    className="text-xs font-bold text-slate-700"
                  >
                    Teks Keterangan Liburan:
                  </label>
                  <input
                    id="silabus-holiday-label"
                    type="text"
                    value={defaultHolidayLabel}
                    onChange={(e) => setDefaultHolidayLabel(e.target.value)}
                    placeholder="LIBURAN"
                    className="w-full sm:w-56 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                  <span className="text-[11px] text-slate-500">
                    Dipakai saat menandai minggu/bulan liburan baru (default: LIBURAN).
                  </span>
                </div>

                {syncMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
                    {syncMessage}
                  </div>
                )}
              </div>

              {/* Grid 12 Bulan Akademik dengan Minggu Kalender Riil (4 atau 5 Minggu) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {academicMonths.map((m) => {
                  const holidayCountInMonth = m.sundays.filter(
                    (s) => Boolean(localHolidaysTA[s.tanggal])
                  ).length;
                  const allHoliday =
                    m.sundays.length > 0 && holidayCountInMonth === m.sundays.length;

                  return (
                    <div
                      key={m.key}
                      className={`rounded-2xl border p-3.5 space-y-2.5 transition-colors ${
                        allHoliday
                          ? 'bg-rose-50/70 border-rose-300'
                          : holidayCountInMonth > 0
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                            {m.monthName} {m.year}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {m.semester} · {m.sundays.length} Minggu Kalender
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleHolidayMonth(m.sundays)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                            allHoliday
                              ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200'
                          }`}
                        >
                          {allHoliday ? 'Aktifkan Bulan' : 'Liburkan Sebulan'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {m.sundays.map((sun) => {
                          const hol = localHolidaysTA[sun.tanggal];
                          const isHol = Boolean(hol);
                          const mm = sun.tanggal.split('-')[1] || '';
                          const dd = String(sun.dayNumber).padStart(2, '0');

                          return (
                            <button
                              key={sun.tanggal}
                              type="button"
                              onClick={() => handleToggleHolidaySunday(sun.tanggal)}
                              className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-left transition flex items-center justify-between gap-1 cursor-pointer ${
                                isHol
                                  ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-200'
                              }`}
                            >
                              <div>
                                <div className="text-[11px] font-bold">M{sun.mingguKe}</div>
                                <div className="text-[10px] font-mono opacity-80">
                                  {dd}/{mm}
                                </div>
                              </div>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  isHol
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-white text-emerald-700 border border-slate-200'
                                }`}
                              >
                                {isHol ? hol.label.slice(0, 7) : 'Aktif'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Tidak ada data kelas yang sesuai dengan filter.
            </div>
          ) : (
            /* SECTION 1: DAFTAR KELAS & MATERI SILABUS */
            filteredPairs.map((pair) => {
              const rules = localSilabus[pair.key] || [];
              const offsets = computeDisplayOffsetsForRules(
                rules,
                academicMonths,
                localHolidaysTA
              );

              return (
                <div
                  key={pair.key}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Header Kartu Kelas */}
                  <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-slate-900 text-sm">
                        {pair.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {rules.length} Materi Hafalan
                      </span>
                    </div>

                    {/* Salin dari kelas lain */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={copySource[pair.key] || ''}
                        onChange={(e) => {
                          const src = e.target.value;
                          setCopySource((prev) => ({ ...prev, [pair.key]: src }));
                          if (src) handleCopyFromClass(pair.key, src);
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 text-xs font-semibold focus:outline-none focus:border-emerald-600 cursor-pointer"
                      >
                        <option value="">Salin silabus dari kelas...</option>
                        {pairs
                          .filter((p) => p.key !== pair.key)
                          .map((p) => (
                            <option key={p.key} value={p.key}>
                              {p.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Body Kartu */}
                  {rules.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      Belum ada materi Hafalan Wajib / Sunnah yang dikonfigurasi pada jenjang {pair.label}.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {rules.map((rule, rIdx) => {
                        const durasiBulan =
                          Math.max(0, rule.sampai_bulan_index - rule.dari_bulan_index) + 1;
                        const isNumeric = rule.target_type === 'numeric';
                        const ruleRowKey = `${pair.key}_${rule.materi_nama}_${rIdx}`;
                        const isExpandedWeekly = expandedWeeklyKey === ruleRowKey;
                        const currentOffset = offsets[rIdx] || 0;
                        const hasPrevNumeric = rules
                          .slice(0, rIdx)
                          .some((r) => r.target_type === 'numeric');

                        const numericSchedule = isNumeric
                          ? computeNumericRuleSchedule(
                              rule,
                              academicMonths,
                              localHolidaysTA,
                              currentOffset
                            )
                          : null;

                        // Hitung minggu aktif & libur untuk kalimat juga
                        let activeWeekCount = 0;
                        let holidayWeekCount = 0;
                        for (
                          let mI = rule.dari_bulan_index;
                          mI <= rule.sampai_bulan_index;
                          mI++
                        ) {
                          const mInfo = academicMonths[mI];
                          if (!mInfo) continue;
                          mInfo.sundays.forEach((s) => {
                            if (localHolidaysTA[s.tanggal]) holidayWeekCount++;
                            else activeWeekCount++;
                          });
                        }

                        const needsSentenceConfig =
                          !isNumeric &&
                          (rule.target_preview || '').startsWith('0 ');

                        return (
                          <div
                            key={ruleRowKey}
                            className="p-3.5 sm:px-4 space-y-3 hover:bg-slate-50/60 transition-colors"
                          >
                            {/* Baris Utama: Info Materi + Dari Bulan s/d Sampai Bulan */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                              <div className="space-y-1 min-w-[220px] max-w-md">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                      rule.kategori === 'Wajib'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                    }`}
                                  >
                                    {rule.kategori}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {isNumeric ? 'Angka / Nadzom' : 'Kalimat'}
                                  </span>
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                    {rule.materi_nama}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-2">
                                  <span>Target: {rule.target_preview || 'Standard'}</span>
                                  {needsSentenceConfig && (
                                    <span className="text-amber-700 font-semibold">
                                      (Lengkapi daftar kalimat di Pengaturan Item Hafalan)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Kontrol Dari Bulan & Sampai Bulan */}
                              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                                  <span className="text-[11px] font-semibold text-slate-500 px-1">
                                    Dari:
                                  </span>
                                  <select
                                    value={rule.dari_bulan_index}
                                    onChange={(e) =>
                                      handleMonthChange(
                                        pair.key,
                                        rIdx,
                                        'dari',
                                        parseInt(e.target.value, 10)
                                      )
                                    }
                                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs"
                                  >
                                    {ACADEMIC_MONTHS.map((m) => (
                                      <option key={m.index} value={m.index}>
                                        {m.name} ({m.semester})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />

                                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                                  <span className="text-[11px] font-semibold text-slate-500 px-1">
                                    Sampai:
                                  </span>
                                  <select
                                    value={rule.sampai_bulan_index}
                                    onChange={(e) =>
                                      handleMonthChange(
                                        pair.key,
                                        rIdx,
                                        'sampai',
                                        parseInt(e.target.value, 10)
                                      )
                                    }
                                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-600 cursor-pointer shadow-2xs"
                                  >
                                    {ACADEMIC_MONTHS.map((m) => (
                                      <option key={m.index} value={m.index}>
                                        {m.name} ({m.semester})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 whitespace-nowrap">
                                  {durasiBulan} Bln · {activeWeekCount} Mg Aktif
                                  {holidayWeekCount > 0 ? ` (${holidayWeekCount} Libur)` : ''}
                                </span>
                              </div>
                            </div>

                            {/* Panel Khusus Target Angka / Nadzom / Bait / Baris (Gambar 4) */}
                            {isNumeric && numericSchedule && (
                              <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                                    <Hash className="w-3.5 h-3.5 text-blue-700" />
                                    <span>Pengaturan Target Mingguan (Nadzom / Bait / Baris)</span>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                        numericSchedule.isSufficient
                                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                          : 'bg-amber-100 text-amber-900 border-amber-300'
                                      }`}
                                    >
                                      {numericSchedule.isSufficient
                                        ? `Tuntas s.d. ${numericSchedule.plannedEndDisplay} (${numericSchedule.activeSundaysCount} Mg Aktif)`
                                        : `Kurang ${numericSchedule.shortfall} dari target (${numericSchedule.plannedEndRel}/${numericSchedule.totalSpan})`}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedWeeklyKey(
                                          isExpandedWeekly ? null : ruleRowKey
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-800 hover:bg-blue-50 text-[11px] font-bold cursor-pointer"
                                    >
                                      <span>
                                        {isExpandedWeekly
                                          ? 'Tutup Rincian'
                                          : 'Rincian Mingguan'}
                                      </span>
                                      {isExpandedWeekly ? (
                                        <ChevronUp className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {/* Baris Kontrol Input Numeric */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                                  {/* Mode Perhitungan */}
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                      Mode Target Mingguan
                                    </label>
                                    <select
                                      value={rule.numeric_mode || 'auto_even'}
                                      onChange={(e) =>
                                        updateRule(pair.key, rIdx, (r) => ({
                                          ...r,
                                          numeric_mode: e.target.value as SilabusNumericMode,
                                        }))
                                      }
                                      className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                                    >
                                      <option value="auto_even">Bagi Rata Otomatis</option>
                                      <option value="fixed_increment">Tetap per Minggu</option>
                                      <option value="manual">Edit Manual per Minggu</option>
                                    </select>
                                  </div>

                                  {/* Nominal per Minggu (jika fixed_increment) */}
                                  {rule.numeric_mode === 'fixed_increment' ? (
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                        Target Setor / Minggu
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={rule.increment_per_minggu ?? 20}
                                        onChange={(e) =>
                                          updateRule(pair.key, rIdx, (r) => ({
                                            ...r,
                                            increment_per_minggu: Math.max(
                                              1,
                                              parseInt(e.target.value, 10) || 1
                                            ),
                                          }))
                                        }
                                        className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-emerald-900 focus:outline-none focus:border-emerald-600"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                        Estimasi Rata-rata / Mg
                                      </label>
                                      <div className="h-8 rounded-lg border border-slate-200 bg-white/80 px-2.5 flex items-center text-xs font-mono font-bold text-slate-700">
                                        {numericSchedule.activeSundaysCount > 0
                                          ? `~${Math.ceil(
                                              numericSchedule.totalSpan /
                                                numericSchedule.activeSundaysCount
                                            )} / minggu`
                                          : '0 minggu aktif'}
                                      </div>
                                    </div>
                                  )}

                                  {/* Rentang Target Materi (Mulai - Akhir) */}
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                        Mulai
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={rule.target_mulai ?? 1}
                                        onChange={(e) =>
                                          updateRule(pair.key, rIdx, (r) => {
                                            const nextStart = Math.max(
                                              1,
                                              parseInt(e.target.value, 10) || 1
                                            );
                                            const currEnd = r.target_akhir ?? 100;
                                            return {
                                              ...r,
                                              target_mulai: nextStart,
                                              target_akhir: Math.max(nextStart, currEnd),
                                            };
                                          })
                                        }
                                        className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                        Akhir
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={rule.target_akhir ?? 100}
                                        onChange={(e) =>
                                          updateRule(pair.key, rIdx, (r) => ({
                                            ...r,
                                            target_akhir: Math.max(
                                              r.target_mulai ?? 1,
                                              parseInt(e.target.value, 10) || 1
                                            ),
                                          }))
                                        }
                                        className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                                      />
                                    </div>
                                  </div>

                                  {/* Lanjutkan Kumulatif dari Materi Sebelumnya */}
                                  <div className="flex flex-col justify-end">
                                    <label className="flex items-start gap-2 p-1.5 rounded-lg bg-white border border-slate-200 cursor-pointer select-none min-h-[32px]">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(rule.lanjutkan_kumulatif)}
                                        onChange={(e) =>
                                          updateRule(pair.key, rIdx, (r) => ({
                                            ...r,
                                            lanjutkan_kumulatif: e.target.checked,
                                          }))
                                        }
                                        className="mt-0.5 rounded text-emerald-700 cursor-pointer"
                                      />
                                      <span className="text-[10px] leading-tight font-semibold text-slate-700">
                                        Lanjutkan angka kumulatif
                                        {hasPrevNumeric && rule.lanjutkan_kumulatif
                                          ? ` (+${currentOffset})`
                                          : ''}
                                      </span>
                                    </label>
                                  </div>
                                </div>

                                {/* Preview & Editor Rincian Mingguan */}
                                {isExpandedWeekly && (
                                  <div className="pt-2 border-t border-blue-200/70 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                                      <span>
                                        Preview jadwal per minggu kalender (tampil di tab Silabus:{' '}
                                        <b>
                                          {currentOffset + (rule.target_mulai ?? 1)} s/d{' '}
                                          {numericSchedule.plannedEndDisplay}
                                        </b>
                                        ):
                                      </span>
                                      {rule.lanjutkan_kumulatif && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-semibold">
                                            Offset Tampilan Awal:
                                          </span>
                                          <input
                                            type="number"
                                            min={0}
                                            placeholder={String(currentOffset)}
                                            value={
                                              typeof rule.offset_tampilan_awal === 'number'
                                                ? rule.offset_tampilan_awal
                                                : ''
                                            }
                                            onChange={(e) =>
                                              updateRule(pair.key, rIdx, (r) => ({
                                                ...r,
                                                offset_tampilan_awal:
                                                  e.target.value === ''
                                                    ? undefined
                                                    : Math.max(
                                                        0,
                                                        parseInt(e.target.value, 10) || 0
                                                      ),
                                              }))
                                            }
                                            className="w-20 h-6 rounded border border-slate-300 bg-white px-1.5 text-[11px] font-mono font-bold text-slate-800"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5 max-h-52 overflow-y-auto pr-1">
                                      {numericSchedule.orderedPoints.map((pt) => {
                                        const mName =
                                          ACADEMIC_MONTHS[pt.academicMonthIndex]?.name.slice(
                                            0,
                                            3
                                          ) || '';
                                        return (
                                          <div
                                            key={pt.tanggal}
                                            className={`p-1.5 rounded-lg border text-[10px] ${
                                              pt.isHoliday
                                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                                : 'bg-white border-slate-200 text-slate-800'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between font-semibold text-slate-500">
                                              <span>
                                                {mName} M{pt.mingguKe}
                                              </span>
                                              <span className="font-mono text-[9px]">
                                                {pt.tanggal.slice(8, 10)}/{pt.tanggal.slice(5, 7)}
                                              </span>
                                            </div>
                                            {pt.isHoliday ? (
                                              <div className="font-bold text-rose-700 mt-0.5 uppercase">
                                                {pt.holidayLabel || 'LIBURAN'}
                                              </div>
                                            ) : rule.numeric_mode === 'manual' ? (
                                              <div className="mt-1 flex items-center gap-1">
                                                <input
                                                  type="number"
                                                  min={0}
                                                  max={numericSchedule.totalSpan}
                                                  value={pt.relCumulative}
                                                  onChange={(e) => {
                                                    const val = Math.max(
                                                      0,
                                                      Math.min(
                                                        numericSchedule.totalSpan,
                                                        parseInt(e.target.value, 10) || 0
                                                      )
                                                    );
                                                    updateRule(pair.key, rIdx, (r) => ({
                                                      ...r,
                                                      minggu_targets: {
                                                        ...(r.minggu_targets || {}),
                                                        [pt.tanggal]: val,
                                                      },
                                                    }));
                                                  }}
                                                  className="w-full h-6 px-1 rounded border border-blue-300 font-mono font-bold text-emerald-900 text-[11px]"
                                                />
                                                {currentOffset > 0 && (
                                                  <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                                    ={currentOffset + pt.relCumulative}
                                                  </span>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="font-mono font-bold text-emerald-800 text-xs mt-0.5">
                                                {pt.displayValue}
                                                {currentOffset > 0 && (
                                                  <span className="text-[9px] text-slate-400 font-normal ml-1">
                                                    (+{pt.relCumulative})
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Modal: Tombol Aksi Simpan */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
            <span>
              Tersimpan otomatis ke database sistem dan langsung diterapkan ke linimasa &amp; silabus.
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Berhasil Disimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Silabus'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
