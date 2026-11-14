import { test, expect, Page } from '@playwright/test';

async function gotoWithAuth(page: Page, targetPath: string) {
  await page.goto(targetPath);
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/login')) {
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL(`**${targetPath}**`, { timeout: 60000 });
  }
}

test.describe('Navigation & System Shell', () => {
  test('root path / renders SPA Profil Madrasah cleanly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah Al-Amiriyyah/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pelajari Kurikulum & Khazanah Kitab/i })).toBeVisible();
  });

  test('sidebar displays brand identity and navigation menu items', async ({ page }) => {
    await gotoWithAuth(page, '/santri');

    // Brand title in sidebar & navbar
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText('Pusat Sistem')).toBeVisible();
    await expect(sidebar.getByText('Madrasah Diniyyah')).toHaveCount(0);
    await expect(page.getByText(/Madin Blokagung/i).first()).toBeVisible();

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

    // Settings link in sidebar footer (replaced Profil Madrasah)
    await expect(page.getByRole('complementary').getByRole('link', { name: /Profil Madrasah/i })).toHaveCount(0);
    const footerSettingsLink = page.getByRole('complementary').locator('a[href="/pengaturan"]').last();
    await expect(footerSettingsLink).toBeVisible();
    await expect(footerSettingsLink).toContainText(/Pengaturan/i);
  });

  test('sidebar toggle button navigates back on single click and toggles collapse on double click', async ({ page }) => {
    await gotoWithAuth(page, '/santri');
    await page.goto('/asatidz');
    await expect(page).toHaveURL(/\/asatidz/);

    const sidebar = page.getByRole('complementary');
    const toggleBtn = sidebar.getByRole('button', { name: /Klik 1x untuk kembali ke halaman sebelumnya/i });
    await expect(toggleBtn).toBeVisible();
    await expect(sidebar).toHaveClass(/w-\[260px\]/);

    // Double click should toggle collapse without navigating back
    await toggleBtn.dblclick();
    await expect(sidebar).toHaveClass(/w-\[88px\]/);
    await expect(page).toHaveURL(/\/asatidz/);

    // Double click again to expand
    await toggleBtn.dblclick();
    await expect(sidebar).toHaveClass(/w-\[260px\]/);

    // Single click should navigate back to /santri
    await toggleBtn.click();
    await page.waitForURL(/\/santri/);
    await expect(page).toHaveURL(/\/santri/);
  });

  test('navbar hierarchy builder modal opens and closes cleanly', async ({ page }) => {
    await page.goto('/santri');

    // Open profile menu pill
    await page.getByText(/Menu Profil/i).click();

    const hierarkiBtn = page.getByRole('button', { name: /Pusat Kendali Admin/i });
    await expect(hierarkiBtn).toBeVisible();
    await hierarkiBtn.click();

    // Modal should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Pengaturan Hierarki Dropdown/i })).toBeVisible();

    // Close button
    const closeBtn = dialog.getByRole('button', { name: /Tutup pengaturan hierarki|Batal/i }).or(dialog.locator('button:has-text("✕")')).first();
    await closeBtn.click();
    await expect(dialog).toBeHidden();
  });

  test('navbar audit logs modal opens and closes cleanly', async ({ page }) => {
    await page.goto('/santri');

    // Open profile menu pill
    await page.getByText(/Menu Profil/i).click();

    const auditBtn = page.getByRole('button', { name: /Log Aktivitas Sistem/i });
    await expect(auditBtn).toBeVisible();
    await auditBtn.click();

    // Modal should appear
    await expect(page.getByText(/Audit Log Aktivitas Sistem/i)).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('dialog').getByRole('button', { name: /Tutup dialog/i }).or(page.locator('button:has-text("✕")')).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(page.getByText(/Audit Log Aktivitas Sistem/i)).toBeHidden();
    }
  });
});
