import { describe, it, expect, afterEach, vi } from 'vitest';
import { formatBeritaDateWib, getCurrentYearWib } from '@/lib/utils/beritaDateHelper';
import {
  SEED_BERITA,
  WartaBerita,
  getPostTopics,
  hasPostTopic,
  hasPostSubTopic,
  TOPIK_BERITA_ORDER,
  DEFAULT_SUB_TOPIK_MEDIA,
} from '@/types/berita';
import { parseSosmedUrl, buildSosmedEmbedUrl } from '@/lib/utils/sosmedEmbedHelper';

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

  it('mendukung 8 kategori topik berita termasuk Umum, Kegiatan, Event, dan Acara serta sub-kategorinya', () => {
    expect(TOPIK_BERITA_ORDER).toEqual([
      'umum',
      'kelas_unggulan',
      'tingkat_ula',
      'tingkat_wustho',
      'tingkat_ulya',
      'kegiatan',
      'event',
      'acara',
    ]);

    const multiPost: Pick<WartaBerita, 'topic' | 'topics' | 'sub_topics'> = {
      topic: 'umum',
      topics: ['umum', 'tingkat_ula', 'kegiatan'],
      sub_topics: ['sub-keg-uub', 'sub-keg-ebtadin'],
    };
    expect(getPostTopics(multiPost)).toEqual(['umum', 'tingkat_ula', 'kegiatan']);
    expect(hasPostTopic(multiPost, 'umum')).toBe(true);
    expect(hasPostTopic(multiPost, 'tingkat_ula')).toBe(true);
    expect(hasPostTopic(multiPost, 'kegiatan')).toBe(true);
    expect(hasPostTopic(multiPost, 'tingkat_ulya')).toBe(false);
    expect(hasPostTopic(multiPost, 'all')).toBe(true);
    expect(hasPostSubTopic(multiPost, 'sub-keg-uub')).toBe(true);
    expect(hasPostSubTopic(multiPost, 'sub-evt-seminar')).toBe(false);
    expect(hasPostSubTopic(multiPost, 'all')).toBe(true);

    expect(
      DEFAULT_SUB_TOPIK_MEDIA.filter((s) => s.parent_topic === 'kegiatan').map((s) => s.nama)
    ).toEqual(['UUB', 'Daur Awwal', 'Daur Tsani', 'EBTADIN', 'Lomba ITMAM']);
    expect(
      DEFAULT_SUB_TOPIK_MEDIA.filter((s) => s.parent_topic === 'event').map((s) => s.nama)
    ).toEqual(['Lalaran Kubro', 'Seminar', 'Diklat']);
    expect(
      DEFAULT_SUB_TOPIK_MEDIA.filter((s) => s.parent_topic === 'acara').map((s) => s.nama)
    ).toEqual(['APEL Daur Tsani', 'Imtihan']);
  });

  it('mem-parsing URL embed YouTube, Instagram, dan TikTok secara akurat untuk Galeri Sosmed', () => {
    const yt = parseSosmedUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk');
    expect(yt.isValid).toBe(true);
    expect(yt.platform).toBe('youtube');
    expect(yt.embedId).toBe('jfKfPfyJRdk');
    expect(yt.contentFormat).toBe('landscape');
    expect(yt.autoThumbnailUrl).toContain('jfKfPfyJRdk');

    const ytShorts = parseSosmedUrl('https://www.youtube.com/shorts/abc123XYZ');
    expect(ytShorts.isValid).toBe(true);
    expect(ytShorts.platform).toBe('youtube');
    expect(ytShorts.contentFormat).toBe('vertical');

    const igReel = parseSosmedUrl('https://www.instagram.com/reel/C8abc123xyz/');
    expect(igReel.isValid).toBe(true);
    expect(igReel.platform).toBe('instagram');
    expect(igReel.embedId).toBe('C8abc123xyz');
    expect(igReel.contentFormat).toBe('vertical');

    const tt = parseSosmedUrl('https://www.tiktok.com/@madinblokagung/video/7350000000000000001');
    expect(tt.isValid).toBe(true);
    expect(tt.platform).toBe('tiktok');
    expect(tt.embedId).toBe('7350000000000000001');
    expect(tt.contentFormat).toBe('vertical');
    expect(
      buildSosmedEmbedUrl({
        platform: 'tiktok',
        embed_id: '7350000000000000001',
        source_url: 'https://www.tiktok.com/@madinblokagung/video/7350000000000000001',
        content_format: 'vertical',
      })
    ).toContain('tiktok.com/player/v1/7350000000000000001');
  });
});
