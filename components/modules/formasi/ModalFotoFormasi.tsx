'use client';

import React, { useRef, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { compressImageFile } from '@/lib/utils/image';
import { Camera, Trash2, RefreshCw } from 'lucide-react';

export default function ModalFotoFormasi() {
  const { isFotoModalOpen, closeFotoModal, fotoModalData, quickUploadFoto, deleteFoto } =
    useFormasiStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!fotoModalData) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file berupa gambar (JPG/PNG/WEBP).');
      return;
    }

    setIsProcessing(true);
    try {
      const base64 = await compressImageFile(file, 800, 0.75);
      const success = await quickUploadFoto(fotoModalData.id, fotoModalData.jenis, base64);
      if (success) {
        closeFotoModal();
      }
    } catch (err) {
      alert('Gagal memproses foto: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus foto ${fotoModalData.jenis === 'takror' ? 'Lokal Takror' : 'Lokasi Diniyyah'} ini?`)) {
      return;
    }
    setIsProcessing(true);
    const success = await deleteFoto(fotoModalData.id, fotoModalData.jenis);
    setIsProcessing(false);
    if (success) {
      closeFotoModal();
    }
  };

  return (
    <Dialog
      isOpen={isFotoModalOpen}
      onClose={closeFotoModal}
      title={`${fotoModalData.jenis === 'takror' ? 'Lokal Takror' : 'Lokasi Diniyyah'} - ${fotoModalData.namaKelas}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {fotoModalData.label && (
          <p className="text-sm font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {fotoModalData.label}
          </p>
        )}

        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center min-h-[260px] max-h-[480px]">
          {fotoModalData.url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={fotoModalData.url}
              alt={fotoModalData.label}
              className="max-h-[460px] w-auto object-contain"
            />
          ) : (
            <div className="text-center p-8 text-slate-400">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada foto yang diunggah.</p>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div>
            {fotoModalData.url && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Foto</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeFotoModal}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            >
              Tutup
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-xs transition disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>{fotoModalData.url ? 'Ganti Foto' : 'Unggah Foto'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
