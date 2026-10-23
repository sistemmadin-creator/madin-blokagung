'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { FormasiWithStats } from '@/types/formasi';
import {
  Layers,
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  MapPin,
} from 'lucide-react';
import ModalInputFormasi from '@/components/modules/formasi/ModalInputFormasi';
import ModalDetailFormasi from '@/components/modules/formasi/ModalDetailFormasi';
import ModalGeneratorFormasi from '@/components/modules/formasi/ModalGeneratorFormasi';

export default function FormasiPaPage() {
  const { formasiList, isLoading, fetchFormasi, openInputModal, openGeneratorModal, openDetailModal } = useFormasiStore();
  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [selectedTingkat, setSelectedTingkat] = useState<string>('SEMUA');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    fetchFormasi();
    if (santriList.length === 0) fetchSantri();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchFormasi, fetchSantri, fetchAsatidz, santriList.length, asatidzList.length]);

  // Enrich formasi PA with santri counts and wali kelas matching
  const enrichedFormasiList: FormasiWithStats[] = useMemo(() => {
    const listPA = formasiList.filter((f) => f.pa_pi === 'PA');

    return listPA.map((f) => {
      // 1. Calculate santri count
      const matchingSantri = santriList.filter(
        (s) =>
          s.pa_pi === 'PA' &&
          String(s.tingkat || '').toUpperCase() === String(f.tingkat).toUpperCase() &&
          String(s.din_kls || '').toUpperCase() === String(f.din_kls).toUpperCase() &&
          String(s.din_bag || '').toUpperCase() === String(f.din_bag).toUpperCase()
      );
      const count = matchingSantri.length;
      const kapasitas = f.kapasitas_maksimal || 45;
      const persentase = Math.round((count / kapasitas) * 100);

      // 2. Sync wali kelas with Asatidz
      const matchedAsatidz = asatidzList.filter((a) => {
        const jah = String(a.jah_asatidz || '').toUpperCase();
        const validJah = ['MUSTAHIQ', 'MS & KOOR', 'MUSTAHIQOH'];
        if (!validJah.includes(jah)) return false;

        return (
          a.pa_pi === 'PA' &&
          String(a.tingkat_asatidz || '').toUpperCase() === String(f.tingkat).toUpperCase() &&
          String(a.din_kls_asatidz || '').toUpperCase() === String(f.din_kls).toUpperCase() &&
          String(a.din_bag_asatidz || '').toUpperCase() === String(f.din_bag).toUpperCase()
        );
      });

      const waliKelasText =
        matchedAsatidz.length > 0
          ? matchedAsatidz.map((a) => a.nama_asatidz).join(', ')
          : f.id_mustahiq || '';

      return {
        ...f,
        jumlah_santri: count,
        persentase,
        wali_kelas_text: waliKelasText,
      };
    });
  }, [formasiList, santriList, asatidzList]);

  // Filtered by Tingkat and Search
  const filteredList = useMemo(() => {
    return enrichedFormasiList.filter((f) => {
      const matchTingkat =
        selectedTingkat === 'SEMUA' ||
        String(f.tingkat).toUpperCase() === selectedTingkat.toUpperCase();

      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        f.tingkat.toLowerCase().includes(q) ||
        f.din_kls.toLowerCase().includes(q) ||
        f.din_bag.toLowerCase().includes(q) ||
        (f.wali_kelas_text && f.wali_kelas_text.toLowerCase().includes(q)) ||
        (f.domisili && f.domisili.toLowerCase().includes(q));

      return matchTingkat && matchSearch;
    });
  }, [enrichedFormasiList, selectedTingkat, search]);

  const totalSantriPA = enrichedFormasiList.reduce((acc, f) => acc + f.jumlah_santri, 0);
  const totalKapasitasPA = enrichedFormasiList.reduce((acc, f) => acc + f.kapasitas_maksimal, 0);

  return (
    <div className="space-y-6">
      {/* Header Formasi PA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-xs">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">Formasi Kelas Putra (PA)</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                Santri Putra
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Total {enrichedFormasiList.length} Rombel | {totalSantriPA} Santri Terdaftar (Kapasitas: {totalKapasitasPA})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchFormasi}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>

          <button
            onClick={openGeneratorModal}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generator Rombel</span>
          </button>

          <button
            onClick={() => openInputModal(null)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Rombel</span>
          </button>
        </div>
      </div>

      {/* Tabs Filter Tingkat & Bar Pencarian */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['SEMUA', 'Ula', 'Wustho', 'Ulya'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTingkat(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                selectedTingkat === t
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {t === 'SEMUA' ? 'Semua Tingkat' : `Tingkat ${t}`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kelas, wali kelas, blok..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Grid Kartu Formasi Kelas PA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Memuat pembagian formasi kelas putra...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            Belum ada data rombel kelas putra untuk kriteria ini.
          </div>
        ) : (
          filteredList.map((f) => {
            const isFull = f.jumlah_santri >= f.kapasitas_maksimal;
            return (
              <div
                key={f.id || `${f.tingkat}-${f.din_kls}-${f.din_bag}`}
                onClick={() => openDetailModal(f)}
                className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer p-4 space-y-3 relative group"
              >
                {/* Header Card */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-blue-700 uppercase">
                        {f.tingkat}
                      </span>
                      {f.is_unggulan && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                          Unggulan
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mt-0.5">
                      Kelas {f.din_kls} - {f.din_bag}
                    </h3>
                  </div>

                  <span className="text-xs font-mono font-bold px-2 py-1 bg-slate-100 rounded-lg text-slate-700">
                    {f.jumlah_santri} / {f.kapasitas_maksimal}
                  </span>
                </div>

                {/* Progress Bar Rasio Santri */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull
                          ? 'bg-rose-500'
                          : f.persentase > 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(f.persentase, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Keterisian Kelas</span>
                    <span className="font-semibold text-slate-600">{f.persentase}%</span>
                  </div>
                </div>

                {/* Info Wali Kelas & Domisili */}
                <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="truncate">
                      {f.wali_kelas_text || f.id_mustahiq || 'Belum ada Mustahiq'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{f.domisili || 'Blok belum diatur'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals Formasi PA */}
      <ModalInputFormasi gender="PA" />
      <ModalDetailFormasi />
      <ModalGeneratorFormasi gender="PA" />
    </div>
  );
}
