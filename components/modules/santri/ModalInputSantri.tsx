'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useSantriStore } from '@/stores/useSantriStore';
import { Santri } from '@/types/santri';
import { User, Upload, Trash2, Save } from 'lucide-react';

export default function ModalInputSantri() {
  const { isInputModalOpen, closeInputModal, editSantriData, saveSantri } = useSantriStore();

  const isEdit = !!editSantriData;

  const [formData, setFormData] = useState<Partial<Santri>>({
    pa_pi: 'PA',
    tingkat: 'Ula',
    din_kls: '1',
    din_bag: 'A',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editSantriData) {
      setFormData({ ...editSantriData });
    } else {
      setFormData({
        no_induk: '',
        no_biro: '',
        nisn: '',
        pa_pi: 'PA',
        nama: '',
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
        unit: '',
        jurusan: '',
        semester: '',
        kelas: '',
        bag: '',
        tingkat: 'Ula',
        din_kls: '1',
        din_bag: 'A',
        orda: '',
        nik: '',
        no_kk: '',
        nama_ayah: '',
        nik_ayah: '',
        nama_ibu: '',
        nik_ibu: '',
        telepon: '',
        foto: '',
      });
    }
  }, [editSantriData, isInputModalOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'nama' ? value.toUpperCase() : value,
    }));
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setFormData((prev) => ({ ...prev, foto: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleHapusFoto = () => {
    setFormData((prev) => ({ ...prev, foto: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.no_induk || !formData.nama || !formData.pa_pi) {
      alert('Mohon lengkapi No. Induk, Nama Lengkap, dan Gender (PA/PI)');
      return;
    }

    setIsSubmitting(true);
    const success = await saveSantri(
      formData as Santri,
      isEdit,
      editSantriData?.no_induk
    );
    setIsSubmitting(false);

    if (success) {
      closeInputModal();
    }
  };

  // Generate date numbers
  const tanggalOptions = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const tahunOptions = Array.from({ length: 40 }, (_, i) => String(2026 - i));

  return (
    <Dialog
      isOpen={isInputModalOpen}
      onClose={closeInputModal}
      title={isEdit ? 'Edit Biodata Santri' : 'Formulir Pendaftaran Santri Baru'}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bagian 1: Identitas Utama & Foto */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-madin-700 pb-1 border-b border-slate-200 mb-3">
            1. Identitas Utama Santri
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {/* Box Foto */}
            <div className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
              <div className="w-24 h-32 rounded-lg border border-slate-300 bg-white overflow-hidden flex items-center justify-center shadow-xs">
                {formData.foto ? (
                  <img src={formData.foto} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400 p-2">
                    <User className="w-8 h-8 mx-auto opacity-50 mb-1" />
                    <span className="text-[10px]">Foto 3x4</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 w-full">
                <label className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer shadow-xs">
                  <Upload className="w-3 h-3 text-madin-700" />
                  <span>Pilih File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoUpload}
                    className="hidden"
                  />
                </label>
                {formData.foto && (
                  <button
                    type="button"
                    onClick={handleHapusFoto}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Hapus Foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Kolom Input Identitas */}
            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No. Induk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="no_induk"
                  value={formData.no_induk || ''}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: 12345"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">No. Biro</label>
                <input
                  type="text"
                  name="no_biro"
                  value={formData.no_biro || ''}
                  onChange={handleChange}
                  placeholder="Opsional"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">NISN</label>
                <input
                  type="text"
                  name="nisn"
                  value={formData.nisn || ''}
                  onChange={handleChange}
                  placeholder="10 Digit NISN"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Santri <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama || ''}
                  onChange={handleChange}
                  required
                  placeholder="Nama Lengkap Huruf Kapital"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600 uppercase font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender (PA / PI) <span className="text-rose-500">*</span>
                </label>
                <select
                  name="pa_pi"
                  value={formData.pa_pi || 'PA'}
                  onChange={handleChange}
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600"
                >
                  <option value="PA">PA - Putra</option>
                  <option value="PI">PI - Putri</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  type="text"
                  name="tempat_lahir"
                  value={formData.tempat_lahir || ''}
                  onChange={handleChange}
                  placeholder="Kota / Kab. Lahir"
                  className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600"
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                  <select
                    name="tgl_lahir"
                    value={formData.tgl_lahir || ''}
                    onChange={handleChange}
                    className="w-full text-xs py-2 px-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">Tgl</option>
                    {tanggalOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bulan</label>
                  <select
                    name="bln_lahir"
                    value={formData.bln_lahir || ''}
                    onChange={handleChange}
                    className="w-full text-xs py-2 px-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">Bulan</option>
                    <option value="01">Jan</option>
                    <option value="02">Feb</option>
                    <option value="03">Mar</option>
                    <option value="04">Apr</option>
                    <option value="05">Mei</option>
                    <option value="06">Jun</option>
                    <option value="07">Jul</option>
                    <option value="08">Agu</option>
                    <option value="09">Sep</option>
                    <option value="10">Okt</option>
                    <option value="11">Nov</option>
                    <option value="12">Des</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun</label>
                  <select
                    name="thn_lahir"
                    value={formData.thn_lahir || ''}
                    onChange={handleChange}
                    className="w-full text-xs py-2 px-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="">Thn</option>
                    {tahunOptions.map((th) => (
                      <option key={th} value={th}>
                        {th}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bagian 2: Domisili Kamar & Madrasah Diniyyah */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-madin-700">
              2. Domisili Asrama & Kamar
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Blok Asrama</label>
                <input
                  type="text"
                  name="blok"
                  value={formData.blok || ''}
                  onChange={handleChange}
                  placeholder="Contoh: A, B, Induk"
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
                  placeholder="Contoh: Darussalam"
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
                  placeholder="Contoh: 01, A"
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
                  placeholder="Contoh: 12"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-madin-700">
              3. Madrasah Diniyyah Al Amiriyyah
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tingkat</label>
                <select
                  name="tingkat"
                  value={formData.tingkat || 'Ula'}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Ula">Ula</option>
                  <option value="Wustho">Wustho</option>
                  <option value="Ulya">Ulya</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kelas Diniyyah</label>
                <select
                  name="din_kls"
                  value={formData.din_kls || '1'}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bagian Diniyyah</label>
                <input
                  type="text"
                  name="din_bag"
                  value={formData.din_bag || ''}
                  onChange={handleChange}
                  placeholder="A, B, C..."
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white uppercase text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bagian 3: Sekolah Formal & Alamat Asal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-madin-700">
              4. Pendidikan Formal
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit Formal</label>
                <input
                  type="text"
                  name="unit"
                  value={formData.unit || ''}
                  onChange={handleChange}
                  placeholder="SMP, SMA, SMK..."
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jurusan</label>
                <input
                  type="text"
                  name="jurusan"
                  value={formData.jurusan || ''}
                  onChange={handleChange}
                  placeholder="MIPA, IPS, dll"
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kelas Formal</label>
                <input
                  type="text"
                  name="kelas"
                  value={formData.kelas || ''}
                  onChange={handleChange}
                  placeholder="VII, X, dll"
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-madin-700">
              5. Alamat Wilayah Asal
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kecamatan</label>
                <input
                  type="text"
                  name="kecamatan"
                  value={formData.kecamatan || ''}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kabupaten</label>
                <input
                  type="text"
                  name="kabupaten"
                  value={formData.kabupaten || ''}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provinsi</label>
                <input
                  type="text"
                  name="provinsi"
                  value={formData.provinsi || ''}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">No. Telepon / WA</label>
                <input
                  type="text"
                  name="telepon"
                  value={formData.telepon || ''}
                  onChange={handleChange}
                  placeholder="08..."
                  className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-mono"
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
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Daftarkan Santri'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
