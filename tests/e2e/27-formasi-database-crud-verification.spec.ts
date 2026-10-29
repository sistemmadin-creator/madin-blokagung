import { test, expect } from '@playwright/test';

test.describe('Verifikasi E2E: Database CRUD Formasi Kelas & Sinkronisasi Rombel Baru', () => {
  test('1.0 Formasi Master Page (/formasi): Data Rombel Baru & Penghapusan ULA 3 Q', async ({ page }) => {
    await page.goto('/formasi');

    // 1. Verifikasi Judul Utama
    await expect(page.getByRole('heading', { name: /Formasi Kelas Madin/i })).toBeVisible();

    // 2. Pastikan tabel termuat
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // 3. Verifikasi kolom-kolom penting hadir
    await expect(page.getByRole('columnheader', { name: 'Tingkat' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Kelas', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Bagian' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Gender' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Wali Kelas' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Blok Diniyyah' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Lokasi Diniyyah' })).toBeVisible();

    // 4. Cari kelas ULA 3 A PA (Kelas baru yang sebelumnya hilang)
    const searchInput = page.getByPlaceholder(/Ketik pencarian/i);
    await searchInput.fill('3 A ULA PA');
    await expect(page.getByRole('cell', { name: "AKHMAD DHIYAUL LAMI'" })).toBeVisible({ timeout: 15_000 });

    // 5. Cari kelas ULA 4 M PI (Kelas baru)
    await searchInput.fill('4 M ULA PI');
    await expect(page.getByRole('cell', { name: 'INAROTU ASNAL HANA' })).toBeVisible({ timeout: 15_000 });

    // 6. Cari kelas ULA 4 N PI (Kelas baru)
    await searchInput.fill('4 N ULA PI');
    await expect(page.getByRole('cell', { name: 'SEPTINISA MAFTUHAH' })).toBeVisible({ timeout: 15_000 });

    // 7. Cari kelas WUSTHO 1 M PI (Kelas baru)
    await searchInput.fill('1 M WUSTHO PI');
    await expect(page.getByRole('cell', { name: 'JAZILATUL KHASANAH' })).toBeVisible({ timeout: 15_000 });

    // 8. Cari kelas WUSTHO 1 N PI (Kelas baru)
    await searchInput.fill('1 N WUSTHO PI');
    await expect(page.getByRole('cell', { name: 'ZILVIE ZUHDATUL MUKARROM K.' })).toBeVisible({ timeout: 15_000 });

    // 9. Pastikan ULA 3 Q PI yang telah dihapus TIDAK DITEMUKAN
    await searchInput.fill('3 Q ULA');
    await expect(page.getByText('Tidak ada data formasi kelas yang cocok dengan filter.')).toBeVisible({ timeout: 10_000 });
  });

  test('2.0 Formasi Master Page (/formasi): Blok Diniyyah & Lokasi Diniyyah Terisi Nyata', async ({ page }) => {
    await page.goto('/formasi');

    const searchInput = page.getByPlaceholder(/Ketik pencarian/i);
    await searchInput.fill('1 C ULA PA');

    // Pastikan baris ULA 1 C PA menampilkan Blok Diniyyah "Blok Induk" yang telah dinormalisasi
    await expect(page.getByRole('button', { name: 'Blok Induk' }).first()).toBeVisible({ timeout: 15_000 });
    // Pastikan Lokasi Diniyyah tampil
    await expect(page.getByText('Asrama Al-Falah Dalam').first()).toBeVisible();
  });

  test('3.0 Modul Absensi (/absensi): Memuat Data Blok Tanpa Error Kolom Legacy', async ({ page }) => {
    await page.goto('/absensi');
    await expect(page.getByRole('heading', { name: 'Absensi Asatidz', exact: true })).toBeVisible();

    // Beralih ke tab Riwayat & Rekap Data
    const tabRiwayat = page.getByRole('button', { name: /Riwayat & Rekap Data/i });
    await expect(tabRiwayat).toBeVisible();
    await tabRiwayat.click();

    // Verifikasi dropdown filter blok ada dan berfungsi
    const selectBlok = page.locator('select').filter({ hasText: /Semua Blok/i }).first();
    await expect(selectBlok).toBeVisible();
  });

  test('4.0 Modul Rekap Absensi (/rekap-absensi): Memuat Filter Blok & Agregasi Normal', async ({ page }) => {
    await page.goto('/rekap-absensi');
    await expect(page.getByRole('heading', { name: 'Rekap Absensi Asatidz', exact: true })).toBeVisible();

    // Verifikasi opsi filter blok
    const filterBlokSelect = page.locator('select').filter({ hasText: /Semua Blok/i }).first();
    await expect(filterBlokSelect).toBeVisible();
  });
});
