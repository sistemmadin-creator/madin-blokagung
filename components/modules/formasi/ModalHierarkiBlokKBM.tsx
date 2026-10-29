'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FolderTree,
  Building2,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Moon,
  BookOpen,
  Search,
  X,
  Check,
  MapPin,
  Sparkles,
} from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import {
  MasterHierarkiKBM,
  HierarkiBlokKBM,
  loadHierarkiKbm,
  saveHierarkiKbm,
  DEFAULT_HIERARKI_KBM,
} from '@/lib/services/hierarchy-service';
import { useFormasiStore } from '@/stores/useFormasiStore';

interface ModalHierarkiBlokKBMProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'diniyyah' | 'takror';
}

export default function ModalHierarkiBlokKBM({
  isOpen,
  onClose,
  defaultCategory = 'diniyyah',
}: ModalHierarkiBlokKBMProps) {
  const { formasiList, fetchFormasi } = useFormasiStore();

  const [activeTab, setActiveTab] = useState<'diniyyah' | 'takror'>(defaultCategory);
  const [hierarkiData, setHierarkiData] = useState<MasterHierarkiKBM>(DEFAULT_HIERARKI_KBM);
  const [selectedBlokIndex, setSelectedBlokIndex] = useState<number>(0);
  const [newBlokName, setNewBlokName] = useState<string>('');
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [searchBlok, setSearchBlok] = useState<string>('');
  const [searchLocation, setSearchLocation] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Muat data saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      loadHierarkiKbm().then((data) => {
        setHierarkiData(data);
        setSelectedBlokIndex(0);
      });
      if (formasiList.length === 0) {
        fetchFormasi();
      }
      setSaveSuccessNotice(null);
    }
  }, [isOpen, fetchFormasi, formasiList.length]);

  useEffect(() => {
    if (defaultCategory) {
      setActiveTab(defaultCategory);
      setSelectedBlokIndex(0);
    }
  }, [defaultCategory]);

  const currentBlokList = useMemo(() => {
    return activeTab === 'diniyyah' ? hierarkiData.diniyyah : hierarkiData.takror;
  }, [activeTab, hierarkiData]);

  const filteredBlokList = useMemo(() => {
    if (!searchBlok.trim()) return currentBlokList;
    const q = searchBlok.trim().toLowerCase();
    return currentBlokList.filter((b) => b.namaBlok.toLowerCase().includes(q));
  }, [currentBlokList, searchBlok]);

  const activeBlok = currentBlokList[selectedBlokIndex] || currentBlokList[0] || null;

  const filteredLocations = useMemo(() => {
    if (!activeBlok) return [];
    if (!searchLocation.trim()) return activeBlok.lokasiList;
    const q = searchLocation.trim().toLowerCase();
    return activeBlok.lokasiList.filter((loc) => loc.toLowerCase().includes(q));
  }, [activeBlok, searchLocation]);

  // Tambah Blok Baru
  const handleAddBlok = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newBlokName.trim();
    if (!cleanName) return;

    // Cek duplikasi
    const exists = currentBlokList.some(
      (b) => b.namaBlok.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) {
      alert(`Blok "${cleanName}" sudah terdaftar di kategori ${activeTab.toUpperCase()}.`);
      return;
    }

    const newGroup: HierarkiBlokKBM = {
      namaBlok: cleanName,
      lokasiList: [],
    };

    setHierarkiData((prev) => {
      const nextList = [...(activeTab === 'diniyyah' ? prev.diniyyah : prev.takror), newGroup];
      return activeTab === 'diniyyah'
        ? { ...prev, diniyyah: nextList }
        : { ...prev, takror: nextList };
    });

    setNewBlokName('');
    setSelectedBlokIndex(currentBlokList.length);
  };

  // Hapus Blok
  const handleDeleteBlok = (blokName: string) => {
    if (
      !confirm(
        `Hapus Blok "${blokName}" beserta seluruh lokasi di dalamnya dari hierarki ${activeTab.toUpperCase()}?`
      )
    ) {
      return;
    }

    setHierarkiData((prev) => {
      const targetList = activeTab === 'diniyyah' ? prev.diniyyah : prev.takror;
      const nextList = targetList.filter((b) => b.namaBlok !== blokName);
      return activeTab === 'diniyyah'
        ? { ...prev, diniyyah: nextList }
        : { ...prev, takror: nextList };
    });

    setSelectedBlokIndex(0);
  };

  // Tambah Lokasi Baru di dalam Blok Aktif
  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBlok) {
      alert('Pilih atau buat Blok terlebih dahulu.');
      return;
    }

    const cleanLoc = newLocationName.trim();
    if (!cleanLoc) return;

    // Cek duplikasi
    const exists = activeBlok.lokasiList.some(
      (loc) => loc.toLowerCase() === cleanLoc.toLowerCase()
    );
    if (exists) {
      alert(`Lokasi "${cleanLoc}" sudah ada di dalam Blok ${activeBlok.namaBlok}.`);
      return;
    }

    setHierarkiData((prev) => {
      const targetList = activeTab === 'diniyyah' ? prev.diniyyah : prev.takror;
      const nextList = targetList.map((b) => {
        if (b.namaBlok === activeBlok.namaBlok) {
          return {
            ...b,
            lokasiList: [...b.lokasiList, cleanLoc],
          };
        }
        return b;
      });

      return activeTab === 'diniyyah'
        ? { ...prev, diniyyah: nextList }
        : { ...prev, takror: nextList };
    });

    setNewLocationName('');
  };

  // Hapus Lokasi dari Blok Aktif
  const handleDeleteLocation = (locName: string) => {
    if (!activeBlok) return;

    setHierarkiData((prev) => {
      const targetList = activeTab === 'diniyyah' ? prev.diniyyah : prev.takror;
      const nextList = targetList.map((b) => {
        if (b.namaBlok === activeBlok.namaBlok) {
          return {
            ...b,
            lokasiList: b.lokasiList.filter((l) => l !== locName),
          };
        }
        return b;
      });

      return activeTab === 'diniyyah'
        ? { ...prev, diniyyah: nextList }
        : { ...prev, takror: nextList };
    });
  };

  // Auto-Sync / Pindai dari Formasi Kelas Eksisting
  const handleAutoPopulateFromFormasi = () => {
    if (formasiList.length === 0) {
      alert('Data Formasi Kelas belum tersedia untuk dipindai.');
      return;
    }

    let addedCount = 0;
    const isDiniyyah = activeTab === 'diniyyah';

    setHierarkiData((prev) => {
      const currentGroups = isDiniyyah ? [...prev.diniyyah] : [...prev.takror];
      const allKnownLocations = new Set(
        currentGroups.flatMap((g) => g.lokasiList.map((l) => l.toLowerCase()))
      );

      formasiList.forEach((f) => {
        const targetLoc = isDiniyyah ? f.lokasi_diniyyah : f.lokasi_takror;
        if (!targetLoc || targetLoc === '-' || !targetLoc.trim()) return;

        const cleanLoc = targetLoc.trim();
        if (allKnownLocations.has(cleanLoc.toLowerCase())) return;

        // Auto-assign ke grup yang cocok atau grup Induk/Umum
        const locLower = cleanLoc.toLowerCase();
        let targetBlokName = 'Blok Induk';
        if (locLower.includes('hikmah') || locLower.includes('masjid') || locLower.includes('n.')) {
          targetBlokName = 'Blok 6';
        } else if (locLower.includes('komplek d') || locLower.includes('nahdloh')) {
          targetBlokName = 'Blok 4';
        } else if (f.pa_pi === 'PI' || locLower.includes('gp') || locLower.includes('teras')) {
          targetBlokName = 'Blok Putri';
        }

        let targetGroup = currentGroups.find(
          (g) => g.namaBlok.toLowerCase() === targetBlokName.toLowerCase()
        );
        if (!targetGroup) {
          targetGroup = { namaBlok: targetBlokName, lokasiList: [] };
          currentGroups.push(targetGroup);
        }

        targetGroup.lokasiList.push(cleanLoc);
        allKnownLocations.add(cleanLoc.toLowerCase());
        addedCount++;
      });

      return isDiniyyah
        ? { ...prev, diniyyah: currentGroups }
        : { ...prev, takror: currentGroups };
    });

    if (addedCount > 0) {
      setSaveSuccessNotice(
        `Berhasil memindai & menambahkan ${addedCount} lokasi baru dari Formasi Kelas ke ${activeTab.toUpperCase()}. Jangan lupa klik "Simpan Hierarki"!`
      );
    } else {
      alert('Semua lokasi ruang dari data Formasi Kelas sudah terdaftar di dalam hierarki.');
    }
  };

  // Simpan Hierarki ke Database & LocalStorage
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveHierarkiKbm(hierarkiData);
      setSaveSuccessNotice('Pengaturan Hierarki Blok Diniyyah & Takror berhasil disimpan!');
      setTimeout(() => setSaveSuccessNotice(null), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan hierarki: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Hierarki Blok KBM (Diniyyah & Takror)"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Header Kategori Tab */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('diniyyah');
                setSelectedBlokIndex(0);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'diniyyah'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Hierarki Diniyyah (KBM Malam)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('takror');
                setSelectedBlokIndex(0);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'takror'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Hierarki Takror (Belajar Sore)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAutoPopulateFromFormasi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs transition"
            title="Pindai data lokasi formasi yang sudah ada untuk langsung dimasukkan ke hierarki"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pindai dari Formasi</span>
          </button>
        </div>

        {/* Notifikasi Sukses */}
        {saveSuccessNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{saveSuccessNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dua Kolom: Daftar Blok (Kiri) & Daftar Lokasi di dalam Blok (Kanan) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[380px]">
          {/* Kolom Kiri: Daftar Blok */}
          <div className="md:col-span-5 bg-slate-50/70 rounded-xl border border-slate-200 p-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Daftar Blok {activeTab === 'diniyyah' ? 'Diniyyah' : 'Takror'}</span>
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {currentBlokList.length} Blok
                </span>
              </div>

              {/* Pencarian Blok */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchBlok}
                  onChange={(e) => setSearchBlok(e.target.value)}
                  placeholder="Cari nama blok..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* List Blok */}
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {filteredBlokList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Tidak ada blok yang cocok.
                  </div>
                ) : (
                  filteredBlokList.map((b) => {
                    const originalIdx = currentBlokList.findIndex(
                      (item) => item.namaBlok === b.namaBlok
                    );
                    const isSelected = originalIdx === selectedBlokIndex;

                    return (
                      <div
                        key={b.namaBlok}
                        onClick={() => setSelectedBlokIndex(originalIdx)}
                        className={`group px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-xs font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Building2
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isSelected ? 'text-white' : 'text-slate-400'
                            }`}
                          />
                          <span className="truncate">{b.namaBlok}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                              isSelected
                                ? 'bg-emerald-800 text-emerald-100'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {b.lokasiList.length} ruang
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBlok(b.namaBlok);
                            }}
                            className={`p-1 rounded hover:bg-rose-50 hover:text-rose-600 transition ${
                              isSelected ? 'text-emerald-200' : 'text-slate-400'
                            }`}
                            title={`Hapus Blok ${b.namaBlok}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Input Tambah Blok Baru */}
            <form onSubmit={handleAddBlok} data-testid="form-tambah-blok" className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  data-testid="input-tambah-blok"
                  value={newBlokName}
                  onChange={(e) => setNewBlokName(e.target.value)}
                  placeholder="Ketik Blok Baru (cth: Blok 1)..."
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="submit"
                  data-testid="btn-tambah-blok"
                  disabled={!newBlokName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </form>
          </div>

          {/* Kolom Kanan: Daftar Ruang / Lokasi di dalam Blok Terpilih */}
          <div className="md:col-span-7 bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      Lokasi di dalam: <b className="text-emerald-800">{activeBlok?.namaBlok || '-'}</b>
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ruang-ruang ini otomatis terikat ke {activeBlok?.namaBlok || '-'}.
                  </p>
                </div>

                <span className="text-[11px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {filteredLocations.length} Lokasi
                </span>
              </div>

              {/* Pencarian Lokasi */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Cari nama ruang / lokasi..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* List Lokasi */}
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {filteredLocations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    Belum ada lokasi ruang yang didaftarkan pada {activeBlok?.namaBlok || 'blok ini'}.
                  </div>
                ) : (
                  filteredLocations.map((loc) => (
                    <div
                      key={loc}
                      className="px-3 py-2 rounded-lg bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-800 flex items-center justify-between group transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition" />
                        <span className="truncate">{loc}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title={`Hapus ${loc}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Input Tambah Lokasi Baru */}
            <form onSubmit={handleAddLocation} data-testid="form-tambah-lokasi" className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  data-testid="input-tambah-lokasi"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder={`Tambah Ruang ke ${activeBlok?.namaBlok || 'Blok'} (cth: Gedung Madin R.01)...`}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="submit"
                  data-testid="btn-tambah-lokasi"
                  disabled={!newLocationName.trim() || !activeBlok}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="text-[11px] text-slate-500">
            Perubahan disimpan ke <b>app_settings (HIERARKI_LOKASI_KBM)</b>.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Hierarki'}</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
