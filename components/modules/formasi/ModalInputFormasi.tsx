'use client';

import React, { useState, useEffect, useRef } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { FormasiKelas } from '@/types/formasi';
import { compressImageFile } from '@/lib/utils/image';
import { VALID_JAH_WALIKELAS, norm } from '@/lib/utils/formasiSync';
import { Save, Camera, Trash2, Building, RefreshCw, Star } from 'lucide-react';

export default function ModalInputFormasi({
  gender,
}: {
  gender?: 'PA' | 'PI';
}) {
  const {
    isInputModalOpen,
    closeInputModal,
    editFormasiData,
    inputModalDefaultGender,
    saveFormasi,
  } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const isEdit = !!editFormasiData;

  const [formData, setFormData] = useState<Partial<FormasiKelas>>({
    tingkat: 'ULA',
    din_kls: '1',
    din_bag: 'A',
    pa_pi: gender || inputModalDefaultGender || 'PA',
    kapasitas_maksimal: 80,
    is_unggulan: false,
    id_mustahiq: '',
    domisili: '',
    lokasi_diniyyah: '',
    lokasi_takror: '',
    blok: '',
    foto_takror: '',
    foto_diniyyah: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compressingTakror, setCompressingTakror] = useState(false);
  const [compressingDiniyyah, setCompressingDiniyyah] = useState(false);

  const fileTakrorRef = useRef<HTMLInputElement>(null);
  const fileDiniyyahRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchAsatidz, asatidzList.length]);

  useEffect(() => {
    if (editFormasiData) {
      setFormData({
        ...editFormasiData,
        tingkat: editFormasiData.tingkat || 'ULA',
        kapasitas_maksimal: editFormasiData.kapasitas_maksimal || 80,
        foto_takror: editFormasiData.foto_takror || '',
        foto_diniyyah: editFormasiData.foto_diniyyah || '',
      });
    } else {
      setFormData({
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'A',
        pa_pi: gender || inputModalDefaultGender || 'PA',
        kapasitas_maksimal: 80,
        is_unggulan: false,
        id_mustahiq: '',
        domisili: '',
        lokasi_diniyyah: '',
        lokasi_takror: '',
        blok: '',
        foto_takror: '',
        foto_diniyyah: '',
      });
    }
  }, [editFormasiData, isInputModalOpen, gender, inputModalDefaultGender]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    jenis: 'takror' | 'diniyyah'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file berupa gambar (JPG/PNG/WEBP).');
      return;
    }

    if (jenis === 'takror') setCompressingTakror(true);
    else setCompressingDiniyyah(true);

    try {
      const base64 = await compressImageFile(file, 700, 0.75);
      if (jenis === 'takror') {
        setFormData((prev) => ({ ...prev, foto_takror: base64 }));
      } else {
        setFormData((prev) => ({ ...prev, foto_diniyyah: base64 }));
      }
    } catch (err) {
      console.error('Gagal kompres foto formasi:', err);
      alert('Gagal memproses foto: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (jenis === 'takror') setCompressingTakror(false);
      else setCompressingDiniyyah(false);
      e.target.value = '';
    }
  };

  const handleHapusFoto = (jenis: 'takror' | 'diniyyah') => {
    if (jenis === 'takror') {
      setFormData((prev) => ({ ...prev, foto_takror: '' }));
    } else {
      setFormData((prev) => ({ ...prev, foto_diniyyah: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tingkat || !formData.din_kls || !formData.din_bag) {
      alert('Mohon lengkapi Tingkat, Din. Kelas, dan Din. Bagian!');
      return;
    }

    setIsSubmitting(true);
    const targetGender = gender || (formData.pa_pi as 'PA' | 'PI') || 'PA';
    const success = await saveFormasi(
      {
        ...formData,
        pa_pi: targetGender,
        din_bag: (formData.din_bag || '').trim().toUpperCase(),
        kapasitas_maksimal: Math.min(
          Math.max(Number(formData.kapasitas_maksimal) || 80, 1),
          80
        ),
      },
      isEdit,
      editFormasiData?.id
    );
    setIsSubmitting(false);

    if (success) {
      closeInputModal();
    }
  };

  // Filter wali kelas options from asatidz
  const currentGender = gender || formData.pa_pi || 'PA';
  const asatidzOptions = asatidzList.filter((a) => {
    const jah = norm(a.jah_asatidz);
    const validJah = VALID_JAH_WALIKELAS.includes(jah);
    const matchGender = !a.pa_pi || norm(a.pa_pi) === norm(currentGender);
    return validJah && matchGender;
  });

  return (
    <Dialog
      isOpen={isInputModalOpen}
      onClose={closeInputModal}
      title={isEdit ? 'Edit Formasi Kelas' : 'Formasi Kelas Baru'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Tingkat & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tingkat <span className="text-rose-500">*</span>
            </label>
            <select
              name="tingkat"
              value={formData.tingkat || 'ULA'}
              onChange={handleChange}
              required
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-madin-600 focus:outline-none"
            >
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gender (PA / PI) <span className="text-rose-500">*</span>
            </label>
            <select
              name="pa_pi"
              value={formData.pa_pi || 'PA'}
              onChange={handleChange}
              disabled={!!gender}
              required
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-madin-600 focus:outline-none disabled:bg-slate-50"
            >
              <option value="PA">PA - Putra</option>
              <option value="PI">PI - Putri</option>
            </select>
          </div>
        </div>

        {/* Row 2: Din. Kelas, Din. Bagian, Kapasitas */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Din. Kelas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="din_kls"
              value={formData.din_kls || ''}
              onChange={handleChange}
              required
              placeholder="1, 2, 3..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 text-center font-bold focus:ring-2 focus:ring-madin-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Din. Bagian <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="din_bag"
              maxLength={2}
              value={formData.din_bag || ''}
              onChange={handleChange}
              required
              placeholder="A, B, C..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 uppercase text-center font-bold focus:ring-2 focus:ring-madin-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kapasitas Maksimal
            </label>
            <input
              type="number"
              name="kapasitas_maksimal"
              value={formData.kapasitas_maksimal || 80}
              onChange={handleChange}
              min="1"
              max="80"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 font-bold text-center focus:ring-2 focus:ring-madin-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 3: Wali Kelas & Blok */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wali Kelas / Mustahiq
            </label>
            <input
              list="listAsatidzMustahiqInput"
              name="id_mustahiq"
              value={formData.id_mustahiq || ''}
              onChange={handleChange}
              placeholder="Pilih atau ketik nama mustahiq..."
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-madin-600 focus:outline-none"
            />
            <datalist id="listAsatidzMustahiqInput">
              {asatidzOptions.map((a) => (
                <option key={a.id || a.nia} value={a.nama_asatidz}>
                  {a.jah_asatidz || 'Mustahiq'} - {a.nia}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Domisili Kelas
            </label>
            <input
              type="text"
              name="domisili"
              value={formData.domisili || ''}
              onChange={handleChange}
              placeholder="Contoh: Asrama Al-Barokah / Induk"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-madin-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 4: Lokal Takror, Lokasi Diniyyah, Blok */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lokal Takror
            </label>
            <input
              type="text"
              name="lokasi_takror"
              value={formData.lokasi_takror || ''}
              onChange={handleChange}
              placeholder="Contoh: Musholla Al-Falah"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-madin-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lokasi Diniyyah
            </label>
            <input
              type="text"
              name="lokasi_diniyyah"
              value={formData.lokasi_diniyyah || ''}
              onChange={handleChange}
              placeholder="Contoh: Gedung Madin Lt.2 R.04"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-madin-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Blok (Mandiri)
            </label>
            <input
              type="text"
              name="blok"
              value={formData.blok || ''}
              onChange={handleChange}
              placeholder="Contoh: Induk / Blok 4"
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-madin-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Kelas Unggulan Toggle */}
        <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/70 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-900">
            <input
              type="checkbox"
              name="is_unggulan"
              checked={!!formData.is_unggulan}
              onChange={handleChange}
              className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
            />
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
              Tandai sebagai Kelas Program Unggulan
            </span>
          </label>
        </div>

        {/* Row 5: Dual Foto Ruangan (Takror & Diniyyah) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Foto Takror */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="block text-xs font-bold text-slate-700">
              Foto Lokal Takror
            </span>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                {formData.foto_takror ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formData.foto_takror}
                    alt="Foto Takror"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building className="w-6 h-6 text-slate-300" />
                )}
                {compressingTakror && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px]">
                    Kompres...
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <input
                  type="file"
                  ref={fileTakrorRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFotoUpload(e, 'takror')}
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileTakrorRef.current?.click()}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3 text-slate-600" />
                    <span>Pilih Foto</span>
                  </button>
                  {formData.foto_takror && (
                    <button
                      type="button"
                      onClick={() => handleHapusFoto('takror')}
                      className="px-2 py-1 text-[11px] font-semibold rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-2xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Otomatis dikompresi agar ringan.
                </p>
              </div>
            </div>
          </div>

          {/* Foto Diniyyah */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="block text-xs font-bold text-slate-700">
              Foto Lokasi Diniyyah
            </span>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                {formData.foto_diniyyah ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={formData.foto_diniyyah}
                    alt="Foto Diniyyah"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building className="w-6 h-6 text-slate-300" />
                )}
                {compressingDiniyyah && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px]">
                    Kompres...
                  </div>
                )}
              </div>

              <div className="space-y-1.5 flex-1">
                <input
                  type="file"
                  ref={fileDiniyyahRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFotoUpload(e, 'diniyyah')}
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileDiniyyahRef.current?.click()}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs flex items-center gap-1"
                  >
                    <Camera className="w-3 h-3 text-slate-600" />
                    <span>Pilih Foto</span>
                  </button>
                  {formData.foto_diniyyah && (
                    <button
                      type="button"
                      onClick={() => handleHapusFoto('diniyyah')}
                      className="px-2 py-1 text-[11px] font-semibold rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 shadow-2xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Otomatis dikompresi agar ringan.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={closeInputModal}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-xs transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>
                  {isEdit ? 'Simpan Perubahan' : 'Simpan Formasi'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
