'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFanStore } from '@/stores/useFanStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { parseFanItemString } from '@/lib/utils/fanHelper';
import { Info, UserCheck } from 'lucide-react';

export default function ModalAturFanMS() {
  const {
    isModalAturFanMSOpen,
    closeModalAturFanMS,
    fanConfig,
    fanDetail,
    applyBatchFanMS,
  } = useFanStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [tingkat, setTingkat] = useState('ULA');
  const [dinKls, setDinKls] = useState('1');
  const [checkedFans, setCheckedFans] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isModalAturFanMSOpen) {
      if (formasiList.length === 0) fetchFormasi();
      if (asatidzList.length === 0) fetchAsatidz();
    }
  }, [isModalAturFanMSOpen, formasiList.length, asatidzList.length, fetchFormasi, fetchAsatidz]);

  const keyReguler = `${dinKls} ${tingkat}`;
  const items = useMemo(() => {
    return fanConfig[keyReguler] || [];
  }, [fanConfig, keyReguler]);

  // Update checklist based on current detail in store
  useEffect(() => {
    if (!isModalAturFanMSOpen) return;

    const initialChecked: string[] = [];
    const itemDetails = fanDetail.item || {};

    items.forEach((rawItem) => {
      const itemKey = `${keyReguler}||${rawItem}`;
      const det = itemDetails[itemKey];
      if (det && det.pengajar === 'MS') {
        initialChecked.push(rawItem);
      }
    });

    setCheckedFans(initialChecked);
  }, [isModalAturFanMSOpen, keyReguler, items, fanDetail]);

  const handleToggleFan = (rawItem: string) => {
    setCheckedFans((prev) =>
      prev.includes(rawItem) ? prev.filter((i) => i !== rawItem) : [...prev, rawItem]
    );
  };

  const handleSave = async () => {
    if (checkedFans.length === 0) {
      alert('Pilih minimal satu Fan untuk dijadikan Fan khusus MS.');
      return;
    }

    setIsSubmitting(true);
    const success = await applyBatchFanMS(
      tingkat,
      dinKls,
      checkedFans,
      asatidzList,
      formasiList
    );
    setIsSubmitting(false);

    if (success) {
      alert(`Fan khusus MS untuk ${dinKls} ${tingkat} berhasil diterapkan ke semua bagian/lokal kelas.`);
      closeModalAturFanMS();
    } else {
      alert('Gagal menerapkan pengaturan Fan MS.');
    }
  };

  return (
    <Dialog
      isOpen={isModalAturFanMSOpen}
      onClose={closeModalAturFanMS}
      title="Atur Fan Khusus MS (Mustahiq)"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Info Alert */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-madin-600 flex-shrink-0 mt-0.5" />
          <div>
            Pilih <b>Tingkat</b> dan <b>Din. Kls</b>, lalu centang Fan yang <b>WAJIB diajar oleh MS (Mustahiq)</b>.
            Pengaturan ini otomatis diterapkan ke <b>SEMUA Din. Bag</b> (bagian/lokal kelas: A, B, C, dst.) pada jenjang &amp; tingkat tersebut.
          </div>
        </div>

        {/* 1. Tingkat & 2. Din Kls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              1. Tingkat
            </label>
            <select
              value={tingkat}
              onChange={(e) => setTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 font-semibold"
            >
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Din. Kls
            </label>
            <select
              value={dinKls}
              onChange={(e) => setDinKls(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 font-semibold"
            >
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
            </select>
          </div>
        </div>

        {/* 3. Checklist Fan */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="p-2.5 px-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">
              3. Pilih Fan yang Wajib Diajar MS
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {checkedFans.length} Fan Dipilih
            </span>
          </div>

          <div className="max-h-[280px] overflow-y-auto p-2 divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Belum ada item Fan untuk kelas <b>{keyReguler}</b>.<br />
                <span className="italic text-[11px]">
                  Silakan atur terlebih dahulu melalui tombol &quot;Atur Item Fan&quot;.
                </span>
              </div>
            ) : (
              items.map((rawItem, idx) => {
                const parsed = parseFanItemString(rawItem);
                const isChecked = checkedFans.includes(rawItem);
                return (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 py-2 px-2.5 rounded-lg cursor-pointer transition-colors ${
                      isChecked ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleFan(rawItem)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-emerald-700">{parsed.fan}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-slate-700 font-medium">{parsed.mapel}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic">
          *Fan yang sudah tercentang berarti statusnya <b>MS</b> di SEMUA bagian kelas pada kombinasi Tingkat + Kelas ini.
        </p>

        {/* Modal Footer */}
        <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={closeModalAturFanMS}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || items.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Menerapkan...' : 'Simpan & Terapkan ke Semua Bagian'}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
