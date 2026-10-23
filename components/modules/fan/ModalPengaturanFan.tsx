'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFanStore } from '@/stores/useFanStore';
import { FanItem } from '@/types/fan';
import { Save } from 'lucide-react';

export default function ModalPengaturanFan() {
  const { isModalFanOpen, closeModalFan, selectedFan, saveFanItem, grupAsalList } = useFanStore();

  const isEdit = !!selectedFan;

  const [formData, setFormData] = useState<Partial<FanItem>>({
    nama: '',
    kitab: '',
    tingkat: 'Ula',
    jamMS: 2,
    jamMB: 2,
    grupAsal: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedFan) {
      setFormData({ ...selectedFan });
    } else {
      setFormData({
        nama: '',
        kitab: '',
        tingkat: 'Ula',
        jamMS: 2,
        jamMB: 2,
        grupAsal: grupAsalList[0] || '',
      });
    }
  }, [selectedFan, isModalFanOpen, grupAsalList]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'nama' ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.kitab) {
      alert('Mohon isi nama Fan dan Kitab rujukan');
      return;
    }

    setIsSubmitting(true);
    const success = await saveFanItem(formData as FanItem, isEdit);
    setIsSubmitting(false);

    if (success) {
      closeModalFan();
    }
  };

  return (
    <Dialog
      isOpen={isModalFanOpen}
      onClose={closeModalFan}
      title={isEdit ? 'Edit Fan Pelajaran' : 'Tambah Fan Pelajaran Baru'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Fan Pelajaran <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="nama"
            value={formData.nama || ''}
            onChange={handleChange}
            required
            placeholder="Contoh: FIQIH, NAHWU, SHOROF"
            className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 uppercase font-bold focus:outline-none focus:ring-1 focus:ring-madin-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kitab Rujukan Utama <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="kitab"
            value={formData.kitab || ''}
            onChange={handleChange}
            required
            placeholder="Contoh: Fathul Qorib / Safinatun Najah"
            className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kurikulum</label>
            <select
              name="tingkat"
              value={formData.tingkat || 'Ula'}
              onChange={handleChange}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="Ula">Tingkat Ula</option>
              <option value="Wustho">Tingkat Wustho</option>
              <option value="Ulya">Tingkat Ulya</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Grup Asal Pengampu</label>
            <select
              name="grupAsal"
              value={formData.grupAsal || ''}
              onChange={handleChange}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="">Pilih Grup Asal...</option>
              {grupAsalList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alokasi Jam MS (Sore)
            </label>
            <input
              type="number"
              min="0"
              max="4"
              name="jamMS"
              value={formData.jamMS ?? 2}
              onChange={handleChange}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 text-center font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Madin Sore (Jam 1 & 2)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alokasi Jam MB (Malam)
            </label>
            <input
              type="number"
              min="0"
              max="4"
              name="jamMB"
              value={formData.jamMB ?? 2}
              onChange={handleChange}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 text-center font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Madin Malam (Jam 3 & 4)</p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={closeModalFan}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Fan'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
