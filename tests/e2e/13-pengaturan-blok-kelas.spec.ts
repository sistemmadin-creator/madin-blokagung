import { test, expect } from '@playwright/test';

test.describe('Pengaturan Blok Kelas & Migrasi 6 Grup Blok Verification', () => {
  test('1.0 Master Formasi (/formasi): Tombol Atur Blok, Tab Switcher PA/PI & Hasil Migrasi 6 Grup Blok', async ({
    page,
  }) => {
    await page.goto('/formasi');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Madin/i })).toBeVisible();

    const btnAturBlok = page.getByRole('button', { name: 'Atur Blok', exact: true });
    await expect(btnAturBlok).toBeVisible();

    // Buka modal Pengaturan Blok dari halaman Master
    await btnAturBlok.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: /Pengaturan Blok Kelas Putra/i })
    ).toBeVisible();

    // Verifikasi 6 grup blok Putra hasil migrasi Kurikulum Madin.xlsx tampil di Blok Kelas Tersimpan
    await expect(dialog.getByText(/Blok Kelas Tersimpan \(6 Grup\)/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog.getByText('44 Kelas', { exact: true })).toBeVisible();
    await expect(dialog.getByText('14 Kelas', { exact: true })).toBeVisible();

    // Uji pengalih tab ke Putri (PI) dan kembali ke Putra (PA)
    const tabPutri = dialog.getByRole('button', { name: 'Putri (PI)', exact: true });
    const tabPutra = dialog.getByRole('button', { name: 'Putra (PA)', exact: true });
    await expect(tabPutri).toBeVisible();
    await tabPutri.click();
    await expect(
      dialog.getByRole('heading', { name: /Pengaturan Blok Kelas Putri/i })
    ).toBeVisible();

    await tabPutra.click();
    await expect(
      dialog.getByRole('heading', { name: /Pengaturan Blok Kelas Putra/i })
    ).toBeVisible();

    // Tutup modal
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('2.0 Formasi Kelas Putra (/formasi/pa): Lencana Blok, Edit Grup Blok & Context Menu Klik Kanan', async ({
    page,
  }) => {
    await page.goto('/formasi/pa');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Putra/i })).toBeVisible();

    const btnAturBlokPa = page.getByRole('button', {
      name: 'Atur Blok Kelas Putra',
      exact: true,
    });
    await expect(btnAturBlokPa).toBeVisible();

    // Tunggu baris 1 A ULA tampil beserta lencana Blok Induk hasil migrasi
    const row1AUla = page.locator('tbody tr', { hasText: '1 A ULA' });
    await expect(row1AUla).toBeVisible({ timeout: 15_000 });
    await expect(row1AUla.getByRole('button', { name: 'Blok Induk' }).first()).toBeVisible();

    // Klik kanan pada baris 1 A ULA untuk memunculkan context menu Pengaturan Blok
    await row1AUla.click({ button: 'right' });
    const menuEditGrup = page.getByRole('button', { name: /Edit Grup .*Blok Induk/i });
    await expect(menuEditGrup).toBeVisible();
    await menuEditGrup.click();

    // Modal terbuka langsung dalam mode Edit Grup "Blok Induk"
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Terpilih: 44 Kelas', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Sedang Diedit', { exact: true })).toBeVisible();

    // Klik Edit pada grup "Blok 4" di bagian bawah modal
    await dialog
      .locator('div.p-3', { hasText: 'Blok 4' })
      .getByRole('button', { name: 'Edit' })
      .click();

    await expect(dialog.getByText('Terpilih: 14 Kelas', { exact: true })).toBeVisible();

    // Tutup modal
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('3.0 Formasi Kelas Putri (/formasi/pi): Siklus Buat, Simpan & Hapus Grup Blok Kelas Putri', async ({
    page,
  }) => {
    await page.goto('/formasi/pi');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Putri/i })).toBeVisible();

    const row1AUlaPi = page.locator('tbody tr', { hasText: '1 A ULA' });
    await expect(row1AUlaPi).toBeVisible({ timeout: 15_000 });

    const btnAturBlokPi = page.getByRole('button', {
      name: 'Atur Blok Kelas Putri',
      exact: true,
    });
    await expect(btnAturBlokPi).toBeVisible();
    await btnAturBlokPi.click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: /Pengaturan Blok Kelas Putri/i })
    ).toBeVisible();

    // Bersihkan jika ada sisa grup uji sebelumnya
    const existingTestCard = dialog.locator('div.p-3', { hasText: 'Blok Putri Uji E2E' });
    if ((await existingTestCard.count()) > 0) {
      page.once('dialog', (confirmDialog) => confirmDialog.accept());
      await existingTestCard.getByRole('button', { name: 'Hapus' }).click();
      await expect(existingTestCard).not.toBeVisible({ timeout: 10_000 });
    }

    // Isi nama blok baru dan pilih kelas 1 A ULA
    const inputNamaBlok = dialog.getByPlaceholder(/Contoh: Blok Induk, Blok 4/i);
    await expect(inputNamaBlok).toBeVisible();
    await inputNamaBlok.fill('Blok Putri Uji E2E');

    const item1AUla = dialog.locator('div.px-3.py-2', { hasText: '1 A ULA' }).first();
    await expect(item1AUla).toBeVisible();
    await item1AUla.dispatchEvent('mousedown');
    await item1AUla.dispatchEvent('mouseup');

    await expect(dialog.getByText('Terpilih: 1 Kelas')).toBeVisible();

    // Simpan grup blok baru
    await dialog.getByRole('button', { name: 'Simpan', exact: true }).click();

    // Verifikasi grup muncul di Blok Kelas Tersimpan
    const savedCard = dialog.locator('div.p-3', { hasText: 'Blok Putri Uji E2E' });
    await expect(savedCard).toBeVisible({ timeout: 10_000 });
    await expect(savedCard.getByText('1 Kelas')).toBeVisible();

    // Tutup modal dan verifikasi lencana muncul di tabel Formasi Kelas Putri
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(
      row1AUlaPi.getByRole('button', { name: /Blok Putri Uji E2E/i }).first()
    ).toBeVisible();

    // Buka kembali modal dan hapus grup blok uji agar database kembali bersih
    await btnAturBlokPi.click();
    await expect(dialog).toBeVisible();

    page.once('dialog', (confirmDialog) => confirmDialog.accept());
    await dialog
      .locator('div.p-3', { hasText: 'Blok Putri Uji E2E' })
      .getByRole('button', { name: 'Hapus' })
      .click();

    await expect(
      dialog.locator('div.p-3', { hasText: 'Blok Putri Uji E2E' })
    ).not.toBeVisible({ timeout: 10_000 });

    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(
      row1AUlaPi.getByRole('button', { name: /Blok Putri Uji E2E/i })
    ).toHaveCount(0);
  });
});
