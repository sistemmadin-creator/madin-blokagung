import { test, expect } from '@playwright/test';

test.describe('Modul 04: Kesiswaan & Presensi', () => {
  test('Presensi KBM page, hour tabs and holiday modal', async ({ page }) => {
    await page.goto('/absensi');

    await expect(page.getByRole('heading', { name: /(Absensi Asatidz|Presensi KBM)/i }).first()).toBeVisible();

    // Check hour buttons
    await expect(page.getByRole('button', { name: /Jam.*1/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Jam.*2/i }).first()).toBeVisible();

    // Holiday settings modal button
    const holidayBtn = page.getByRole('button', { name: /Libur \/ Event|Atur Hari Libur/i });
    await expect(holidayBtn).toBeVisible();
    await holidayBtn.click();

    await expect(page.getByRole('heading', { name: /Pengaturan Hari Libur/i })).toBeVisible();
    const closeBtn = page.getByRole('button', { name: /Batal/i });
    await closeBtn.click();
  });

  test('Absen Cepat page and dormitory block cards', async ({ page }) => {
    await page.goto('/absen-cepat');

    await expect(page.getByRole('heading', { name: /Absen Cepat/i }).first()).toBeVisible();

    // Block filter tabs
    await expect(page.getByRole('button', { name: /Semua/i }).first()).toBeVisible();

    // Save button
    await expect(page.getByRole('button', { name: /Simpan Presensi Cepat/i })).toBeVisible();
  });

  test('Rekap Presensi page and WhatsApp generator modal', async ({ page }) => {
    await page.goto('/rekap-absensi');

    await expect(page.getByRole('heading', { name: /Rekapitulasi|Rekap Absensi/i }).first()).toBeVisible();

    // WhatsApp generator modal
    const waBtn = page.getByRole('button', { name: /Broadcast WA|Kirim Pesan WhatsApp/i });
    await expect(waBtn).toBeVisible();
    await waBtn.click();

    await expect(page.getByRole('heading', { name: /Generator Pesan WhatsApp/i })).toBeVisible();

    // Check copy button
    await expect(page.getByRole('button', { name: /Salin Teks WhatsApp/i })).toBeVisible();

    const closeBtn = page.getByRole('button', { name: 'Tutup', exact: true });
    await closeBtn.click();
    await expect(page.getByRole('heading', { name: /Generator Pesan WhatsApp/i })).toBeHidden();
  });
});
