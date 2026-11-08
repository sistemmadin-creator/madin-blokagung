'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  BookOpen,
  CheckCircle2,
  Trash2,
  Plus,
  TrendingUp,
  Search,
  ChevronDown,
  History,
  MessageSquare,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { SundayOption } from '@/lib/utils/sundayHelper';
import SundayDatePicker from '@/components/ui/SundayDatePicker';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import {
  useSetorMustahiqStore,
  buildSantriSetorRow,
  computeMateriProgressForSantri,
  getMateriOptionsWithStatusForSantri,
} from '@/stores/useSetorMustahiqStore';
import { formatTargetPreview, norm } from '@/lib/utils/setoranHelper';

interface ModalInputSetorMingguProps {
  isOpen: boolean;
  onClose: () => void;
  santri: {
    no_induk: string;
    nama: string;
    displayKelas: string;
    tingkat?: string;
    din_kls?: string;
    din_bag?: string;
    pa_pi?: 'PA' | 'PI';
    kamar?: string;
    raw: any;
  };
  sunday: SundayOption;
  existingRecords?: any[];
  onSuccess: () => void;
}

export const ModalInputSetorMinggu: React.FC<ModalInputSetorMingguProps> = ({
  isOpen,
  onClose,
  santri,
  sunday,
  onSuccess,
}) => {
  const { config, fetchSetoranData, addSetoran } = useMuhafadzohStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const {
    logs,
    activeStates,
    fetchMustahiqData,
    addLogSetoran,
    addLogSetoranBatch,
    deleteLogSetoran,
    switchActiveHafalan,
  } = useSetorMustahiqStore();

  const tahun = parseInt(sunday.tanggal.split('-')[0], 10) || new Date().getFullYear();

  // Load dependency stores if empty
  useEffect(() => {
    if (formasiList.length === 0) fetchFormasi();
    if (asatidzList.length === 0) fetchAsatidz();
    if (logs.length === 0) fetchMustahiqData();
  }, [formasiList.length, asatidzList.length, logs.length, fetchFormasi, fetchAsatidz, fetchMustahiqData]);

  // Bangun SantriSetorRow & Progress persis seperti di SetorMustahiqModule (Gambar 2)
  const santriRow = useMemo(() => {
    return buildSantriSetorRow(
      santri.raw || santri,
      config,
      logs,
      activeStates,
      asatidzList,
      formasiList,
      tahun
    );
  }, [santri, config, logs, activeStates, asatidzList, formasiList, tahun]);

  const prog = useMemo(() => {
    return computeMateriProgressForSantri(
      santri.no_induk,
      santriRow.active_item,
      logs,
      tahun
    );
  }, [santri.no_induk, santriRow.active_item, logs, tahun]);

  const materiOptions = useMemo(() => {
    return getMateriOptionsWithStatusForSantri(
      santri.no_induk,
      santriRow.config_key,
      config,
      logs,
      activeStates[santri.no_induk],
      tahun
    );
  }, [santri.no_induk, santriRow.config_key, config, logs, activeStates, tahun]);

  // State Form Input Setoran
  // Tanggal setor otomatis terkunci/terpilih ke hari Minggu yang diklik
  const [tglSetor, setTglSetor] = useState<string>(sunday.tanggal);
  const [tambahAngka, setTambahAngka] = useState<string>('');
  const [selectedKalimatList, setSelectedKalimatList] = useState<string[]>([]);
  const [catatan, setCatatan] = useState<string>('');
  const [isKalimatDropdownOpen, setIsKalimatDropdownOpen] = useState<boolean>(false);
  const [kalimatSearch, setKalimatSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Modal Ganti Hafalan Selanjutnya
  const [isGantiHafalanOpen, setIsGantiHafalanOpen] = useState<boolean>(false);

  const kalimatDropdownRef = useRef<HTMLDivElement>(null);

  // Sync tanggal bila sunday prop berganti
  useEffect(() => {
    setTglSetor(sunday.tanggal);
  }, [sunday.tanggal]);

  // Click outside listener untuk dropdown kalimat
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        kalimatDropdownRef.current &&
        !kalimatDropdownRef.current.contains(e.target as Node)
      ) {
        setIsKalimatDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Handler Submit Setoran (persis alur Setor Mustahiq Gambar 2)
  const handleSubmitSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const item = santriRow.active_item;

    if (item.targetType === 'numeric') {
      const numVal = parseInt(tambahAngka, 10);
      if (!numVal || numVal <= 0) {
        setErrorMsg(`Masukkan jumlah pertambahan ${santriRow.satuan_label} yang valid (lebih dari 0).`);
        return;
      }
      setIsSubmitting(true);
      try {
        await addLogSetoran(
          {
            no_induk: santriRow.no_induk,
            nama_santri: santriRow.nama,
            tingkat: santriRow.tingkat,
            din_kls: santriRow.din_kls,
            din_bag: santriRow.din_bag,
            materi_nama: item.nama,
            kategori: santriRow.active_kategori,
            target_type: 'numeric',
            tanggal: tglSetor,
            tahun,
            tambah_angka: numVal,
            catatan: catatan.trim() || undefined,
            mustahiq: santriRow.mustahiq,
          },
          item
        );
        // Dual write ke muhafadzoh store untuk kompatibilitas tabel setoran records
        await addSetoran({
          no_induk: santriRow.no_induk,
          nama: santriRow.nama,
          tanggal: tglSetor,
          item_hafalan: item.nama,
          kategori: santriRow.active_kategori,
          penjaga: santriRow.mustahiq || 'Mustahiq Kelas',
          mustahiq: santriRow.mustahiq,
          tingkat: santriRow.tingkat,
          din_kls: santriRow.din_kls,
          din_bag: santriRow.din_bag,
          capaian: `${numVal} ${santriRow.satuan_label}`,
        });

        setTambahAngka('');
        setCatatan('');
        fetchMustahiqData();
        fetchSetoranData();
        onSuccess();
      } catch (err: any) {
        setErrorMsg(err?.message || 'Gagal menyimpan setoran.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Target Sentence (Kalimat/Surah/Tajwid)
      if (selectedKalimatList.length === 0) {
        setErrorMsg(`Pilih minimal 1 tahapan ${santriRow.satuan_label} yang disetorkan.`);
        return;
      }
      setIsSubmitting(true);
      try {
        if (selectedKalimatList.length === 1) {
          const chosenKalimat = selectedKalimatList[0];
          const sentences = item.sentences || [];
          const idx = sentences.findIndex((s) => norm(s) === norm(chosenKalimat));
          await addLogSetoran(
            {
              no_induk: santriRow.no_induk,
              nama_santri: santriRow.nama,
              tingkat: santriRow.tingkat,
              din_kls: santriRow.din_kls,
              din_bag: santriRow.din_bag,
              materi_nama: item.nama,
              kategori: santriRow.active_kategori,
              target_type: 'sentence',
              tanggal: tglSetor,
              tahun,
              kalimat_dipilih: chosenKalimat,
              kalimat_index: idx >= 0 ? idx : undefined,
              catatan: catatan.trim() || undefined,
              mustahiq: santriRow.mustahiq,
            },
            item
          );
        } else {
          // Batch sentences
          await addLogSetoranBatch(
            {
              no_induk: santriRow.no_induk,
              nama_santri: santriRow.nama,
              tingkat: santriRow.tingkat,
              din_kls: santriRow.din_kls,
              din_bag: santriRow.din_bag,
              materi_nama: item.nama,
              kategori: santriRow.active_kategori,
              tanggal: tglSetor,
              tahun,
              catatan: catatan.trim() || undefined,
              mustahiq: santriRow.mustahiq,
            },
            selectedKalimatList,
            item
          );
        }

        // Dual write ke muhafadzoh records
        await addSetoran({
          no_induk: santriRow.no_induk,
          nama: santriRow.nama,
          tanggal: tglSetor,
          item_hafalan: item.nama,
          kategori: santriRow.active_kategori,
          penjaga: santriRow.mustahiq || 'Mustahiq Kelas',
          mustahiq: santriRow.mustahiq,
          tingkat: santriRow.tingkat,
          din_kls: santriRow.din_kls,
          din_bag: santriRow.din_bag,
          capaian: selectedKalimatList.join(', '),
        });

        setSelectedKalimatList([]);
        setCatatan('');
        fetchMustahiqData();
        fetchSetoranData();
        onSuccess();
      } catch (err: any) {
        setErrorMsg(err?.message || 'Gagal menyimpan setoran kalimat.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Handler Hapus Log
  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Hapus rekaman setoran ini? Capaian santri akan dihitung ulang otomatis.')) return;
    await deleteLogSetoran(logId);
    fetchMustahiqData();
    fetchSetoranData();
    onSuccess();
  };

  // Handler Ganti Target Hafalan
  const handlePilihMateriBaru = async (materiNama: string, kat: 'Wajib' | 'Sunnah' | 'Kitab') => {
    await switchActiveHafalan(
      santriRow.no_induk,
      santriRow.nama,
      materiNama,
      kat,
      santriRow.is_target_met ? santriRow.active_item.nama : undefined
    );
    setIsGantiHafalanOpen(false);
    fetchSetoranData();
    onSuccess();
  };

  const sentencesList = santriRow.active_item.sentences && santriRow.active_item.sentences.length > 0
    ? santriRow.active_item.sentences
    : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ================= MODAL HEADER (Gambar 2) ================= */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Detail Setoran Hafalan Santri
              </h2>
              <p className="text-xs text-slate-500">
                Madrasah Diniyyah Al Amiriyyah Blokagung
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= MODAL BODY (Gambar 2) ================= */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. Kartu Ringkasan Santri & Target Aktif */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {santriRow.nama}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  NIS: {santriRow.no_induk} • Kamar: {santri.kamar || '-'} • Mustahiq:{' '}
                  {santriRow.mustahiq || 'Belum Diatur'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {/* Format Kelas Baru: 1 A ULA (PA) */}
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  {santri.displayKelas}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                  Hafalan {santriRow.active_kategori}
                </span>
              </div>
            </div>

            {/* Target Kelas Ini */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
              <span className="text-slate-500">Target Hafalan Saat Ini:</span>
              <span className="font-bold text-slate-800 text-right">
                {santriRow.active_item.nama} ({formatTargetPreview(santriRow.active_item)})
              </span>
            </div>

            {/* Capaian Progress Bar */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  Capaian Setoran Hafalan:
                </span>
                <span className="font-bold text-emerald-800 font-mono">
                  {santriRow.status_badge_text} ({santriRow.progress_pct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${santriRow.progress_pct}%` }}
                />
              </div>
            </div>

            {/* Banner Status & Tombol "Ganti Hafalan Selanjutnya" */}
            {santriRow.is_target_met ? (
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Target Hafalan Ini Telah Tuntas (100%)!</p>
                    <p className="text-[11px] text-emerald-700 font-normal">
                      Santri telah menyelesaikan target {santriRow.active_item.nama}. Silakan ganti ke hafalan selanjutnya.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGantiHafalanOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Ganti Hafalan Selanjutnya
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3">
                <div className="text-xs text-amber-900">
                  <p className="font-bold">Masih dalam proses setoran hafalan</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {santriRow.active_item.targetType === 'numeric'
                      ? `Kurang ${Math.max(
                          0,
                          santriRow.target_akhir_angka - santriRow.total_capaian_angka
                        )} ${santriRow.satuan_label} lagi untuk menuntaskan target ini.`
                      : `Kurang ${Math.max(
                          0,
                          santriRow.total_sentences_count - santriRow.completed_sentences_count
                        )} ${santriRow.satuan_label} lagi untuk menuntaskan target ini.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGantiHafalanOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Ganti Hafalan Selanjutnya
                </button>
              </div>
            )}

            {/* Modal Mini: Pilih Hafalan Selanjutnya */}
            {isGantiHafalanOpen && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Pilih Target Materi Hafalan:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsGantiHafalanOpen(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Batal
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {materiOptions.map((opt) => (
                    <button
                      key={opt.item.nama}
                      type="button"
                      onClick={() => handlePilihMateriBaru(opt.item.nama, opt.kategori)}
                      className={`p-2 rounded-lg text-left text-xs border transition-all ${
                        opt.isCurrentActive
                          ? 'bg-emerald-100 border-emerald-400 font-bold text-emerald-900'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="font-semibold">{opt.item.nama}</div>
                      <div className="text-[10px] text-slate-500">
                        {opt.kategori} • {opt.isCompleted ? '✓ Sudah Selesai' : 'Sedang/Belum'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Form Proses Setoran (Gambar 2) */}
          <div className="space-y-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Proses Setoran</h4>
              <p className="text-xs text-slate-500">
                {santriRow.active_item.targetType === 'numeric'
                  ? `Input pertambahan ${santriRow.satuan_label.toLowerCase()} setoran santri pada hari Minggu yang dipilih.`
                  : `Pilih tahapan ${santriRow.satuan_label.toLowerCase()} yang telah disetorkan santri kepada Mustahiq.`}
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmitSetoran}
              className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-3"
            >
              {/* Pemilih Hari Minggu pada Bulannya */}
              <SundayDatePicker
                value={tglSetor}
                onChange={(dateIso) => setTglSetor(dateIso)}
                label={`Tanggal Setor (Hari Minggu ${sunday.mingguKe} - ${sunday.labelLengkap})`}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Input Numerik / Kalimat */}
                {santriRow.active_item.targetType === 'numeric' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tambah {santriRow.satuan_label} *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      placeholder="1, 2, 5, 13..."
                      value={tambahAngka}
                      onChange={(e) => setTambahAngka(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                ) : (
                  <div className="relative" ref={kalimatDropdownRef}>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Pilih {santriRow.satuan_label} *</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {selectedKalimatList.length > 0 ? `${selectedKalimatList.length} Dipilih` : ''}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsKalimatDropdownOpen((v) => !v)}
                      className="w-full bg-white border border-slate-200 hover:border-emerald-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 text-left flex items-center justify-between gap-1 transition-colors"
                    >
                      <span className="truncate">
                        {selectedKalimatList.length === 0
                          ? `Pilih ${santriRow.satuan_label}...`
                          : `${selectedKalimatList.length} ${santriRow.satuan_label}: ${selectedKalimatList.slice(0, 2).join(', ')}${selectedKalimatList.length > 2 ? '...' : ''}`}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>

                    {/* Dropdown Menu Multi-Select Kalimat */}
                    {isKalimatDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2.5 space-y-2 max-h-80 flex flex-col">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari surah/kalimat..."
                            value={kalimatSearch}
                            onChange={(e) => setKalimatSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                          />
                        </div>

                        {/* Tombol Cepat Pilihan */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pb-1 border-b border-slate-100 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const uncompleted = sentencesList.filter(
                                (s) => !prog.completedSentences.some((cs) => norm(cs) === norm(s))
                              );
                              setSelectedKalimatList(uncompleted.slice(0, 3));
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold cursor-pointer"
                          >
                            +3 Berikutnya
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const uncompleted = sentencesList.filter(
                                (s) => !prog.completedSentences.some((cs) => norm(cs) === norm(s))
                              );
                              setSelectedKalimatList(uncompleted);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            Semua Belum
                          </button>
                          {selectedKalimatList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedKalimatList([])}
                              className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold ml-auto cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                        </div>

                        {/* List Kalimat dengan Checkbox */}
                        <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                          {sentencesList
                            .filter((k) => (kalimatSearch ? norm(k).includes(norm(kalimatSearch)) : true))
                            .map((kal, idx) => {
                              const isDone = prog.completedSentences.some(
                                (cs) => norm(cs) === norm(kal)
                              );
                              const isSelected = selectedKalimatList.some(
                                (s) => norm(s) === norm(kal)
                              );
                              return (
                                <div
                                  key={`${kal}_${idx}`}
                                  onClick={() => {
                                    setSelectedKalimatList((prev) =>
                                      prev.some((s) => norm(s) === norm(kal))
                                        ? prev.filter((s) => norm(s) !== norm(kal))
                                        : [...prev, kal]
                                    );
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer pointer-events-none"
                                    />
                                    <span>
                                      {idx + 1}. {kal}
                                    </span>
                                  </div>
                                  {isDone && (
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                      Sudah Disetor
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Catatan Opsional */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Surah / bait / keterangan..."
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Badges Pilihan Kalimat */}
              {selectedKalimatList.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-500 font-semibold">
                    Pilihan ({selectedKalimatList.length}):
                  </span>
                  {selectedKalimatList.map((kal) => (
                    <span
                      key={kal}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold"
                    >
                      <span>{kal}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedKalimatList((prev) =>
                            prev.filter((s) => norm(s) !== norm(kal))
                          )
                        }
                        className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tombol Simpan Setoran */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 italic">
                  *Target penuh materi ini: {formatTargetPreview(santriRow.active_item)}
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Setoran</span>
                  {selectedKalimatList.length > 0 && (
                    <span>({selectedKalimatList.length} Kalimat)</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 3. Riwayat Setor (Gambar 2) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Riwayat Setor ({santriRow.active_item.nama})
              </h4>
              <div className="flex items-center gap-2">
                <Link
                  href={`/kirim-wa?santri=${encodeURIComponent(
                    santriRow.no_induk
                  )}&tahun=${tahun}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Kirim WA Rapor</span>
                </Link>
                <span className="text-[11px] text-slate-400">
                  {prog.matchingLogs.length} Catatan
                </span>
              </div>
            </div>

            {prog.matchingLogs.length === 0 ? (
              <div className="p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                Belum ada riwayat setoran untuk materi{' '}
                <span className="font-semibold text-slate-600">
                  {santriRow.active_item.nama}
                </span>{' '}
                di tahun {tahun}.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-semibold">
                      <th className="py-2 px-3 w-10">No</th>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3 text-center">
                        Tambah {santriRow.satuan_label}
                      </th>
                      <th className="py-2 px-3">Rincian Status</th>
                      <th className="py-2 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {prog.matchingLogs.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {log.tanggal}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700">
                          {log.target_type === 'sentence'
                            ? `+1 ${santriRow.satuan_label}`
                            : `+${log.tambah_angka || 0} ${santriRow.satuan_label}`}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {log.target_type === 'sentence' ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold text-[11px]">
                                {log.kalimat_dipilih}
                              </span>
                              {log.catatan && (
                                <span className="text-slate-400 text-[11px]">
                                  • {log.catatan}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span>
                              Kumulatif: {log.kumulatif_angka || 0} {santriRow.satuan_label}{' '}
                              {log.catatan && `• ${log.catatan}`}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Hapus rekaman ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalInputSetorMinggu;
