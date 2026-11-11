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

test.describe('E2E: Pengujian Pemisahan Pop-up Kolom Kelas/Mustahiq (Gambar 3) & Status Rincian (Gambar 4)', () => {
  test.setTimeout(90000);

  test('1. Klik Kolom KELAS memunculkan Modal Pop-up Gambar 3 (Santri Selesai & Sedang Proses)', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/rekap-hafalan');

    // Tunggu tabel rekapitulasi selesai dimuat
    await expect(page.getByRole('heading', { name: 'Rekapitulasi Hafalan Pertingkatan' })).toBeVisible({
      timeout: 30000,
    });

    const tabelKbm = page.locator('table.table-rekap');
    await expect(tabelKbm).toBeVisible({ timeout: 20000 });

    // Ambil tombol kelas di baris pertama (kolom ke-2: KELAS)
    const btnFirstKelas = tabelKbm.locator('tbody tr').first().locator('td:nth-child(2) button');
    await expect(btnFirstKelas).toBeVisible();
    const kelasText = (await btnFirstKelas.innerText()).trim();

    // Klik tombol kelas
    await btnFirstKelas.click();

    // Verifikasi Modal Pop-up Gambar 3 muncul dengan judul 'Rincian Rekap Hafalan Kelas'
    const modalRincian = page.locator('div.fixed.inset-0.z-50');
    await expect(modalRincian).toBeVisible({ timeout: 10000 });
    await expect(
      modalRincian.getByRole('heading', { name: new RegExp(`Rincian Rekap Hafalan Kelas.*${kelasText}`, 'i') })
    ).toBeVisible();

    // Verifikasi fitur Gambar 3: Santri Selesai & Santri Sedang Proses
    await expect(modalRincian.getByText('Santri Selesai', { exact: false })).toBeVisible();
    await expect(modalRincian.getByText('Santri Sedang Proses', { exact: false })).toBeVisible();

    // Tutup modal
    const btnClose = modalRincian.locator('button[title="Tutup Modal"]');
    await btnClose.click();
    await expect(modalRincian).not.toBeVisible();
  });

  test('2. Klik Kolom NAMA MUSTAHIQ/QOH memunculkan Modal Pop-up Gambar 3 (Santri Selesai & Sedang Proses)', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/rekap-hafalan');

    await expect(page.getByRole('heading', { name: 'Rekapitulasi Hafalan Pertingkatan' })).toBeVisible({
      timeout: 30000,
    });

    const tabelKbm = page.locator('table.table-rekap');
    await expect(tabelKbm).toBeVisible({ timeout: 20000 });

    // Ambil tombol mustahiq di baris pertama
    const btnFirstMustahiq = tabelKbm.locator('tbody tr').first().locator('button.group\\/mustahiq');
    await expect(btnFirstMustahiq).toBeVisible();

    // Klik tombol mustahiq
    await btnFirstMustahiq.click();

    // Verifikasi Modal Pop-up Gambar 3 muncul
    const modalRincian = page.locator('div.fixed.inset-0.z-50');
    await expect(modalRincian).toBeVisible({ timeout: 10000 });
    await expect(modalRincian.getByRole('heading', { name: /Rincian Rekap Hafalan Kelas/i })).toBeVisible();
    await expect(modalRincian.getByText('Santri Selesai', { exact: false })).toBeVisible();
    await expect(modalRincian.getByText('Santri Sedang Proses', { exact: false })).toBeVisible();

    // Tutup modal
    const btnClose = modalRincian.locator('button[title="Tutup Modal"]');
    await btnClose.click();
    await expect(modalRincian).not.toBeVisible();
  });

  test('3. Klik Tombol STATUS [Rincian] memunculkan Modal Pop-up Gambar 4 (Capaian Gabungan Wajib/Sunnah/Kitab)', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/rekap-hafalan');

    await expect(page.getByRole('heading', { name: 'Rekapitulasi Hafalan Pertingkatan' })).toBeVisible({
      timeout: 30000,
    });

    const tabelKbm = page.locator('table.table-rekap');
    await expect(tabelKbm).toBeVisible({ timeout: 20000 });

    // Ambil tombol Rincian di kolom status pada baris pertama
    const btnFirstStatus = tabelKbm.locator('tbody tr').first().locator('td:last-child button');
    await expect(btnFirstStatus).toBeVisible();

    // Klik tombol status rincian
    await btnFirstStatus.click();

    // Verifikasi Modal Pop-up Gambar 4 muncul
    const modalGambar4 = page.locator('div.fixed.inset-0.z-50');
    await expect(modalGambar4).toBeVisible({ timeout: 10000 });
    await expect(modalGambar4.getByText('WAJIB + SUNNAH', { exact: false })).toBeVisible();
    await expect(modalGambar4.getByText('WAJIB + SUNNAH + KITAB', { exact: false })).toBeVisible();
    await expect(modalGambar4.getByText('DAFTAR CAPAIAN SANTRI', { exact: false })).toBeVisible();

    // Tutup modal via tombol 'Tutup Rincian'
    const btnTutup = modalGambar4.getByRole('button', { name: 'Tutup Rincian' });
    await btnTutup.click();
    await expect(modalGambar4).not.toBeVisible();
  });
});
