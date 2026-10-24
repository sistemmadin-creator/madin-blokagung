'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { Filter, RotateCcw } from 'lucide-react';

export default function ModalFilterFormasi({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { customFilters, setCustomFilters, resetCustomFilters } = useFormasiStore();

  const [activeCats, setActiveCats] = useState<Record<string, boolean>>({});
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    tingkat: '',
    pa_pi: '',
    wali_kelas: '',
    domisili: '',
    blok: '',
  });

  useEffect(() => {
    const cf = customFilters || {};
    const newAct: Record<string, boolean> = {};
    const newVals: Record<string, string> = {
      tingkat: cf.tingkat || '',
      pa_pi: cf.pa_pi || '',
      wali_kelas: cf.wali_kelas || '',
      domisili: cf.domisili || '',
      blok: cf.blok || '',
    };
    if (cf.tingkat) newAct.tingkat = true;
    if (cf.pa_pi) newAct.pa_pi = true;
    if (cf.wali_kelas) newAct.wali_kelas = true;
    if (cf.domisili) newAct.domisili = true;
    if (cf.blok) newAct.blok = true;

    setActiveCats(newAct);
    setFilterValues(newVals);
  }, [customFilters, isOpen]);

  const toggleCategory = (key: string) => {
    setActiveCats((prev) => {
      const nextState = !prev[key];
      if (!nextState) {
        setFilterValues((v) => ({ ...v, [key]: '' }));
      }
      return { ...prev, [key]: nextState };
    });
  };

  const handleApply = () => {
    const payload: Record<string, string> = {};
    Object.keys(activeCats).forEach((k) => {
      if (activeCats[k] && filterValues[k]) {
        payload[k] = filterValues[k];
      }
    });
    setCustomFilters(payload);
    onClose();
  };

  const handleReset = () => {
    setActiveCats({});
    setFilterValues({
      tingkat: '',
      pa_pi: '',
      wali_kelas: '',
      domisili: '',
      blok: '',
    });
    resetCustomFilters();
    onClose();
  };

  const activeCount = Object.keys(activeCats).filter((k) => activeCats[k] && filterValues[k]).length;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Data Formasi Kelas"
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <span>Aktifkan kategori dengan mencentang kapsul lalu ketik kata kunci penyaringan.</span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Tingkat */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-700">Tingkat Diniyyah</span>
              <input
                type="checkbox"
                checked={!!activeCats.tingkat}
                onChange={() => toggleCategory('tingkat')}
                className="rounded border-slate-300 text-madin-700"
              />
            </label>
            <select
              disabled={!activeCats.tingkat}
              value={filterValues.tingkat}
              onChange={(e) => setFilterValues((v) => ({ ...v, tingkat: e.target.value }))}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-50 disabled:opacity-60 focus:outline-none"
            >
              <option value="">Semua Tingkat</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
            </select>
          </div>

          {/* Gender */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-700">Gender (PA / PI)</span>
              <input
                type="checkbox"
                checked={!!activeCats.pa_pi}
                onChange={() => toggleCategory('pa_pi')}
                className="rounded border-slate-300 text-madin-700"
              />
            </label>
            <select
              disabled={!activeCats.pa_pi}
              value={filterValues.pa_pi}
              onChange={(e) => setFilterValues((v) => ({ ...v, pa_pi: e.target.value }))}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-50 disabled:opacity-60 focus:outline-none"
            >
              <option value="">Semua Gender</option>
              <option value="PA">PA (Putra)</option>
              <option value="PI">PI (Putri)</option>
            </select>
          </div>

          {/* Wali Kelas */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-700">Wali Kelas / Mustahiq</span>
              <input
                type="checkbox"
                checked={!!activeCats.wali_kelas}
                onChange={() => toggleCategory('wali_kelas')}
                className="rounded border-slate-300 text-madin-700"
              />
            </label>
            <input
              type="text"
              disabled={!activeCats.wali_kelas}
              value={filterValues.wali_kelas}
              onChange={(e) => setFilterValues((v) => ({ ...v, wali_kelas: e.target.value }))}
              placeholder="Ketik nama wali kelas..."
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-50 disabled:opacity-60 focus:outline-none"
            />
          </div>

          {/* Domisili */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-700">Domisili</span>
              <input
                type="checkbox"
                checked={!!activeCats.domisili}
                onChange={() => toggleCategory('domisili')}
                className="rounded border-slate-300 text-madin-700"
              />
            </label>
            <input
              type="text"
              disabled={!activeCats.domisili}
              value={filterValues.domisili}
              onChange={(e) => setFilterValues((v) => ({ ...v, domisili: e.target.value }))}
              placeholder="Ketik domisili..."
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-50 disabled:opacity-60 focus:outline-none"
            />
          </div>

          {/* Blok */}
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 sm:col-span-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-700">Blok Kamar / Gedung</span>
              <input
                type="checkbox"
                checked={!!activeCats.blok}
                onChange={() => toggleCategory('blok')}
                className="rounded border-slate-300 text-madin-700"
              />
            </label>
            <input
              type="text"
              disabled={!activeCats.blok}
              value={filterValues.blok}
              onChange={(e) => setFilterValues((v) => ({ ...v, blok: e.target.value }))}
              placeholder="Contoh: Induk, Blok 4, Al-Barokah..."
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-50 disabled:opacity-60 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-xs"
          >
            Terapkan Filter {activeCount > 0 ? `(${activeCount})` : ''}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
