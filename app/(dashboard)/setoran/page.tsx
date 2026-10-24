'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import {
  Grid,
  Save,
  Search,
  Printer,
  Award,
  User,
  Sliders,
  Trash2
} from 'lucide-react';
import ModalSettingsHafalan from '@/components/modules/setoran/ModalSettingsHafalan';

function getTodayDateTime() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function SetoranPage() {
  const { setoranList, config, fetchSetoranData, addSetoran, deleteSetoran, openSettings } = useMuhafadzohStore();
  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [filterGender, setFilterGender] = useState<'SEMUA' | 'PA' | 'PI'>('SEMUA');
  const [searchHistory, setSearchHistory] = useState('');

  // Input Form
  const [tglSetor, setTglSetor] = useState(getTodayDateTime());
  const [noInduk, setNoInduk] = useState('');
  const [namaSantri, setNamaSantri] = useState('');
  const [kelasSantri, setKelasSantri] = useState('');
  const [kamarSantri, setKamarSantri] = useState('');
  const [genderSantri, setGenderSantri] = useState('PA');
  const [kategoriHafalan, setKategoriHafalan] = useState<'wajib' | 'sunnah' | 'kitab'>('wajib');
  const [itemHafalan, setItemHafalan] = useState('');
  const [capaian, setCapaian] = useState('');
  const [nilai, setNilai] = useState('Mumtaz (A)');
  const [penjaga, setPenjaga] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSetoranData();
    if (santriList.length === 0) fetchSantri();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchSetoranData, fetchSantri, fetchAsatidz, santriList.length, asatidzList.length]);

  // Handle autocomplete matching
  const handleSelectSantri = (val: string) => {
    setNoInduk(val);
    const s = santriList.find(
      (item) => item.no_induk === val || item.nama.toLowerCase() === val.toLowerCase()
    );
    if (s) {
      setNoInduk(s.no_induk);
      setNamaSantri(s.nama);
      setKelasSantri(`${s.tingkat || ''} ${s.din_kls || ''}${s.din_bag || ''}`.trim());
      setKamarSantri(`${s.blok || ''} ${s.kamar || ''}`.trim());
      setGenderSantri(s.pa_pi || 'PA');
    }
  };

  const itemOptions = useMemo(() => {
    if (kategoriHafalan === 'wajib') return Object.keys(config.hafWajib);
    if (kategoriHafalan === 'sunnah') return Object.keys(config.hafSunnah);
    return Object.keys(config.hafKitab);
  }, [kategoriHafalan, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaSantri || !itemHafalan || !capaian) {
      alert('Mohon lengkapi data santri, mata hafalan, dan capaian ayat/bait.');
      return;
    }

    setIsSubmitting(true);
    await addSetoran({
      id: `${Date.now()}_${noInduk}`,
      tanggal: tglSetor.split('T')[0],
      no_induk: noInduk,
      nama: namaSantri,
      kelas: kelasSantri,
      kamar: kamarSantri,
      kategori: kategoriHafalan,
      item_hafalan: itemHafalan,
      capaian,
      nilai,
      penjaga: penjaga || 'Admin',
      created_at: new Date().toISOString(),
    });
    setIsSubmitting(false);

    alert(`Setoran atas nama ${namaSantri} berhasil dicatat!`);
    setCapaian('');
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return setoranList.filter((s) => {
      if (filterGender !== 'SEMUA') {
        const found = santriList.find((item) => item.no_induk === s.no_induk);
        if (found && found.pa_pi !== filterGender) return false;
      }
      if (searchHistory.trim()) {
        const q = searchHistory.toLowerCase().trim();
        return (
          s.nama.toLowerCase().includes(q) ||
          s.no_induk.toLowerCase().includes(q) ||
          s.item_hafalan.toLowerCase().includes(q) ||
          s.capaian.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [setoranList, filterGender, searchHistory, santriList]);

  // Santri's specific setoran list
  const santriSetoranHistory = useMemo(() => {
    if (!noInduk) return [];
    return setoranList.filter((s) => s.no_induk === noInduk).slice(0, 5);
  }, [setoranList, noInduk]);

  const handlePrintKartu = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Sesuai setoran.html */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <Grid className="w-6 h-6 text-madin-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Muhafadzoh Madin
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Kelola data setoran hafalan santri Madrasah Diniyyah Al Amiriyyah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Gender:</label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value as 'SEMUA' | 'PA' | 'PI')}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none"
              >
                <option value="SEMUA">Semua</option>
                <option value="PA">Putra (PA)</option>
                <option value="PI">Putri (PI)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrintKartu}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-madin-700" />
              <span>Print Kartu</span>
            </button>

            <button
              type="button"
              onClick={openSettings}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition shadow-xs flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Opsi Hafalan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tata Letak 2 Kolom: Form Input Kiri & Kartu Digital Kanan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Form Input Hafalan */}
        <div className="lg:col-span-7">
          <div className="card-panel border-t-4 border-t-madin-700 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Award className="w-5 h-5 text-madin-700" /> Form Input Hafalan Santri
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tgl &amp; Waktu Setor
                  </label>
                  <input
                    type="datetime-local"
                    value={tglSetor}
                    onChange={(e) => setTglSetor(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-madin-700 mb-1">
                    No. Induk Santri
                  </label>
                  <input
                    type="text"
                    value={noInduk}
                    onChange={(e) => handleSelectSantri(e.target.value)}
                    placeholder="Contoh: 12345..."
                    className="w-full text-xs py-2 px-3 rounded-lg border border-madin-700/60 bg-emerald-50/20 focus:outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-madin-700 mb-1">
                    Nama Lengkap Santri
                  </label>
                  <input
                    type="text"
                    value={namaSantri}
                    onChange={(e) => setNamaSantri(e.target.value)}
                    placeholder="Nama santri..."
                    className="w-full text-xs py-2 px-3 rounded-lg border border-madin-700/60 bg-emerald-50/20 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Biodata Santri Terpilih */}
              {namaSantri && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs grid grid-cols-3 gap-2">
                  <div><strong>Kelas:</strong> {kelasSantri || '-'}</div>
                  <div><strong>Kamar:</strong> {kamarSantri || '-'}</div>
                  <div><strong>Gender:</strong> {genderSantri}</div>
                </div>
              )}

              <hr className="border-slate-100" />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Kategori Hafalan
                  </label>
                  <select
                    value={kategoriHafalan}
                    onChange={(e) => {
                      setKategoriHafalan(e.target.value as 'wajib' | 'sunnah' | 'kitab');
                      setItemHafalan('');
                    }}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="wajib">Hafalan Wajib</option>
                    <option value="sunnah">Hafalan Sunnah</option>
                    <option value="kitab">Hafalan Nadhom/Kitab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Mata Hafalan
                  </label>
                  <select
                    value={itemHafalan}
                    onChange={(e) => setItemHafalan(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white"
                    required
                  >
                    <option value="">Pilih Item Hafalan...</option>
                    {itemOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Nilai / Kualitas
                  </label>
                  <select
                    value={nilai}
                    onChange={(e) => setNilai(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Mumtaz (A)">Mumtaz (A)</option>
                    <option value="Jayyid Jiddan (B+)">Jayyid Jiddan (B+)</option>
                    <option value="Jayyid (B)">Jayyid (B)</option>
                    <option value="Maqbul (C)">Maqbul (C)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Capaian (Ayat / Bait / Halaman)
                  </label>
                  <input
                    type="text"
                    value={capaian}
                    onChange={(e) => setCapaian(e.target.value)}
                    placeholder="Contoh: Ayat 1-25 / Bait 1-50..."
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Asatidz Penerima Setoran
                  </label>
                  <input
                    type="text"
                    value={penjaga}
                    onChange={(e) => setPenjaga(e.target.value)}
                    placeholder="Nama penguji/penjaga..."
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg bg-madin-700 hover:bg-madin-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Data Setoran'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Kartu Digital Muhafadzoh Santri Sesuai setoran.html */}
        <div className="lg:col-span-5">
          <div className="card-panel border-0 p-6 shadow-sm bg-gradient-to-br from-white to-slate-50 space-y-4">
            <div className="text-center border-b border-slate-200 pb-3">
              <span className="text-[10px] font-bold text-madin-700 uppercase tracking-widest block">
                Madrasah Diniyyah Al Amiriyyah
              </span>
              <h4 className="font-bold text-slate-800 text-base">
                Kartu Setoran Muhafadzoh
              </h4>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-20 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400 font-bold flex-shrink-0 shadow-inner">
                <User className="w-8 h-8" />
              </div>
              <div className="space-y-1 text-xs">
                <h5 className="font-bold text-slate-900 text-sm">
                  {namaSantri || 'Nama Santri'}
                </h5>
                <div className="text-slate-500 font-mono text-[11px]">
                  No. Induk: {noInduk || '-'}
                </div>
                <div className="text-slate-600">
                  Kelas: {kelasSantri || '-'}
                </div>
                <div className="text-slate-500 text-[11px]">
                  Kamar: {kamarSantri || '-'}
                </div>
              </div>
            </div>

            {/* Riwayat Setoran Terakhir */}
            <div className="pt-2">
              <h6 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                5 Setoran Terakhir Santri:
              </h6>
              {santriSetoranHistory.length === 0 ? (
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-slate-400 text-xs">
                  Belum ada riwayat setoran untuk santri ini.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {santriSetoranHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <strong className="text-madin-700">{h.item_hafalan}</strong>
                        <span className="text-slate-500 ml-1.5">({h.capaian})</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                        {h.nilai}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tabel Riwayat Semua Setoran */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h4 className="font-bold text-slate-800 text-base">
            Riwayat Seluruh Setoran Muhafadzoh
          </h4>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Cari nama, induk, materi..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none"
            />
          </div>
        </div>

        <div className="table-responsive overflow-x-auto">
          <table className="tabel-kbm-resmi w-full">
            <thead>
              <tr>
                <th style={{ width: 40 }}>NO</th>
                <th style={{ width: 90 }}>TANGGAL</th>
                <th style={{ width: 90 }}>INDUK</th>
                <th style={{ minWidth: 160 }}>NAMA SANTRI</th>
                <th style={{ width: 100 }}>KELAS</th>
                <th style={{ minWidth: 140 }}>MATERI HAFALAN</th>
                <th style={{ minWidth: 140 }}>CAPAIAN</th>
                <th style={{ width: 100 }}>NILAI</th>
                <th style={{ width: 120 }}>PENGUJI</th>
                <th style={{ width: 50 }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-6 text-slate-400">
                    Tidak ada riwayat setoran yang cocok.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="text-center font-bold text-slate-600">{idx + 1}</td>
                    <td className="text-center text-xs font-mono">{s.tanggal}</td>
                    <td className="text-center text-xs font-mono font-bold text-madin-700">{s.no_induk}</td>
                    <td className="font-semibold text-slate-800 px-2">{s.nama}</td>
                    <td className="text-center text-xs">{s.kelas || '-'}</td>
                    <td className="font-medium text-slate-800 px-2">{s.item_hafalan}</td>
                    <td className="text-xs text-slate-700 px-2">{s.capaian}</td>
                    <td className="text-center font-bold text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                        {s.nilai}
                      </span>
                    </td>
                    <td className="text-xs text-slate-600 px-2">{s.penjaga}</td>
                    <td className="text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Hapus catatan setoran ${s.nama}?`)) {
                            if (s.id) deleteSetoran(s.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Hapus"
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

      {/* Modal Settings */}
      <ModalSettingsHafalan />
    </div>
  );
}
