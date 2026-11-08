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

test.describe('E2E: Sunday Date Picker & Modul Linimasa Setor Santri', () => {
  test.setTimeout(90000);

  test('1. Setor Cepat menampilkan Sunday Date Picker (khusus hari Minggu)', async ({ page }) => {
    await gotoWithAuth(page, '/setor-cepat');

    // Pastikan halaman Setor Cepat termuat
    await expect(
      page.getByRole('heading', { name: 'Setor Cepat Hafalan Santri' })
    ).toBeVisible({ timeout: 25000 });

    // Verifikasi pemilih hari Minggu ada di form detail
    const sundayPickerLabel = page.getByText('Tanggal Setor (Ditetapkan Hari Minggu pada Bulannya)');
    await expect(sundayPickerLabel).toBeVisible({ timeout: 15000 });

    // Pastikan ada tombol-tombol hari Minggu (Minggu 1, Minggu 2, dst)
    const sundayBtn1 = page.getByRole('button', { name: /Minggu 1/i }).first();
    await expect(sundayBtn1).toBeVisible();

    // Klik tombol Minggu 1 untuk memilih tanggal tersebut
    await sundayBtn1.click();
  });

  test('2. Sidebar memuat menu Linimasa Setor Santri dan dapat dinavigasikan', async ({ page }) => {
    await gotoWithAuth(page, '/dashboard');

    // Temukan link Linimasa Setor Santri di sidebar
    const linkLinimasa = page.locator('aside').getByRole('link', { name: 'Linimasa Setor Santri' });
    await expect(linkLinimasa).toBeVisible({ timeout: 20000 });

    // Navigasi ke Linimasa Setor Santri
    await linkLinimasa.click();
    await page.waitForURL('**/linimasa-setor**', { timeout: 30000 });

    // Verifikasi heading Linimasa Setor Santri
    await expect(
      page.getByRole('heading', { name: 'Linimasa Setor Santri' })
    ).toBeVisible({ timeout: 25000 });
  });

  test('3. Matriks Linimasa Setor Santri: Multi-Header Minggu Dinamis, Filter Switch Tingkat, dan Filter Bulan', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/linimasa-setor');

    // Pastikan halaman termuat
    await expect(
      page.getByRole('heading', { name: 'Linimasa Setor Santri' })
    ).toBeVisible({ timeout: 25000 });

    // 1. Verifikasi Switch Tingkat (Semua Tingkat, ULA, WUSTHO, ULYA)
    const tabSemua = page.getByRole('button', { name: /Semua Tingkat/i });
    const tabUla = page.getByRole('button', { name: /^ULA\b/i });
    const tabWustho = page.getByRole('button', { name: /^WUSTHO\b/i });
    const tabUlya = page.getByRole('button', { name: /^ULYA\b/i });

    await expect(tabSemua).toBeVisible();
    await expect(tabUla).toBeVisible();
    await expect(tabWustho).toBeVisible();
    await expect(tabUlya).toBeVisible();

    // Klik tab ULA
    await tabUla.click();
    await page.waitForTimeout(300);

    // 2. Verifikasi Filter Bulan (Multi-select)
    const btnMonthFilter = page.getByRole('button', { name: /Bulan \(\d+\/12\)/i });
    await expect(btnMonthFilter).toBeVisible();
    await btnMonthFilter.click();

    // Verifikasi tombol cepat filter semester
    const btnSemGanjil = page.getByRole('button', { name: /Sem\. Ganjil/i });
    await expect(btnSemGanjil).toBeVisible();
    await btnSemGanjil.click();

    // Verifikasi tombol semua bulan
    const btnSemuaBulan = page.getByRole('button', { name: /Semua \(12 Bulan\)/i });
    await expect(btnSemuaBulan).toBeVisible();
    await btnSemuaBulan.click();

    // 3. Verifikasi Header Tabel Matriks (NO, NAMA SANTRI, KELAS)
    await expect(page.getByRole('columnheader', { name: 'NO', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'NAMA SANTRI', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'KELAS', exact: true })).toBeVisible();

    // 4. Verifikasi Tombol Export Excel
    const btnExport = page.getByRole('button', { name: /Export Excel/i });
    await expect(btnExport).toBeVisible();
  });

  test('4. Interaktivitas Sel: Klik sel hari Minggu membuka modal detail/input setoran', async ({ page }) => {
    await gotoWithAuth(page, '/linimasa-setor');

    // Tunggu tabel termuat dengan baris santri
    await page.waitForSelector('tbody tr', { timeout: 30000 });

    // Ambil sel pertama pertemuan hari Minggu (kolom ke-4) pada baris santri pertama
    const firstRowFirstSundayCell = page.locator('tbody tr').first().locator('td').nth(3);
    await expect(firstRowFirstSundayCell).toBeVisible();

    // Klik sel tersebut
    await firstRowFirstSundayCell.click();

    // Verifikasi modal input/detail setoran muncul
    await expect(
      page.getByRole('heading', { name: 'Setoran Hari Minggu' })
    ).toBeVisible({ timeout: 15000 });

    // Pastikan tombol Tutup berfungsi
    const btnTutup = page.getByRole('button', { name: 'Tutup' });
    await expect(btnTutup).toBeVisible();
    await btnTutup.click();

    // Modal tertutup
    await expect(page.getByRole('heading', { name: 'Setoran Hari Minggu' })).not.toBeVisible();
  });
});
