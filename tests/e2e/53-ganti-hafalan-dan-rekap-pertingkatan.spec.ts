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

test.describe('E2E: Hafalan Tingkat Lain & Rombak Rekapitulasi Hafalan Pertingkatan', () => {
  test.setTimeout(90000);

  test('1. Setor Cepat: Modal Ganti Hafalan memuat kategori "Hafalan Tingkat Lain" dan tanpa icon bintang', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/setor-cepat');

    // Pastikan halaman termuat
    await expect(
      page.getByRole('heading', { name: 'Setor Cepat Hafalan Santri' })
    ).toBeVisible({ timeout: 25000 });

    // Tunggu tombol Ganti Hafalan Selanjutnya muncul di detail santri
    const btnGanti = page.getByRole('button', { name: /Ganti Hafalan Selanjutnya/i });
    await expect(btnGanti).toBeVisible({ timeout: 20000 });
    await btnGanti.click();

    // Pastikan modal muncul
    const modalHeading = page.getByRole('heading', { name: 'Ganti Hafalan Selanjutnya' });
    await expect(modalHeading).toBeVisible({ timeout: 10000 });

    // Verifikasi kategori Hafalan Tingkat Lain ada di dalam modal
    const tingkatLainHeader = page.getByText(/Hafalan Tingkat Lain/i);
    await expect(tingkatLainHeader).toBeVisible();

    // Tutup modal
    const btnBatal = page.getByRole('button', { name: 'Batal', exact: true });
    await btnBatal.click();
    await expect(modalHeading).not.toBeVisible();
  });

  test('2. Rekapitulasi Pertingkatan: Switch Tahfidz hilang & Kolom Tabel Baru (No, Kelas, Mustahiq, PA/PI, Wajib, Sunnah, Kitab, Status)', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/rekap-hafalan');

    // Heading Rekapitulasi
    await expect(
      page.getByRole('heading', { name: 'Rekapitulasi Hafalan Pertingkatan' })
    ).toBeVisible({ timeout: 25000 });

    // Pastikan tombol / switch "Hafalan Tahfidz" sudah TIDAK ADA
    const tahfidzSwitch = page.getByRole('button', { name: 'Hafalan Tahfidz' });
    await expect(tahfidzSwitch).toHaveCount(0);

    // Verifikasi Header Tabel Baru
    const table = page.locator('table.table-rekap');
    await expect(table).toBeVisible({ timeout: 15000 });

    await expect(table.locator('th').filter({ hasText: /^NO$/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /^KELAS$/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /^NAMA MUSTAHIQ\/QOH$/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /^PA\/PI$/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /^HAFALAN WAJIB$/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /^HAFALAN SUNNAH$/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /^HAFALAN KITAB$/ })).toBeVisible();
    await expect(table.locator('th').filter({ hasText: /^STATUS$/ })).toBeVisible();
  });

  test('3. Rekapitulasi Pertingkatan: Format kelas (contoh: "1 A ULA") & Tombol Rincian membuka Modal Status Gabungan', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/rekap-hafalan');

    await expect(
      page.getByRole('heading', { name: 'Rekapitulasi Hafalan Pertingkatan' })
    ).toBeVisible({ timeout: 25000 });

    const table = page.locator('table.table-rekap');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Baris pertama tabel
    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Verifikasi format kelas (contoh: "1 A ULA")
    const kelasCell = firstRow.locator('td').nth(1);
    await expect(kelasCell).toHaveText(/\d+\s+[A-Z]+\s+(ULA|WUSTHO|ULYA)/i);

    // Klik tombol Rincian pada kolom status
    const btnRincian = firstRow.getByRole('button', { name: /Rincian/i });
    await expect(btnRincian).toBeVisible();
    await btnRincian.click();

    // Verifikasi Modal Rincian Persentase Gabungan terbuka
    const modalRincianTitle = page.getByRole('heading', {
      name: 'Rincian Persentase Gabungan Hafalan',
    });
    await expect(modalRincianTitle).toBeVisible({ timeout: 10000 });

    // Pastikan kartu gabungan 1 dan 2 ada
    await expect(page.getByText('Wajib + Sunnah', { exact: true })).toBeVisible();
    await expect(page.getByText('Wajib + Sunnah + Kitab', { exact: true })).toBeVisible();

    // Pastikan tabel rincian santri per kelas muncul
    await expect(page.getByText(/Daftar Capaian Santri/i)).toBeVisible();

    // Tutup modal
    const btnTutup = page.getByRole('button', { name: 'Tutup Rincian' });
    await btnTutup.click();
    await expect(modalRincianTitle).not.toBeVisible();
  });
});
