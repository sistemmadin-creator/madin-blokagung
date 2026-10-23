'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { Clock, Settings, Save, Search, RefreshCw, Trash2, Download, Award } from 'lucide-react';
import { exportToExcel } from '@/lib/utils/excel';
import ModalSettingsHafalan from '@/components/modules/setoran/ModalSettingsHafalan';

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SetoranPage() {
  const { setoranList, config, fetchSetoranData, addSetoran, deleteSetoran, openSettings, isLoading } = useMuhafadzohStore();
  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [search, setSearch] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<'wajib' | 'sunnah' | 'kitab'>('wajib');

  // Input Form State
  const [noInduk, setNoInduk] = useState('');
  const [namaSantri, setNamaSantri] = useState('');
  const [kelasSantri, setKelasSantri] = useState('');
  const [kamarSantri, setKamarSantri] = useState('');
  const [itemHafalan, setItemHafalan] = useState('');
  const [capaian, setCapaian] = useState('');
  const [nilai, setNilai] = useState('Mumtaz (A)');
  const [penjaga, setPenjaga] = useState('');
  const [tanggal, setTanggal] = useState(getTodayString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSetoranData();
    if (santriList.length === 0) fetchSantri();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchSetoranData, fetchSantri, fetchAsatidz, santriList.length, asatidzList.length]);

  // Handle santri selection from autocomplete
  const handleSantriSelect = (inputVal: string) => {
    setNoInduk(inputVal);
    const found = santriList.find(
      (s) => s.no_induk === inputVal || s.nama.toUpperCase() === inputVal.toUpperCase()
    );
    if (found) {
      setNoInduk(found.no_induk);
      setNamaSantri(found.nama);
      setKelasSantri(`${found.tingkat || ''} ${found.din_kls || ''}${found.din_bag || ''}`.trim());
      setKamarSantri(`${found.blok || ''} ${found.kamar || ''}`.trim());
    }
  };

  // Available item options based on category
  const itemOptions = useMemo(() => {
    if (selectedKategori === 'wajib') return Object.keys(config.hafWajib);
    if (selectedKategori === 'sunnah') return Object.keys(config.hafSunnah);
    return Object.keys(config.hafKitab);
  }, [selectedKategori, config]);

  // Available penjaga options
  const penjagaOptions = useMemo(() => {
    const list = asatidzList.map((a) => a.nama_asatidz);
    const merged = Array.from(new Set([...list, ...config.penjagaBebas])).sort();
    return merged;
  }, [asatidzList, config.penjagaBebas]);

  const handleSubmitSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaSantri || !itemHafalan || !capaian || !penjaga) {
      alert('Mohon lengkapi Nama Santri, Nadhom/Kitab, Capaian, dan Ustadz Penjaga');
      return;
    }

    setIsSubmitting(true);
    const success = await addSetoran({
      no_induk: noInduk,
      nama: namaSantri,
      kelas: kelasSantri,
      kamar: kamarSantri,
      kategori: selectedKategori,
      item_hafalan: itemHafalan,
      capaian,
      nilai,
      penjaga,
      tanggal,
    });
    setIsSubmitting(false);

    if (success) {
      setCapaian('');
      alert('Setoran berhasil dicatat!');
    }
  };

  const filteredSetoran = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return setoranList;
    return setoranList.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        s.no_induk.toLowerCase().includes(q) ||
        s.item_hafalan.toLowerCase().includes(q) ||
        s.penjaga.toLowerCase().includes(q) ||
        s.kamar.toLowerCase().includes(q)
    );
  }, [setoranList, search]);

  const handleExport = () => {
    const data = filteredSetoran.map((s, idx) => ({
      No: idx + 1,
      Tanggal: s.tanggal,
      'No. Induk': s.no_induk,
      Nama: s.nama,
      Kelas: s.kelas,
      Kamar: s.kamar,
      Kategori: s.kategori.toUpperCase(),
      'Item Hafalan': s.item_hafalan,
      Capaian: s.capaian,
      Nilai: s.nilai,
      Penjaga: s.penjaga,
    }));
    exportToExcel(data, 'Riwayat_Setoran_Muhafadzoh_Madin');
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-madin-50 text-madin-700 flex items-center justify-center shadow-xs">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Setoran Muhafadzoh Madin</h1>
            <p className="text-xs text-slate-500">
              Pencatatan Setoran Hafalan Wajib, Sunnah, dan Nadhom Kitab Diniyyah ({setoranList.length} Catatan)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openSettings}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Target & Penjaga Bebas</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Panel Formulir Input Setoran */}
      <form onSubmit={handleSubmitSetoran} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-madin-700 border-b pb-2 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-madin-700" />
          Formulir Catat Setoran Baru
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Santri (Cari No. Induk / Nama) <span className="text-rose-500">*</span>
            </label>
            <input
              list="listSantriSetoran"
              value={noInduk}
              onChange={(e) => handleSantriSelect(e.target.value)}
              placeholder="Ketik no induk atau nama..."
              required
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600 font-medium"
            />
            <datalist id="listSantriSetoran">
              {santriList.map((s) => (
                <option key={s.no_induk} value={s.no_induk}>
                  {s.nama} ({s.blok} {s.kamar})
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Santri</label>
            <input
              type="text"
              value={namaSantri}
              readOnly
              placeholder="Otomatis terisi..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas & Kamar</label>
            <input
              type="text"
              value={kelasSantri ? `${kelasSantri} | Kamar ${kamarSantri}` : ''}
              readOnly
              placeholder="Otomatis..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Setoran</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Hafalan</label>
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value as 'wajib' | 'sunnah' | 'kitab')}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="wajib">Hafalan Wajib (Nadhom)</option>
              <option value="sunnah">Hafalan Sunnah / Pilihan</option>
              <option value="kitab">Nadhom Kitab Diniyyah</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Judul Nadhom / Kitab <span className="text-rose-500">*</span>
            </label>
            <select
              value={itemHafalan}
              onChange={(e) => setItemHafalan(e.target.value)}
              required
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
            >
              <option value="">Pilih Nadhom / Kitab...</option>
              {itemOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Capaian Bait / Halaman <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={capaian}
              onChange={(e) => setCapaian(e.target.value)}
              required
              placeholder="Contoh: Bait 1 - 50 / Khatam"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nilai Predikat</label>
            <select
              value={nilai}
              onChange={(e) => setNilai(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white font-medium"
            >
              <option value="Mumtaz (A)">Mumtaz (A)</option>
              <option value="Jayyid Jiddan (B+)">Jayyid Jiddan (B+)</option>
              <option value="Jayyid (B)">Jayyid (B)</option>
              <option value="Maqbul (C)">Maqbul (C)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end justify-between gap-3 pt-2">
          <div className="w-full sm:w-80">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ustadz Penjaga Setoran <span className="text-rose-500">*</span>
            </label>
            <input
              list="listPenjagaSetoran"
              value={penjaga}
              onChange={(e) => setPenjaga(e.target.value)}
              required
              placeholder="Pilih atau ketik ustadz..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600"
            />
            <datalist id="listPenjagaSetoran">
              {penjagaOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </datalist>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Catatan Setoran'}</span>
          </button>
        </div>
      </form>

      {/* Bar Pencarian Riwayat */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari riwayat nama santri, kitab, penjaga..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600"
          />
        </div>
      </div>

      {/* Tabel Riwayat Setoran */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[550px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold z-10 select-none">
              <tr>
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">No. Induk</th>
                <th className="p-3">Nama Lengkap Santri</th>
                <th className="p-3">Kelas / Kamar</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Item Nadhom / Kitab</th>
                <th className="p-3 font-bold text-slate-800">Capaian Bait</th>
                <th className="p-3 text-center">Nilai</th>
                <th className="p-3">Penjaga Setoran</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-madin-600" />
                    Memuat riwayat setoran muhafadzoh...
                  </td>
                </tr>
              ) : filteredSetoran.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    Belum ada riwayat setoran muhafadzoh tercatat.
                  </td>
                </tr>
              ) : (
                filteredSetoran.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{s.tanggal}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{s.no_induk}</td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{s.nama}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {s.kelas} {s.kamar && `(${s.kamar})`}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase">
                        {s.kategori}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-madin-800 whitespace-nowrap">{s.item_hafalan}</td>
                    <td className="p-3 font-bold text-slate-800 whitespace-nowrap">{s.capaian}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {s.nilai || 'A'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{s.penjaga}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => s.id && deleteSetoran(s.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus Setoran"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalSettingsHafalan />
    </div>
  );
}
