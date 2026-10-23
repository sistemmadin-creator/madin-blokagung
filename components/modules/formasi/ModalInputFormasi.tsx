'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { FormasiKelas } from '@/types/formasi';
import { Save } from 'lucide-react';

export default function ModalInputFormasi({
  gender,
}: {
  gender: 'PA' | 'PI';
}) {
  const { isInputModalOpen, closeInputModal, editFormasiData, saveFormasi } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const isEdit = !!editFormasiData;

  const [formData, setFormData] = useState<Partial<FormasiKelas>>({
    tingkat: 'Ula',
    din_kls: '1',
    din_bag: 'A',
    pa_pi: gender,
    kapasitas_maksimal: 45,
    is_unggulan: false,
    id_mustahiq: '',
    domisili: '',
    lokasi_diniyyah: '',
    lokasi_takror: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchAsatidz, asatidzList.length]);

  useEffect(() => {
    if (editFormasiData) {
      setFormData({ ...editFormasiData });
    } else {
      setFormData({
        tingkat: 'Ula',
        din_kls: '1',
        din_bag: 'A',
        pa_pi: gender,
        kapasitas_maksimal: 45,
        is_unggulan: false,
        id_mustahiq: '',
        domisili: '',
        lokasi_diniyyah: '',
        lokasi_takror: '',
      });
    }
  }, [editFormasiData, isInputModalOpen, gender]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tingkat || !formData.din_kls || !formData.din_bag) {
      alert('Mohon lengkapi Tingkat, Kelas, dan Bagian');
      return;
    }

    setIsSubmitting(true);
    const success = await saveFormasi(
      { ...formData, pa_pi: gender },
      isEdit,
      editFormasiData?.id
    );
    setIsSubmitting(false);

    if (success) {
      closeInputModal();
    }
  };

  // Filter wali kelas candidates from asatidz
  const asatidzOptions = asatidzList.filter((a) => a.pa_pi === gender);

  return (
    <Dialog
      isOpen={isInputModalOpen}
      onClose={closeInputModal}
      title={isEdit ? 'Edit Formasi Rombel Kelas' : `Tambah Formasi Rombel (${gender === 'PA' ? 'Putra' : 'Putri'})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat</label>
            <select
              name="tingkat"
              value={formData.tingkat || 'Ula'}
              onChange={handleChange}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="Ula">Ula</option>
              <option value="Wustho">Wustho</option>
              <option value="Ulya">Ulya</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
            <select
              name="din_kls"
              value={formData.din_kls || '1'}
              onChange={handleChange}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bagian (Rombel)</label>
            <input
              type="text"
              name="din_bag"
              value={formData.din_bag || ''}
              onChange={handleChange}
              required
              placeholder="A, B, C..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 uppercase text-center font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas Maksimal Santri</label>
            <input
              type="number"
              name="kapasitas_maksimal"
              value={formData.kapasitas_maksimal || 45}
              onChange={handleChange}
              min="10"
              max="90"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Wali Kelas / Mustahiq</label>
            <input
              list="listAsatidzMustahiq"
              name="id_mustahiq"
              value={formData.id_mustahiq || ''}
              onChange={handleChange}
              placeholder="Ketik / pilih ustadz..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200"
            />
            <datalist id="listAsatidzMustahiq">
              {asatidzOptions.map((a) => (
                <option key={a.nia} value={a.nama_asatidz}>
                  {a.nia} - {a.jah_asatidz || 'Asatidz'}
                </option>
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi KBM Diniyyah</label>
            <input
              type="text"
              name="lokasi_diniyyah"
              value={formData.lokasi_diniyyah || ''}
              onChange={handleChange}
              placeholder="Contoh: Gedung Madin Lt.2 R.04"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi Takror Malam</label>
            <input
              type="text"
              name="lokasi_takror"
              value={formData.lokasi_takror || ''}
              onChange={handleChange}
              placeholder="Contoh: Musholla Blok B"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Domisili Kelas (Blok)</label>
            <input
              type="text"
              name="domisili"
              value={formData.domisili || ''}
              onChange={handleChange}
              placeholder="Contoh: Blok Induk / Blok 4"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input
                type="checkbox"
                name="is_unggulan"
                checked={!!formData.is_unggulan}
                onChange={handleChange}
                className="rounded border-slate-300 text-madin-700 focus:ring-madin-600"
              />
              <span className="font-semibold text-amber-700">Kelas Program Unggulan</span>
            </label>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={closeInputModal}
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
            <span>{isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Formasi'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
