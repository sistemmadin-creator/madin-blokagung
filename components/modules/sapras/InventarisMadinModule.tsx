'use client';

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Package,
  Plus,
  Scan,
  Printer,
  FileSpreadsheet,
  Search,
  Filter,
  ArrowRightLeft,
  Edit3,
  Trash2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Phone,
  User,
  History,
  Info,
  DollarSign,
  QrCode,
  X,
} from 'lucide-react';
import { useSaprasStore } from '@/stores/useSaprasStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  InventarisMadinItem,
  KategoriInventarisMadin,
  KATEGORI_INVENTARIS_MADIN_META,
  KondisiSapras,
  KONDISI_SAPRAS_META,
  SaprasTempatLokasi,
} from '@/types/sapras';
import { ModalBarcodeScanner } from './ModalBarcodeScanner';
import { ModalCetakLabelSapras } from './ModalCetakLabelSapras';
import { generateQrSvgPath } from '@/lib/utils/qrSvgGenerator';

export function InventarisMadinModule() {
  const {
    tempatList,
    inventarisMadinList,
    addTempatLokasi,
    updateTempatLokasi,
    deleteTempatLokasi,
    addInventarisMadin,
    updateInventarisMadin,
    deleteInventarisMadin,
    mutasiInventarisMadin,
  } = useSaprasStore();

  const { currentAccount, canCreate, canEdit, canDelete } =
    usePagePermission('sapras-inventaris');

  // Filter & Search States
  const [activeTempatTab, setActiveTempatTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('ALL');
  const [filterKondisi, setFilterKondisi] = useState<string>('ALL');

  // Modal Dialog States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCetakOpen, setIsCetakOpen] = useState(false);
  const [cetakDefaultAssetId, setCetakDefaultAssetId] = useState<string | undefined>(undefined);
  const [isManageTempatOpen, setIsManageTempatOpen] = useState(false);
  const [isAddEditAssetOpen, setIsAddEditAssetOpen] = useState(false);
  const [isMutasiOpen, setIsMutasiOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<InventarisMadinItem | null>(null);
  const [mutatingAsset, setMutatingAsset] = useState<InventarisMadinItem | null>(null);

  // Form State: Add/Edit Asset
  const [formNamaBarang, setFormNamaBarang] = useState('');
  const [formKategori, setFormKategori] = useState<KategoriInventarisMadin>('ELEKTRONIK_IT');
  const [formTempatId, setFormTempatId] = useState('');
  const [formKodeBarcode, setFormKodeBarcode] = useState('');
  const [formSpesifikasi, setFormSpesifikasi] = useState('');
  const [formKondisi, setFormKondisi] = useState<KondisiSapras>('BAIK');
  const [formJumlah, setFormJumlah] = useState(1);
  const [formSatuan, setFormSatuan] = useState('Unit');
  const [formTahun, setFormTahun] = useState<number>(new Date().getFullYear());
  const [formSumberDana, setFormSumberDana] = useState('Kas Madin');
  const [formNilai, setFormNilai] = useState<number>(0);
  const [formCatatan, setFormCatatan] = useState('');

  // Form State: Mutasi
  const [mutasiKeTempatId, setMutasiKeTempatId] = useState('');
  const [mutasiPetugas, setMutasiPetugas] = useState('');
  const [mutasiAlasan, setMutasiAlasan] = useState('');

  // Form State: Dynamic Place Management
  const [newTempatNama, setNewTempatNama] = useState('');
  const [newTempatKode, setNewTempatKode] = useState('');
  const [newTempatPIC, setNewTempatPIC] = useState('');
  const [newTempatKontak, setNewTempatKontak] = useState('');
  const [newTempatKet, setNewTempatKet] = useState('');
  const [editingTempatId, setEditingTempatId] = useState<string | null>(null);
  const [tempatFeedback, setTempatFeedback] = useState<string | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPI Calculations
  const kpiStats = useMemo(() => {
    let totalItems = 0;
    let baikCount = 0;
    let rusakCount = 0;
    let totalValuasi = 0;

    inventarisMadinList.forEach((item) => {
      totalItems += item.jumlah;
      if (item.kondisi === 'BAIK') {
        baikCount += item.jumlah;
      } else {
        rusakCount += item.jumlah;
      }
      if (item.nilaiPerolehan) {
        totalValuasi += item.nilaiPerolehan * item.jumlah;
      }
    });

    return { totalItems, baikCount, rusakCount, totalValuasi };
  }, [inventarisMadinList]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventarisMadinList.filter((item) => {
      if (activeTempatTab !== 'ALL' && item.tempatId !== activeTempatTab) return false;
      if (filterKategori !== 'ALL' && item.kategori !== filterKategori) return false;
      if (filterKondisi !== 'ALL' && item.kondisi !== filterKondisi) return false;
      if (q) {
        const matchName = item.namaBarang.toLowerCase().includes(q);
        const matchCode = item.kodeBarcode.toLowerCase().includes(q);
        const matchSpec = (item.spesifikasi || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchSpec) return false;
      }
      return true;
    });
  }, [inventarisMadinList, activeTempatTab, filterKategori, filterKondisi, searchQuery]);

  // Open Modal Add Asset
  const handleOpenAddAsset = () => {
    setEditingAsset(null);
    setFormNamaBarang('');
    setFormKategori('ELEKTRONIK_IT');
    const defaultPlace = tempatList[0]?.id || '';
    setFormTempatId(activeTempatTab !== 'ALL' ? activeTempatTab : defaultPlace);
    // Auto-generate barcode code
    const prefix = KATEGORI_INVENTARIS_MADIN_META['ELEKTRONIK_IT'].prefixBarcode;
    const randomSeq = String(inventarisMadinList.length + 1).padStart(3, '0');
    setFormKodeBarcode(`MBD-AST-${prefix}-${randomSeq}`);
    setFormSpesifikasi('');
    setFormKondisi('BAIK');
    setFormJumlah(1);
    setFormSatuan('Unit');
    setFormTahun(new Date().getFullYear());
    setFormSumberDana('Kas Madin');
    setFormNilai(0);
    setFormCatatan('');
    setIsAddEditAssetOpen(true);
  };

  // Open Modal Edit Asset
  const handleOpenEditAsset = (item: InventarisMadinItem) => {
    setEditingAsset(item);
    setFormNamaBarang(item.namaBarang);
    setFormKategori(item.kategori);
    setFormTempatId(item.tempatId);
    setFormKodeBarcode(item.kodeBarcode);
    setFormSpesifikasi(item.spesifikasi || '');
    setFormKondisi(item.kondisi);
    setFormJumlah(item.jumlah);
    setFormSatuan(item.satuan);
    setFormTahun(item.tahunPerolehan || new Date().getFullYear());
    setFormSumberDana(item.sumberDana || 'Kas Madin');
    setFormNilai(item.nilaiPerolehan || 0);
    setFormCatatan(item.catatan || '');
    setIsAddEditAssetOpen(true);
  };

  // Save Asset (Add or Edit)
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaBarang.trim()) return;

    if (editingAsset) {
      await updateInventarisMadin(editingAsset.id, {
        namaBarang: formNamaBarang.trim(),
        kategori: formKategori,
        tempatId: formTempatId,
        spesifikasi: formSpesifikasi.trim() || undefined,
        kondisi: formKondisi,
        jumlah: Math.max(1, formJumlah),
        satuan: formSatuan.trim() || 'Unit',
        tahunPerolehan: formTahun,
        sumberDana: formSumberDana.trim() || undefined,
        nilaiPerolehan: formNilai > 0 ? formNilai : undefined,
        catatan: formCatatan.trim() || undefined,
        updatedBy: currentAccount?.full_name || 'Admin Sapras',
      });
      showToast(`Aset "${formNamaBarang}" berhasil diperbarui.`);
    } else {
      await addInventarisMadin({
        kodeBarcode: formKodeBarcode.trim().toUpperCase() || `MBD-AST-ELK-${Date.now().toString().slice(-4)}`,
        namaBarang: formNamaBarang.trim(),
        kategori: formKategori,
        tempatId: formTempatId,
        spesifikasi: formSpesifikasi.trim() || undefined,
        kondisi: formKondisi,
        jumlah: Math.max(1, formJumlah),
        satuan: formSatuan.trim() || 'Unit',
        tahunPerolehan: formTahun,
        sumberDana: formSumberDana.trim() || undefined,
        nilaiPerolehan: formNilai > 0 ? formNilai : undefined,
        catatan: formCatatan.trim() || undefined,
        updatedBy: currentAccount?.full_name || 'Admin Sapras',
      });
      showToast(`Aset baru "${formNamaBarang}" berhasil ditambahkan.`);
    }

    setIsAddEditAssetOpen(false);
  };

  // Open Modal Mutasi
  const handleOpenMutasi = (item: InventarisMadinItem) => {
    setMutatingAsset(item);
    const otherPlaces = tempatList.filter((t) => t.id !== item.tempatId);
    setMutasiKeTempatId(otherPlaces[0]?.id || '');
    setMutasiPetugas(currentAccount?.full_name || 'Petugas Sapras');
    setMutasiAlasan('');
    setIsMutasiOpen(true);
  };

  // Submit Mutasi
  const handleSubmitMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutatingAsset || !mutasiKeTempatId) return;

    await mutasiInventarisMadin({
      itemId: mutatingAsset.id,
      keTempatId: mutasiKeTempatId,
      petugasPemindah: mutasiPetugas.trim() || 'Petugas Sapras',
      alasan: mutasiAlasan.trim() || 'Pemindahan operasional kantor',
    });

    const targetPlace = tempatList.find((t) => t.id === mutasiKeTempatId)?.nama;
    showToast(`Aset "${mutatingAsset.namaBarang}" berhasil dimutasi ke ${targetPlace}.`);
    setIsMutasiOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Barcode',
      'Nama Barang',
      'Kategori',
      'Lokasi Tempat',
      'Kondisi',
      'Jumlah',
      'Satuan',
      'Tahun Perolehan',
      'Sumber Dana',
      'Nilai Perolehan (Rp)',
      'Spesifikasi / Catatan',
    ];

    const rows = filteredAssets.map((item, idx) => {
      const place = tempatList.find((t) => t.id === item.tempatId);
      return [
        idx + 1,
        `"${item.kodeBarcode}"`,
        `"${item.namaBarang.replace(/"/g, '""')}"`,
        `"${KATEGORI_INVENTARIS_MADIN_META[item.kategori]?.label || item.kategori}"`,
        `"${place?.nama || item.tempatId}"`,
        `"${KONDISI_SAPRAS_META[item.kondisi]?.shortLabel || item.kondisi}"`,
        item.jumlah,
        `"${item.satuan}"`,
        item.tahunPerolehan || '-',
        `"${item.sumberDana || '-'}"`,
        item.nilaiPerolehan || 0,
        `"${(item.spesifikasi || item.catatan || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Inventaris-Madin-Universal-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Data inventaris madin berhasil diekspor ke CSV.');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/30"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Toolbar Actions */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
              Universal Asset Management
            </span>
            <span className="text-xs text-slate-400 font-medium">PKM. Sapras Madin</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            Inventaris Madin & Lokasi Aset
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen terpadu aset kantor madin, mutasi antar lokasi, serta pelacakan berbasis Barcode & QR Code.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddAsset}
            className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aset</span>
          </button>
          <button
            type="button"
            onClick={() => setIsManageTempatOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>Kelola Lokasi ({tempatList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Scan className="w-4 h-4 text-emerald-400" />
            <span>Scan Barcode</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCetakDefaultAssetId(undefined);
              setIsCetakOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Label</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            title="Ekspor ke format Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Unit Aset
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {kpiStats.totalItems}{' '}
              <span className="text-xs font-normal text-slate-500">Unit</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Dari {inventarisMadinList.length} jenis item terdaftar
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Kondisi Baik & Layak
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
              {kpiStats.baikCount}{' '}
              <span className="text-xs font-normal text-slate-500">Unit</span>
            </h3>
            <p className="text-[10px] text-emerald-800 font-semibold mt-0.5">
              {kpiStats.totalItems > 0
                ? `${Math.round((kpiStats.baikCount / kpiStats.totalItems) * 100)}% Siap Digunakan`
                : '100%'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Perlu Servis / Rusak
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
              {kpiStats.rusakCount}{' '}
              <span className="text-xs font-normal text-slate-500">Unit</span>
            </h3>
            <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
              Butuh tindakan perbaikan
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Valuasi Aset
            </p>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
              Rp {kpiStats.totalValuasi.toLocaleString('id-ID')}
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Estimasi perolehan dana</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Dynamic Location Tabs (Kantor Madin Pusat, GP, Putri, Blok 4, Blok 11, dst.) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTempatTab('ALL')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
            activeTempatTab === 'ALL'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/60 font-extrabold'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Semua Lokasi ({inventarisMadinList.length})</span>
        </button>

        {tempatList.map((tempat) => {
          const count = inventarisMadinList.filter((i) => i.tempatId === tempat.id).length;
          const isActive = activeTempatTab === tempat.id;
          return (
            <button
              key={tempat.id}
              type="button"
              onClick={() => setActiveTempatTab(tempat.id)}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
                isActive
                  ? 'border-emerald-700 text-emerald-800 bg-emerald-50/60 font-extrabold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                {tempat.kode}
              </span>
              <span>{tempat.nama}</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setIsManageTempatOpen(true)}
          className="px-3 py-1.5 my-1 text-xs font-bold text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-xl transition-colors whitespace-nowrap inline-flex items-center gap-1 ml-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Lokasi...</span>
        </button>
      </div>

      {/* 4. Filters & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama barang, nomor barcode (MBD-AST...), atau spesifikasi..."
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Kategori */}
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="ELEKTRONIK_IT">Elektronik & IT</option>
            <option value="MEBELER_KANTOR">Mebeler & Kantor</option>
            <option value="PERLENGKAPAN_RUANG">Perlengkapan Ruangan</option>
            <option value="KITAB_DOKUMEN_MASTER">Kitab & Dokumen Master</option>
            <option value="KENDARAAN">Kendaraan & Logistik</option>
            <option value="LAINNYA">Lainnya</option>
          </select>

          {/* Filter Kondisi */}
          <select
            value={filterKondisi}
            onChange={(e) => setFilterKondisi(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
          >
            <option value="ALL">Semua Kondisi</option>
            <option value="BAIK">Baik & Layak</option>
            <option value="RUSAK_RINGAN">Rusak Ringan</option>
            <option value="RUSAK_BERAT">Rusak Berat</option>
          </select>
        </div>
      </div>

      {/* 5. Interactive Asset Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Barcode / Kode</th>
                <th className="py-3.5 px-4">Nama Barang & Spesifikasi</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Tempat / Lokasi</th>
                <th className="py-3.5 px-4 text-center">Kondisi</th>
                <th className="py-3.5 px-4 text-center">Jml</th>
                <th className="py-3.5 px-4">Perolehan</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-xs text-slate-600">
                      Tidak ada barang inventaris yang sesuai kriteria
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coba ganti filter tab tempat atau tambahkan inventaris baru
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((item, idx) => {
                  const place = tempatList.find((t) => t.id === item.tempatId);
                  const kategoriMeta = KATEGORI_INVENTARIS_MADIN_META[item.kategori];
                  const kondisiMeta = KONDISI_SAPRAS_META[item.kondisi];

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-4 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>

                      {/* Barcode Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setCetakDefaultAssetId(item.id);
                            setIsCetakOpen(true);
                          }}
                          className="font-mono font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors"
                          title="Klik untuk cetak label barcode aset ini"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{item.kodeBarcode}</span>
                        </button>
                      </td>

                      {/* Nama & Spesifikasi */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 leading-snug">
                          {item.namaBarang}
                        </div>
                        {item.spesifikasi && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.spesifikasi}
                          </p>
                        )}
                        {item.riwayatMutasi && item.riwayatMutasi.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-700">
                            <History className="w-3 h-3" />
                            <span>Pernah dimutasi {item.riwayatMutasi.length}x</span>
                          </div>
                        )}
                      </td>

                      {/* Kategori */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${kategoriMeta?.badgeClass}`}
                        >
                          {kategoriMeta?.label || item.kategori}
                        </span>
                      </td>

                      {/* Lokasi Kantor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>{place?.nama || item.tempatId}</span>
                        </div>
                        {place?.penanggungJawab && (
                          <span className="text-[10px] text-slate-400 block ml-5">
                            PIC: {place.penanggungJawab}
                          </span>
                        )}
                      </td>

                      {/* Kondisi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${kondisiMeta?.badgeClass}`}
                        >
                          {kondisiMeta?.shortLabel || item.kondisi}
                        </span>
                      </td>

                      {/* Jumlah & Satuan */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-bold text-slate-800">
                        {item.jumlah}{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          {item.satuan}
                        </span>
                      </td>

                      {/* Perolehan (Tahun & Nilai) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">
                          {item.nilaiPerolehan ? (
                            `Rp ${item.nilaiPerolehan.toLocaleString('id-ID')}`
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.tahunPerolehan ? `Th. ${item.tahunPerolehan}` : ''}{' '}
                          {item.sumberDana ? `(${item.sumberDana})` : ''}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Mutasi Tempat */}
                          <button
                            type="button"
                            onClick={() => handleOpenMutasi(item)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Pindahkan / Mutasi Aset ke Kantor Lain"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Aset */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditAsset(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Edit Data Aset"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Cetak Label Satuan */}
                          <button
                            type="button"
                            onClick={() => {
                              setCetakDefaultAssetId(item.id);
                              setIsCetakOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-50 transition-colors"
                            title="Cetak Stiker Barcode"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Hapus Aset */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Yakin ingin menghapus aset "${item.namaBarang}"?`)) {
                                await deleteInventarisMadin(item.id);
                                showToast(`Aset "${item.namaBarang}" telah dihapus.`);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Hapus Aset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODAL TAMBAH / EDIT ASET ==================== */}
      {isAddEditAssetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingAsset ? 'Edit Data Aset Madin' : 'Tambah Aset Inventaris Madin'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditAssetOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Nama Barang */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Barang / Aset <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formNamaBarang}
                  onChange={(e) => setFormNamaBarang(e.target.value)}
                  placeholder="Contoh: Printer Epson EcoTank L3210 (Cetak Ijazah)"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Kategori & Lokasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Aset <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => {
                      const nextKat = e.target.value as KategoriInventarisMadin;
                      setFormKategori(nextKat);
                      if (!editingAsset) {
                        const prefix = KATEGORI_INVENTARIS_MADIN_META[nextKat].prefixBarcode;
                        const seq = String(inventarisMadinList.length + 1).padStart(3, '0');
                        setFormKodeBarcode(`MBD-AST-${prefix}-${seq}`);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="ELEKTRONIK_IT">Elektronik & IT</option>
                    <option value="MEBELER_KANTOR">Mebeler & Kantor</option>
                    <option value="PERLENGKAPAN_RUANG">Perlengkapan Ruangan</option>
                    <option value="KITAB_DOKUMEN_MASTER">Kitab & Dokumen Master</option>
                    <option value="KENDARAAN">Kendaraan & Logistik</option>
                    <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi Kantor / Penempatan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTempatId}
                    onChange={(e) => setFormTempatId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {tempatList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama} ({t.kode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barcode & Spesifikasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Barcode Aset <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formKodeBarcode}
                    onChange={(e) => setFormKodeBarcode(e.target.value.toUpperCase())}
                    placeholder="MBD-AST-ELK-001"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kondisi Aset <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formKondisi}
                    onChange={(e) => setFormKondisi(e.target.value as KondisiSapras)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="BAIK">Baik & Layak</option>
                    <option value="RUSAK_RINGAN">Rusak Ringan</option>
                    <option value="RUSAK_BERAT">Rusak Berat</option>
                  </select>
                </div>
              </div>

              {/* Jumlah & Satuan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Barang
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formJumlah}
                    onChange={(e) => setFormJumlah(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={formSatuan}
                    onChange={(e) => setFormSatuan(e.target.value)}
                    placeholder="Unit / Pcs / Set"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Nilai & Sumber Dana */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tahun Perolehan
                  </label>
                  <input
                    type="number"
                    value={formTahun}
                    onChange={(e) => setFormTahun(parseInt(e.target.value) || new Date().getFullYear())}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sumber Dana
                  </label>
                  <input
                    type="text"
                    value={formSumberDana}
                    onChange={(e) => setFormSumberDana(e.target.value)}
                    placeholder="Kas Madin / Wakaf Alumni"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nilai Perolehan (Rp)
                  </label>
                  <input
                    type="number"
                    value={formNilai}
                    onChange={(e) => setFormNilai(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Spesifikasi & Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Spesifikasi Teknis / Catatan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={formSpesifikasi}
                  onChange={(e) => setFormSpesifikasi(e.target.value)}
                  placeholder="Keterangan merk, model, daya, nomor seri, letak lemari/meja..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditAssetOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition-colors shadow-xs"
                >
                  {editingAsset ? 'Simpan Perubahan' : 'Tambahkan Aset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL MUTASI ASET ==================== */}
      {isMutasiOpen && mutatingAsset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Mutasi / Pindah Tempat Aset
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Pindahkan kepemilikan atau peminjaman inventaris antar kantor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMutasiOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMutasi} className="p-6 space-y-4">
              {/* Asset Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {mutatingAsset.kodeBarcode}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {mutatingAsset.jumlah} {mutatingAsset.satuan}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mt-1">
                  {mutatingAsset.namaBarang}
                </h4>
                <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>
                    Lokasi Asal Saat Ini:{' '}
                    <strong>
                      {tempatList.find((t) => t.id === mutatingAsset.tempatId)?.nama}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Kantor Tujuan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pindahkan ke Kantor / Posko Tujuan <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={mutasiKeTempatId}
                  onChange={(e) => setMutasiKeTempatId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                >
                  {tempatList
                    .filter((t) => t.id !== mutatingAsset.tempatId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama} ({t.kode})
                      </option>
                    ))}
                </select>
              </div>

              {/* Petugas Pemindah */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Petugas Pemindah / Peminjam <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mutasiPetugas}
                  onChange={(e) => setMutasiPetugas(e.target.value)}
                  placeholder="Nama asatidz / pengurus yang bertanggung jawab"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Alasan Mutasi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Pemindahan / Keperluan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={mutasiAlasan}
                  onChange={(e) => setMutasiAlasan(e.target.value)}
                  placeholder="Contoh: Dipinjam untuk keperluan pendaftaran santri baru atau pelaksanaan ujian semester"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Riwayat Mutasi Sebelumnya */}
              {mutatingAsset.riwayatMutasi && mutatingAsset.riwayatMutasi.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    Histori Pemindahan Sebelumnya:
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-[11px] text-slate-600">
                    {mutatingAsset.riwayatMutasi.map((m) => {
                      const asal = tempatList.find((t) => t.id === m.dariTempatId)?.kode || m.dariTempatId;
                      const tujuan = tempatList.find((t) => t.id === m.keTempatId)?.kode || m.keTempatId;
                      return (
                        <div key={m.id} className="p-1.5 rounded bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <span>{asal} ➔ {tujuan} ({m.petugasPemindah})</span>
                          <span className="text-[10px] text-slate-400">{m.tanggal.slice(0, 10)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMutasiOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs inline-flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Konfirmasi Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL PENGATURAN TEMPAT DINAMIS ==================== */}
      {isManageTempatOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Pengaturan Tempat & Lokasi Inventaris
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kelola daftar kantor madin, posko asrama, PIC penanggung jawab, serta cetak Smart Room Tag
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Tutup modal kelola lokasi"
                data-testid="btn-close-manage-tempat"
                onClick={() => {
                  setIsManageTempatOpen(false);
                  setEditingTempatId(null);
                  setTempatFeedback(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {tempatFeedback && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{tempatFeedback}</span>
                </div>
              )}

              {/* Form Tambah / Edit Tempat */}
              <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-4">
                <h4 className="text-xs font-extrabold text-purple-900 mb-2 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  {editingTempatId ? 'Edit Lokasi' : 'Tambah Tempat / Kantor Baru'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Tempat <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTempatNama}
                      onChange={(e) => setNewTempatNama(e.target.value)}
                      placeholder="Contoh: Kantor Madin Asrama Tahfidz"
                      className="w-full bg-white border border-purple-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kode Singkat Ruang <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTempatKode}
                      onChange={(e) => setNewTempatKode(e.target.value.toUpperCase())}
                      placeholder="Contoh: KMT / KM-04"
                      className="w-full bg-white border border-purple-200 text-slate-800 font-mono text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Penanggung Jawab (PIC)
                    </label>
                    <input
                      type="text"
                      value={newTempatPIC}
                      onChange={(e) => setNewTempatPIC(e.target.value)}
                      placeholder="Contoh: Ust. Fathur Rahman"
                      className="w-full bg-white border border-purple-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      No. Kontak / WA PIC
                    </label>
                    <input
                      type="text"
                      value={newTempatKontak}
                      onChange={(e) => setNewTempatKontak(e.target.value)}
                      placeholder="08123456789"
                      className="w-full bg-white border border-purple-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Keterangan Letak Fisik / Blok
                  </label>
                  <input
                    type="text"
                    value={newTempatKet}
                    onChange={(e) => setNewTempatKet(e.target.value)}
                    placeholder="Contoh: Lantai 2 Gedung Timur Dekat Aula"
                    className="w-full bg-white border border-purple-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="mt-3 flex items-center justify-end gap-2">
                  {editingTempatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTempatId(null);
                        setNewTempatNama('');
                        setNewTempatKode('');
                        setNewTempatPIC('');
                        setNewTempatKontak('');
                        setNewTempatKet('');
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100"
                    >
                      Batal Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newTempatNama.trim()) {
                        setTempatFeedback('Nama tempat wajib diisi.');
                        return;
                      }
                      if (editingTempatId) {
                        await updateTempatLokasi(editingTempatId, {
                          nama: newTempatNama.trim(),
                          kode: newTempatKode.trim().toUpperCase(),
                          penanggungJawab: newTempatPIC.trim() || undefined,
                          kontakPIC: newTempatKontak.trim() || undefined,
                          keterangan: newTempatKet.trim() || undefined,
                        });
                        showToast(`Lokasi "${newTempatNama}" berhasil diperbarui.`);
                        setEditingTempatId(null);
                      } else {
                        await addTempatLokasi({
                          nama: newTempatNama.trim(),
                          kode: newTempatKode.trim().toUpperCase(),
                          penanggungJawab: newTempatPIC.trim() || undefined,
                          kontakPIC: newTempatKontak.trim() || undefined,
                          keterangan: newTempatKet.trim() || undefined,
                        });
                        showToast(`Lokasi baru "${newTempatNama}" berhasil ditambahkan.`);
                      }
                      setNewTempatNama('');
                      setNewTempatKode('');
                      setNewTempatPIC('');
                      setNewTempatKontak('');
                      setNewTempatKet('');
                      setTempatFeedback(null);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    {editingTempatId ? 'Simpan Perubahan' : 'Tambahkan Lokasi'}
                  </button>
                </div>
              </div>

              {/* Daftar Tempat Saat Ini */}
              <div>
                <h4 className="text-xs font-extrabold text-slate-800 mb-2">
                  Daftar Lokasi Terdaftar ({tempatList.length})
                </h4>
                <div className="space-y-2">
                  {tempatList.map((tempat) => {
                    const count = inventarisMadinList.filter((i) => i.tempatId === tempat.id).length;
                    return (
                      <div
                        key={tempat.id}
                        className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-xs font-extrabold px-2 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                            {tempat.kode}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-extrabold text-slate-900">
                                {tempat.nama}
                              </h5>
                              {tempat.isDefault && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-semibold">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {tempat.keterangan || 'Gedung Madrasah Diniyyah'}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                              {tempat.penanggungJawab && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  PIC: {tempat.penanggungJawab}
                                </span>
                              )}
                              {tempat.kontakPIC && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {tempat.kontakPIC}
                                </span>
                              )}
                              <span className="font-bold text-emerald-800">
                                {count} Aset Terdaftar
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions per tempat */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsManageTempatOpen(false);
                              setIsCetakOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-50 transition-colors"
                            title="Cetak Smart Room Tag (QR Pintu)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTempatId(tempat.id);
                              setNewTempatNama(tempat.nama);
                              setNewTempatKode(tempat.kode);
                              setNewTempatPIC(tempat.penanggungJawab || '');
                              setNewTempatKontak(tempat.kontakPIC || '');
                              setNewTempatKet(tempat.keterangan || '');
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Edit Data Lokasi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Yakin ingin menghapus lokasi "${tempat.nama}"?`)) {
                                const res = await deleteTempatLokasi(tempat.id);
                                if (!res.success) {
                                  setTempatFeedback(res.message || 'Gagal menghapus tempat.');
                                } else {
                                  showToast(`Lokasi "${tempat.nama}" berhasil dihapus.`);
                                  setTempatFeedback(null);
                                }
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Hapus Lokasi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL SCANNER BARCODE ==================== */}
      <ModalBarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectAsset={(asset) => {
          handleOpenEditAsset(asset);
        }}
        onSelectTempat={(tempat) => {
          setActiveTempatTab(tempat.id);
          showToast(`Menampilkan inventaris di ${tempat.nama}`);
        }}
        onOpenMutasi={(asset) => {
          handleOpenMutasi(asset);
        }}
      />

      {/* ==================== MODAL CETAK LABEL ==================== */}
      <ModalCetakLabelSapras
        isOpen={isCetakOpen}
        onClose={() => {
          setIsCetakOpen(false);
          setCetakDefaultAssetId(undefined);
        }}
        defaultSelectedAssetId={cetakDefaultAssetId}
        defaultTempatId={activeTempatTab !== 'ALL' ? activeTempatTab : undefined}
      />
    </div>
  );
}
