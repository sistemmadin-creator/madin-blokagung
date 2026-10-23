'use client';

import React, { useEffect, useState } from 'react';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { Users, Search, RefreshCw, X, Plus } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';

export default function PengajarFanPage() {
  const { fanItems, pengajarMap, fetchFanData, setPengajarFan, isLoading } = useFanStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [search, setSearch] = useState('');
  const [selectedFanForAssign, setSelectedFanForAssign] = useState<string | null>(null);
  const [selectedAsatidzNames, setSelectedAsatidzNames] = useState<string[]>([]);
  const [asatidzSearchInput, setAsatidzSearchInput] = useState('');

  useEffect(() => {
    fetchFanData();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchFanData, fetchAsatidz, asatidzList.length]);

  const handleOpenAssign = (fanNama: string) => {
    setSelectedFanForAssign(fanNama);
    setSelectedAsatidzNames(pengajarMap[fanNama] || []);
  };

  const handleAddAsatidz = (nama: string) => {
    if (!selectedAsatidzNames.includes(nama)) {
      setSelectedAsatidzNames([...selectedAsatidzNames, nama]);
    }
  };

  const handleRemoveAsatidz = (nama: string) => {
    setSelectedAsatidzNames(selectedAsatidzNames.filter((n) => n !== nama));
  };

  const handleSaveAssign = async () => {
    if (!selectedFanForAssign) return;
    await setPengajarFan(selectedFanForAssign, selectedAsatidzNames);
    setSelectedFanForAssign(null);
  };

  const filteredFans = fanItems.filter((f) => {
    const q = search.toLowerCase().trim();
    return !q || f.nama.toLowerCase().includes(q) || f.kitab.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-xs">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Pengajar Fan Pelajaran</h1>
            <p className="text-xs text-slate-500">
              Pemetaan Dewan Asatidz Pengampu Sesuai Bidang Kompetensi Fan
            </p>
          </div>
        </div>

        <button
          onClick={fetchFanData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Bar Pencarian */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari fan pelajaran..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Grid Pemetaan Pengajar per Fan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFans.map((fan) => {
          const pengajarList = pengajarMap[fan.nama] || [];

          return (
            <div
              key={fan.id}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs hover:border-blue-300 transition"
            >
              <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">{fan.nama}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                      {fan.tingkat}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{fan.kitab}</p>
                </div>

                <button
                  onClick={() => handleOpenAssign(fan.nama)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Atur Pengajar</span>
                </button>
              </div>

              {/* Badges Asatidz Pengampu */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Dewan Asatidz Pengampu ({pengajarList.length}):
                </span>
                {pengajarList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada asatidz yang dipetakan untuk Fan ini.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {pengajarList.map((nama) => (
                      <span
                        key={nama}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-800"
                      >
                        <span>{nama}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog Atur Pengajar Fan */}
      {selectedFanForAssign && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedFanForAssign(null)}
          title={`Atur Pengajar Fan: ${selectedFanForAssign}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Pilih nama-nama dewan asatidz yang mengampu mata pelajaran <strong>{selectedFanForAssign}</strong>.
            </p>

            {/* Asatidz Terpilih */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">
                Asatidz Pengampu ({selectedAsatidzNames.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                {selectedAsatidzNames.map((nama) => (
                  <span
                    key={nama}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <span>{nama}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAsatidz(nama)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Pencarian dan Pilihan Asatidz */}
            <div className="space-y-2">
              <input
                type="text"
                value={asatidzSearchInput}
                onChange={(e) => setAsatidzSearchInput(e.target.value)}
                placeholder="Cari nama ustadz untuk ditambahkan..."
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />

              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {asatidzList
                  .filter((a) =>
                    !asatidzSearchInput ||
                    a.nama_asatidz.toLowerCase().includes(asatidzSearchInput.toLowerCase())
                  )
                  .map((a) => {
                    const isSelected = selectedAsatidzNames.includes(a.nama_asatidz);
                    return (
                      <div
                        key={a.nia}
                        onClick={() =>
                          isSelected
                            ? handleRemoveAsatidz(a.nama_asatidz)
                            : handleAddAsatidz(a.nama_asatidz)
                        }
                        className={`p-2.5 text-xs flex justify-between items-center cursor-pointer transition ${
                          isSelected ? 'bg-blue-50 text-blue-800 font-bold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span>
                          {a.nama_asatidz} ({a.nia})
                        </span>
                        <span className="text-[11px] text-slate-400">{isSelected ? '✓ Terpilih' : '+ Tambah'}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedFanForAssign(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAssign}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-sm"
              >
                Simpan Penugasan
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
