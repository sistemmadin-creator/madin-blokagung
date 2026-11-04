import { describe, it, expect } from 'vitest';
import {
  createDefaultPagePermissions,
  createDefaultSpecialAuthorities,
  canViewPage,
  canCreateOnPage,
  canEditOnPage,
  canDeleteOnPage,
  canAccessSettingsAuthority,
  isGenderAllowed,
  isBlokAllowed,
  isClassAllowedByAuthority,
} from '@/lib/utils/rbacHelper';
import { UserAccountRecord } from '@/types/rbac';

function makeMockAccount(overrides?: Partial<UserAccountRecord>): UserAccountRecord {
  return {
    id: '00000000-0000-0000-0000-000000000099',
    username: 'operator_blok1',
    email: 'operator_blok1@madinblokagung.local',
    full_name: 'Operator Blok 1',
    role: 'custom_user',
    role_label: 'Operator Asrama',
    is_active: true,
    page_permissions: createDefaultPagePermissions('edit'),
    special_authorities: createDefaultSpecialAuthorities(),
    ...overrides,
  };
}

describe('RBAC Helper - Layer 1 & Layer 2 Authorities', () => {
  it('grants full access to Master Admin regardless of page or special authorities', () => {
    const masterAdmin = makeMockAccount({
      role: 'master_admin',
      page_permissions: {
        ...createDefaultPagePermissions('edit'),
        santri: 'sembunyikan',
      },
      special_authorities: {
        blok_scope: ['Blok 1'],
        gender_scope: 'putra',
        pengaturan_status: 'non_aktif',
        hide_edit_pages: ['santri'],
        hide_delete_pages: ['santri'],
      },
    });

    expect(canViewPage(masterAdmin, 'santri')).toBe(true);
    expect(canCreateOnPage(masterAdmin, 'santri')).toBe(true);
    expect(canEditOnPage(masterAdmin, 'santri')).toBe(true);
    expect(canDeleteOnPage(masterAdmin, 'santri')).toBe(true);
    expect(canAccessSettingsAuthority(masterAdmin)).toBe(true);
  });

  it('enforces Layer 1 page_permissions (edit, baca, sembunyikan)', () => {
    const account = makeMockAccount({
      page_permissions: {
        ...createDefaultPagePermissions('edit'),
        santri: 'edit',
        asatidz: 'baca',
        formasi: 'sembunyikan',
      },
    });

    expect(canViewPage(account, 'santri')).toBe(true);
    expect(canCreateOnPage(account, 'santri')).toBe(true);
    expect(canEditOnPage(account, 'santri')).toBe(true);
    expect(canDeleteOnPage(account, 'santri')).toBe(true);

    expect(canViewPage(account, 'asatidz')).toBe(true);
    expect(canCreateOnPage(account, 'asatidz')).toBe(false);
    expect(canEditOnPage(account, 'asatidz')).toBe(false);
    expect(canDeleteOnPage(account, 'asatidz')).toBe(false);

    expect(canViewPage(account, 'formasi')).toBe(false);
    expect(canCreateOnPage(account, 'formasi')).toBe(false);
  });

  it('keeps Tambah/Create enabled while hiding Edit and Hapus when page is in hide_edit_pages and hide_delete_pages', () => {
    const account = makeMockAccount({
      page_permissions: {
        ...createDefaultPagePermissions('edit'),
        santri: 'edit',
      },
      special_authorities: {
        ...createDefaultSpecialAuthorities(),
        hide_edit_pages: ['santri'],
        hide_delete_pages: ['santri'],
      },
    });

    expect(canViewPage(account, 'santri')).toBe(true);
    expect(canCreateOnPage(account, 'santri')).toBe(true);
    expect(canEditOnPage(account, 'santri')).toBe(false);
    expect(canDeleteOnPage(account, 'santri')).toBe(false);
  });

  it('blocks centralized and in-page settings when pengaturan_status is non_aktif', () => {
    const account = makeMockAccount({
      special_authorities: {
        ...createDefaultSpecialAuthorities(),
        pengaturan_status: 'non_aktif',
      },
    });

    expect(canAccessSettingsAuthority(account)).toBe(false);
    expect(canViewPage(account, 'pengaturan')).toBe(false);
  });

  it('filters multi-select Blok and Gender scopes accurately', () => {
    expect(isBlokAllowed('Blok 1', 'SEMUA')).toBe(true);
    expect(isBlokAllowed('Blok 1', ['Blok 1', 'Blok 2'])).toBe(true);
    expect(isBlokAllowed('1', ['Blok 1', 'Blok 2'])).toBe(true);
    expect(isBlokAllowed('Blok 3', ['Blok 1', 'Blok 2'])).toBe(false);

    expect(isGenderAllowed('PA', 'semua')).toBe(true);
    expect(isGenderAllowed('PA', 'putra')).toBe(true);
    expect(isGenderAllowed('PI', 'putra')).toBe(false);
    expect(isGenderAllowed('PI', 'putri')).toBe(true);
  });

  it('filters class-based pages by class blok, santri blok, or wali kelas blok', () => {
    const account = makeMockAccount({
      special_authorities: {
        ...createDefaultSpecialAuthorities(),
        blok_scope: ['Blok 2'],
        gender_scope: 'putra',
      },
    });

    const santriPool = [
      { tingkat: 'ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PA', blok: 'Blok 2' },
      { tingkat: 'ULA', din_kls: '1', din_bag: 'B', pa_pi: 'PA', blok: 'Blok 5' },
    ];
    const asatidzPool = [
      {
        tingkat_asatidz: 'ULA',
        din_kls_asatidz: '1',
        din_bag_asatidz: 'C',
        pa_pi: 'PA',
        blok: 'Blok 2',
      },
    ];

    // Matches via santri in Blok 2
    expect(
      isClassAllowedByAuthority(
        { tingkat: 'ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PA' },
        account,
        santriPool,
        asatidzPool
      )
    ).toBe(true);

    // Matches via wali kelas in Blok 2
    expect(
      isClassAllowedByAuthority(
        { tingkat: 'ULA', din_kls: '1', din_bag: 'C', pa_pi: 'PA' },
        account,
        santriPool,
        asatidzPool
      )
    ).toBe(true);

    // Matches via direct class blok_diniyyah
    expect(
      isClassAllowedByAuthority(
        { tingkat: 'WUSTHO', din_kls: '2', din_bag: 'A', pa_pi: 'PA', blok_diniyyah: 'Blok 2' },
        account,
        santriPool,
        asatidzPool
      )
    ).toBe(true);

    // Rejected: wrong blok
    expect(
      isClassAllowedByAuthority(
        { tingkat: 'ULA', din_kls: '1', din_bag: 'B', pa_pi: 'PA', blok_diniyyah: 'Blok 5' },
        account,
        santriPool,
        asatidzPool
      )
    ).toBe(false);

    // Rejected: wrong gender
    expect(
      isClassAllowedByAuthority(
        { tingkat: 'ULA', din_kls: '1', din_bag: 'A', pa_pi: 'PI', blok_diniyyah: 'Blok 2' },
        account,
        santriPool,
        asatidzPool
      )
    ).toBe(false);
  });
});
