import { test, expect } from '@playwright/test';

test.describe('Modul 05: Muhafadzoh & Piagam Studio', () => {
  test('Setoran Muhafadzoh page and settings modal', async ({ page }) => {
    await page.goto('/setoran');

    await expect(page.getByRole('heading', { name: /Setoran Muhafadzoh Madin/i })).toBeVisible();

    // Verify form exists
    await expect(page.getByRole('heading', { name: /Formulir Catat Setoran Baru/i })).toBeVisible();
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // Settings modal button
    const settingsBtn = page.getByRole('button', { name: /Target & Penjaga Bebas/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    await expect(page.getByRole('heading', { name: /Pengaturan Target Muhafadzoh/i })).toBeVisible();

    // Close settings modal
    const closeBtn = page.getByRole('button', { name: /Tutup|Batal/i }).or(page.locator('button:has-text("✕")')).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Rekap Hafalan page and progress overview', async ({ page }) => {
    await page.goto('/rekap-hafalan');

    await expect(page.getByRole('heading', { name: /Rekapitulasi Hafalan Pertingkatan/i })).toBeVisible();

    // Tingkat filter tabs
    await expect(page.getByRole('button', { name: /Semua Tingkat/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tingkat Ula/i })).toBeVisible();
  });

  test('Studio Piagam Kelulusan and coordinate inspector', async ({ page }) => {
    await page.goto('/piagam');

    await expect(page.getByRole('heading', { name: /Cetak Piagam \/ Syahadah Hafalan/i })).toBeVisible();

    // Certificate preview element must be present
    await expect(page.getByText(/Pondok Pesantren Darussalam Blokagung/i)).toBeVisible();

    // Coordinate panel
    await expect(page.getByRole('heading', { name: /Panel Pengaturan Piagam/i })).toBeVisible();

    // Print button
    await expect(page.getByRole('button', { name: /Cetak Piagam \(Print\)/i })).toBeVisible();
  });
});
