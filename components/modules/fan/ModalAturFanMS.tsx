'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFanStore } from '@/stores/useFanStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import {
  parseFanItemString,
  getDaftarBagUnggulanTingkatKls,
  getMustahiqByScope,
} from '@/lib/utils/fanHelper';
import {
  Info,
  UserCheck,
  BookOpen,
  Star,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function ModalAturFanMS() {
  const {
    isModalAturFanMSOpen,
    closeModalAturFanMS,
    fanConfig,
    fanDetail,
    applyBatchFanMS,
    bersihkanMustahiqUnggulanDariReguler,
  } = useFanStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [tingkat, setTingkat] = useState('WUSTHO');
  const [dinKls, setDinKls] = useState('1');
  const [scope, setScope] = useState<'reguler' | 'unggulan'>('reguler');
  const [selectedBagUg, setSelectedBagUg] = useState<string>('ALL');
  const [checkedFans, setCheckedFans] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanFeedback, setCleanFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isModalAturFanMSOpen) {
      if (formasiList.length === 0) fetchFormasi();
      if (asatidzList.length === 0) fetchAsatidz();
    }
  }, [isModalAturFanMSOpen, formasiList.length, asatidzList.length, fetchFormasi, fetchAsatidz]);

  // Daftar bagian unggulan untuk kombinasi Tingkat + Din. Kls
  const daftarBagUg = useMemo(() => {
    return getDaftarBagUnggulanTingkatKls(tingkat, dinKls, formasiList);
  }, [tingkat, dinKls, formasiList]);

  // Reset selectedBagUg jika berganti tingkat/kelas
  useEffect(() => {
    if (daftarBagUg.length > 0) {
      if (selectedBagUg !== 'ALL' && !daftarBagUg.includes(selectedBagUg)) {
        setSelectedBagUg('ALL');
      }
    } else {
      setSelectedBagUg('ALL');
    }
  }, [daftarBagUg, selectedBagUg]);

  const keyReguler = `${dinKls} ${tingkat}`;

  // Tentukan kunci kelas efektif untuk membaca item konfigurasi & status detail
  const effectiveKelasKey = useMemo(() => {
    if (scope === 'reguler') {
      return keyReguler;
    }
    const keyUgUnified = `${dinKls} ${tingkat} (Ug)`;
    if (fanConfig[keyUgUnified] && fanConfig[keyUgUnified].length > 0) {
      return keyUgUnified;
    }
    // Jika scope unggulan dan dipilih spesifik
    if (selectedBagUg !== 'ALL') {
      const keySpesifik = `${dinKls} ${selectedBagUg} ${tingkat} (Ug)`;
      if (fanConfig[keySpesifik]) return keySpesifik;
    }
    // Jika 'ALL', gunakan bagian pertama unggulan atau fallback reguler
    if (daftarBagUg.length > 0) {
      const legacyKey = `${dinKls} ${daftarBagUg[0]} ${tingkat} (Ug)`;
      if (fanConfig[legacyKey]) return legacyKey;
    }
    return keyUgUnified;
  }, [scope, selectedBagUg, dinKls, tingkat, keyReguler, daftarBagUg, fanConfig]);

  // Daftar item Fan yang ditampilkan
  const items = useMemo(() => {
    if (scope === 'reguler') {
      return fanConfig[keyReguler] || [];
    }
    // Unggulan: ambil dari config unggulan, fallback ke reguler bila belum diatur khusus
    if (fanConfig[effectiveKelasKey] && fanConfig[effectiveKelasKey].length > 0) {
      return fanConfig[effectiveKelasKey];
    }
    return fanConfig[keyReguler] || [];
  }, [scope, effectiveKelasKey, keyReguler, fanConfig]);

  // Muat status centang berdasarkan detail saat ini
  useEffect(() => {
    if (!isModalAturFanMSOpen) return;

    const initialChecked: string[] = [];
    const itemDetails = fanDetail.item || {};

    items.forEach((rawItem) => {
      const itemKey = `${effectiveKelasKey}||${rawItem}`;
      const det = itemDetails[itemKey];
      if (det && det.pengajar === 'MS') {
        initialChecked.push(rawItem);
      }
    });

    setCheckedFans(initialChecked);
    setCleanFeedback(null);
  }, [isModalAturFanMSOpen, effectiveKelasKey, items, fanDetail]);

  // Daftar Mustahiq yang menjadi target penugasan
  const targetMustahiq = useMemo(() => {
    if (scope === 'reguler') {
      return getMustahiqByScope(
        { tingkat, dinKls, scope: 'reguler' },
        asatidzList,
        formasiList
      );
    }
    return getMustahiqByScope(
      { tingkat, dinKls, scope: 'unggulan', selectedBag: selectedBagUg },
      asatidzList,
      formasiList
    );
  }, [scope, tingkat, dinKls, selectedBagUg, asatidzList, formasiList]);

  // Mustahiq unggulan yang dikecualikan (khusus info tab reguler)
  const mustahiqUgDikecualikan = useMemo(() => {
    if (scope !== 'reguler') return [];
    return getMustahiqByScope(
      { tingkat, dinKls, scope: 'unggulan' },
      asatidzList,
      formasiList
    );
  }, [scope, tingkat, dinKls, asatidzList, formasiList]);

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

    if (scope === 'unggulan' && daftarBagUg.length === 0) {
      alert(`Tidak ada kelas unggulan pada ${dinKls} ${tingkat}.`);
      return;
    }

    setIsSubmitting(true);
    const success = await applyBatchFanMS(
      tingkat,
      dinKls,
      checkedFans,
      asatidzList,
      formasiList,
      scope,
      selectedBagUg
    );
    setIsSubmitting(false);

    if (success) {
      const scopeLabel =
        scope === 'reguler'
          ? `Kelas Reguler ${dinKls} ${tingkat}`
          : `Kelas Unggulan ${dinKls} ${tingkat} (${selectedBagUg === 'ALL' ? 'Semua Bagian' : selectedBagUg})`;
      alert(`Pengaturan Fan khusus MS untuk ${scopeLabel} berhasil disimpan.`);
      closeModalAturFanMS();
    } else {
      alert('Gagal menerapkan pengaturan Fan MS.');
    }
  };

  const handleBersihkanPenyusupan = async () => {
    if (!confirm('Pembersihan ini akan memeriksa seluruh data Fan Reguler dan menghapus Mustahiq Unggulan (seperti Rizqi Maulana Achmad di 1 WUSTHO) yang sebelumnya salah masuk ke Fan Reguler. Lanjutkan?')) {
      return;
    }

    setIsCleaning(true);
    const res = await bersihkanMustahiqUnggulanDariReguler(asatidzList, formasiList);
    setIsCleaning(false);

    if (res.cleanedCount > 0) {
      setCleanFeedback(
        `Berhasil membersihkan ${res.cleanedCount} item fan reguler. Nama mustahiq unggulan yang dibersihkan: ${res.affectedTeachers.join(', ')}.`
      );
    } else {
      setCleanFeedback('Data Fan Reguler sudah bersih. Tidak ditemukan mustahiq unggulan di data reguler.');
    }
  };

  return (
    <Dialog
      isOpen={isModalAturFanMSOpen}
      onClose={closeModalAturFanMS}
      title="Atur Fan Khusus MS (Mustahiq)"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Banner Penjelasan Pemisahan Scope */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Pemisahan Penugasan MS:</span> Pengaturan Fan khusus Mustahiq dipisahkan antara <b>Kelas Reguler</b> dan <b>Kelas Unggulan</b>. Mustahiq yang bertugas sebagai walikelas di kelas Unggulan otomatis hanya mengampu fan unggulan pada kelas binaannya dan tidak lagi tercampur ke daftar penugasan kelas reguler.
          </div>
        </div>

        {/* 1. Baris Pemilihan Tingkat & Din. Kls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              1. Tingkat Diniyyah
            </label>
            <select
              value={tingkat}
              onChange={(e) => setTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-semibold bg-white"
            >
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Din. Kelas
            </label>
            <select
              value={dinKls}
              onChange={(e) => setDinKls(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-semibold bg-white"
            >
              <option value="1">Kelas 1</option>
              <option value="2">Kelas 2</option>
              <option value="3">Kelas 3</option>
              <option value="4">Kelas 4</option>
            </select>
          </div>
        </div>

        {/* 2. Pemilihan Cakupan: Segmented Tabs (Reguler vs Unggulan) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            3. Pilih Cakupan Kelas
          </label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setScope('reguler')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                scope === 'reguler'
                  ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Kelas Reguler (Non-Unggulan)</span>
            </button>
            <button
              type="button"
              onClick={() => setScope('unggulan')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                scope === 'unggulan'
                  ? 'bg-white text-amber-900 shadow-xs border border-amber-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Kelas Unggulan (Ug)</span>
            </button>
          </div>
        </div>

        {/* Sub-selector jika tab Unggulan aktif */}
        {scope === 'unggulan' && (
          <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                Target Bagian Unggulan:
              </span>
              <span className="text-[11px] font-semibold text-amber-800">
                Tersedia: {daftarBagUg.length} Kelas Unggulan ({daftarBagUg.join(', ') || 'None'})
              </span>
            </div>

            {daftarBagUg.length === 0 ? (
              <div className="flex items-center gap-2 text-amber-800 py-1">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Tidak ada kelas unggulan yang terdaftar pada {dinKls} {tingkat}.</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedBagUg('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors ${
                    selectedBagUg === 'ALL'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/50'
                  }`}
                >
                  Semua Bagian Unggulan ({daftarBagUg.join(', ')})
                </button>
                {daftarBagUg.map((bag) => (
                  <button
                    key={bag}
                    type="button"
                    onClick={() => setSelectedBagUg(bag)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors ${
                      selectedBagUg === bag
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100/50'
                    }`}
                  >
                    {dinKls} {bag} {tingkat} (Ug)
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Checklist Fan Pelajaran */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="p-2.5 px-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">
              4. Centang Fan Wajib Diajar Mustahiq ({scope === 'reguler' ? 'Reguler' : 'Unggulan'})
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {checkedFans.length} Fan Dipilih
            </span>
          </div>

          <div className="max-h-[240px] overflow-y-auto p-2 divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Belum ada item Fan untuk kelas <b>{effectiveKelasKey}</b>.<br />
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
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-emerald-800">{parsed.fan}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-slate-700 font-medium">{parsed.mapel}</span>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Info Asatidz yang Terkena Dampak Penugasan */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Mustahiq yang Otomatis Ditugaskan ({targetMustahiq.length} Asatidz):</span>
          </div>
          {targetMustahiq.length === 0 ? (
            <p className="text-slate-400 italic text-[11px] m-0">
              Tidak ada Mustahiq yang terdata untuk kriteria ini pada master Asatidz.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto pt-0.5">
              {targetMustahiq.map((nama, nIdx) => (
                <span
                  key={nIdx}
                  className="inline-flex items-center text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md"
                >
                  {nama}
                </span>
              ))}
            </div>
          )}

          {scope === 'reguler' && mustahiqUgDikecualikan.length > 0 && (
            <p className="text-[11px] text-emerald-800 pt-1 border-t border-slate-200 m-0">
              ✓ Mustahiq kelas Unggulan otomatis <b>dikecualikan</b> dari kelas reguler ini:{' '}
              <span className="font-medium text-slate-600">
                {mustahiqUgDikecualikan.join(', ')}
              </span>.
            </p>
          )}
        </div>

        {/* Feedback aksi pembersihan jika dijalankan */}
        {cleanFeedback && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{cleanFeedback}</div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleBersihkanPenyusupan}
            disabled={isCleaning}
            title="Bersihkan asatidz mustahiq unggulan yang sebelumnya masuk ke daftar reguler"
            className="w-full sm:w-auto px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{isCleaning ? 'Membersihkan...' : 'Bersihkan Mustahiq Unggulan dari Reguler'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : scope === 'reguler'
                  ? 'Simpan ke Kelas Reguler'
                  : 'Simpan ke Kelas Unggulan'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
