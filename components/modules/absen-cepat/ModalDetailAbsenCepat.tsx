'use client';

import React, { useState, useEffect } from 'react';
import { UserCheck, X, Check } from 'lucide-react';
import {
  SesiJadwalHarian,
  StatusAbsensi,
  StatusSesiData,
} from '@/types/absensi';
import { Asatidz } from '@/types/asatidz';
import { formatLabelBlokHariKBM } from '@/lib/utils/jadwalHelper';

interface ModalDetailAbsenCepatProps {
  isOpen: boolean;
  onClose: () => void;
  sesi: SesiJadwalHarian | null;
  statusData: StatusSesiData | null;
  asatidzList: Asatidz[];
  onApply: (
    sesi: SesiJadwalHarian,
    updates: Partial<StatusSesiData>
  ) => void;
}

const PILIHAN_STATUS: Array<{
  value: StatusAbsensi;
  label: string;
  activeClass: string;
}> = [
  {
    value: 'Hadir',
    label: '✓ Hadir',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
  },
  {
    value: 'Izin',
    label: 'Izin',
    activeClass: 'bg-sky-600 text-white border-sky-600 shadow-sm',
  },
  {
    value: 'Sakit',
    label: 'Sakit',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-sm',
  },
  {
    value: 'Alfa',
    label: 'Alfa',
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-sm',
  },
  {
    value: 'Terlambat',
    label: 'Terlambat',
    activeClass: 'bg-orange-500 text-white border-orange-500 shadow-sm',
  },
  {
    value: 'Digantikan',
    label: 'Digantikan',
    activeClass: 'bg-purple-600 text-white border-purple-600 shadow-sm',
  },
];

export default function ModalDetailAbsenCepat({
  isOpen,
  onClose,
  sesi,
  statusData,
  asatidzList,
  onApply,
}: ModalDetailAbsenCepatProps) {
  const [status, setStatus] = useState<StatusAbsensi>('Hadir');
  const [menitTerlambat, setMenitTerlambat] = useState<string>('');
  const [namaPengganti, setNamaPengganti] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');

  useEffect(() => {
    if (statusData) {
      setStatus((statusData.status || 'Hadir') as StatusAbsensi);
      setMenitTerlambat(statusData.menitTerlambat || '');
      setNamaPengganti(statusData.namaPengganti || '');
      setKeterangan(statusData.keterangan || '');
    }
  }, [statusData, sesi, isOpen]);

  if (!isOpen || !sesi) return null;

  const showMenit = status === 'Terlambat';
  const showPengganti = ['Digantikan', 'Badal', 'Izin', 'Sakit'].includes(status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(sesi, {
      status,
      menitTerlambat: showMenit ? menitTerlambat : '',
      namaPengganti: showPengganti ? namaPengganti : '',
      keterangan: keterangan.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Detail & Status Sesi Mengajar</h3>
              <p className="text-[11px] text-emerald-100">
                {sesi.jamKe} • {formatLabelBlokHariKBM(sesi.blok)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Ringkasan Sesi */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-800">{sesi.nama}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  NIA: {sesi.nia} • {sesi.jah || 'Asatidz'}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold text-xs shadow-sm">
                {sesi.kelasMengajar}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
              <div>
                <span className="text-slate-400 block">Fan / Mapel:</span>
                <strong className="text-slate-700">{sesi.fan}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Lokasi / Ruang:</span>
                <strong className="text-slate-700">{sesi.lokasi}</strong>
              </div>
            </div>
          </div>

          {/* Pilihan Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Pilih Status Kehadiran
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PILIHAN_STATUS.map((item) => {
                const isSelected = status === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatus(item.value)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                      isSelected
                        ? item.activeClass
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {showMenit && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jumlah Menit Terlambat
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={menitTerlambat}
                onChange={(e) => setMenitTerlambat(e.target.value)}
                placeholder="Contoh: 15"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {showPengganti && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Asatidz Pengganti (Badal)
              </label>
              <input
                type="text"
                list="datalist-absen-cepat-badal"
                value={namaPengganti}
                onChange={(e) => setNamaPengganti(e.target.value)}
                placeholder="Ketik atau pilih nama guru pengganti..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="datalist-absen-cepat-badal">
                {asatidzList.map((a) => (
                  <option key={a.nia} value={a.nama_asatidz} />
                ))}
              </datalist>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Keterangan Opsional
            </label>
            <textarea
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Tambahkan catatan bila diperlukan..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Terapkan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
