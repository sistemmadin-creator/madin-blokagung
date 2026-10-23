'use client';

import React, { useEffect, useState } from 'react';
import { useFanStore } from '@/stores/useFanStore';
import { BookOpen, Plus, RefreshCw, Edit, Trash2, Search, Building } from 'lucide-react';
import ModalPengaturanFan from '@/components/modules/fan/ModalPengaturanFan';
import ModalGrupAsal from '@/components/modules/fan/ModalGrupAsal';

export default function FanPelajaranPage() {
  const {
    fanItems,
    isLoading,
    fetchFanData,
    openModalFan,
    openModalGrup,
    deleteFanItem,
  } = useFanStore();

  const [search, setSearch] = useState('');
  const [selectedTingkat, setSelectedTingkat] = useState('SEMUA');

  useEffect(() => {
    fetchFanData();
  }, [fetchFanData]);

  const filteredItems = fanItems.filter((f) => {
    const matchTingkat = selectedTingkat === 'SEMUA' || f.tingkat === selectedTingkat;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      f.nama.toLowerCase().includes(q) ||
      f.kitab.toLowerCase().includes(q) ||
      (f.grupAsal && f.grupAsal.toLowerCase().includes(q));

    return matchTingkat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman Fan Pelajaran */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-madin-50 text-madin-700 flex items-center justify-center shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Daftar Fan Pelajaran</h1>
            <p className="text-xs text-slate-500">
              Master Mata Pelajaran Diniyyah, Kitab Rujukan, Alokasi Jam MS & MB ({fanItems.length} Fan)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchFanData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>

          <button
            onClick={openModalGrup}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <Building className="w-3.5 h-3.5 text-madin-700" />
            <span>Master Grup Asal</span>
          </button>

          <button
            onClick={() => openModalFan(null)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Fan</span>
          </button>
        </div>
      </div>

      {/* Bar Pencarian & Filter Tingkat */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-1.5 w-full sm:w-auto">
          {['SEMUA', 'Ula', 'Wustho', 'Ulya'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTingkat(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                selectedTingkat === t
                  ? 'bg-madin-700 text-white shadow-xs'
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
            placeholder="Cari fan, kitab rujukan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600"
          />
        </div>
      </div>

      {/* Tabel Fan Pelajaran */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">Nama Fan Pelajaran</th>
                <th className="p-3">Kitab Rujukan Utama</th>
                <th className="p-3">Tingkat</th>
                <th className="p-3 text-center">Jam MS (Sore)</th>
                <th className="p-3 text-center">Jam MB (Malam)</th>
                <th className="p-3">Grup Asal Pengampu</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                  <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-bold text-slate-800">{item.nama}</td>
                  <td className="p-3 font-medium text-slate-700">{item.kitab}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.tingkat}
                    </span>
                  </td>
                  <td className="p-3 text-center font-bold text-madin-700 font-mono">
                    {item.jamMS} Jam
                  </td>
                  <td className="p-3 text-center font-bold text-blue-700 font-mono">
                    {item.jamMB} Jam
                  </td>
                  <td className="p-3">
                    {item.grupAsal ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.grupAsal}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      onClick={() => openModalFan(item)}
                      className="p-1 rounded text-slate-500 hover:text-madin-700 hover:bg-slate-100"
                      title="Edit Fan"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteFanItem(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                      title="Hapus Fan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals Fan Pelajaran */}
      <ModalPengaturanFan />
      <ModalGrupAsal />
    </div>
  );
}
