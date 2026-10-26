'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { getWaliKelasSyncInfo } from '@/lib/utils/formasiSync';
import {
  Building,
  Check,
  Edit3,
  FolderOpen,
  Lock,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';

interface ModalPengaturanBlokKelasProps {
  fixedGender?: 'PA' | 'PI';
}

const TINGKAT_RANK: Record<string, number> = {
  "ISTI'DAD": 1,
  ULA: 2,
  WUSTHO: 3,
  ULYA: 4,
};

export default function ModalPengaturanBlokKelas({
  fixedGender,
}: ModalPengaturanBlokKelasProps) {
  const {
    formasiList,
    isBlokModalOpen,
    blokModalDefaultGender,
    blokModalPreselectedIds,
    blokModalEditGroupName,
    savedBlokGroups,
    fetchSavedBlokGroups,
    closeBlokModal,
    saveBlokKelasGroup,
    deleteBlokKelasGroup,
  } = useFormasiStore();

  const { asatidzList, fetchAsatidz } = useAsatidzStore();

  const [activeGender, setActiveGender] = useState<'PA' | 'PI'>(
    fixedGender || blokModalDefaultGender || 'PA'
  );
  const [selectedExistingGroup, setSelectedExistingGroup] = useState<string>('');
  const [namaBlokInput, setNamaBlokInput] = useState<string>('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTingkat, setFilterTingkat] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragTargetChecked, setDragTargetChecked] = useState<boolean>(true);

  useEffect(() => {
    if (isBlokModalOpen) {
      fetchSavedBlokGroups();
      if (asatidzList.length === 0) {
        fetchAsatidz();
      }
    }
  }, [isBlokModalOpen, fetchSavedBlokGroups, asatidzList.length, fetchAsatidz]);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Enrich & sort classes for activeGender
  const genderClasses = useMemo(() => {
    return formasiList
      .filter((f) => f.pa_pi === activeGender && Boolean(f.id))
      .map((f) => {
        const sync = getWaliKelasSyncInfo(f, asatidzList);
        const namaKelas = `${f.din_kls || ''} ${f.din_bag || ''} ${f.tingkat || ''}`.trim();
        const lokasiDiniyyah =
          sync.lokasiDiniyyah && sync.lokasiDiniyyah !== '-' ? sync.lokasiDiniyyah : '';
        const lokasiTakror =
          sync.lokasiTakror && sync.lokasiTakror !== '-' ? sync.lokasiTakror : '';
        return {
          ...f,
          id: f.id as string,
          namaKelas,
          waliKelasText: sync.waliKelasText,
          lokasiDiniyyah,
          lokasiTakror,
          blokClean: String(f.blok || '').trim(),
        };
      })
      .sort((a, b) => {
        const rA = TINGKAT_RANK[(a.tingkat || '').toUpperCase()] || 99;
        const rB = TINGKAT_RANK[(b.tingkat || '').toUpperCase()] || 99;
        if (rA !== rB) return rA - rB;
        const kA = parseInt(a.din_kls, 10) || 0;
        const kB = parseInt(b.din_kls, 10) || 0;
        if (kA !== kB) return kA - kB;
        return String(a.din_bag || '').localeCompare(String(b.din_bag || ''));
      });
  }, [formasiList, activeGender, asatidzList]);

  // Build combined list of block groups for activeGender
  const blokGroupsForGender = useMemo(() => {
    const map = new Map<
      string,
      {
        namaBlok: string;
        kelasList: typeof genderClasses;
      }
    >();

    for (const meta of savedBlokGroups) {
      if (meta.gender === activeGender && meta.namaBlok.trim()) {
        const key = meta.namaBlok.trim().toUpperCase();
        if (!map.has(key)) {
          map.set(key, { namaBlok: meta.namaBlok.trim(), kelasList: [] });
        }
      }
    }

    for (const cls of genderClasses) {
      if (!cls.blokClean) continue;
      const key = cls.blokClean.toUpperCase();
      if (!map.has(key)) {
        map.set(key, { namaBlok: cls.blokClean, kelasList: [cls] });
      } else {
        map.get(key)!.kelasList.push(cls);
      }
    }

    return Array.from(map.values());
  }, [savedBlokGroups, activeGender, genderClasses]);

  // Initialize modal state when opened
  useEffect(() => {
    if (!isBlokModalOpen) return;

    const initialGender = fixedGender || blokModalDefaultGender || 'PA';
    setActiveGender(initialGender);
    setSearchQuery('');
    setFilterTingkat('');

    if (blokModalEditGroupName) {
      const targetUpper = blokModalEditGroupName.trim().toUpperCase();
      const matchedIds = formasiList
        .filter(
          (f) =>
            f.pa_pi === initialGender &&
            f.id &&
            String(f.blok || '').trim().toUpperCase() === targetUpper
        )
        .map((f) => f.id as string);

      setSelectedExistingGroup(blokModalEditGroupName.trim());
      setNamaBlokInput(blokModalEditGroupName.trim());
      setCheckedIds(new Set([...matchedIds, ...blokModalPreselectedIds]));
    } else if (blokModalPreselectedIds && blokModalPreselectedIds.length > 0) {
      setSelectedExistingGroup('');
      setNamaBlokInput('');
      setCheckedIds(new Set(blokModalPreselectedIds));
    } else {
      setSelectedExistingGroup('');
      setNamaBlokInput('');
      setCheckedIds(new Set());
    }
  }, [
    isBlokModalOpen,
    fixedGender,
    blokModalDefaultGender,
    blokModalEditGroupName,
    blokModalPreselectedIds,
  ]);

  if (!isBlokModalOpen) return null;

  const handleSwitchGender = (newGender: 'PA' | 'PI') => {
    if (fixedGender) return;
    setActiveGender(newGender);
    setSelectedExistingGroup('');
    setNamaBlokInput('');
    setCheckedIds(new Set());
    setSearchQuery('');
    setFilterTingkat('');
  };

  const handleSelectExistingGroupChange = (groupName: string) => {
    setSelectedExistingGroup(groupName);
    if (!groupName) {
      setNamaBlokInput('');
      setCheckedIds(new Set());
      return;
    }

    setNamaBlokInput(groupName);
    const targetUpper = groupName.trim().toUpperCase();
    const existingMemberIds = genderClasses
      .filter((c) => c.blokClean.toUpperCase() === targetUpper)
      .map((c) => c.id);

    // Keep any newly checked unlocked items if user selected them via right-click first
    const nextSet = new Set<string>(existingMemberIds);
    Array.from(checkedIds).forEach((id) => {
      const cls = genderClasses.find((c) => c.id === id);
      if (cls && (!cls.blokClean || cls.blokClean.toUpperCase() === targetUpper)) {
        nextSet.add(id);
      }
    });
    setCheckedIds(nextSet);
  };

  const handleResetForm = () => {
    setSelectedExistingGroup('');
    setNamaBlokInput('');
    setCheckedIds(new Set());
  };

  const handleEditSavedGroup = (groupName: string) => {
    setSelectedExistingGroup(groupName);
    setNamaBlokInput(groupName);
    const targetUpper = groupName.trim().toUpperCase();
    const memberIds = genderClasses
      .filter((c) => c.blokClean.toUpperCase() === targetUpper)
      .map((c) => c.id);
    setCheckedIds(new Set(memberIds));
  };

  const handleDeleteSavedGroup = async (groupName: string, count: number) => {
    const msg =
      count > 0
        ? `Hapus blok "${groupName}"? Sebanyak ${count} kelas di dalam blok ini akan dikosongkan pengaturan bloknya.`
        : `Hapus blok "${groupName}" dari daftar blok tersimpan?`;
    if (!confirm(msg)) return;

    setIsSaving(true);
    try {
      const ok = await deleteBlokKelasGroup(activeGender, groupName);
      if (ok && selectedExistingGroup.toUpperCase() === groupName.toUpperCase()) {
        handleResetForm();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = namaBlokInput.trim();
    if (!trimmed) {
      alert('Silakan ketik Nama Blok terlebih dahulu.');
      return;
    }

    setIsSaving(true);
    try {
      const ok = await saveBlokKelasGroup(
        activeGender,
        selectedExistingGroup || null,
        trimmed,
        Array.from(checkedIds)
      );
      if (ok) {
        handleResetForm();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const activeGroupUpper = selectedExistingGroup.trim().toUpperCase();

  // Filter checklist items by searchQuery & filterTingkat
  const filteredChecklist = genderClasses.filter((cls) => {
    if (filterTingkat && cls.tingkat.toUpperCase() !== filterTingkat.toUpperCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const text = `${cls.namaKelas} ${cls.lokasiDiniyyah} ${cls.lokasiTakror} ${cls.waliKelasText} ${cls.blokClean}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const isClassLockedByOtherGroup = (blokClean: string) => {
    if (!blokClean) return false;
    if (activeGroupUpper && blokClean.toUpperCase() === activeGroupUpper) return false;
    return true;
  };

  const toggleItem = (id: string, forceState?: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      const target = forceState !== undefined ? forceState : !next.has(id);
      if (target) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const cls of filteredChecklist) {
        if (!isClassLockedByOtherGroup(cls.blokClean)) {
          next.add(cls.id);
        }
      }
      return next;
    });
  };

  const handleUnselectAllFiltered = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const cls of filteredChecklist) {
        next.delete(cls.id);
      }
      return next;
    });
  };

  const isPutra = activeGender === 'PA';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={closeBlokModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Pengaturan Blok Kelas ${isPutra ? 'Putra' : 'Putri'}`}
        className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 bg-white">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                isPutra
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-pink-50 text-pink-700 border-pink-200'
              }`}
            >
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 m-0 leading-snug">
                Pengaturan Blok Kelas {isPutra ? 'Putra' : 'Putri'}
              </h2>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Kelompokkan lokasi kelas {isPutra ? 'Putra (PA)' : 'Putri (PI)'} ke dalam satu nama Blok.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!fixedGender && (
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => handleSwitchGender('PA')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                    activeGender === 'PA'
                      ? 'bg-white text-sky-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Putra (PA)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchGender('PI')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${
                    activeGender === 'PI'
                      ? 'bg-white text-pink-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Putri (PI)
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={closeBlokModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Modal */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Form Baris Atas: Pilih Tindakan Grup & Input Nama Blok */}
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Tindakan Grup:
              </label>
              <select
                value={selectedExistingGroup}
                onChange={(e) => handleSelectExistingGroupChange(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-madin-600 font-semibold text-slate-800"
              >
                <option value="">+ Buat Nama Blok Baru (Ketik di bawah)</option>
                {blokGroupsForGender.map((g) => (
                  <option key={g.namaBlok} value={g.namaBlok}>
                    {g.namaBlok} ({g.kelasList.length} Kelas Terdaftar)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1 mb-0 leading-normal">
                Pilih blok yang ada untuk menambah anggota kelas, atau buat baru.
              </p>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {selectedExistingGroup ? 'Edit Nama Blok:' : 'Nama Blok Baru:'}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={namaBlokInput}
                  onChange={(e) => setNamaBlokInput(e.target.value)}
                  placeholder="Contoh: Blok Induk, Blok 4..."
                  className="flex-1 min-w-0 text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-madin-600 font-medium text-slate-800"
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
                {(selectedExistingGroup || namaBlokInput || checkedIds.size > 0) && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    title="Reset pilihan & kembali ke mode Buat Blok Baru"
                    className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 transition flex-shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </form>

          {/* Area Checklist Kelas & Lokasi */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                Pilih Kelas &amp; Lokasi untuk dimasukkan ke Blok ini:
              </span>
              <div className="flex items-center gap-1.5">
                {checkedIds.size > 0 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                    Terpilih: {checkedIds.size} Kelas
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold">
                  Total: {genderClasses.length} Kelas
                </span>
              </div>
            </div>

            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
              {/* Bar Pencarian & Filter Tingkat */}
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik untuk mencari kelas, lokasi ruang diniyyah/takror, atau mustahiq..."
                    className="w-full text-xs pl-8 pr-7 py-1.5 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-madin-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {['', "ISTI'DAD", 'ULA', 'WUSTHO', 'ULYA'].map((t) => (
                      <button
                        key={t || 'ALL'}
                        type="button"
                        onClick={() => setFilterTingkat(t)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          filterTingkat === t
                            ? 'bg-[#0f766e] text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {t || 'Semua Tingkat'}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="font-semibold text-[#0f766e] hover:underline"
                    >
                      Pilih Tampil
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleUnselectAllFiltered}
                      className="font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                    >
                      Lepas Tampil
                    </button>
                  </div>
                </div>
              </div>

              {/* Daftar Checklist */}
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 select-none">
                {filteredChecklist.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tidak ada kelas yang cocok dengan filter pencarian.
                  </div>
                ) : (
                  filteredChecklist.map((cls) => {
                    const lockedByOther = isClassLockedByOtherGroup(cls.blokClean);
                    const isChecked = checkedIds.has(cls.id);
                    const lokasiUtama =
                      cls.lokasiDiniyyah || cls.lokasiTakror || 'Lokasi belum diisi';
                    const lokasiKedua =
                      cls.lokasiTakror &&
                      cls.lokasiDiniyyah &&
                      cls.lokasiTakror.toUpperCase() !== cls.lokasiDiniyyah.toUpperCase()
                        ? `Takror: ${cls.lokasiTakror}`
                        : '';

                    return (
                      <div
                        key={cls.id}
                        onMouseDown={() => {
                          if (lockedByOther) return;
                          const nextState = !isChecked;
                          setIsDragging(true);
                          setDragTargetChecked(nextState);
                          toggleItem(cls.id, nextState);
                        }}
                        onMouseEnter={() => {
                          if (!isDragging || lockedByOther) return;
                          toggleItem(cls.id, dragTargetChecked);
                        }}
                        className={`px-3 py-2 flex items-center justify-between gap-2 text-xs transition ${
                          lockedByOther
                            ? 'bg-slate-50/80 opacity-60 cursor-not-allowed'
                            : isChecked
                            ? 'bg-emerald-50/60 hover:bg-emerald-50 cursor-pointer'
                            : 'hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={lockedByOther}
                            onChange={() => {}}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0 pointer-events-none flex-shrink-0"
                          />
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[#0f766e] text-[11px] flex-shrink-0">
                            {cls.namaKelas}
                            {cls.is_unggulan && (
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                            )}
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-slate-800">
                              {lokasiUtama}
                            </span>
                            {lokasiKedua && (
                              <span className="text-slate-500 ml-1.5 text-[11px]">
                                ({lokasiKedua})
                              </span>
                            )}
                            {cls.waliKelasText && cls.waliKelasText !== '-' && (
                              <span className="text-slate-400 ml-1.5 text-[11px]">
                                • {cls.waliKelasText}
                              </span>
                            )}
                          </div>
                        </div>

                        {lockedByOther && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200/80 text-slate-600 text-[10px] font-semibold flex-shrink-0">
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                            <span>{cls.blokClean}</span>
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 m-0">
              Tips: Klik dan tahan mouse lalu geser ke bawah/atas untuk mencentang banyak kelas sekaligus.
            </p>
          </div>

          {/* Bagian Bawah: Blok Kelas Tersimpan */}
          <div className="pt-2 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 m-0">
                Blok Kelas Tersimpan ({blokGroupsForGender.length} Grup)
              </h3>
            </div>

            {blokGroupsForGender.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400">
                Belum ada grup blok kelas {isPutra ? 'Putra' : 'Putri'} yang disimpan.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {blokGroupsForGender.map((group) => {
                  const isBeingEdited =
                    selectedExistingGroup.trim().toUpperCase() ===
                    group.namaBlok.trim().toUpperCase();

                  const previewKelas = group.kelasList
                    .slice(0, 8)
                    .map((c) => c.namaKelas)
                    .join(', ');
                  const moreCount = Math.max(0, group.kelasList.length - 8);

                  return (
                    <div
                      key={group.namaBlok}
                      className={`p-3 rounded-lg border transition flex items-center justify-between gap-3 ${
                        isBeingEdited
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                            {group.namaBlok}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                            {group.kelasList.length} Kelas
                          </span>
                          {isBeingEdited && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Sedang Diedit
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 m-0 mt-1 truncate">
                          {group.kelasList.length > 0
                            ? `${previewKelas}${moreCount > 0 ? ` +${moreCount} kelas lainnya` : ''}`
                            : 'Belum ada anggota kelas terdaftar'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSavedGroup(group.namaBlok)}
                          className="px-2.5 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3 text-sky-600" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteSavedGroup(group.namaBlok, group.kelasList.length)
                          }
                          disabled={isSaving}
                          className="px-2.5 py-1.5 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={closeBlokModal}
            className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold transition shadow-2xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
