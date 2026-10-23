'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { Asatidz } from '@/types/asatidz';
import { User, Upload, Trash2, Save, Sparkles } from 'lucide-react';

const JAH_PA_OPTIONS = [
  'Mustahiq',
  'Munawib',
  'TU',
  'TOP',
  'KS',
  'TOP & Koor',
  'MS & Koor',
  'MB & TOP',
  'TU & MB',
  'MB & Media',
  'KA.KES',
  'BT',
  "ISTI'DAD",
];

const JAH_PI_OPTIONS = [
  'Mustahiqoh',
  'Munawibah',
  'TU',
  'TOP',
  'KS',
  'TM & MB',
  'BT',
  "ISTI'DAD",
];

export default function ModalInputAsatidz() {
  const {
    isInputModalOpen,
    closeInputModal,
    editAsatidzData,
    saveAsatidz,
    generateNextNIA,
  } = useAsatidzStore();

  const isEdit = !!editAsatidzData;

  const [formData, setFormData] = useState<Partial<Asatidz>>({
    pa_pi: 'PA',
    tingkat_asatidz: 'Ula',
    din_kls_asatidz: '1',
    din_bag_asatidz: 'A',
    jah_asatidz: 'Mustahiq',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editAsatidzData) {
      setFormData({ ...editAsatidzData });
    } else {
      setFormData({
        nia: '',
        nis: '',
        nama_asatidz: '',
        pa_pi: 'PA',
        jah_asatidz: 'Mustahiq',
        tempat_lahir: '',
        tgl_lahir: '',
        bln_lahir: '',
        thn_lahir: '',
        dusun: '',
        desa: '',
        kecamatan: '',
        kabupaten: '',
        provinsi: 'JAWA TIMUR',
        blok: '',
        asrama: '',
        kode: '',
        kamar: '',
        tingkat_asatidz: 'Ula',
        din_kls_asatidz: '1',
        din_bag_asatidz: 'A',
        lokasi_diniyyah: '',
        lokasi_takror: '',
        foto_asatidz: '',
      });
    }
  }, [editAsatidzData, isInputModalOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: name === 'nama_asatidz' ? value.toUpperCase() : value,
      };

      // If gender changed, adjust default Jah
      if (name === 'pa_pi') {
        next.jah_asatidz = value === 'PA' ? 'Mustahiq' : 'Mustahiqoh';
      }

      return next;
    });
  };

  const handleAutoGenerateNIA = () => {
    const prefix = formData.pa_pi === 'PI' ? 'PI' : 'PA';
    const nextNIA = generateNextNIA(prefix);
    setFormData((prev) => ({ ...prev, nia: nextNIA }));
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setFormData((prev) => ({ ...prev, foto_asatidz: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleHapusFoto = () => {
    setFormData((prev) => ({ ...prev, foto_asatidz: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nia || !formData.nama_asatidz || !formData.pa_pi) {
      alert('Mohon lengkapi NIA, Nama Lengkap Asatidz, dan Gender (PA/PI)');
      return;
    }

    setIsSubmitting(true);
    const success = await saveAsatidz(
      formData as Asatidz,
      isEdit,
      editAsatidzData?.nia
    );
    setIsSubmitting(false);

    if (success) {
      closeInputModal();
    }
  };

  const jahOptions = formData.pa_pi === 'PI' ? JAH_PI_OPTIONS : JAH_PA_OPTIONS;

  return (
    <Dialog
      isOpen={isInputModalOpen}
      onClose={closeInputModal}
      title={isEdit ? 'Edit Data Dewan Asatidz' : 'Pendaftaran Dewan Asatidz Baru'}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Asatidz & Foto */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 pb-1 border-b border-slate-200 mb-3">
            1. Identitas Dewan Asatidz
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <div className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
              <div className="w-24 h-32 rounded-lg border border-slate-300 bg-white overflow-hidden flex items-center justify-center shadow-xs">
                {formData.foto_asatidz ? (
                  <img src={formData.foto_asatidz} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400 p-2">
                    <User className="w-8 h-8 mx-auto opacity-50 mb-1 text-blue-700" />
                    <span className="text-[10px]">Foto 3x4</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 w-full">
                <label className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer shadow-xs">
                  <Upload className="w-3 h-3 text-blue-700" />
                  <span>Pilih Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoUpload}
                    className="hidden"
                  />
                </label>
                {formData.foto_asatidz && (
                  <button
                    type="button"
                    onClick={handleHapusFoto}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIA (Nomor Induk Asatidz) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="nia"
                    value={formData.nia || ''}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: PA001"
                    className="w-full text-xs py-2 pl-3 pr-8 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono font-bold"
                  />
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={handleAutoGenerateNIA}
                      title="Generate NIA Otomatis"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-800"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NIS (Nomor Induk Santri Asal)</label>
                <input
                  type="text"
                  name="nis"
                  value={formData.nis || ''}
                  onChange={handleChange}
                  placeholder="Opsional"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  name="pa_pi"
                  value={formData.pa_pi || 'PA'}
                  onChange={handleChange}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="PA">PA - Ustadz</option>
                  <option value="PI">PI - Ustadzah</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Dewan Asatidz <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="nama_asatidz"
                  value={formData.nama_asatidz || ''}
                  onChange={handleChange}
                  required
                  placeholder="Nama Lengkap dengan Gelar bila ada"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Jah / Amanah</label>
                <select
                  name="jah_asatidz"
                  value={formData.jah_asatidz || ''}
                  onChange={handleChange}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white font-medium text-emerald-800"
                >
                  <option value="">Pilih Jah...</option>
                  {jahOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  name="tempat_lahir"
                  value={formData.tempat_lahir || ''}
                  onChange={handleChange}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200"
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tgl Lahir</label>
                  <input
                    type="text"
                    name="tgl_lahir"
                    value={formData.tgl_lahir || ''}
                    onChange={handleChange}
                    placeholder="01"
                    className="w-full text-xs py-2 px-2 rounded-lg border border-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bulan</label>
                  <input
                    type="text"
                    name="bln_lahir"
                    value={formData.bln_lahir || ''}
                    onChange={handleChange}
                    placeholder="01"
                    className="w-full text-xs py-2 px-2 rounded-lg border border-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun</label>
                  <input
                    type="text"
                    name="thn_lahir"
                    value={formData.thn_lahir || ''}
                    onChange={handleChange}
                    placeholder="1995"
                    className="w-full text-xs py-2 px-2 rounded-lg border border-slate-200 text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Domisili Kamar & Tugas Diniyyah */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">
              2. Domisili Asrama Asatidz
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Blok</label>
                <input
                  type="text"
                  name="blok"
                  value={formData.blok || ''}
                  onChange={handleChange}
                  placeholder="A, B, Induk..."
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Asrama</label>
                <input
                  type="text"
                  name="asrama"
                  value={formData.asrama || ''}
                  onChange={handleChange}
                  placeholder="Darussalam..."
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kode Kamar</label>
                <input
                  type="text"
                  name="kode"
                  value={formData.kode || ''}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nomor Kamar</label>
                <input
                  type="text"
                  name="kamar"
                  value={formData.kamar || ''}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">
              3. Tugas Mengajar Diniyyah
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tingkat</label>
                <select
                  name="tingkat_asatidz"
                  value={formData.tingkat_asatidz || 'Ula'}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Ula">Ula</option>
                  <option value="Wustho">Wustho</option>
                  <option value="Ulya">Ulya</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kelas</label>
                <input
                  type="text"
                  name="din_kls_asatidz"
                  value={formData.din_kls_asatidz || '1'}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bagian</label>
                <input
                  type="text"
                  name="din_bag_asatidz"
                  value={formData.din_bag_asatidz || 'A'}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white text-center uppercase"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lokasi Diniyyah / Takror</label>
                <input
                  type="text"
                  name="lokasi_diniyyah"
                  value={formData.lokasi_diniyyah || ''}
                  onChange={handleChange}
                  placeholder="Gedung / Kamar tempat KBM"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Tombol Simpan */}
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
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Daftarkan Asatidz'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
