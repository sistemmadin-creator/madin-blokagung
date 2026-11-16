'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  ExternalLink,
  Edit3,
  Trash2,
  X,
  Save,
  CheckCircle2,
  EyeOff,
} from 'lucide-react';
import { useProfilKontenStore } from '@/stores/useProfilKontenStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  MODEL_THEME_META,
  ModelColorTheme,
  ProfilIconName,
  ProfilModelPembelajaranItem,
} from '@/types/profil-konten';
import {
  PROFIL_ICON_SELECT_OPTIONS,
  renderProfilIcon,
} from '@/lib/utils/profilIconHelper';
import SectionMetaEditorCard from '@/components/modules/profil-cms/SectionMetaEditorCard';

export default function KelolaModelPembelajaranPage() {
  const {
    modelList,
    fetchProfilKonten,
    createModel,
    updateModel,
    deleteModel,
  } = useProfilKontenStore();
  const { canCreate, canEdit, canDelete } = usePagePermission('kelola-model-pembelajaran');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProfilModelPembelajaranItem | null>(null);

  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [iconName, setIconName] = useState<ProfilIconName>('BookCheck');
  const [colorTheme, setColorTheme] = useState<ModelColorTheme>('emerald');
  const [features, setFeatures] = useState<string[]>(['']);
  const [sortOrder, setSortOrder] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProfilKonten(true);
  }, [fetchProfilKonten]);

  const openModal = (item: ProfilModelPembelajaranItem | null) => {
    setEditingItem(item);
    if (item) {
      setTitle(item.title);
      setBadge(item.badge);
      setDeskripsi(item.deskripsi);
      setIconName(item.icon_name);
      setColorTheme(item.color_theme);
      setFeatures(item.features.length > 0 ? [...item.features] : ['']);
      setSortOrder(item.sort_order);
      setIsActive(item.is_active !== false);
    } else {
      setTitle('');
      setBadge('');
      setDeskripsi('');
      setIconName('Sparkles');
      setColorTheme('emerald');
      setFeatures(['']);
      setSortOrder((modelList[modelList.length - 1]?.sort_order || 0) + 10);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);

    const cleanedFeatures = features.map((f) => f.trim()).filter(Boolean);
    const payload = {
      title: title.trim(),
      badge: badge.trim(),
      deskripsi: deskripsi.trim(),
      icon_name: iconName,
      color_theme: colorTheme,
      features: cleanedFeatures,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    };

    if (editingItem) {
      await updateModel(editingItem.id, payload);
    } else {
      await createModel(payload);
    }
    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (item: ProfilModelPembelajaranItem) => {
    if (!confirm(`Hapus program model pembelajaran "${item.title}"?`)) return;
    await deleteModel(item.id);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b5751] to-[#147a71] text-amber-300 flex items-center justify-center shrink-0 shadow-md">
            <Layers className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
                Kelola Model Pembelajaran (Pilar Program)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                PKM. Media Madin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Kelola kartu pilar program pendidikan (Kelas Reguler, Kelas Unggulan, Akselerasi &amp; IHFAD, atau program tambahan) beserta poin keunggulannya.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/#program"
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
              <span>Tambah Program Pilar</span>
            </button>
          )}
        </div>
      </div>

      {/* Pengaturan Heading & Deskripsi */}
      <SectionMetaEditorCard sectionKey="model_pembelajaran" canEdit={canEdit} />

      {/* Grid Kartu Program */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modelList.map((pilar) => {
          const themeClass =
            MODEL_THEME_META[pilar.color_theme]?.cardClass ||
            MODEL_THEME_META.emerald.cardClass;
          return (
            <article
              key={pilar.id}
              className={`rounded-2xl p-6 border shadow-xs flex flex-col justify-between gap-5 ${themeClass} ${
                pilar.is_active === false ? 'opacity-65 border-dashed' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/50 dark:border-slate-700/50">
                    {renderProfilIcon(
                      pilar.icon_name,
                      'w-6 h-6 text-emerald-700 dark:text-amber-400'
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 dark:bg-slate-800/80">
                      #{pilar.sort_order}
                    </span>
                    {pilar.badge && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 border border-current/20">
                        {pilar.badge}
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white mb-2">
                  {pilar.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  {pilar.deskripsi}
                </p>

                <div className="space-y-1.5 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                  {pilar.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                {pilar.is_active === false && (
                  <span className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    <EyeOff className="w-3 h-3" /> Disembunyikan
                  </span>
                )}
              </div>

              {(canEdit || canDelete) && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openModal(pilar)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ubah</span>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(pilar)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800/60 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Modal Tambah / Edit Pilar Program */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#0b5751] text-white">
              <h2 className="text-base font-extrabold font-serif">
                {editingItem ? 'Ubah Pilar Model Pembelajaran' : 'Tambah Pilar Pembelajaran Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Nama Program *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Kelas Unggulan"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Badge / Tahun Berdiri
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="Contoh: Est. 2018 M"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Deskripsi Program
                </label>
                <textarea
                  rows={3}
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
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
                    Tema Warna Kartu
                  </label>
                  <select
                    value={colorTheme}
                    onChange={(e) => setColorTheme(e.target.value as ModelColorTheme)}
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    {(Object.keys(MODEL_THEME_META) as ModelColorTheme[]).map((k) => (
                      <option key={k} value={k}>
                        {MODEL_THEME_META[k].label}
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

              {/* Daftar Poin Keunggulan */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Poin Keunggulan / Checklist
                  </label>
                  <button
                    type="button"
                    onClick={() => setFeatures((prev) => [...prev, ''])}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Poin</span>
                  </button>
                </div>

                {features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) =>
                        setFeatures((prev) =>
                          prev.map((v, i) => (i === idx ? e.target.value : v))
                        )
                      }
                      placeholder={`Poin keunggulan ${idx + 1}...`}
                      className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm"
                    />
                    <button
                      type="button"
                      disabled={features.length <= 1}
                      onClick={() =>
                        setFeatures((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Tampilkan program di halaman publik
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
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Program'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
