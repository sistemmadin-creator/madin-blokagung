'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { compareNIANatural } from '@/lib/utils/fanHelper';
import {
  GripVertical,
  PlusCircle,
  Search,
  X,
  RotateCcw,
  Save,
  Trash2,
  Edit,
  Lock,
  Zap,
} from 'lucide-react';
import { GrupAsalItem } from '@/types/fan';

export default function ModalGrupAsal() {
  const {
    isModalGrupAsalOpen,
    closeModalGrupAsal,
    masterGrupAsal,
    saveMasterGrupAsal,
    deleteGrupAsal,
    reorderGrupAsal,
  } = useFanStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [namaGrup, setNamaGrup] = useState('');
  const [selectedAsatidz, setSelectedAsatidz] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [quickNiaChecks, setQuickNiaChecks] = useState<Record<string, boolean>>({
    A: false,
    B: false,
    C: false,
    D: false,
    E: false,
  });
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isModalGrupAsalOpen) {
      if (asatidzList.length === 0) fetchAsatidz();
      resetForm();
    }
  }, [isModalGrupAsalOpen, asatidzList.length, fetchAsatidz]);

  const resetForm = () => {
    setNamaGrup('');
    setSelectedAsatidz([]);
    setSearch('');
    setQuickNiaChecks({ A: false, B: false, C: false, D: false, E: false });
  };

  // Peta asatidz yang sudah ada di grup lain
  const mapGrupLain = useMemo(() => {
    const map: Record<string, string> = {};
    (masterGrupAsal || []).forEach((g) => {
      // Kecualikan grup yang sedang diedit dengan nama yang sama
      if (g.namaGrup.toUpperCase() !== namaGrup.trim().toUpperCase()) {
        (g.anggota || []).forEach((m) => {
          map[m.trim().toUpperCase()] = g.namaGrup;
        });
      }
    });
    return map;
  }, [masterGrupAsal, namaGrup]);

  // Saring dan urutkan Asatidz
  const sortedAndFilteredAsatidz = useMemo(() => {
    const selectedSet = new Set(selectedAsatidz.map((n) => n.trim().toUpperCase()));
    const q = search.trim().toLowerCase();

    const filtered = asatidzList.filter((a) => {
      if (!q) return true;
      const full = `${a.nama_asatidz} ${a.nia || ''} ${a.jah_asatidz || ''} ${mapGrupLain[a.nama_asatidz.toUpperCase()] || ''}`.toLowerCase();
      return full.includes(q);
    });

    return filtered.slice().sort((a, b) => {
      const nA = a.nama_asatidz.toUpperCase();
      const nB = b.nama_asatidz.toUpperCase();
      const selA = selectedSet.has(nA) ? 0 : 1;
      const selB = selectedSet.has(nB) ? 0 : 1;
      if (selA !== selB) return selA - selB;
      return compareNIANatural(a.nia, b.nia);
    });
  }, [asatidzList, selectedAsatidz, search, mapGrupLain]);

  const handleToggleAsatidz = (nama: string) => {
    setSelectedAsatidz((prev) =>
      prev.includes(nama) ? prev.filter((n) => n !== nama) : [...prev, nama]
    );
  };

  const handleQuickSelectHuruf = (huruf: string, isChecked: boolean) => {
    setQuickNiaChecks((prev) => ({ ...prev, [huruf]: isChecked }));
    const hLower = huruf.toLowerCase();

    // Temukan asatidz dengan awalan huruf ini yang tidak dikunci grup lain
    const targetNames = asatidzList
      .filter((a) => {
        const nia = String(a.nia || '').toLowerCase();
        const isLocked = !!mapGrupLain[a.nama_asatidz.toUpperCase()];
        return nia.startsWith(hLower) && !isLocked;
      })
      .map((a) => a.nama_asatidz);

    if (isChecked) {
      setSelectedAsatidz((prev) => Array.from(new Set([...prev, ...targetNames])));
    } else {
      const targetSet = new Set(targetNames);
      setSelectedAsatidz((prev) => prev.filter((n) => !targetSet.has(n)));
    }
  };

  const handleSaveGrup = async () => {
    const cleanNama = namaGrup.trim().toUpperCase();
    if (!cleanNama) {
      alert('Harap isi nama grup asal terlebih dahulu!');
      return;
    }
    if (selectedAsatidz.length === 0) {
      alert('Pilih minimal satu Asatidz untuk grup ini!');
      return;
    }

    setIsSubmitting(true);
    const list: GrupAsalItem[] = [...masterGrupAsal];
    const existingIdx = list.findIndex((g) => g.namaGrup.toUpperCase() === cleanNama);

    if (existingIdx > -1) {
      list[existingIdx].anggota = selectedAsatidz;
    } else {
      list.push({ namaGrup: cleanNama, anggota: selectedAsatidz });
    }

    const success = await saveMasterGrupAsal(list);
    setIsSubmitting(false);

    if (success) {
      resetForm();
    } else {
      alert('Gagal menyimpan grup asal.');
    }
  };

  const handleEditGrup = (g: GrupAsalItem) => {
    setNamaGrup(g.namaGrup);
    setSelectedAsatidz(g.anggota || []);
    setSearch('');
    setQuickNiaChecks({ A: false, B: false, C: false, D: false, E: false });
  };

  const handleDeleteGrup = async (idx: number, nama: string) => {
    if (confirm(`Hapus Grup ${nama}? Asatidz di dalamnya akan kembali menjadi Asatidz tanpa Grup Asal.`)) {
      await deleteGrupAsal(idx);
      if (namaGrup.toUpperCase() === nama.toUpperCase()) {
        resetForm();
      }
    }
  };

  // Drag & drop handlers
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    await reorderGrupAsal(draggedIdx, targetIdx);
    setDraggedIdx(null);
  };

  return (
    <Dialog
      isOpen={isModalGrupAsalOpen}
      onClose={closeModalGrupAsal}
      title="Pengaturan Grup Asal Asatidz"
      maxWidth="4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Kolom Kiri: Form Buat / Edit Grup (7 Kolom) */}
        <div className="md:col-span-7 space-y-3.5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200 text-xs font-bold text-emerald-800">
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            <span>Buat / Edit Grup Asal</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              1. Nama Grup Asal (Tampil Vertikal di Kolom ASAL)
            </label>
            <input
              type="text"
              value={namaGrup}
              onChange={(e) => setNamaGrup(e.target.value.toUpperCase())}
              placeholder="Contoh: PONDOK INDUK / BLOK A / SENIOR"
              className="w-full text-xs font-bold uppercase py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 shadow-xs"
            />
          </div>

          {/* Quick Select Huruf NIA */}
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Pilih Cepat Asatidz Berdasarkan Awalan NIA:</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {(['A', 'B', 'C', 'D', 'E'] as const).map((huruf) => (
                <label key={huruf} className="flex items-center gap-1 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickNiaChecks[huruf]}
                    onChange={(e) => handleQuickSelectHuruf(huruf, e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                  />
                  <span>Kode {huruf}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Pilih Anggota Asatidz */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700">
                2. Pilih Anggota Asatidz
              </label>
              <span className="text-[11px] font-bold text-emerald-700">
                {selectedAsatidz.length} Dipilih
              </span>
            </div>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Nama / NIA / Jah..."
                className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg max-h-[220px] overflow-y-auto p-1.5 space-y-1 bg-white">
              {sortedAndFilteredAsatidz.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  Tidak ada data asatidz.
                </div>
              ) : (
                sortedAndFilteredAsatidz.map((a, idx) => {
                  const nama = a.nama_asatidz;
                  const nia = a.nia || '-';
                  const jah = a.jah_asatidz || '-';
                  const grupLain = mapGrupLain[nama.toUpperCase()];
                  const isChecked = selectedAsatidz.includes(nama);
                  const isLocked = !isChecked && !!grupLain;

                  return (
                    <label
                      key={idx}
                      className={`flex items-center justify-between py-1 px-2 rounded-md transition-colors text-xs ${
                        isChecked
                          ? 'bg-emerald-50 border border-emerald-200'
                          : isLocked
                          ? 'bg-slate-100/70 text-slate-400 cursor-not-allowed'
                          : 'hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={() => handleToggleAsatidz(nama)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 flex-shrink-0"
                        />
                        <span className="text-[10px] font-mono font-bold bg-slate-800 text-white px-1.5 py-0.2 rounded">
                          [{nia}]
                        </span>
                        <span className="font-semibold truncate" title={nama}>
                          {nama} <span className="font-normal text-slate-400">({jah})</span>
                        </span>
                      </div>

                      {isLocked && (
                        <span className="text-[10px] text-slate-500 bg-slate-200 border border-slate-300 px-1.5 py-0.2 rounded flex items-center gap-1 flex-shrink-0 ml-1">
                          <Lock className="w-2.5 h-2.5 text-rose-500" />
                          <span>{grupLain}</span>
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bersihkan Form</span>
            </button>
            <button
              type="button"
              onClick={handleSaveGrup}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Grup'}</span>
            </button>
          </div>
        </div>

        {/* Kolom Kanan: Daftar Grup Tersimpan (5 Kolom) */}
        <div className="md:col-span-5 space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800">
              Grup Tersimpan ({masterGrupAsal.length})
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
              Drag untuk urutkan
            </span>
          </div>

          <p className="text-[11px] text-slate-400 italic leading-snug">
            Urutan di bawah menentukan susunan vertikal kolom ASAL pada tabel Pengajar Fan.
          </p>

          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {masterGrupAsal.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Belum ada grup asal yang dibuat.
              </div>
            ) : (
              masterGrupAsal.map((g, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                    draggedIdx === idx
                      ? 'opacity-40 border-dashed border-emerald-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="w-4 h-4 text-slate-400 cursor-grab flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate" title={g.namaGrup}>
                        {g.namaGrup}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {g.anggota?.length || 0} Asatidz
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => handleEditGrup(g)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 rounded hover:bg-slate-100"
                      title="Edit grup"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGrup(idx, g.namaGrup)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-slate-100"
                      title="Hapus grup"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
