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

test.describe('E2E: Pengujian Kolom Klik Kelas & Mustahiq di Rekapitulasi Hafalan Pertingkatan', () => {
  test.setTimeout(90000);

  test('1. Klik Kolom KELAS memunculkan Modal Pop-up Rincian Rekap Hafalan Kelas', async ({
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

    // Verifikasi Modal Pop-up muncul dengan judul 'Rincian Rekap Hafalan Kelas'
    const modalRincian = page.locator('div.fixed.inset-0.z-50');
    await expect(modalRincian).toBeVisible({ timeout: 10000 });
    await expect(
      modalRincian.getByRole('heading', { name: new RegExp(`Rincian Rekap Hafalan Kelas.*${kelasText}`, 'i') })
    ).toBeVisible();

    // Verifikasi rincian partisipasi hafalan di modal
    await expect(modalRincian.getByText('Wajib + Sunnah', { exact: true })).toBeVisible();
    await expect(modalRincian.getByText('Wajib + Sunnah + Kitab', { exact: true })).toBeVisible();

    // Tutup modal
    const btnClose = modalRincian.locator('button').first();
    await btnClose.click();
    await expect(modalRincian).not.toBeVisible();
  });

  test('2. Klik Kolom NAMA MUSTAHIQ/QOH memunculkan Modal Pop-up Rincian Rekap Hafalan Kelas', async ({
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

    // Verifikasi Modal Pop-up muncul
    const modalRincian = page.locator('div.fixed.inset-0.z-50');
    await expect(modalRincian).toBeVisible({ timeout: 10000 });
    await expect(modalRincian.getByRole('heading', { name: /Rincian Rekap Hafalan Kelas/i })).toBeVisible();

    // Tutup modal
    const btnClose = modalRincian.locator('button').first();
    await btnClose.click();
    await expect(modalRincian).not.toBeVisible();
  });
});
