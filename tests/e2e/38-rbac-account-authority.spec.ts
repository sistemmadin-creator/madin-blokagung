import { test, expect } from '@playwright/test';

test.describe('Phase 2: Manajemen Akun & 5 Otoritas Khusus (Granular RBAC)', () => {
  test.setTimeout(120000);

  test('Master Admin dapat membuat akun kustom, mengonfigurasi otoritas halaman & 5 otoritas khusus, memverifikasi pembatasan pada sesi akun kustom, lalu menghapus akun uji', async ({
    page,
  }) => {
    const testUsername = 'op_rbac_e2e';

    // 1. Login sebagai Master Admin
    await page.goto('/login');
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL('**/dashboard', { timeout: 25000 });

    // 2. Buka halaman Pengaturan -> Tab Kelola Akun & Otoritas
    await page.goto('/pengaturan?tab=akun');
    await expect(
      page.getByRole('heading', { name: /Manajemen Akun & Otoritas Pengurus/i })
    ).toBeVisible({ timeout: 20000 });

    // Pastikan kartu akun bawaan (admin & kurikulum) tampil
    await expect(page.getByTestId('account-card-admin')).toBeVisible();
    await expect(page.getByTestId('account-card-kurikulum')).toBeVisible();

    // Bersihkan jika akun uji dari run sebelumnya masih ada
    const existingDeleteBtn = page.getByTestId(`btn-hapus-akun-${testUsername}`);
    if (await existingDeleteBtn.isVisible()) {
      await existingDeleteBtn.click();
      await page.getByTestId('btn-konfirmasi-hapus-akun').click();
      await expect(page.getByTestId(`account-card-${testUsername}`)).toBeHidden({
        timeout: 15000,
      });
    }

    // 3. Klik Tambah Akun Baru & isi kredensial + matriks otoritas + 5 otoritas khusus
    await page.getByTestId('btn-tambah-akun').click();
    await expect(
      page.getByRole('heading', { name: /Buat Akun Pengurus & Atur Otoritas/i })
    ).toBeVisible();

    await page.getByLabel('Nama Lengkap / Nama Akun').fill('Operator Uji RBAC');
    await page.getByLabel('Username Login').fill(testUsername);
    await page.getByLabel('Kata Sandi Login').fill('Operator@1951');
    await page.getByLabel('Label Jabatan').fill('Operator Asrama Putra');

    // Layer 1: Atur halaman Data Asatidz -> Sembunyikan, Formasi Kelas -> Baca, Data Santri -> Edit
    await page.getByTestId('perm-asatidz-sembunyikan').click();
    await page.getByTestId('perm-formasi-baca').click();
    await page.getByTestId('perm-santri-edit').click();

    // Layer 2 (5 Otoritas Khusus):
    // A. Blok Multi-Select: Pilih Blok 1 & Blok 2
    const chipBlok1 = page.getByTestId('chip-blok-Blok 1');
    if (await chipBlok1.isVisible()) {
      await chipBlok1.click();
    }
    const chipBlok2 = page.getByTestId('chip-blok-Blok 2');
    if (await chipBlok2.isVisible()) {
      await chipBlok2.click();
    }

    // B. Gender: Putra (PA)
    await page.getByTestId('gender-scope-putra').click();

    // C. Pengaturan: Non-Aktif (sembunyikan menu Pengaturan & tombol pengaturan di tiap halaman)
    await page.getByTestId('pengaturan-scope-non_aktif').click();

    // D. Sembunyikan Tombol Edit pada halaman Data Santri (walaupun akses halaman Edit)
    await page.getByTestId('hide-edit-santri').click();

    // E. Sembunyikan Tombol Hapus pada halaman Data Santri (walaupun akses halaman Edit)
    await page.getByTestId('hide-delete-santri').click();

    // Simpan akun & otoritas
    await page.getByTestId('btn-simpan-akun-otoritas').click();

    // Verifikasi kartu akun baru muncul di daftar
    const newCard = page.getByTestId(`account-card-${testUsername}`);
    await expect(newCard).toBeVisible({ timeout: 20000 });
    await expect(newCard).toContainText('Operator Uji RBAC');
    await expect(newCard).toContainText('Khusus Putra (PA)');
    await expect(newCard).toContainText('Non-Aktif (Disembunyikan)');

    // 4. Logout dari Master Admin
    await page.getByRole('button', { name: /Master Administrator/i }).click();
    await page.getByRole('button', { name: 'Keluar / Logout' }).click();
    await page.waitForURL('**/login', { timeout: 15000 });

    // 5. Login menggunakan akun kustom (op_rbac_e2e)
    await page.getByLabel('Username Pengurus').fill(testUsername);
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Operator@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL('**/dashboard', { timeout: 25000 });

    // 6. Verifikasi pada halaman /santri:
    // - Tombol Tambah Santri TETAP MUNCUL (akses halaman = edit)
    // - Tombol Hierarki Kamar DISEMBUNYIKAN (pengaturan_status = non_aktif)
    // - Tombol Hapus Bulk DISEMBUNYIKAN (hide_delete_pages mencakup 'santri')
    await page.goto('/santri');
    await expect(
      page.getByRole('heading', { name: 'Database Santri' })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /Tambah Santri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Hierarki Kamar/i })).toBeHidden();
    await expect(page.getByRole('button', { name: /^Hapus/i })).toBeHidden();

    // 7. Verifikasi pada halaman /formasi (akses halaman = baca):
    // - Tombol Hierarki Blok KBM, Generator, dan Hapus DISEMBUNYIKAN
    await page.goto('/formasi');
    await expect(
      page.getByRole('heading', { name: 'Formasi Kelas Madin' })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /Hierarki Blok KBM/i })).toBeHidden();
    await expect(page.getByRole('button', { name: /Generator/i })).toBeHidden();
    await expect(page.getByRole('button', { name: /^Hapus/i })).toBeHidden();

    // 8. Verifikasi halaman yang disembunyikan (/asatidz dan /pengaturan) ditolak oleh guard
    await page.goto('/asatidz');
    await expect(
      page.getByRole('heading', { name: 'Akses Halaman Dibatasi' })
    ).toBeVisible({ timeout: 15000 });

    await page.goto('/pengaturan');
    await expect(
      page.getByRole('heading', { name: 'Akses Halaman Dibatasi' })
    ).toBeVisible({ timeout: 15000 });

    // 9. Logout dari akun uji & login kembali sebagai Master Admin untuk membersihkan akun uji
    await page.getByRole('button', { name: /Operator Uji RBAC/i }).click();
    await page.getByRole('button', { name: 'Keluar / Logout' }).click();
    await page.waitForURL('**/login', { timeout: 15000 });

    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL('**/dashboard', { timeout: 25000 });

    await page.goto('/pengaturan?tab=akun');
    await expect(page.getByTestId(`account-card-${testUsername}`)).toBeVisible({
      timeout: 20000,
    });
    await page.getByTestId(`btn-hapus-akun-${testUsername}`).click();
    await page.getByTestId('btn-konfirmasi-hapus-akun').click();
    await expect(page.getByTestId(`account-card-${testUsername}`)).toBeHidden({
      timeout: 15000,
    });
  });
});
