import { test, expect } from '@playwright/test';

test.describe('Sinkronisasi Lokasi Diniyyah: Formasi Kelas, Hari KBM & Jadwal KBM Per Kelas', () => {
  test('1.0 Formasi Kelas: Memastikan Single Source of Truth Lokasi Diniyyah', async ({ page }) => {
    await page.goto('/formasi');
    await expect(page.getByRole('heading', { name: /Formasi Kelas Madin/i })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/Ketik pencarian/i);
    await expect(searchInput).toBeVisible();

    // 1. Cek kelas 1 A ULA
    await searchInput.fill('1 A ULA');
    const row1A = page.locator('tbody tr', { hasText: 'FIKRUL UMAM AL HANIF' }).first();
    await expect(row1A).toBeVisible({ timeout: 10_000 });
    await expect(row1A.getByText('Al Hidayah')).toBeVisible();
    await expect(row1A.getByText('Blok Putra Induk')).toBeVisible();

    // 2. Cek kelas 1 B ULA (PA) yang belum diatur lokasinya
    await searchInput.fill('1 B ULA');
    const row1B = page.locator('tbody tr', { hasText: 'AHNAF HUMAN AZIZY' }).first();
    await expect(row1B).toBeVisible({ timeout: 10_000 });
    // Pastikan tidak meminjam lokasi hantu lama
    await expect(row1B.getByText('Asrama Al-Falah Timur')).toHaveCount(0);
  });

  test('2.0 Hari KBM (/hari-kbm): Kolom Lokasi Diniyyah Sinkron dengan Formasi Kelas', async ({ page }) => {
    await page.goto('/hari-kbm');
    await expect(page.getByRole('heading', { name: /Hari KBM/i })).toBeVisible({ timeout: 15_000 });

    // Pilih Hari Kamis
    const btnKamis = page.getByRole('button', { name: 'Kamis', exact: true });
    if (await btnKamis.isVisible()) {
      await btnKamis.click();
    }

    // Cari Asatidz Fikrul Umam Al Hanif
    const searchInput = page.getByPlaceholder(/Cari Asatidz/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('FIKRUL UMAM AL HANIF');

    const guruRow = page.locator('#tbodyHariKBM tr', { hasText: 'FIKRUL UMAM AL HANIF' }).first();
    await expect(guruRow).toBeVisible({ timeout: 10_000 });

    // Verifikasi kelas 1 A ULA (PA) menampilkan Lokasi Diniyyah: "Al Hidayah"
    await expect(guruRow.getByText('1 A ULA (PA)').first()).toBeVisible();
    await expect(guruRow.getByText('Al Hidayah').first()).toBeVisible();

    // Pastikan string lama "Asrama Al-Barokah Bawah" TIDAK lagi muncul
    await expect(guruRow.getByText('Asrama Al-Barokah Bawah')).toHaveCount(0);
  });

  test('3.0 Jadwal KBM Per Kelas (/jadwal-kbm): Kolom LOKAL Sinkron dengan Formasi Kelas', async ({ page }) => {
    await page.goto('/jadwal-kbm');
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/Cari Kelas/i);
    await expect(searchInput).toBeVisible();

    // 1. Cek kelas 1 A ULA (PA)
    await searchInput.fill('1 A ULA');
    const row1A = page.locator('#tableJadwalKBM tbody tr', { hasText: 'FIKRUL UMAM AL HANIF' }).first();
    await expect(row1A).toBeVisible({ timeout: 10_000 });

    // Verifikasi kolom LOKAL menampilkan "Al Hidayah"
    await expect(row1A.locator('td.text-xs', { hasText: 'Al Hidayah' })).toBeVisible();
    await expect(row1A.getByText('Asrama Al-Barokah Bawah')).toHaveCount(0);

    // 2. Cek kelas 1 B ULA (PA)
    await searchInput.fill('1 B ULA');
    const row1B = page.locator('#tableJadwalKBM tbody tr', { hasText: 'AHNAF HUMAN AZIZY' }).first();
    await expect(row1B).toBeVisible({ timeout: 10_000 });

    // Verifikasi kolom LOKAL menampilkan "-" dan bukan lokasi lama
    await expect(row1B.locator('td.text-xs', { hasText: '-' })).toBeVisible();
    await expect(row1B.getByText('Asrama Al-Falah Timur')).toHaveCount(0);
  });
});
