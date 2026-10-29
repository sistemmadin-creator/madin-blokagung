'use client';

import React, { useState, useEffect, useRef } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { FormasiKelas } from '@/types/formasi';
import { compressImageFile } from '@/lib/utils/image';
import { VALID_JAH_WALIKELAS, norm } from '@/lib/utils/formasiSync';
import { Save, Camera, Trash2, Building, RefreshCw, Star, MapPin } from 'lucide-react';
import { loadHierarkiKbm, findBlokFromLokasi } from '@/lib/services/hierarchy-service';
import { HierarkiBlokKBMConfig } from '@/types/formasi';

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
    blok_diniyyah: '',
    blok_takror: '',
    blok: '',
    foto_takror: '',
    foto_diniyyah: '',
  });

  const [hierarkiConfig, setHierarkiConfig] = useState<HierarkiBlokKBMConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compressingTakror, setCompressingTakror] = useState(false);
  const [compressingDiniyyah, setCompressingDiniyyah] = useState(false);

  const fileTakrorRef = useRef<HTMLInputElement>(null);
  const fileDiniyyahRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchAsatidz, asatidzList.length]);

  useEffect(() => {
    if (isInputModalOpen) {
      loadHierarkiKbm().then((cfg) => setHierarkiConfig(cfg));
    }
  }, [isInputModalOpen]);

  useEffect(() => {
    if (editFormasiData) {
      setFormData({
        tingkat: editFormasiData.tingkat || 'ULA',
        din_kls: editFormasiData.din_kls || '1',
        din_bag: editFormasiData.din_bag || 'A',
        pa_pi: editFormasiData.pa_pi || gender || 'PA',
        kapasitas_maksimal: editFormasiData.kapasitas_maksimal || 80,
        is_unggulan: Boolean(editFormasiData.is_unggulan),
        id_mustahiq: editFormasiData.id_mustahiq || '',
        domisili: editFormasiData.domisili || '',
        lokasi_diniyyah: editFormasiData.lokasi_diniyyah || '',
        lokasi_takror: editFormasiData.lokasi_takror || '',
        blok_diniyyah: editFormasiData.blok_diniyyah || editFormasiData.blok || '',
        blok_takror: editFormasiData.blok_takror || '',
        blok: editFormasiData.blok || '',
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
        blok_diniyyah: '',
        blok_takror: '',
        blok: '',
        foto_takror: '',
        foto_diniyyah: '',
      });
    }
  }, [editFormasiData, isInputModalOpen, gender, inputModalDefaultGender]);

  // Ekstraksi opsi lokasi dan blok dari hierarki
  const lokasiTakrorOptions = React.useMemo(() => {
    if (!hierarkiConfig?.takror) return [];
    const set = new Set<string>();
    hierarkiConfig.takror.forEach((b) => b.lokasiList.forEach((l) => set.add(l)));
    return Array.from(set);
  }, [hierarkiConfig]);

  const lokasiDiniyyahOptions = React.useMemo(() => {
    if (!hierarkiConfig?.diniyyah) return [];
    const set = new Set<string>();
    hierarkiConfig.diniyyah.forEach((b) => b.lokasiList.forEach((l) => set.add(l)));
    return Array.from(set);
  }, [hierarkiConfig]);

  const blokTakrorOptions = React.useMemo(() => {
    if (!hierarkiConfig?.takror) return [];
    return hierarkiConfig.takror.map((b) => b.namaBlok);
  }, [hierarkiConfig]);

  const blokDiniyyahOptions = React.useMemo(() => {
    if (!hierarkiConfig?.diniyyah) return [];
    return hierarkiConfig.diniyyah.map((b) => b.namaBlok);
  }, [hierarkiConfig]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => {
        const next = { ...prev, [name]: value };

        // Autofill Blok Takror jika Lokasi Takror berubah dan cocok dengan hierarki
        if (name === 'lokasi_takror' && value && hierarkiConfig) {
          const autoBlok = findBlokFromLokasi('takror', value, hierarkiConfig);
          if (autoBlok && !prev.blok_takror) {
            next.blok_takror = autoBlok;
          }
        }

        // Autofill Blok Diniyyah jika Lokasi Diniyyah berubah dan cocok dengan hierarki
        if (name === 'lokasi_diniyyah' && value && hierarkiConfig) {
          const autoBlok = findBlokFromLokasi('diniyyah', value, hierarkiConfig);
          if (autoBlok && !prev.blok_diniyyah) {
            next.blok_diniyyah = autoBlok;
          }
        }

        return next;
      });
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
        blok_diniyyah: formData.blok_diniyyah || '',
        blok_takror: formData.blok_takror || '',
        blok: formData.blok_diniyyah || formData.blok_takror || formData.blok || '',
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

        {/* Row 4: Hierarki Blok & Lokasi Ruang (Takror & Diniyyah) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Card Takror (Belajar Sore) */}
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/80">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-amber-700" />
                <span>Hierarki Takror (Sore)</span>
              </span>
              <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                Blok &gt; Lokasi
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Lokasi Ruang Takror
                </label>
                <input
                  type="text"
                  list="listLokasiTakrorInput"
                  name="lokasi_takror"
                  value={formData.lokasi_takror || ''}
                  onChange={handleChange}
                  placeholder="Ketik / pilih ruang..."
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                />
                <datalist id="listLokasiTakrorInput">
                  {lokasiTakrorOptions.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Blok Takror</span>
                  <span className="text-[10px] text-amber-700 font-normal">Otomatis dari hierarki</span>
                </label>
                <input
                  type="text"
                  list="listBlokTakrorInput"
                  name="blok_takror"
                  value={formData.blok_takror || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Blok 1 / Induk"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-amber-300/80 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-medium"
                />
                <datalist id="listBlokTakrorInput">
                  {blokTakrorOptions.map((blk) => (
                    <option key={blk} value={blk} />
                  ))}
                </datalist>
              </div>

              {/* Foto Takror */}
              <div className="pt-2 border-t border-amber-100">
                <span className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Foto Lokal Takror
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                    {formData.foto_takror ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={formData.foto_takror}
                        alt="Foto Takror"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building className="w-5 h-5 text-slate-300" />
                    )}
                    {compressingTakror && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[8px]">
                        Kompres...
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={fileTakrorRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFotoUpload(e, 'takror')}
                    />
                    <button
                      type="button"
                      onClick={() => fileTakrorRef.current?.click()}
                      className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3 text-slate-600" />
                      <span>{formData.foto_takror ? 'Ganti' : 'Pilih Foto'}</span>
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
                </div>
              </div>
            </div>
          </div>

          {/* Card Diniyyah (KBM Malam) */}
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200/80">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-700" />
                <span>Hierarki Diniyyah (Malam)</span>
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                Blok &gt; Lokasi
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Lokasi Ruang Diniyyah
                </label>
                <input
                  type="text"
                  list="listLokasiDiniyyahInput"
                  name="lokasi_diniyyah"
                  value={formData.lokasi_diniyyah || ''}
                  onChange={handleChange}
                  placeholder="Ketik / pilih ruang..."
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                />
                <datalist id="listLokasiDiniyyahInput">
                  {lokasiDiniyyahOptions.map((loc) => (
                    <option key={loc} value={loc} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Blok Diniyyah</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Otomatis dari hierarki</span>
                </label>
                <input
                  type="text"
                  list="listBlokDiniyyahInput"
                  name="blok_diniyyah"
                  value={formData.blok_diniyyah || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Blok 1 / Induk"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-emerald-300/80 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-medium"
                />
                <datalist id="listBlokDiniyyahInput">
                  {blokDiniyyahOptions.map((blk) => (
                    <option key={blk} value={blk} />
                  ))}
                </datalist>
              </div>

              {/* Foto Diniyyah */}
              <div className="pt-2 border-t border-emerald-100">
                <span className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Foto Lokasi Diniyyah
                </span>
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                    {formData.foto_diniyyah ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={formData.foto_diniyyah}
                        alt="Foto Diniyyah"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building className="w-5 h-5 text-slate-300" />
                    )}
                    {compressingDiniyyah && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[8px]">
                        Kompres...
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={fileDiniyyahRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFotoUpload(e, 'diniyyah')}
                    />
                    <button
                      type="button"
                      onClick={() => fileDiniyyahRef.current?.click()}
                      className="px-2 py-1 text-[11px] font-semibold rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3 text-slate-600" />
                      <span>{formData.foto_diniyyah ? 'Ganti' : 'Pilih Foto'}</span>
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
                </div>
              </div>
            </div>
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
