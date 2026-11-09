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
  Sparkles,
  Lock,
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
import { formatTargetPreview, norm, isPureTahfidz } from '@/lib/utils/setoranHelper';

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
    deduplicateSantriLogs,
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

  // State Khusus Setoran Tahfidz
  const [selectedJuzTahfidz, setSelectedJuzTahfidz] = useState<number>(1);
  const [catatanTahfidz, setCatatanTahfidz] = useState<string>('');
  const [isSubmittingTahfidz, setIsSubmittingTahfidz] = useState<boolean>(false);

  // Modal Ganti Hafalan Selanjutnya
  const [isGantiHafalanOpen, setIsGantiHafalanOpen] = useState<boolean>(false);

  const kalimatDropdownRef = useRef<HTMLDivElement>(null);

  // Sync tanggal bila sunday prop berganti
  useEffect(() => {
    setTglSetor(sunday.tanggal);
  }, [sunday.tanggal]);

  // Otomatis arahkan ke juz berikutnya yang belum disetor
  useEffect(() => {
    if (santriRow.is_tahfidz) {
      const target = santriRow.tahfidz_target_juz || 3;
      const completed = santriRow.tahfidz_completed_juz || [];
      for (let i = 1; i <= target; i++) {
        if (!completed.includes(i)) {
          setSelectedJuzTahfidz(i);
          break;
        }
      }
    }
  }, [santriRow.is_tahfidz, santriRow.tahfidz_target_juz, santriRow.tahfidz_completed_juz]);

  // Log riwayat gabungan
  const riwayatLogs = useMemo(() => {
    if (santriRow.is_tahfidz) {
      return logs
        .filter(
          (l) =>
            norm(l.no_induk) === norm(santriRow.no_induk) &&
            (l.tahun === tahun || !l.tahun)
        )
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    }
    return prog.matchingLogs;
  }, [santriRow, logs, tahun, prog.matchingLogs]);

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
      const itemsToSubmit = selectedKalimatList.filter(
        (kal) => !prog.completedSentences.some((cs) => norm(cs) === norm(kal))
      );
      if (itemsToSubmit.length === 0) {
        setErrorMsg(`Pilih minimal 1 tahapan ${santriRow.satuan_label} yang belum pernah disetorkan santri.`);
        return;
      }
      setIsSubmitting(true);
      try {
        if (itemsToSubmit.length === 1) {
          const chosenKalimat = itemsToSubmit[0];
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
            itemsToSubmit,
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
          capaian: itemsToSubmit.join(', '),
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

  const handleSubmitTahfidzOnly = async () => {
    if (!santriRow.is_tahfidz) return;
    setErrorMsg('');
    const juzNum = Number(selectedJuzTahfidz) || 1;
    if (santriRow.tahfidz_completed_juz?.includes(juzNum)) {
      setErrorMsg(`Juz ${juzNum} sudah pernah disetor dan tuntas untuk santri ${santriRow.nama}.`);
      return;
    }
    const noteVal = catatanTahfidz.trim() || undefined;

    setIsSubmittingTahfidz(true);
    try {
      const itemDetail = {
        id: `tahfidz_juz_${juzNum}`,
        nama: `Juz ${juzNum}`,
        kategori: 'Tahfidz' as const,
        targetType: 'numeric' as const,
        targetAkhirAngka: 1,
        satuanAngka: 'Juz',
      };

      await addLogSetoran(
        {
          no_induk: santriRow.no_induk,
          nama_santri: santriRow.nama,
          tingkat: santriRow.tingkat,
          din_kls: santriRow.din_kls,
          din_bag: santriRow.din_bag,
          materi_nama: `Juz ${juzNum}`,
          kategori: 'Tahfidz',
          target_type: 'numeric',
          tanggal: tglSetor,
          tahun,
          tambah_angka: 1,
          catatan: noteVal,
          mustahiq: santriRow.mustahiq,
        },
        itemDetail
      );

      await addSetoran({
        no_induk: santriRow.no_induk,
        nama: santriRow.nama,
        tanggal: tglSetor,
        item_hafalan: `Juz ${juzNum}`,
        kategori: 'Tahfidz',
        penjaga: santriRow.mustahiq || 'Mustahiq Kelas',
        mustahiq: santriRow.mustahiq,
        tingkat: santriRow.tingkat,
        din_kls: santriRow.din_kls,
        din_bag: santriRow.din_bag,
        capaian: `Juz ${juzNum}`,
      });

      const remainingJuz = Array.from(
        { length: santriRow.tahfidz_target_juz || 3 },
        (_, i) => i + 1
      ).find((j) => !santriRow.tahfidz_completed_juz?.includes(j) && j !== juzNum);
      if (remainingJuz) {
        setSelectedJuzTahfidz(remainingJuz);
      }
      setCatatanTahfidz('');
      fetchMustahiqData();
      fetchSetoranData();
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan setoran tahfidz.');
    } finally {
      setIsSubmittingTahfidz(false);
    }
  };

  const handleSubmitBothSetoran = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const juzNum = Number(selectedJuzTahfidz) || 1;
    if (santriRow.tahfidz_completed_juz?.includes(juzNum)) {
      setErrorMsg(`Juz ${juzNum} sudah pernah disetor. Silakan gunakan tombol Simpan Setoran Wajib.`);
      return;
    }
    await handleSubmitTahfidzOnly();
    await handleSubmitSetoran(e || ({} as any));
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
  const handlePilihMateriBaru = async (materiNama: string, kat: 'Wajib' | 'Sunnah' | 'Kitab' | 'Tahfidz') => {
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
                {santriRow.is_tahfidz && (
                  <span className="px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 text-xs font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    Tahfidz ({santriRow.tahfidz_mode === 'simultan' ? '2 Hafalan Sekaligus' : 'Tahfidz Didahulukan'})
                  </span>
                )}
              </div>
            </div>

            {/* Target Kelas Ini */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
              <span className="text-slate-500">Target Hafalan Saat Ini:</span>
              <span className="font-bold text-slate-800 text-right">
                {santriRow.active_item.nama} ({formatTargetPreview(santriRow.active_item)})
              </span>
            </div>

            {/* Capaian Progress Bar Wajib */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  Capaian Setoran Hafalan Wajib:
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

            {/* Capaian Tahfidz Bar jika Santri Tahfidz */}
            {santriRow.is_tahfidz && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-900 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    Capaian Standar Tahfidz:
                  </span>
                  <span className="font-bold text-cyan-800 font-mono">
                    Juz {santriRow.tahfidz_progress_juz} / {santriRow.tahfidz_target_juz} ({santriRow.tahfidz_progress_pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-600 rounded-full transition-all duration-300"
                    style={{ width: `${santriRow.tahfidz_progress_pct}%` }}
                  />
                </div>
              </div>
            )}

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

          {/* 2. Form Proses Setoran (Gambar 2 - Dual Flow Tahfidz & Wajib) */}
          <div className="space-y-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Proses Setoran</h4>
              <p className="text-xs text-slate-500">
                {santriRow.is_tahfidz && santriRow.tahfidz_mode === 'simultan'
                  ? 'Santri Tahfidz (2 Hafalan Sekaligus): Anda dapat menginput setoran Tahfidz (Juz) dan Hafalan Wajib secara simultan.'
                  : santriRow.is_tahfidz && santriRow.tahfidz_mode === 'didahulukan'
                  ? 'Santri Tahfidz (Tahfidz Didahulukan): Selesaikan target standar Juz Tahfidz sebelum menyetor materi hafalan wajib.'
                  : santriRow.active_item.targetType === 'numeric'
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

            {/* Pemilih Hari Minggu pada Bulannya Bersama */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <SundayDatePicker
                value={tglSetor}
                onChange={(dateIso) => setTglSetor(dateIso)}
                label={`Tanggal Setor (Hari Minggu ${sunday.mingguKe} - ${sunday.labelLengkap})`}
              />
            </div>

            {/* KONDISI A: Santri Tahfidz dengan Mode SIMULTAN (2 Hafalan Sekaligus) */}
            {santriRow.is_tahfidz && santriRow.tahfidz_mode === 'simultan' ? (
              <div className="space-y-3">
                {/* BLOK 1: Input Setoran Tahfidz */}
                <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-700" />
                      <h5 className="text-xs font-bold text-cyan-950 uppercase tracking-wide">
                        1. Setoran Tahfidz (Standar: {santriRow.tahfidz_target_juz} Juz)
                      </h5>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-cyan-800 bg-cyan-100/80 px-2 py-0.5 rounded border border-cyan-300">
                      Juz {santriRow.tahfidz_progress_juz} / {santriRow.tahfidz_target_juz} Tuntas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                        Pilih Juz *
                      </label>
                      <select
                        data-testid="select-juz-tahfidz"
                        value={selectedJuzTahfidz}
                        onChange={(e) => setSelectedJuzTahfidz(Number(e.target.value))}
                        className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-600"
                      >
                        {Array.from(
                          { length: santriRow.tahfidz_target_juz || 3 },
                          (_, i) => i + 1
                        ).map((j) => {
                          const isDone = Boolean(santriRow.tahfidz_completed_juz?.includes(j));
                          return (
                            <option key={j} value={j} disabled={isDone}>
                              Juz {j} {isDone ? '(Sudah Disetor ✓)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                        Catatan Tahfidz (Opsional)
                      </label>
                      <input
                        type="text"
                        data-testid="input-catatan-tahfidz"
                        placeholder="Surah / ayat / juz..."
                        value={catatanTahfidz}
                        onChange={(e) => setCatatanTahfidz(e.target.value)}
                        className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSubmitTahfidzOnly()}
                      disabled={isSubmittingTahfidz || santriRow.tahfidz_completed_juz?.includes(Number(selectedJuzTahfidz))}
                      data-testid="btn-simpan-tahfidz-only"
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Simpan Setoran Tahfidz (Juz {selectedJuzTahfidz})
                    </button>
                  </div>
                </div>

                {/* BLOK 2: Input Hafalan Wajib */}
                <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-emerald-700" />
                      <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                        2. Setoran Hafalan Wajib ({santriRow.active_item?.nama})
                      </h5>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                      {santriRow.status_badge_text} ({santriRow.progress_pct}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {santriRow.active_item?.targetType === 'numeric' ? (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Tambah {santriRow.satuan_label} *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          data-testid="input-tambah-angka"
                          placeholder="1, 2, 5, 13..."
                          value={tambahAngka}
                          onChange={(e) => setTambahAngka(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
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
                                        if (isDone) return;
                                        setSelectedKalimatList((prev) =>
                                          prev.some((s) => norm(s) === norm(kal))
                                            ? prev.filter((s) => norm(s) !== norm(kal))
                                            : [...prev, kal]
                                        );
                                      }}
                                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                                        isDone
                                          ? 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed border border-dashed border-slate-200'
                                          : isSelected
                                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold cursor-pointer'
                                          : 'hover:bg-slate-50 text-slate-700 border border-transparent cursor-pointer'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={isSelected || isDone}
                                          disabled={isDone}
                                          onChange={() => {}}
                                          className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 pointer-events-none"
                                        />
                                        <span className={isDone ? 'line-through text-slate-400' : ''}>
                                          {idx + 1}. {kal}
                                        </span>
                                      </div>
                                      {isDone && (
                                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                                          ✓ Sudah Tuntas
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

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Catatan (Opsional)
                      </label>
                      <input
                        type="text"
                        data-testid="input-catatan-setor"
                        placeholder="Surah / bait / keterangan..."
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

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

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={(e) => handleSubmitSetoran(e)}
                      disabled={isSubmitting}
                      data-testid="btn-simpan-setoran-wajib"
                      className="px-3.5 py-1.5 rounded-lg bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Simpan Setoran Wajib
                      {selectedKalimatList.length > 0 && ` (${selectedKalimatList.length} Kalimat)`}
                    </button>
                  </div>
                </div>

                {/* BLOK 3: Tombol Cepat Simpan Keduanya Sekaligus */}
                {(() => {
                  const isCurrentTahfidzDone = Boolean(santriRow.tahfidz_completed_juz?.includes(Number(selectedJuzTahfidz)));
                  const isWajibReady = selectedKalimatList.length > 0;
                  const isBothDisabled = isCurrentTahfidzDone || !isWajibReady || isSubmitting || isSubmittingTahfidz;

                  return (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-50 to-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                      <div className="text-xs text-slate-700">
                        <span className="font-bold text-slate-900 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                          Simpan 2 Hafalan Sekaligus?
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {isCurrentTahfidzDone
                            ? `Juz ${selectedJuzTahfidz} sudah tuntas disetor. Gunakan tombol 'Simpan Setoran Wajib' di atas.`
                            : !isWajibReady
                            ? `Pilih tahapan kalimat hafalan wajib terlebih dahulu.`
                            : `Simpan Juz ${selectedJuzTahfidz} (Tahfidz) & materi Wajib secara bersamaan.`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSubmitBothSetoran()}
                        disabled={isBothDisabled}
                        data-testid="btn-simpan-keduanya"
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-700 hover:from-cyan-700 hover:to-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        ⚡ Simpan Keduanya Sekaligus
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : santriRow.is_tahfidz && santriRow.tahfidz_mode === 'didahulukan' ? (
              /* KONDISI B: Santri Tahfidz dengan Mode DIDAHULUKAN */
              <div className="space-y-3">
                {/* BLOK TAHFIDZ (Aktif) */}
                <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-700" />
                      <h5 className="text-xs font-bold text-cyan-950 uppercase tracking-wide">
                        Setoran Tahfidz (Prioritas Didahulukan)
                      </h5>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-cyan-800 bg-cyan-100/80 px-2 py-0.5 rounded border border-cyan-300">
                      Juz {santriRow.tahfidz_progress_juz} / {santriRow.tahfidz_target_juz} Tuntas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                        Pilih Juz *
                      </label>
                      <select
                        data-testid="select-juz-tahfidz"
                        value={selectedJuzTahfidz}
                        onChange={(e) => setSelectedJuzTahfidz(Number(e.target.value))}
                        className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-600"
                      >
                        {Array.from(
                          { length: santriRow.tahfidz_target_juz || 3 },
                          (_, i) => i + 1
                        ).map((j) => {
                          const isDone = Boolean(santriRow.tahfidz_completed_juz?.includes(j));
                          return (
                            <option key={j} value={j} disabled={isDone}>
                              Juz {j} {isDone ? '(Sudah Disetor ✓)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                        Catatan Tahfidz (Opsional)
                      </label>
                      <input
                        type="text"
                        data-testid="input-catatan-tahfidz"
                        placeholder="Surah / ayat / juz..."
                        value={catatanTahfidz}
                        onChange={(e) => setCatatanTahfidz(e.target.value)}
                        className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSubmitTahfidzOnly()}
                      disabled={isSubmittingTahfidz || santriRow.tahfidz_completed_juz?.includes(Number(selectedJuzTahfidz))}
                      data-testid="btn-simpan-tahfidz-only"
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Simpan Setoran Tahfidz (Juz {selectedJuzTahfidz})
                    </button>
                  </div>
                </div>

                {/* BLOK WAJIB: Terkunci jika belum tuntas, atau terbuka jika sudah tuntas */}
                {!santriRow.is_tahfidz_completed ? (
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>Hafalan Wajib Ditangguhkan (Prioritas Tahfidz)</span>
                    </div>
                    <p className="text-xs text-amber-800">
                      Santri ini berada dalam mode <strong>Tahfidz Didahulukan</strong>. Santri difokuskan menyelesaikan target standar Tahfidz (<strong>{santriRow.tahfidz_target_juz} Juz</strong>) terlebih dahulu sebelum dapat menyetorkan materi hafalan wajib kurikulum.
                    </p>
                    <p className="text-[11px] font-mono font-semibold text-amber-900">
                      Capaian saat ini: {santriRow.tahfidz_progress_juz} dari {santriRow.tahfidz_target_juz} Juz ({santriRow.tahfidz_progress_pct}%)
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-emerald-700" />
                        <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                          Setoran Hafalan Wajib ({santriRow.active_item?.nama})
                        </h5>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                        {santriRow.status_badge_text}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {santriRow.active_item?.targetType === 'numeric' ? (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Tambah {santriRow.satuan_label} *
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            data-testid="input-tambah-angka"
                            placeholder="1, 2, 5, 13..."
                            value={tambahAngka}
                            onChange={(e) => setTambahAngka(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
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
                                          if (isDone) return;
                                          setSelectedKalimatList((prev) =>
                                            prev.some((s) => norm(s) === norm(kal))
                                              ? prev.filter((s) => norm(s) !== norm(kal))
                                              : [...prev, kal]
                                          );
                                        }}
                                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                                          isDone
                                            ? 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed border border-dashed border-slate-200'
                                            : isSelected
                                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold cursor-pointer'
                                            : 'hover:bg-slate-50 text-slate-700 border border-transparent cursor-pointer'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isSelected || isDone}
                                            disabled={isDone}
                                            onChange={() => {}}
                                            className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 pointer-events-none"
                                          />
                                          <span className={isDone ? 'line-through text-slate-400' : ''}>
                                            {idx + 1}. {kal}
                                          </span>
                                        </div>
                                        {isDone && (
                                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            ✓ Sudah Tuntas
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

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Catatan (Opsional)
                        </label>
                        <input
                          type="text"
                          data-testid="input-catatan-setor"
                          placeholder="Surah / bait / keterangan..."
                          value={catatan}
                          onChange={(e) => setCatatan(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

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

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={(e) => handleSubmitSetoran(e)}
                        disabled={isSubmitting}
                        data-testid="btn-simpan-setoran-wajib"
                        className="px-3.5 py-1.5 rounded-lg bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Simpan Setoran Wajib
                        {selectedKalimatList.length > 0 && ` (${selectedKalimatList.length} Kalimat)`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* KONDISI C: Santri Reguler (Bukan Tahfidz) */
              <form
                onSubmit={handleSubmitSetoran}
                className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                                      if (isDone) return;
                                      setSelectedKalimatList((prev) =>
                                        prev.some((s) => norm(s) === norm(kal))
                                          ? prev.filter((s) => norm(s) !== norm(kal))
                                          : [...prev, kal]
                                      );
                                    }}
                                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                                      isDone
                                        ? 'bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed border border-dashed border-slate-200'
                                        : isSelected
                                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold cursor-pointer'
                                        : 'hover:bg-slate-50 text-slate-700 border border-transparent cursor-pointer'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected || isDone}
                                        disabled={isDone}
                                        onChange={() => {}}
                                        className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 pointer-events-none"
                                      />
                                      <span className={isDone ? 'line-through text-slate-400' : ''}>
                                        {idx + 1}. {kal}
                                      </span>
                                    </div>
                                    {isDone && (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        ✓ Sudah Tuntas
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
            )}
          </div>

          {/* 3. Riwayat Setor (Gambar 2) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                Riwayat Setor {santriRow.is_tahfidz ? '(Semua Hafalan & Tahfidz)' : `(${santriRow.active_item.nama})`}
              </h4>
              <div className="flex items-center gap-2">
                {(() => {
                  const seenSentences = new Set<string>();
                  const seenJuz = new Set<string>();
                  let dupFound = false;
                  for (const l of riwayatLogs) {
                    if (isPureTahfidz(l.materi_nama, l.kategori)) {
                      const jKey = norm(l.materi_nama);
                      if (seenJuz.has(jKey)) {
                        dupFound = true;
                        break;
                      }
                      seenJuz.add(jKey);
                    } else if (l.target_type === 'sentence' && l.kalimat_dipilih) {
                      const sKey = `${norm(l.materi_nama)}_${norm(l.kalimat_dipilih)}`;
                      if (seenSentences.has(sKey)) {
                        dupFound = true;
                        break;
                      }
                      seenSentences.add(sKey);
                    }
                  }
                  if (dupFound) {
                    return (
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            confirm(
                              `Ditemukan data setoran duplikat untuk ${santriRow.nama}. Bersihkan entri ganda sekarang?`
                            )
                          ) {
                            await deduplicateSantriLogs(santriRow.no_induk);
                            fetchMustahiqData();
                            fetchSetoranData();
                            onSuccess();
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Rapikan Duplikat</span>
                      </button>
                    );
                  }
                  return null;
                })()}
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
                  {riwayatLogs.length} Catatan
                </span>
              </div>
            </div>

            {riwayatLogs.length === 0 ? (
              <div className="p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                Belum ada riwayat setoran di tahun {tahun}.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                    <tr className="text-[11px] text-slate-500 font-semibold">
                      <th className="py-2 px-3 w-10">No</th>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">Materi / Kategori</th>
                      <th className="py-2 px-3 text-center">
                        Capaian
                      </th>
                      <th className="py-2 px-3">Rincian Status</th>
                      <th className="py-2 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {riwayatLogs.map((log, idx) => {
                      const isTahfidzLog = isPureTahfidz(log.materi_nama, log.kategori);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {log.tanggal}
                            {log.catatan && (
                              <p className="text-[10px] font-sans text-slate-400 italic">
                                {log.catatan}
                              </p>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-800">
                                {log.materi_nama}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                  isTahfidzLog
                                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                                    : log.kategori === 'Kitab'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : log.kategori === 'Sunnah'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}
                              >
                                {isTahfidzLog ? 'Tahfidz' : log.kategori || 'Wajib'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {isTahfidzLog ? (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 font-bold border border-cyan-200 text-[11px]">
                                {log.materi_nama}
                              </span>
                            ) : log.target_type === 'sentence' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                                {log.kalimat_dipilih || '1 Kalimat'}
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-700 font-mono">
                                +{log.tambah_angka || 0} {log.satuan_angka || santriRow.satuan_label}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                            {isTahfidzLog && log.status_ringkas && log.status_ringkas.toLowerCase().includes('baris')
                              ? `Tahfidz: ${log.materi_nama} (Tuntas)`
                              : log.status_ringkas || '-'}
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
                      );
                    })}
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
