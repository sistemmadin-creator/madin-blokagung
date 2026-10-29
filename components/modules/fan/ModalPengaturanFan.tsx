'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFanStore } from '@/stores/useFanStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import {
  getDaftarKelasUnikDariMaster,
  getDaftarKelasUnggulanUnik,
  parseFanItemString,
} from '@/lib/utils/fanHelper';
import { FanConfigMap } from '@/types/fan';
import {
  BookOpen,
  Star,
  Plus,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Layers,
  Code2,
  Save,
  CheckCircle2,
  Info,
} from 'lucide-react';

const KATEGORI_FAN_POPULER = [
  'Fiqih',
  'Nahwu',
  'Shorof',
  'Tauhid',
  'Tajwid',
  'Akhlaq',
  'Tarikh',
  'Hadits',
  'B. Arab',
  "I'lal",
  'Sorogan',
  'Khoth',
];

interface FanChipItem {
  id: string;
  raw: string;
  fan: string;
  mapel: string;
}

export function getFanCategoryBadgeStyle(fanCategory: string): { bg: string; text: string; border: string } {
  const c = fanCategory.trim().toLowerCase();
  if (c.includes('fiqih')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' };
  if (c.includes('nahwu')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' };
  if (c.includes('shorof')) return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300' };
  if (c.includes('tauhid') || c.includes('aqid')) return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' };
  if (c.includes('tajwid') || c.includes('qur')) return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' };
  if (c.includes('akhlaq') || c.includes('tasaw')) return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' };
  if (c.includes('hadits') || c.includes('hadis')) return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' };
  if (c.includes('tarikh') || c.includes('sejarah')) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' };
  if (c.includes('arab') || c.includes('lug')) return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-300' };
  return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
}

export default function ModalPengaturanFan() {
  const { isModalConfigOpen, closeModalConfig, fanConfig, saveFanConfig } = useFanStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  // Mode: Visual Chips vs Bulk Raw Text
  const [viewMode, setViewMode] = useState<'visual' | 'bulk'>('visual');

  // Tab filter tingkat
  const [activeTab, setActiveTab] = useState<'semua' | 'ULA' | 'WUSTHO' | 'ULYA' | 'UG'>('semua');

  // State data kurikulum per kelas: key -> FanChipItem[]
  const [chipsData, setChipsData] = useState<Record<string, FanChipItem[]>>({});

  // State teks mentah untuk mode bulk: key -> string
  const [bulkInputs, setBulkInputs] = useState<Record<string, string>>({});

  // State input penambahan fan baru per kelas: key -> { fan, mapel }
  const [newInputs, setNewInputs] = useState<Record<string, { fan: string; mapel: string }>>({});

  // State penyalinan kurikulum: key -> target source key
  const [copySource, setCopySource] = useState<Record<string, string>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inisialisasi data saat modal dibuka
  useEffect(() => {
    if (isModalConfigOpen) {
      if (formasiList.length === 0) fetchFormasi();
      if (asatidzList.length === 0) fetchAsatidz();

      const newChips: Record<string, FanChipItem[]> = {};
      const newBulk: Record<string, string> = {};

      Object.entries(fanConfig).forEach(([key, items]) => {
        const arr = Array.isArray(items) ? items : [];
        newBulk[key] = arr.join(', ');

        newChips[key] = arr.map((itemStr, idx) => {
          const parsed = parseFanItemString(itemStr);
          return {
            id: `${key}-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            raw: itemStr,
            fan: parsed.fan !== '-' ? parsed.fan : '',
            mapel: parsed.mapel !== '-' ? parsed.mapel : itemStr,
          };
        });
      });

      setChipsData(newChips);
      setBulkInputs(newBulk);
      setNewInputs({});
      setCopySource({});
    }
  }, [isModalConfigOpen, formasiList.length, asatidzList.length, fanConfig, fetchFormasi, fetchAsatidz]);

  const listMasterReguler = useMemo(
    () => getDaftarKelasUnikDariMaster(formasiList, asatidzList),
    [formasiList, asatidzList]
  );

  const listMasterUnggulan = useMemo(
    () => getDaftarKelasUnggulanUnik(formasiList),
    [formasiList]
  );

  // Daftar semua kunci kelas terdaftar
  const allClassKeys = useMemo(() => {
    const keys: { key: string; tingkat: string; isUg: boolean }[] = [];
    listMasterReguler.forEach((item) => {
      keys.push({
        key: `${item.kls} ${item.tingkat}`,
        tingkat: item.tingkat.toUpperCase(),
        isUg: false,
      });
    });
    listMasterUnggulan.forEach((item) => {
      keys.push({
        key: `${item.kls} ${item.tingkat} (Ug)`,
        tingkat: item.tingkat.toUpperCase(),
        isUg: true,
      });
    });
    return keys;
  }, [listMasterReguler, listMasterUnggulan]);

  // Autocomplete / suggestions list derived from all configured fan items
  const suggestedKitabList = useMemo(() => {
    const set = new Set<string>();
    Object.values(chipsData).forEach((list) => {
      list.forEach((item) => {
        if (item.mapel && item.mapel !== '-') set.add(item.mapel);
      });
    });
    return Array.from(set).sort();
  }, [chipsData]);

  // Handler sinkronisasi dari Chips ke Bulk Text saat berpindah tab mode
  const switchViewMode = (targetMode: 'visual' | 'bulk') => {
    if (targetMode === 'bulk') {
      const updatedBulk: Record<string, string> = {};
      Object.entries(chipsData).forEach(([k, list]) => {
        updatedBulk[k] = list.map((item) => item.raw).join(', ');
      });
      setBulkInputs(updatedBulk);
    } else {
      const updatedChips: Record<string, FanChipItem[]> = {};
      Object.entries(bulkInputs).forEach(([k, text]) => {
        const items = text
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        updatedChips[k] = items.map((itemStr, idx) => {
          const parsed = parseFanItemString(itemStr);
          return {
            id: `${k}-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            raw: itemStr,
            fan: parsed.fan !== '-' ? parsed.fan : '',
            mapel: parsed.mapel !== '-' ? parsed.mapel : itemStr,
          };
        });
      });
      setChipsData(updatedChips);
    }
    setViewMode(targetMode);
  };

  // Handler tambah item chip baru ke kelas
  const handleAddChip = (classKey: string) => {
    const input = newInputs[classKey] || { fan: 'Fiqih', mapel: '' };
    const cleanMapel = input.mapel.trim();
    if (!cleanMapel) return;

    const cleanFan = input.fan.trim();
    const rawString = cleanFan ? `(${cleanFan}) ${cleanMapel}` : cleanMapel;

    const newItem: FanChipItem = {
      id: `${classKey}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      raw: rawString,
      fan: cleanFan,
      mapel: cleanMapel,
    };

    setChipsData((prev) => ({
      ...prev,
      [classKey]: [...(prev[classKey] || []), newItem],
    }));

    // Reset input field
    setNewInputs((prev) => ({
      ...prev,
      [classKey]: { fan: input.fan || 'Fiqih', mapel: '' },
    }));
  };

  // Handler hapus satu chip
  const handleDeleteChip = (classKey: string, chipId: string) => {
    setChipsData((prev) => ({
      ...prev,
      [classKey]: (prev[classKey] || []).filter((c) => c.id !== chipId),
    }));
  };

  // Handler geser urutan chip (naik / turun)
  const handleMoveChip = (classKey: string, index: number, direction: 'up' | 'down') => {
    const list = [...(chipsData[classKey] || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    setChipsData((prev) => ({
      ...prev,
      [classKey]: list,
    }));
  };

  // Handler kosongkan semua chip kelas
  const handleClearClass = (classKey: string) => {
    if (window.confirm(`Kosongkan seluruh mata pelajaran untuk kelas ${classKey}?`)) {
      setChipsData((prev) => ({
        ...prev,
        [classKey]: [],
      }));
      setBulkInputs((prev) => ({
        ...prev,
        [classKey]: '',
      }));
    }
  };

  // Handler salin kurikulum dari kelas lain
  const handleCopyFromClass = (targetClassKey: string) => {
    const srcKey = copySource[targetClassKey];
    if (!srcKey || srcKey === targetClassKey) return;

    const srcList = chipsData[srcKey] || [];
    if (srcList.length === 0) {
      alert(`Kelas ${srcKey} belum memiliki item Fan untuk disalin.`);
      return;
    }

    if (
      (chipsData[targetClassKey] || []).length > 0 &&
      !window.confirm(
        `Kelas ${targetClassKey} sudah memiliki mata pelajaran. Timpa dengan kurikulum dari ${srcKey}?`
      )
    ) {
      return;
    }

    const cloned = srcList.map((item, idx) => ({
      ...item,
      id: `${targetClassKey}-${idx}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    }));

    setChipsData((prev) => ({
      ...prev,
      [targetClassKey]: cloned,
    }));
  };

  // Handler Simpan Konfigurasi
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newConfig: FanConfigMap = {};
    const renderedKeys: string[] = [];

    if (viewMode === 'visual') {
      allClassKeys.forEach(({ key }) => {
        renderedKeys.push(key);
        const list = chipsData[key] || [];
        if (list.length > 0) {
          newConfig[key] = list.map((c) => c.raw);
        }
      });
    } else {
      allClassKeys.forEach(({ key }) => {
        renderedKeys.push(key);
        const raw = bulkInputs[key] || '';
        const items = raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (items.length > 0) {
          newConfig[key] = items;
        }
      });
    }

    // Pertahankan konfigurasi lain yang tidak terlihat di form
    Object.keys(fanConfig).forEach((k) => {
      if (!renderedKeys.includes(k) && fanConfig[k]) {
        newConfig[k] = fanConfig[k];
      }
    });

    const success = await saveFanConfig(newConfig);
    setIsSubmitting(false);

    if (success) {
      closeModalConfig();
    } else {
      alert('Gagal menyimpan konfigurasi fan.');
    }
  };

  // Filter kelas berdasarkan tab aktif
  const filteredClassKeys = useMemo(() => {
    if (activeTab === 'semua') return allClassKeys;
    if (activeTab === 'UG') return allClassKeys.filter((c) => c.isUg);
    return allClassKeys.filter((c) => !c.isUg && c.tingkat === activeTab);
  }, [allClassKeys, activeTab]);

  return (
    <Dialog
      isOpen={isModalConfigOpen}
      onClose={closeModalConfig}
      title="Pengaturan Item Fan (Mata Pelajaran)"
      maxWidth="4xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Global Toolbar & Info Alert */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-950">
                Format Resmi: <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200 font-mono text-emerald-800">(Fan) Nama Kitab</code>
              </span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Mata pelajaran yang diatur otomatis terhubung ke Matriks Fan Pelajaran, Pengajar Fan, dan Jadwal KBM.
              </div>
            </div>
          </div>

          {/* Switch Mode: Visual Chips vs Bulk Raw Text */}
          <div className="inline-flex rounded-lg border border-emerald-700 p-0.5 bg-white shrink-0 self-start sm:self-auto shadow-xs">
            <button
              type="button"
              onClick={() => switchViewMode('visual')}
              className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                viewMode === 'visual'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mode Visual (Chips)</span>
            </button>
            <button
              type="button"
              onClick={() => switchViewMode('bulk')}
              className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                viewMode === 'bulk'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Mode Teks Cepat</span>
            </button>
          </div>
        </div>

        {/* Tab Jenjang Tingkat */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('semua')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
              activeTab === 'semua'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua Kelas ({allClassKeys.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ULA')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
              activeTab === 'ULA'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            Tingkat ULA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WUSTHO')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
              activeTab === 'WUSTHO'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            Tingkat WUSTHO
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ULYA')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 ${
              activeTab === 'ULYA'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-purple-700 hover:bg-purple-50'
            }`}
          >
            Tingkat ULYA
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('UG')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition shrink-0 flex items-center gap-1 ${
              activeTab === 'UG'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>Unggulan ({listMasterUnggulan.length})</span>
          </button>
        </div>

        {/* Global Datalist Kitab Suggestions */}
        <datalist id="dl_global_kitab_suggestions">
          {suggestedKitabList.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        {/* Container Kelas */}
        <div className="max-h-[58vh] overflow-y-auto space-y-4 pr-1">
          {filteredClassKeys.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
              Tidak ada kelas yang cocok dengan tab yang dipilih.
            </div>
          ) : (
            filteredClassKeys.map(({ key: classKey, isUg }) => {
              const items = chipsData[classKey] || [];
              const rawText = bulkInputs[classKey] || '';
              const newIn = newInputs[classKey] || { fan: 'Fiqih', mapel: '' };

              return (
                <div
                  key={classKey}
                  className={`p-3.5 rounded-xl border transition shadow-xs ${
                    isUg
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Header Baris Kelas */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {isUg ? (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
                        )}
                        <h4 className="font-extrabold text-slate-800 text-sm m-0">
                          {classKey}
                        </h4>
                      </div>
                      <span className="badge bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[10px] px-2 py-0.5 rounded-full">
                        {viewMode === 'visual'
                          ? `${items.length} Fan`
                          : `${rawText.split(',').filter((s) => s.trim()).length} Fan`}
                      </span>
                    </div>

                    {/* Fitur Salin Kurikulum & Hapus Semua */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 text-[11px]">
                        <Copy className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
                        <select
                          value={copySource[classKey] || ''}
                          onChange={(e) =>
                            setCopySource((prev) => ({
                              ...prev,
                              [classKey]: e.target.value,
                            }))
                          }
                          className="bg-transparent text-[11px] font-medium text-slate-600 focus:outline-none"
                        >
                          <option value="">Salin dari kelas...</option>
                          {allClassKeys
                            .filter((c) => c.key !== classKey)
                            .map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.key}
                              </option>
                            ))}
                        </select>
                        {copySource[classKey] && (
                          <button
                            type="button"
                            onClick={() => handleCopyFromClass(classKey)}
                            title={`Salin seluruh Fan dari ${copySource[classKey]} ke ${classKey}`}
                            className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold shadow-xs transition"
                          >
                            Terapkan
                          </button>
                        )}
                      </div>

                      {items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleClearClass(classKey)}
                          title="Kosongkan seluruh mata pelajaran kelas ini"
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mode 1: Visual Chips Builder */}
                  {viewMode === 'visual' ? (
                    <div className="space-y-3">
                      {/* Daftar Chips */}
                      {items.length === 0 ? (
                        <div className="py-2 text-xs italic text-slate-400 text-center sm:text-left">
                          Belum ada mata pelajaran yang diatur untuk kelas ini. Gunakan formulir di bawah untuk menambahkan.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 items-center">
                          {items.map((chip, idx) => {
                            const badgeStyle = getFanCategoryBadgeStyle(chip.fan || chip.mapel);

                            return (
                              <div
                                key={chip.id}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium shadow-xs group transition-all ${badgeStyle.bg} ${badgeStyle.border}`}
                              >
                                {/* Tombol Geser Posisi */}
                                <div className="flex items-center opacity-40 group-hover:opacity-100 transition-opacity -ml-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveChip(classKey, idx, 'up')}
                                    title="Pindah ke kiri / awal"
                                    className="p-0.5 hover:text-slate-900 disabled:opacity-20"
                                  >
                                    <ChevronLeft className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={idx === items.length - 1}
                                    onClick={() => handleMoveChip(classKey, idx, 'down')}
                                    title="Pindah ke kanan / akhir"
                                    className="p-0.5 hover:text-slate-900 disabled:opacity-20"
                                  >
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Label Fan / Mapel */}
                                <div className="flex items-center gap-1">
                                  {chip.fan && (
                                    <span className={`font-bold font-mono text-[10px] uppercase ${badgeStyle.text}`}>
                                      ({chip.fan})
                                    </span>
                                  )}
                                  <span className="font-semibold text-slate-800">
                                    {chip.mapel}
                                  </span>
                                </div>

                                {/* Tombol Hapus Satuan */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChip(classKey, chip.id)}
                                  title="Hapus mata pelajaran ini"
                                  className="ml-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-white/80 p-0.5 transition"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Baris Input Tambah Fan Cepat */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* Dropdown Kategori Fan */}
                        <div className="relative w-full sm:w-40 shrink-0">
                          <input
                            type="text"
                            list={`dl_kat_fan_${classKey}`}
                            value={newIn.fan}
                            onChange={(e) =>
                              setNewInputs((prev) => ({
                                ...prev,
                                [classKey]: { ...newIn, fan: e.target.value },
                              }))
                            }
                            placeholder="Fan (cth: Fiqih)"
                            className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white font-semibold"
                          />
                          <datalist id={`dl_kat_fan_${classKey}`}>
                            {KATEGORI_FAN_POPULER.map((cat) => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                        </div>

                        {/* Input Nama Kitab / Mapel */}
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            list="dl_global_kitab_suggestions"
                            value={newIn.mapel}
                            onChange={(e) =>
                              setNewInputs((prev) => ({
                                ...prev,
                                [classKey]: { ...newIn, mapel: e.target.value },
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddChip(classKey);
                              }
                            }}
                            placeholder="Nama Kitab / Mata Pelajaran (tekan Enter untuk menambah)..."
                            className="w-full text-xs py-1.5 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white"
                          />
                        </div>

                        {/* Tombol Tambah */}
                        <button
                          type="button"
                          onClick={() => handleAddChip(classKey)}
                          disabled={!newIn.mapel.trim()}
                          className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Mode 2: Bulk Raw Comma-separated Input */
                    <div className="space-y-1">
                      <textarea
                        rows={2}
                        value={rawText}
                        onChange={(e) =>
                          setBulkInputs((prev) => ({
                            ...prev,
                            [classKey]: e.target.value,
                          }))
                        }
                        placeholder="Contoh: (Fiqih) Mabadi Fiqih Juz I, (Tajwid) Panduan Tajwid, (Tauhid) Aqidatul Mubtadiin"
                        className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono shadow-xs resize-y"
                      />
                      <span className="text-[10px] text-slate-400 block italic">
                        *Pisahkan setiap nama Fan dengan tanda koma (,). Format: (NamaFan) Nama Kitab
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-200 flex-wrap gap-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>
              Total: <b>{allClassKeys.length} Kelas Terkonfigurasi</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeModalConfig}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
