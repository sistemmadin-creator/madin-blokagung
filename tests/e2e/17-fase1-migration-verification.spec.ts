import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/auth';

test.describe('Fase 1: Verifikasi Integritas Data & Kompatibilitas Relasional', () => {
  test('1. Jadwal KBM: Menampilkan data jadwal tanpa kehilangan slot', async ({ page }) => {
    await gotoWithAuth(page, '/jadwal-kbm');

    // Pastikan judul dan tabel utama dirender
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible();
    await expect(page.locator('#tableJadwalKBM')).toBeVisible();

    // Verifikasi data kelas termuat (bukan kosong)
    const rows = page.locator('#tableJadwalKBM tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('2. Absensi Asatidz: KPI dan Sesi Harian termuat sempurna', async ({ page }) => {
    await gotoWithAuth(page, '/absensi');

    await expect(page.getByRole('heading', { name: 'Absensi Asatidz', exact: true })).toBeVisible();
    await expect(page.getByText('Total Sesi Hari Ini')).toBeVisible();
    await expect(page.getByText('Hadir', { exact: true })).toBeVisible();

    // Tab switcher berfungsi
    const btnRiwayat = page.getByRole('button', { name: /Riwayat & Rekap Data/i });
    await expect(btnRiwayat).toBeVisible();
    await btnRiwayat.click();
  });

  test('3. Muhafadzoh Setoran: Memuat data setoran & target hafalan', async ({ page }) => {
    await gotoWithAuth(page, '/setoran');

    await expect(page.getByRole('heading', { name: /Setoran/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Input Hafalan/i })).toBeVisible();
    
    // Verifikasi tombol pengaturan target
    const btnSettings = page.getByRole('button', { name: /Opsi Hafalan|Target & Penjaga Bebas/i });
    await expect(btnSettings).toBeVisible({ timeout: 20_000 });
  });

  test('4. Integritas Navigasi & Master Santri / Asatidz', async ({ page }) => {
    await gotoWithAuth(page, '/asatidz');
    await expect(page.getByRole('heading', { name: /(Database|Data Dewan) Asatidz/i })).toBeVisible();

    // Toolbar pencarian dan tabel asatidz
    await expect(page.getByPlaceholder(/Pencarian: Nama,/i)).toBeVisible();
    const tableAsatidz = page.locator('table');
    await expect(tableAsatidz).toBeVisible();
  });
});
