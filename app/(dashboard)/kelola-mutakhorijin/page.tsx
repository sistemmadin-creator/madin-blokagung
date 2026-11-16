'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Plus,
  ExternalLink,
  Edit3,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Star,
  BookOpen,
  Compass,
  Image as ImageIcon,
} from 'lucide-react';
import {
  CreateAlbumPayload,
  CreateSectionPayload,
  UpdateAlbumPayload,
  useMutakhorijinStore,
} from '@/stores/useMutakhorijinStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  getAlbumSlug,
  getPublicNavbarAlbums,
  MutakhorijinAlbum,
  MutakhorijinSection,
  sanitizeMutakhorijinPhotoUrl,
  sortAlbumsForDisplay,
} from '@/types/mutakhorijin';
import ModalFormAlbumMutakhorijin from '@/components/modules/mutakhorijin/ModalFormAlbumMutakhorijin';
import ModalFormSectionMutakhorijin from '@/components/modules/mutakhorijin/ModalFormSectionMutakhorijin';

export default function KelolaMutakhorijinAdminPage() {
  const {
    albums,
    sections,
    isLoading,
    isTableMissing,
    error,
    fetchMutakhorijin,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    createSection,
    updateSection,
    deleteSection,
  } = useMutakhorijinStore();

  const { canCreate, canEdit, canDelete } = usePagePermission('kelola-mutakhorijin');

  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<MutakhorijinAlbum | null>(null);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<MutakhorijinSection | null>(null);

  useEffect(() => {
    fetchMutakhorijin(true);
  }, [fetchMutakhorijin]);

  const sortedAlbums = useMemo(() => sortAlbumsForDisplay(albums), [albums]);

  const navbarTop5Map = useMemo(() => {
    const top5 = getPublicNavbarAlbums(sortedAlbums, 5);
    return new Map(top5.map((a, idx) => [a.id, idx + 1]));
  }, [sortedAlbums]);

  const activeAlbum = useMemo(() => {
    if (selectedAlbumId) {
      const found = sortedAlbums.find((a) => a.id === selectedAlbumId);
      if (found) return found;
    }
    return sortedAlbums.find((a) => a.is_current) || sortedAlbums[0] || null;
  }, [sortedAlbums, selectedAlbumId]);

  const sectionCountByAlbum = useMemo(() => {
    const map = new Map<string, number>();
    sections.forEach((s) => map.set(s.album_id, (map.get(s.album_id) || 0) + 1));
    return map;
  }, [sections]);

  const activeSections = useMemo(() => {
    if (!activeAlbum) return [];
    return sections
      .filter((s) => s.album_id === activeAlbum.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [sections, activeAlbum]);

  const handleSaveAlbum = async (
    payload: CreateAlbumPayload | UpdateAlbumPayload,
    editingId?: string
  ) => {
    if (editingId) {
      return await updateAlbum(editingId, payload as UpdateAlbumPayload);
    }
    const created = await createAlbum(payload as CreateAlbumPayload);
    if (created) {
      setSelectedAlbumId(created.id);
      return true;
    }
    return false;
  };

  const handleSaveSection = async (payload: CreateSectionPayload, editingId?: string) => {
    if (editingId) {
      return await updateSection(editingId, payload);
    }
    return await createSection(payload);
  };

  const handleDeleteAlbum = async (album: MutakhorijinAlbum) => {
    if (album.is_current) {
      alert('Angkatan aktif sekarang tidak bisa dihapus. Alihkan status utama ke angkatan lain terlebih dahulu.');
      return;
    }
    if (
      !confirm(
        `Hapus album "${album.nama_angkatan} (${album.caption_angkatan})" beserta seluruh bab dan fotonya?`
      )
    ) {
      return;
    }
    const ok = await deleteAlbum(album.id);
    if (ok && activeAlbum?.id === album.id) {
      setSelectedAlbumId('');
    }
  };

  const handleDeleteSection = async (sec: MutakhorijinSection) => {
    if (!confirm(`Hapus blok "${sec.judul}" beserta seluruh foto di dalamnya?`)) {
      return;
    }
    await deleteSection(sec.id);
  };

  const publicUrl = activeAlbum
    ? `/mutakhorijin/${getAlbumSlug(activeAlbum)}`
    : '/mutakhorijin';

  return (
    <div className="space-y-6">
      {/* Header Admin */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0b5751] to-[#147a71] text-amber-300 flex items-center justify-center shrink-0 shadow-md">
            <GraduationCap className="w-6 h-6 stroke-[1.75]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
                Kelola Album Mutakhorijin
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40">
                PKM. Media Madin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              Atur angkatan pada grup menu publik <strong>Mutakhorijin</strong> (maks. 5 tahun angkatan terakhir di dropdown header), serta kelola bab cerita dan kartu pos album kenangan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canEdit && activeAlbum && (
            <button
              type="button"
              disabled={isTableMissing}
              onClick={() => {
                setEditingAlbum(activeAlbum);
                setIsAlbumModalOpen(true);
              }}
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span>Edit Angkatan</span>
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              disabled={isTableMissing}
              onClick={() => {
                setEditingAlbum(null);
                setIsAlbumModalOpen(true);
              }}
              className="min-h-[40px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              <span>Angkatan Baru</span>
            </button>
          )}

          <Link
            href={publicUrl}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100/80 text-xs font-bold transition shadow-2xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Lihat Halaman Publik</span>
          </Link>

          {canCreate && activeAlbum && (
            <button
              type="button"
              disabled={isTableMissing}
              onClick={() => {
                setEditingSection(null);
                setIsSectionModalOpen(true);
              }}
              className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 hover:from-amber-200 hover:to-amber-300 transition shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-950 stroke-[2.5]" aria-hidden="true" />
              <span>Tambah Bab / Kartu Pos</span>
            </button>
          )}
        </div>
      </div>

      {isTableMissing && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-4 flex items-start gap-3 text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-bold">Tabel Mutakhorijin Belum Tersedia di Supabase</p>
            <p>
              Terapkan migrasi{' '}
              <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-xs">
                supabase/migrations/20261117_mutakhorijin_album_kenangan.sql
              </code>{' '}
              agar seluruh perubahan tersimpan permanen.
            </p>
          </div>
        </div>
      )}

      {error && !isTableMissing && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-800 px-4 py-3 text-xs font-semibold text-rose-800 dark:text-rose-200"
        >
          {error}
        </div>
      )}

      {/* Daftar Angkatan Mutakhorijin */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
            Daftar Angkatan ({sortedAlbums.length})
          </h2>
          <span className="text-xs text-slate-600 dark:text-slate-300">
            Maksimal 5 angkatan terbaru yang berstatus publik tampil di dropdown menu header
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sortedAlbums.map((album) => {
            const isSelected = activeAlbum?.id === album.id;
            const navRank = navbarTop5Map.get(album.id);
            const totalSections = sectionCountByAlbum.get(album.id) || 0;

            return (
              <div
                key={album.id}
                className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAlbumId(album.id)}
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                        {album.nama_angkatan}
                      </div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                        {album.caption_angkatan || `Angkatan ${album.tahun_angkatan}`}
                      </div>
                    </button>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0">
                      {totalSections} Blok
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {album.is_current ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 text-[10px] font-extrabold">
                        <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                        Terbaru (Menu #1)
                      </span>
                    ) : navRank ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                        Menu Header #{navRank}
                      </span>
                    ) : album.is_active === false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold">
                        <EyeOff className="w-3 h-3" aria-hidden="true" />
                        Disembunyikan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                        Arsip (&gt;5 terbaru)
                      </span>
                    )}

                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">
                      /{getAlbumSlug(album)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedAlbumId(album.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                      isSelected
                        ? 'bg-[#0b5751] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? 'Sedang Dikelola' : 'Kelola Isi'}
                  </button>

                  <div className="flex items-center gap-1">
                    {canEdit && !album.is_current && (
                      <button
                        type="button"
                        disabled={isTableMissing}
                        onClick={() =>
                          updateAlbum(album.id, {
                            is_active: !(album.is_active !== false),
                          })
                        }
                        title={
                          album.is_active === false
                            ? 'Tampilkan di halaman publik'
                            : 'Sembunyikan dari publik'
                        }
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                      >
                        {album.is_active === false ? (
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        disabled={isTableMissing}
                        onClick={() => {
                          setEditingAlbum(album);
                          setIsAlbumModalOpen(true);
                        }}
                        title="Ubah angkatan"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                    {canDelete && !album.is_current && sortedAlbums.length > 1 && (
                      <button
                        type="button"
                        disabled={isTableMissing}
                        onClick={() => handleDeleteAlbum(album)}
                        title="Hapus angkatan"
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Daftar Blok Bab Cerita & Kartu Pos pada Angkatan Terpilih */}
      {isLoading && activeSections.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-44 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : activeSections.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center space-y-2">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Belum ada bab cerita atau kartu pos untuk angkatan{' '}
            {activeAlbum?.nama_angkatan || 'ini'}.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Klik tombol &ldquo;Tambah Bab / Kartu Pos&rdquo; di kanan atas untuk mulai menyusun album kenangan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeSections.map((sec) => {
            const mainUrl = sanitizeMutakhorijinPhotoUrl(sec.foto_utama_url);
            const totalFoto = (mainUrl ? 1 : 0) + (sec.galeri_foto?.length || 0);

            return (
              <article
                key={sec.id}
                className={`rounded-2xl border bg-white dark:bg-slate-800 overflow-hidden shadow-xs flex flex-col justify-between ${
                  sec.is_active === false
                    ? 'border-dashed border-slate-300 dark:border-slate-600 opacity-75'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div>
                  <div className="relative h-40 bg-[#061816] flex items-center justify-center overflow-hidden">
                    {mainUrl ? (
                      <img
                        src={mainUrl}
                        alt={sec.judul}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-emerald-200/70 p-4">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1" aria-hidden="true" />
                        <span className="text-[11px] font-semibold">Belum ada foto utama</span>
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                        #{sec.sort_order}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          sec.section_type === 'postcard'
                            ? 'bg-amber-400 text-emerald-950'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {sec.section_type === 'postcard' ? (
                          <Compass className="w-3 h-3" aria-hidden="true" />
                        ) : (
                          <BookOpen className="w-3 h-3" aria-hidden="true" />
                        )}
                        <span>
                          {sec.section_type === 'postcard' ? 'Kartu Pos' : 'Bab Dossier'}
                        </span>
                      </span>
                    </div>
                    <span className="absolute bottom-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/70 text-[#FFF6D1] text-[10px] font-bold">
                      {totalFoto} Foto
                    </span>
                  </div>

                  <div className="p-4 space-y-1.5">
                    {sec.subjudul_label && (
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        {sec.subjudul_label}
                      </p>
                    )}
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-serif">
                      {sec.judul}
                    </h3>
                    {sec.quote && (
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 line-clamp-2">
                        &ldquo;{sec.quote}&rdquo;
                      </p>
                    )}
                    {sec.narasi && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {sec.narasi}
                      </p>
                    )}
                  </div>
                </div>

                {(canEdit || canDelete) && (
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-end gap-2">
                    {canEdit && (
                      <button
                        type="button"
                        disabled={isTableMissing}
                        onClick={() => {
                          setEditingSection(sec);
                          setIsSectionModalOpen(true);
                        }}
                        className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-40"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Ubah &amp; Foto</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        disabled={isTableMissing}
                        onClick={() => handleDeleteSection(sec)}
                        className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ModalFormAlbumMutakhorijin
        isOpen={isAlbumModalOpen}
        onClose={() => setIsAlbumModalOpen(false)}
        editingAlbum={editingAlbum}
        existingAlbums={sortedAlbums}
        onSave={handleSaveAlbum}
      />

      {activeAlbum && (
        <ModalFormSectionMutakhorijin
          isOpen={isSectionModalOpen}
          onClose={() => setIsSectionModalOpen(false)}
          albumId={activeAlbum.id}
          editingSection={editingSection}
          onSave={handleSaveSection}
        />
      )}
    </div>
  );
}
