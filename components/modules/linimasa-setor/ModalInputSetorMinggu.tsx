'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Trash2,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { SetoranHafalan } from '@/types/setoran';
import { SundayOption } from '@/lib/utils/sundayHelper';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { DEFAULT_HAFALAN_WAJIB } from '@/lib/utils/setoranHelper';

interface ModalInputSetorMingguProps {
  isOpen: boolean;
  onClose: () => void;
  santri: {
    no_induk: string;
    nama: string;
    displayKelas: string;
    tingkat?: string;
    din_kls?: string;
  };
  sunday: SundayOption;
  existingRecords: SetoranHafalan[];
  onSuccess: () => void;
}

export const ModalInputSetorMinggu: React.FC<ModalInputSetorMingguProps> = ({
  isOpen,
  onClose,
  santri,
  sunday,
  existingRecords,
  onSuccess,
}) => {
  const { addSetoran, deleteSetoran } = useMuhafadzohStore();

  // Suggestions berdasarkan tingkat & kelas
  const keyHafalan = `${santri.tingkat || 'ULA'}_${santri.din_kls || '1'}`.toUpperCase();
  const suggestions = DEFAULT_HAFALAN_WAJIB[keyHafalan] || [
    "Juz Amma' (An-Naas - Adh-Dhuha)",
    'Aqidatul Awam',
    'Tasrif Istilahi',
    'Nadhom Al-Imrithi',
    'Al-Fiyyah 350',
  ];

  const [itemHafalan, setItemHafalan] = useState<string>(suggestions[0] || '');
  const [customItem, setCustomItem] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [kategori, setKategori] = useState<string>('Wajib');
  const [mustahiq, setMustahiq] = useState<string>('');
  const [catatan, setCatatan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalItem = isCustom ? customItem.trim() : itemHafalan.trim();
    if (!finalItem) {
      setErrorMsg('Item hafalan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newRecord: SetoranHafalan = {
        no_induk: santri.no_induk,
        nama: santri.nama,
        tanggal: sunday.tanggal, // Format YYYY-MM-DD
        penjaga: mustahiq.trim() || 'Mustahiq Kelas',
        mustahiq: mustahiq.trim() || 'Mustahiq Kelas',
        tingkat: santri.tingkat || 'ULA',
        din_kls: santri.din_kls || '1',
        item_hafalan: finalItem,
        kategori,
        capaian: catatan.trim() || 'Tuntas',
      };

      const ok = await addSetoran(newRecord);
      if (ok) {
        onSuccess();
        // Reset form
        setCatatan('');
        if (isCustom) setCustomItem('');
      } else {
        setErrorMsg('Gagal menyimpan setoran. Silakan coba lagi.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem saat menyimpan setoran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (record: SetoranHafalan) => {
    if (!window.confirm(`Hapus catatan setoran "${record.item_hafalan}" ini?`)) return;
    try {
      if (record.id) {
        await deleteSetoran(record.id);
      } else {
        await deleteSetoran({
          noInduk: record.no_induk,
          tglSetor: record.tanggal,
          hafalan: record.item_hafalan,
        });
      }
      onSuccess();
    } catch (err) {
      console.error('Gagal menghapus record:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Setoran Hari Minggu</h2>
              <p className="text-[11px] text-emerald-100/90">{sunday.labelLengkap}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-emerald-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Card Info Santri */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-900">{santri.nama}</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                NIS: {santri.no_induk}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200">
                <GraduationCap className="w-3.5 h-3.5" />
                {santri.displayKelas}
              </span>
            </div>
          </div>

          {/* Riwayat Setoran pada Minggu Ini (jika sudah ada) */}
          {existingRecords.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Setoran Tercatat ({existingRecords.length})
                </h3>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Status: Sudah Setor
                </span>
              </div>

              <div className="space-y-1.5">
                {existingRecords.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{rec.item_hafalan}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-white border border-emerald-200 rounded text-emerald-800">
                          {rec.kategori}
                        </span>
                      </div>
                      {rec.capaian && (
                        <p className="text-[11px] text-slate-600 font-medium pl-5">
                          Capaian/Ket: {rec.capaian}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 pl-5">
                        Mustahiq: {rec.mustahiq || rec.penjaga || '-'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteRecord(rec)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Hapus rekaman ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Tambah Setoran */}
          <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-700" />
                {existingRecords.length > 0 ? 'Tambah Setoran Lagi' : 'Input Setoran Baru'}
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                {sunday.formattedDisplay}
              </span>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Pilihan Materi */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">
                Materi Hafalan *
              </label>
              {!isCustom ? (
                <div className="space-y-1.5">
                  <select
                    value={itemHafalan}
                    onChange={(e) => setItemHafalan(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                  >
                    {suggestions.map((sug) => (
                      <option key={sug} value={sug}>
                        {sug}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsCustom(true)}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold"
                  >
                    + Ketik materi kustom lainnya...
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value)}
                    placeholder="Nama kitab, surah, atau nadhom..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustom(false)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    ← Kembali ke daftar materi standar
                  </button>
                </div>
              )}
            </div>

            {/* Kategori & Mustahiq */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kategori
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                >
                  <option value="Wajib">Wajib (Silabus)</option>
                  <option value="Sunnah">Sunnah</option>
                  <option value="Tahfidz">Tahfidz</option>
                  <option value="Kitab">Kitab</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mustahiq / Penjaga
                </label>
                <input
                  type="text"
                  placeholder="Nama ustadz / mustahiq..."
                  value={mustahiq}
                  onChange={(e) => setMustahiq(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Catatan / Detail Kalimat / Bait */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Catatan Capaian (Ayat / Bait / Halaman)
              </label>
              <input
                type="text"
                placeholder="Contoh: Ayat 1-15, Bait 1-20, Tuntas..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Menyimpan...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Setoran</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalInputSetorMinggu;
