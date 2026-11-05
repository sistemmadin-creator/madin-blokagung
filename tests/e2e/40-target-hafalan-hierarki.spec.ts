import { test, expect } from '@playwright/test';

test.describe('Modul 05: Target Muhafadzoh & Item Hafalan Hierarkis', () => {
  test('Buka Modal Pengaturan Target, navigasi tabs, filter, dan verifikasi fitur hierarki', async ({ page }) => {
    await page.goto('/setoran');

    // 1. Klik tombol Opsi Hafalan untuk membuka modal pengaturan target
    const settingsBtn = page.getByRole('button', { name: /Opsi Hafalan|Target & Penjaga Bebas/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // 2. Verifikasi Dialog dan Header
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Pengaturan Target Muhafadzoh & Item Hafalan/i })).toBeVisible();

    // 3. Verifikasi Toolbar Hierarki ala Gambar 2
    await expect(dialog.getByText(/Tingkat > Item Hafalan > Target Capaian/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Visual', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /JSON \/ Cepat/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Buka Semua' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Tutup Semua' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Filter' })).toBeVisible();

    // 4. Verifikasi Mode JSON Cepat & kembali ke Visual
    const jsonBtn = dialog.getByRole('button', { name: /JSON \/ Cepat/i });
    await jsonBtn.click();
    await expect(dialog.locator('textarea')).toBeVisible();

    const visualBtn = dialog.getByRole('button', { name: 'Visual', exact: true });
    await visualBtn.click();
    await expect(dialog.locator('textarea')).not.toBeVisible();

    // 5. Verifikasi 4 Tab Utama
    await expect(dialog.getByRole('button', { name: 'Hafalan Wajib' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Hafalan Sunnah' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Hafalan Kitab' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Akses Penjaga' })).toBeVisible();

    // 6. Tutup Modal
    const cancelBtn = dialog.getByRole('button', { name: 'Batal' });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible();
  });
});
