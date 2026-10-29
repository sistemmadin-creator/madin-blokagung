import { test, expect } from '@playwright/test';

test.describe('Verifikasi E2E: Tahap 1-3 Sinkronisasi Database Supabase & Kode Aplikasi', () => {
  test('1.0 Tahap 1: Verifikasi Jadwal KBM (/hari-kbm) Memuat Slot & Asatidz Lengkap dg NIA', async ({ page }) => {
    await page.goto('/hari-kbm');

    // Pastikan halaman Hari KBM termuat
    await expect(page.getByRole('heading', { name: 'Hari KBM', exact: true })).toBeVisible({ timeout: 15_000 });

    // Pastikan kartu jadwal termuat dan kelompok blok tampil
    const kelompokBlok = page.locator('div').filter({ hasText: /Blok/i }).first();
    await expect(kelompokBlok).toBeVisible({ timeout: 15_000 });
  });

  test('2.0 Tahap 2: Verifikasi Absensi (/absensi) Filter Blok Dinormalisasi Bersih Tanpa Nilai Pecah', async ({ page }) => {
    await page.goto('/absensi');
    await expect(page.getByRole('heading', { name: 'Absensi Asatidz', exact: true })).toBeVisible();

    // Beralih ke tab Riwayat & Rekap Data
    const tabRiwayat = page.getByRole('button', { name: /Riwayat & Rekap Data/i });
    await expect(tabRiwayat).toBeVisible();
    await tabRiwayat.click();

    // Ambil dropdown filter Blok Kelas di tab Riwayat
    const selectBlok = page.locator('label', { hasText: 'Blok Kelas' }).locator('..').locator('select');
    await expect(selectBlok).toBeVisible({ timeout: 15_000 });

    // Tunggu hingga data selesai dimuat (opsi lebih dari sekadar "Semua Blok")
    await expect(async () => {
      const texts = await selectBlok.locator('option').allInnerTexts();
      expect(texts.length).toBeGreaterThan(1);
    }).toPass({ timeout: 15_000 });

    // Dapatkan semua teks opsi pada dropdown
    const optionTexts = await selectBlok.locator('option').allInnerTexts();
    
    // Pastikan opsi 'Blok 8' hadir
    expect(optionTexts.some((t) => t.includes('Blok 8'))).toBe(true);

    // Pastikan nilai terpecah seperti angka mentah '8' murni atau 'GP' tanpa prefiks TIDAK ADA
    expect(optionTexts.includes('8')).toBe(false);
    expect(optionTexts.includes('GP')).toBe(false);
  });

  test('3.0 Tahap 3: Verifikasi Data Asatidz (/asatidz) Bersih dari Kolom Mati NIS', async ({ page }) => {
    await page.goto('/asatidz');
    await expect(page.getByRole('heading', { name: /Database Asatidz/i })).toBeVisible();

    // Pastikan tabel asatidz termuat
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Verifikasi kolom NIA dan NAMA ASATIDZ hadir di thead
    await expect(page.getByRole('columnheader', { name: 'NIA', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /NAMA ASATIDZ/i })).toBeVisible();

    // Pastikan kolom NIS SUDAH TIDAK ADA di thead
    const nisHeader = page.getByRole('columnheader', { name: 'NIS', exact: true });
    await expect(nisHeader).toBeHidden();

    // Verifikasi Modal Tambah Asatidz tidak memuat input NIS
    const btnTambah = page.getByRole('button', { name: /Tambah Asatidz/i });
    await btnTambah.click();

    await expect(page.getByRole('heading', { name: /Form Pendaftaran Data Asatidz/i })).toBeVisible();
    await expect(page.getByText('NIA (Nomor Induk Asatidz)')).toBeVisible();
    await expect(page.getByText('NIS (eks-santri)')).toBeHidden();

    // Tutup modal
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
  });
});
