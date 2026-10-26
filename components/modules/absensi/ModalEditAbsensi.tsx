'use client';

import React, { useState, useEffect } from 'react';
import { Edit3, X, Save } from 'lucide-react';
import { RiwayatAbsensiItem, StatusAbsensi } from '@/types/absensi';
import { Asatidz } from '@/types/asatidz';

interface ModalEditAbsensiProps {
  isOpen: boolean;
  onClose: () => void;
  record: RiwayatAbsensiItem | null;
  asatidzList: Asatidz[];
  onSave: (
    id: string,
    updates: {
      status: StatusAbsensi;
      menitTerlambat?: string;
      namaPengganti?: string;
      keterangan?: string;
    }
  ) => Promise<boolean>;
}

const STATUS_OPTIONS: Array<{ value: StatusAbsensi; label: string }> = [
  { value: 'Hadir', label: 'Hadir' },
  { value: 'Izin', label: 'Izin' },
  { value: 'Sakit', label: 'Sakit' },
  { value: 'Alfa', label: 'Alfa' },
  { value: 'Terlambat', label: 'Terlambat' },
  { value: 'Digantikan', label: 'Digantikan (Badal)' },
  { value: 'Tugas Lain', label: 'Tugas Lain' },
  { value: 'Jadwal Kosong', label: 'Jadwal Kosong' },
];

export default function ModalEditAbsensi({
  isOpen,
  onClose,
  record,
  asatidzList,
  onSave,
}: ModalEditAbsensiProps) {
  const [status, setStatus] = useState<StatusAbsensi>('Hadir');
  const [menitTerlambat, setMenitTerlambat] = useState<string>('');
  const [namaPengganti, setNamaPengganti] = useState<string>('');
  const [keterangan, setKeterangan] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setStatus(record.status || 'Hadir');
      setMenitTerlambat(record.menitTerlambat || '');
      setNamaPengganti(record.namaPengganti || '');
      setKeterangan(record.keterangan || '');
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const showMenit = status === 'Terlambat';
  const showPengganti = ['Digantikan', 'Badal', 'Izin', 'Sakit'].includes(status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSave(record.id, {
      status,
      menitTerlambat: showMenit ? menitTerlambat : '',
      namaPengganti: showPengganti ? namaPengganti : '',
      keterangan: keterangan.trim(),
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-50 border-b border-emerald-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Edit Rekaman Absensi
              </h3>
              <p className="text-[11px] text-emerald-800 font-medium">
                Perbarui status kehadiran pada riwayat tersimpan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Info Ringkas Sesi */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs">
            <div className="font-bold text-slate-800 text-sm">{record.nama}</div>
            <div className="text-slate-500">
              Tanggal: <strong className="text-slate-700">{record.hari}, {record.tanggal}</strong> ({record.jamKe})
            </div>
            <div className="text-slate-500">
              Kelas: <strong className="text-emerald-700">{record.kelasMengajar}</strong> • Fan: <strong className="text-slate-700">{record.fan}</strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Status Kehadiran
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusAbsensi)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {showMenit && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jumlah Menit Terlambat
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={menitTerlambat}
                onChange={(e) => setMenitTerlambat(e.target.value)}
                placeholder="Contoh: 15"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {showPengganti && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nama Asatidz Pengganti (Badal)
              </label>
              <input
                type="text"
                list="datalist-edit-absensi-asatidz"
                value={namaPengganti}
                onChange={(e) => setNamaPengganti(e.target.value)}
                placeholder="Ketik atau pilih nama guru pengganti..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="datalist-edit-absensi-asatidz">
                {asatidzList.map((a) => (
                  <option key={a.nia} value={a.nama_asatidz} />
                ))}
              </datalist>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Keterangan Tambahan
            </label>
            <textarea
              rows={2}
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Catatan atau alasan tambahan..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
