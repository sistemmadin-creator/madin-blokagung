'use client';

import React, { useState, useEffect } from 'react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { PiagamColumnElement } from '@/types/piagam';
import {
  Award,
  Printer,
  RotateCcw,
  Sliders,
  ZoomIn,
  ZoomOut,
  Search,
} from 'lucide-react';

const DEFAULT_COLUMNS: PiagamColumnElement[] = [
  {
    id: 'nama',
    title: 'Nama Santri',
    text: 'AHMAD FAUZI ROFIQ',
    x: 420,
    y: 260,
    size: 26,
    color: '#0f172a',
    fontFamily: 'serif',
    isBold: true,
    align: 'center',
    textTransform: 'uppercase',
    show: true,
    lockX: false,
    lockY: false,
    lockSize: false,
  },
  {
    id: 'no_induk',
    title: 'Nomor Induk',
    text: 'No. Induk: 198273',
    x: 420,
    y: 295,
    size: 13,
    color: '#475569',
    fontFamily: 'sans-serif',
    isBold: false,
    align: 'center',
    textTransform: 'none',
    show: true,
    lockX: false,
    lockY: false,
    lockSize: false,
  },
  {
    id: 'kitab',
    title: 'Nama Nadhom / Kitab',
    text: 'ALFIYAH IBNU MALIK (1.002 BAIT)',
    x: 420,
    y: 350,
    size: 20,
    color: '#0f766e',
    fontFamily: 'serif',
    isBold: true,
    align: 'center',
    textTransform: 'uppercase',
    show: true,
    lockX: false,
    lockY: false,
    lockSize: false,
  },
  {
    id: 'predikat',
    title: 'Predikat Nilai',
    text: 'Dengan Predikat: JAYYID JIDDAN (A)',
    x: 420,
    y: 385,
    size: 14,
    color: '#334155',
    fontFamily: 'sans-serif',
    isBold: true,
    align: 'center',
    textTransform: 'none',
    show: true,
    lockX: false,
    lockY: false,
    lockSize: false,
  },
  {
    id: 'tanggal',
    title: 'Tanggal & Tempat',
    text: 'Blokagung, 14 Rabiul Akhir 1448 H / 24 Oktober 2026 M',
    x: 620,
    y: 450,
    size: 12,
    color: '#334155',
    fontFamily: 'serif',
    isBold: false,
    align: 'center',
    textTransform: 'none',
    show: true,
    lockX: false,
    lockY: false,
    lockSize: false,
  },
  {
    id: 'kepala',
    title: 'Kepala Madrasah Diniyyah',
    text: 'KH. AHMAD HISYAM SYAFAAT',
    x: 620,
    y: 520,
    size: 13,
    color: '#0f172a',
    fontFamily: 'serif',
    isBold: true,
    align: 'center',
    textTransform: 'uppercase',
    show: true,
    lockX: false,
    lockY: false,
    lockSize: false,
  },
];

export default function PiagamPage() {
  const { santriList, fetchSantri } = useSantriStore();
  const { setoranList, fetchSetoranData } = useMuhafadzohStore();

  const [columns, setColumns] = useState<PiagamColumnElement[]>(DEFAULT_COLUMNS);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('nama');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [bgImageUrl, setBgImageUrl] = useState<string>('');
  const [zoomScale, setZoomScale] = useState(0.85);
  const [selectedSantriId, setSelectedSantriId] = useState('');
  const [santriFilterKeyword, setSantriFilterKeyword] = useState('');

  useEffect(() => {
    if (santriList.length === 0) fetchSantri();
    if (setoranList.length === 0) fetchSetoranData();
  }, [fetchSantri, fetchSetoranData, santriList.length, setoranList.length]);

  const activeColumn = columns.find((c) => c.id === selectedColumnId) || columns[0];

  const handleUpdateActiveColumn = (patch: Partial<PiagamColumnElement>) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === selectedColumnId ? { ...c, ...patch } : c))
    );
  };

  const handleSelectSantri = (noInduk: string) => {
    setSelectedSantriId(noInduk);
    const s = santriList.find((item) => item.no_induk === noInduk);
    if (!s) return;

    // Find their latest completed setoran if any
    const setoran = setoranList.find((item) => item.no_induk === noInduk);

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === 'nama') return { ...col, text: s.nama };
        if (col.id === 'no_induk') return { ...col, text: `No. Induk: ${s.no_induk}` };
        if (col.id === 'kitab' && setoran) return { ...col, text: setoran.item_hafalan.toUpperCase() };
        if (col.id === 'predikat' && setoran) return { ...col, text: `Dengan Predikat: ${setoran.nilai || 'MUMTAZ (A)'}` };
        return col;
      })
    );
  };

  const handleResetCanvas = () => {
    if (confirm('Kembalikan tata letak teks ke posisi default?')) {
      setColumns(DEFAULT_COLUMNS);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredSantriOptions = santriList.filter((s) => {
    if (!santriFilterKeyword.trim()) return true;
    const q = santriFilterKeyword.toLowerCase();
    return s.nama.toLowerCase().includes(q) || s.no_induk.toLowerCase().includes(q);
  }).slice(0, 30);

  return (
    <div className="space-y-4">
      {/* Header Halaman (Identik dengan piagam.html) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs text-emerald-700 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 m-0 flex items-center gap-2">
              Cetak Piagam &amp; Syahadah
            </h1>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Sistem mailing dinamis untuk mencetak piagam kelulusan hafalan dan syahadah santri secara massal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetCanvas}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
            title="Reset ke tata letak awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Kanvas</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Piagam</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Panel Pengaturan Kiri & Kanvas Kanan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* PANEL PENGATURAN KIRI */}
        <div className="print:hidden lg:col-span-4 space-y-4">
          <div className="card-panel border-t-4 border-t-[#0f766e] bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-800 m-0 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-700" />
                <span>Pengaturan Piagam</span>
              </h2>
              <span className="badge bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold px-2 py-0.5 rounded">
                A4 {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
              </span>
            </div>

            {/* 1. Orientasi Kertas Cetak */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Orientasi Kertas Cetak</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${
                    orientation === 'landscape'
                      ? 'bg-emerald-50 border-[#0f766e] text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Landscape (297 × 210)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${
                    orientation === 'portrait'
                      ? 'bg-emerald-50 border-[#0f766e] text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Portrait (210 × 297)
                </button>
              </div>
            </div>

            {/* 2. Gambar Latar / Bingkai Piagam */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Gambar Bingkai / Background</label>
                {bgImageUrl && (
                  <button
                    type="button"
                    onClick={() => setBgImageUrl('')}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="URL Gambar / Link Google Drive..."
                value={bgImageUrl}
                onChange={(e) => setBgImageUrl(e.target.value)}
                className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
              />
              <p className="text-[10px] text-slate-500">
                Masukkan tautan gambar template piagam beresolusi tinggi untuk dicetak di belakang teks.
              </p>
            </div>

            {/* 3. Pilih Data Santri */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Data Santri</label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari santri..."
                  value={santriFilterKeyword}
                  onChange={(e) => setSantriFilterKeyword(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
                />
              </div>
              <select
                value={selectedSantriId}
                onChange={(e) => handleSelectSantri(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0f766e]"
              >
                <option value="">-- Pilih Santri --</option>
                {filteredSantriOptions.map((s) => (
                  <option key={s.no_induk} value={s.no_induk}>
                    {s.nama} ({s.no_induk}) - {s.tingkat} {s.din_kls}{s.din_bag}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Edit Atribut Elemen Teks */}
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <label className="block text-xs font-bold text-slate-700">Elemen Teks Terpilih</label>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {columns.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColumnId(c.id)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded whitespace-nowrap border transition ${
                      selectedColumnId === c.id
                        ? 'bg-[#0f766e] text-white border-[#0f766e]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>

              {activeColumn && (
                <div className="space-y-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold">Teks</label>
                    <input
                      type="text"
                      value={activeColumn.text}
                      onChange={(e) => handleUpdateActiveColumn({ text: e.target.value })}
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Ukuran Font ({activeColumn.size}px)</label>
                      <input
                        type="range"
                        min="8"
                        max="48"
                        value={activeColumn.size}
                        onChange={(e) => handleUpdateActiveColumn({ size: parseInt(e.target.value, 10) })}
                        className="w-full accent-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Warna Teks</label>
                      <input
                        type="color"
                        value={activeColumn.color}
                        onChange={(e) => handleUpdateActiveColumn({ color: e.target.value })}
                        className="w-full h-7 rounded border border-slate-300 p-0.5 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Posisi X (Horizontal)</label>
                      <input
                        type="number"
                        value={activeColumn.x}
                        onChange={(e) => handleUpdateActiveColumn({ x: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">Posisi Y (Vertikal)</label>
                      <input
                        type="number"
                        value={activeColumn.y}
                        onChange={(e) => handleUpdateActiveColumn({ y: parseInt(e.target.value, 10) || 0 })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AREA KANVAS CETAK (PREVIEW & PRINT) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* Zoom Toolbar */}
          <div className="print:hidden w-full flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 mb-3 shadow-2xs">
            <span className="text-xs font-semibold text-slate-600">
              Kanvas Pratinjau Dokumen Cetak
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600"
                title="Perkecil"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold px-2 text-slate-700">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(Math.min(1.3, zoomScale + 0.1))}
                className="p-1 hover:bg-slate-100 rounded text-slate-600"
                title="Perbesar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div
            className="overflow-auto max-w-full p-4 bg-slate-200/70 rounded-2xl border border-slate-300 shadow-inner flex items-center justify-center print:p-0 print:bg-white print:border-none print:shadow-none"
            style={{ minHeight: '620px' }}
          >
            <div
              id="piagamSheet"
              style={{
                width: orientation === 'landscape' ? '842px' : '595px',
                height: orientation === 'landscape' ? '595px' : '842px',
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
                backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
              }}
              className="relative bg-white shadow-xl border border-slate-300 rounded-sm print:shadow-none print:border-none overflow-hidden select-none"
            >
              {!bgImageUrl && (
                <div className="absolute inset-4 border-4 border-double border-emerald-900/30 rounded pointer-events-none flex flex-col items-center justify-between p-8 text-center opacity-40">
                  <span className="text-xs font-serif tracking-widest text-emerald-900">
                    MADRASAH DINIYYAH AL AMIRIYYAH BLOKAGUNG
                  </span>
                  <div className="text-3xl font-serif text-emerald-900/30 font-bold">
                    SYAHADAH MUHAFADZOH
                  </div>
                  <span className="text-[10px] text-slate-400">Bingkai Default Piagam</span>
                </div>
              )}

              {/* Render Draggable/Clickable Text Elements */}
              {columns
                .filter((col) => col.show)
                .map((col) => {
                  const isSelected = col.id === selectedColumnId;
                  return (
                    <div
                      key={col.id}
                      onClick={() => setSelectedColumnId(col.id)}
                      style={{
                        position: 'absolute',
                        left: `${col.x}px`,
                        top: `${col.y}px`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `${col.size}px`,
                        color: col.color,
                        fontFamily: col.fontFamily === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif',
                        fontWeight: col.isBold ? 'bold' : 'normal',
                        textAlign: col.align,
                        textTransform: col.textTransform,
                      }}
                      className={`cursor-pointer whitespace-nowrap transition-shadow ${
                        isSelected
                          ? 'ring-2 ring-emerald-500 ring-offset-1 rounded bg-emerald-50/40 px-1.5'
                          : 'hover:ring-1 hover:ring-slate-400 px-1'
                      }`}
                    >
                      {col.text}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
