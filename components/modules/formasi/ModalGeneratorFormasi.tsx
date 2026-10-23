'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { Sparkles } from 'lucide-react';

export default function ModalGeneratorFormasi({
  gender,
}: {
  gender: 'PA' | 'PI';
}) {
  const { isGeneratorModalOpen, closeGeneratorModal, generateFormasiBatch } = useFormasiStore();

  const [tingkat, setTingkat] = useState('Ula');
  const [dinKls, setDinKls] = useState('1');
  const [jumlahBagian, setJumlahBagian] = useState(6);
  const [kapasitas, setKapasitas] = useState(45);
  const [isUnggulan, setIsUnggulan] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    const success = await generateFormasiBatch(
      tingkat,
      dinKls,
      jumlahBagian,
      gender,
      kapasitas,
      isUnggulan
    );
    setIsGenerating(false);

    if (success) {
      alert(`Berhasil generate ${jumlahBagian} formasi kelas bagian A s.d. ${String.fromCharCode(64 + jumlahBagian)}!`);
      closeGeneratorModal();
    }
  };

  return (
    <Dialog
      isOpen={isGeneratorModalOpen}
      onClose={closeGeneratorModal}
      title={`Generator Formasi Rombel Massal (${gender === 'PA' ? 'Santri Putra' : 'Santri Putri'})`}
      maxWidth="md"
    >
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>
            Fitur ini akan secara otomatis membuat rombongan belajar (rombel) Bagian A, B, C, dst dengan kapasitas standar.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Diniyyah</label>
            <select
              value={tingkat}
              onChange={(e) => setTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white"
            >
              <option value="Ula">Tingkat Ula</option>
              <option value="Wustho">Tingkat Wustho</option>
              <option value="Ulya">Tingkat Ulya</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas Diniyyah</label>
            <select
              value={dinKls}
              onChange={(e) => setDinKls(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white"
            >
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Rombel / Bagian</label>
            <input
              type="number"
              min="1"
              max="12"
              value={jumlahBagian}
              onChange={(e) => setJumlahBagian(parseInt(e.target.value, 10) || 1)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Akan dibuat Bagian A s.d. {String.fromCharCode(64 + Math.min(jumlahBagian, 12))}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas Maksimal (Santri)</label>
            <input
              type="number"
              min="10"
              max="80"
              value={kapasitas}
              onChange={(e) => setKapasitas(parseInt(e.target.value, 10) || 45)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Standar madin: 45 santri/kelas</p>
          </div>
        </div>

        <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={isUnggulan}
            onChange={(e) => setIsUnggulan(e.target.checked)}
            className="rounded border-slate-300 text-madin-700"
          />
          <span className="font-medium text-slate-700">Tandai Bagian A sebagai Kelas Unggulan</span>
        </label>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={closeGeneratorModal}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Membuat Kelas...' : 'Generate Rombel'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
