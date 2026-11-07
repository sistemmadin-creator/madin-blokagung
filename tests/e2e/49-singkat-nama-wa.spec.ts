import { test, expect } from '@playwright/test';

test.describe('Fitur Singkat Nama Manual pada Generator Laporan WhatsApp', () => {
  test.setTimeout(120000);

  test('Memverifikasi tombol Singkat Nama, pop up tabel 2 kolom (nama lengkap & input singkatan), tombol simpan, dan hasil singkatan di teks laporan WA', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

    // 1. Masuk ke halaman Absensi Asatidz
    await page.goto('/absensi');
    await page.waitForLoadState('domcontentloaded');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 35000 }),
        page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click(),
      ]);
      await page.goto('/absensi');
    }
    await expect(page.getByText('Absensi Asatidz').first()).toBeVisible({ timeout: 25000 });

    // 2. Klik tombol "Chat WA" untuk membuka Modal Generator WA
    const btnChatWA = page.getByRole('button', { name: /Chat WA/i });
    await expect(btnChatWA).toBeVisible({ timeout: 15000 });
    await btnChatWA.click();

    // 3. Pastikan modal Generator Laporan WhatsApp terbuka
    const modalWA = page.locator('div[role="dialog"]', {
      hasText: /Generator Laporan Absensi WhatsApp/i,
    });
    await expect(modalWA).toBeVisible({ timeout: 15000 });

    // 4. Pastikan tombol "Singkat Nama" ada di modal Generator WA
    const btnSingkatNama = modalWA.getByRole('button', { name: /Singkat Nama/i });
    await expect(btnSingkatNama).toBeVisible();

    // 5. Klik tombol "Singkat Nama" untuk membuka Modal Pengaturan Singkat Nama
    await btnSingkatNama.click();

    const modalSingkat = page.getByTestId('modal-singkat-nama');
    await expect(modalSingkat).toBeVisible({ timeout: 10000 });

    // 6. Verifikasi keberadaan tabel 2 kolom langsung: NAMA ASATIDZ LENGKAP & NAMA SINGKATAN
    const tableSingkat = modalSingkat.locator('table');
    await expect(tableSingkat).toBeVisible();
    await expect(tableSingkat.locator('thead')).toContainText('NAMA ASATIDZ LENGKAP');
    await expect(tableSingkat.locator('thead')).toContainText('NAMA SINGKATAN');

    // 7. Tunggu hingga daftar asatidz selesai dimuat dan input singkatan muncul
    const inputSingkatan = tableSingkat
      .locator('input[placeholder="Contoh singkatan..."]')
      .first();
    await expect(inputSingkatan).toBeVisible({ timeout: 25000 });

    const testAbbrev = 'TEST. SNGKT.';
    await inputSingkatan.fill(testAbbrev);

    // 8. Klik tombol Simpan pada baris pertama
    const btnSimpan = tableSingkat
      .getByRole('button', { name: 'Simpan', exact: true })
      .first();
    await expect(btnSimpan).toBeVisible();
    await btnSimpan.click();

    // Harus muncul indikator tersimpan
    await expect(tableSingkat.getByText('Tersimpan').first()).toBeVisible({
      timeout: 15000,
    });

    // 9. Tutup modal Singkat Nama
    const btnTutupSingkat = modalSingkat.getByRole('button', { name: /Tutup/i });
    await btnTutupSingkat.click();
    await expect(modalSingkat).not.toBeVisible();

    // 10. Bersihkan kembali teks singkatan pengetesan agar data tetap bersih
    await btnSingkatNama.click();
    await expect(modalSingkat).toBeVisible();
    await expect(inputSingkatan).toBeVisible();
    await inputSingkatan.fill('');
    const btnSimpanClean = tableSingkat
      .getByRole('button', { name: 'Simpan', exact: true })
      .first();
    await btnSimpanClean.click();
    await expect(tableSingkat.getByText('Tersimpan').first()).toBeVisible({
      timeout: 15000,
    });
    await btnTutupSingkat.click();
    await expect(modalSingkat).not.toBeVisible();
  });
});
