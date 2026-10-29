import { test, expect } from '@playwright/test';

test.describe('Tahap 2 & 3: Pengaturan Hierarki Blok KBM (Diniyyah & Takror)', () => {
  test('1.0 Master Formasi (/formasi): Tombol Hierarki Blok KBM & Modal Terbuka', async ({
    page,
  }) => {
    await page.goto('/formasi');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Madin/i })).toBeVisible();

    // Tombol Hierarki Blok KBM di toolbar master
    const btnHierarki = page.getByRole('button', { name: /Hierarki Blok KBM/i });
    await expect(btnHierarki).toBeVisible();
    await btnHierarki.click();

    // Dialog Pengaturan Hierarki Blok KBM harus muncul
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: /Pengaturan Hierarki Blok KBM \(Diniyyah & Takror\)/i })
    ).toBeVisible();

    // Verifikasi Tab Switcher Diniyyah & Takror
    const tabDiniyyah = dialog.getByRole('button', { name: /Hierarki Diniyyah/i });
    const tabTakror = dialog.getByRole('button', { name: /Hierarki Takror/i });
    await expect(tabDiniyyah).toBeVisible();
    await expect(tabTakror).toBeVisible();

    // Verifikasi Blok default (Blok Induk) tampil di daftar blok
    await expect(dialog.getByText('Blok Induk').first()).toBeVisible({ timeout: 15_000 });

    // Uji klik tab Takror
    await tabTakror.click();
    await expect(dialog.getByText(/Daftar Blok Takror/i)).toBeVisible();

    // Kembali ke tab Diniyyah
    await tabDiniyyah.click();
    await expect(dialog.getByText(/Daftar Blok Diniyyah/i)).toBeVisible();

    // Tutup dialog
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('2.0 Siklus Tambah Blok & Ruang di dalam Modal Hierarki Blok KBM', async ({ page }) => {
    await page.goto('/formasi');

    const btnHierarki = page.getByRole('button', { name: /Hierarki Blok KBM/i });
    await btnHierarki.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Pastikan data hierarki selesai dimuat
    await expect(dialog.getByText('Blok Induk').first()).toBeVisible({ timeout: 15_000 });

    // Tambah Blok Baru untuk pengujian (unik per run)
    const suffix = Date.now().toString().slice(-4);
    const testBlokName = `Blok Uji ${suffix}`;
    const inputBlok = dialog.locator('[data-testid="input-tambah-blok"]');
    await expect(inputBlok).toBeVisible();
    await inputBlok.fill(testBlokName);

    const btnTambahBlok = dialog.locator('[data-testid="btn-tambah-blok"]');
    await btnTambahBlok.click();

    // Verifikasi kartu blok baru tampil di grid
    const cardBlok = dialog.locator(`[data-testid="card-blok-${testBlokName}"]`);
    await expect(cardBlok).toBeVisible();

    // Tambah Ruang di dalam blok uji
    const testLocationName = `Ruang Uji ${suffix}`;
    const inputLocation = cardBlok.locator('[data-testid="input-tambah-lokasi"]');
    await expect(inputLocation).toBeVisible();
    await inputLocation.fill(testLocationName);

    const btnTambahLokasi = cardBlok.locator('[data-testid="btn-tambah-lokasi"]');
    await btnTambahLokasi.click();

    // Verifikasi ruang muncul di list lokasi
    await expect(dialog.getByText(testLocationName)).toBeVisible();

    // Hapus ruang uji
    await dialog.locator(`button[title="Hapus ${testLocationName}"]`).click();
    await expect(dialog.getByText(testLocationName)).not.toBeVisible();

    // Hapus blok uji
    page.once('dialog', (confirmDialog) => confirmDialog.accept());
    await dialog.locator(`button[title="Hapus Blok ${testBlokName}"]`).click();
    await expect(cardBlok).not.toBeVisible();

    // Tutup dialog
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
  });

  test('3.0 Pengaturan Sistem (/pengaturan): Akses Modal Hierarki Blok KBM', async ({ page }) => {
    await page.goto('/pengaturan');

    await expect(page.getByRole('heading', { name: /Pengaturan Sistem Madina Blokagung/i })).toBeVisible();

    // Tombol Hierarki Blok KBM di bar aksi atas halaman Pengaturan
    const btnHierarkiTop = page.locator('[data-testid="btn-open-hierarki-kbm-modal"]');
    await expect(btnHierarkiTop).toBeVisible();
    await btnHierarkiTop.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: /Pengaturan Hierarki Blok KBM \(Diniyyah & Takror\)/i })
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();

    // Uji akses dari tab Pusat Kendali Admin
    const tabHierarki = page.locator('[data-testid="tab-hierarki"]');
    await expect(tabHierarki).toBeVisible();
    await tabHierarki.click();

    // Kartu kendali Hierarki Blok KBM di tab hierarki
    const btnControlCard = page.locator('[data-testid="btn-open-hierarki-kbm-control"]');
    await expect(btnControlCard).toBeVisible();
    await btnControlCard.click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Tutup', exact: true }).click();
  });

  test('4.0 Formasi PA & PI: Tombol Hierarki Blok KBM Berfungsi Mulus', async ({ page }) => {
    // Formasi PA
    await page.goto('/formasi/pa');
    const btnPa = page.getByRole('button', { name: /Hierarki Blok KBM/i });
    await expect(btnPa).toBeVisible();
    await btnPa.click();

    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();

    // Formasi PI
    await page.goto('/formasi/pi');
    const btnPi = page.getByRole('button', { name: /Hierarki Blok/i });
    await expect(btnPi).toBeVisible();
    await btnPi.click();

    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
  });
});
