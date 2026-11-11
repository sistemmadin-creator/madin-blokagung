'use client';

import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  Building2,
  Package,
  CheckSquare,
  Square,
  Filter,
  Download,
  QrCode,
  Tag,
  Layers,
} from 'lucide-react';
import { useSaprasStore } from '@/stores/useSaprasStore';
import {
  InventarisMadinItem,
  KATEGORI_INVENTARIS_MADIN_META,
  SaprasTempatLokasi,
} from '@/types/sapras';
import { generateQrSvgPath } from '@/lib/utils/qrSvgGenerator';

interface ModalCetakLabelSaprasProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTempatId?: string;
  defaultSelectedAssetId?: string;
}

type PrintMode = 'ASET' | 'PINTU_LOKASI';

export function ModalCetakLabelSapras({
  isOpen,
  onClose,
  defaultTempatId,
  defaultSelectedAssetId,
}: ModalCetakLabelSaprasProps) {
  const { inventarisMadinList, tempatList } = useSaprasStore();

  const [printMode, setPrintMode] = useState<PrintMode>('ASET');
  const [filterTempat, setFilterTempat] = useState<string>(defaultTempatId || 'ALL');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    defaultSelectedAssetId ? [defaultSelectedAssetId] : []
  );
  const [selectedTempatIds, setSelectedTempatIds] = useState<string[]>([]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return inventarisMadinList.filter((item) => {
      if (filterTempat !== 'ALL' && item.tempatId !== filterTempat) return false;
      return true;
    });
  }, [inventarisMadinList, filterTempat]);

  // Handle select all assets
  const handleSelectAllAssets = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map((a) => a.id));
    }
  };

  const handleToggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Selected Assets to print
  const assetsToPrint = useMemo(() => {
    if (selectedAssetIds.length === 0) return filteredAssets;
    return filteredAssets.filter((a) => selectedAssetIds.includes(a.id));
  }, [filteredAssets, selectedAssetIds]);

  // Selected Places to print
  const placesToPrint = useMemo(() => {
    if (selectedTempatIds.length === 0) return tempatList;
    return tempatList.filter((t) => selectedTempatIds.includes(t.id));
  }, [tempatList, selectedTempatIds]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cetak-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-cetak-title" className="text-base font-extrabold text-slate-900">
                Generator Cetak Label Barcode & QR Sapras
              </h2>
              <p className="text-xs text-slate-500">
                Format siap cetak stiker A4 atau roll thermal untuk aset institusi & smart room tag pintu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              Cetak Sekarang
            </button>
            <button
              type="button"
              aria-label="Tutup modal cetak"
              data-testid="btn-close-cetak"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPrintMode('ASET')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                printMode === 'ASET'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Stiker Barcode Aset ({assetsToPrint.length})
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('PINTU_LOKASI')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                printMode === 'PINTU_LOKASI'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              QR Pintu Kantor ({placesToPrint.length})
            </button>
          </div>

          {printMode === 'ASET' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filter Kantor:</span>
              <select
                value={filterTempat}
                onChange={(e) => setFilterTempat(e.target.value)}
                className="bg-slate-100 border border-slate-200 text-slate-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              >
                <option value="ALL">Semua Kantor ({inventarisMadinList.length})</option>
                {tempatList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSelectAllAssets}
                className="text-xs font-semibold text-emerald-800 hover:underline ml-2"
              >
                {selectedAssetIds.length === filteredAssets.length ? 'Batal Pilih' : 'Pilih Semua'}
              </button>
            </div>
          )}
        </div>

        {/* Print Preview Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70" id="print-area">
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #print-area,
              #print-area * {
                visibility: visible;
              }
              #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                padding: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          {printMode === 'ASET' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {assetsToPrint.map((item) => {
                const qrMatrix = generateQrSvgPath(item.kodeBarcode);
                const place = tempatList.find((t) => t.id === item.tempatId);
                const isSelected = selectedAssetIds.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleAsset(item.id)}
                    className={`relative bg-white border-2 rounded-2xl p-4 flex flex-col justify-between shadow-2xs cursor-pointer select-none transition-all hover:border-emerald-500 ${
                      isSelected ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-300'
                    }`}
                  >
                    {/* Header Label */}
                    <div className="border-b border-slate-200 pb-2 mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800 leading-none">
                          Madin Al-Amiriyyah
                        </p>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                          PKM. SAPRAS BLOKAGUNG
                        </p>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        {place?.kode || 'MADIN'}
                      </span>
                    </div>

                    {/* QR Code + Info Barcode */}
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 bg-white p-1 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                        <svg
                          viewBox={`0 0 ${qrMatrix.size} ${qrMatrix.size}`}
                          shapeRendering="crispEdges"
                          role="img"
                          aria-label={`QR ${item.kodeBarcode}`}
                          className="w-full h-full"
                        >
                          <rect width={qrMatrix.size} height={qrMatrix.size} fill="#ffffff" />
                          <path d={qrMatrix.path} fill="#0f172a" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-slate-900 leading-tight line-clamp-2">
                          {item.namaBarang}
                        </p>
                        <p className="text-[11px] font-mono font-black text-emerald-800 tracking-tight mt-1">
                          {item.kodeBarcode}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {place?.nama || 'Kantor Madin'}
                        </p>
                      </div>
                    </div>

                    {/* Footer Label */}
                    <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
                      <span>Kategori: {KATEGORI_INVENTARIS_MADIN_META[item.kategori]?.label || item.kategori}</span>
                      <span>{item.tahunPerolehan || '2024'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Smart Room Tag / QR Pintu Kantor */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {placesToPrint.map((tempat) => {
                const qrValue = `MBD-LOC-${tempat.kode}`;
                const qrMatrix = generateQrSvgPath(qrValue);
                const itemCount = inventarisMadinList.filter((i) => i.tempatId === tempat.id).length;

                return (
                  <div
                    key={tempat.id}
                    className="bg-white border-2 border-emerald-800 rounded-3xl p-6 flex flex-col items-center text-center shadow-md relative overflow-hidden"
                  >
                    {/* Header Pintu */}
                    <div className="w-full border-b-2 border-emerald-800 pb-3 mb-4">
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-800">
                        MADRASAH DINIYYAH AL-AMIRIYYAH
                      </p>
                      <p className="text-[11px] text-slate-600 font-semibold">
                        Pondok Pesantren Darussalam Blokagung Banyuwangi
                      </p>
                    </div>

                    {/* Badge Kantor */}
                    <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-extrabold tracking-wider uppercase mb-2">
                      SMART ROOM TAG • PKM. SAPRAS
                    </span>

                    <h3 className="text-xl font-black text-slate-900 uppercase">
                      {tempat.nama}
                    </h3>
                    <p className="text-xs font-mono font-bold text-emerald-800 mt-0.5">
                      KODE RUANGAN: {tempat.kode}
                    </p>

                    {/* QR Code Pintu Besar */}
                    <div className="my-4 w-40 h-40 bg-white p-2 rounded-2xl border-2 border-slate-900 flex items-center justify-center shadow-xs">
                      <svg
                        viewBox={`0 0 ${qrMatrix.size} ${qrMatrix.size}`}
                        shapeRendering="crispEdges"
                        role="img"
                        aria-label={`QR Pintu ${tempat.nama}`}
                        className="w-full h-full"
                      >
                        <rect width={qrMatrix.size} height={qrMatrix.size} fill="#ffffff" />
                        <path d={qrMatrix.path} fill="#0f172a" />
                      </svg>
                    </div>

                    <p className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                      {qrValue}
                    </p>

                    {/* Detail PIC & Ruang */}
                    <div className="w-full mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-left text-xs text-slate-600">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Penanggung Jawab:</span>
                        <span className="font-bold text-slate-800">{tempat.penanggungJawab || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Aset Terdaftar:</span>
                        <span className="font-bold text-emerald-800">{itemCount} Unit Barang</span>
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-400 mt-3">
                      *Pindai QR ini menggunakan kamera sistem Madin Blokagung untuk audit inventaris ruangan seketika.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
