'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart2,
  Plus,
  ExternalLink,
  Edit3,
  Trash2,
  X,
  Save,
  EyeOff,
} from 'lucide-react';
import { useProfilKontenStore } from '@/stores/useProfilKontenStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  METRIK_ACCENT_OPTIONS,
  ProfilIconName,
  ProfilMetrikItem,
} from '@/types/profil-konten';
import {
  PROFIL_ICON_SELECT_OPTIONS,
  renderProfilIcon,
} from '@/lib/utils/profilIconHelper';
import SectionMetaEditorCard from '@/components/modules/profil-cms/SectionMetaEditorCard';

export default function KelolaMetrikLembagaPage() {
  const {
    metrikList,
    fetchProfilKonten,
    createMetrik,
    updateMetrik,
    deleteMetrik,
  } = useProfilKontenStore();
  const { canCreate, canEdit, canDelete } = usePagePermission('kelola-metrik-lembaga');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProfilMetrikItem | null>(null);

  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');
  const [sublabel, setSublabel] = useState('');
  const [badge, setBadge] = useState('');
  const [iconName, setIconName] = useState<ProfilIconName>('Calendar');
  const [accent, setAccent] = useState(METRIK_ACCENT_OPTIONS[0].value);
  const [sortOrder, setSortOrder] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfilKonten(true);
  }, [fetchProfilKonten]);

  const openModal = (item: ProfilMetrikItem | null) => {
    setEditingItem(item);
    if (item) {
      setValue(item.value);
      setLabel(item.label);
      setSublabel(item.sublabel);
      setBadge(item.badge);
      setIconName(item.icon_name);
      setAccent(item.accent);
      setSortOrder(item.sort_order);
      setIsActive(item.is_active !== false);
    } else {
      setValue('');
      setLabel('');
      setSublabel('');
      setBadge('');
      setIconName('Award');
      setAccent(METRIK_ACCENT_OPTIONS[1].value);
      setSortOrder((metrikList[metrikList.length - 1]?.sort_order || 0) + 10);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || !label.trim()) return;
    setIsSaving(true);
    const payload = {
      value: value.trim(),
      label: label.trim(),
      sublabel: sublabel.trim(),
      badge: badge.trim(),
      icon_name: iconName,
      accent,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    if (editingItem) {
      await updateMetrik(editingItem.id, payload);
    } else {
      await createMetrik(payload);
    }
    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (item: ProfilMetrikItem) => {
    if (!confirm(`Hapus kartu metrik "${item.label}" (${item.value})?`)) return;
    await deleteMetrik(item.id);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b5751] to-[#147a71] text-amber-300 flex items-center justify-center shrink-0 shadow-md">
            <BarChart2 className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
                Kelola Skala &amp; Metrik Lembaga
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                PKM. Media Madin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Atur kartu angka statistik dan skala lembaga (tahun berdiri, jumlah santri, rombel, tenaga pendidik) yang tampil pada halaman utama portal publik.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/#statistik"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/80 text-xs font-bold transition shadow-2xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Lihat di Landing Page</span>
          </Link>

          {canCreate && (
            <button
              type="button"
              onClick={() => openModal(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 transition shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-950 stroke-[2.5]" />
              <span>Tambah Kartu Metrik</span>
            </button>
          )}
        </div>
      </div>

      {/* Pengaturan Heading & Deskripsi */}
      <SectionMetaEditorCard sectionKey="metrik_lembaga" canEdit={canEdit} />

      {/* Grid Kartu Metrik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrikList.map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl bg-white dark:bg-slate-800 p-5 border shadow-xs flex flex-col justify-between gap-4 ${
              item.is_active === false
                ? 'border-dashed border-slate-300 opacity-70'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.accent} flex items-center justify-center text-white shadow-sm`}
                >
                  {renderProfilIcon(item.icon_name, 'w-5 h-5')}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    #{item.sort_order}
                  </span>
                  {item.badge && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-serif">
                {item.value}
              </h3>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                {item.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.sublabel}</p>
              {item.is_active === false && (
                <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                  <EyeOff className="w-3 h-3" /> Disembunyikan
                </span>
              )}
            </div>

            {(canEdit || canDelete) && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => openModal(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
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

      {/* Modal Tambah / Edit Kartu Metrik */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0b5751] text-white">
              <h2 className="text-base font-extrabold font-serif">
                {editingItem ? 'Ubah Kartu Metrik Lembaga' : 'Tambah Kartu Metrik Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Nilai / Angka Utama *
                  </label>
                  <input
                    type="text"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Contoh: ± 5.400 atau 1951 M"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Badge Pojok Kanan
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Contoh: Putra & Putri"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Label Metrik *
                </label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Contoh: Santri Aktif"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Keterangan Tambahan
                </label>
                <input
                  type="text"
                  value={sublabel}
                  onChange={(e) => setSublabel(e.target.value)}
                  placeholder="Contoh: Talamidz Putra & Putri (Ula, Wustho, Ulya)"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Ikon
                  </label>
                  <select
                    value={iconName}
                    onChange={(e) => setIconName(e.target.value as ProfilIconName)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    {PROFIL_ICON_SELECT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Warna Aksen
                  </label>
                  <select
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    {METRIK_ACCENT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Urutan
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Tampilkan kartu di halaman publik
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Metrik'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
