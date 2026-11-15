import { describe, it, expect, afterEach, vi } from 'vitest';
import { formatBeritaDateWib, getCurrentYearWib } from '@/lib/utils/beritaDateHelper';
import { SEED_BERITA, WartaBerita } from '@/types/berita';

describe('Berita Hydration & Deterministic WIB Date Formatter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('memformat timestamp lintas tengah malam UTC ke tanggal WIB secara konsisten', () => {
    // 19:00 UTC pada 25 Okt 2026 = 02:00 WIB pada 26 Okt 2026 (warta-003 di SEED_BERITA)
    expect(formatBeritaDateWib('2026-10-25T19:00:00Z', 'dayMonth')).toBe('26 Okt');
    expect(formatBeritaDateWib('2026-10-25T19:00:00Z', 'short')).toBe('26 Okt 2026');
    expect(formatBeritaDateWib('2026-10-25T19:00:00Z', 'longWithWeekday')).toBe(
      'Senin, 26 Oktober 2026'
    );

    // 20:00 UTC pada 19 Okt 2026 = 03:00 WIB pada 20 Okt 2026 (warta-009 di SEED_BERITA)
    expect(formatBeritaDateWib('2026-10-19T20:00:00Z', 'short')).toBe('20 Okt 2026');
    expect(formatBeritaDateWib('2026-10-19T20:00:00Z', 'longWithWeekday')).toBe(
      'Selasa, 20 Oktober 2026'
    );
  });

  it('menangani seluruh bulan Indonesia standar dan input kosong/tidak valid secara aman', () => {
    expect(formatBeritaDateWib('2026-08-17T03:00:00Z', 'short')).toBe('17 Agu 2026');
    expect(formatBeritaDateWib('2026-08-17T03:00:00Z', 'longWithWeekday')).toBe(
      'Senin, 17 Agustus 2026'
    );
    expect(formatBeritaDateWib(undefined)).toBe('-');
    expect(formatBeritaDateWib(null)).toBe('-');
    expect(formatBeritaDateWib('bukan-tanggal')).toBe('-');
  });

  it('menghitung pergantian tahun berbasis WIB (UTC+7)', () => {
    expect(getCurrentYearWib(Date.parse('2026-12-31T16:59:59Z'))).toBe(2026);
    expect(getCurrentYearWib(Date.parse('2026-12-31T17:00:00Z'))).toBe(2027);
  });

  it('useBeritaStore menginisialisasi posts dengan SEED_BERITA meski window & localStorage terisi cache berbeda', async () => {
    const cachedPost: WartaBerita = {
      ...SEED_BERITA[0],
      id: 'warta-db-only',
      slug: 'artikel-khusus-supabase-saja',
      title: 'Artikel Khusus Supabase Saja',
    };

    const storageMap = new Map<string, string>([
      ['madina_warta_berita_cache', JSON.stringify([cachedPost])],
    ]);

    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
    });
    vi.resetModules();

    const { useBeritaStore } = await import('@/stores/useBeritaStore');
    const initialState = useBeritaStore.getState();

    // State awal harus identik dengan SEED_BERITA agar SSR == hidrasi awal klien
    expect(initialState.posts).toEqual(SEED_BERITA);
    expect(initialState.posts.some((p) => p.slug === 'artikel-khusus-supabase-saja')).toBe(
      false
    );
  });
});
