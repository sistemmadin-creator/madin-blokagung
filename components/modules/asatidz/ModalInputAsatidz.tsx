'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { Asatidz } from '@/types/asatidz';
import {
  User,
  Camera,
  Upload,
  Trash2,
  Save,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import {
  HierarchyRule,
  loadHierarchyRules,
  parseHierarchyTree,
} from '@/lib/services/hierarchy-service';
import {
  getProvinces,
  getRegencies,
  getDistricts,
  getVillages,
} from '@/lib/utils/wilayah';
import CameraCaptureModal from '@/components/modules/santri/CameraCaptureModal';

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

const NIA_PREFIX_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'PA', 'PI'];

const BULAN_OPTIONS = [
  { val: '01', label: 'Jan' },
  { val: '02', label: 'Feb' },
  { val: '03', label: 'Mar' },
  { val: '04', label: 'Apr' },
  { val: '05', label: 'Mei' },
  { val: '06', label: 'Jun' },
  { val: '07', label: 'Jul' },
  { val: '08', label: 'Agu' },
  { val: '09', label: 'Sep' },
  { val: '10', label: 'Okt' },
  { val: '11', label: 'Nov' },
  { val: '12', label: 'Des' },
];

export default function ModalInputAsatidz() {
  const {
    isInputModalOpen,
    closeInputModal,
    openImportModal,
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

  const [selectedPrefix, setSelectedPrefix] = useState<string>('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Master Wilayah Cascading Options
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [regencies, setRegencies] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [villages, setVillages] = useState<{ id: string; name: string }[]>([]);

  // Hierarki Kamar
  const [hierarchyRules, setHierarchyRules] = useState<HierarchyRule[]>([]);

  useEffect(() => {
    if (isInputModalOpen) {
      loadHierarchyRules().then(setHierarchyRules);
      getProvinces().then((data) => {
        if (Array.isArray(data)) setProvinces(data);
      });
    }
  }, [isInputModalOpen]);

  useEffect(() => {
    if (editAsatidzData) {
      setFormData({ ...editAsatidzData });
      // Detect prefix from existing NIA
      const niaStr = String(editAsatidzData.nia || '').trim();
      const match = niaStr.match(/^([A-Za-z]+)/);
      if (match && NIA_PREFIX_OPTIONS.includes(match[1].toUpperCase())) {
        setSelectedPrefix(match[1].toUpperCase());
      } else {
        setSelectedPrefix('');
      }
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
      setSelectedPrefix('B'); // Default popular prefix in blokagung
    }
  }, [editAsatidzData, isInputModalOpen]);

  // Cascading Wilayah: Kabupaten saat Provinsi dipilih
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

  // Cascading Wilayah: Kecamatan saat Kabupaten dipilih
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

  // Cascading Wilayah: Desa saat Kecamatan dipilih
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

  // Hierarki Kamar
  const hierarchyTree = useMemo(
    () => parseHierarchyTree(hierarchyRules),
    [hierarchyRules]
  );

  const formOptions = useMemo(() => {
    const blokOptions = Object.keys(hierarchyTree).sort();
    const asramaOptions =
      formData.blok && hierarchyTree[formData.blok]
        ? Object.keys(hierarchyTree[formData.blok]).sort()
        : [];
    const kodeOptions =
      formData.blok && formData.asrama && hierarchyTree[formData.blok]?.[formData.asrama]
        ? Object.keys(hierarchyTree[formData.blok][formData.asrama]).sort()
        : [];
    const kamarOptions =
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
      kamars: kamarOptions,
    };
  }, [hierarchyTree, formData.blok, formData.asrama, formData.kode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = {
        ...prev,
        [name]: name === 'nama_asatidz' ? value.toUpperCase() : value,
      };

      if (name === 'pa_pi') {
        next.jah_asatidz = value === 'PA' ? 'Mustahiq' : 'Mustahiqoh';
      }

      return next;
    });
  };

  const handlePrefixChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prefix = e.target.value;
    setSelectedPrefix(prefix);
    if (prefix) {
      const nextNIA = generateNextNIA(prefix);
      setFormData((prev) => ({ ...prev, nia: nextNIA }));
    }
  };

  const handleAutoGenerateNIA = () => {
    const prefix = selectedPrefix || (formData.pa_pi === 'PI' ? 'PI' : 'PA');
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

  const handleBukaImport = () => {
    closeInputModal();
    setTimeout(() => {
      openImportModal();
    }, 180);
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

  // Tahun Options (Current down to 1950)
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear; y >= 1950; y--) {
    yearOptions.push(y);
  }

  // Tanggal Options (01 to 31)
  const dateOptions: string[] = [];
  for (let d = 1; d <= 31; d++) {
    dateOptions.push(d < 10 ? `0${d}` : String(d));
  }

  return (
    <>
      <Dialog
        isOpen={isInputModalOpen}
        onClose={closeInputModal}
        title={isEdit ? 'Edit Data Dewan Asatidz' : 'Form Pendaftaran Data Asatidz'}
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Action: Pintasan Import Excel */}
          {!isEdit && (
            <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-xs text-emerald-800 font-medium flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Ingin menambahkan puluhan atau ratusan asatidz sekaligus?
              </span>
              <button
                type="button"
                onClick={handleBukaImport}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Impor via Excel</span>
              </button>
            </div>
          )}

          {/* 1. Identitas Asatidz & Foto Profil */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 pb-1 border-b border-slate-200 mb-3">
              1. Identitas Utama &amp; Foto Profil
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {/* Foto Profil Area */}
              <div className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                <div className="w-24 h-32 rounded-lg border border-slate-300 bg-white overflow-hidden flex items-center justify-center shadow-xs">
                  {formData.foto_asatidz ? (
                    <img
                      src={formData.foto_asatidz}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400 p-2">
                      <User className="w-8 h-8 mx-auto opacity-50 mb-1 text-slate-500" />
                      <span className="text-[10px]">Foto 3x4</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex gap-1.5 w-full">
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-semibold rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition"
                    >
                      <Camera className="w-3 h-3 text-emerald-600" />
                      <span>Kamera</span>
                    </button>

                    <label className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer transition shadow-2xs">
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span>Galeri</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {formData.foto_asatidz && (
                    <button
                      type="button"
                      onClick={handleHapusFoto}
                      className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-medium rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus Foto</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Form Input Identitas */}
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* NIA dengan Prefix Selector */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIA (Nomor Induk Asatidz) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={selectedPrefix}
                      onChange={handlePrefixChange}
                      title="Pilih Prefix Huruf NIA"
                      className="w-14 text-xs py-2 px-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-bold focus:outline-none"
                    >
                      <option value="">-</option>
                      {NIA_PREFIX_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>

                    <div className="relative flex-1">
                      <input
                        type="text"
                        name="nia"
                        value={formData.nia || ''}
                        onChange={handleChange}
                        required
                        placeholder="Contoh: B54"
                        className="w-full text-xs py-2 pl-2.5 pr-7 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-mono font-bold text-slate-800"
                      />
                      {!isEdit && (
                        <button
                          type="button"
                          onClick={handleAutoGenerateNIA}
                          title="Generate Otomatis Nomor NIA"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-800"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gender PA/PI */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="pa_pi"
                    value={formData.pa_pi || 'PA'}
                    onChange={handleChange}
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="PA">PA - Ustadz</option>
                    <option value="PI">PI - Ustadzah</option>
                  </select>
                </div>

                {/* Nama Lengkap Asatidz */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Asatidz <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nama_asatidz"
                    value={formData.nama_asatidz || ''}
                    onChange={handleChange}
                    required
                    placeholder="Nama lengkap asatidz (huruf besar)"
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 uppercase font-semibold text-slate-800"
                  />
                </div>

                {/* Jah / Amanah */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amanah / Jah
                  </label>
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

                {/* Tempat Lahir */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    name="tempat_lahir"
                    value={formData.tempat_lahir || ''}
                    onChange={handleChange}
                    placeholder="Kota / Kab Kelahiran"
                    className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                {/* Tanggal, Bulan, Tahun Lahir (Dropdown Rapi seperti Gambar 2) */}
                <div className="sm:col-span-2 grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tgl Lahir
                    </label>
                    <select
                      name="tgl_lahir"
                      value={formData.tgl_lahir || ''}
                      onChange={handleChange}
                      className="w-full text-xs py-2 px-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none"
                    >
                      <option value="">Tgl</option>
                      {dateOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Bulan
                    </label>
                    <select
                      name="bln_lahir"
                      value={formData.bln_lahir || ''}
                      onChange={handleChange}
                      className="w-full text-xs py-2 px-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none"
                    >
                      <option value="">Bulan</option>
                      {BULAN_OPTIONS.map((b) => (
                        <option key={b.val} value={b.val}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tahun
                    </label>
                    <select
                      name="thn_lahir"
                      value={formData.thn_lahir || ''}
                      onChange={handleChange}
                      className="w-full text-xs py-2 px-2 rounded-lg border border-slate-200 bg-white text-center focus:outline-none"
                    >
                      <option value="">Tahun</option>
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Tugas Mengajar & Lokasi Diniyyah */}
          <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              2. Tugas Mengajar &amp; Lokasi KBM
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tingkat
                </label>
                <select
                  name="tingkat_asatidz"
                  value={formData.tingkat_asatidz || 'Ula'}
                  onChange={handleChange}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="Ula">Ula</option>
                  <option value="Wustho">Wustho</option>
                  <option value="Ulya">Ulya</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Din. Kls
                </label>
                <input
                  type="text"
                  name="din_kls_asatidz"
                  value={formData.din_kls_asatidz || '1'}
                  onChange={handleChange}
                  placeholder="Contoh: 1, 2, 3"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-center"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Din. Bag
                </label>
                <input
                  type="text"
                  name="din_bag_asatidz"
                  value={formData.din_bag_asatidz || 'A'}
                  onChange={handleChange}
                  placeholder="Contoh: A, B, C, N"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white text-center uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Lokasi Diniyyah
                </label>
                <input
                  type="text"
                  name="lokasi_diniyyah"
                  value={formData.lokasi_diniyyah || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Masjid Lt.1 Barat Utara / Asrama Al-Falah"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Lokasi Takror
                </label>
                <input
                  type="text"
                  name="lokasi_takror"
                  value={formData.lokasi_takror || ''}
                  onChange={handleChange}
                  placeholder="Ruang Takror Malam"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          {/* 3. Domisili Asrama (Penempatan Kamar) */}
          <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700">
              3. Penempatan Kamar Asatidz (Blok &gt; Asrama &gt; Kode &gt; Kamar)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Blok</label>
                <input
                  type="text"
                  name="blok"
                  list="asatidz_blok_options"
                  value={formData.blok || ''}
                  onChange={handleChange}
                  placeholder="Pilih/Ketik Blok"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
                <datalist id="asatidz_blok_options">
                  {formOptions.bloks.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Asrama</label>
                <input
                  type="text"
                  name="asrama"
                  list="asatidz_asrama_options"
                  value={formData.asrama || ''}
                  onChange={handleChange}
                  placeholder="Pilih Asrama"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
                <datalist id="asatidz_asrama_options">
                  {formOptions.asramas.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kode</label>
                <input
                  type="text"
                  name="kode"
                  list="asatidz_kode_options"
                  value={formData.kode || ''}
                  onChange={handleChange}
                  placeholder="Kode (misal: E)"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
                <datalist id="asatidz_kode_options">
                  {formOptions.kodes.map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kamar</label>
                <input
                  type="text"
                  name="kamar"
                  list="asatidz_kamar_options"
                  value={formData.kamar || ''}
                  onChange={handleChange}
                  placeholder="Kamar (misal: 10)"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
                <datalist id="asatidz_kamar_options">
                  {formOptions.kamars.map((km) => (
                    <option key={km} value={km} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* 4. Alamat Domisili Asal (Cascading Wilayah) */}
          <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">
              4. Alamat Domisili Asal
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provinsi</label>
                <input
                  type="text"
                  name="provinsi"
                  list="list_prov_asatidz"
                  value={formData.provinsi || ''}
                  onChange={handleChange}
                  placeholder="Pilih Provinsi"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
                <datalist id="list_prov_asatidz">
                  {provinces.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kabupaten/Kota</label>
                <input
                  type="text"
                  name="kabupaten"
                  list="list_kab_asatidz"
                  value={formData.kabupaten || ''}
                  onChange={handleChange}
                  placeholder="Pilih Kabupaten"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
                <datalist id="list_kab_asatidz">
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
                  list="list_kec_asatidz"
                  value={formData.kecamatan || ''}
                  onChange={handleChange}
                  placeholder="Pilih Kecamatan"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
                <datalist id="list_kec_asatidz">
                  {districts.map((d) => (
                    <option key={d.id} value={d.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Desa/Kelurahan</label>
                <input
                  type="text"
                  name="desa"
                  list="list_desa_asatidz"
                  value={formData.desa || ''}
                  onChange={handleChange}
                  placeholder="Pilih Desa"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
                />
                <datalist id="list_desa_asatidz">
                  {villages.map((v) => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dusun / Jalan</label>
                <input
                  type="text"
                  name="dusun"
                  value={formData.dusun || ''}
                  onChange={handleChange}
                  placeholder="Nama Dusun, RT/RW, atau Jalan"
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white"
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
              className="flex items-center gap-1.5 px-6 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Daftarkan Asatidz'}</span>
            </button>
          </div>
        </form>
      </Dialog>

      {/* Kamera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(base64) => {
          setFormData((prev) => ({ ...prev, foto_asatidz: base64 }));
          setIsCameraOpen(false);
        }}
      />
    </>
  );
}
