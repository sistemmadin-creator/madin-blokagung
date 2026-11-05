'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { KelasKonsorsium, JenisKonsorsium } from '@/types/konsorsium';
import { parseFanItemString } from '@/lib/utils/fanHelper';
import {
  BookOpen,
  UserCheck,
  Building2,
  Check,
  ChevronDown,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';

interface ModalBuatKelasKonsorsiumProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: KelasKonsorsium | null;
}

const TINGKAT_OPTIONS = ['ULA', 'WUSTHO', 'ULYA', "ISTI'DAD"];

export default function ModalBuatKelasKonsorsium({
  isOpen,
  onClose,
  editData,
}: ModalBuatKelasKonsorsiumProps) {
  const { tambahKelasKonsorsium, updateKelasKonsorsium } = useKonsorsiumStore();
  const { fanConfig, fetchFanData } = useFanStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [tingkat, setTingkat] = useState('ULA');
  const [jenisKonsor, setJenisKonsor] = useState<JenisKonsorsium>('Mustahiq/qoh');
  const [namaKelas, setNamaKelas] = useState('');
  const [pembimbingNama, setPembimbingNama] = useState('');
  const [pembimbingNia, setPembimbingNia] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combobox Fan State
  const [isFanDropdownOpen, setIsFanDropdownOpen] = useState(false);
  const fanDropdownRef = useRef<HTMLDivElement>(null);

  // Combobox Pembimbing State
  const [isPembimbingDropdownOpen, setIsPembimbingDropdownOpen] = useState(false);
  const [pembimbingSearch, setPembimbingSearch] = useState('');
  const pembimbingDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (Object.keys(fanConfig).length === 0) fetchFanData();
      if (asatidzList.length === 0) fetchAsatidz();

      if (editData) {
        setTingkat(editData.tingkat || 'ULA');
        setJenisKonsor(editData.jenisKonsor || 'Mustahiq/qoh');
        setNamaKelas(editData.namaKelas || '');
        setPembimbingNama(editData.pembimbingNama || '');
        setPembimbingNia(editData.pembimbingNia || '');
        setKeterangan(editData.keterangan || '');
        setPembimbingSearch(editData.pembimbingNama || '');
      } else {
        setTingkat('ULA');
        setJenisKonsor('Mustahiq/qoh');
        setNamaKelas('');
        setPembimbingNama('');
        setPembimbingNia('');
        setKeterangan('');
        setPembimbingSearch('');
      }
      setErrorMsg('');
    }
  }, [isOpen, editData, fanConfig, asatidzList.length, fetchFanData, fetchAsatidz]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        fanDropdownRef.current &&
        !fanDropdownRef.current.contains(e.target as Node)
      ) {
        setIsFanDropdownOpen(false);
      }
      if (
        pembimbingDropdownRef.current &&
        !pembimbingDropdownRef.current.contains(e.target as Node)
      ) {
        setIsPembimbingDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ekstrak daftar Fan Pelajaran unik dari `fanConfig`
  const daftarFanOpsi = useMemo(() => {
    const setFan = new Set<string>();
    const fullItems: string[] = [];

    Object.values(fanConfig).forEach((items) => {
      if (Array.isArray(items)) {
        items.forEach((raw) => {
          const parsed = parseFanItemString(raw);
          if (parsed.fan && parsed.fan !== '-') {
            setFan.add(parsed.fan);
          }
          if (parsed.mapel && parsed.mapel !== '-') {
            fullItems.push(`${parsed.fan} - ${parsed.mapel}`);
          }
        });
      }
    });

    const kategoriUtama = Array.from(setFan).sort();
    return {
      kategori: kategoriUtama.length > 0
        ? kategoriUtama
        : ['Fiqih', 'Nahwu', 'Shorof', 'Tauhid', 'Akhlaq', 'Tajwid', 'Tarikh', 'Hadits'],
      detailItems: Array.from(new Set(fullItems)).slice(0, 30),
    };
  }, [fanConfig]);

  // Filter fan options berdasarkan apa yang sedang diketik
  const filteredFanKategori = useMemo(() => {
    const q = namaKelas.toLowerCase().trim();
    if (!q) return daftarFanOpsi.kategori;
    return daftarFanOpsi.kategori.filter((f) => f.toLowerCase().includes(q));
  }, [daftarFanOpsi.kategori, namaKelas]);

  // Filter asatidz untuk pembimbing
  const filteredAsatidz = useMemo(() => {
    const q = pembimbingSearch.toLowerCase().trim();
    if (!q) return asatidzList.slice(0, 50);
    return asatidzList
      .filter(
        (a) =>
          a.nama_asatidz?.toLowerCase().includes(q) || a.nia?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [asatidzList, pembimbingSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tingkat.trim()) {
      setErrorMsg('Harap pilih tingkat kelas');
      return;
    }
    if (!namaKelas.trim()) {
      setErrorMsg('Harap isi atau pilih nama kelas konsorsium');
      return;
    }
    if (!pembimbingNama.trim()) {
      setErrorMsg('Harap pilih atau masukkan nama pembimbing kelas');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editData) {
        await updateKelasKonsorsium(editData.id, {
          tingkat,
          jenisKonsor,
          namaKelas: namaKelas.trim(),
          pembimbingNama: pembimbingNama.trim(),
          pembimbingNia: pembimbingNia.trim(),
          keterangan: keterangan.trim(),
        });
      } else {
        await tambahKelasKonsorsium({
          tingkat,
          jenisKonsor,
          namaKelas: namaKelas.trim(),
          pembimbingNama: pembimbingNama.trim(),
          pembimbingNia: pembimbingNia.trim(),
          keterangan: keterangan.trim(),
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menyimpan kelas konsorsium.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editData ? 'Ubah Kelas Konsorsium' : 'Buat Kelas Konsorsium Baru'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Tingkat Kelas */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Tingkat Kelas <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TINGKAT_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTingkat(t)}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                  tingkat === t
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-semibold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Jenis Konsor */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Jenis Konsor <span className="text-rose-500">*</span></span>
            <span className="text-[11px] font-normal text-slate-400">
              {jenisKonsor === 'Mustahiq/qoh' ? 'Pertemuan: Setiap Hari Kamis' : 'Pertemuan: Setiap Hari Selasa'}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setJenisKonsor('Mustahiq/qoh')}
              className={`p-3 rounded-xl border text-left transition-all ${
                jenisKonsor === 'Mustahiq/qoh'
                  ? 'bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-600'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Mustahiq/qoh</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Hari Kamis
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Konsorsium forum mustahiq/mustahiqoh
              </p>
            </button>

            <button
              type="button"
              onClick={() => setJenisKonsor('Munawib/bah')}
              className={`p-3 rounded-xl border text-left transition-all ${
                jenisKonsor === 'Munawib/bah'
                  ? 'bg-teal-50/80 border-teal-600 ring-1 ring-teal-600'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Munawib/bah</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Hari Selasa
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Konsorsium forum munawib/munawibah
              </p>
            </button>
          </div>
        </div>

        {/* 3. Nama Kelas (Ketik / Pilih dari Fan Pelajaran) */}
        <div className="relative" ref={fanDropdownRef}>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              Nama Kelas Konsorsium (Fan Pelajaran) <span className="text-rose-500">*</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              Ketik atau pilih dari daftar
            </span>
          </label>

          <div className="relative">
            <input
              type="text"
              value={namaKelas}
              onChange={(e) => {
                setNamaKelas(e.target.value);
                setIsFanDropdownOpen(true);
              }}
              onFocus={() => setIsFanDropdownOpen(true)}
              placeholder="Contoh: Fiqih, Nahwu, Shorof..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10 text-slate-800"
            />
            <button
              type="button"
              onClick={() => setIsFanDropdownOpen((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Cepat:
            </span>
            {daftarFanOpsi.kategori.slice(0, 6).map((fan) => (
              <button
                key={fan}
                type="button"
                onClick={() => {
                  setNamaKelas(fan);
                  setIsFanDropdownOpen(false);
                }}
                className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                  namaKelas === fan
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {fan}
              </button>
            ))}
          </div>

          {/* Dropdown Menu Fan */}
          {isFanDropdownOpen && (
            <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
              <div className="p-2 border-b border-slate-100 bg-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Fan Pelajaran Terdaftar ({filteredFanKategori.length})
              </div>
              {filteredFanKategori.length > 0 ? (
                filteredFanKategori.map((fan) => (
                  <button
                    key={fan}
                    type="button"
                    onClick={() => {
                      setNamaKelas(fan);
                      setIsFanDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between transition-colors border-b border-slate-50 last:border-b-0"
                  >
                    <span>{fan}</span>
                    {namaKelas === fan && (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  Tekan enter untuk menggunakan &quot;{namaKelas}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Pembimbing Kelas */}
        <div className="relative" ref={pembimbingDropdownRef}>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              Pembimbing Kelas <span className="text-rose-500">*</span>
            </span>
            {pembimbingNia && (
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                NIA: {pembimbingNia}
              </span>
            )}
          </label>

          <div className="relative">
            <input
              type="text"
              value={pembimbingSearch}
              onChange={(e) => {
                setPembimbingSearch(e.target.value);
                setPembimbingNama(e.target.value);
                setIsPembimbingDropdownOpen(true);
              }}
              onFocus={() => setIsPembimbingDropdownOpen(true)}
              placeholder="Cari nama atau NIA asatidz pembimbing..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 pr-10 text-slate-800"
            />
            <button
              type="button"
              onClick={() => setIsPembimbingDropdownOpen((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Dropdown Pembimbing */}
          {isPembimbingDropdownOpen && (
            <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
              <div className="p-2 border-b border-slate-100 bg-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Pilih Dari Master Asatidz ({filteredAsatidz.length})
              </div>
              {filteredAsatidz.length > 0 ? (
                filteredAsatidz.map((a) => (
                  <button
                    key={a.id || a.nia}
                    type="button"
                    onClick={() => {
                      setPembimbingNama(a.nama_asatidz);
                      setPembimbingNia(a.nia || '');
                      setPembimbingSearch(a.nama_asatidz);
                      setIsPembimbingDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center justify-between transition-colors border-b border-slate-50 last:border-b-0"
                  >
                    <div>
                      <div className="font-medium text-slate-800">{a.nama_asatidz}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        NIA: {a.nia || '-'}
                      </div>
                    </div>
                    {pembimbingNama === a.nama_asatidz && (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  Gunakan nama &quot;{pembimbingSearch}&quot; secara manual
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Keterangan / Catatan Tambahan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Keterangan / Jadwal Rutin (Opsional)
          </label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            onFocus={() => {
              setIsFanDropdownOpen(false);
              setIsPembimbingDropdownOpen(false);
            }}
            rows={2}
            placeholder="Contoh: Pertemuan setiap Malam Selasa ba'da Isya di Aula Madin"
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <span>Menyimpan...</span>
            ) : (
              <span>{editData ? 'Simpan Perubahan' : 'Buat Kelas Konsorsium'}</span>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
