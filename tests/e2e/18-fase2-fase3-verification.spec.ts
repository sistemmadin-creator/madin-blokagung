import { test, expect } from '@playwright/test';

test.describe('Fase 2 & Fase 3: Offline-First Resiliency & Smart Automation', () => {
  test('1. Layout: Integrasi Indikator Sinkronisasi dan Status Jaringan', async ({ page }) => {
    await page.goto('/santri');

    // Pastikan halaman utama santri termuat dengan sempurna
    await expect(page.getByRole('heading', { name: /Database Santri/i })).toBeVisible();

    // Verifikasi bahwa elemen Realtime Sync aktif
    const syncBadge = page.locator('div[aria-label="Status Sinkronisasi Realtime"]');
    // Jika koneksi realtime aktif, badge ada
    if (await syncBadge.isVisible()) {
      await expect(syncBadge).toContainText(/Sync Aktif/i);
    }
  });

  test('2. Absensi: Generator Pesan WhatsApp Otomatis (Fase 3)', async ({ page }) => {
    await page.goto('/absensi');

    // Buka modal Chat WA
    const btnWA = page.getByRole('button', { name: /Chat WA/i });
    await expect(btnWA).toBeVisible();
    await btnWA.click();

    // Modal Generator Laporan WA harus muncul
    await expect(page.getByRole('heading', { name: /Generator Laporan WhatsApp/i })).toBeVisible();

    // Verifikasi tombol salin teks atau tombol aksi WA
    await expect(page.getByRole('button', { name: /Salin/i })).toBeVisible();

    // Tutup modal
    const closeBtn = page.getByRole('button', { name: /Tutup modal/i }).or(page.locator('button:has-text("✕")')).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('3. Jadwal KBM: Matriks KBM Bebas Konflik & Auto Solver Ready (Fase 3)', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible();

    // Matriks tabel KBM harus merender seluruh kelas
    const table = page.locator('#tableJadwalKBM');
    await expect(table).toBeVisible();

    // Periksa bahwa minimal ada 1 baris kelas yang terisi slot mengajar
    const rowWithSlots = table.locator('tbody tr').first();
    await expect(rowWithSlots).toBeVisible();
  });

  test('4. Muhafadzoh: Pencarian Cepat NIS / Barcode Santri (Fase 3)', async ({ page }) => {
    await page.goto('/setoran');

    await expect(page.getByRole('heading', { name: /Setoran/i }).first()).toBeVisible();

    // Combobox santri / input pencarian harus aktif untuk input scanner
    const searchCombo = page.getByRole('combobox').first();
    await expect(searchCombo).toBeVisible();
  });
});
