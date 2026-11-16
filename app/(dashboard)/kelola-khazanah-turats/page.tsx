'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Clock,
  Plus,
  ExternalLink,
  Edit3,
  Trash2,
  X,
  Save,
  GraduationCap,
  EyeOff,
} from 'lucide-react';
import { useProfilKontenStore } from '@/stores/useProfilKontenStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  KhazanahKitabItem,
  ProfilIconName,
  ProfilKhazanahJenjangItem,
  ProfilWaktuKbmItem,
  WaktuKbmSlotItem,
} from '@/types/profil-konten';
import { renderProfilIcon } from '@/lib/utils/profilIconHelper';
import SectionMetaEditorCard from '@/components/modules/profil-cms/SectionMetaEditorCard';

export default function KelolaKhazanahTuratsPage() {
  const {
    jenjangList,
    waktuKbmList,
    fetchProfilKonten,
    createJenjang,
    updateJenjang,
    deleteJenjang,
    createWaktuKbm,
    updateWaktuKbm,
    deleteWaktuKbm,
  } = useProfilKontenStore();
  const { canCreate, canEdit, canDelete } = usePagePermission('kelola-khazanah-turats');

  const [activeTab, setActiveTab] = useState<'kitab' | 'waktu'>('kitab');
  const [selectedJenjangId, setSelectedJenjangId] = useState<string>('jen-ula');

  // Modal Jenjang
  const [isJenjangModalOpen, setIsJenjangModalOpen] = useState(false);
  const [editingJenjang, setEditingJenjang] = useState<ProfilKhazanahJenjangItem | null>(null);
  const [kodeTab, setKodeTab] = useState('');
  const [namaJenjang, setNamaJenjang] = useState('');
  const [durasi, setDurasi] = useState('');
  const [fokus, setFokus] = useState('');
  const [targetHafalan, setTargetHafalan] = useState('');
  const [ujianAkhir, setUjianAkhir] = useState('');
  const [jenSortOrder, setJenSortOrder] = useState(10);
  const [jenActive, setJenActive] = useState(true);

  // Modal Kitab
  const [isKitabModalOpen, setIsKitabModalOpen] = useState(false);
  const [editingKitab, setEditingKitab] = useState<KhazanahKitabItem | null>(null);
  const [kitabFan, setKitabFan] = useState('');
  const [kitabNama, setKitabNama] = useState('');
  const [kitabArab, setKitabArab] = useState('');
  const [kitabKelas, setKitabKelas] = useState('');
  const [kitabTarget, setKitabTarget] = useState('');

  // Modal Waktu KBM
  const [isWaktuModalOpen, setIsWaktuModalOpen] = useState(false);
  const [editingWaktu, setEditingWaktu] = useState<ProfilWaktuKbmItem | null>(null);
  const [waktuJudul, setWaktuJudul] = useState('');
  const [waktuRentang, setWaktuRentang] = useState('');
  const [waktuTema, setWaktuTema] = useState<'siang' | 'malam'>('siang');
  const [waktuIcon, setWaktuIcon] = useState<ProfilIconName>('Sun');
  const [waktuSlots, setWaktuSlots] = useState<WaktuKbmSlotItem[]>([]);
  const [waktuOrder, setWaktuOrder] = useState(10);
  const [waktuActive, setWaktuActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfilKonten(true);
  }, [fetchProfilKonten]);

  const currentJenjang = useMemo(() => {
    return (
      jenjangList.find((j) => j.id === selectedJenjangId) ||
      jenjangList.find((j) => j.kode_tab === 'Ula') ||
      jenjangList[0] ||
      null
    );
  }, [jenjangList, selectedJenjangId]);

  // --- Handlers Jenjang ---
  const openJenjangModal = (item: ProfilKhazanahJenjangItem | null) => {
    setEditingJenjang(item);
    if (item) {
      setKodeTab(item.kode_tab);
      setNamaJenjang(item.nama);
      setDurasi(item.durasi);
      setFokus(item.fokus);
      setTargetHafalan(item.target_hafalan);
      setUjianAkhir(item.ujian_akhir);
      setJenSortOrder(item.sort_order);
      setJenActive(item.is_active !== false);
    } else {
      setKodeTab('');
      setNamaJenjang('');
      setDurasi('');
      setFokus('');
      setTargetHafalan('');
      setUjianAkhir('');
      setJenSortOrder((jenjangList[jenjangList.length - 1]?.sort_order || 0) + 10);
      setJenActive(true);
    }
    setIsJenjangModalOpen(true);
  };

  const handleSaveJenjang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kodeTab.trim() || !namaJenjang.trim()) return;
    setIsSaving(true);
    const payload = {
      kode_tab: kodeTab.trim(),
      nama: namaJenjang.trim(),
      durasi: durasi.trim(),
      fokus: fokus.trim(),
      target_hafalan: targetHafalan.trim(),
      ujian_akhir: ujianAkhir.trim(),
      kitab_list: editingJenjang ? editingJenjang.kitab_list : [],
      sort_order: Number(jenSortOrder) || 0,
      is_active: jenActive,
    };
    if (editingJenjang) {
      await updateJenjang(editingJenjang.id, payload);
    } else {
      await createJenjang(payload);
    }
    setIsSaving(false);
    setIsJenjangModalOpen(false);
  };

  const handleDeleteJenjang = async (jen: ProfilKhazanahJenjangItem) => {
    if (!confirm(`Hapus jenjang "${jen.nama}" beserta seluruh daftar kitabnya?`)) return;
    await deleteJenjang(jen.id);
  };

  // --- Handlers Kitab Kuning ---
  const openKitabModal = (kitab: KhazanahKitabItem | null) => {
    setEditingKitab(kitab);
    if (kitab) {
      setKitabFan(kitab.fan);
      setKitabNama(kitab.kitab);
      setKitabArab(kitab.kitabArab);
      setKitabKelas(kitab.kelas);
      setKitabTarget(kitab.target);
    } else {
      setKitabFan('');
      setKitabNama('');
      setKitabArab('');
      setKitabKelas('');
      setKitabTarget('');
    }
    setIsKitabModalOpen(true);
  };

  const handleSaveKitab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentJenjang || !kitabNama.trim()) return;
    setIsSaving(true);
    const nextItem: KhazanahKitabItem = {
      id: editingKitab?.id || `kitab-${Date.now()}`,
      fan: kitabFan.trim() || 'Umum',
      kitab: kitabNama.trim(),
      kitabArab: kitabArab.trim(),
      kelas: kitabKelas.trim(),
      target: kitabTarget.trim(),
    };

    const nextList = editingKitab
      ? currentJenjang.kitab_list.map((k) => (k.id === editingKitab.id ? nextItem : k))
      : [...currentJenjang.kitab_list, nextItem];

    await updateJenjang(currentJenjang.id, { kitab_list: nextList });
    setIsSaving(false);
    setIsKitabModalOpen(false);
  };

  const handleDeleteKitab = async (kitab: KhazanahKitabItem) => {
    if (!currentJenjang) return;
    if (!confirm(`Hapus kitab "${kitab.kitab}" dari ${currentJenjang.nama}?`)) return;
    const nextList = currentJenjang.kitab_list.filter((k) => k.id !== kitab.id);
    await updateJenjang(currentJenjang.id, { kitab_list: nextList });
  };

  // --- Handlers Waktu KBM ---
  const openWaktuModal = (item: ProfilWaktuKbmItem | null) => {
    setEditingWaktu(item);
    if (item) {
      setWaktuJudul(item.judul);
      setWaktuRentang(item.rentang_waktu);
      setWaktuTema(item.tema);
      setWaktuIcon(item.icon_name || (item.tema === 'malam' ? 'Moon' : 'Sun'));
      setWaktuSlots(
        item.slots.length > 0
          ? item.slots.map((s) => ({ ...s }))
          : [{ id: `sl-${Date.now()}`, waktu: '', keterangan: '' }]
      );
      setWaktuOrder(item.sort_order);
      setWaktuActive(item.is_active !== false);
    } else {
      setWaktuJudul('');
      setWaktuRentang('');
      setWaktuTema('siang');
      setWaktuIcon('Clock');
      setWaktuSlots([{ id: `sl-${Date.now()}`, waktu: '', keterangan: '' }]);
      setWaktuOrder((waktuKbmList[waktuKbmList.length - 1]?.sort_order || 0) + 10);
      setWaktuActive(true);
    }
    setIsWaktuModalOpen(true);
  };

  const handleSaveWaktu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waktuJudul.trim()) return;
    setIsSaving(true);
    const cleanedSlots = waktuSlots
      .map((s) => ({ ...s, waktu: s.waktu.trim(), keterangan: s.keterangan.trim() }))
      .filter((s) => s.waktu || s.keterangan);

    const payload = {
      judul: waktuJudul.trim(),
      rentang_waktu: waktuRentang.trim(),
      tema: waktuTema,
      icon_name: waktuIcon,
      slots: cleanedSlots,
      sort_order: Number(waktuOrder) || 0,
      is_active: waktuActive,
    };

    if (editingWaktu) {
      await updateWaktuKbm(editingWaktu.id, payload);
    } else {
      await createWaktuKbm(payload);
    }
    setIsSaving(false);
    setIsWaktuModalOpen(false);
  };

  const handleDeleteWaktu = async (item: ProfilWaktuKbmItem) => {
    if (!confirm(`Hapus blok jadwal "${item.judul}"?`)) return;
    await deleteWaktuKbm(item.id);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b5751] to-[#147a71] text-amber-300 flex items-center justify-center shrink-0 shadow-md">
            <BookOpen className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
                Kelola Khazanah Turats Salafiyah
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                PKM. Media Madin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Atur jenjang pendidikan, <strong>Daftar Kitab Kuning</strong>, serta jadwal <strong>Waktu KBM Pesantren</strong> yang tampil di halaman utama.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href={activeTab === 'kitab' ? '/#kurikulum' : '/#waktu-kbm'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/80 text-xs font-bold transition shadow-2xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Lihat di Landing Page</span>
          </Link>
        </div>
      </div>

      {/* Pengaturan Heading & Deskripsi */}
      <SectionMetaEditorCard sectionKey="khazanah_turats" canEdit={canEdit} />

      {/* Switcher Tab: Daftar Kitab Kuning vs Waktu KBM Pesantren */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('kitab')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'kitab'
                ? 'bg-[#0b5751] text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Daftar Kitab Kuning ({jenjangList.length} Jenjang)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('waktu')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'waktu'
                ? 'bg-[#0b5751] text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Waktu KBM Pesantren ({waktuKbmList.length} Blok)</span>
          </button>
        </div>

        {activeTab === 'kitab' && canCreate && (
          <button
            type="button"
            onClick={() => openJenjangModal(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-50 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>Tambah Tab Jenjang</span>
          </button>
        )}

        {activeTab === 'waktu' && canCreate && (
          <button
            type="button"
            onClick={() => openWaktuModal(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tambah Blok Waktu KBM</span>
          </button>
        )}
      </div>

      {/* TAB 1: DAFTAR KITAB KUNING */}
      {activeTab === 'kitab' && (
        <div className="space-y-5">
          {/* Pilihan Tab Jenjang */}
          <div className="flex flex-wrap items-center gap-2">
            {jenjangList.map((jen) => {
              const selected = currentJenjang?.id === jen.id;
              return (
                <button
                  key={jen.id}
                  type="button"
                  onClick={() => setSelectedJenjangId(jen.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition cursor-pointer ${
                    selected
                      ? 'bg-[#073623] text-amber-300 border-amber-400/50 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Jenjang {jen.kode_tab}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15">
                    {jen.kitab_list.length}
                  </span>
                </button>
              );
            })}
          </div>

          {currentJenjang && (
            <div className="space-y-5">
              {/* Info Jenjang Terpilih + Tombol Edit/Hapus Jenjang */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-bold">
                      #{currentJenjang.sort_order}
                    </span>
                    <h2 className="text-lg font-extrabold text-slate-900 dark:text-white font-serif">
                      {currentJenjang.nama}
                    </h2>
                    {currentJenjang.durasi && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {currentJenjang.durasi}
                      </span>
                    )}
                    {currentJenjang.is_active === false && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                        <EyeOff className="w-3 h-3" /> Disembunyikan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {currentJenjang.fokus}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openJenjangModal(currentJenjang)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Info Jenjang</span>
                    </button>
                  )}
                  {canDelete && jenjangList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteJenjang(currentJenjang)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Jenjang</span>
                    </button>
                  )}
                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => openKitabModal(null)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Tambah Kitab</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid Kartu Kitab */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentJenjang.kitab_list.map((kitab) => (
                  <article
                    key={kitab.id}
                    className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {kitab.fan}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {kitab.kelas}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {kitab.kitab}
                      </h3>
                      {kitab.kitabArab && (
                        <p
                          className="text-sm text-amber-700 dark:text-amber-300 font-serif font-semibold mt-1 text-right"
                          dir="rtl"
                        >
                          {kitab.kitabArab}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        Target: <strong className="text-slate-700 dark:text-slate-200">{kitab.target}</strong>
                      </p>
                    </div>

                    {(canEdit || canDelete) && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openKitabModal(kitab)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Ubah</span>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteKitab(kitab)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: WAKTU KBM PESANTREN */}
      {activeTab === 'waktu' && (
        <div className="space-y-5">
          {waktuKbmList.map((sesi) => (
            <article
              key={sesi.id}
              className="rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-xl ${
                      sesi.tema === 'malam'
                        ? 'bg-emerald-800 text-amber-300'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {renderProfilIcon(sesi.icon_name || 'Clock', 'w-5 h-5')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                        #{sesi.sort_order}
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-serif">
                        {sesi.judul}
                      </h3>
                    </div>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      {sesi.rentang_waktu} • Tema {sesi.tema === 'malam' ? 'Malam (Emerald)' : 'Siang (Amber)'}
                    </p>
                  </div>
                </div>

                {(canEdit || canDelete) && (
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openWaktuModal(sesi)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Ubah Sesi</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteWaktu(sesi)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {sesi.slots.map((slot) => (
                  <div
                    key={slot.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                  >
                    <span className="font-bold text-emerald-800 dark:text-amber-300 block">
                      {slot.waktu}
                    </span>
                    <p className="text-slate-600 dark:text-slate-300">{slot.keterangan}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal Jenjang */}
      {isJenjangModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0b5751] text-white">
              <h2 className="text-base font-extrabold font-serif">
                {editingJenjang ? 'Edit Informasi Jenjang' : 'Tambah Tab Jenjang Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setIsJenjangModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJenjang} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Label Tab *
                  </label>
                  <input
                    type="text"
                    required
                    value={kodeTab}
                    onChange={(e) => setKodeTab(e.target.value)}
                    placeholder="Contoh: Ula"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Nama Lengkap Jenjang *
                  </label>
                  <input
                    type="text"
                    required
                    value={namaJenjang}
                    onChange={(e) => setNamaJenjang(e.target.value)}
                    placeholder="Contoh: Tingkat Ula (Dasar Salaf)"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Durasi Tempuh
                  </label>
                  <input
                    type="text"
                    value={durasi}
                    onChange={(e) => setDurasi(e.target.value)}
                    placeholder="Contoh: 4 Tahun (Kelas 1 s/d 4 Ula)"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Nomor Urut Tab
                  </label>
                  <input
                    type="number"
                    value={jenSortOrder}
                    onChange={(e) => setJenSortOrder(Number(e.target.value) || 0)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Fokus Keilmuan
                </label>
                <textarea
                  rows={2}
                  value={fokus}
                  onChange={(e) => setFokus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Target Muhafadzoh (Ringkasan)
                </label>
                <textarea
                  rows={2}
                  value={targetHafalan}
                  onChange={(e) => setTargetHafalan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Evaluasi &amp; Syarat Kenaikan
                </label>
                <textarea
                  rows={2}
                  value={ujianAkhir}
                  onChange={(e) => setUjianAkhir(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jenActive}
                  onChange={(e) => setJenActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700"
                />
                <span className="text-xs font-bold">Tampilkan jenjang di halaman publik</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsJenjangModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Jenjang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kitab Kuning */}
      {isKitabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0b5751] text-white">
              <h2 className="text-base font-extrabold font-serif">
                {editingKitab ? 'Ubah Kitab Kuning' : 'Tambah Kitab Kuning'}
              </h2>
              <button
                type="button"
                onClick={() => setIsKitabModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKitab} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Fan Keilmuan *
                  </label>
                  <input
                    type="text"
                    required
                    value={kitabFan}
                    onChange={(e) => setKitabFan(e.target.value)}
                    placeholder="Contoh: Nahwu, Fiqih, Aqidah"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Tingkat Kelas
                  </label>
                  <input
                    type="text"
                    value={kitabKelas}
                    onChange={(e) => setKitabKelas(e.target.value)}
                    placeholder="Contoh: 1 - 2 Ula"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Nama Kitab (Latin) *
                </label>
                <input
                  type="text"
                  required
                  value={kitabNama}
                  onChange={(e) => setKitabNama(e.target.value)}
                  placeholder="Contoh: Jurumiyyah Al-Bayan & Matan Jurumiyyah"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Judul Arab (Opsional)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={kitabArab}
                  onChange={(e) => setKitabArab(e.target.value)}
                  placeholder="الآجرومية والبيان"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-serif"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Target Materi
                </label>
                <input
                  type="text"
                  value={kitabTarget}
                  onChange={(e) => setKitabTarget(e.target.value)}
                  placeholder="Contoh: I'rab, Isim-Isim Marfu' & Manshub"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsKitabModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Kitab'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Waktu KBM */}
      {isWaktuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0b5751] text-white">
              <h2 className="text-base font-extrabold font-serif">
                {editingWaktu ? 'Ubah Blok Waktu KBM' : 'Tambah Blok Waktu KBM'}
              </h2>
              <button
                type="button"
                onClick={() => setIsWaktuModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWaktu} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Judul Sesi KBM *
                  </label>
                  <input
                    type="text"
                    required
                    value={waktuJudul}
                    onChange={(e) => setWaktuJudul(e.target.value)}
                    placeholder="Contoh: Takror Siang"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Rentang Jam Utama
                  </label>
                  <input
                    type="text"
                    value={waktuRentang}
                    onChange={(e) => setWaktuRentang(e.target.value)}
                    placeholder="Contoh: Pukul 13.30 – 15.00 WIB"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Tema Tampilan
                  </label>
                  <select
                    value={waktuTema}
                    onChange={(e) => {
                      const val = e.target.value as 'siang' | 'malam';
                      setWaktuTema(val);
                      setWaktuIcon(val === 'malam' ? 'Moon' : 'Sun');
                    }}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="siang">Siang (Nuansa Emas/Amber)</option>
                    <option value="malam">Malam (Nuansa Emerald Gelap)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Urutan
                  </label>
                  <input
                    type="number"
                    value={waktuOrder}
                    onChange={(e) => setWaktuOrder(Number(e.target.value) || 0)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>

                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waktuActive}
                      onChange={(e) => setWaktuActive(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-700"
                    />
                    <span className="text-xs font-bold">Aktif di Publik</span>
                  </label>
                </div>
              </div>

              {/* Rincian Slot Jam */}
              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Rincian Slot Jam &amp; Agenda
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setWaktuSlots((prev) => [
                        ...prev,
                        { id: `sl-${Date.now()}-${prev.length}`, waktu: '', keterangan: '' },
                      ])
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Slot</span>
                  </button>
                </div>

                {waktuSlots.map((slot, idx) => (
                  <div
                    key={slot.id}
                    className="flex flex-col sm:flex-row gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700"
                  >
                    <input
                      type="text"
                      value={slot.waktu}
                      onChange={(e) =>
                        setWaktuSlots((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, waktu: e.target.value } : s))
                        )
                      }
                      placeholder="Pukul (mis. 19.55 WIB)"
                      className="sm:w-44 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={slot.keterangan}
                      onChange={(e) =>
                        setWaktuSlots((prev) =>
                          prev.map((s, i) =>
                            i === idx ? { ...s, keterangan: e.target.value } : s
                          )
                        )
                      }
                      placeholder="Keterangan agenda..."
                      className="flex-1 min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      disabled={waktuSlots.length <= 1}
                      onClick={() =>
                        setWaktuSlots((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 cursor-pointer self-end sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsWaktuModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Sesi KBM'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
