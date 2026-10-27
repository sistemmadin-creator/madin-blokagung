'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { getHafalanSantri } from '@/lib/utils/piagamHelper';
import {
  Users,
  Search,
  CheckCheck,
  Square,
  RotateCcw,
  BookmarkCheck,
  UserCheck,
} from 'lucide-react';

interface ModalSelectSantriPiagamProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedInduk: string[]) => void;
  initialSelected: string[];
}

export default function ModalSelectSantriPiagam({
  isOpen,
  onClose,
  onApply,
  initialSelected,
}: ModalSelectSantriPiagamProps) {
  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { setoranList, fetchSetoranData } = useMuhafadzohStore();

  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const [fltMustahiq, setFltMustahiq] = useState('');
  const [fltHafalanLulus, setFltHafalanLulus] = useState('');
  const [fltBlok, setFltBlok] = useState('');
  const [fltKls, setFltKls] = useState('');
  const [fltBag, setFltBag] = useState('');
  const [fltTingkat, setFltTingkat] = useState('');
  const [fltPaPi, setFltPaPi] = useState('');
  const [searchTable, setSearchTable] = useState('');

  // Sinkronkan state terpilih saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set(initialSelected.map(String)));
      if (santriList.length === 0) fetchSantri();
      if (asatidzList.length === 0) fetchAsatidz();
      if (setoranList.length === 0) fetchSetoranData();
    }
  }, [isOpen, initialSelected, santriList.length, asatidzList.length, setoranList.length, fetchSantri, fetchAsatidz, fetchSetoranData]);

  // Datalist Asatidz Unik
  const uniqueMustahiq = useMemo(() => {
    const names = asatidzList.map((a) => a.nama_asatidz).filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [asatidzList]);

  // Datalist Blok, Kelas, Bagian, Tingkat
  const uniqueBlok = useMemo(() => {
    const list = santriList.map((s) => s.blok).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [santriList]);

  const uniqueKls = useMemo(() => {
    const list = santriList.map((s) => s.din_kls).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [santriList]);

  const uniqueBag = useMemo(() => {
    const list = santriList.map((s) => s.din_bag).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [santriList]);

  const uniqueTingkat = useMemo(() => {
    const list = santriList.map((s) => s.tingkat).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [santriList]);

  // Datalist Hafalan Lulus Unik dari Riwayat Setoran
  const uniqueHafalan = useMemo(() => {
    const items = setoranList.map((m) => m.item_hafalan).filter(Boolean);
    return Array.from(new Set(items)).sort();
  }, [setoranList]);

  // Handler auto-fill filter saat memilih nama Mustahiq
  const handleMustahiqChange = (val: string) => {
    setFltMustahiq(val);
    const cleanVal = val.trim().toUpperCase();
    const match = asatidzList.find(
      (a) => (a.nama_asatidz || '').trim().toUpperCase() === cleanVal
    );
    if (match) {
      if (match.blok) setFltBlok(match.blok);
      if (match.din_kls_asatidz) setFltKls(match.din_kls_asatidz);
      if (match.din_bag_asatidz) setFltBag(match.din_bag_asatidz);
      if (match.tingkat_asatidz) setFltTingkat(match.tingkat_asatidz);
      if (match.pa_pi) setFltPaPi(match.pa_pi);
    }
  };

  // Reset Seluruh Filter
  const handleResetFilters = () => {
    setFltMustahiq('');
    setFltHafalanLulus('');
    setFltBlok('');
    setFltKls('');
    setFltBag('');
    setFltTingkat('');
    setFltPaPi('');
    setSearchTable('');
  };

  // Filter santri berdasarkan seluruh parameter
  const filteredSantri = useMemo(() => {
    const mus = fltMustahiq.trim().toUpperCase();
    const bl = fltBlok.trim().toUpperCase();
    const kl = fltKls.trim().toUpperCase();
    const bg = fltBag.trim().toUpperCase();
    const tk = fltTingkat.trim().toUpperCase();
    const pp = fltPaPi.trim().toUpperCase();
    const haf = fltHafalanLulus.trim().toUpperCase();
    const search = searchTable.trim().toLowerCase();

    // Set santri yang lulus hafalan tertentu
    let santriLulusSet: Set<string> | null = null;
    if (haf && setoranList.length > 0) {
      santriLulusSet = new Set();
      setoranList.forEach((m) => {
        const item = String(m.item_hafalan || '').trim().toUpperCase();
        if (item === haf || item.includes(haf) || haf.includes(item)) {
          santriLulusSet!.add(String(m.no_induk).trim());
        }
      });
    }

    return santriList.filter((s) => {
      const sInduk = String(s.no_induk || '').trim();
      const sNama = String(s.nama || '').trim();
      const sBlok = String(s.blok || '').trim().toUpperCase();
      const sKls = String(s.din_kls || '').trim().toUpperCase();
      const sBag = String(s.din_bag || '').trim().toUpperCase();
      const sTingkat = String(s.tingkat || '').trim().toUpperCase();
      const sPaPi = String(s.pa_pi || '').trim().toUpperCase();

      if (bl && sBlok !== bl) return false;
      if (kl && sKls !== kl) return false;
      if (bg && sBag !== bg) return false;
      if (tk && sTingkat !== tk) return false;
      if (pp && sPaPi !== pp) return false;

      if (santriLulusSet && !santriLulusSet.has(sInduk)) return false;

      if (search) {
        const matchSearch =
          sNama.toLowerCase().includes(search) ||
          sInduk.toLowerCase().includes(search) ||
          `${s.asrama || ''} ${s.kamar || ''}`.toLowerCase().includes(search);
        if (!matchSearch) return false;
      }

      return true;
    });
  }, [
    santriList,
    setoranList,
    fltMustahiq,
    fltBlok,
    fltKls,
    fltBag,
    fltTingkat,
    fltPaPi,
    fltHafalanLulus,
    searchTable,
  ]);

  // Toggle Checkbox Satuan
  const toggleCheckbox = (noInduk: string) => {
    setTempSelected((prev) => {
      const next = new Set(prev);
      if (next.has(noInduk)) next.delete(noInduk);
      else next.add(noInduk);
      return next;
    });
  };

  // Centang / Batal Centang Yang Tampil
  const handleSelectAllInView = (select: boolean) => {
    setTempSelected((prev) => {
      const next = new Set(prev);
      filteredSantri.forEach((s) => {
        const id = String(s.no_induk).trim();
        if (select) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const isAllInViewChecked =
    filteredSantri.length > 0 &&
    filteredSantri.every((s) => tempSelected.has(String(s.no_induk).trim()));

  const handleApply = () => {
    onApply(Array.from(tempSelected));
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Pilih Penerima Piagam (Mailing Santri)"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Panel Filter Multi-Kriteria */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Pencarian Asatidz / Mustahiq */}
            <div>
              <label className="block text-emerald-800 font-bold mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Asatidz / Mustahiq (Pencarian Rombel)</span>
              </label>
              <input
                list="dl_modal_mustahiq"
                type="text"
                placeholder="Ketik/Pilih Asatidz..."
                value={fltMustahiq}
                onChange={(e) => handleMustahiqChange(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs"
              />
              <datalist id="dl_modal_mustahiq">
                {uniqueMustahiq.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            {/* Filter Khusus: Kelulusan Hafalan Tertentu */}
            <div>
              <label className="block text-blue-800 font-bold mb-1 flex items-center gap-1">
                <BookmarkCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Filter Santri Lulus Hafalan (Opsional)</span>
              </label>
              <input
                list="dl_modal_hafalan"
                type="text"
                placeholder="Pilih atau ketik item hafalan..."
                value={fltHafalanLulus}
                onChange={(e) => setFltHafalanLulus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 text-xs"
              />
              <datalist id="dl_modal_hafalan">
                {uniqueHafalan.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div>
              <label className="block text-slate-500 font-bold text-[11px] mb-0.5">1. Blok</label>
              <input
                list="dl_modal_blok"
                type="text"
                placeholder="Blok"
                value={fltBlok}
                onChange={(e) => setFltBlok(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
              />
              <datalist id="dl_modal_blok">
                {uniqueBlok.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-500 font-bold text-[11px] mb-0.5">2. Kelas</label>
              <input
                list="dl_modal_kls"
                type="text"
                placeholder="Kls"
                value={fltKls}
                onChange={(e) => setFltKls(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
              />
              <datalist id="dl_modal_kls">
                {uniqueKls.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-500 font-bold text-[11px] mb-0.5">3. Bagian</label>
              <input
                list="dl_modal_bag"
                type="text"
                placeholder="Bagian"
                value={fltBag}
                onChange={(e) => setFltBag(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
              />
              <datalist id="dl_modal_bag">
                {uniqueBag.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-slate-500 font-bold text-[11px] mb-0.5">4. Tingkat</label>
              <input
                list="dl_modal_tingkat"
                type="text"
                placeholder="Tingkat"
                value={fltTingkat}
                onChange={(e) => setFltTingkat(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
              />
              <datalist id="dl_modal_tingkat">
                {uniqueTingkat.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-slate-500 font-bold text-[11px] mb-0.5">5. Gender</label>
              <select
                value={fltPaPi}
                onChange={(e) => setFltPaPi(e.target.value)}
                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs focus:outline-none"
              >
                <option value="">Semua (PA &amp; PI)</option>
                <option value="PA">PA (Putra)</option>
                <option value="PI">PI (Putri)</option>
              </select>
            </div>
          </div>

          {/* Tombol Aksi Filter Cepat */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAllInView(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Centang Yang Tampil</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectAllInView(false)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Batal Centang</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari santri di tabel..."
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  className="pl-7 pr-2.5 py-1 text-xs rounded border border-slate-300 bg-white focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Seluruh Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Indikator Total Terpilih */}
        <div className="flex items-center justify-between px-1">
          <span className="text-slate-500 text-xs">
            Menampilkan <b>{filteredSantri.length}</b> santri ({tempSelected.size} dicentang saat ini)
          </span>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-700 text-white shadow-2xs">
            {tempSelected.size} Santri Dipilih
          </span>
        </div>

        {/* Tabel Checkbox Santri */}
        <div className="overflow-x-auto max-h-[350px] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-center p-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={isAllInViewChecked}
                    onChange={(e) => handleSelectAllInView(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Pilih Semua di Tampilan"
                  />
                </th>
                <th className="p-2.5 font-bold w-24">No. Induk</th>
                <th className="p-2.5 font-bold w-28">Kamar</th>
                <th className="p-2.5 font-bold">Nama Santri</th>
                <th className="p-2.5 font-bold w-28">Kelas Diniyyah</th>
                <th className="p-2.5 font-bold">Riwayat Hafalan Santri</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSantri.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Tidak ada santri yang sesuai kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredSantri.map((s) => {
                  const sInduk = String(s.no_induk).trim();
                  const isChecked = tempSelected.has(sInduk);
                  const kamar = `${s.asrama || ''} - ${s.kamar || ''}`.trim() || '-';
                  const kelas = `${s.din_kls || ''} ${s.din_bag || ''} ${s.tingkat || ''}`.trim() || '-';
                  const hafalanRingkas = getHafalanSantri(sInduk, setoranList);

                  return (
                    <tr
                      key={sInduk}
                      onClick={() => toggleCheckbox(sInduk)}
                      className={`cursor-pointer transition hover:bg-slate-50 ${
                        isChecked ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <td className="text-center p-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheckbox(sInduk)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-2 font-mono font-semibold text-slate-600">{sInduk}</td>
                      <td className="p-2">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {kamar}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-slate-800">{s.nama}</td>
                      <td className="p-2">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {kelas}
                        </span>
                      </td>
                      <td className="p-2">
                        <span
                          className="inline-block max-w-[280px] truncate text-slate-500"
                          title={hafalanRingkas}
                        >
                          {hafalanRingkas}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-2xs transition"
          >
            <span>Terapkan Santri Terpilih ({tempSelected.size})</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}
