import { test, expect } from '@playwright/test';

test.describe('Modul 03: Kurikulum & Akademik', () => {
  test('Formasi Kelas Master page, table and generator modal', async ({ page }) => {
    await page.goto('/formasi');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Madin/i }).first()).toBeVisible();

    // Verify Master Toolbar buttons
    await expect(page.locator('main').getByRole('link', { name: /Kelas Putra/i })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: /Kelas Putri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sembunyikan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter/i })).toBeVisible();

    const genBtn = page.getByRole('button', { name: /Generator/i });
    await expect(genBtn).toBeVisible();
    await genBtn.click();

    // Modal should show
    await expect(page.getByRole('heading', { name: /Generator Formasi Rombel Otomatis/i })).toBeVisible();

    // Close generator
    const closeBtn = page.getByRole('button', { name: /Batal/i });
    await closeBtn.click();
    await expect(page.getByRole('heading', { name: /Generator Formasi Rombel Otomatis/i })).toBeHidden();
  });

  test('Formasi Kelas PA page with official document view', async ({ page }) => {
    await page.goto('/formasi/pa');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Putra/i }).first()).toBeVisible();
    await expect(page.getByText('FORMASI RUANG DINIYYAH DAN TAKROR PUTRA').first()).toBeVisible();
    await expect(page.getByText('TAHUN AJARAN 2026-2027 M / 1447-1448 H').first()).toBeVisible();

    // Check action buttons: Export Excel & Print
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak \/ Print/i })).toBeVisible();

    // Check 2-level header
    await expect(page.locator('th', { hasText: 'LOKAL' }).first()).toBeVisible();
    await expect(page.locator('th', { hasText: 'TAKROR' }).first()).toBeVisible();
    await expect(page.locator('th', { hasText: 'DINIYYAH' }).first()).toBeVisible();
  });

  test('Formasi Kelas PI page and gender isolation', async ({ page }) => {
    await page.goto('/formasi/pi');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Putri/i }).first()).toBeVisible();
    await expect(page.getByText('FORMASI RUANG DINIYYAH DAN TAKROR PUTRI').first()).toBeVisible();
    await expect(page.getByText('TAHUN AJARAN 2026-2027 M / 1447-1448 H').first()).toBeVisible();

    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak \/ Print/i })).toBeVisible();
  });

  test('Fan Pelajaran page and modals', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    await expect(page.getByRole('heading', { name: /Fan Pelajaran/i }).first()).toBeVisible();

    // Verify action buttons
    await expect(page.getByRole('button', { name: /Atur Item Fan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Segarkan Data/i })).toBeVisible();
  });

  test('Pengajar Fan page and search', async ({ page }) => {
    await page.goto('/fan/pengajar');

    await expect(page.getByRole('heading', { name: /Pengajar Fan/i }).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Cari Kode \/ Nama \/ Fan/i)).toBeVisible();
  });

  test('Jadwal KBM matrix page and day columns', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    await expect(page.getByRole('heading', { name: /Jadwal KBM Per Kelas/i }).first()).toBeVisible();

    // Check table headers for 6 days matrix (SABTU to KAMIS)
    for (const day of ['SABTU', 'AHAD', 'SENIN', 'SELASA', 'RABU', 'KAMIS']) {
      await expect(page.locator('th', { hasText: day }).first()).toBeVisible();
    }
  });

  test('Hari KBM daily view', async ({ page }) => {
    await page.goto('/hari-kbm');

    await expect(page.getByRole('heading', { name: /Hari KBM/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sabtu/i }).first()).toBeVisible();
  });

  test('Daftar Pendidik dossier page', async ({ page }) => {
    await page.goto('/daftar-pendidik');

    await expect(page.getByRole('heading', { name: /Daftar Tenaga Pendidik/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Cari (nama pendidik|Kode \/ Nama)/i)).toBeVisible();
  });
});
