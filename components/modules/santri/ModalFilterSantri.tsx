'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useSantriStore } from '@/stores/useSantriStore';
import { SANTRI_FILTER_CATEGORIES, Santri } from '@/types/santri';
import { Filter, RotateCcw, Check } from 'lucide-react';

export default function ModalFilterSantri() {
  const {
    isFilterModalOpen,
    closeFilterModal,
    filterValues,
    setFilterValue,
    resetFilters,
    santriList,
  } = useSantriStore();

  const [activeCats, setActiveCats] = useState<Set<string>>(new Set());
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});

  // Sync state when modal opens
  useEffect(() => {
    if (isFilterModalOpen) {
      const active = new Set<string>();
      const current: Record<string, string> = {};
      Object.keys(filterValues).forEach((k) => {
        if (filterValues[k]) {
          active.add(k);
          current[k] = filterValues[k];
        }
      });
      setActiveCats(active);
      setLocalFilters(current);
    }
  }, [isFilterModalOpen, filterValues]);

  // Get distinct values for each category to populate datalist options
  const getOptionsForCategory = (key: keyof Santri) => {
    const values = new Set<string>();
    santriList.forEach((s) => {
      const val = s[key];
      if (val && String(val).trim()) {
        values.add(String(val).trim());
      }
    });
    return Array.from(values).sort();
  };

  const handleToggleCategory = (catKey: string) => {
    const newActive = new Set(activeCats);
    const newLocal = { ...localFilters };

    if (newActive.has(catKey)) {
      newActive.delete(catKey);
      delete newLocal[catKey];
    } else {
      newActive.add(catKey);
      if (!newLocal[catKey]) {
        newLocal[catKey] = '';
      }
    }
    setActiveCats(newActive);
    setLocalFilters(newLocal);
  };

  const handleInputChange = (catKey: string, value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      [catKey]: value,
    }));
  };

  const handleApply = () => {
    resetFilters();
    activeCats.forEach((catKey) => {
      const val = localFilters[catKey];
      if (val && val.trim()) {
        setFilterValue(catKey, val.trim());
      }
    });
    closeFilterModal();
  };

  const handleReset = () => {
    setActiveCats(new Set());
    setLocalFilters({});
    resetFilters();
  };

  return (
    <Dialog
      isOpen={isFilterModalOpen}
      onClose={closeFilterModal}
      title="Filter Lanjutan Data Santri (16 Kategori)"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <span className="flex items-center gap-1.5 font-medium">
            <Filter className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Centang kategori yang ingin digunakan untuk menyaring data santri di tabel.</span>
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline flex-shrink-0 ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Semua
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1">
          {SANTRI_FILTER_CATEGORIES.map((cat) => {
            const catKey = cat.key as string;
            const options = getOptionsForCategory(cat.key);
            const isChecked = activeCats.has(catKey);
            const currentValue = localFilters[catKey] || '';
            const datalistId = `dl_filter_${catKey}`;

            return (
              <div
                key={cat.key}
                className={`p-2.5 rounded-xl border transition ${
                  isChecked
                    ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/50 shadow-2xs'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Tombol Kapsul Toggle Kategori */}
                <label
                  onClick={() => handleToggleCategory(catKey)}
                  className="flex items-center gap-2 cursor-pointer select-none mb-1.5"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                      isChecked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span className={`text-xs font-semibold truncate ${isChecked ? 'text-emerald-900' : 'text-slate-700'}`}>
                    {cat.name}
                  </span>
                </label>

                {/* Input Filter dengan Datalist Otomatis */}
                <div className="relative">
                  <input
                    type="text"
                    list={datalistId}
                    disabled={!isChecked}
                    value={currentValue}
                    onChange={(e) => handleInputChange(catKey, e.target.value)}
                    placeholder={isChecked ? 'Pilih atau ketik...' : 'Centang untuk aktif'}
                    className={`w-full text-xs py-1.5 px-2.5 rounded-lg border transition ${
                      isChecked
                        ? 'bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-400 placeholder:text-slate-300 cursor-not-allowed'
                    }`}
                  />
                  <datalist id={datalistId}>
                    {options.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            {Array.from(activeCats).filter((k) => !!localFilters[k]).length} filter aktif
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
