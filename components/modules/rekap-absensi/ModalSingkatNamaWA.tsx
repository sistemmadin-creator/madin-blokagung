'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Save,
  Check,
  Type,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';

interface ModalSingkatNamaWAProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ModalSingkatNamaWA({
  isOpen,
  onClose,
  onSaved,
}: ModalSingkatNamaWAProps) {
  const {
    singkatanAsatidzMap,
    fetchSingkatanAsatidz,
    saveSingkatanAsatidz,
    sesiHariIni,
    _cachedMaster,
  } = useAbsensiStore();

  const { asatidzList, fetchAsatidz, isLoading: isAsatidzLoading } = useAsatidzStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [localMap, setLocalMap] = useState<Record<string, string>>({});
  const [rowSavingKey, setRowSavingKey] = useState<string | null>(null);
  const [savedRowKey, setSavedRowKey] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Inisialisasi data saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      if (asatidzList.length === 0) {
        fetchAsatidz();
      }
      fetchSingkatanAsatidz().then((mapping) => {
        setLocalMap(mapping || {});
      });
      setSearchQuery('');
    }
  }, [isOpen, asatidzList.length, fetchAsatidz, fetchSingkatanAsatidz]);

  // Sinkronkan localMap dengan singkatanAsatidzMap di store
  useEffect(() => {
    if (singkatanAsatidzMap) {
      setLocalMap(singkatanAsatidzMap);
    }
  }, [singkatanAsatidzMap]);

  // Daftar nama asatidz unik terurut alfabetis
  const daftarNamaAsatidz = useMemo(() => {
    const namaSet = new Set<string>();

    // 1. Dari master asatidzList
    asatidzList.forEach((a) => {
      const n = a.nama_asatidz?.trim();
      if (n) namaSet.add(n);
    });

    // 2. Dari cached master
    (_cachedMaster?.asatidzList || []).forEach((a) => {
      const n = a.nama_asatidz?.trim();
      if (n) namaSet.add(n);
    });

    // 3. Dari sesi KBM hari ini
    if (sesiHariIni) {
      Object.values(sesiHariIni).forEach((arr) => {
        (arr || []).forEach((s) => {
          const n = s.nama?.trim();
          if (n) namaSet.add(n);
        });
      });
    }

    // 4. Masukkan juga nama yang sudah ada di singkatanMap agar tidak hilang
    Object.keys(localMap).forEach((k) => {
      if (k.trim()) namaSet.add(k.trim());
    });

    return Array.from(namaSet).sort((a, b) => a.localeCompare(b));
  }, [asatidzList, _cachedMaster, sesiHariIni, localMap]);

  // Filter pencarian
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return daftarNamaAsatidz;
    return daftarNamaAsatidz.filter((nama) => {
      const singkatan = localMap[nama] || '';
      return (
        nama.toLowerCase().includes(q) ||
        singkatan.toLowerCase().includes(q)
      );
    });
  }, [daftarNamaAsatidz, searchQuery, localMap]);

  if (!isOpen) return null;

  const handleInputChange = (nama: string, value: string) => {
    setLocalMap((prev) => ({
      ...prev,
      [nama]: value,
    }));
  };

  const handleSaveRow = async (nama: string) => {
    setRowSavingKey(nama);
    const updated = {
      ...localMap,
    };
    const val = (localMap[nama] || '').trim();
    if (!val) {
      delete updated[nama];
    } else {
      updated[nama] = val;
    }

    try {
      const ok = await saveSingkatanAsatidz(updated);
      if (ok) {
        setSavedRowKey(nama);
        setTimeout(() => setSavedRowKey(null), 2500);
        if (onSaved) onSaved();
      }
    } finally {
      setRowSavingKey(null);
    }
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    try {
      const cleaned: Record<string, string> = {};
      Object.entries(localMap).forEach(([k, v]) => {
        if (v && v.trim()) {
          cleaned[k.trim()] = v.trim();
        }
      });
      const ok = await saveSingkatanAsatidz(cleaned);
      if (ok) {
        setToastMsg('Seluruh singkatan nama berhasil disimpan.');
        setTimeout(() => setToastMsg(null), 3000);
        if (onSaved) onSaved();
      }
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="modal-singkat-nama"
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[88vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-700 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Pengaturan Singkat Nama Asatidz
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                Ketik nama singkatan manual, lalu klik tombol Simpan di sebelah kanan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Pencarian */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama asatidz..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {toastMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}
        </div>

        {/* Tabel 2 Kolom Langsung: Kiri = Nama Asatidz Lengkap, Kanan = Kolom Singkatan + Tombol Simpan */}
        <div className="overflow-y-auto flex-1 p-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                <th className="py-2.5 px-3 text-left w-1/2">NAMA ASATIDZ LENGKAP</th>
                <th className="py-2.5 px-3 text-left w-1/2">NAMA SINGKATAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {daftarNamaAsatidz.length === 0 && isAsatidzLoading ? (
                <tr>
                  <td colSpan={2} className="py-10 text-center text-slate-500 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Memuat daftar asatidz...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="py-10 text-center text-slate-400 text-xs"
                  >
                    Tidak ditemukan asatidz yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredList.map((nama) => {
                  const currentValue = localMap[nama] || '';
                  const isRowSaved = savedRowKey === nama;

                  return (
                    <tr key={nama} className="hover:bg-slate-50/80 transition-colors">
                      {/* Kolom 1 (Kiri): Nama Asatidz Lengkap */}
                      <td className="py-2.5 px-3 font-bold text-slate-800 align-middle">
                        {nama}
                      </td>

                      {/* Kolom 2 (Kanan): Kolom Nama Singkatan + Tombol Simpan di Sebelah Kanannya */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => handleInputChange(nama, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveRow(nama);
                              }
                            }}
                            placeholder="Contoh singkatan..."
                            className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs font-medium text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRow(nama)}
                            disabled={rowSavingKey === nama}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer ${
                              isRowSaved
                                ? 'bg-emerald-600 text-white ring-2 ring-emerald-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                            title="Simpan singkatan baris ini"
                          >
                            {rowSavingKey === nama ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Menyimpan...</span>
                              </>
                            ) : isRowSaved ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Tersimpan</span>
                              </>
                            ) : (
                              <>
                                <Save className="w-3.5 h-3.5" />
                                <span>Simpan</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Total: <strong>{filteredList.length}</strong> Asatidz
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSavingAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {isSavingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Semua</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
