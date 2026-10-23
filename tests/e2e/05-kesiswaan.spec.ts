import { test, expect } from '@playwright/test';

test.describe('Modul 04: Kesiswaan & Presensi', () => {
  test('Presensi KBM page, hour tabs and holiday modal', async ({ page }) => {
    await page.goto('/absensi');

    await expect(page.getByRole('heading', { name: /Presensi KBM 4 Jam Asatidz/i })).toBeVisible();

    // Check hour buttons
    await expect(page.getByRole('button', { name: /Madin Sore.*Jam Ke-1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Madin Sore.*Jam Ke-2/i })).toBeVisible();

    // Holiday settings modal button
    const holidayBtn = page.getByRole('button', { name: /Atur Hari Libur/i });
    await expect(holidayBtn).toBeVisible();
    await holidayBtn.click();

    await expect(page.getByRole('heading', { name: /Pengaturan Hari Libur Madin/i })).toBeVisible();
    const closeBtn = page.getByRole('button', { name: /Batal/i });
    await closeBtn.click();
    await expect(page.getByRole('heading', { name: /Pengaturan Hari Libur Madin/i })).toBeHidden();
  });

  test('Absen Cepat page and dormitory block cards', async ({ page }) => {
    await page.goto('/absen-cepat');

    await expect(page.getByRole('heading', { name: /Mode Absen Cepat/i })).toBeVisible();

    // Block filter tabs
    await expect(page.getByRole('button', { name: /Semua Blok/i })).toBeVisible();

    // Save button
    await expect(page.getByRole('button', { name: /Simpan Presensi Cepat/i })).toBeVisible();
  });

  test('Rekap Presensi page and WhatsApp generator modal', async ({ page }) => {
    await page.goto('/rekap-absensi');

    await expect(page.getByRole('heading', { name: /Rekapitulasi Absensi & Generator WA/i })).toBeVisible();

    // WhatsApp generator modal
    const waBtn = page.getByRole('button', { name: /Generator Pesan WA/i });
    await expect(waBtn).toBeVisible();
    await waBtn.click();

    await expect(page.getByRole('heading', { name: /Generator Pesan WhatsApp/i })).toBeVisible();

    // Check copy button
    await expect(page.getByRole('button', { name: /Salin Teks WhatsApp/i })).toBeVisible();

    const closeBtn = page.getByRole('button', { name: /Tutup/i });
    await closeBtn.click();
    await expect(page.getByRole('heading', { name: /Generator Pesan WhatsApp/i })).toBeHidden();
  });
});
