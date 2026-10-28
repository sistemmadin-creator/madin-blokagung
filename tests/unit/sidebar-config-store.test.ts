import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSidebarConfigStore, DEFAULT_SIDEBAR_GROUPS } from '@/stores/useSidebarConfigStore';

describe('useSidebarConfigStore Unit Tests (Fase 1 & Fase 2)', () => {
  beforeEach(() => {
    useSidebarConfigStore.getState().resetToDefault();
  });

  it('1. menginisialisasi grup default dengan susunan standar', () => {
    const groups = useSidebarConfigStore.getState().groups;
    expect(groups.length).toBe(DEFAULT_SIDEBAR_GROUPS.length);

    const groupNames = groups.map((g) => g.group);
    expect(groupNames).toContain('Beranda');
    expect(groupNames).toContain('Utama');
    expect(groupNames).toContain('PKM. Kurikulum');
    expect(groupNames).toContain('PKM. Muhafadzoh');
    expect(groupNames).toContain('PKM. Kesiswaan');
    expect(groupNames).toContain('PKM. Publikasi & Warta');
    expect(groupNames).toContain('Pengaturan');

    // Posisi Pengaturan berada setelah PKM. Publikasi & Warta
    const idxPublikasi = groupNames.indexOf('PKM. Publikasi & Warta');
    const idxPengaturan = groupNames.indexOf('Pengaturan');
    expect(idxPengaturan).toBeGreaterThan(idxPublikasi);
  });

  it('2. mengubah nama grup dengan renameGroup', () => {
    useSidebarConfigStore.getState().renameGroup('grp-kurikulum', 'Bidang Kurikulum Pesantren');
    const groups = useSidebarConfigStore.getState().groups;
    const kurikulumGroup = groups.find((g) => g.id === 'grp-kurikulum');
    expect(kurikulumGroup?.group).toBe('Bidang Kurikulum Pesantren');
  });

  it('3. mengubah nama menu item dengan renameItem', () => {
    useSidebarConfigStore.getState().renameItem('grp-utama', 'item-santri', 'Database Santri Aktif');
    const groups = useSidebarConfigStore.getState().groups;
    const utamaGroup = groups.find((g) => g.id === 'grp-utama');
    const santriItem = utamaGroup?.items.find((i) => i.id === 'item-santri');
    expect(santriItem?.title).toBe('Database Santri Aktif');
  });

  it('4. mengubah nama sub-menu anak dengan renameSubItem (Fase 2)', () => {
    useSidebarConfigStore
      .getState()
      .renameSubItem('grp-kurikulum', 'item-jadwal-kbm', 'sub-jadwal-kelas', 'Jadwal Kuliah Syari');

    const kurikulumGroup = useSidebarConfigStore
      .getState()
      .groups.find((g) => g.id === 'grp-kurikulum');
    const jadwalItem = kurikulumGroup?.items.find((i) => i.id === 'item-jadwal-kbm');
    const subItem = jadwalItem?.children?.find((s) => s.id === 'sub-jadwal-kelas');
    expect(subItem?.title).toBe('Jadwal Kuliah Syari');
  });

  it('5. menyembunyikan dan menampilkan kembali grup via toggleGroupVisibility (Fase 2)', () => {
    // Awalnya tidak hidden
    let publikasi = useSidebarConfigStore
      .getState()
      .groups.find((g) => g.id === 'grp-publikasi');
    expect(publikasi?.hidden).toBeFalsy();

    // Toggle sembunyikan
    useSidebarConfigStore.getState().toggleGroupVisibility('grp-publikasi');
    publikasi = useSidebarConfigStore
      .getState()
      .groups.find((g) => g.id === 'grp-publikasi');
    expect(publikasi?.hidden).toBe(true);

    // Toggle tampilkan kembali
    useSidebarConfigStore.getState().toggleGroupVisibility('grp-publikasi');
    publikasi = useSidebarConfigStore
      .getState()
      .groups.find((g) => g.id === 'grp-publikasi');
    expect(publikasi?.hidden).toBe(false);
  });

  it('6. menyembunyikan dan menampilkan item menu via toggleItemVisibility (Fase 2)', () => {
    useSidebarConfigStore.getState().toggleItemVisibility('grp-utama', 'item-santri');
    const santriItem = useSidebarConfigStore
      .getState()
      .groups.find((g) => g.id === 'grp-utama')
      ?.items.find((i) => i.id === 'item-santri');
    expect(santriItem?.hidden).toBe(true);
  });

  it('7. memindahkan item menu ke grup lain via moveItemToGroup (Fase 2)', () => {
    // Pindahkan item-santri dari 'grp-utama' ke 'grp-beranda'
    useSidebarConfigStore.getState().moveItemToGroup('grp-utama', 'grp-beranda', 'item-santri');

    const beranda = useSidebarConfigStore.getState().groups.find((g) => g.id === 'grp-beranda');
    const utama = useSidebarConfigStore.getState().groups.find((g) => g.id === 'grp-utama');

    expect(beranda?.items.some((i) => i.id === 'item-santri')).toBe(true);
    expect(utama?.items.some((i) => i.id === 'item-santri')).toBe(false);
  });

  it('8. memindahkan peletakan grup naik dan turun dengan moveGroup', () => {
    useSidebarConfigStore.getState().moveGroup('grp-utama', 'up');
    const updatedGroups = useSidebarConfigStore.getState().groups;
    expect(updatedGroups[0].id).toBe('grp-utama');
    expect(updatedGroups[1].id).toBe('grp-beranda');
  });

  it('9. mengembalikan konfigurasi ke kondisi bawaan dengan resetToDefault', () => {
    useSidebarConfigStore.getState().renameGroup('grp-beranda', 'Beranda Baru');
    expect(useSidebarConfigStore.getState().isCustomized()).toBe(true);

    useSidebarConfigStore.getState().resetToDefault();
    expect(useSidebarConfigStore.getState().groups[0].group).toBe('Beranda');
    expect(useSidebarConfigStore.getState().isCustomized()).toBe(false);
  });
});
