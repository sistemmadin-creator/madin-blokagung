import { describe, it, expect } from 'vitest';
import {
  buildDaftarHafalanGroups,
  FALLBACK_PUBLIC_HAFALAN_PAYLOAD,
  parseJenjangSlug,
} from '@/lib/utils/daftarHafalanPublicHelper';
import {
  getPeriodeMenuLabel,
  getPeriodeSlug,
  getPublicNavbarPeriodes,
  KepengurusanPeriode,
  sanitizeMemberPhotoUrl,
  SEED_KEPENGURUSAN_JABATAN,
  SEED_KEPENGURUSAN_PERIODE,
  slugifyPeriode,
} from '@/types/kepengurusan';
import { resolvePageIdFromPathname } from '@/lib/utils/rbacHelper';

describe('Kepengurusan & Daftar Hafalan Public Helpers', () => {
  it('1. resolves RBAC Page ID /kelola-kepengurusan', () => {
    expect(resolvePageIdFromPathname('/kelola-kepengurusan')).toBe('kelola-kepengurusan');
  });

  it('2. seed kepengurusan memiliki periode berjalan 2026-2027, arsip 2025-2026, dan data Putra & Putri', () => {
    expect(SEED_KEPENGURUSAN_PERIODE[0].nama_periode).toContain('2026-2027');
    expect(SEED_KEPENGURUSAN_PERIODE[0].is_current).toBe(true);
    expect(
      SEED_KEPENGURUSAN_PERIODE.some(
        (p) => p.nama_periode.includes('1446-1447 H') && p.is_current === false
      )
    ).toBe(true);

    const putraOnly = SEED_KEPENGURUSAN_JABATAN.filter((j) => j.kategori_bagian === 'putra');
    const putriOnly = SEED_KEPENGURUSAN_JABATAN.filter((j) => j.kategori_bagian === 'putri');
    const bersama = SEED_KEPENGURUSAN_JABATAN.filter((j) => j.kategori_bagian === 'bersama');

    expect(putraOnly.length).toBeGreaterThan(0);
    expect(putriOnly.length).toBeGreaterThan(0);
    expect(bersama.length).toBeGreaterThan(0);
    expect(
      SEED_KEPENGURUSAN_JABATAN.some((j) => j.nama_jabatan === 'PKM. TATA USAHA')
    ).toBe(true);
    expect(
      SEED_KEPENGURUSAN_JABATAN.some((j) => j.nama_jabatan === 'KOOR. UNGGULAN')
    ).toBe(true);
  });

  it('3. getPublicNavbarPeriodes membatasi maksimal 3 periode aktif dengan periode sekarang di urutan paling atas', () => {
    const sample: KepengurusanPeriode[] = [
      {
        id: 'p-2023',
        nama_periode: '1444-1445 H / 2023-2024 M',
        slug: '2023-2024',
        menu_label: 'Kepengurusan 2023-2024',
        catatan: '',
        sort_order: 40,
        is_current: false,
        is_active: true,
      },
      {
        id: 'p-2024',
        nama_periode: '1445-1446 H / 2024-2025 M',
        slug: '2024-2025',
        menu_label: 'Kepengurusan 2024-2025',
        catatan: '',
        sort_order: 30,
        is_current: false,
        is_active: true,
      },
      {
        id: 'p-2025',
        nama_periode: '1446-1447 H / 2025-2026 M',
        slug: '2025-2026',
        menu_label: 'Kepengurusan 2025-2026',
        catatan: '',
        sort_order: 20,
        is_current: false,
        is_active: true,
      },
      {
        id: 'p-hidden',
        nama_periode: '1443-1444 H / 2022-2023 M',
        slug: '2022-2023',
        menu_label: 'Kepengurusan 2022-2023',
        catatan: '',
        sort_order: 5,
        is_current: false,
        is_active: false,
      },
      {
        id: 'p-2026',
        nama_periode: '1447-1448 H / 2026-2027 M',
        slug: '2026-2027',
        menu_label: 'Kepengurusan 2026-2027',
        catatan: '',
        sort_order: 10,
        is_current: true,
        is_active: true,
      },
    ];

    const top3 = getPublicNavbarPeriodes(sample, 3);
    expect(top3).toHaveLength(3);
    expect(top3.map((p) => p.slug)).toEqual(['2026-2027', '2025-2026', '2024-2025']);
    expect(top3[0].is_current).toBe(true);
  });

  it('4. slugifyPeriode, getPeriodeSlug, getPeriodeMenuLabel, dan sanitizeMemberPhotoUrl aman', () => {
    expect(slugifyPeriode('1447-1448 H / 2026-2027 M')).toBe('2026-2027');
    expect(getPeriodeSlug({ id: 'abc', nama_periode: '1447-1448 H / 2026-2027 M' })).toBe('2026-2027');
    expect(getPeriodeMenuLabel({ nama_periode: '1447-1448 H / 2026-2027 M' })).toBe('Kepengurusan 2026-2027');

    expect(sanitizeMemberPhotoUrl('https://rdeaouthjemxggvutctl.supabase.co/storage/v1/object/public/madin-media/kepengurusan/a.jpg')).toContain('https://');
    expect(sanitizeMemberPhotoUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe('data:image/jpeg;base64,/9j/4AAQ');
    expect(sanitizeMemberPhotoUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeMemberPhotoUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBe('');
  });

  it('5. parseJenjangSlug memetakan ula, wustho, ulya dengan fallback aman', () => {
    expect(parseJenjangSlug('ula')).toBe('ula');
    expect(parseJenjangSlug('WUSTHO')).toBe('wustho');
    expect(parseJenjangSlug('ulya')).toBe('ulya');
    expect(parseJenjangSlug('lainnya')).toBe('ula');
  });

  it('6. buildDaftarHafalanGroups mengelompokkan ULA, WUSTHO, ULYA tanpa data tahfidz', () => {
    const ula = buildDaftarHafalanGroups(FALLBACK_PUBLIC_HAFALAN_PAYLOAD, 'ula');
    const wustho = buildDaftarHafalanGroups(FALLBACK_PUBLIC_HAFALAN_PAYLOAD, 'wustho');
    const ulya = buildDaftarHafalanGroups(FALLBACK_PUBLIC_HAFALAN_PAYLOAD, 'ulya');

    expect(ula.map((g) => g.tingkatKey)).toEqual(['ULA_1', 'ULA_2', 'ULA_3', 'ULA_4']);
    expect(wustho.map((g) => g.tingkatKey)).toEqual(['WUSTHO_1', 'WUSTHO_2']);
    expect(ulya.map((g) => g.tingkatKey)).toEqual(['ULYA_1', 'ULYA_2']);
    expect(ula[0].items[0].kategori).toBe('Wajib');
  });
});
