import { create } from 'zustand';
import {
  AnggotaKepengurusan,
  KepengurusanJabatan,
  KepengurusanPeriode,
  SEED_KEPENGURUSAN_JABATAN,
  SEED_KEPENGURUSAN_PERIODE,
} from '@/types/kepengurusan';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

const LS_PERIODE_CACHE = 'madina_kepengurusan_periode_v1';
const LS_JABATAN_CACHE = 'madina_kepengurusan_jabatan_v1';

function normalizeAnggotaArray(raw: unknown): AnggotaKepengurusan[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item, idx) => ({
      id: typeof item.id === 'string' && item.id.trim() ? item.id : `ang-${idx + 1}`,
      nama: typeof item.nama === 'string' ? item.nama : '',
      sub_label: typeof item.sub_label === 'string' ? item.sub_label : '',
      catatan: typeof item.catatan === 'string' ? item.catatan : '',
    }))
    .filter((a) => a.nama.trim().length > 0);
}

interface KepengurusanState {
  periodes: KepengurusanPeriode[];
  jabatans: KepengurusanJabatan[];
  isLoading: boolean;
  isTableMissing: boolean;
  error: string | null;

  fetchKepengurusan: (includeInactive?: boolean) => Promise<void>;

  createPeriode: (payload: {
    nama_periode: string;
    catatan?: string;
    is_current?: boolean;
  }) => Promise<KepengurusanPeriode | null>;
  updatePeriode: (
    id: string,
    updates: Partial<Pick<KepengurusanPeriode, 'nama_periode' | 'catatan' | 'is_current' | 'is_active'>>
  ) => Promise<boolean>;
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
            set({
              periodes: parsedP,
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
          isTableMissing: isMissing,
          error: isMissing
            ? 'Tabel kepengurusan belum tersedia di database Supabase.'
            : errMsg || 'Gagal memuat data kepengurusan.',
        });
        return;
      }

      const periodes = ((pData || []) as unknown as KepengurusanPeriode[]);
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
          isTableMissing: false,
          error: null,
        });
      } else {
        set({
          periodes: SEED_KEPENGURUSAN_PERIODE,
          jabatans: SEED_KEPENGURUSAN_JABATAN,
          isLoading: false,
          isTableMissing: false,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat kepengurusan.';
      set({ isLoading: false, error: msg });
    }
  },

  createPeriode: async ({ nama_periode, catatan = '', is_current = false }) => {
    try {
      if (is_current) {
        await supabase
          .from('kepengurusan_periode' as any)
          .update({ is_current: false, updated_at: new Date().toISOString() })
          .neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data, error } = await supabase
        .from('kepengurusan_periode' as any)
        .insert([
          {
            nama_periode: nama_periode.trim(),
            catatan: catatan.trim(),
            is_current,
            is_active: true,
          },
        ])
        .select('*')
        .single();

      if (error) throw error;

      await logActivity('TAMBAH PERIODE KEPENGURUSAN', `Menambahkan periode ${nama_periode}`);
      await get().fetchKepengurusan(true);
      return data as unknown as KepengurusanPeriode;
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
          .neq('id', id);
      }

      const { error } = await supabase
        .from('kepengurusan_periode' as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
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
      const { error } = await supabase
        .from('kepengurusan_periode' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

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
      const cleanAnggota = normalizeAnggotaArray(payload.anggota);
      const { error } = await supabase.from('kepengurusan_jabatan' as any).insert([
        {
          periode_id: payload.periode_id,
          kelompok: payload.kelompok,
          kategori_bagian: payload.kategori_bagian,
          nama_jabatan: payload.nama_jabatan.trim(),
          sort_order: Number(payload.sort_order) || 0,
          anggota: cleanAnggota,
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
      const nextPayload: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.nama_jabatan !== undefined) {
        nextPayload.nama_jabatan = updates.nama_jabatan.trim();
      }
      if (updates.anggota !== undefined) {
        nextPayload.anggota = normalizeAnggotaArray(updates.anggota);
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
      const { error } = await supabase
        .from('kepengurusan_jabatan' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

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
