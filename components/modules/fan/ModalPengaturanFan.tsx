'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFanStore } from '@/stores/useFanStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import {
  getDaftarKelasUnikDariMaster,
  getDaftarKelasUnggulan,
} from '@/lib/utils/fanHelper';
import { FanConfigMap } from '@/types/fan';
import { BookOpen, Star, Info, Save } from 'lucide-react';

export default function ModalPengaturanFan() {
  const { isModalConfigOpen, closeModalConfig, fanConfig, saveFanConfig } = useFanStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [formInputs, setFormInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isModalConfigOpen) {
      if (formasiList.length === 0) fetchFormasi();
      if (asatidzList.length === 0) fetchAsatidz();

      // Inisialisasi input dari fanConfig
      const initial: Record<string, string> = {};
      Object.entries(fanConfig).forEach(([key, items]) => {
        initial[key] = Array.isArray(items) ? items.join(', ') : String(items || '');
      });
      setFormInputs(initial);
    }
  }, [isModalConfigOpen, formasiList.length, asatidzList.length, fanConfig, fetchFormasi, fetchAsatidz]);

  const listMasterReguler = getDaftarKelasUnikDariMaster(formasiList, asatidzList);
  const listUnggulanNama = getDaftarKelasUnggulan(formasiList);

  const handleInputChange = (key: string, value: string) => {
    setFormInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newConfig: FanConfigMap = {};
    const renderedKeys: string[] = [];

    // Parse reguler classes
    listMasterReguler.forEach((item) => {
      const key = `${item.kls} ${item.tingkat}`;
      renderedKeys.push(key);
      const rawVal = formInputs[key] || '';
      const items = rawVal
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length > 0) newConfig[key] = items;
    });

    // Parse unggulan classes
    listUnggulanNama.forEach((klsUg) => {
      const keyUg = `${klsUg} (Ug)`;
      renderedKeys.push(keyUg);
      const rawVal = formInputs[keyUg] || '';
      const items = rawVal
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.length > 0) newConfig[keyUg] = items;
    });

    // Pertahankan konfigurasi lain yang mungkin tidak ter-render saat ini
    Object.keys(fanConfig).forEach((k) => {
      if (!renderedKeys.includes(k) && fanConfig[k]) {
        newConfig[k] = fanConfig[k];
      }
    });

    const success = await saveFanConfig(newConfig);
    setIsSubmitting(false);

    if (success) {
      closeModalConfig();
    } else {
      alert('Gagal menyimpan konfigurasi fan.');
    }
  };

  return (
    <Dialog
      isOpen={isModalConfigOpen}
      onClose={closeModalConfig}
      title="Pengaturan Item Fan (Mata Pelajaran)"
      maxWidth="2xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Info Alert */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-madin-600 flex-shrink-0 mt-0.5" />
          <div>
            Pisahkan setiap nama Fan / Mata Pelajaran dengan <b>tanda koma (,)</b>.<br />
            <span className="text-slate-500">
              Contoh format: <b>(Fiqih) Mabadi Fiqih Juz I, (Tajwid) Hidayatush Shibyan</b>.
              Daftar kelas di bawah otomatis menyesuaikan Tingkat &amp; Din. Kls dari master data Formasi &amp; Asatidz.
            </span>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-1">
          {/* 1. Bagian Kelas Reguler */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-emerald-200 text-emerald-800 font-bold text-sm">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>1. Fan Kelas Reguler (Tingkat Umum)</span>
            </div>

            {listMasterReguler.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Belum ada master data kelas reguler terdaftar.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 mt-3">
                {listMasterReguler.map((item) => {
                  const key = `${item.kls} ${item.tingkat}`;
                  return (
                    <div key={key}>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        {key}
                      </label>
                      <input
                        type="text"
                        value={formInputs[key] || ''}
                        onChange={(e) => handleInputChange(key, e.target.value)}
                        placeholder="Contoh: (Fiqih) Mabadi Fiqih Juz I II III, (Tajwid) Panduan Tajwid"
                        className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 shadow-xs"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Sub Pengaturan Khusus Kelas Unggulan (Ug) */}
          <div className="pt-2">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex justify-between items-center mb-3">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>2. Sub Pengaturan Fan Khusus Kelas Unggulan (Ug)</span>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2 py-0.5 rounded-full">
                {listUnggulanNama.length} Kelas Terdaftar
              </span>
            </div>

            {listUnggulanNama.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                Belum ada kelas yang dilabeli Unggulan.<br />
                <span className="italic text-[11px] text-slate-400">
                  *Centang opsi &quot;Kelas Unggulan&quot; pada menu Formasi Kelas untuk menetapkan Kelas Unggulan.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {listUnggulanNama.sort().map((klsUg) => {
                  const keyUg = `${klsUg} (Ug)`;
                  return (
                    <div key={keyUg}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{keyUg}</span>
                        </label>
                        <span className="text-[10px] text-slate-400 italic">Item Fan Khusus Unggulan</span>
                      </div>
                      <input
                        type="text"
                        value={formInputs[keyUg] || ''}
                        onChange={(e) => handleInputChange(keyUg, e.target.value)}
                        placeholder="Contoh: (Nahwu) Imrithi, (Shorof) Kaylani (Pisahkan dengan koma)"
                        className="w-full text-xs py-2 px-3 rounded-lg border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-xs"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={closeModalConfig}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
