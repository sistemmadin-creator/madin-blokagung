import { test, expect } from '@playwright/test';

test.describe('Modul 05: Muhafadzoh & Piagam Studio', () => {
  test('Setoran Muhafadzoh page and settings modal', async ({ page }) => {
    await page.goto('/setoran');

    await expect(page.getByRole('heading', { name: /Setoran/i }).first()).toBeVisible();

    // Verify form exists
    await expect(page.getByRole('heading', { name: /Input Hafalan/i })).toBeVisible();
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // Settings modal button
    const settingsBtn = page.getByRole('button', { name: /Opsi Hafalan|Target & Penjaga Bebas/i });
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

    await expect(page.getByRole('heading', { name: /Rekapitulasi Hafalan Pertingkatan/i }).first()).toBeVisible();

    // Mode buttons
    await expect(page.getByRole('button', { name: /Hafalan Wajib/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Hafalan Tahfidz/i })).toBeVisible();
  });

  test('Studio Piagam Kelulusan and coordinate inspector', async ({ page }) => {
    await page.goto('/piagam');

    await expect(page.getByRole('heading', { name: /Cetak Piagam/i }).first()).toBeVisible();

    // Certificate preview element must be present
    await expect(page.getByText(/MADRASAH DINIYYAH AL AMIRIYYAH BLOKAGUNG/i)).toBeVisible();

    // Coordinate panel
    await expect(page.getByRole('heading', { name: /Pengaturan Piagam/i }).first()).toBeVisible();

    // Print button
    await expect(page.getByRole('button', { name: /Print Piagam/i })).toBeVisible();
  });
});
