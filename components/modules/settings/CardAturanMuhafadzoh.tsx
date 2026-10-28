'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Award,
  Users,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { HafalanConfig } from '@/types/setoran';
import { DEFAULT_HAFALAN_WAJIB } from '@/lib/utils/setoranHelper';

export default function CardAturanMuhafadzoh() {
  const { config, saveConfig, fetchSetoranData } = useMuhafadzohStore();

  const [hafWajibDraft, setHafWajibDraft] = useState<Record<string, string[]>>({});
  const [penjagaList, setPenjagaList] = useState<string[]>([]);
  const [newPenjagaName, setNewPenjagaName] = useState('');
  const [minBaitPiagam, setMinBaitPiagam] = useState(100);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchSetoranData();
  }, [fetchSetoranData]);

  useEffect(() => {
    if (config) {
      setHafWajibDraft(
        config.hafWajib && Object.keys(config.hafWajib).length > 0
          ? config.hafWajib
          : DEFAULT_HAFALAN_WAJIB
      );

      const pb = Array.isArray(config.penjagaBebas)
        ? config.penjagaBebas
        : String(config.penjagaBebas || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

      setPenjagaList(
        pb.length > 0
          ? pb
          : ['Ust. Ahmad Syakir', 'Ust. Zainal Fanani', 'Ust. M. Khoiruddin']
      );
    }
  }, [config]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleUpdateKitabList = (tingkatKey: string, rawText: string) => {
    const list = rawText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setHafWajibDraft((prev) => ({
      ...prev,
      [tingkatKey]: list,
    }));
  };

  const handleAddPenjaga = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPenjagaName.trim();
    if (!clean) return;
    if (penjagaList.includes(clean)) {
      alert('Nama penjaga ini sudah ada dalam daftar.');
      return;
    }
    setPenjagaList((prev) => [...prev, clean]);
    setNewPenjagaName('');
    showNotification(`Penjaga "${clean}" ditambahkan ke daftar.`);
  };

  const handleRemovePenjaga = (name: string) => {
    setPenjagaList((prev) => prev.filter((p) => p !== name));
    showNotification(`Penjaga "${name}" dihapus dari daftar.`);
  };

  const handleSaveAll = async () => {
    const payload: HafalanConfig = {
      hafWajib: hafWajibDraft,
      hafSunnah: config?.hafSunnah || {},
      hafKitab: config?.hafKitab || {},
      penjagaBebas: penjagaList,
    };

    const ok = await saveConfig(payload);
    if (ok) {
      showNotification('Aturan target hafalan & daftar Mustahiq berhasil disimpan ke Supabase!');
    }
  };

  const formatTingkatLabel = (key: string) => {
    return key.replace('_', ' Kelas ');
  };

  return (
    <div data-testid="card-aturan-muhafadzoh" className="space-y-6">
      {/* Banner Notifikasi */}
      {notification && (
        <div className="p-3.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-300 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Bagian 1: Target Hafalan Nadzom Per Jenjang */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-semibold mb-2 border border-rose-200">
            <BookOpen className="w-3.5 h-3.5 text-rose-600" />
            <span>Kurikulum Turots &amp; Nadzom</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Target Hafalan Nadzom Wajib Per Tingkatan Kelas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi judul kitab nadzom wajib yang disetorkan santri per jenjang sebagai syarat kelulusan.
          </p>
        </div>

        {/* Grid Tingkatan Kelas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(hafWajibDraft).map(([tingkatKey, items]) => (
            <div
              key={tingkatKey}
              data-testid={`card-tingkat-${tingkatKey.toLowerCase()}`}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  {formatTingkatLabel(tingkatKey)}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                  {items.length} Kitab
                </span>
              </div>

              <div>
                <input
                  type="text"
                  data-testid={`input-kitab-${tingkatKey.toLowerCase()}`}
                  value={items.join(', ')}
                  onChange={(e) => handleUpdateKitabList(tingkatKey, e.target.value)}
                  placeholder="Ketik nama kitab dipisah koma..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Pisahkan dengan tanda koma (contoh: <em>Aqidatul Awam, Nadzom Tashrif</em>)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bagian 2: Penjaga Bebas / Mustahiq Penyimak */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2 border border-emerald-200">
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Otorisasi Penyimak Muhafadzoh</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Daftar Mustahiq / Penjaga Bebas Setoran
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hanya asatidz dalam daftar ini yang berwenang memvalidasi setoran santri di luar jam KBM resmi.
          </p>
        </div>

        {/* Form Tambah Penjaga */}
        <form onSubmit={handleAddPenjaga} className="flex items-center gap-2 max-w-md">
          <input
            type="text"
            data-testid="input-new-penjaga"
            placeholder="Ketik nama Mustahiq baru..."
            value={newPenjagaName}
            onChange={(e) => setNewPenjagaName(e.target.value)}
            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            type="submit"
            data-testid="btn-add-penjaga"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </form>

        {/* Tags Penjaga Bebas */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 block">
            Asatidz Terdaftar ({penjagaList.length} Mustahiq):
          </span>
          <div className="flex flex-wrap gap-2">
            {penjagaList.map((nama) => (
              <span
                key={nama}
                data-testid={`tag-penjaga-${nama.replace(/\s+/g, '-').toLowerCase()}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold"
              >
                <span>{nama}</span>
                <button
                  type="button"
                  data-testid={`btn-remove-penjaga-${nama.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => handleRemovePenjaga(nama)}
                  className="p-0.5 rounded-full hover:bg-emerald-200 text-emerald-700 transition"
                  title={`Hapus ${nama}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Ambang Batas Minimum Piagam */}
        <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 space-y-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-rose-700" />
            <span className="text-xs font-bold text-rose-900">
              Ambang Batas Minimum Penerbitan Piagam Tasmi'
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              data-testid="input-min-bait-piagam"
              value={minBaitPiagam}
              onChange={(e) => setMinBaitPiagam(Number(e.target.value))}
              min={20}
              className="w-24 px-3 py-1.5 rounded-lg border border-rose-200 bg-white font-bold text-xs text-slate-800"
            />
            <span className="text-xs text-slate-500">
              Bait tasmi' minimum dalam 1 majlis setoran agar piagam berhak dicetak.
            </span>
          </div>
        </div>

        {/* Tombol Simpan Terpadu */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            data-testid="btn-save-aturan-muhafadzoh"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Seluruh Aturan Muhafadzoh</span>
          </button>
        </div>
      </div>
    </div>
  );
}
