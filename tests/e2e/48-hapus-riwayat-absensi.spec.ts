import { test, expect } from '@playwright/test';

test.describe('Fitur Hapus Pilih & Hapus Semua Riwayat Absensi Asatidz (/absensi)', () => {
  test.setTimeout(120000);

  test('Memverifikasi tombol Hapus Pilih dan Hapus Semua, pemilihan checkbox per-baris & header, dan modal konfirmasi', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Masuk ke aplikasi dan pastikan terautentikasi
    await page.goto('/absensi');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await expect(page.locator('aside')).toBeVisible({ timeout: 25000 });
      await page.goto('/absensi');
    }
    await expect(page.getByText('Absensi Asatidz').first()).toBeVisible({ timeout: 25000 });

    // 2. Berpindah ke Tab 2: "Riwayat & Rekap Data"
    const tabRiwayat = page.getByRole('button', { name: /Riwayat & Rekap Data/i });
    await expect(tabRiwayat).toBeVisible({ timeout: 20000 });
    await tabRiwayat.click();

    // Pastikan Filter Riwayat & Rekap Kehadiran terlihat
    await expect(
      page.getByText('Filter Riwayat & Rekap Kehadiran')
    ).toBeVisible({ timeout: 15000 });

    // 3. Verifikasi Tombol "Hapus Pilih" dan "Hapus Semua" ada pada toolbar tabel
    const btnHapusPilih = page.getByRole('button', { name: /Hapus Pilih/i });
    const btnHapusSemua = page.getByRole('button', { name: /Hapus Semua/i });

    await expect(btnHapusPilih).toBeVisible();
    await expect(btnHapusSemua).toBeVisible();

    // Awalnya belum ada yang dipilih -> Hapus Pilih harus disabled
    await expect(btnHapusPilih).toBeDisabled();

    // 4. Cari tabel riwayat absensi dan centang baris pertama
    const table = page.locator('table');
    await expect(table).toBeVisible();

    const rowCheckboxes = table.locator('tbody tr input[type="checkbox"]');
    const rowCount = await rowCheckboxes.count();

    if (rowCount > 0) {
      // Centang baris pertama
      await rowCheckboxes.first().check();

      // Tombol Hapus Pilih sekarang harus aktif dan bertuliskan (1)
      await expect(btnHapusPilih).toBeEnabled();
      await expect(btnHapusPilih).toContainText('Hapus Pilih (1)');

      // Klik tombol Hapus Pilih untuk memicu Modal Konfirmasi
      await btnHapusPilih.click();

      // Modal konfirmasi harus muncul
      const modalPilih = page.locator('div.fixed.inset-0', {
        hasText: /Hapus 1 Rekaman Terpilih\?/i,
      });
      await expect(modalPilih).toBeVisible();
      await expect(
        modalPilih.getByRole('button', { name: /Ya, Hapus/i })
      ).toBeVisible();

      // Klik Batal pada modal
      const btnBatal = modalPilih.getByRole('button', { name: /Batal/i });
      await btnBatal.click();
      await expect(modalPilih).not.toBeVisible();

      // Uncheck baris pertama
      await rowCheckboxes.first().uncheck();
      await expect(btnHapusPilih).toBeDisabled();

      // 5. Cek Header Checkbox (Pilih Semua di Halaman)
      const headerCheckbox = table.locator('thead input[type="checkbox"]');
      if (await headerCheckbox.isVisible()) {
        await headerCheckbox.check();
        // Harus ada sejumlah baris terpilih
        await expect(btnHapusPilih).toBeEnabled();
        await expect(btnHapusPilih).toContainText(`Hapus Pilih (${rowCount})`);

        // Uncheck lagi lewat header
        await headerCheckbox.uncheck();
        await expect(btnHapusPilih).toBeDisabled();
      }

      // 6. Uji tombol Hapus Semua dan modal konfirmasinya
      await btnHapusSemua.click();
      const modalSemua = page.locator('div.fixed.inset-0', {
        hasText: /Hapus Semua Rekaman Riwayat Absensi\?/i,
      });
      await expect(modalSemua).toBeVisible();
      await expect(
        modalSemua.getByRole('button', { name: /Ya, Hapus Semua/i })
      ).toBeVisible();

      // Batal menghapus semua agar data aman
      const btnBatalSemua = modalSemua.getByRole('button', { name: /Batal/i });
      await btnBatalSemua.click();
      await expect(modalSemua).not.toBeVisible();
    }
  });
});
