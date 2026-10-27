'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { usePiagamStore } from '@/stores/usePiagamStore';
import {
  PIAGAM_FONT_OPTIONS,
  MERGE_FIELDS_LIST,
  PiagamOrientation,
  PiagamAlign,
  PiagamTextTransform,
} from '@/types/piagam';
import {
  extractGoogleDriveThumbnail,
  parseMergeTags,
} from '@/lib/utils/piagamHelper';
import ModalSelectSantriPiagam from '@/components/modules/piagam/ModalSelectSantriPiagam';
import {
  Award,
  Printer,
  RotateCcw,
  Sliders,
  Users,
  ChevronRight,
  PlusCircle,
  Sparkles,
  Lock,
  Unlock,
  Trash2,
  Save,
  Upload,
  Globe,
  XCircle,
  Lightbulb,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronsRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

export default function PiagamPage() {
  const { santriList, fetchSantri } = useSantriStore();
  const { setoranList, fetchSetoranData } = useMuhafadzohStore();

  const {
    templates,
    activeTemplateName,
    orientation,
    driveLink,
    customBgUrl,
    bgType,
    columns,
    activeElementId,
    zoomScale,
    selectedSantriIndukList,
    currentPreviewIndex,
    isSantriModalOpen,
    loadTemplates,
    saveTemplate,
    loadTemplateByName,
    deleteTemplate,
    setOrientation,
    setDriveLink,
    setCustomBgUrl,
    clearBackground,
    setZoomScale,
    setActiveElementId,
    addColumn,
    removeColumn,
    updateColumn,
    toggleColumnProp,
    resetCanvasToDefault,
    setSelectedSantriIndukList,
    setPreviewIndex,
    openSantriModal,
    closeSantriModal,
  } = usePiagamStore();

  const [isDriveLocked, setIsDriveLocked] = useState(true);
  const [activeBgTab, setActiveBgTab] = useState<'drive' | 'upload'>('drive');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSantriList, setPrintSantriList] = useState<any[]>([]);

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    loadTemplates();
    if (santriList.length === 0) fetchSantri();
    if (setoranList.length === 0) fetchSetoranData();
  }, [loadTemplates, fetchSantri, fetchSetoranData, santriList.length, setoranList.length]);

  // Efektif Background URL
  const effectiveBgUrl = useMemo(() => {
    if (customBgUrl) return customBgUrl;
    if (driveLink) return extractGoogleDriveThumbnail(driveLink);
    return '';
  }, [customBgUrl, driveLink]);

  // Santri yang sedang aktif di-preview
  const currentSantri = useMemo(() => {
    if (selectedSantriIndukList.length > 0) {
      const currentNoInduk = selectedSantriIndukList[currentPreviewIndex];
      const match = santriList.find((s) => String(s.no_induk).trim() === String(currentNoInduk).trim());
      if (match) return match;
    }
    return santriList.length > 0 ? santriList[0] : null;
  }, [selectedSantriIndukList, currentPreviewIndex, santriList]);

  // Navigasi Preview Antar Santri
  const handleNav = (action: 'first' | 'prev' | 'next' | 'last') => {
    const total = selectedSantriIndukList.length;
    if (total === 0) return;
    if (action === 'first') setPreviewIndex(0);
    else if (action === 'prev') setPreviewIndex(Math.max(0, currentPreviewIndex - 1));
    else if (action === 'next') setPreviewIndex(Math.min(total - 1, currentPreviewIndex + 1));
    else if (action === 'last') setPreviewIndex(total - 1);
  };

  // Upload Background Lokal
  const handleUploadBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('File yang dipilih harus berupa file gambar (JPG/PNG)!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomBgUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sisipkan Tag Mail-Merge ke Textarea Aktif
  const handleInsertTag = (tag: string) => {
    const targetId = activeElementId || columns[0]?.id;
    if (!targetId) return;

    const textarea = textareaRefs.current[targetId];
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentVal = textarea.value || '';
    const updated = currentVal.substring(0, start) + tag + currentVal.substring(end);

    updateColumn(targetId, { text: updated });

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + tag.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 50);
  };

  // Simpan Template Baru
  const handleSaveTemplate = async () => {
    const name = prompt('Masukkan nama untuk menyimpan konfigurasi Template Piagam ini:');
    if (!name || !name.trim()) return;
    const success = await saveTemplate(name.trim());
    if (success) {
      alert(`Konfigurasi template "${name.trim()}" berhasil disimpan!`);
    } else {
      alert('Gagal menyimpan template.');
    }
  };

  // Hapus Template
  const handleDeleteTemplate = async () => {
    if (!activeTemplateName) {
      alert('Pilih template yang ingin dihapus terlebih dahulu!');
      return;
    }
    if (confirm(`Yakin ingin menghapus template "${activeTemplateName}" secara permanen?`)) {
      await deleteTemplate(activeTemplateName);
      alert(`Template "${activeTemplateName}" telah dihapus.`);
    }
  };

  // Mesin Cetak Massal (Batch Print Engine)
  const handlePrintPiagam = () => {
    if (selectedSantriIndukList.length === 0) {
      alert('Pilih santri terlebih dahulu! Silakan klik tombol "Pilih Santri" untuk menentukan santri yang akan dicetak piagamnya.');
      return;
    }

    const matchedSantri = selectedSantriIndukList
      .map((induk) => santriList.find((s) => String(s.no_induk).trim() === String(induk).trim()))
      .filter(Boolean);

    setPrintSantriList(matchedSantri);
    setIsPrinting(true);

    document.body.classList.add('printing-piagam');
    if (orientation === 'portrait') {
      document.body.classList.add('print-portrait');
      document.body.classList.remove('print-landscape');
    } else {
      document.body.classList.add('print-landscape');
      document.body.classList.remove('print-portrait');
    }

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-piagam', 'print-landscape', 'print-portrait');
        setIsPrinting(false);
        setPrintSantriList([]);
      }, 1000);
    }, 400);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Halaman */}
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
            onClick={resetCanvasToDefault}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-xs transition"
            title="Reset ke tata letak awal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Kanvas</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPiagam}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Piagam</span>
          </button>
        </div>
      </div>

      {/* 2. Main Grid: Panel Pengaturan Kiri & Kanvas Kanan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* PANEL PENGATURAN KIRI */}
        <div className="print:hidden lg:col-span-5 xl:col-span-4 space-y-4">
          <div className="card-panel border-t-4 border-t-emerald-700 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-800 m-0 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-700" />
                <span>Pengaturan Piagam</span>
              </h2>
              <span className="badge bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold px-2 py-0.5 rounded">
                A4 {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
              </span>
            </div>

            {/* 1. TEMPLATE PIAGAM TERSIMPAN */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">Template Piagam Tersimpan</label>
              <div className="flex items-center gap-1.5">
                <select
                  value={activeTemplateName}
                  onChange={(e) => loadTemplateByName(e.target.value)}
                  className="flex-grow px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="">-- Pilih Template --</option>
                  {Object.keys(templates).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleDeleteTemplate}
                  disabled={!activeTemplateName}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 disabled:opacity-40 transition"
                  title="Hapus Template Terpilih"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition shadow-2xs"
                  title="Simpan Konfigurasi Sebagai Template Baru"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>

            {/* 2. PILIHAN ORIENTASI KERTAS */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Orientasi Kertas Cetak</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${
                    orientation === 'landscape'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Landscape (297 × 210 mm)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${
                    orientation === 'portrait'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Portrait (210 × 297 mm)
                </button>
              </div>
            </div>

            {/* 3. GAMBAR LATAR / BINGKAI PIAGAM */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700">Gambar Latar / Bingkai Piagam</label>
                {(driveLink || customBgUrl) && (
                  <button
                    type="button"
                    onClick={clearBackground}
                    className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    <XCircle className="w-3 h-3" />
                    <span>Hapus Background</span>
                  </button>
                )}
              </div>

              {/* Tabs Sumber Background */}
              <div className="flex rounded-md border border-slate-200 p-0.5 bg-white text-xs">
                <button
                  type="button"
                  onClick={() => setActiveBgTab('drive')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded transition ${
                    activeBgTab === 'drive'
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>Google Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBgTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded transition ${
                    activeBgTab === 'upload'
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                </button>
              </div>

              {activeBgTab === 'drive' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Paste link Google Drive disini..."
                      value={driveLink}
                      readOnly={isDriveLocked}
                      onChange={(e) => setDriveLink(e.target.value)}
                      className={`flex-grow px-2 py-1 text-xs rounded border ${
                        isDriveLocked ? 'bg-slate-100 text-slate-500 border-slate-300' : 'bg-white border-emerald-500'
                      } focus:outline-none`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsDriveLocked(!isDriveLocked)}
                      className={`p-1.5 rounded border transition ${
                        isDriveLocked ? 'border-slate-300 text-slate-500 hover:bg-slate-100' : 'border-rose-400 bg-rose-50 text-rose-600'
                      }`}
                      title="Buka / Kunci Input Link"
                    >
                      {isDriveLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 m-0">
                    Klik gembok untuk mengubah link. Pastikan file G-Drive dibagikan ke <em>Siapa saja yang memiliki link</em>.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadBackground}
                    className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 m-0">
                    Pilih gambar desain piagam (JPG/PNG resolusi tinggi).
                  </p>
                </div>
              )}
            </div>

            {/* 4. PENERIMA PIAGAM (MAILING SANTRI) */}
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 mb-1">
                Penerima Piagam (Mailing Santri)
              </label>
              <button
                type="button"
                onClick={openSantriModal}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 transition shadow-2xs text-left"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-700 shrink-0" />
                  {selectedSantriIndukList.length > 0 ? (
                    <span className="text-xs font-bold text-slate-800">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-700 text-white mr-1.5">
                        {selectedSantriIndukList.length}
                      </span>
                      Santri Terpilih Siap Dicetak
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500">
                      -- Klik untuk Memilih Santri --
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* 5. STRUKTUR ELEMEN TEKS PIAGAM */}
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 m-0">Elemen Teks Piagam</h3>
                <button
                  type="button"
                  onClick={addColumn}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Tambah Blok Teks</span>
                </button>
              </div>

              {/* Tag Cepat / Chips Penolong */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Klik Tag untuk menyisipkan ke blok teks aktif:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {MERGE_FIELDS_LIST.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => handleInsertTag(item.tag)}
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 transition"
                      title={item.desc}
                    >
                      + {item.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accordion Elemen Teks */}
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
                {columns.map((col, index) => {
                  const isActive = activeElementId === col.id;

                  return (
                    <div
                      key={col.id}
                      className={`rounded-lg border bg-white transition shadow-2xs ${
                        isActive ? 'border-emerald-600 ring-1 ring-emerald-500' : 'border-slate-200'
                      }`}
                    >
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => setActiveElementId(isActive ? null : col.id)}
                        className="w-full flex items-center justify-between p-2.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-50/70"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[10px] shrink-0 font-mono">
                            {index + 1}
                          </span>
                          <span className="truncate">{col.title}</span>
                          {!col.show && (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Disembunyikan
                            </span>
                          )}
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isActive ? 'rotate-90 text-emerald-700' : ''
                          }`}
                        />
                      </button>

                      {/* Accordion Body */}
                      {isActive && (
                        <div className="p-3 border-t border-slate-100 space-y-2.5 text-xs bg-slate-50/50">
                          {/* Nama Blok */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Nama Blok Elemen</label>
                            <input
                              type="text"
                              value={col.title}
                              onChange={(e) => updateColumn(col.id, { title: e.target.value })}
                              className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            />
                          </div>

                          {/* Isi Teks / Tag Mail-Merge */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Isi Teks / Tag Mail-Merge</label>
                            <textarea
                              ref={(el) => {
                                textareaRefs.current[col.id] = el;
                              }}
                              rows={3}
                              value={col.text}
                              onChange={(e) => updateColumn(col.id, { text: e.target.value })}
                              className="w-full px-2 py-1 text-xs font-mono rounded border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                            />
                          </div>

                          {/* Switch Tampilkan & Hapus */}
                          <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold text-xs">
                              <input
                                type="checkbox"
                                checked={col.show}
                                onChange={(e) => updateColumn(col.id, { show: e.target.checked })}
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Tampilkan</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => removeColumn(col.id)}
                              className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus Blok</span>
                            </button>
                          </div>

                          {/* Slider Posisi X (0 - 100%) */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                              <span>Posisi X (Kiri-Kanan): <b className="font-mono text-slate-800">{col.x}%</b></span>
                              <button
                                type="button"
                                onClick={() => toggleColumnProp(col.id, 'lockX')}
                                className="text-slate-400 hover:text-slate-600"
                                title="Kunci Posisi X"
                              >
                                {col.lockX ? <Lock className="w-3 h-3 text-rose-600" /> : <Unlock className="w-3 h-3" />}
                              </button>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              disabled={col.lockX}
                              value={col.x}
                              onChange={(e) => updateColumn(col.id, { x: parseInt(e.target.value, 10) || 0 })}
                              className="w-full accent-emerald-700"
                            />
                          </div>

                          {/* Slider Posisi Y (0 - 100%) */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                              <span>Posisi Y (Atas-Bawah): <b className="font-mono text-slate-800">{col.y}%</b></span>
                              <button
                                type="button"
                                onClick={() => toggleColumnProp(col.id, 'lockY')}
                                className="text-slate-400 hover:text-slate-600"
                                title="Kunci Posisi Y"
                              >
                                {col.lockY ? <Lock className="w-3 h-3 text-rose-600" /> : <Unlock className="w-3 h-3" />}
                              </button>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              disabled={col.lockY}
                              value={col.y}
                              onChange={(e) => updateColumn(col.id, { y: parseInt(e.target.value, 10) || 0 })}
                              className="w-full accent-emerald-700"
                            />
                          </div>

                          {/* Slider Ukuran Font (8 - 120px) */}
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                              <span>Ukuran Font: <b className="font-mono text-slate-800">{col.size}px</b></span>
                              <button
                                type="button"
                                onClick={() => toggleColumnProp(col.id, 'lockSize')}
                                className="text-slate-400 hover:text-slate-600"
                                title="Kunci Ukuran Font"
                              >
                                {col.lockSize ? <Lock className="w-3 h-3 text-rose-600" /> : <Unlock className="w-3 h-3" />}
                              </button>
                            </div>
                            <input
                              type="range"
                              min="8"
                              max="120"
                              disabled={col.lockSize}
                              value={col.size}
                              onChange={(e) => updateColumn(col.id, { size: parseInt(e.target.value, 10) || 8 })}
                              className="w-full accent-emerald-700"
                            />
                          </div>

                          {/* Jenis Font, Warna, Bold, Kapitalisasi, Perataan */}
                          <div className="space-y-2 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Jenis Font</label>
                              <select
                                value={col.fontFamily}
                                onChange={(e) => updateColumn(col.id, { fontFamily: e.target.value })}
                                className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                              >
                                {PIAGAM_FONT_OPTIONS.map((f) => (
                                  <option key={f.value} value={f.value}>
                                    {f.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 items-end">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Warna</label>
                                <input
                                  type="color"
                                  value={col.color || '#000000'}
                                  onChange={(e) => updateColumn(col.id, { color: e.target.value })}
                                  className="w-full h-8 rounded border border-slate-300 p-0.5 cursor-pointer bg-white"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 text-center">Tebal</label>
                                <button
                                  type="button"
                                  onClick={() => toggleColumnProp(col.id, 'isBold')}
                                  className={`w-full py-1 text-xs font-bold rounded border transition ${
                                    col.isBold
                                      ? 'bg-slate-800 text-white border-slate-800'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  B
                                </button>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 text-center">Kapital</label>
                                <select
                                  value={col.textTransform || 'none'}
                                  onChange={(e) =>
                                    updateColumn(col.id, {
                                      textTransform: e.target.value as PiagamTextTransform,
                                    })
                                  }
                                  className="w-full px-1 py-1 text-xs rounded border border-slate-300 bg-white text-center"
                                >
                                  <option value="none">Asli</option>
                                  <option value="uppercase">KAPITAL</option>
                                  <option value="capitalize">Awal Kata</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Perataan Paragraf</label>
                              <div className="grid grid-cols-3 gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateColumn(col.id, { align: 'left' })}
                                  className={`flex items-center justify-center gap-1 py-1 rounded border text-xs font-semibold ${
                                    col.align === 'left'
                                      ? 'bg-slate-800 text-white border-slate-800'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <AlignLeft className="w-3.5 h-3.5" />
                                  <span>Kiri</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateColumn(col.id, { align: 'center' })}
                                  className={`flex items-center justify-center gap-1 py-1 rounded border text-xs font-semibold ${
                                    col.align === 'center'
                                      ? 'bg-slate-800 text-white border-slate-800'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <AlignCenter className="w-3.5 h-3.5" />
                                  <span>Tengah</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateColumn(col.id, { align: 'right' })}
                                  className={`flex items-center justify-center gap-1 py-1 rounded border text-xs font-semibold ${
                                    col.align === 'right'
                                      ? 'bg-slate-800 text-white border-slate-800'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                  }`}
                                >
                                  <AlignRight className="w-3.5 h-3.5" />
                                  <span>Kanan</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* PANEL KANAN: LIVE PREVIEW PANEL */}
        <div className="print:hidden lg:col-span-7 xl:col-span-8 flex flex-col items-center">
          {/* Toolbar Pratinjau Atas */}
          <div className="w-full flex flex-wrap items-center justify-between bg-white p-2.5 px-3.5 rounded-xl border border-slate-200 mb-3 shadow-2xs gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-800 m-0">Live Preview Panel</h2>
              <span className="badge bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded">
                {orientation === 'landscape' ? '297 × 210 mm' : '210 × 297 mm'}
              </span>
            </div>

            {/* Navigasi Pratinjau Antar Santri */}
            {selectedSantriIndukList.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleNav('first')}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  title="Penerima Pertama"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('prev')}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  title="Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="badge bg-slate-800 text-white px-2.5 py-1 text-[11px] font-mono font-bold rounded">
                  {currentPreviewIndex + 1} / {selectedSantriIndukList.length}
                </span>
                <button
                  type="button"
                  onClick={() => handleNav('next')}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  title="Selanjutnya"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('last')}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                  title="Penerima Terakhir"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Kontrol Zoom */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Zoom:</span>
              <input
                type="range"
                min="25"
                max="100"
                value={Math.round(zoomScale * 100)}
                onChange={(e) => setZoomScale(parseInt(e.target.value, 10) / 100)}
                className="w-24 accent-emerald-700"
              />
              <span className="badge bg-slate-100 text-slate-700 border border-slate-200 font-mono text-[10px] w-10 text-center py-0.5 rounded">
                {Math.round(zoomScale * 100)}%
              </span>
            </div>
          </div>

          {/* Tips Cetak Info Banner */}
          <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-2.5 px-3.5 text-xs text-blue-900 flex items-center justify-between mb-3 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Tips Cetak:</strong> Pastikan opsi <em>&quot;Grafik Latar Belakang&quot; (Background Graphics)</em> tercentang dan <em>Margin</em> diatur ke <em>&quot;None&quot;</em> pada dialog cetak browser.
              </span>
            </div>
            <span className="text-[11px] text-blue-700/80 italic hidden md:inline shrink-0 ml-2">
              Klik teks pada kanvas untuk mengedit posisi
            </span>
          </div>

          {/* Canvas Scroll Wrapper */}
          <div className="w-full overflow-auto p-4 bg-slate-200 rounded-2xl border border-slate-300 shadow-inner flex items-center justify-center min-h-[540px]">
            <div
              className={`piagam-canvas ${
                orientation === 'portrait' ? 'piagam-portrait' : 'piagam-landscape'
              }`}
              style={{
                transform: `scale(${zoomScale})`,
                backgroundImage: effectiveBgUrl ? `url('${effectiveBgUrl}')` : undefined,
              }}
            >
              {effectiveBgUrl && (
                <img
                  src={effectiveBgUrl}
                  alt="Piagam Background"
                  className="piagam-bg-print"
                />
              )}

              {!effectiveBgUrl && (
                <div className="absolute inset-4 border-4 border-double border-emerald-900/30 rounded pointer-events-none flex flex-col items-center justify-between p-8 text-center opacity-40">
                  <span className="text-xs font-serif tracking-widest text-emerald-900 font-bold">
                    MADRASAH DINIYYAH AL AMIRIYYAH BLOKAGUNG
                  </span>
                  <div className="text-3xl font-serif text-emerald-900/30 font-bold">
                    SYAHADAH MUHAFADZOH
                  </div>
                  <span className="text-[10px] text-slate-400">Bingkai Default Piagam</span>
                </div>
              )}

              {/* Elemen Teks Piagam */}
              {columns
                .filter((col) => col.show)
                .map((col) => {
                  const isActive = activeElementId === col.id;
                  const displayText = parseMergeTags(
                    col.text,
                    currentSantri,
                    setoranList,
                    col.textTransform
                  );

                  let transformAnchor = 'translate(-50%, -50%)';
                  if (col.align === 'left') transformAnchor = 'translate(0, -50%)';
                  else if (col.align === 'right') transformAnchor = 'translate(-100%, -50%)';

                  return (
                    <div
                      key={col.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveElementId(col.id);
                      }}
                      style={{
                        left: `${col.x}%`,
                        top: `${col.y}%`,
                        fontSize: `${col.size}px`,
                        color: col.color || '#000000',
                        fontFamily: col.fontFamily || "'Times New Roman', serif",
                        fontWeight: col.isBold ? 'bold' : 'normal',
                        textAlign: col.align || 'center',
                        transform: transformAnchor,
                      }}
                      className={`piagam-element ${isActive ? 'piagam-element-active' : ''}`}
                    >
                      {displayText}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. WADAH CETAK TERISOLASI KHUSUS PRINT BATCH A4 (@media print) */}
      <div id="piagamPrintContainer" className="hidden print:block">
        {printSantriList.map((santri, sIdx) => (
          <div
            key={santri.no_induk || sIdx}
            className={`piagam-canvas ${
              orientation === 'portrait' ? 'piagam-portrait' : 'piagam-landscape'
            }`}
            style={{
              backgroundImage: effectiveBgUrl ? `url('${effectiveBgUrl}')` : undefined,
            }}
          >
            {effectiveBgUrl && (
              <img
                src={effectiveBgUrl}
                alt="Piagam Background"
                className="piagam-bg-print"
              />
            )}

            {columns
              .filter((col) => col.show)
              .map((col) => {
                const displayText = parseMergeTags(
                  col.text,
                  santri,
                  setoranList,
                  col.textTransform
                );

                let transformAnchor = 'translate(-50%, -50%)';
                if (col.align === 'left') transformAnchor = 'translate(0, -50%)';
                else if (col.align === 'right') transformAnchor = 'translate(-100%, -50%)';

                return (
                  <div
                    key={col.id}
                    style={{
                      left: `${col.x}%`,
                      top: `${col.y}%`,
                      fontSize: `${col.size}px`,
                      color: col.color || '#000000',
                      fontFamily: col.fontFamily || "'Times New Roman', serif",
                      fontWeight: col.isBold ? 'bold' : 'normal',
                      textAlign: col.align || 'center',
                      transform: transformAnchor,
                    }}
                    className="piagam-element"
                  >
                    {displayText}
                  </div>
                );
              })}
          </div>
        ))}
      </div>

      {/* 4. MODAL PEMILIHAN PENERIMA PIAGAM MASSAL */}
      <ModalSelectSantriPiagam
        isOpen={isSantriModalOpen}
        onClose={closeSantriModal}
        onApply={(list) => setSelectedSantriIndukList(list)}
        initialSelected={selectedSantriIndukList}
      />
    </div>
  );
}
