'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useSantriStore } from '@/stores/useSantriStore';
import { Santri } from '@/types/santri';
import { User, Upload, Trash2, Save, Camera, MapPin, GraduationCap, Users } from 'lucide-react';
import {
  HierarchyRule,
  loadHierarchyRules,
  parseHierarchyTree,
  Tree2Rule,
  loadTree2Rules,
  parseTree2Options,
} from '@/lib/services/hierarchy-service';
import {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
} from '@/lib/utils/wilayah';
import { compressImageFile } from '@/lib/utils/image';
import CameraCaptureModal from './CameraCaptureModal';

interface WilayahItem {
  id: string;
  name: string;
}

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
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCompressingFoto, setIsCompressingFoto] = useState(false);

  // 1. Hierarki Kamar (Tree 1)
  const [hierarchyRules, setHierarchyRules] = useState<HierarchyRule[]>([]);
  // 2. Hierarki Sekolah Formal (Tree 2)
  const [tree2Rules, setTree2Rules] = useState<Tree2Rule[]>([]);

  // 3. Wilayah Indonesia Cascading State
  const [provinces, setProvinces] = useState<WilayahItem[]>([]);
  const [regencies, setRegencies] = useState<WilayahItem[]>([]);
  const [districts, setDistricts] = useState<WilayahItem[]>([]);
  const [villages, setVillages] = useState<WilayahItem[]>([]);

  // Inisialisasi data form saat modal dibuka
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
        kabupaten: 'KABUPATEN BANYUWANGI',
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

  // Muat aturan Tree 1, Tree 2, dan Daftar Provinsi awal
  useEffect(() => {
    if (isInputModalOpen) {
      loadHierarchyRules().then(setHierarchyRules);
      loadTree2Rules().then(setTree2Rules);
      getProvinces().then((data) => {
        if (Array.isArray(data)) setProvinces(data);
      });
    }
  }, [isInputModalOpen]);

  // Cascading Wilayah: Muat Kabupaten saat Provinsi berubah/terisi
  useEffect(() => {
    if (!formData.provinsi || provinces.length === 0) return;
    const foundProv = provinces.find(
      (p) => p.name.toLowerCase() === formData.provinsi?.toLowerCase()
    );
    if (foundProv) {
      getRegencies(foundProv.id).then((regs) => {
        if (Array.isArray(regs)) setRegencies(regs);
      });
    }
  }, [formData.provinsi, provinces]);

  // Cascading Wilayah: Muat Kecamatan saat Kabupaten berubah/terisi
  useEffect(() => {
    if (!formData.kabupaten || regencies.length === 0) return;
    const foundReg = regencies.find(
      (r) => r.name.toLowerCase() === formData.kabupaten?.toLowerCase()
    );
    if (foundReg) {
      getDistricts(foundReg.id).then((dists) => {
        if (Array.isArray(dists)) setDistricts(dists);
      });
    }
  }, [formData.kabupaten, regencies]);

  // Cascading Wilayah: Muat Desa saat Kecamatan berubah/terisi
  useEffect(() => {
    if (!formData.kecamatan || districts.length === 0) return;
    const foundDist = districts.find(
      (d) => d.name.toLowerCase() === formData.kecamatan?.toLowerCase()
    );
    if (foundDist) {
      getVillages(foundDist.id).then((vills) => {
        if (Array.isArray(vills)) setVillages(vills);
      });
    }
  }, [formData.kecamatan, districts]);

  // Opsi Kamar (Tree 1)
  const hierarchyTree = useMemo(
    () => parseHierarchyTree(hierarchyRules),
    [hierarchyRules]
  );

  const kamarOptions = useMemo(() => {
    const blokOptions = Object.keys(hierarchyTree).sort();
    const asramaOptions =
      formData.blok && hierarchyTree[formData.blok]
        ? Object.keys(hierarchyTree[formData.blok]).sort()
        : [];
    const kodeOptions =
      formData.blok && formData.asrama && hierarchyTree[formData.blok]?.[formData.asrama]
        ? Object.keys(hierarchyTree[formData.blok][formData.asrama]).sort()
        : [];
    const kmOptions =
      formData.blok &&
      formData.asrama &&
      formData.kode &&
      hierarchyTree[formData.blok]?.[formData.asrama]?.[formData.kode]
        ? hierarchyTree[formData.blok][formData.asrama][formData.kode]
        : [];

    return {
      bloks: blokOptions,
      asramas: asramaOptions,
      kodes: kodeOptions,
      kamars: kmOptions,
    };
  }, [hierarchyTree, formData.blok, formData.asrama, formData.kode]);

  // Opsi Pendidikan Formal (Tree 2)
  const formalOptions = useMemo(() => {
    return parseTree2Options(tree2Rules, formData.unit, formData.jurusan);
  }, [tree2Rules, formData.unit, formData.jurusan]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'nama' ? value.toUpperCase() : value,
    }));
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingFoto(true);
    try {
      const base64 = await compressImageFile(file, 600, 0.75);
      setFormData((prev) => ({ ...prev, foto: base64 }));
    } catch (err) {
      console.error('Gagal mengompresi foto:', err);
      // Fallback pembacaan standar jika canvas bermasalah
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFormData((prev) => ({
          ...prev,
          foto: uploadEvent.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressingFoto(false);
      e.target.value = '';
    }
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
  const tahunOptions = Array.from({ length: 45 }, (_, i) => String(2026 - i));

  return (
    <>
      <Dialog
        isOpen={isInputModalOpen}
        onClose={closeInputModal}
        title={isEdit ? 'Edit Biodata Santri' : 'Formulir Pendaftaran Santri Baru'}
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bagian 1: Identitas Utama & Foto */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-madin-700 pb-1 border-b border-slate-200 mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              1. Identitas Utama Santri
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {/* Box Foto Profil Santri */}
              <div className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="w-24 h-32 rounded-lg border border-slate-300 bg-white overflow-hidden flex items-center justify-center shadow-xs relative">
                  {formData.foto ? (
                    <img src={formData.foto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-slate-400 p-2">
                      <User className="w-8 h-8 mx-auto opacity-50 mb-1" />
                      <span className="text-[10px]">Foto 3x4</span>
                    </div>
                  )}
                  {isCompressingFoto && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px]">
                      Memproses...
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-2xs transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Kamera</span>
                    </button>

                    <label className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer shadow-2xs transition">
                      <Upload className="w-3 h-3 text-madin-700" />
                      <span>File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {formData.foto && (
                    <button
                      type="button"
                      onClick={handleHapusFoto}
                      className="w-full flex items-center justify-center gap-1 py-1 text-[11px] font-medium rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus Foto</span>
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
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-madin-600 bg-white"
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
                    list="santri_blok_options"
                    value={formData.blok || ''}
                    onChange={handleChange}
                    placeholder="Pilih/Ketik Blok"
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                  />
                  <datalist id="santri_blok_options">
                    {kamarOptions.bloks.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Asrama</label>
                  <input
                    type="text"
                    name="asrama"
                    list="santri_asrama_options"
                    value={formData.asrama || ''}
                    onChange={handleChange}
                    placeholder="Pilih/Ketik Asrama"
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                  />
                  <datalist id="santri_asrama_options">
                    {kamarOptions.asramas.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kode Kamar</label>
                  <input
                    type="text"
                    name="kode"
                    list="santri_kode_options"
                    value={formData.kode || ''}
                    onChange={handleChange}
                    placeholder="Kode (misal: E)"
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                  />
                  <datalist id="santri_kode_options">
                    {kamarOptions.kodes.map((k) => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nomor Kamar</label>
                  <input
                    type="text"
                    name="kamar"
                    list="santri_kamar_options"
                    value={formData.kamar || ''}
                    onChange={handleChange}
                    placeholder="Kamar (misal: 10)"
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                  />
                  <datalist id="santri_kamar_options">
                    {kamarOptions.kamars.map((km) => (
                      <option key={km} value={km} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-madin-700 flex items-center justify-between">
                <span>3. Madrasah Diniyyah Al Amiriyyah</span>
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
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">ORDA (Organisasi Daerah)</label>
                <input
                  type="text"
                  name="orda"
                  value={formData.orda || ''}
                  onChange={handleChange}
                  placeholder="Contoh: IKSASS, HIMAS, dll"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white uppercase"
                />
              </div>
            </div>
          </div>

          {/* Bagian 3: Sekolah Formal (Tree 2) & Alamat Asal Wilayah */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pendidikan Formal Cascading */}
            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                4. Pendidikan Formal
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit Formal</label>
                  <input
                    type="text"
                    name="unit"
                    list="formal_unit_options"
                    value={formData.unit || ''}
                    onChange={handleChange}
                    placeholder="SMP, MTs, SMA..."
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                  />
                  <datalist id="formal_unit_options">
                    {formalOptions.units.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jurusan</label>
                  <input
                    type="text"
                    name="jurusan"
                    list="formal_jurusan_options"
                    value={formData.jurusan || ''}
                    onChange={handleChange}
                    placeholder="Tahfidz, Sains, dll"
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                  />
                  <datalist id="formal_jurusan_options">
                    {formalOptions.jurusans.map((j) => (
                      <option key={j} value={j} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Semester</label>
                  <input
                    type="text"
                    name="semester"
                    list="formal_semester_options"
                    value={formData.semester || ''}
                    onChange={handleChange}
                    placeholder="1, 2, dll"
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                  />
                  <datalist id="formal_semester_options">
                    {formalOptions.semesters.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kelas Formal</label>
                  <input
                    type="text"
                    name="kelas"
                    list="formal_kelas_options"
                    value={formData.kelas || ''}
                    onChange={handleChange}
                    placeholder="VII, X, dll"
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                  />
                  <datalist id="formal_kelas_options">
                    {formalOptions.kelases.map((k) => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bagian Formal</label>
                  <input
                    type="text"
                    name="bag"
                    list="formal_bag_options"
                    value={formData.bag || ''}
                    onChange={handleChange}
                    placeholder="A, B, C..."
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white uppercase"
                  />
                  <datalist id="formal_bag_options">
                    {formalOptions.bags.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Alamat Wilayah Asal Cascading */}
            <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                5. Alamat Wilayah Asal
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provinsi</label>
                  <input
                    type="text"
                    name="provinsi"
                    list="wilayah_provinsi_options"
                    value={formData.provinsi || ''}
                    onChange={handleChange}
                    placeholder="Pilih/Ketik Provinsi"
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white uppercase"
                  />
                  <datalist id="wilayah_provinsi_options">
                    {provinces.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kabupaten / Kota</label>
                  <input
                    type="text"
                    name="kabupaten"
                    list="wilayah_kabupaten_options"
                    value={formData.kabupaten || ''}
                    onChange={handleChange}
                    placeholder="Pilih/Ketik Kabupaten"
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white uppercase"
                  />
                  <datalist id="wilayah_kabupaten_options">
                    {regencies.map((r) => (
                      <option key={r.id} value={r.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kecamatan</label>
                  <input
                    type="text"
                    name="kecamatan"
                    list="wilayah_kecamatan_options"
                    value={formData.kecamatan || ''}
                    onChange={handleChange}
                    placeholder="Pilih/Ketik Kecamatan"
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white uppercase"
                  />
                  <datalist id="wilayah_kecamatan_options">
                    {districts.map((d) => (
                      <option key={d.id} value={d.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Desa / Kelurahan</label>
                  <input
                    type="text"
                    name="desa"
                    list="wilayah_desa_options"
                    value={formData.desa || ''}
                    onChange={handleChange}
                    placeholder="Pilih/Ketik Desa"
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white uppercase"
                  />
                  <datalist id="wilayah_desa_options">
                    {villages.map((v) => (
                      <option key={v.id} value={v.name} />
                    ))}
                  </datalist>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dusun / Jalan</label>
                  <input
                    type="text"
                    name="dusun"
                    value={formData.dusun || ''}
                    onChange={handleChange}
                    placeholder="Nama Dusun, RT/RW, atau Nama Jalan"
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bagian 4: Data Administrasi Keluarga & Kontak */}
          <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-600" />
              6. Data Administrasi Keluarga & Kependudukan
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">NIK Santri</label>
                <input
                  type="text"
                  name="nik"
                  value={formData.nik || ''}
                  onChange={handleChange}
                  placeholder="16 Digit NIK"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nomor Kartu Keluarga (KK)</label>
                <input
                  type="text"
                  name="no_kk"
                  value={formData.no_kk || ''}
                  onChange={handleChange}
                  placeholder="16 Digit No. KK"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">No. Telepon / WA Aktif</label>
                <input
                  type="text"
                  name="telepon"
                  value={formData.telepon || ''}
                  onChange={handleChange}
                  placeholder="08..."
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Ayah (BIN)</label>
                <input
                  type="text"
                  name="nama_ayah"
                  value={formData.nama_ayah || ''}
                  onChange={handleChange}
                  placeholder="Nama Lengkap Ayah"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">NIK Ayah</label>
                <input
                  type="text"
                  name="nik_ayah"
                  value={formData.nik_ayah || ''}
                  onChange={handleChange}
                  placeholder="NIK Ayah"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Ibu (BINTI)</label>
                <input
                  type="text"
                  name="nama_ibu"
                  value={formData.nama_ibu || ''}
                  onChange={handleChange}
                  placeholder="Nama Lengkap Ibu"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white uppercase"
                />
              </div>
            </div>
          </div>

          {/* Footer Tombol Simpan */}
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
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Daftarkan Santri'}</span>
            </button>
          </div>
        </form>
      </Dialog>

      {/* Modal Kamera WebRTC Live 3x4 */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(b64) => setFormData((prev) => ({ ...prev, foto: b64 }))}
      />
    </>
  );
}
