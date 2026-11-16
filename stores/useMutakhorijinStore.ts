import { create } from 'zustand';
import {
  MutakhorijinAlbum,
  MutakhorijinPhotoItem,
  MutakhorijinSection,
  sanitizeMutakhorijinPhotoUrl,
  SEED_MUTAKHORIJIN_ALBUMS,
  SEED_MUTAKHORIJIN_SECTIONS,
  slugifyMutakhorijinAlbum,
  sortAlbumsForDisplay,
} from '@/types/mutakhorijin';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { BUCKET_NAME, StorageService } from '@/lib/services/storageService';

const LS_ALBUM_CACHE = 'madina_mutakhorijin_albums_v1';
const LS_SECTION_CACHE = 'madina_mutakhorijin_sections_v1';

function normalizePhotoArray(raw: unknown): MutakhorijinPhotoItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, idx) => {
      const url = sanitizeMutakhorijinPhotoUrl(typeof item.url === 'string' ? item.url : '');
      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id : `foto-${idx + 1}`,
        url,
        caption: typeof item.caption === 'string' ? item.caption : '',
      };
    })
    .filter((p) => p.url.length > 0);
}

async function resolvePhotoUrl(
  rawUrl: string | undefined,
  folderKey: string,
  prevUrl?: string
): Promise<string> {
  const clean = sanitizeMutakhorijinPhotoUrl(rawUrl);
  let finalUrl = clean;

  if (clean && clean.startsWith('data:image/')) {
    const uploaded = await StorageService.uploadPhoto(
      clean,
      'mutakhorijin',
      folderKey,
      String(Date.now())
    );
    finalUrl = sanitizeMutakhorijinPhotoUrl(uploaded || clean);
  }

  if (prevUrl && prevUrl.includes(BUCKET_NAME) && prevUrl !== finalUrl) {
    void StorageService.deletePhoto(prevUrl);
  }

  return finalUrl;
}

async function resolveGalleryPhotos(
  photos: MutakhorijinPhotoItem[],
  albumId: string,
  sectionKey: string,
  prevPhotos: MutakhorijinPhotoItem[] = []
): Promise<MutakhorijinPhotoItem[]> {
  const resolved: MutakhorijinPhotoItem[] = [];

  for (let i = 0; i < photos.length; i++) {
    const item = photos[i];
    const cleanUrl = sanitizeMutakhorijinPhotoUrl(item.url);
    if (!cleanUrl) continue;

    let finalUrl = cleanUrl;
    if (cleanUrl.startsWith('data:image/')) {
      const uploaded = await StorageService.uploadPhoto(
        cleanUrl,
        'mutakhorijin',
        `${albumId}_${sectionKey}_${item.id || `g_${i + 1}`}`,
        String(Date.now())
      );
      finalUrl = sanitizeMutakhorijinPhotoUrl(uploaded || cleanUrl);
    }

    resolved.push({
      id: item.id || `foto-${Date.now()}-${i + 1}`,
      url: finalUrl,
      caption: item.caption?.trim() || '',
    });
  }

  const nextUrls = new Set(resolved.map((p) => p.url));
  for (const prev of prevPhotos) {
    if (prev.url && prev.url.includes(BUCKET_NAME) && !nextUrls.has(prev.url)) {
      void StorageService.deletePhoto(prev.url);
    }
  }

  return resolved;
}

export type CreateAlbumPayload = Omit<
  MutakhorijinAlbum,
  'id' | 'created_at' | 'updated_at'
>;
export type UpdateAlbumPayload = Partial<CreateAlbumPayload>;

export type CreateSectionPayload = Omit<
  MutakhorijinSection,
  'id' | 'created_at' | 'updated_at'
>;
export type UpdateSectionPayload = Partial<CreateSectionPayload>;

interface MutakhorijinState {
  albums: MutakhorijinAlbum[];
  sections: MutakhorijinSection[];
  isLoading: boolean;
  isTableMissing: boolean;
  hasFetched: boolean;
  error: string | null;

  fetchMutakhorijin: (includeInactive?: boolean) => Promise<void>;
  createAlbum: (payload: CreateAlbumPayload) => Promise<MutakhorijinAlbum | null>;
  updateAlbum: (id: string, updates: UpdateAlbumPayload) => Promise<boolean>;
  deleteAlbum: (id: string) => Promise<boolean>;

  createSection: (payload: CreateSectionPayload) => Promise<boolean>;
  updateSection: (id: string, updates: UpdateSectionPayload) => Promise<boolean>;
  deleteSection: (id: string) => Promise<boolean>;
}

function saveLocalCache(albums: MutakhorijinAlbum[], sections: MutakhorijinSection[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_ALBUM_CACHE, JSON.stringify(albums));
    localStorage.setItem(LS_SECTION_CACHE, JSON.stringify(sections));
  } catch {
    // Ignore storage quota issues
  }
}

export const useMutakhorijinStore = create<MutakhorijinState>((set, get) => ({
  albums: SEED_MUTAKHORIJIN_ALBUMS,
  sections: SEED_MUTAKHORIJIN_SECTIONS,
  isLoading: false,
  isTableMissing: false,
  hasFetched: false,
  error: null,

  fetchMutakhorijin: async (includeInactive = false) => {
    set({ isLoading: true, error: null });

    if (typeof window !== 'undefined') {
      try {
        const cachedA = localStorage.getItem(LS_ALBUM_CACHE);
        const cachedS = localStorage.getItem(LS_SECTION_CACHE);
        if (cachedA && cachedS) {
          const parsedA = JSON.parse(cachedA) as MutakhorijinAlbum[];
          const parsedS = JSON.parse(cachedS) as MutakhorijinSection[];
          if (Array.isArray(parsedA) && parsedA.length > 0 && Array.isArray(parsedS)) {
            const filteredA = includeInactive
              ? parsedA
              : parsedA.filter((a) => a.is_active !== false);
            set({
              albums: sortAlbumsForDisplay(filteredA),
              sections: parsedS.map((s) => ({
                ...s,
                galeri_foto: normalizePhotoArray(s.galeri_foto),
              })),
            });
          }
        }
      } catch {
        // Ignore corrupt local cache
      }
    }

    try {
      let albumQuery = supabase
        .from('mutakhorijin_albums' as any)
        .select('*')
        .order('is_current', { ascending: false })
        .order('tahun_angkatan', { ascending: false })
        .order('sort_order', { ascending: true });

      if (!includeInactive) {
        albumQuery = albumQuery.eq('is_active', true);
      }

      let sectionQuery = supabase
        .from('mutakhorijin_sections' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!includeInactive) {
        sectionQuery = sectionQuery.eq('is_active', true);
      }

      const [{ data: aData, error: aErr }, { data: sData, error: sErr }] = await Promise.all([
        albumQuery,
        sectionQuery,
      ]);

      if (aErr || sErr) {
        const errObj = (aErr || sErr) as { code?: string; message?: string };
        const errMsg = String(errObj?.message || '');
        const isMissing =
          errObj?.code === '42P01' ||
          errObj?.code === 'PGRST205' ||
          errMsg.toLowerCase().includes('does not exist') ||
          errMsg.toLowerCase().includes('schema cache');

        set({
          isLoading: false,
          hasFetched: true,
          isTableMissing: isMissing,
          error: isMissing
            ? 'Tabel Mutakhorijin belum tersedia di database Supabase.'
            : errMsg || 'Gagal memuat album Mutakhorijin.',
        });
        return;
      }

      const rawAlbums = (aData || []) as unknown as MutakhorijinAlbum[];
      const albums = sortAlbumsForDisplay(rawAlbums);
      const sections = ((sData || []) as unknown as MutakhorijinSection[]).map((s) => ({
        ...s,
        foto_utama_url: sanitizeMutakhorijinPhotoUrl(s.foto_utama_url),
        galeri_foto: normalizePhotoArray(s.galeri_foto),
      }));

      if (albums.length > 0) {
        saveLocalCache(albums, sections);
        set({
          albums,
          sections,
          isLoading: false,
          hasFetched: true,
          isTableMissing: false,
          error: null,
        });
      } else {
        set({
          albums: includeInactive ? [] : SEED_MUTAKHORIJIN_ALBUMS,
          sections: includeInactive ? [] : SEED_MUTAKHORIJIN_SECTIONS,
          isLoading: false,
          hasFetched: true,
          isTableMissing: false,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat album Mutakhorijin.';
      set({ isLoading: false, hasFetched: true, error: msg });
    }
  },

  createAlbum: async (payload) => {
    try {
      if (payload.is_current) {
        await supabase
          .from('mutakhorijin_albums' as any)
          .update({ is_current: false, updated_at: new Date().toISOString() })
          .eq('is_current', true);
      }

      const cleanSlug = slugifyMutakhorijinAlbum(
        payload.slug || payload.nama_angkatan,
        payload.tahun_angkatan
      );
      const heroImg = await resolvePhotoUrl(payload.hero_image_url, `hero_${cleanSlug}`);

      const { data, error } = await supabase
        .from('mutakhorijin_albums' as any)
        .insert([
          {
            nama_angkatan: payload.nama_angkatan.trim(),
            caption_angkatan: payload.caption_angkatan.trim(),
            tahun_angkatan: Number(payload.tahun_angkatan) || 2026,
            slug: cleanSlug,
            hero_title: (payload.hero_title || payload.nama_angkatan).trim(),
            hero_subtitle: payload.hero_subtitle.trim(),
            hero_quote: payload.hero_quote.trim(),
            hero_image_url: heroImg,
            footer_note: payload.footer_note.trim(),
            sort_order: Number(payload.sort_order) || 0,
            is_current: payload.is_current,
            is_active: payload.is_active ?? true,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      await logActivity(
        'TAMBAH ALBUM MUTAKHORIJIN',
        `Menambahkan album ${payload.nama_angkatan} (${payload.caption_angkatan})`
      );
      await get().fetchMutakhorijin(true);
      return data as unknown as MutakhorijinAlbum;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan album angkatan.';
      set({ error: msg });
      return null;
    }
  },

  updateAlbum: async (id, updates) => {
    try {
      const existing = get().albums.find((a) => a.id === id);

      if (updates.is_current) {
        await supabase
          .from('mutakhorijin_albums' as any)
          .update({ is_current: false, updated_at: new Date().toISOString() })
          .eq('is_current', true)
          .neq('id', id);
      }

      const nextUpdates: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.nama_angkatan !== undefined) {
        nextUpdates.nama_angkatan = updates.nama_angkatan.trim();
      }
      if (updates.caption_angkatan !== undefined) {
        nextUpdates.caption_angkatan = updates.caption_angkatan.trim();
      }
      if (updates.slug !== undefined) {
        nextUpdates.slug = slugifyMutakhorijinAlbum(
          updates.slug,
          updates.tahun_angkatan ?? existing?.tahun_angkatan,
          id
        );
      }
      if (updates.hero_image_url !== undefined) {
        nextUpdates.hero_image_url = await resolvePhotoUrl(
          updates.hero_image_url,
          `hero_${id}`,
          existing?.hero_image_url
        );
      }

      const { error } = await supabase
        .from('mutakhorijin_albums' as any)
        .update(nextUpdates)
        .eq('id', id);

      if (error) throw error;

      await logActivity('UBAH ALBUM MUTAKHORIJIN', `Memperbarui album angkatan (${id})`);
      await get().fetchMutakhorijin(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui album angkatan.';
      set({ error: msg });
      return false;
    }
  },

  deleteAlbum: async (id) => {
    try {
      const targetAlbum = get().albums.find((a) => a.id === id);
      const relatedSections = get().sections.filter((s) => s.album_id === id);

      const { error } = await supabase
        .from('mutakhorijin_albums' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (targetAlbum?.hero_image_url?.includes(BUCKET_NAME)) {
        void StorageService.deletePhoto(targetAlbum.hero_image_url);
      }
      for (const sec of relatedSections) {
        if (sec.foto_utama_url?.includes(BUCKET_NAME)) {
          void StorageService.deletePhoto(sec.foto_utama_url);
        }
        for (const foto of sec.galeri_foto) {
          if (foto.url?.includes(BUCKET_NAME)) {
            void StorageService.deletePhoto(foto.url);
          }
        }
      }

      await logActivity('HAPUS ALBUM MUTAKHORIJIN', `Menghapus album angkatan (${id})`);
      await get().fetchMutakhorijin(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus album angkatan.';
      set({ error: msg });
      return false;
    }
  },

  createSection: async (payload) => {
    try {
      const sectionKey = `sec_${Date.now()}`;
      const fotoUtama = await resolvePhotoUrl(
        payload.foto_utama_url,
        `${payload.album_id}_${sectionKey}_main`
      );
      const galeri = await resolveGalleryPhotos(
        payload.galeri_foto || [],
        payload.album_id,
        sectionKey
      );

      const { error } = await supabase.from('mutakhorijin_sections' as any).insert([
        {
          album_id: payload.album_id,
          section_type: payload.section_type,
          judul: payload.judul.trim(),
          subjudul_label: payload.subjudul_label.trim(),
          quote: payload.quote.trim(),
          narasi: payload.narasi.trim(),
          foto_utama_url: fotoUtama,
          foto_utama_caption: payload.foto_utama_caption.trim(),
          galeri_foto: galeri,
          layout_align: payload.layout_align || 'auto',
          sort_order: Number(payload.sort_order) || 10,
          is_active: payload.is_active ?? true,
        },
      ]);

      if (error) throw error;

      await logActivity('TAMBAH BAB MUTAKHORIJIN', `Menambahkan blok "${payload.judul}"`);
      await get().fetchMutakhorijin(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan blok album.';
      set({ error: msg });
      return false;
    }
  },

  updateSection: async (id, updates) => {
    try {
      const existing = get().sections.find((s) => s.id === id);
      const albumId = updates.album_id || existing?.album_id || 'umum';
      const nextPayload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.judul !== undefined) {
        nextPayload.judul = updates.judul.trim();
      }
      if (updates.foto_utama_url !== undefined) {
        nextPayload.foto_utama_url = await resolvePhotoUrl(
          updates.foto_utama_url,
          `${albumId}_${id}_main`,
          existing?.foto_utama_url
        );
      }
      if (updates.galeri_foto !== undefined) {
        nextPayload.galeri_foto = await resolveGalleryPhotos(
          updates.galeri_foto,
          albumId,
          id,
          existing?.galeri_foto || []
        );
      }

      const { error } = await supabase
        .from('mutakhorijin_sections' as any)
        .update(nextPayload)
        .eq('id', id);

      if (error) throw error;

      await logActivity('UBAH BAB MUTAKHORIJIN', `Memperbarui blok album (${id})`);
      await get().fetchMutakhorijin(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui blok album.';
      set({ error: msg });
      return false;
    }
  },

  deleteSection: async (id) => {
    try {
      const existing = get().sections.find((s) => s.id === id);
      const { error } = await supabase
        .from('mutakhorijin_sections' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (existing) {
        if (existing.foto_utama_url?.includes(BUCKET_NAME)) {
          void StorageService.deletePhoto(existing.foto_utama_url);
        }
        for (const foto of existing.galeri_foto) {
          if (foto.url?.includes(BUCKET_NAME)) {
            void StorageService.deletePhoto(foto.url);
          }
        }
      }

      await logActivity('HAPUS BAB MUTAKHORIJIN', `Menghapus blok album (${id})`);
      await get().fetchMutakhorijin(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus blok album.';
      set({ error: msg });
      return false;
    }
  },
}));
