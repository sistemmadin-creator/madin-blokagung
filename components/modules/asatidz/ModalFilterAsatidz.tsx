'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { ASATIDZ_FILTER_CATEGORIES, Asatidz } from '@/types/asatidz';
import { Filter, RotateCcw } from 'lucide-react';

export default function ModalFilterAsatidz() {
  const {
    isFilterModalOpen,
    closeFilterModal,
    filterValues,
    setFilterValue,
    resetFilters,
    asatidzList,
  } = useAsatidzStore();

  const getOptionsForCategory = (key: keyof Asatidz) => {
    const values = new Set<string>();
    asatidzList.forEach((a) => {
      const val = a[key];
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
      title="Filter Data Dewan Asatidz"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-800">
          <span className="flex items-center gap-1.5 font-medium">
            <Filter className="w-4 h-4 text-blue-600" />
            Saring data asatidz berdasarkan Gender, Kelas, Blok, atau Amanah (Jah).
          </span>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
          {ASATIDZ_FILTER_CATEGORIES.map((cat) => {
            const options = getOptionsForCategory(cat.key);
            const currentValue = filterValues[cat.key as string] || '';
            const isActive = !!currentValue;

            return (
              <div
                key={cat.key}
                className={`p-3 rounded-xl border transition ${
                  isActive
                    ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-400'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {cat.name}
                  </label>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  )}
                </div>
                <select
                  value={currentValue}
                  onChange={(e) => setFilterValue(cat.key as string, e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-700"
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
            {Object.keys(filterValues).length} filter aktif
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
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-sm"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
