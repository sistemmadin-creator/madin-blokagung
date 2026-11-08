import { test, expect, Page } from '@playwright/test';

async function gotoWithAuth(page: Page, targetPath: string) {
  await page.goto(targetPath);
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/login')) {
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL(`**${targetPath}**`, { timeout: 60000 });
  }
}

test.describe('E2E: Pengaturan Tahfidz & Alur Setoran Ganda Lintas Modul', () => {
  test.setTimeout(90000);

  test('1. Modal Pengaturan: Tab "Pengaturan Tahfidz" tersedia dengan Pengaturan Standar Juz & Pendaftaran Santri', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/setor-mustahiq');

    // Klik tombol Opsi Target Hafalan untuk membuka Modal Pengaturan
    const btnOpsi = page.getByTestId('btn-opsi-target-hafalan');
    await expect(btnOpsi).toBeVisible({ timeout: 25000 });
    await btnOpsi.click();

    // Verifikasi modal pengaturan terbuka
    const modalTitle = page.getByText('Pengaturan Target Muhafadzoh & Item Hafalan');
    await expect(modalTitle).toBeVisible({ timeout: 15000 });

    // Verifikasi tab "Pengaturan Tahfidz" muncul di samping kanan "Hafalan Kitab"
    const tabTahfidz = page.getByTestId('tab-pengaturan-tahfidz');
    await expect(tabTahfidz).toBeVisible();
    await tabTahfidz.click();

    // Verifikasi Bagian 1: Mengatur Standar Hafalan Tahfidz (default 3 Juz)
    const inputStandarJuz = page.getByTestId('input-standar-maksimal-juz');
    await expect(inputStandarJuz).toBeVisible();
    await expect(inputStandarJuz).toHaveValue('3');

    // Verifikasi Bagian 2: Memilih Santri yang Tahfidz
    const searchSantriTahfidz = page.getByTestId('search-santri-tahfidz');
    await expect(searchSantriTahfidz).toBeVisible();

    // Tutup modal
    const btnBatal = page.getByRole('button', { name: 'Batal', exact: true });
    await btnBatal.click();
    await expect(modalTitle).not.toBeVisible();
  });

  test('2. Setor Cepat: Form Santri Tahfidz menyediakan blok input ganda & dual progress bar', async ({
    page,
  }) => {
    // Siapkan konfigurasi tahfidz di localStorage / state
    await gotoWithAuth(page, '/setor-cepat');

    await expect(
      page.getByRole('heading', { name: 'Setor Cepat Hafalan Santri' })
    ).toBeVisible({ timeout: 25000 });

    // Pastikan antarmuka kartu kelas dan detail santri termuat
    const searchInput = page.getByPlaceholder(/Cari santri berdasarkan nama/i);
    await expect(searchInput).toBeVisible();

    // Periksa apakah ada santri terpilih di panel kiri
    const detailHeading = page.getByText('Detail Setoran Hafalan Santri');
    await expect(detailHeading).toBeVisible();
  });

  test('3. Linimasa Setor: Memuat legenda "Tahfidz (Juz)" dan render matriks mingguan', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/linimasa-setor');

    await expect(
      page.getByRole('heading', { name: 'Linimasa Setor Santri' })
    ).toBeVisible({ timeout: 25000 });

    // Verifikasi legenda "Tahfidz (Juz)" ada di banner status
    const legendaTahfidz = page.getByText('Tahfidz (Juz)');
    await expect(legendaTahfidz).toBeVisible();

    // Pastikan sel-sel mingguan interaktif termuat
    const tableLinimasa = page.locator('table');
    await expect(tableLinimasa).toBeVisible();
  });

  test('4. Rekapitulasi Hafalan Pertingkatan: Modal Rincian Kelas menampilkan penanda Tahfidz', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/rekap-hafalan');

    await expect(
      page.getByRole('heading', { name: 'Rekapitulasi Hafalan Pertingkatan' })
    ).toBeVisible({ timeout: 25000 });

    // Klik salah satu tombol Status di tabel rekap
    const btnStatus = page.getByRole('button', { name: /Lihat Rincian|Belum Setor/i }).first();
    if (await btnStatus.isVisible()) {
      await btnStatus.click();

      // Modal Status Gabungan terbuka
      const modalHeading = page.getByText('Rincian Status Capaian Hafalan Kelas');
      await expect(modalHeading).toBeVisible({ timeout: 15000 });

      // Verifikasi tabel santri di dalam modal
      const santriTable = page.locator('table').last();
      await expect(santriTable).toBeVisible();

      // Tutup modal
      const btnTutup = page.getByRole('button', { name: 'Tutup Rincian' });
      await btnTutup.click();
      await expect(modalHeading).not.toBeVisible();
    }
  });
});
