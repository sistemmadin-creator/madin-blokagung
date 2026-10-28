'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  Type,
  Layout,
  Save,
  CheckCircle2,
  Image as ImageIcon,
  UserCheck,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { usePiagamStore } from '@/stores/usePiagamStore';
import { PiagamOrientation } from '@/types/piagam';

const FONT_OPTIONS = [
  { value: 'Amiri', label: 'Amiri (Tradisional Naskhi Arab)' },
  { value: 'Scheherazade New', label: 'Scheherazade New (Klasik Turots)' },
  { value: 'Playfair Display', label: 'Playfair Display (Serif Elegan Formal)' },
  { value: 'Cinzel', label: 'Cinzel (Kapital Monumental Piagam)' },
  { value: 'Times New Roman', label: 'Times New Roman (Standar Dokumen)' },
];

export default function CardAturanPiagam() {
  const {
    templates,
    activeTemplateName,
    orientation,
    setOrientation,
    saveTemplate,
    loadTemplates,
  } = usePiagamStore();

  const [selectedFont, setSelectedFont] = useState('Amiri');
  const [kepalaMadin, setKepalaMadin] = useState('KH. Ahmad Munir, S.Pd.I');
  const [ketuaMuhafadzoh, setKetuaMuhafadzoh] = useState('Ust. M. Hasyim Asy\'ari');
  const [templateName, setTemplateName] = useState('Template Resmi Tasmi 2026');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = templateName.trim();
    if (!cleanName) return;

    const ok = await saveTemplate(cleanName);
    if (ok) {
      showNotification(`Template piagam "${cleanName}" berhasil disimpan ke sistem!`);
    } else {
      showNotification(`Pengaturan piagam diperbarui secara lokal.`);
    }
  };

  return (
    <div data-testid="card-aturan-piagam" className="space-y-6">
      {/* Banner Notifikasi */}
      {notification && (
        <div className="p-3.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-300 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-semibold mb-2 border border-indigo-200">
            <Award className="w-3.5 h-3.5 text-indigo-600" />
            <span>Format Sertifikasi Syahadah &amp; Piagam</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Standar Desain &amp; Tipografi Piagam Nadzom
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi jenis huruf kaligrafi, orientasi kertas sertifikat, dan penandatangan resmi piagam kelulusan muhafadzoh.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Pilihan Tipografi & Orientasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Font */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Type className="w-4 h-4 text-indigo-700" />
                <span>Jenis Huruf Utama (Font Piagam)</span>
              </label>
              <select
                data-testid="select-font-piagam"
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400 block">
                Font terpilih akan diterapkan pada cetakan teks bait dan nama santri.
              </span>
            </div>

            {/* Orientasi Kertas */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Layout className="w-4 h-4 text-indigo-700" />
                <span>Orientasi Format Cetak</span>
              </label>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  data-testid="btn-orientation-landscape"
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition text-center ${
                    orientation === 'landscape'
                      ? 'bg-indigo-700 text-white border-indigo-800 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Landscape (Mendatar)
                </button>
                <button
                  type="button"
                  data-testid="btn-orientation-portrait"
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition text-center ${
                    orientation === 'portrait'
                      ? 'bg-indigo-700 text-white border-indigo-800 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Portrait (Tegak)
                </button>
              </div>
            </div>
          </div>

          {/* Penandatangan Resmi */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-700" />
              <span>Pejabat Penandatangan Sertifikat Piagam</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">
                  Kepala / Mudir Madrasah Diniyyah
                </label>
                <input
                  type="text"
                  data-testid="input-kepala-madin"
                  value={kepalaMadin}
                  onChange={(e) => setKepalaMadin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">
                  Ketua Departemen PKM Muhafadzoh
                </label>
                <input
                  type="text"
                  data-testid="input-ketua-muhafadzoh"
                  value={ketuaMuhafadzoh}
                  onChange={(e) => setKetuaMuhafadzoh(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Nama Template & Tombol Simpan */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Nama Template:
              </label>
              <input
                type="text"
                data-testid="input-template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 border border-slate-200 rounded-lg bg-white w-full sm:w-64"
              />
            </div>

            <button
              type="submit"
              data-testid="btn-save-piagam-template"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition shadow-sm w-full sm:w-auto justify-center"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi Piagam</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
