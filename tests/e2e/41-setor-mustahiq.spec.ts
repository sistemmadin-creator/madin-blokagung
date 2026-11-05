import { test, expect } from '@playwright/test';

test.describe('Modul Setor Mustahiq (PKM Muhafadzoh)', () => {
  test('Navigasi halaman Setor Mustahiq, ganti mode Kartu & Tabel, input Proses Setoran & Ganti Hafalan Selanjutnya', async ({ page }) => {
    await page.goto('/setor-mustahiq');

    // 1. Verifikasi Link Sidebar & Judul Halaman
    await expect(
      page.getByRole('link', { name: 'Setor Mustahiq', exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Setoran Mingguan Santri \(Mustahiq\)/i })
    ).toBeVisible();
    await expect(page.getByTestId('btn-mode-kartu')).toBeVisible();
    await expect(page.getByTestId('btn-mode-tabel')).toBeVisible();

    // 2. Beralih ke Mode Tabel dan tunggu data santri termuat
    await page.getByTestId('btn-mode-tabel').click();
    await expect(page.getByText(/baris data/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Tampilkan \/ Sembunyikan Kolom/i })
    ).toBeVisible();

    // Tunggu tombol Setor di baris tabel muncul
    const setorBtn = page.getByRole('button', { name: 'Setor', exact: true }).first();
    await expect(setorBtn).toBeVisible({ timeout: 15000 });
    await setorBtn.click();

    // 3. Verifikasi Modal Detail Setoran terbuka
    const detailDialog = page.getByTestId('modal-detail-setor-mustahiq');
    await expect(detailDialog).toBeVisible();
    await expect(
      detailDialog.getByText(/Detail Setoran Hafalan Santri/i)
    ).toBeVisible();

    // 4. Uji Input Proses Setoran (+10 Baris/Bait)
    const inputTambah = detailDialog.getByTestId('input-tambah-angka');
    if (await inputTambah.isVisible()) {
      await inputTambah.fill('10');
      await detailDialog.getByTestId('input-catatan-setor').fill('Setoran Mingguan Uji');
      await detailDialog.getByTestId('btn-simpan-setoran-mustahiq').click();
      await expect(detailDialog.getByText(/Setoran Mingguan Uji/i)).toBeVisible();
    }

    // 5. Verifikasi tombol Ganti Hafalan Selanjutnya & Modalnya
    const gantiBtn = detailDialog.getByTestId('btn-ganti-hafalan-selanjutnya');
    await expect(gantiBtn).toBeVisible();
    await gantiBtn.click();

    const gantiDialog = page.getByTestId('modal-ganti-hafalan');
    await expect(gantiDialog).toBeVisible();
    await expect(
      gantiDialog.getByText(/1\. Daftar Hafalan Wajib/i)
    ).toBeVisible();

    // Tutup modal Ganti Hafalan
    await gantiDialog.getByRole('button', { name: 'Batal' }).click();
    await expect(gantiDialog).not.toBeVisible();

    // 6. Kembali ke Mode Kartu
    await page.getByTestId('btn-mode-kartu').click({ force: true });
  });
});
