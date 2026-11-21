'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { usePagePermission } from '@/stores/useRbacStore';
import { useTahunAjaranStore } from '@/stores/useTahunAjaranStore';
import {
  Grid,
  History,
  Save,
  Printer,
  Image as ImageIcon,
  Settings,
  Pencil,
  Sliders,
  Eye,
  RotateCcw,
} from 'lucide-react';
import ModalSettingsHafalan from '@/components/modules/setoran/ModalSettingsHafalan';
import KartuBuktiSetoran, { KartuData } from '@/components/modules/setoran/KartuBuktiSetoran';
import SetoranTampilan1View from '@/components/modules/setoran/SetoranTampilan1View';
import {
  getNowLocalDateTimeString,
  formatDateTimeSetoran,
  toDateTimeLocalInput,
  formatTanggalResmi,
  cariMustahiqSantri,
  norm,
  normalizeTahunAjaranSlash,
} from '@/lib/utils/setoranHelper';
import { SetoranHafalan } from '@/types/setoran';
import html2canvas from 'html2canvas';

const LS_SETORAN_VIEW_MODE = 'madin_setoran_view_mode_v1';
type SetoranViewMode = 'tampilan1' | 'tampilan2';

export default function SetoranPage() {
  const {
    setoranList,
    config,
    fetchSetoranData,
    addSetoran,
    updateSetoran,
    deleteSetoran,
    openSettings,
    editingRecord,
    editOldKey,
    setEditingRecord,
  } = useMuhafadzohStore();

  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const {
    activeTahunAjaran,
    daftarTahunAjaran,
    fetchGlobalTahunAjaran,
  } = useTahunAjaranStore();
  const {
    currentAccount,
    canCreate,
    canDelete,
    canAccessSettings,
    isPersonAllowed,
  } = usePagePermission('setoran');

  // Switch Tampilan 1 (default) vs Tampilan 2
  const [viewMode, setViewMode] = useState<SetoranViewMode>('tampilan1');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LS_SETORAN_VIEW_MODE);
      if (saved === 'tampilan1' || saved === 'tampilan2') {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleChangeViewMode = (mode: SetoranViewMode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(LS_SETORAN_VIEW_MODE, mode);
    } catch {}
  };

  // Top Filter & Search
  const [filterGender, setFilterGender] = useState<'SEMUA' | 'PA' | 'PI'>('SEMUA');

  // Form State
  const [tglSetor, setTglSetor] = useState(getNowLocalDateTimeString());
  const [noInduk, setNoInduk] = useState('');
  const [namaSantri, setNamaSantri] = useState('');

  // Auto-filled Metadata
  const [tglLahir, setTglLahir] = useState('');
  const [blnLahir, setBlnLahir] = useState('');
  const [thnLahir, setThnLahir] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [mustahiq, setMustahiq] = useState('');
  const [dinKls, setDinKls] = useState('');
  const [dinBag, setDinBag] = useState('');
  const [tingkat, setTingkat] = useState('');
  const [kecamatan, setKecamatan] = useState('');
  const [kabupaten, setKabupaten] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [bin, setBin] = useState('');
  const [paPiSantri, setPaPiSantri] = useState('');

  // Active Hafalan State
  const [penjaga, setPenjaga] = useState('');
  const [itemHafalan, setItemHafalan] = useState('');
  const [kategori, setKategori] = useState<'Wajib' | 'Sunnah' | 'Tahfidz' | 'Kitab' | 'Wisuda' | ''>('Wajib');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (setoranList.length === 0) fetchSetoranData();
    fetchGlobalTahunAjaran();
    if (santriList.length === 0) fetchSantri();
    if (asatidzList.length === 0) fetchAsatidz();
    if (formasiList.length === 0) fetchFormasi();
  }, [fetchSetoranData, fetchGlobalTahunAjaran, fetchSantri, fetchAsatidz, fetchFormasi, setoranList.length, santriList.length, asatidzList.length, formasiList.length]);

  // Load editing record into form if available
  useEffect(() => {
    if (editingRecord) {
      setViewMode('tampilan2');
      setNoInduk(editingRecord.no_induk || '');
      setNamaSantri(editingRecord.nama || '');
      setTglSetor(toDateTimeLocalInput(editingRecord.tanggal));
      setTglLahir(editingRecord.tgl_lahir || '');
      setBlnLahir(editingRecord.bln_lahir || '');
      setThnLahir(editingRecord.thn_lahir || '');
      setTempatLahir(editingRecord.tempat_lahir || '');
      setMustahiq(editingRecord.mustahiq || '');
      setDinKls(editingRecord.din_kls || '');
      setDinBag(editingRecord.din_bag || '');
      setTingkat(editingRecord.tingkat || '');
      setKecamatan(editingRecord.kecamatan || '');
      setKabupaten(editingRecord.kabupaten || '');
      setProvinsi(editingRecord.provinsi || '');
      setBin(editingRecord.bin || '');
      setPenjaga(editingRecord.penjaga || '');
      setItemHafalan(editingRecord.item_hafalan || '');
      setKategori((editingRecord.kategori as any) || 'Wajib');
    }
  }, [editingRecord]);

  // Datalist sumber santri terfilter gender & otoritas
  const filteredSantriList = useMemo(() => {
    const allowed = santriList.filter((s) => isPersonAllowed({ blok: s.blok, pa_pi: s.pa_pi }));
    if (filterGender === 'SEMUA') return allowed;
    return allowed.filter((s) => norm(s.pa_pi) === filterGender);
  }, [santriList, isPersonAllowed, filterGender]);

  // Handle santri selection
  const fillSantriData = (santri: any) => {
    if (!santri) return;
    const sInduk = santri.no_induk || santri[1] || '';
    const sNama = santri.nama || santri[5] || '';
    const sTglLahir = santri.tgl_lahir || santri[7] || '';
    const sBlnLahir = santri.bln_lahir || santri[8] || '';
    const sThnLahir = santri.thn_lahir || santri[9] || '';
    const sTempatLahir = santri.tempat_lahir || santri[6] || '';
    const sTingkat = santri.tingkat || santri[26] || '';
    const sDinBag = santri.din_bag || santri[25] || '';
    const sDinKls = santri.din_kls || santri[24] || '';
    const sPaPi = santri.pa_pi || santri[4] || '';
    const sKec = santri.kecamatan || santri[12] || '';
    const sKab = santri.kabupaten || santri[13] || '';
    const sProv = santri.provinsi || santri[14] || '';
    const sBin = santri.bin || santri.nama_ayah || santri[30] || '';

    setNoInduk(sInduk);
    setNamaSantri(sNama);
    setTglLahir(sTglLahir);
    setBlnLahir(sBlnLahir);
    setThnLahir(sThnLahir);
    setTempatLahir(sTempatLahir);
    setTingkat(sTingkat);
    setDinBag(sDinBag);
    setDinKls(sDinKls);
    setPaPiSantri(sPaPi);
    setKecamatan(sKec);
    setKabupaten(sKab);
    setProvinsi(sProv);
    setBin(sBin);

    const wali = cariMustahiqSantri(sTingkat, sDinBag, sDinKls, sPaPi, asatidzList, formasiList);
    setMustahiq(wali);
    setPenjaga('');
    setItemHafalan('');
  };

  // Autocomplete change by Induk
  const handleIndukChange = (val: string) => {
    setNoInduk(val);
    const cleanVal = val.trim();
    if (!cleanVal) return;
    const found = santriList.find(
      (s: any) => String(s.no_induk || s[1]).trim() === cleanVal
    );
    if (found) fillSantriData(found);
  };

  // Autocomplete change by Nama
  const handleNamaChange = (val: string) => {
    setNamaSantri(val);
    const cleanVal = val.trim().toUpperCase();
    if (!cleanVal) return;
    const found = santriList.find(
      (s: any) => norm(s.nama || s[5]) === cleanVal
    );
    if (found) fillSantriData(found);
  };

  // Penjaga Options
  const penjagaOptions = useMemo(() => {
    if (!tingkat && !paPiSantri) {
      return asatidzList.map((a) => a.nama_asatidz).filter(Boolean);
    }

    const bebasSet = new Set((config.penjagaBebas || []).map(norm));
    const cleanTingkat = norm(tingkat);
    const cleanPaPi = norm(paPiSantri);

    const matches = asatidzList.filter((a) => {
      const aNama = norm(a.nama_asatidz);
      const aTkt = norm(a.tingkat_asatidz);
      const aPaPi = norm(a.pa_pi);

      const isBebas = bebasSet.has(aNama);
      const isDefault = aTkt === cleanTingkat && aPaPi === cleanPaPi;
      return isDefault || isBebas;
    });

    const unique = Array.from(new Set(matches.map((a) => a.nama_asatidz))).filter(Boolean);
    return unique.sort();
  }, [tingkat, paPiSantri, asatidzList, config.penjagaBebas]);

  // Item Hafalan Options based on Category and Tingkat/Kls
  const itemHafalanOptions = useMemo(() => {
    if (!kategori) return [];

    if (kategori === 'Tahfidz') {
      const juzArr: string[] = [];
      for (let i = 1; i <= 30; i++) juzArr.push(`Juz ${i}`);
      return juzArr;
    }

    const key = `${norm(tingkat)}_${norm(dinKls)}`;
    let source: Record<string, any> = {};
    if (kategori === 'Wajib') source = config.hafWajib;
    else if (kategori === 'Sunnah') source = config.hafSunnah;
    else if (kategori === 'Kitab') source = config.hafKitab;
    else if (kategori === 'Wisuda') source = config.hafWisuda || {};

    const list = source[key];
    if (Array.isArray(list)) {
      return list
        .map((item: any) => (typeof item === 'object' && item !== null ? item.nama : String(item)))
        .filter(Boolean);
    }
    if (typeof list === 'string') return String(list).split(',').map((s) => s.trim()).filter(Boolean);

    // Fallback default
    if (kategori === 'Wajib') {
      const def = (config.hafWajib as any)?.[key];
      if (Array.isArray(def)) {
        return def
          .map((item: any) => (typeof item === 'object' && item !== null ? item.nama : String(item)))
          .filter(Boolean);
      }
    }
    return [];
  }, [kategori, tingkat, dinKls, config]);

  // Live Preview Data for Card
  const kartuPreviewData: KartuData = useMemo(() => {
    const ttlArr: string[] = [];
    if (tempatLahir) ttlArr.push(tempatLahir);
    if (tglLahir && blnLahir && thnLahir) {
      ttlArr.push(`${tglLahir} ${blnLahir} ${thnLahir}`);
    }

    const klsArr: string[] = [];
    if (dinKls) klsArr.push(dinKls);
    if (dinBag) klsArr.push(dinBag);
    if (tingkat) klsArr.push(tingkat);

    return {
      nama: namaSantri,
      bin,
      nis: noInduk,
      ttl: ttlArr.join(', '),
      mustahiq,
      kelas: klsArr.join(' - '),
      kec: kecamatan,
      kab: kabupaten,
      prov: provinsi,
      penjaga,
      hafalan: itemHafalan,
      tglSetor: formatTanggalResmi(tglSetor),
    };
  }, [
    namaSantri,
    bin,
    noInduk,
    tempatLahir,
    tglLahir,
    blnLahir,
    thnLahir,
    mustahiq,
    dinKls,
    dinBag,
    tingkat,
    kecamatan,
    kabupaten,
    provinsi,
    penjaga,
    itemHafalan,
    tglSetor,
  ]);

  // Reset Form
  const handleResetForm = () => {
    setTglSetor(getNowLocalDateTimeString());
    setNoInduk('');
    setNamaSantri('');
    setTglLahir('');
    setBlnLahir('');
    setThnLahir('');
    setTempatLahir('');
    setMustahiq('');
    setDinKls('');
    setDinBag('');
    setTingkat('');
    setKecamatan('');
    setKabupaten('');
    setProvinsi('');
    setBin('');
    setPaPiSantri('');
    setPenjaga('');
    setItemHafalan('');
    setKategori('Wajib');
    setEditingRecord(null);
  };

  // Submit Simpan / Update Setoran
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noInduk || !namaSantri) {
      alert('Pilih Santri terlebih dahulu!');
      return;
    }
    if (!penjaga) {
      alert('Kolom Penjaga wajib diisi!');
      return;
    }
    if (!itemHafalan) {
      alert('Kolom Hafalan wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    const formattedTgl = formatDateTimeSetoran(tglSetor);
    const kelasGabung = `${dinKls || ''} ${dinBag || ''} ${tingkat || ''}`.trim();

    const record: SetoranHafalan = {
      id: `${noInduk}_${formattedTgl}_${itemHafalan}`,
      no_induk: noInduk,
      tanggal: formattedTgl,
      nama: namaSantri,
      tgl_lahir: tglLahir,
      bln_lahir: blnLahir,
      thn_lahir: thnLahir,
      tempat_lahir: tempatLahir,
      penjaga,
      mustahiq,
      tingkat,
      din_bag: dinBag,
      din_kls: dinKls,
      kecamatan,
      kabupaten,
      provinsi,
      bin,
      item_hafalan: itemHafalan,
      kategori: kategori || 'Wajib',
      tahun_ajaran: normalizeTahunAjaranSlash(editingRecord?.tahun_ajaran || activeTahunAjaran || '2026/2027'),
      kelas: kelasGabung,
      capaian: itemHafalan,
      nilai: 'Mumtaz (A)',
    };

    let success = false;
    if (editingRecord && editOldKey) {
      success = await updateSetoran(record, editOldKey);
    } else {
      const isDuplicate = setoranList.some(
        (s) =>
          String(s.no_induk).trim() === String(noInduk).trim() &&
          norm(s.item_hafalan) === norm(itemHafalan) &&
          s.tanggal === formattedTgl
      );
      if (isDuplicate) {
        alert(
          `Santri ${namaSantri} sudah tercatat menyetorkan "${itemHafalan}" pada tanggal ${formattedTgl}. Simpan data duplikat dibatalkan.`
        );
        setIsSubmitting(false);
        return;
      }
      success = await addSetoran(record);
    }

    setIsSubmitting(false);

    if (success) {
      alert(editingRecord ? 'Data setoran hafalan berhasil diperbarui!' : 'Data setoran hafalan berhasil dicatat!');
      handleResetForm();
    }
  };

  // Cetak Kartu
  const handlePrintKartu = () => {
    document.body.classList.add('printing-kartu-setoran');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-kartu-setoran');
      }, 600);
    }, 150);
  };

  // Unduh JPG Kartu
  const handleDownloadJpg = async () => {
    const element = document.querySelector('.kartu-container') as HTMLElement;
    if (!element) return;

    try {
      const canvas = await (html2canvas as any)(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imageURL = canvas.toDataURL('image/jpeg', 0.95);
      const downloadLink = document.createElement('a');
      downloadLink.href = imageURL;
      downloadLink.download = `Kartu_Setoran_${noInduk || 'Santri'}.jpg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err: any) {
      console.error('Gagal mengunduh gambar JPG:', err);
      alert('Terjadi kesalahan saat mengunduh gambar kartu: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar Sesuai setoran.html (Gambar 2) */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <Grid className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Muhafadzoh Madin <span className="text-slate-400 font-normal text-lg">(Setoran)</span>
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Kelola data setoran hafalan santri Madrasah Diniyyah Al Amiriyyah.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
            {/* Tombol menuju halaman Tabel Riwayat Hafalan */}
            <Link
              href="/setoran/riwayat"
              data-testid="btn-riwayat-setoran"
              title="Buka halaman Tabel Riwayat Hafalan"
              className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <History className="w-3.5 h-3.5 text-emerald-700" />
              <span>Riwayat</span>
            </Link>

            {/* Switch Tampilan 1 vs Tampilan 2 */}
            <div
              role="group"
              aria-label="Pilih mode tampilan setoran"
              className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200"
            >
              <button
                type="button"
                data-testid="switch-tampilan1"
                onClick={() => handleChangeViewMode('tampilan1')}
                className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'tampilan1'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tampilan 1
              </button>
              <button
                type="button"
                data-testid="switch-tampilan2"
                onClick={() => handleChangeViewMode('tampilan2')}
                className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  viewMode === 'tampilan2'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tampilan 2
              </button>
            </div>

            <div className="w-px h-6 bg-slate-200 mx-0.5 hidden sm:block" />

            <div className="px-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5 leading-none">
                Filter Gender
              </label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value as 'SEMUA' | 'PA' | 'PI')}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border-0 rounded px-2 py-1 focus:outline-none"
              >
                <option value="SEMUA">Semua</option>
                <option value="PA">Putra (PA)</option>
                <option value="PI">Putri (PI)</option>
              </select>
            </div>

            {viewMode === 'tampilan2' && (
              <>
                <div className="w-px h-6 bg-slate-200 mx-0.5" />

                <button
                  type="button"
                  onClick={handlePrintKartu}
                  title="Print Kartu"
                  className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 transition border border-transparent hover:border-emerald-200 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleDownloadJpg}
                  title="Unduh JPG"
                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition border border-transparent hover:border-blue-200 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </>
            )}

            {canAccessSettings && (
              <button
                type="button"
                onClick={openSettings}
                aria-label={
                  viewMode === 'tampilan1'
                    ? 'Opsi Hafalan / Pengaturan Target & Akses Hafalan'
                    : 'Pengaturan Target & Akses Hafalan'
                }
                title="Pengaturan Target & Akses Hafalan"
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition border border-transparent hover:border-slate-200 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'tampilan1' ? (
        <SetoranTampilan1View
          santriList={filteredSantriList}
          asatidzList={asatidzList}
          formasiList={formasiList}
          setoranList={setoranList}
          config={config}
          activeTahunAjaran={activeTahunAjaran}
          daftarTahunAjaran={daftarTahunAjaran}
          currentAccount={currentAccount}
          canCreate={canCreate}
          canDelete={canDelete}
          onAddSetoran={(entry) => addSetoran(entry)}
          onDeleteSetoran={(key) => deleteSetoran(key)}
        />
      ) : (
        <>
      {/* 2. Grid 2 Kolom: Form Input Kiri & Live Preview Kartu Kanan */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Kotak Kiri: INPUT HAFALAN */}
        <div className="xl:col-span-6">
          <div className="card-panel border-t-4 border-t-emerald-700 p-5 shadow-sm h-full">
            {/* Header Panel */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h5 className="font-bold text-slate-800 text-sm flex items-center gap-2 m-0">
                <Pencil className="w-4 h-4 text-emerald-700" /> Form Input Hafalan
              </h5>
              {canAccessSettings && (
                <button
                  type="button"
                  onClick={openSettings}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
                  title="Pengaturan Item Hafalan"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Opsi Hafalan</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Baris 1: Tgl, No Induk, Nama Santri */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tgl &amp; Waktu Setor
                  </label>
                  <input
                    type="datetime-local"
                    value={tglSetor}
                    onChange={(e) => setTglSetor(e.target.value)}
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1">
                    NIS (Ketik/Pilih)
                  </label>
                  <input
                    list="dl_m_induk"
                    type="text"
                    value={noInduk}
                    onChange={(e) => handleIndukChange(e.target.value)}
                    placeholder="Pencarian..."
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-emerald-600 focus:outline-none shadow-2xs font-mono"
                  />
                  <datalist id="dl_m_induk">
                    {filteredSantriList.map((s: any) => {
                      const idVal = s.no_induk || s[1];
                      return idVal ? <option key={idVal} value={idVal} /> : null;
                    })}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1">
                    Nama Santri (Ketik/Pilih)
                  </label>
                  <input
                    list="dl_m_nama"
                    type="text"
                    value={namaSantri}
                    onChange={(e) => handleNamaChange(e.target.value)}
                    placeholder="Pencarian..."
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-emerald-600 focus:outline-none shadow-2xs font-medium"
                  />
                  <datalist id="dl_m_nama">
                    {filteredSantriList.map((s: any) => {
                      const nVal = s.nama || s[5];
                      return nVal ? <option key={nVal} value={nVal} /> : null;
                    })}
                  </datalist>
                </div>
              </div>

              {/* Info Otomatis Santri (Auto-filled) */}
              <hr className="border-slate-200/80 my-2" />
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-0.5">Tgl Lahir</label>
                  <span className="font-bold text-slate-800 block truncate">{tglLahir || '-'}</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-0.5">Bln Lahir</label>
                  <span className="font-bold text-slate-800 block truncate">{blnLahir || '-'}</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-0.5">Thn Lahir</label>
                  <span className="font-bold text-slate-800 block truncate">{thnLahir || '-'}</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-0.5">Asatidz</label>
                  <span className="font-bold text-emerald-700 block truncate">{mustahiq || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-xs pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-0.5">Tempat Lahir</label>
                  <span className="font-bold text-slate-800 block truncate">{tempatLahir || '-'}</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-0.5">Din. Kls</label>
                  <span className="font-bold text-slate-800 block truncate">{dinKls || '-'}</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-0.5">Din. Bag</label>
                  <span className="font-bold text-slate-800 block truncate">{dinBag || '-'}</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 font-semibold mb-0.5">Tingkat</label>
                  <span className="font-bold text-slate-800 block truncate">{tingkat || '-'}</span>
                </div>
              </div>

              <hr className="border-slate-200/80 my-2" />

              {/* Input Hafalan Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Penjaga</label>
                  <input
                    list="dl_m_penjaga"
                    type="text"
                    value={penjaga}
                    onChange={(e) => setPenjaga(e.target.value)}
                    disabled={!namaSantri}
                    placeholder={!namaSantri ? 'Pilih Santri dahulu...' : 'Pilih Penjaga...'}
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-400"
                    required
                  />
                  <datalist id="dl_m_penjaga">
                    {penjagaOptions.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div className="sm:col-span-7">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item Hafalan</label>
                  <input
                    list="dl_m_hafalan"
                    type="text"
                    value={itemHafalan}
                    onChange={(e) => setItemHafalan(e.target.value)}
                    placeholder="Pilih hafalan disini..."
                    className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 font-medium"
                    required
                  />
                  <datalist id="dl_m_hafalan">
                    {itemHafalanOptions.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Radio Pill Tokens: Wajib / Sunnah / Tahfidz / Kitab / Wisuda */}
              <div className="pt-1">
                <div className="flex flex-wrap gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {(['Wajib', 'Sunnah', 'Tahfidz', 'Kitab', 'Wisuda'] as const).map((kat) => {
                    const isSelected = kategori === kat;
                    return (
                      <button
                        key={kat}
                        type="button"
                        onClick={() => {
                          setKategori(kat);
                          setItemHafalan('');
                        }}
                        className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md transition text-center border ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {kat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tombol Aksi Form */}
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Form</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 text-xs font-bold rounded-lg text-white shadow-sm transition flex items-center gap-2 ${
                    editingRecord
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Menyimpan...'
                      : editingRecord
                      ? 'Update Riwayat'
                      : 'Simpan Setoran'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Kotak Kanan: KARTU BUKTI SETORAN (Live Preview & Print Area) */}
        <div className="xl:col-span-6">
          <div
            className="card-panel border-0 p-5 shadow-sm h-full flex flex-col items-center justify-center bg-slate-50"
            style={{
              backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div className="mb-4 d-print-none">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold text-slate-600 bg-white border border-slate-200 shadow-2xs">
                <Eye className="w-3.5 h-3.5 text-emerald-700" /> Live Preview Kartu
              </span>
            </div>

            <div className="w-full overflow-x-auto pb-2 flex justify-center">
              <div id="print-area">
                <KartuBuktiSetoran data={kartuPreviewData} />
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* 3. Modal Pengaturan Target & Penjaga */}
      <ModalSettingsHafalan />
    </div>
  );
}
