'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { getDaftarTingkatKelasDiniyyah, norm } from '@/lib/utils/setoranHelper';
import { Save, Info, X, Check } from 'lucide-react';

export default function ModalSettingsHafalan() {
  const { isSettingsOpen, closeSettings, config, saveConfig } = useMuhafadzohStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { santriList } = useSantriStore();

  const [activeTab, setActiveTab] = useState<'wajib' | 'sunnah' | 'kitab' | 'penjaga'>('wajib');

  // Local state for configuration
  const [localWajib, setLocalWajib] = useState<Record<string, string>>({});
  const [localSunnah, setLocalSunnah] = useState<Record<string, string>>({});
  const [localKitab, setLocalKitab] = useState<Record<string, string>>({});
  const [selectedPenjagaBebas, setSelectedPenjagaBebas] = useState<string[]>([]);
  const [penjagaSearch, setPenjagaSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (asatidzList.length === 0) fetchAsatidz();
    if (formasiList.length === 0) fetchFormasi();
  }, [asatidzList.length, formasiList.length, fetchAsatidz, fetchFormasi]);

  // Compute available tingkat & kelas pairs
  const pairs = useMemo(() => {
    return getDaftarTingkatKelasDiniyyah(formasiList, santriList);
  }, [formasiList, santriList]);

  // Initialize inputs from config when opened
  useEffect(() => {
    if (!isSettingsOpen) return;

    const mapToStr = (source: Record<string, any> = {}) => {
      const res: Record<string, string> = {};
      pairs.forEach(({ key }) => {
        const val = source[key];
        if (Array.isArray(val)) {
          res[key] = val.join(', ');
        } else if (typeof val === 'string') {
          res[key] = val;
        } else if (typeof val === 'number') {
          res[key] = String(val);
        } else {
          res[key] = '';
        }
      });
      return res;
    };

    setLocalWajib(mapToStr(config.hafWajib));
    setLocalSunnah(mapToStr(config.hafSunnah));
    setLocalKitab(mapToStr(config.hafKitab));
    setSelectedPenjagaBebas([...(config.penjagaBebas || [])]);
    setPenjagaSearch('');
    setIsDropdownOpen(false);
  }, [isSettingsOpen, config, pairs]);

  // Autocomplete matching for Penjaga Bebas
  const filteredAsatidz = useMemo(() => {
    if (!penjagaSearch.trim()) return [];
    const q = norm(penjagaSearch);
    return asatidzList
      .filter((a) => norm(a.nama_asatidz).includes(q))
      .slice(0, 10);
  }, [penjagaSearch, asatidzList]);

  const handleAddPenjagaBebas = (nama: string) => {
    if (!selectedPenjagaBebas.includes(nama)) {
      setSelectedPenjagaBebas([...selectedPenjagaBebas, nama]);
    }
    setPenjagaSearch('');
    setIsDropdownOpen(false);
  };

  const handleRemovePenjagaBebas = (idx: number) => {
    setSelectedPenjagaBebas(selectedPenjagaBebas.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setIsSaving(true);

    const parseToArrays = (source: Record<string, string>) => {
      const res: Record<string, string[]> = {};
      Object.entries(source).forEach(([key, val]) => {
        const arr = String(val || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (arr.length > 0) res[key] = arr;
      });
      return res;
    };

    const newConfig = {
      hafWajib: parseToArrays(localWajib),
      hafSunnah: parseToArrays(localSunnah),
      hafKitab: parseToArrays(localKitab),
      penjagaBebas: selectedPenjagaBebas,
    };

    const success = await saveConfig(newConfig);
    setIsSaving(false);

    if (success) {
      closeSettings();
    }
  };

  return (
    <Dialog
      isOpen={isSettingsOpen}
      onClose={closeSettings}
      title="Pengaturan Target Muhafadzoh & Item Hafalan"
      maxWidth="2xl"
    >
      <div className="space-y-4 -mt-2">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-1 bg-slate-50 p-1 rounded-t-lg">
          <button
            type="button"
            onClick={() => setActiveTab('wajib')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${
              activeTab === 'wajib'
                ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hafalan Wajib
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sunnah')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${
              activeTab === 'sunnah'
                ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hafalan Sunnah
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kitab')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${
              activeTab === 'kitab'
                ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hafalan Kitab
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('penjaga')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition ${
              activeTab === 'penjaga'
                ? 'bg-white text-emerald-800 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Akses Penjaga
          </button>
        </div>

        {/* Tab 1: Hafalan Wajib */}
        {activeTab === 'wajib' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>Pisahkan setiap item materi hafalan wajib dengan tanda koma (,).</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {pairs.map(({ key, label }) => (
                <div key={key} className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="block text-xs font-bold text-emerald-800 mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={localWajib[key] || ''}
                    onChange={(e) => setLocalWajib({ ...localWajib, [key]: e.target.value })}
                    placeholder="Contoh: Nadhom Imrithi, Juz Amma..."
                    className="w-full text-xs py-1.5 px-2.5 rounded border border-slate-300 focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Hafalan Sunnah */}
        {activeTab === 'sunnah' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-700 flex-shrink-0" />
              <span>Pisahkan setiap item materi hafalan sunnah dengan tanda koma (,).</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {pairs.map(({ key, label }) => (
                <div key={key} className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="block text-xs font-bold text-blue-800 mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={localSunnah[key] || ''}
                    onChange={(e) => setLocalSunnah({ ...localSunnah, [key]: e.target.value })}
                    placeholder="Contoh: Hidayatus Shibyan..."
                    className="w-full text-xs py-1.5 px-2.5 rounded border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Hafalan Kitab */}
        {activeTab === 'kitab' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Pisahkan setiap materi hafalan kitab dengan tanda koma (,).</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {pairs.map(({ key, label }) => (
                <div key={key} className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <label className="block text-xs font-bold text-amber-800 mb-1">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={localKitab[key] || ''}
                    onChange={(e) => setLocalKitab({ ...localKitab, [key]: e.target.value })}
                    placeholder="Contoh: Mabadi Fiqhiyyah..."
                    className="w-full text-xs py-1.5 px-2.5 rounded border border-slate-300 focus:outline-none focus:border-amber-600 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Akses Penjaga Bebas */}
        {activeTab === 'penjaga' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed">
              <strong>Info Akses Khusus:</strong> Secara default, Penjaga hanya bisa menjaga Santri dengan{' '}
              <strong>Tingkat dan Gender (PA/PI) yang sama</strong>. Masukkan nama Asatidz di bawah ini jika Anda ingin memberikan hak spesial agar Asatidz tersebut bisa menjaga{' '}
              <strong>semua tingkat dan gender santri</strong>.
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1.5">
                Nama Asatidz (Akses Bebas)
              </label>

              {/* Chips Input Box */}
              <div className="p-2 rounded-lg border-2 border-emerald-600 bg-white min-h-[48px] flex flex-wrap gap-1.5 items-center relative">
                {selectedPenjagaBebas.map((nama, idx) => (
                  <span
                    key={`${nama}_${idx}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-700 text-white shadow-2xs"
                  >
                    <span>{nama}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePenjagaBebas(idx)}
                      className="hover:text-rose-200 text-white transition p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={penjagaSearch}
                  onChange={(e) => {
                    setPenjagaSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Ketik nama Asatidz untuk menambahkan..."
                  className="flex-1 min-w-[200px] text-xs py-1 px-2 border-0 focus:outline-none bg-transparent"
                />

                {/* Dropdown Suggestions */}
                {isDropdownOpen && filteredAsatidz.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {filteredAsatidz.map((a) => {
                      const nama = a.nama_asatidz || '';
                      const isSelected = selectedPenjagaBebas.includes(nama);
                      const kelas = `${a.din_kls_asatidz || ''} ${a.din_bag_asatidz || ''} ${a.tingkat_asatidz || ''}`.trim();

                      return (
                        <div
                          key={a.id || a.nia || nama}
                          onClick={() => handleAddPenjagaBebas(nama)}
                          className="p-2 text-xs hover:bg-emerald-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <strong className="text-slate-800">{nama}</strong>
                            <span className="text-slate-400 text-[11px] ml-2">Kelas: {kelas || '-'}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={closeSettings}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
