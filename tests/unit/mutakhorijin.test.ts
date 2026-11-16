import { describe, it, expect } from 'vitest';
import {
  getAlbumSlug,
  getPublicNavbarAlbums,
  MutakhorijinAlbum,
  sanitizeMutakhorijinPhotoUrl,
  SEED_MUTAKHORIJIN_ALBUMS,
  SEED_MUTAKHORIJIN_SECTIONS,
  slugifyMutakhorijinAlbum,
} from '@/types/mutakhorijin';
import { resolvePageIdFromPathname } from '@/lib/utils/rbacHelper';

describe('Mutakhorijin Album Kenangan Helpers & RBAC', () => {
  it('1. resolves RBAC Page ID /kelola-mutakhorijin', () => {
    expect(resolvePageIdFromPathname('/kelola-mutakhorijin')).toBe('kelola-mutakhorijin');
  });

  it('2. seed awal memiliki Tsuroya (Angkatan 2026) dengan tipe dossier & postcard', () => {
    expect(SEED_MUTAKHORIJIN_ALBUMS[0].nama_angkatan).toBe('Tsuroya');
    expect(SEED_MUTAKHORIJIN_ALBUMS[0].caption_angkatan).toBe('Angkatan 2026');
    expect(SEED_MUTAKHORIJIN_ALBUMS[0].slug).toBe('tsuroya-2026');
    expect(SEED_MUTAKHORIJIN_ALBUMS[0].is_current).toBe(true);

    expect(SEED_MUTAKHORIJIN_SECTIONS.some((s) => s.section_type === 'dossier')).toBe(true);
    expect(SEED_MUTAKHORIJIN_SECTIONS.some((s) => s.section_type === 'postcard')).toBe(true);
  });

  it('3. getPublicNavbarAlbums membatasi maksimal 5 tahun angkatan terakhir dan angkatan sekarang paling atas', () => {
    const sample: MutakhorijinAlbum[] = [2020, 2021, 2022, 2023, 2024, 2025, 2026].map((year) => ({
      id: `alb-${year}`,
      nama_angkatan: year === 2026 ? 'Tsuroya' : `Angkatan ${year}`,
      caption_angkatan: `Angkatan ${year}`,
      tahun_angkatan: year,
      slug: `angkatan-${year}`,
      hero_title: `ANGKATAN ${year}`,
      hero_subtitle: '',
      hero_quote: '',
      hero_image_url: '',
      footer_note: '',
      sort_order: 10,
      is_current: year === 2026,
      is_active: year !== 2024, // 2024 disembunyikan
    }));

    const top5 = getPublicNavbarAlbums(sample, 5);
    expect(top5).toHaveLength(5);
    expect(top5.map((a) => a.tahun_angkatan)).toEqual([2026, 2025, 2023, 2022, 2021]);
    expect(top5[0].nama_angkatan).toBe('Tsuroya');
  });

  it('4. slugifyMutakhorijinAlbum, getAlbumSlug, dan sanitizeMutakhorijinPhotoUrl aman', () => {
    expect(slugifyMutakhorijinAlbum('Tsuroya', 2026)).toBe('tsuroya-2026');
    expect(
      getAlbumSlug({
        id: '1',
        slug: '',
        nama_angkatan: 'Al-Fajr',
        tahun_angkatan: 2025,
      })
    ).toBe('al-fajr-2025');

    expect(
      sanitizeMutakhorijinPhotoUrl(
        'https://rdeaouthjemxggvutctl.supabase.co/storage/v1/object/public/madin-media/mutakhorijin/hero.jpg'
      )
    ).toContain('https://');
    expect(sanitizeMutakhorijinPhotoUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe(
      'data:image/jpeg;base64,/9j/4AAQ'
    );
    expect(sanitizeMutakhorijinPhotoUrl('javascript:alert(1)')).toBe('');
  });
});
