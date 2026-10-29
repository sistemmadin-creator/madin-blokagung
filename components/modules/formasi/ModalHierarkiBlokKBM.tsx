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
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Info,
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
  const [openBlocks, setOpenBlocks] = useState<Set<string>>(new Set());
  const [newBlokName, setNewBlokName] = useState<string>('');
  const [newLocationInputs, setNewLocationInputs] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Muat data saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      loadHierarkiKbm()
        .then((data) => {
          setHierarkiData(data);
          // Default buka semua blok agar pengguna langsung melihat isinya
          const list = defaultCategory === 'diniyyah' ? data.diniyyah : data.takror;
          setOpenBlocks(new Set(list.map((b) => b.namaBlok)));
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
      if (formasiList.length === 0) {
        fetchFormasi();
      }
      setSaveSuccessNotice(null);
    }
  }, [isOpen, defaultCategory]);

  useEffect(() => {
    if (defaultCategory) {
      setActiveTab(defaultCategory);
    }
  }, [defaultCategory]);

  const currentBlokList = useMemo(() => {
    return activeTab === 'diniyyah' ? hierarkiData.diniyyah : hierarkiData.takror;
  }, [activeTab, hierarkiData]);

  // Total statistik
  const totalBlok = currentBlokList.length;
  const totalLokasi = useMemo(() => {
    return currentBlokList.reduce((acc, b) => acc + (b.lokasiList ? b.lokasiList.length : 0), 0);
  }, [currentBlokList]);

  // Filter pencarian
  const filteredBlokList = useMemo(() => {
    if (!searchQuery.trim()) return currentBlokList;
    const q = searchQuery.trim().toLowerCase();
    return currentBlokList.filter((b) => {
      const matchBlok = b.namaBlok.toLowerCase().includes(q);
      const matchLokasi = b.lokasiList.some((loc) => loc.toLowerCase().includes(q));
      return matchBlok || matchLokasi;
    });
  }, [currentBlokList, searchQuery]);

  // Otomatis buka blok yang cocok bila sedang mencari
  useEffect(() => {
    if (searchQuery.trim()) {
      setOpenBlocks(new Set(filteredBlokList.map((b) => b.namaBlok)));
    }
  }, [searchQuery, filteredBlokList]);

  // Toggle Accordion Blok
  const toggleBlock = (namaBlok: string) => {
    setOpenBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(namaBlok)) next.delete(namaBlok);
      else next.add(namaBlok);
      return next;
    });
  };

  const openAllBlocks = () => {
    setOpenBlocks(new Set(currentBlokList.map((b) => b.namaBlok)));
  };

  const closeAllBlocks = () => {
    setOpenBlocks(new Set());
  };

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
    // Otomatis buka blok baru yang ditambahkan
    setOpenBlocks((prev) => new Set(prev).add(cleanName));
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

    setOpenBlocks((prev) => {
      const next = new Set(prev);
      next.delete(blokName);
      return next;
    });
  };

  // Tambah Lokasi ke Blok tertentu
  const handleAddLocationToBlock = (blokName: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawVal = newLocationInputs[blokName] || '';
    const cleanLoc = rawVal.trim();
    if (!cleanLoc) return;

    const targetBlock = currentBlokList.find((b) => b.namaBlok === blokName);
    if (!targetBlock) return;

    // Cek duplikasi di blok tersebut
    const exists = targetBlock.lokasiList.some(
      (loc) => loc.toLowerCase() === cleanLoc.toLowerCase()
    );
    if (exists) {
      alert(`Lokasi "${cleanLoc}" sudah ada di dalam Blok ${blokName}.`);
      return;
    }

    setHierarkiData((prev) => {
      const targetList = activeTab === 'diniyyah' ? prev.diniyyah : prev.takror;
      const nextList = targetList.map((b) => {
        if (b.namaBlok === blokName) {
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

    setNewLocationInputs((prev) => ({ ...prev, [blokName]: '' }));
    setOpenBlocks((prev) => new Set(prev).add(blokName));
  };

  // Hapus Lokasi dari Blok
  const handleDeleteLocationFromBlock = (blokName: string, locName: string) => {
    setHierarkiData((prev) => {
      const targetList = activeTab === 'diniyyah' ? prev.diniyyah : prev.takror;
      const nextList = targetList.map((b) => {
        if (b.namaBlok === blokName) {
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
        `Berhasil memindai & menambahkan ${addedCount} lokasi baru dari Formasi Kelas ke ${activeTab.toUpperCase()}. Jangan lupa klik "Simpan Pengaturan"!`
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

  const isDiniyyah = activeTab === 'diniyyah';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan Hierarki Blok KBM (Diniyyah & Takror)"
      maxWidth="5xl"
    >
      <div className="space-y-4">
        {/* 1. Header Kategori Tab (Persis Style Gambar 2) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('diniyyah')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isDiniyyah
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Hierarki Diniyyah (Blok Diniyyah &gt; Lokasi Diniyyah)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('takror')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                !isDiniyyah
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Hierarki Takror (Blok Takror &gt; Lokasi Takror)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleAutoPopulateFromFormasi}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-2xs transition shrink-0"
            title="Pindai data lokasi formasi yang sudah ada untuk langsung dimasukkan ke hierarki"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pindai dari Formasi</span>
          </button>
        </div>

        {/* 2. Sub-Header Toolbar (Persis Gambar 2: Title Breadcrumb, Buka/Tutup Semua, Cari) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isDiniyyah ? 'bg-emerald-600' : 'bg-amber-600'}`} />
              <span>
                1. {isDiniyyah ? 'Daftar Blok Diniyyah > Lokasi Diniyyah' : 'Daftar Blok Takror > Lokasi Takror'}
              </span>
            </span>
            <span className="text-[11px] font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
              {totalBlok} blok · {totalLokasi} lokasi
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openAllBlocks}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              Buka Semua
            </button>
            <button
              type="button"
              onClick={closeAllBlocks}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
            >
              Tutup Semua
            </button>

            {/* Kotak Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari blok / lokasi..."
                className="text-xs pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 w-44 sm:w-52"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Baris Input Tambah Blok Baru */}
        <form onSubmit={handleAddBlok} data-testid="form-tambah-blok" className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <Building2 className={`w-4 h-4 shrink-0 ${isDiniyyah ? 'text-emerald-700' : 'text-amber-700'}`} />
          <span className="text-xs font-semibold text-slate-700 shrink-0 hidden sm:inline">
            Tambah Blok Baru:
          </span>
          <input
            type="text"
            data-testid="input-tambah-blok"
            disabled={isLoading}
            value={newBlokName}
            onChange={(e) => setNewBlokName(e.target.value)}
            placeholder={isLoading ? 'Memuat hierarki...' : `Ketik nama blok baru untuk ${isDiniyyah ? 'Diniyyah' : 'Takror'} (cth: Blok 1)...`}
            className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium disabled:opacity-60"
          />
          <button
            type="submit"
            data-testid="btn-tambah-blok"
            disabled={isLoading || !newBlokName.trim()}
            className={`px-3.5 py-1.5 rounded-lg disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              isDiniyyah
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-amber-700 hover:bg-amber-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Blok</span>
          </button>
        </form>

        {/* 4. Info Alert (Persis Gambar 2) */}
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
          <p className="m-0 leading-relaxed">
            <b>Hierarki 2 Tingkat ({isDiniyyah ? 'Blok Diniyyah > Lokasi Diniyyah' : 'Blok Takror > Lokasi Takror'}):</b> Ruang-ruang di dalam blok otomatis terikat ke blok tersebut saat memilih lokasi di formasi maupun jadwal KBM.
          </p>
        </div>

        {/* Banner Sukses Simpan */}
        {saveSuccessNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-700" />
              {saveSuccessNotice}
            </span>
            <button
              type="button"
              onClick={() => setSaveSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 5. Grid Kartu Blok Accordion (Persis Style Gambar 2) */}
        <div className="max-h-[460px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Memuat data hierarki...</span>
            </div>
          ) : filteredBlokList.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              {searchQuery
                ? `Tidak ada blok atau lokasi yang cocok dengan kata kunci "${searchQuery}".`
                : 'Belum ada blok yang didaftarkan. Ketik nama blok pada kotak di atas lalu klik "Tambah Blok", atau klik "Pindai dari Formasi".'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBlokList.map((b) => {
                const isOpen = openBlocks.has(b.namaBlok);
                const draftLoc = newLocationInputs[b.namaBlok] || '';

                return (
                  <div
                    key={b.namaBlok}
                    data-testid={`card-blok-${b.namaBlok}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden shadow-2xs flex flex-col justify-between transition hover:border-slate-300"
                  >
                    {/* Header Kartu Blok Accordion */}
                    <div
                      onClick={() => toggleBlock(b.namaBlok)}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 cursor-pointer bg-white hover:bg-slate-50 border-b border-slate-100 transition select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isOpen ? (
                          <FolderOpen className={`h-4 w-4 shrink-0 ${isDiniyyah ? 'text-emerald-600' : 'text-amber-600'}`} />
                        ) : (
                          <Folder className={`h-4 w-4 shrink-0 ${isDiniyyah ? 'text-emerald-600' : 'text-amber-600'}`} />
                        )}
                        <span className="truncate text-xs font-bold text-slate-900">
                          {b.namaBlok}
                        </span>
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                            isDiniyyah
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.lokasiList.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlok(b.namaBlok)}
                          title={`Hapus Blok ${b.namaBlok}`}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBlock(b.namaBlok)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 transition"
                        >
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Isi Kartu Blok (Daftar Lokasi di dalam Blok Ini) */}
                    {isOpen && (
                      <div className="p-3 bg-white/60 space-y-2.5 flex-1 flex flex-col justify-between">
                        {/* List Lokasi */}
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {b.lokasiList.length === 0 ? (
                            <div className="p-3 text-center text-[11px] text-slate-400 italic bg-slate-50/60 rounded-lg border border-dashed border-slate-200">
                              Belum ada lokasi ruang di {b.namaBlok}.
                            </div>
                          ) : (
                            b.lokasiList.map((loc) => (
                              <div
                                key={loc}
                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/90 hover:bg-slate-50 text-xs text-slate-800 font-medium group transition"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <MapPin className={`w-3.5 h-3.5 shrink-0 ${isDiniyyah ? 'text-emerald-600' : 'text-amber-600'}`} />
                                  <span className="truncate">{loc}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLocationFromBlock(b.namaBlok, loc)}
                                  title={`Hapus ${loc}`}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Input Tambah Ruang Baru di dalam Blok Ini */}
                        <form
                          onSubmit={(e) => handleAddLocationToBlock(b.namaBlok, e)}
                          data-testid="form-tambah-lokasi"
                          className="pt-2 border-t border-slate-200/80 flex items-center gap-1.5"
                        >
                          <input
                            type="text"
                            data-testid="input-tambah-lokasi"
                            value={draftLoc}
                            onChange={(e) =>
                              setNewLocationInputs((prev) => ({
                                ...prev,
                                [b.namaBlok]: e.target.value,
                              }))
                            }
                            placeholder={`+ Ruang di ${b.namaBlok}...`}
                            className="w-full text-xs px-2.5 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          />
                          <button
                            type="submit"
                            data-testid="btn-tambah-lokasi"
                            disabled={!draftLoc.trim()}
                            title={`Tambah Ruang ke ${b.namaBlok}`}
                            className={`p-1.5 rounded-lg disabled:opacity-40 text-white transition shrink-0 ${
                              isDiniyyah
                                ? 'bg-emerald-700 hover:bg-emerald-800'
                                : 'bg-amber-700 hover:bg-amber-800'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. Footer Actions (Persis Gambar 2) */}
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
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition disabled:opacity-50 ${
                isDiniyyah
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-amber-700 hover:bg-amber-800'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
