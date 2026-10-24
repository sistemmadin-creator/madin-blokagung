'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useJadwalStore, LIST_HARI } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFanStore } from '@/stores/useFanStore';
import {
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Grid,
  BookOpen,
  Star,
  Pencil,
  X,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Urutan Tingkat Diniyyah
const URUTAN_TINGKAT: Record<string, number> = {
  "ISTI'DAD": 0,
  ULA: 1,
  WUSTHO: 2,
  ULYA: 3,
};

interface SesiSlot {
  kg: string;
  fan: string;
  guru: string;
  jah?: string;
  lokasiGabungan?: string;
}

interface KelasKbmItem {
  key: string;
  tingkat: string;
  kls: string;
  bag: string;
  papi: string;
  mustahiqNama: string;
  mustahiqKG: string;
  mustahiqJah: string;
  lokal: string;
  jadwal: Record<string, Record<1 | 2, SesiSlot[]>>;
}

export default function JadwalKbmPage() {
  const { jadwalMap, fetchJadwal, isLoading } = useJadwalStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { fanItems, fetchFanData } = useFanStore();

  // Filters
  const [fltTingkat, setFltTingkat] = useState<string>('');
  const [fltGender, setFltGender] = useState<string>('');
  const [fltSearch, setFltSearch] = useState<string>('');
  const [switchMode, setSwitchMode] = useState<'semua' | 'reguler' | 'unggulan'>('semua');

  // Modal State
  const [selectedKelas, setSelectedKelas] = useState<KelasKbmItem | null>(null);

  useEffect(() => {
    fetchJadwal();
    if (formasiList.length === 0) fetchFormasi();
    if (asatidzList.length === 0) fetchAsatidz();
    if (fanItems.length === 0) fetchFanData();
  }, [fetchJadwal, fetchFormasi, fetchAsatidz, fetchFanData, formasiList.length, asatidzList.length, fanItems.length]);

  // Dynamic Academic Year calculation
  const tahunAjaran = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const masehiStart = month >= 6 ? year : year - 1;
    const masehiEnd = masehiStart + 1;
    const hijriStart = masehiStart - 579;
    const hijriEnd = hijriStart + 1;
    return `TAHUN AJARAN ${masehiStart}-${masehiEnd} M / ${hijriStart}-${hijriEnd} H`;
  }, []);

  // Normalisasi string untuk pencocokan kelas
  const normalisasiNamaKelas = (str: string) => {
    return String(str || '')
      .toUpperCase()
      .replace(/[\(\)\-\_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isKelasUnggulan = (str: string) => {
    return /\(ug\)|\bunggulan\b/i.test(str);
  };

  // Build Full Class Schedule Matrix
  const masterStrukturKelasKBM = useMemo(() => {
    // 1. Kamus profil Asatidz by upper name
    const asatidzMap = new Map<string, (typeof asatidzList)[0]>();
    asatidzList.forEach((a) => {
      if (a.nama_asatidz) {
        asatidzMap.set(a.nama_asatidz.trim().toUpperCase(), a);
      }
    });

    const buatObjekKelasKosong = (
      key: string,
      tingkat: string,
      kls: string,
      bag: string,
      papi: string,
      lokal = '-'
    ): KelasKbmItem => ({
      key,
      tingkat,
      kls,
      bag,
      papi,
      mustahiqNama: '-',
      mustahiqKG: '-',
      mustahiqJah: '-',
      lokal: lokal || '-',
      jadwal: {
        Sabtu: { 1: [], 2: [] },
        Ahad: { 1: [], 2: [] },
        Senin: { 1: [], 2: [] },
        Selasa: { 1: [], 2: [] },
        Rabu: { 1: [], 2: [] },
        Kamis: { 1: [], 2: [] },
      },
    });

    const mapKelas: Record<string, KelasKbmItem> = {};

    // 2A. Ekstraksi struktur dari formasi
    formasiList.forEach((f) => {
      const tingkat = String(f.tingkat || '').trim().toUpperCase();
      const bag = String(f.din_bag || '').trim().toUpperCase();
      const kls = String(f.din_kls || '').trim();
      const papi = String(f.pa_pi || '').trim().toUpperCase();
      const lokal = String(f.lokasi_diniyyah || '').trim();

      if (tingkat && kls && bag) {
        const key = `${kls} ${bag} ${tingkat} ${papi}`.trim();
        if (!mapKelas[key]) {
          mapKelas[key] = buatObjekKelasKosong(key, tingkat, kls, bag, papi, lokal || '-');
        } else if (lokal) {
          mapKelas[key].lokal = lokal;
        }

        if (f.id_mustahiq) {
          const namaM = String(f.id_mustahiq).trim();
          const profilM = asatidzMap.get(namaM.toUpperCase());
          mapKelas[key].mustahiqNama = namaM;
          if (profilM) {
            mapKelas[key].mustahiqKG = String(profilM.nia || '-').trim() || '-';
            mapKelas[key].mustahiqJah = String(profilM.jah_asatidz || '-').trim() || '-';
            if ((!mapKelas[key].lokal || mapKelas[key].lokal === '-') && profilM.lokasi_diniyyah) {
              mapKelas[key].lokal = String(profilM.lokasi_diniyyah).trim();
            }
          }
        }
      }
    });

    // 2B. Sinkronisasi Mustahiq dari data Asatidz
    asatidzList.forEach((a) => {
      const tingkat = String(a.tingkat_asatidz || '').trim().toUpperCase();
      const bag = String(a.din_bag_asatidz || '').trim().toUpperCase();
      const kls = String(a.din_kls_asatidz || '').trim();
      const papi = String(a.pa_pi || '').trim().toUpperCase();
      const namaGuru = String(a.nama_asatidz || '').trim();
      const niaGuru = String(a.nia || '').trim();
      const jahRaw = String(a.jah_asatidz || '').trim();
      const jahLower = jahRaw.toLowerCase();
      const lokal = String(a.lokasi_diniyyah || '').trim();

      if (tingkat && kls && bag) {
        const key = `${kls} ${bag} ${tingkat} ${papi}`.trim();
        if (!mapKelas[key]) {
          mapKelas[key] = buatObjekKelasKosong(key, tingkat, kls, bag, papi, lokal || '-');
        }

        const isMustahiq =
          jahLower.includes('mustahiq') ||
          jahLower.includes('ms & koor') ||
          jahLower.includes("isti'dad") ||
          jahLower === 'ist';

        if (isMustahiq && namaGuru) {
          mapKelas[key].mustahiqNama = namaGuru;
          mapKelas[key].mustahiqKG = niaGuru || '-';
          mapKelas[key].mustahiqJah = jahRaw || '-';
          if (lokal && (!mapKelas[key].lokal || mapKelas[key].lokal === '-')) {
            mapKelas[key].lokal = lokal;
          }
        }
      }
    });

    // 3. Petakan jadwal seluruh asatidz ke slot kelas (Jam 1 & 2, Sabtu s/d Kamis)
    Object.values(jadwalMap).forEach((teacherRow) => {
      const namaGuru = String(teacherRow.nama_asatidz || '').trim();
      if (!namaGuru) return;
      const profil = asatidzMap.get(namaGuru.toUpperCase());
      const niaGuru = profil ? String(profil.nia || '').trim() : '-';
      const jahGuru = profil ? String(profil.jah_asatidz || '').trim() : '-';

      LIST_HARI.forEach((hari) => {
        const hariKey = hari.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
        const valJadwal = teacherRow[hariKey] || '';
        if (!String(valJadwal).trim()) return;

        const lines = String(valJadwal)
          .split(/\r?\n|;;/)
          .map((s) => s.trim())
          .filter(Boolean);

        lines.forEach((line) => {
          const p = line.split('|').map((s) => s.trim());
          const jamStr = p[0] || '';
          const fan = p[1] && p[1] !== '-' ? p[1].trim() : '';
          const rawLok = p[2] && p[2] !== '-' ? p[2].trim() : '';

          const matchJam = jamStr.match(/\d+/);
          const jamNum = matchJam ? (parseInt(matchJam[0], 10) as 1 | 2) : 0;
          if (jamNum !== 1 && jamNum !== 2) return;

          // Bersihkan kurung gedung/ruang paling akhir
          let klsMurni = rawLok;
          const matchKurung = rawLok.match(/^(.*?)\s*\(([^()]*)\)$/);
          if (matchKurung) {
            const isiKurung = matchKurung[2].trim().toUpperCase();
            if (isiKurung !== 'PA' && isiKurung !== 'PI' && isiKurung !== 'UG') {
              klsMurni = matchKurung[1].trim();
            }
          }
          const klsMurniNorm = normalisasiNamaKelas(klsMurni);

          Object.keys(mapKelas).forEach((kKey) => {
            const itemKls = mapKelas[kKey];
            const genderTag = itemKls.papi ? ` (${itemKls.papi})` : '';
            const formatFull = `${itemKls.kls} ${itemKls.bag} ${itemKls.tingkat}${genderTag}`.trim();
            const formatFullNorm = normalisasiNamaKelas(formatFull);

            if (klsMurniNorm === formatFullNorm) {
              if (mapKelas[kKey].jadwal[hari][jamNum].length === 0) {
                mapKelas[kKey].jadwal[hari][jamNum].push({
                  kg: niaGuru || '-',
                  fan: fan || '-',
                  guru: namaGuru,
                  jah: jahGuru,
                  lokasiGabungan: rawLok,
                });
              }
            }
          });
        });
      });
    });

    // 4. Urutkan kelas
    return Object.values(mapKelas).sort((a, b) => {
      const ordA = URUTAN_TINGKAT[a.tingkat] ?? 99;
      const ordB = URUTAN_TINGKAT[b.tingkat] ?? 99;
      if (ordA !== ordB) return ordA - ordB;
      if (a.papi !== b.papi) return a.papi.localeCompare(b.papi);
      if (a.kls !== b.kls) return a.kls.localeCompare(b.kls, undefined, { numeric: true });
      return a.bag.localeCompare(b.bag);
    });
  }, [formasiList, asatidzList, jadwalMap]);

  // Filtered List
  const listTampil = useMemo(() => {
    return masterStrukturKelasKBM.filter((k) => {
      if (fltTingkat && k.tingkat !== fltTingkat) return false;
      if (fltGender && k.papi !== fltGender) return false;

      const namaKelasMurni = `${k.kls} ${k.bag} ${k.tingkat}`.trim();
      const isUg = isKelasUnggulan(namaKelasMurni);
      if (switchMode === 'reguler' && isUg) return false;
      if (switchMode === 'unggulan' && !isUg) return false;

      if (fltSearch) {
        const q = fltSearch.toLowerCase().trim();
        let textToSearch = `${k.kls} ${k.bag} ${k.tingkat} ${k.mustahiqNama} ${k.mustahiqKG} ${k.mustahiqJah} ${k.lokal}`.toLowerCase();
        LIST_HARI.forEach((hari) => {
          [1, 2].forEach((jam) => {
            const sesi = k.jadwal[hari]?.[jam as 1 | 2] || [];
            sesi.forEach((s) => {
              textToSearch += ` ${s.guru} ${s.kg} ${s.fan}`.toLowerCase();
            });
          });
        });
        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [masterStrukturKelasKBM, fltTingkat, fltGender, fltSearch, switchMode]);

  // Export Excel
  const handleExportExcel = () => {
    if (masterStrukturKelasKBM.length === 0) {
      alert('Data jadwal KBM masih kosong atau belum dimuat.');
      return;
    }

    const header1 = ['NO', 'KLS', 'PI/PA', 'TINGKAT', 'JAM'];
    LIST_HARI.forEach((h) => {
      header1.push(h.toUpperCase(), '');
    });
    header1.push('MUSTAHIQ', 'KG', 'LOKAL');

    const header2 = ['', '', '', '', ''];
    LIST_HARI.forEach(() => {
      header2.push('KG', 'FAN/KITAB');
    });
    header2.push('', '', '');

    const aoaData: (string | number)[][] = [header1, header2];

    masterStrukturKelasKBM.forEach((k, idx) => {
      const noStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
      const klsDisplay = `${k.kls} ${k.bag}`;

      // Row Jam 1
      const row1 = [noStr, klsDisplay, k.papi, k.tingkat, '1'];
      LIST_HARI.forEach((h) => {
        const sesi = k.jadwal[h]?.[1] || [];
        if (sesi.length > 0) {
          row1.push(sesi[0].kg, sesi[0].fan);
        } else {
          row1.push('-', '-');
        }
      });
      row1.push(k.mustahiqNama, k.mustahiqKG, k.lokal);
      aoaData.push(row1);

      // Row Jam 2
      const row2 = ['', '', '', '', '2'];
      LIST_HARI.forEach((h) => {
        const sesi = k.jadwal[h]?.[2] || [];
        if (sesi.length > 0) {
          row2.push(sesi[0].kg, sesi[0].fan);
        } else {
          row2.push('-', '-');
        }
      });
      row2.push('', '', '');
      aoaData.push(row2);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal_KBM');
    XLSX.writeFile(wb, 'Jadwal_KBM_Madrasah_Diniyyah.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Menu, Filter & Tombol Aksi Sesuai Gambar 1 */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-madin-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Jadwal KBM Per Kelas
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Struktur jadwal pembelajaran terintegrasi berbasis kelas Diniyyah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={fetchJadwal}
              disabled={isLoading}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-madin-700 text-madin-700 hover:bg-madin-50 transition shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-madin-700" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-madin-700 hover:bg-madin-800 text-white transition shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Print Jadwal</span>
            </button>
          </div>
        </div>

        {/* Filter Pencarian Cepat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end mt-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Tingkat Diniyyah:
            </label>
            <select
              value={fltTingkat}
              onChange={(e) => setFltTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-madin-700/20"
            >
              <option value="">Semua Tingkat</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Putra / Putri (PA/PI):
            </label>
            <select
              value={fltGender}
              onChange={(e) => setFltGender(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-madin-700/20"
            >
              <option value="">Semua (PA &amp; PI)</option>
              <option value="PA">Putra (PA)</option>
              <option value="PI">Putri (PI)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Pencarian:
            </label>
            <input
              type="text"
              value={fltSearch}
              onChange={(e) => setFltSearch(e.target.value)}
              placeholder="Cari Kelas / Nama / Jah..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-madin-700/20"
            />
          </div>

          <div className="text-left md:text-right pb-1">
            <span className="text-[11px] italic text-slate-400">
              *Arahkan kursor ke kode <b>KG</b> untuk lihat nama.
            </span>
          </div>
        </div>

        {/* Switch Kategori Jadwal KBM Sesuai Gambar 1 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="inline-flex rounded-lg border border-madin-700 p-0.5 bg-white shadow-xs">
            <button
              type="button"
              onClick={() => setSwitchMode('semua')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                switchMode === 'semua'
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'text-madin-700 hover:bg-madin-50'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Jadwal KBM Semua</span>
            </button>

            <button
              type="button"
              onClick={() => setSwitchMode('reguler')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                switchMode === 'reguler'
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'text-madin-700 hover:bg-madin-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Jadwal KBM Reguler</span>
            </button>

            <button
              type="button"
              onClick={() => setSwitchMode('unggulan')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition ${
                switchMode === 'unggulan'
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'text-madin-700 hover:bg-madin-50'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Jadwal KBM Unggulan</span>
            </button>
          </div>

          <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 self-start sm:self-auto">
            Kategori:{' '}
            <b>
              {switchMode === 'semua'
                ? 'Semua Kelas'
                : switchMode === 'reguler'
                ? 'Kelas Reguler Saja'
                : 'Kelas Unggulan (Ug) Saja'}
            </b>
          </span>
        </div>
      </div>

      {/* 2. Area Tabel Dokumen Resmi yang Dicetak / Ditampilkan Sesuai Gambar 1 */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm" id="areaPrintKBM">
        <div className="text-center mb-4">
          <h5 className="font-bold text-sm md:text-base text-slate-800 uppercase tracking-wide m-0">
            JADWAL KBM MADRASAH DINIYYAH AL AMIRIYYAH
          </h5>
          <h6 className="font-bold text-slate-500 text-xs md:text-sm m-0 mt-1">
            {tahunAjaran}
          </h6>
        </div>

        <div className="table-responsive overflow-x-auto">
          <table className="tabel-kbm-resmi w-full" id="tableJadwalKBM">
            <thead>
              {/* Baris Header 1 */}
              <tr>
                <th rowSpan={2} style={{ width: 38 }}>NO</th>
                <th rowSpan={2} style={{ width: 65 }}>KLS</th>
                <th rowSpan={2} style={{ width: 45 }}>PI/PA</th>
                <th rowSpan={2} style={{ width: 75 }}>TINGKAT</th>
                <th rowSpan={2} style={{ width: 35 }}>JAM</th>
                <th colSpan={12} className="text-center bg-subhead">HARI</th>
                <th rowSpan={2} style={{ minWidth: 170 }}>MUSTAHIQ</th>
                <th rowSpan={2} style={{ width: 55 }}>KG</th>
                <th rowSpan={2} style={{ minWidth: 150 }}>LOKAL</th>
              </tr>
              {/* Baris Header 2 (Sub-Kolom Hari) */}
              <tr className="bg-subhead">
                <th style={{ width: 45 }}>KG</th>
                <th>SABTU</th>
                <th style={{ width: 45 }}>KG</th>
                <th>AHAD</th>
                <th style={{ width: 45 }}>KG</th>
                <th>SENIN</th>
                <th style={{ width: 45 }}>KG</th>
                <th>SELASA</th>
                <th style={{ width: 45 }}>KG</th>
                <th>RABU</th>
                <th style={{ width: 45 }}>KG</th>
                <th>KAMIS</th>
              </tr>
            </thead>
            <tbody id="tbodyJadwalKBM">
              {listTampil.length === 0 ? (
                <tr>
                  <td colSpan={21} className="text-center py-6 text-slate-400">
                    Tidak ada data jadwal kelas yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                listTampil.map((k, idx) => {
                  const noStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;
                  const isUg = isKelasUnggulan(`${k.kls} ${k.bag} ${k.tingkat}`);

                  let badgeClass = 'badge-tingkat-ula';
                  if (k.tingkat === 'WUSTHO') badgeClass = 'badge-tingkat-wustho';
                  else if (k.tingkat === 'ULYA') badgeClass = 'badge-tingkat-ulya';
                  else if (k.tingkat === "ISTI'DAD") badgeClass = 'badge-tingkat-istidad';

                  return (
                    <React.Fragment key={k.key}>
                      {/* Baris Jam 1 */}
                      <tr>
                        <td
                          rowSpan={2}
                          className="text-center font-bold cell-klik-kelas"
                          onClick={() => setSelectedKelas(k)}
                          title="Klik untuk lihat detail kelas"
                        >
                          {noStr}
                        </td>
                        <td
                          rowSpan={2}
                          className="text-center font-bold text-madin-700 cell-klik-kelas"
                          onClick={() => setSelectedKelas(k)}
                          title="Klik untuk detail kelas"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span>{k.kls} {k.bag}</span>
                            {isUg && (
                              <span className="px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 text-[9px] rounded font-bold">
                                Ug
                              </span>
                            )}
                            <Pencil className="w-2.5 h-2.5 text-slate-400 inline" />
                          </div>
                        </td>
                        <td rowSpan={2} className="text-center font-medium">
                          {k.papi}
                        </td>
                        <td rowSpan={2} className="text-center">
                          <span className={badgeClass}>{k.tingkat}</span>
                        </td>
                        <td className="text-center font-bold bg-slate-100">1</td>

                        {/* 6 Hari Sesi Jam 1 */}
                        {LIST_HARI.map((hari) => {
                          const sesi = k.jadwal[hari]?.[1] || [];
                          if (sesi.length === 0) {
                            return (
                              <React.Fragment key={`${hari}-1`}>
                                <td className="cell-kg text-slate-400 text-center">-</td>
                                <td className="text-center text-slate-400">-</td>
                              </React.Fragment>
                            );
                          }
                          const s = sesi[0];
                          return (
                            <React.Fragment key={`${hari}-1`}>
                              <td
                                className="cell-kg cell-kg-clickable"
                                title={`Asatidz: ${s.guru} (${s.kg})\nMapel: ${s.fan}`}
                              >
                                {s.kg}
                              </td>
                              <td
                                className="text-center font-semibold uppercase text-[11px]"
                                title={`Kitab/Fan: ${s.fan}`}
                              >
                                {s.fan}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        <td rowSpan={2} className="font-semibold px-2">
                          {k.mustahiqNama}
                        </td>
                        <td
                          rowSpan={2}
                          className="cell-kg text-center"
                          title={`Mustahiq: ${k.mustahiqNama}`}
                        >
                          {k.mustahiqKG}
                        </td>
                        <td rowSpan={2} className="text-xs px-2 text-slate-600">
                          {k.lokal}
                        </td>
                      </tr>

                      {/* Baris Jam 2 */}
                      <tr>
                        <td className="text-center font-bold bg-slate-100">2</td>

                        {/* 6 Hari Sesi Jam 2 */}
                        {LIST_HARI.map((hari) => {
                          const sesi = k.jadwal[hari]?.[2] || [];
                          if (sesi.length === 0) {
                            return (
                              <React.Fragment key={`${hari}-2`}>
                                <td className="cell-kg text-slate-400 text-center">-</td>
                                <td className="text-center text-slate-400">-</td>
                              </React.Fragment>
                            );
                          }
                          const s = sesi[0];
                          return (
                            <React.Fragment key={`${hari}-2`}>
                              <td
                                className="cell-kg cell-kg-clickable"
                                title={`Asatidz: ${s.guru} (${s.kg})\nMapel: ${s.fan}`}
                              >
                                {s.kg}
                              </td>
                              <td
                                className="text-center font-semibold uppercase text-[11px]"
                                title={`Kitab/Fan: ${s.fan}`}
                              >
                                {s.fan}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Kelas KBM */}
      {selectedKelas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden">
            <div className="bg-madin-700 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <h3 className="font-bold text-sm md:text-base">
                  Detail Kelas: {selectedKelas.kls} {selectedKelas.bag} {selectedKelas.tingkat} ({selectedKelas.papi})
                </h3>
              </div>
              <button
                onClick={() => setSelectedKelas(null)}
                className="p-1 rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto bg-slate-50">
              {/* Card Mustahiq */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="text-xs font-bold text-madin-700 uppercase tracking-wide border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" /> Data Mustahiq / Wali Kelas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nama Mustahiq:</span>
                    <strong className="text-slate-800 text-sm">{selectedKelas.mustahiqNama}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Kode KG / NIA:</span>
                    <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {selectedKelas.mustahiqKG}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Lokal / Ruang:</span>
                    <strong className="text-slate-700">{selectedKelas.lokal}</strong>
                  </div>
                </div>
              </div>

              {/* Rincian Jadwal 6 Hari */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="text-xs font-bold text-madin-700 uppercase tracking-wide border-b border-slate-100 pb-2 mb-3">
                  Jadwal Pelajaran Mingguan
                </h4>
                <div className="table-responsive overflow-x-auto">
                  <table className="w-full text-xs text-center border-collapse border border-slate-300">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="border border-slate-300 py-1.5 px-2">JAM</th>
                        {LIST_HARI.map((h) => (
                          <th key={h} className="border border-slate-300 py-1.5 px-2">
                            {h.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2].map((jam) => (
                        <tr key={jam}>
                          <td className="border border-slate-300 font-bold bg-slate-50 py-2">
                            Jam {jam}
                          </td>
                          {LIST_HARI.map((h) => {
                            const sesi = selectedKelas.jadwal[h]?.[jam as 1 | 2] || [];
                            if (sesi.length === 0) {
                              return (
                                <td key={h} className="border border-slate-300 text-slate-400 py-2">
                                  -
                                </td>
                              );
                            }
                            const s = sesi[0];
                            return (
                              <td key={h} className="border border-slate-300 py-2 px-1">
                                <div className="font-bold text-madin-700">{s.fan}</div>
                                <div className="text-[10px] text-slate-500 font-mono">({s.kg})</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedKelas(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
