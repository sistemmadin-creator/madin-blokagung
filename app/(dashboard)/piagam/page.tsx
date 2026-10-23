'use client';

import React, { useState, useEffect } from 'react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { PiagamColumnElement } from '@/types/piagam';
import { Award, Printer, ZoomIn, ZoomOut, Settings2 } from 'lucide-react';

const DEFAULT_COLUMNS: PiagamColumnElement[] = [
  {
    id: 'nama',
    title: 'Nama Santri',
    text: 'AHMAD FAUZI ROFIQ',
    x: 421,
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
    x: 421,
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
    x: 421,
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
    text: 'Dengan Predikat: MUMTAZ (ISTIMEWA)',
    x: 421,
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
  const [zoomScale, setZoomScale] = useState(0.8);
  const [selectedSantriId, setSelectedSantriId] = useState('');

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

    // Find their completed setoran if any
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman (Hidden on Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-xs">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cetak Piagam / Syahadah Hafalan</h1>
            <p className="text-xs text-slate-500">
              Studio Desain Koordinat & Generator Cetak Sertifikat Kelulusan Muhafadzoh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setZoomScale(Math.max(0.5, zoomScale - 0.1))}
              className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
              title="Perkecil Kanvas"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-1 text-xs font-mono font-bold text-slate-700">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale(Math.min(1.2, zoomScale + 0.1))}
              className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
              title="Perbesar Kanvas"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Piagam (Print)</span>
          </button>
        </div>
      </div>

      {/* Main Studio Area (Canvas + Properties Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Kolom Kiri: Kanvas Sertifikat Visual */}
        <div className="lg:col-span-3 bg-slate-100 p-6 rounded-2xl border border-slate-200 overflow-auto flex justify-center items-center min-h-[600px]">
          <div
            id="piagam-print-area"
            style={{
              width: '842px',
              height: '595px',
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
            }}
            className="bg-white rounded-lg shadow-2xl relative border-8 border-double border-amber-600 select-none overflow-hidden print:shadow-none print:border-none print:transform-none"
          >
            {/* Latar Belakang Elegan Piagam */}
            <div className="absolute inset-2 border-2 border-amber-500/40 pointer-events-none rounded"></div>
            <div className="absolute inset-4 border border-slate-200 pointer-events-none rounded"></div>

            {/* Logo / Ornamen Kop */}
            <div className="absolute top-10 left-0 right-0 text-center pointer-events-none space-y-1">
              <p className="text-[11px] tracking-[0.3em] font-serif font-bold text-amber-800 uppercase">
                Pondok Pesantren Darussalam Blokagung
              </p>
              <h2 className="text-2xl font-serif font-extrabold text-slate-800 tracking-wide uppercase">
                Madrasah Diniyyah Al Amiriyyah
              </h2>
              <div className="w-32 h-0.5 bg-amber-600 mx-auto mt-1"></div>
              <p className="text-xs font-serif italic text-slate-500 pt-1">
                Menyatakan dengan sebenarnya bahwa santri:
              </p>
            </div>

            {/* Elemen Teks Koordinat Dinamis */}
            {columns.map((col) => {
              if (!col.show) return null;
              const isSelected = col.id === selectedColumnId;

              return (
                <div
                  key={col.id}
                  onClick={() => setSelectedColumnId(col.id)}
                  style={{
                    position: 'absolute',
                    top: `${col.y}px`,
                    left: `${col.x}px`,
                    transform:
                      col.align === 'center'
                        ? 'translate(-50%, -50%)'
                        : col.align === 'right'
                        ? 'translate(-100%, -50%)'
                        : 'translate(0, -50%)',
                    fontSize: `${col.size}px`,
                    color: col.color,
                    fontFamily: col.fontFamily,
                    fontWeight: col.isBold ? 'bold' : 'normal',
                    textAlign: col.align,
                    textTransform: col.textTransform,
                  }}
                  className={`cursor-pointer px-2 py-0.5 rounded transition ${
                    isSelected
                      ? 'outline-2 outline-dashed outline-madin-600 bg-madin-50/40 print:outline-none print:bg-transparent'
                      : 'hover:outline-1 hover:outline-dashed hover:outline-slate-400 print:outline-none'
                  }`}
                >
                  {col.text}
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Pengaturan Properti Koordinat (Hidden on Print) */}
        <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b pb-2">
            <Settings2 className="w-4 h-4 text-madin-700" />
            Panel Pengaturan Piagam
          </h3>

          {/* Pilih Santri Cepat */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Santri (Isi Otomatis Data)
            </label>
            <select
              value={selectedSantriId}
              onChange={(e) => handleSelectSantri(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="">Pilih Santri...</option>
              {santriList.slice(0, 50).map((s) => (
                <option key={s.no_induk} value={s.no_induk}>
                  {s.nama} ({s.no_induk})
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Elemen untuk Diedit */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Elemen Teks:
            </label>
            <select
              value={selectedColumnId}
              onChange={(e) => setSelectedColumnId(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white font-bold text-madin-800"
            >
              {columns.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.title}
                </option>
              ))}
            </select>
          </div>

          {/* Edit Teks Elemen */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Konten Teks</label>
            <textarea
              rows={2}
              value={activeColumn.text}
              onChange={(e) => handleUpdateActiveColumn({ text: e.target.value })}
              className="w-full text-xs p-2 rounded-lg border border-slate-200 font-medium"
            />
          </div>

          {/* Posisi Koordinat X & Y */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-slate-500 font-medium">Posisi X (px)</label>
              <input
                type="number"
                value={activeColumn.x}
                onChange={(e) =>
                  handleUpdateActiveColumn({ x: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full text-xs py-1.5 px-2 border rounded font-mono"
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium">Posisi Y (px)</label>
              <input
                type="number"
                value={activeColumn.y}
                onChange={(e) =>
                  handleUpdateActiveColumn({ y: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full text-xs py-1.5 px-2 border rounded font-mono"
              />
            </div>
          </div>

          {/* Ukuran Font & Warna */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-slate-500 font-medium">Ukuran Font (px)</label>
              <input
                type="number"
                value={activeColumn.size}
                onChange={(e) =>
                  handleUpdateActiveColumn({ size: parseInt(e.target.value, 10) || 12 })
                }
                className="w-full text-xs py-1.5 px-2 border rounded font-mono"
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium">Warna Teks</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={activeColumn.color}
                  onChange={(e) => handleUpdateActiveColumn({ color: e.target.value })}
                  className="w-7 h-7 rounded border cursor-pointer p-0.5"
                />
                <span className="font-mono text-[11px]">{activeColumn.color}</span>
              </div>
            </div>
          </div>

          {/* Perataan Teks & Font Family */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-slate-500 font-medium">Perataan</label>
              <select
                value={activeColumn.align}
                onChange={(e) => handleUpdateActiveColumn({ align: e.target.value as 'left' | 'center' | 'right' })}
                className="w-full text-xs py-1.5 px-2 border rounded bg-white"
              >
                <option value="center">Rata Tengah</option>
                <option value="left">Rata Kiri</option>
                <option value="right">Rata Kanan</option>
              </select>
            </div>
            <div>
              <label className="text-slate-500 font-medium">Font Family</label>
              <select
                value={activeColumn.fontFamily}
                onChange={(e) => handleUpdateActiveColumn({ fontFamily: e.target.value })}
                className="w-full text-xs py-1.5 px-2 border rounded bg-white"
              >
                <option value="serif">Serif (Resmi)</option>
                <option value="sans-serif">Sans-Serif</option>
                <option value="monospace">Monospace</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs pt-1">
            <input
              type="checkbox"
              checked={activeColumn.isBold}
              onChange={(e) => handleUpdateActiveColumn({ isBold: e.target.checked })}
              className="rounded text-madin-700"
            />
            <span className="font-semibold text-slate-700">Tebal (Bold)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
