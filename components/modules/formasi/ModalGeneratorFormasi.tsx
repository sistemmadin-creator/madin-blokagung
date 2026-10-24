'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function ModalGeneratorFormasi({
  gender,
}: {
  gender?: 'PA' | 'PI';
}) {
  const {
    isGeneratorModalOpen,
    closeGeneratorModal,
    generatorModalDefaultGender,
    generateFormasiRange,
  } = useFormasiStore();

  const [tingkat, setTingkat] = useState('ULA');
  const [paPi, setPaPi] = useState<'PA' | 'PI'>('PA');
  const [dinKls, setDinKls] = useState('1');
  const [bagAwal, setBagAwal] = useState('A');
  const [bagAkhir, setBagAkhir] = useState('J');
  const [kapasitas, setKapasitas] = useState(80);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (gender) {
      setPaPi(gender);
    } else if (generatorModalDefaultGender) {
      setPaPi(generatorModalDefaultGender);
    }
  }, [gender, generatorModalDefaultGender, isGeneratorModalOpen]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    const res = await generateFormasiRange(
      tingkat,
      paPi,
      dinKls,
      bagAwal,
      bagAkhir,
      kapasitas
    );

    setIsGenerating(false);

    if (res && res.inserted > 0) {
      alert(
        `Berhasil menginput otomatis ${res.inserted} rombel kelas (${tingkat} ${dinKls} Bagian ${bagAwal.toUpperCase()} s/d ${bagAkhir.toUpperCase()} - ${paPi})!` +
          (res.skipped > 0 ? ` (${res.skipped} kelas sudah ada sebelumnya dilewati).` : '')
      );
      closeGeneratorModal();
    }
  };

  return (
    <Dialog
      isOpen={isGeneratorModalOpen}
      onClose={closeGeneratorModal}
      title="Generator Formasi Rombel Otomatis"
      maxWidth="md"
    >
      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
          <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-900">
              Otomatisasi Pembuatan Rombongan Belajar (Rombel)
            </p>
            <p className="text-[11px] text-emerald-700 leading-relaxed">
              Sistem akan membuat rombel berurutan dari Bagian Awal sampai Bagian Akhir (misal A s/d J). Rombel yang sudah ada di database otomatis dilewati untuk menghindari duplikasi.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tingkat Diniyyah
            </label>
            <select
              value={tingkat}
              onChange={(e) => setTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-madin-600 focus:outline-none"
            >
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gender (PA / PI)
            </label>
            <select
              value={paPi}
              onChange={(e) => setPaPi(e.target.value as 'PA' | 'PI')}
              disabled={!!gender}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-madin-600 focus:outline-none disabled:bg-slate-50"
            >
              <option value="PA">PA - Putra</option>
              <option value="PI">PI - Putri</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Din. Kelas
            </label>
            <input
              type="text"
              required
              value={dinKls}
              onChange={(e) => setDinKls(e.target.value)}
              placeholder="Contoh: 1, 2, 3..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 font-bold focus:ring-2 focus:ring-madin-600 focus:outline-none text-center"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kapasitas Maksimal (Santri)
            </label>
            <input
              type="number"
              min="10"
              max="90"
              value={kapasitas}
              onChange={(e) => setKapasitas(parseInt(e.target.value, 10) || 80)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 font-bold focus:ring-2 focus:ring-madin-600 focus:outline-none text-center"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Rentang Din. Bagian (Huruf Rombel)
          </label>
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Dari Huruf:</span>
              <input
                type="text"
                maxLength={1}
                required
                value={bagAwal}
                onChange={(e) => setBagAwal(e.target.value.toUpperCase())}
                className="w-full text-center text-sm font-bold uppercase py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-madin-600 focus:outline-none"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Sampai Huruf:</span>
              <input
                type="text"
                maxLength={1}
                required
                value={bagAkhir}
                onChange={(e) => setBagAkhir(e.target.value.toUpperCase())}
                className="w-full text-center text-sm font-bold uppercase py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-madin-600 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center pt-1 font-mono">
            Contoh: A s/d J akan menghasilkan rombel A, B, C, D, E, F, G, H, I, J.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={closeGeneratorModal}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menginput Otomatis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Input Otomatis Kelas</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
