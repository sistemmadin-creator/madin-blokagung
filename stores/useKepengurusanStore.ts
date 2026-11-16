import { create } from 'zustand';
import {
  AnggotaKepengurusan,
  getPeriodeMenuLabel,
  KepengurusanJabatan,
  KepengurusanPeriode,
  sanitizeMemberPhotoUrl,
  SEED_KEPENGURUSAN_JABATAN,
  SEED_KEPENGURUSAN_PERIODE,
  slugifyPeriode,
  sortPeriodesForDisplay,
} from '@/types/kepengurusan';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { BUCKET_NAME, StorageService } from '@/lib/services/storageService';

const LS_PERIODE_CACHE = 'madina_kepengurusan_periode_v2';
const LS_JABATAN_CACHE = 'madina_kepengurusan_jabatan_v2';

function normalizeAnggotaArray(raw: unknown): AnggotaKepengurusan[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, idx) => {
      const fotoUrl = sanitizeMemberPhotoUrl(
        typeof item.foto_url === 'string' ? item.foto_url : ''
      );
      return {
        id: typeof item.id === 'string' && item.id.trim() ? item.id : `ang-${idx + 1}`,
        nama: typeof item.nama === 'string' ? item.nama : '',
        sub_label: typeof item.sub_label === 'string' ? item.sub_label : '',
        catatan: typeof item.catatan === 'string' ? item.catatan : '',
        ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      };
    })
    .filter((a) => a.nama.trim().length > 0);
}

async function resolveAnggotaPhotos(
  anggotaList: AnggotaKepengurusan[],
  periodeId: string,
  prevAnggotaList: AnggotaKepengurusan[] = []
): Promise<AnggotaKepengurusan[]> {
  const resolved: AnggotaKepengurusan[] = [];

  for (let i = 0; i < anggotaList.length; i++) {
    const item = anggotaList[i];
    const cleanFoto = sanitizeMemberPhotoUrl(item.foto_url);
    let finalFoto = cleanFoto;

    if (cleanFoto && cleanFoto.startsWith('data:image/')) {
      const uploaded = await StorageService.uploadPhoto(
        cleanFoto,
        'kepengurusan',
        `${periodeId}_${item.id || `ang_${i + 1}`}`,
        String(Date.now())
      );
      finalFoto = sanitizeMemberPhotoUrl(uploaded || cleanFoto);
    }

    resolved.push({
      id: item.id,
      nama: item.nama.trim(),
      sub_label: item.sub_label?.trim() || '',
      catatan: item.catatan?.trim() || '',
      ...(finalFoto ? { foto_url: finalFoto } : {}),
    });
  }

  // Hapus file foto lama di Supabase Storage yang sudah tidak dipakai
  const nextUrls = new Set(resolved.map((a) => a.foto_url).filter(Boolean));
  for (const prev of prevAnggotaList) {
    if (
      prev.foto_url &&
      prev.foto_url.includes(BUCKET_NAME) &&
      !nextUrls.has(prev.foto_url)
    ) {
      void StorageService.deletePhoto(prev.foto_url);
    }
  }

  return resolved;
}

export type CopyPeriodeMode = 'none' | 'with_members' | 'structure_only';

export interface CreatePeriodePayload {
  nama_periode: string;
  menu_label?: string;
  slug?: string;
  catatan?: string;
  sort_order?: number;
  is_current?: boolean;
  is_active?: boolean;
  copy_from_periode_id?: string;
  copy_mode?: CopyPeriodeMode;
}

export type UpdatePeriodePayload = Partial<
  Pick<
    KepengurusanPeriode,
    'nama_periode' | 'menu_label' | 'slug' | 'catatan' | 'sort_order' | 'is_current' | 'is_active'
  >
>;

interface KepengurusanState {
  periodes: KepengurusanPeriode[];
  jabatans: KepengurusanJabatan[];
  isLoading: boolean;
  isTableMissing: boolean;
  hasFetched: boolean;
  error: string | null;

  fetchKepengurusan: (includeInactive?: boolean) => Promise<void>;

  createPeriode: (payload: CreatePeriodePayload) => Promise<KepengurusanPeriode | null>;
  updatePeriode: (id: string, updates: UpdatePeriodePayload) => Promise<boolean>;
  deletePeriode: (id: string) => Promise<boolean>;

  createJabatan: (
    payload: Omit<KepengurusanJabatan, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<boolean>;
  updateJabatan: (
    id: string,
    updates: Partial<Omit<KepengurusanJabatan, 'id' | 'created_at' | 'updated_at'>>
  ) => Promise<boolean>;
  deleteJabatan: (id: string) => Promise<boolean>;
}

function saveLocalCache(periodes: KepengurusanPeriode[], jabatans: KepengurusanJabatan[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_PERIODE_CACHE, JSON.stringify(periodes));
    localStorage.setItem(LS_JABATAN_CACHE, JSON.stringify(jabatans));
  } catch {
    // Ignore storage quota issues
  }
}

export const useKepengurusanStore = create<KepengurusanState>((set, get) => ({
  periodes: SEED_KEPENGURUSAN_PERIODE,
  jabatans: SEED_KEPENGURUSAN_JABATAN,
  isLoading: false,
  isTableMissing: false,
  hasFetched: false,
  error: null,

  fetchKepengurusan: async (includeInactive = false) => {
    set({ isLoading: true, error: null });

    if (typeof window !== 'undefined') {
      try {
        const cachedP = localStorage.getItem(LS_PERIODE_CACHE);
        const cachedJ = localStorage.getItem(LS_JABATAN_CACHE);
        if (cachedP && cachedJ) {
          const parsedP = JSON.parse(cachedP) as KepengurusanPeriode[];
          const parsedJ = JSON.parse(cachedJ) as KepengurusanJabatan[];
          if (Array.isArray(parsedP) && parsedP.length > 0 && Array.isArray(parsedJ)) {
            const filteredCachedP = includeInactive
              ? parsedP
              : parsedP.filter((p) => p.is_active !== false);
            set({
              periodes: sortPeriodesForDisplay(filteredCachedP),
              jabatans: parsedJ.map((j) => ({
                ...j,
                anggota: normalizeAnggotaArray(j.anggota),
              })),
            });
          }
        }
      } catch {
        // Ignore corrupt local cache
      }
    }

    try {
      let periodeQuery = supabase
        .from('kepengurusan_periode' as any)
        .select('*')
        .order('is_current', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        periodeQuery = periodeQuery.eq('is_active', true);
      }

      let jabatanQuery = supabase
        .from('kepengurusan_jabatan' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!includeInactive) {
        jabatanQuery = jabatanQuery.eq('is_active', true);
      }

      const [{ data: pData, error: pErr }, { data: jData, error: jErr }] = await Promise.all([
        periodeQuery,
        jabatanQuery,
      ]);

      if (pErr || jErr) {
        const errObj = (pErr || jErr) as { code?: string; message?: string };
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
            ? 'Tabel kepengurusan belum tersedia di database Supabase.'
            : errMsg || 'Gagal memuat data kepengurusan.',
        });
        return;
      }

      const rawPeriodes = (pData || []) as unknown as KepengurusanPeriode[];
      const periodes = sortPeriodesForDisplay(rawPeriodes);
      const jabatans = ((jData || []) as unknown as KepengurusanJabatan[]).map((j) => ({
        ...j,
        anggota: normalizeAnggotaArray(j.anggota),
      }));

      if (periodes.length > 0) {
        saveLocalCache(periodes, jabatans);
        set({
          periodes,
          jabatans,
          isLoading: false,
          hasFetched: true,
          isTableMissing: false,
          error: null,
        });
      } else {
        set({
          periodes: includeInactive ? [] : SEED_KEPENGURUSAN_PERIODE,
          jabatans: includeInactive ? [] : SEED_KEPENGURUSAN_JABATAN,
          isLoading: false,
          hasFetched: true,
          isTableMissing: false,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat kepengurusan.';
      set({ isLoading: false, hasFetched: true, error: msg });
    }
  },

  createPeriode: async ({
    nama_periode,
    menu_label,
    slug,
    catatan = '',
    sort_order = 10,
    is_current = false,
    is_active = true,
    copy_from_periode_id,
    copy_mode = 'none',
  }) => {
    try {
      if (is_current) {
        await supabase
          .from('kepengurusan_periode' as any)
          .update({ is_current: false, updated_at: new Date().toISOString() })
          .eq('is_current', true);
      }

      const resolvedMenuLabel = getPeriodeMenuLabel({ nama_periode, menu_label });
      const resolvedSlug = slugifyPeriode(slug || resolvedMenuLabel || nama_periode);

      const { data, error } = await supabase
        .from('kepengurusan_periode' as any)
        .insert([
          {
            nama_periode: nama_periode.trim(),
            menu_label: resolvedMenuLabel,
            slug: resolvedSlug,
            catatan: catatan.trim(),
            sort_order: Number(sort_order) || 0,
            is_current,
            is_active,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      const createdPeriode = data as unknown as KepengurusanPeriode;

      // Salin struktur jabatan dari periode sebelumnya bila diminta admin
      if (copy_from_periode_id && copy_mode !== 'none') {
        const sourceJabatans = get()
          .jabatans.filter((j) => j.periode_id === copy_from_periode_id)
          .sort((a, b) => a.sort_order - b.sort_order);

        if (sourceJabatans.length > 0) {
          const cloneRows = sourceJabatans.map((j, jIdx) => {
            const clonedAnggota: AnggotaKepengurusan[] =
              copy_mode === 'with_members'
                ? j.anggota.map((ang, aIdx) => ({
                    ...ang,
                    id: `ang-${Date.now()}-${jIdx}-${aIdx}`,
                  }))
                : [];
            return {
              periode_id: createdPeriode.id,
              kelompok: j.kelompok,
              kategori_bagian: j.kategori_bagian,
              nama_jabatan: j.nama_jabatan,
              sort_order: j.sort_order,
              anggota: clonedAnggota,
              is_active: j.is_active,
            };
          });

          const { error: cloneErr } = await supabase
            .from('kepengurusan_jabatan' as any)
            .insert(cloneRows);

          if (cloneErr) {
            console.warn('[useKepengurusanStore] Gagal menyalin struktur jabatan:', cloneErr.message);
          }
        }
      }

      await logActivity('TAMBAH PERIODE KEPENGURUSAN', `Menambahkan periode ${nama_periode}`);
      await get().fetchKepengurusan(true);
      return createdPeriode;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan periode.';
      set({ error: msg });
      return null;
    }
  },

  updatePeriode: async (id, updates) => {
    try {
      if (updates.is_current) {
        await supabase
          .from('kepengurusan_periode' as any)
          .update({ is_current: false, updated_at: new Date().toISOString() })
          .eq('is_current', true)
          .neq('id', id);
      }

      const nextUpdates: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.nama_periode !== undefined) {
        nextUpdates.nama_periode = updates.nama_periode.trim();
      }
      if (updates.menu_label !== undefined) {
        nextUpdates.menu_label = updates.menu_label.trim();
      }
      if (updates.slug !== undefined) {
        nextUpdates.slug = slugifyPeriode(updates.slug, id);
      }
      if (updates.catatan !== undefined) {
        nextUpdates.catatan = updates.catatan.trim();
      }
      if (updates.sort_order !== undefined) {
        nextUpdates.sort_order = Number(updates.sort_order) || 0;
      }

      const { error } = await supabase
        .from('kepengurusan_periode' as any)
        .update(nextUpdates)
        .eq('id', id);

      if (error) throw error;

      await logActivity('UBAH PERIODE KEPENGURUSAN', `Memperbarui periode kepengurusan (${id})`);
      await get().fetchKepengurusan(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui periode.';
      set({ error: msg });
      return false;
    }
  },

  deletePeriode: async (id) => {
    try {
      const relatedJabatans = get().jabatans.filter((j) => j.periode_id === id);

      const { error } = await supabase
        .from('kepengurusan_periode' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Bersihkan foto di Storage milik periode yang dihapus (hanya jika tidak dipakai di periode lain)
      const remainingUrls = new Set(
        get()
          .jabatans.filter((j) => j.periode_id !== id)
          .flatMap((j) => j.anggota.map((a) => a.foto_url))
          .filter(Boolean)
      );

      for (const jab of relatedJabatans) {
        for (const ang of jab.anggota) {
          if (
            ang.foto_url &&
            ang.foto_url.includes(BUCKET_NAME) &&
            !remainingUrls.has(ang.foto_url)
          ) {
            void StorageService.deletePhoto(ang.foto_url);
          }
        }
      }

      await logActivity('HAPUS PERIODE KEPENGURUSAN', `Menghapus periode kepengurusan (${id})`);
      await get().fetchKepengurusan(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus periode.';
      set({ error: msg });
      return false;
    }
  },

  createJabatan: async (payload) => {
    try {
      const normalized = normalizeAnggotaArray(payload.anggota);
      const resolvedAnggota = await resolveAnggotaPhotos(normalized, payload.periode_id);

      const { error } = await supabase.from('kepengurusan_jabatan' as any).insert([
        {
          periode_id: payload.periode_id,
          kelompok: payload.kelompok,
          kategori_bagian: payload.kategori_bagian,
          nama_jabatan: payload.nama_jabatan.trim(),
          sort_order: Number(payload.sort_order) || 0,
          anggota: resolvedAnggota,
          is_active: payload.is_active ?? true,
        },
      ]);

      if (error) throw error;

      await logActivity('TAMBAH JABATAN KEPENGURUSAN', `Menambahkan ${payload.nama_jabatan}`);
      await get().fetchKepengurusan(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan unit jabatan.';
      set({ error: msg });
      return false;
    }
  },

  updateJabatan: async (id, updates) => {
    try {
      const existing = get().jabatans.find((j) => j.id === id);
      const nextPayload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.nama_jabatan !== undefined) {
        nextPayload.nama_jabatan = updates.nama_jabatan.trim();
      }
      if (updates.anggota !== undefined) {
        const normalized = normalizeAnggotaArray(updates.anggota);
        const periodeId = updates.periode_id || existing?.periode_id || 'umum';
        nextPayload.anggota = await resolveAnggotaPhotos(
          normalized,
          periodeId,
          existing?.anggota || []
        );
      }

      const { error } = await supabase
        .from('kepengurusan_jabatan' as any)
        .update(nextPayload)
        .eq('id', id);

      if (error) throw error;

      await logActivity('UBAH JABATAN KEPENGURUSAN', `Memperbarui unit jabatan (${id})`);
      await get().fetchKepengurusan(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui unit jabatan.';
      set({ error: msg });
      return false;
    }
  },

  deleteJabatan: async (id) => {
    try {
      const existing = get().jabatans.find((j) => j.id === id);
      const { error } = await supabase
        .from('kepengurusan_jabatan' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (existing) {
        const remainingUrls = new Set(
          get()
            .jabatans.filter((j) => j.id !== id)
            .flatMap((j) => j.anggota.map((a) => a.foto_url))
            .filter(Boolean)
        );
        for (const ang of existing.anggota) {
          if (
            ang.foto_url &&
            ang.foto_url.includes(BUCKET_NAME) &&
            !remainingUrls.has(ang.foto_url)
          ) {
            void StorageService.deletePhoto(ang.foto_url);
          }
        }
      }

      await logActivity('HAPUS JABATAN KEPENGURUSAN', `Menghapus unit jabatan (${id})`);
      await get().fetchKepengurusan(true);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus unit jabatan.';
      set({ error: msg });
      return false;
    }
  },
}));
