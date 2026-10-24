'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { cekKategoriJahAsatidz, compareNIANatural } from '@/lib/utils/fanHelper';
import { Search, X, CheckCircle2, ShieldCheck, UserCheck } from 'lucide-react';

export default function ModalPilihAsatidzFan() {
  const {
    isModalPilihAsatidzOpen,
    closeModalPilihAsatidz,
    selectedItemKeyForAsatidz,
    fanDetail,
    updateAsatidzItem,
  } = useFanStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [filterMS, setFilterMS] = useState(true);
  const [filterMB, setFilterMB] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isModalPilihAsatidzOpen) {
      if (asatidzList.length === 0) fetchAsatidz();
    }
  }, [isModalPilihAsatidzOpen, asatidzList.length, fetchAsatidz]);

  // Decode itemKey
  const { kelasKey, rawItem } = useMemo(() => {
    if (!selectedItemKeyForAsatidz) return { kelasKey: '', rawItem: '' };
    const parts = selectedItemKeyForAsatidz.split('||');
    return {
      kelasKey: parts[0] || '',
      rawItem: parts[1] || '',
    };
  }, [selectedItemKeyForAsatidz]);

  // Inisialisasi data terpilih dari store
  useEffect(() => {
    if (!isModalPilihAsatidzOpen || !selectedItemKeyForAsatidz) return;

    const det = (fanDetail.item && fanDetail.item[selectedItemKeyForAsatidz]) || {};
    const currentPengajar = det.pengajar || '';
    const currentAsatidz = Array.isArray(det.asatidz) ? det.asatidz : [];

    setSelectedNames(currentAsatidz);
    setFilterMS(currentPengajar.includes('MS') || !currentPengajar.includes('MB'));
    setFilterMB(currentPengajar.includes('MB'));
    setSearch('');
  }, [isModalPilihAsatidzOpen, selectedItemKeyForAsatidz, fanDetail]);

  // Saring dan urutkan Asatidz (yang terpilih di paling atas, lalu natural NIA)
  const sortedAndFilteredAsatidz = useMemo(() => {
    const selectedSet = new Set(selectedNames.map((n) => n.trim().toUpperCase()));
    const q = search.trim().toLowerCase();

    // 1. Filter
    const filtered = asatidzList.filter((a) => {
      const nama = String(a.nama_asatidz || '').trim();
      const nia = String(a.nia || '').trim();
      const jah = String(a.jah_asatidz || '').trim();
      const kat = cekKategoriJahAsatidz(jah);

      let matchKat = false;
      if (filterMS && kat.isMS) matchKat = true;
      if (filterMB && kat.isMB) matchKat = true;
      if (!filterMS && !filterMB) matchKat = true;
      if (!matchKat) return false;

      if (q) {
        const full = `${nama} ${nia} ${jah}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });

    // 2. Sort: yang terpilih di atas, lalu Natural NIA sort
    return filtered.slice().sort((a, b) => {
      const nA = String(a.nama_asatidz || '').trim().toUpperCase();
      const nB = String(b.nama_asatidz || '').trim().toUpperCase();
      const selA = selectedSet.has(nA) ? 0 : 1;
      const selB = selectedSet.has(nB) ? 0 : 1;
      if (selA !== selB) return selA - selB;
      return compareNIANatural(a.nia, b.nia);
    });
  }, [asatidzList, selectedNames, filterMS, filterMB, search]);

  const handleToggleAsatidz = (nama: string) => {
    setSelectedNames((prev) =>
      prev.includes(nama) ? prev.filter((n) => n !== nama) : [...prev, nama]
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const namesToAdd = sortedAndFilteredAsatidz.map((a) => a.nama_asatidz);
      setSelectedNames((prev) => Array.from(new Set([...prev, ...namesToAdd])));
    } else {
      const namesToRemove = new Set(sortedAndFilteredAsatidz.map((a) => a.nama_asatidz));
      setSelectedNames((prev) => prev.filter((n) => !namesToRemove.has(n)));
    }
  };

  const isAllFilteredSelected = useMemo(() => {
    if (sortedAndFilteredAsatidz.length === 0) return false;
    return sortedAndFilteredAsatidz.every((a) => selectedNames.includes(a.nama_asatidz));
  }, [sortedAndFilteredAsatidz, selectedNames]);

  const handleSave = async () => {
    if (!selectedItemKeyForAsatidz) return;

    let pengajarVal = '';
    if (filterMS && filterMB) pengajarVal = 'MS, MB';
    else if (filterMS) pengajarVal = 'MS';
    else if (filterMB) pengajarVal = 'MB';

    setIsSubmitting(true);
    await updateAsatidzItem(selectedItemKeyForAsatidz, selectedNames, pengajarVal);
    setIsSubmitting(false);
    closeModalPilihAsatidz();
  };

  return (
    <Dialog
      isOpen={isModalPilihAsatidzOpen}
      onClose={closeModalPilihAsatidz}
      title="Pilih Asatidz Pengajar"
      maxWidth="md"
    >
      <div className="space-y-3.5">
        {/* Subtitle Kelas & Fan */}
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
          <span className="font-bold text-emerald-900">
            Kelas {kelasKey}
          </span>
          <span className="text-emerald-700 font-semibold truncate max-w-[200px]" title={rawItem}>
            {rawItem}
          </span>
        </div>

        {/* Filter Checkbox MS & MB */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Kategori Asatidz (Pilih Salah Satu / Keduanya):
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-emerald-700">
              <input
                type="checkbox"
                checked={filterMS}
                onChange={(e) => setFilterMS(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>MS (Mustahiq)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-blue-700">
              <input
                type="checkbox"
                checked={filterMB}
                onChange={(e) => setFilterMB(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>MB (Munawib)</span>
            </label>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 italic leading-tight">
            *MS: Mustahiq, Mustahiqoh, MS &amp; Koor, ISTI&apos;DAD<br />
            *MB: Munawib, Munawibah, MB &amp; TOP, MB &amp; Media, TM &amp; MB, TU &amp; MB
          </div>
        </div>

        {/* Input Pencarian */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik nama Asatidz / NIA..."
            className="w-full text-xs pl-9 pr-8 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Kontainer Checklist Asatidz */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="p-2.5 px-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">
              {selectedNames.length} Asatidz Dipilih
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={(e) => handleToggleSelectAll(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
              />
              <span>Pilih Semua</span>
            </label>
          </div>

          <div className="max-h-[260px] overflow-y-auto p-2 space-y-1">
            {sortedAndFilteredAsatidz.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Tidak ada data Asatidz yang cocok dengan filter / pencarian.
              </div>
            ) : (
              sortedAndFilteredAsatidz.map((a, idx) => {
                const nama = a.nama_asatidz;
                const nia = a.nia || '-';
                const jah = a.jah_asatidz || '-';
                const kat = cekKategoriJahAsatidz(jah);
                const isChecked = selectedNames.includes(nama);

                return (
                  <label
                    key={idx}
                    className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors border ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAsatidz(nama)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 flex-shrink-0"
                      />
                      <span className="text-[10px] font-mono font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded flex-shrink-0">
                        {nia}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate" title={nama}>
                        {nama}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {kat.isMS && (
                        <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded">
                          MS
                        </span>
                      )}
                      {kat.isMB && (
                        <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                          MB
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                        {jah}
                      </span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={closeModalPilihAsatidz}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & Tetapkan'}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
