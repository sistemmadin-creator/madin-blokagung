import { test, expect } from '@playwright/test';

test.describe('Navigation & System Shell', () => {
  test('root path / redirects automatically to /santri', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/santri');
    await expect(page).toHaveURL(/\/santri/);
    await expect(page.getByRole('heading', { name: /Database Santri/i })).toBeVisible();
  });

  test('sidebar displays brand identity and navigation menu items', async ({ page }) => {
    await page.goto('/santri');

    // Brand title in navbar
    await expect(page.getByRole('heading', { name: /Madin Al Amiriyyah Blokagung/i })).toBeVisible();

    // Direct sidebar links
    const directLinks = [
      'Data Santri',
      'Data Asatidz',
      'Daftar Pendidik',
      'Setoran',
      'Rekap Hafalan',
      'Cetak Piagam',
      'Absensi Asatidz',
      'Absen Cepat',
      'Rekap Absensi',
    ];

    for (const title of directLinks) {
      await expect(page.getByRole('complementary').getByRole('link', { name: title })).toBeVisible();
    }

    // Submenu accordion buttons
    const submenuButtons = ['Jadwal KBM', 'Formasi Kelas', 'Fan Pelajaran'];
    for (const title of submenuButtons) {
      await expect(page.getByRole('complementary').getByRole('button', { name: title })).toBeVisible();
    }
  });

  test('navbar hierarchy builder modal opens and closes cleanly', async ({ page }) => {
    await page.goto('/santri');

    const hierarkiBtn = page.getByRole('button', { name: /Pengaturan Hierarki Sistem/i });
    await expect(hierarkiBtn).toBeVisible();
    await hierarkiBtn.click();

    // Modal should appear
    await expect(page.getByText(/Pengaturan Hierarki Kamar & Kelas Formal/i)).toBeVisible();

    // Close button
    const closeBtn = page.getByRole('button', { name: /Batal/i }).or(page.locator('button:has-text("✕")')).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(page.getByText(/Pengaturan Hierarki Kamar & Kelas Formal/i)).toBeHidden();
    }
  });

  test('navbar audit logs modal opens and closes cleanly', async ({ page }) => {
    await page.goto('/santri');

    const auditBtn = page.getByRole('button', { name: /Audit Log Aktivitas/i });
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();

    // Modal should appear
    await expect(page.getByText(/Audit Log Aktivitas Sistem/i)).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: /Batal/i }).or(page.locator('button:has-text("✕")')).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(page.getByText(/Audit Log Aktivitas Sistem/i)).toBeHidden();
    }
  });
});
