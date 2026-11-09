'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import {
  getDaftarTingkatKelasDiniyyah,
  normalizeToItemDetail,
  formatTargetPreview,
  norm,
} from '@/lib/utils/setoranHelper';
import { SilabusConfigMap, SilabusItemRule, ItemHafalanDetail } from '@/types/setoran';
import {
  CalendarRange,
  BookOpen,
  Save,
  Copy,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const ACADEMIC_MONTHS = [
  { index: 0, name: 'Juli', semester: 'Ganjil' },
  { index: 1, name: 'Agustus', semester: 'Ganjil' },
  { index: 2, name: 'September', semester: 'Ganjil' },
  { index: 3, name: 'Oktober', semester: 'Ganjil' },
  { index: 4, name: 'November', semester: 'Ganjil' },
  { index: 5, name: 'Desember', semester: 'Ganjil' },
  { index: 6, name: 'Januari', semester: 'Genap' },
  { index: 7, name: 'Februari', semester: 'Genap' },
  { index: 8, name: 'Maret', semester: 'Genap' },
  { index: 9, name: 'April', semester: 'Genap' },
  { index: 10, name: 'Mei', semester: 'Genap' },
  { index: 11, name: 'Juni', semester: 'Genap' },
];

interface ModalAturSilabusProps {
  isOpen: boolean;
  onClose: () => void;
  startYear?: number;
}

export default function ModalAturSilabus({ isOpen, onClose, startYear = 2026 }: ModalAturSilabusProps) {
  const { config, silabusConfig, saveSilabusConfig, fetchSetoranData } = useMuhafadzohStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { santriList, fetchSantri } = useSantriStore();

  // Tab filter tingkat (Semua, ULA, WUSTHO, ULYA) - Mengadopsi gambar 2
  const [activeTab, setActiveTab] = useState<'semua' | 'ULA' | 'WUSTHO' | 'ULYA'>('semua');
  const [localSilabus, setLocalSilabus] = useState<SilabusConfigMap>({});
  const [copySource, setCopySource] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (formasiList.length === 0) fetchFormasi();
      if (santriList.length === 0) fetchSantri();
    }
  }, [isOpen, formasiList.length, santriList.length, fetchFormasi, fetchSantri]);

  // Daftar pasangan jenjang kelas & tingkat dari formasi dan santri
  const pairs = useMemo(() => {
    return getDaftarTingkatKelasDiniyyah(formasiList, santriList);
  }, [formasiList, santriList]);

  // Helper mengambil daftar hafalan (hanya Wajib & Sunnah) per key tingkat/kelas
  const getMateriForPair = useMemo(() => {
    return (pairKey: string): Array<{ item: ItemHafalanDetail; kategori: 'Wajib' | 'Sunnah' }> => {
      const result: Array<{ item: ItemHafalanDetail; kategori: 'Wajib' | 'Sunnah' }> = [];

      // 1. Hafalan Wajib
      const rawWajib = config.hafWajib?.[pairKey] || [];
      const wajibList = Array.isArray(rawWajib)
        ? rawWajib
        : typeof rawWajib === 'string'
        ? (rawWajib as string).split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      wajibList.forEach((it, idx) => {
        result.push({
          item: normalizeToItemDetail(it, idx),
          kategori: 'Wajib',
        });
      });

      // 2. Hafalan Sunnah
      const rawSunnah = config.hafSunnah?.[pairKey] || [];
      const sunnahList = Array.isArray(rawSunnah)
        ? rawSunnah
        : typeof rawSunnah === 'string'
        ? (rawSunnah as string).split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      sunnahList.forEach((it, idx) => {
        result.push({
          item: normalizeToItemDetail(it, wajibList.length + idx),
          kategori: 'Sunnah',
        });
      });

      return result;
    };
  }, [config.hafWajib, config.hafSunnah]);

  // Inisialisasi localSilabus saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const nextMap: SilabusConfigMap = { ...(silabusConfig || {}) };

      pairs.forEach((p) => {
        const materiList = getMateriForPair(p.key);
        const existingRules = nextMap[p.key] || [];

        // Buat aturan untuk setiap materi
        const rulesForPair: SilabusItemRule[] = materiList.map((m, mIdx) => {
          const mNorm = norm(m.item.nama);
          const found = existingRules.find((r) => norm(r.materi_nama) === mNorm);

          if (found) {
            return {
              ...found,
              kategori: m.kategori,
              target_type: m.item.targetType,
              target_preview: formatTargetPreview(m.item),
            };
          }

          // Default distribusi bulan otomatis jika belum ada setting:
          // Jika 1 materi: Juli (0) - Juni (11)
          // Jika 2 materi: 1: Juli - Des, 2: Jan - Jun
          // Jika 3 materi: 1: Jul - Okt, 2: Nov - Feb, 3: Mar - Jun
          const totalM = Math.max(1, materiList.length);
          const monthsPerItem = Math.max(1, Math.floor(12 / totalM));
          const dariIdx = Math.min(11, mIdx * monthsPerItem);
          const sampaiIdx =
            mIdx === totalM - 1
              ? 11
              : Math.min(11, dariIdx + monthsPerItem - 1);

          return {
            materi_id: m.item.id,
            materi_nama: m.item.nama,
            kategori: m.kategori,
            target_type: m.item.targetType,
            target_preview: formatTargetPreview(m.item),
            dari_bulan_index: dariIdx,
            sampai_bulan_index: sampaiIdx,
            dari_bulan_nama: ACADEMIC_MONTHS[dariIdx]?.name || 'Juli',
            sampai_bulan_nama: ACADEMIC_MONTHS[sampaiIdx]?.name || 'Juni',
          };
        });

        nextMap[p.key] = rulesForPair;
      });

      setLocalSilabus(nextMap);
      setSaveSuccess(false);
    }
  }, [isOpen, pairs, getMateriForPair, silabusConfig]);

  // Update bulan untuk item tertentu
  const handleMonthChange = (
    pairKey: string,
    materiIdx: number,
    field: 'dari' | 'sampai',
    newIndex: number
  ) => {
    setLocalSilabus((prev) => {
      const currentList = [...(prev[pairKey] || [])];
      if (!currentList[materiIdx]) return prev;

      const rule = { ...currentList[materiIdx] };
      if (field === 'dari') {
        rule.dari_bulan_index = newIndex;
        rule.dari_bulan_nama = ACADEMIC_MONTHS[newIndex]?.name || 'Juli';
        // Pastikan sampai tidak lebih kecil dari dari
        if (rule.sampai_bulan_index < newIndex) {
          rule.sampai_bulan_index = newIndex;
          rule.sampai_bulan_nama = ACADEMIC_MONTHS[newIndex]?.name || 'Juli';
        }
      } else {
        rule.sampai_bulan_index = newIndex;
        rule.sampai_bulan_nama = ACADEMIC_MONTHS[newIndex]?.name || 'Juni';
        // Pastikan dari tidak lebih besar dari sampai
        if (rule.dari_bulan_index > newIndex) {
          rule.dari_bulan_index = newIndex;
          rule.dari_bulan_nama = ACADEMIC_MONTHS[newIndex]?.name || 'Juli';
        }
      }

      currentList[materiIdx] = rule;
      return {
        ...prev,
        [pairKey]: currentList,
      };
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

  // Simpan konfigurasi silabus
  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const success = await saveSilabusConfig(localSilabus);
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 800);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter pairs berdasarkan tab aktif (mengikuti desain gambar 2)
  const filteredPairs = useMemo(() => {
    if (activeTab === 'semua') return pairs;
    return pairs.filter((p) => p.tk.toUpperCase() === activeTab);
  }, [pairs, activeTab]);

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
      <div className="flex flex-col h-[75vh]">
        {/* Banner Penjelasan & Panduan */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-slate-800">Petunjuk Silabus Target: </span>
              Atur kolom <b>Dari Bulan</b> dan <b>Sampai Bulan</b> untuk setiap materi hafalan{' '}
              <span className="text-emerald-700 font-semibold">(Wajib & Sunnah)</span> per tingkat/kelas.
              Hasil input ini secara otomatis menentukan warna stabilo baris santri di Linimasa Setor:
              <span className="inline-flex items-center gap-1 mx-1.5 px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                🔴 Merah
              </span>
              (sudah lewat bulan deadline & belum selesai),
              <span className="inline-flex items-center gap-1 mx-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                🟡 Kuning
              </span>
              (sedang di bulan capaian), dan
              <span className="inline-flex items-center gap-1 mx-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                ⚪ Putih
              </span>
              (aman / tuntas / belum masuk jadwal).
            </div>
          </div>

          {/* Switch Tab Filter Jenjang (Gambar 2 Style) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: 'semua', label: `Semua Kelas (${pairs.length})` },
              { id: 'ULA', label: 'Tingkat ULA' },
              { id: 'WUSTHO', label: 'Tingkat WUSTHO' },
              { id: 'ULYA', label: 'Tingkat ULYA' },
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
        </div>

        {/* Konten Daftar Kelas & Materi Silabus (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/50">
          {filteredPairs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Tidak ada data kelas yang sesuai dengan filter.
            </div>
          ) : (
            filteredPairs.map((pair) => {
              const rules = localSilabus[pair.key] || [];

              return (
                <div
                  key={pair.key}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Header Kartu Kelas (Gambar 2 style) */}
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

                  {/* Body Kartu: Tabel Daftar Materi Hafalan Wajib & Sunnah */}
                  {rules.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      Belum ada materi Hafalan Wajib / Sunnah yang dikonfigurasi pada jenjang {pair.label}.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {rules.map((rule, rIdx) => {
                        const durasiBulan =
                          Math.max(0, rule.sampai_bulan_index - rule.dari_bulan_index) + 1;

                        return (
                          <div
                            key={`${pair.key}_${rule.materi_nama}_${rIdx}`}
                            className="p-3.5 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                          >
                            {/* Informasi Materi */}
                            <div className="space-y-1 min-w-[220px] max-w-sm">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                    rule.kategori === 'Wajib'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}
                                >
                                  {rule.kategori}
                                </span>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {rule.materi_nama}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                Target: {rule.target_preview || 'Standard'}
                              </div>
                            </div>

                            {/* Kontrol 2 Kolom: Dari Bulan & Sampai Bulan */}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              {/* Kolom Dari Bulan */}
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

                              {/* Kolom Sampai Bulan */}
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

                              {/* Badge Ringkasan Durasi */}
                              <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 min-w-[70px] text-center">
                                {durasiBulan} Bulan
                              </span>
                            </div>
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
          <div className="text-xs text-slate-500 hidden sm:block">
            Tersimpan otomatis ke database sistem dan langsung diterapkan ke linimasa.
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
