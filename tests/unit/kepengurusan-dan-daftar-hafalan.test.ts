import { describe, it, expect } from 'vitest';
import {
  buildDaftarHafalanGroups,
  FALLBACK_PUBLIC_HAFALAN_PAYLOAD,
  parseJenjangSlug,
} from '@/lib/utils/daftarHafalanPublicHelper';
import {
  SEED_KEPENGURUSAN_JABATAN,
  SEED_KEPENGURUSAN_PERIODE,
} from '@/types/kepengurusan';
import { resolvePageIdFromPathname } from '@/lib/utils/rbacHelper';

describe('Kepengurusan & Daftar Hafalan Public Helpers', () => {
  it('1. resolves RBAC Page ID /kelola-kepengurusan', () => {
    expect(resolvePageIdFromPathname('/kelola-kepengurusan')).toBe('kelola-kepengurusan');
  });

  it('2. seed kepengurusan memiliki periode 1446-1447 H / 2025-2026 M dan data Putra & Putri', () => {
    expect(SEED_KEPENGURUSAN_PERIODE[0].nama_periode).toContain('1446-1447 H');
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

  it('3. parseJenjangSlug memetakan ula, wustho, ulya dengan fallback aman', () => {
    expect(parseJenjangSlug('ula')).toBe('ula');
    expect(parseJenjangSlug('WUSTHO')).toBe('wustho');
    expect(parseJenjangSlug('ulya')).toBe('ulya');
    expect(parseJenjangSlug('lainnya')).toBe('ula');
  });

  it('4. buildDaftarHafalanGroups mengelompokkan ULA, WUSTHO, ULYA tanpa data tahfidz', () => {
    const ula = buildDaftarHafalanGroups(FALLBACK_PUBLIC_HAFALAN_PAYLOAD, 'ula');
    const wustho = buildDaftarHafalanGroups(FALLBACK_PUBLIC_HAFALAN_PAYLOAD, 'wustho');
    const ulya = buildDaftarHafalanGroups(FALLBACK_PUBLIC_HAFALAN_PAYLOAD, 'ulya');

    expect(ula.map((g) => g.tingkatKey)).toEqual(['ULA_1', 'ULA_2', 'ULA_3', 'ULA_4']);
    expect(wustho.map((g) => g.tingkatKey)).toEqual(['WUSTHO_1', 'WUSTHO_2']);
    expect(ulya.map((g) => g.tingkatKey)).toEqual(['ULYA_1', 'ULYA_2']);
    expect(ula[0].items[0].kategori).toBe('Wajib');
  });
});
