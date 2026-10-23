'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { Save, Plus, Trash2 } from 'lucide-react';

export default function ModalSettingsHafalan() {
  const { isSettingsOpen, closeSettings, config, saveConfig } = useMuhafadzohStore();

  const [hafWajib, setHafWajib] = useState(config.hafWajib);
  const [penjagaInput, setPenjagaInput] = useState(config.penjagaBebas.join(', '));
  const [newItemName, setNewItemName] = useState('');
  const [newItemBait, setNewItemBait] = useState(100);

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    setHafWajib({ ...hafWajib, [newItemName.trim()]: newItemBait });
    setNewItemName('');
  };

  const handleRemoveItem = (name: string) => {
    const copy = { ...hafWajib };
    delete copy[name];
    setHafWajib(copy);
  };

  const handleSave = async () => {
    const penjagaList = penjagaInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const success = await saveConfig({
      ...config,
      hafWajib,
      penjagaBebas: penjagaList,
    });

    if (success) {
      alert('Pengaturan target hafalan berhasil disimpan!');
      closeSettings();
    }
  };

  return (
    <Dialog
      isOpen={isSettingsOpen}
      onClose={closeSettings}
      title="Pengaturan Target Muhafadzoh & Penjaga Bebas"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Target Bait Hafalan Wajib */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Target Bait Nadhom Wajib
          </label>

          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {Object.entries(hafWajib).map(([nama, target]) => (
              <div key={nama} className="p-2.5 flex items-center justify-between bg-white text-xs">
                <span className="font-semibold text-slate-800">{nama}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-madin-700">{target} Bait</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(nama)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Form Tambah Item Baru */}
          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Nama Nadhom Baru..."
              className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-slate-200"
            />
            <input
              type="number"
              value={newItemBait}
              onChange={(e) => setNewItemBait(parseInt(e.target.value, 10) || 0)}
              className="w-20 text-xs py-1.5 px-2 rounded-lg border border-slate-200 text-center font-bold"
            />
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-madin-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        {/* Penjaga Bebas */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Daftar Ustadz Penjaga Bebas (Pisahkan dengan Koma)
          </label>
          <textarea
            rows={3}
            value={penjagaInput}
            onChange={(e) => setPenjagaInput(e.target.value)}
            placeholder="Ust. Ahmad, Ust. Zaid, Ust. Mansur..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={closeSettings}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan Target</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
