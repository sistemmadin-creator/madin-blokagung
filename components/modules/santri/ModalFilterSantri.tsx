'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import { useSantriStore } from '@/stores/useSantriStore';
import { SANTRI_FILTER_CATEGORIES, Santri } from '@/types/santri';
import { Filter, RotateCcw } from 'lucide-react';

export default function ModalFilterSantri() {
  const {
    isFilterModalOpen,
    closeFilterModal,
    filterValues,
    setFilterValue,
    resetFilters,
    santriList,
  } = useSantriStore();

  // Get distinct values for each category to populate dropdown options
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
            <Filter className="w-4 h-4 text-emerald-600" />
            Pilih opsi pada kategori untuk menyaring data santri di tabel.
          </span>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Semua
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1">
          {SANTRI_FILTER_CATEGORIES.map((cat) => {
            const options = getOptionsForCategory(cat.key);
            const currentValue = filterValues[cat.key as string] || '';
            const isActive = !!currentValue;

            return (
              <div
                key={cat.key}
                className={`p-2.5 rounded-xl border transition ${
                  isActive
                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 truncate">
                    {cat.name}
                  </label>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  )}
                </div>
                <select
                  value={currentValue}
                  onChange={(e) => setFilterValue(cat.key as string, e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-madin-600 text-slate-700"
                >
                  <option value="">Semua {cat.name}</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            {Object.keys(filterValues).length} kriteria filter aktif
          </span>
          <div className="flex gap-2">
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              Reset
            </button>
            <button
              onClick={closeFilterModal}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
