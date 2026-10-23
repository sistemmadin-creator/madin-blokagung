'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFanStore } from '@/stores/useFanStore';
import { Plus, Trash2, Save, Building } from 'lucide-react';

export default function ModalGrupAsal() {
  const { isModalGrupOpen, closeModalGrup, grupAsalList, saveGrupAsalList } = useFanStore();

  const [localGrups, setLocalGrups] = useState<string[]>(grupAsalList);
  const [newGrupInput, setNewGrupInput] = useState('');

  const handleAdd = () => {
    const val = newGrupInput.trim();
    if (!val) return;
    if (localGrups.includes(val)) {
      alert('Nama grup asal sudah ada!');
      return;
    }
    setLocalGrups([...localGrups, val]);
    setNewGrupInput('');
  };

  const handleRemove = (name: string) => {
    setLocalGrups(localGrups.filter((g) => g !== name));
  };

  const handleSave = async () => {
    const success = await saveGrupAsalList(localGrups);
    if (success) {
      closeModalGrup();
    }
  };

  return (
    <Dialog
      isOpen={isModalGrupOpen}
      onClose={closeModalGrup}
      title="Kelola Master Grup Asal Dewan Asatidz"
      maxWidth="md"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Grup Asal digunakan untuk memetakan asal pondok pesantren / delegasi dewan asatidz pada penugasan fan pelajaran.
        </p>

        {/* Input Tambah Baru */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newGrupInput}
            onChange={(e) => setNewGrupInput(e.target.value)}
            placeholder="Tambah nama grup baru..."
            className="flex-1 text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        </div>

        {/* List Grup */}
        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {localGrups.map((grup) => (
            <div key={grup} className="flex justify-between items-center p-2.5 bg-white text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-madin-700" />
                {grup}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(grup)}
                className="text-rose-500 hover:text-rose-700 p-1"
                title="Hapus Grup"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={closeModalGrup}
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
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
