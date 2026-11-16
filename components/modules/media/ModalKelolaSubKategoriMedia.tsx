'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Plus,
  Edit3,
  Trash2,
  Check,
  Tags,
  AlertTriangle,
} from 'lucide-react';
import {
  PARENT_TOPICS_WITH_SUB,
  ParentTopicWithSub,
  SubTopikMedia,
  TOPIK_BERITA_MAP,
} from '@/types/berita';
import { useMediaKategoriStore } from '@/stores/useMediaKategoriStore';

export default function ModalKelolaSubKategoriMedia() {
  const {
    subKategoriList,
    isManagerModalOpen,
    isTableMissing,
    closeManagerModal,
    fetchSubKategori,
    createSubKategori,
    updateSubKategori,
    deleteSubKategori,
  } = useMediaKategoriStore();

  const [activeParent, setActiveParent] = useState<ParentTopicWithSub>('kegiatan');
  const [newNama, setNewNama] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNama, setEditingNama] = useState('');
  const [editingOrder, setEditingOrder] = useState<number>(10);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isManagerModalOpen) {
      fetchSubKategori(true);
    }
  }, [isManagerModalOpen, fetchSubKategori]);

  useEffect(() => {
    if (!isManagerModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null);
        } else {
          closeManagerModal();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isManagerModalOpen, editingId, closeManagerModal]);

  const currentItems = useMemo(() => {
    return subKategoriList
      .filter((s) => s.parent_topic === activeParent)
      .sort((a, b) => a.sort_order - b.sort_order || a.nama.localeCompare(b.nama));
  }, [subKategoriList, activeParent]);

  if (!isManagerModalOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim() || isSaving) return;
    setIsSaving(true);
    await createSubKategori({
      parent_topic: activeParent,
      nama: newNama.trim(),
    });
    setNewNama('');
    setIsSaving(false);
  };

  const handleStartEdit = (item: SubTopikMedia) => {
    setEditingId(item.id);
    setEditingNama(item.nama);
    setEditingOrder(item.sort_order);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingNama.trim() || isSaving) return;
    setIsSaving(true);
    await updateSubKategori(id, {
      nama: editingNama.trim(),
      sort_order: Number(editingOrder) || 0,
    });
    setEditingId(null);
    setIsSaving(false);
  };

  const handleDelete = async (item: SubTopikMedia) => {
    if (
      !window.confirm(
        `Hapus sub-kategori "${item.nama}" dari ${TOPIK_BERITA_MAP[item.parent_topic].title}?`
      )
    ) {
      return;
    }
    await deleteSubKategori(item.id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Sub-Kategori Media Madin"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
      onClick={closeManagerModal}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0b5751] to-[#137269] text-white">
          <div className="flex items-center gap-2.5">
            <Tags className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-base sm:text-lg font-extrabold font-serif">
                Pengaturan Sub-Kategori Media Madin
              </h2>
              <p className="text-[11px] text-emerald-100/85">
                Berlaku terpusat untuk Kelola Berita &amp; Kelola Galeri Sosmed
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeManagerModal}
            aria-label="Tutup pengaturan sub-kategori"
            className="p-1.5 rounded-lg hover:bg-white/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isTableMissing && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-bold">Tabel Supabase belum dimigrasi</p>
                <p>
                  Perubahan saat ini tersimpan di penyimpanan lokal browser. Jalankan{' '}
                  <code className="font-mono">
                    supabase/migrations/20261116_media_madin_kategori_kegiatan_event_acara_dan_subkategori.sql
                  </code>{' '}
                  di Supabase SQL Editor agar tersinkron ke seluruh perangkat.
                </p>
              </div>
            </div>
          )}

          {/* Tab Kategori Induk */}
          <div className="flex items-center gap-2 flex-wrap">
            {PARENT_TOPICS_WITH_SUB.map((parentKey) => {
              const meta = TOPIK_BERITA_MAP[parentKey];
              const count = subKategoriList.filter((s) => s.parent_topic === parentKey).length;
              const active = activeParent === parentKey;
              return (
                <button
                  key={parentKey}
                  type="button"
                  onClick={() => {
                    setActiveParent(parentKey);
                    setEditingId(null);
                  }}
                  className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                    active
                      ? `${meta.badgeBg} ${meta.badgeText} border-transparent shadow-xs`
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{meta.title}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Form Tambah Sub-Kategori */}
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newNama}
              onChange={(e) => setNewNama(e.target.value)}
              placeholder={`Tambah sub-kategori baru di ${TOPIK_BERITA_MAP[activeParent].title}...`}
              className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newNama.trim() || isSaving}
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sub</span>
            </button>
          </form>

          {/* Daftar Sub-Kategori */}
          <div className="space-y-2">
            {currentItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-xs text-slate-500">
                Belum ada sub-kategori pada {TOPIK_BERITA_MAP[activeParent].title}.
              </div>
            ) : (
              currentItems.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <input
                          type="number"
                          value={editingOrder}
                          onChange={(e) => setEditingOrder(Number(e.target.value) || 0)}
                          aria-label="Nomor urut"
                          className="w-20 min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-mono"
                        />
                        <input
                          type="text"
                          value={editingNama}
                          onChange={(e) => setEditingNama(e.target.value)}
                          aria-label="Nama sub-kategori"
                          className="flex-1 min-h-[36px] px-3 py-1 rounded-lg border border-emerald-500 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          disabled={isSaving}
                          className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-500">
                            #{item.sort_order}
                          </span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.nama}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            aria-label={`Ubah ${item.nama}`}
                            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            aria-label={`Hapus ${item.nama}`}
                            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <button
            type="button"
            onClick={closeManagerModal}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
