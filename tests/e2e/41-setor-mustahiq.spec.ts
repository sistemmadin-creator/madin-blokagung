import { test, expect } from '@playwright/test';

test.describe('Modul Setor Mustahiq: Setor Kelas & Rekap Setor', () => {
  test('Navigasi sub-menu Setor Kelas & Rekap Setor, uji input Proses Setoran, Ganti Hafalan Selanjutnya, dan Kartu Rekap Setor', async ({ page }) => {
    await page.goto('/setor-mustahiq');

    // 1. Verifikasi Sub-Menu Sidebar di bawah Setor Mustahiq (Setor Kelas & Rekap Setor)
    await expect(
      page.getByRole('link', { name: 'Setor Kelas' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Rekap Setor' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Setoran Mingguan Santri \(Mustahiq\)/i })
    ).toBeVisible();

    // 2. Beralih ke Mode Tabel dan tunggu data santri termuat
    await page.getByTestId('btn-mode-tabel').click();
    const setorBtn = page.getByRole('button', { name: 'Setor', exact: true }).first();
    await expect(setorBtn).toBeVisible({ timeout: 15000 });
    await setorBtn.click();

    // 3. Verifikasi Modal Detail Setoran & Input Setoran
    const detailDialog = page.getByTestId('modal-detail-setor-mustahiq');
    await expect(detailDialog).toBeVisible();
    const inputTambah = detailDialog.getByTestId('input-tambah-angka');
    if (await inputTambah.isVisible()) {
      await inputTambah.fill('10');
      await detailDialog.getByTestId('input-catatan-setor').fill('Setoran Mingguan Uji');
      await detailDialog.getByTestId('btn-simpan-setoran-mustahiq').click();
      await expect(detailDialog.getByText(/Setoran Mingguan Uji/i).first()).toBeVisible();
    }

    // 4. Verifikasi tombol Ganti Hafalan Selanjutnya
    const gantiBtn = detailDialog.getByTestId('btn-ganti-hafalan-selanjutnya');
    await expect(gantiBtn).toBeVisible();
    await gantiBtn.click();

    const gantiDialog = page.getByTestId('modal-ganti-hafalan');
    await expect(gantiDialog).toBeVisible();
    await expect(gantiDialog.getByText(/1\. Daftar Hafalan Wajib/i)).toBeVisible();
    await gantiDialog.getByRole('button', { name: 'Batal' }).click();
    await expect(gantiDialog).not.toBeVisible();

    // 5. Navigasi ke sub-menu Rekap Setor (/setor-mustahiq/rekap)
    await page.goto('/setor-mustahiq/rekap');
    await expect(
      page.getByRole('heading', { name: /Rekap Setor Mustahiq/i })
    ).toBeVisible();

    // 6. Verifikasi Switch Tingkatan: Ula, Wustho, Ulya
    const tabUla = page.getByTestId('switch-tingkat-ula');
    const tabWustho = page.getByTestId('switch-tingkat-wustho');
    const tabUlya = page.getByTestId('switch-tingkat-ulya');
    await expect(tabUla).toBeVisible();
    await expect(tabWustho).toBeVisible();
    await expect(tabUlya).toBeVisible();

    // 7. Verifikasi Kelompok & Kartu Kelas (Kolom: Hafalan, Selesai, Proses)
    await tabUla.click();
    await expect(page.getByText(/Kelompok 1 ULA/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('columnheader', { name: 'Hafalan' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Selesai' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Proses' }).first()).toBeVisible();
  });
});
