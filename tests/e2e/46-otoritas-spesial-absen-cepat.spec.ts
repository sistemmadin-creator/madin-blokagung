import { test, expect } from '@playwright/test';

test.describe('Otoritas Spesial: Sesi Perangkat Tetap & Pintasan Langsung ke Absen Cepat', () => {
  test.setTimeout(150000);

  test('Master Admin dapat mengaktifkan Saklar Otoritas Spesial pada modal Edit Akun, akun langsung diarahkan ke /absen-cepat saat login, otomatis masuk kembali tanpa login ulang di perangkat yang sama, dan baru terputus saat Logout sendiri', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Login sebagai Master Admin
    await page.goto('/login');
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL('**/dashboard', { timeout: 25000 });

    // 2. Buka halaman Pengaturan -> Tab Kelola Akun & Otoritas
    await page.goto('/pengaturan?tab=akun');
    await expect(page.getByTestId('panel-app-security-switch')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId('btn-trigger-security-switch')).toBeEnabled({
      timeout: 15000,
    });

    const initialBadgeText =
      (await page.getByTestId('status-badge-security-switch').textContent()) ||
      '';
    const wasInitiallyNonAktif = initialBadgeText.includes('NON-AKTIF');

    if (wasInitiallyNonAktif) {
      await page.getByTestId('btn-trigger-security-switch').click();
      await page.getByTestId('chk-confirm-step-1').check();
      await page.getByTestId('btn-next-step-2').click();
      await page.getByTestId('input-confirm-phrase').fill('AKTIFKAN KEAMANAN');
      await page.getByTestId('btn-next-step-3').click();
      await page.getByTestId('input-security-password').fill('KunciMadina#2026');
      await page.getByTestId('btn-submit-security-toggle').click();
    }

    await expect(page.getByTestId('status-badge-security-switch')).toContainText(
      'AKTIF (Wajib Login)',
      { timeout: 20000 }
    );

    // 3. Buat atau perbarui akun uji @piket_cepat dengan Saklar Otoritas Spesial AKTIF
    const testUser = 'piket_cepat';
    const existingCard = page.getByTestId(`account-card-${testUser}`);
    if ((await existingCard.count()) > 0) {
      await page.getByTestId(`btn-edit-akun-${testUser}`).click();
      await page.locator('#acc-password').fill('Piket@2026');
    } else {
      await page.getByTestId('btn-tambah-akun').click();
      await page.locator('#acc-fullname').fill('Petugas Piket Absen Cepat');
      await page.locator('#acc-username').fill(testUser);
      await page.locator('#acc-password').fill('Piket@2026');
      await page.locator('#acc-role-label').fill('PKM. Kesiswaan');
    }

    // Pastikan Panel Saklar Otoritas Spesial tampil tepat di bawah Bagian 1 (Opsi A)
    const panelOtoritasSpesial = page.getByTestId(
      'panel-otoritas-spesial-absen-cepat'
    );
    await expect(panelOtoritasSpesial).toBeVisible();

    const switchBtn = page.getByTestId('switch-persistent-absen-cepat');
    const isChecked = await switchBtn.getAttribute('aria-checked');
    if (isChecked !== 'true') {
      await switchBtn.click();
    }
    await expect(switchBtn).toHaveAttribute('aria-checked', 'true');
    await expect(
      page.getByTestId('status-label-persistent-absen-cepat')
    ).toContainText('AKTIF: Perangkat Tetap -> /absen-cepat');

    // Sembunyikan halaman /dashboard untuk mensimulasikan akun khusus Kesiswaan (@top)
    await page.getByTestId('perm-dashboard-sembunyikan').click();

    await page.getByTestId('btn-simpan-akun-otoritas').click();

    // Pastikan badge pada kartu akun (Gambar 1) menampilkan status Aktif -> /absen-cepat
    await expect(
      page.getByTestId(`badge-persistent-absen-cepat-${testUser}`)
    ).toContainText('Aktif -> /absen-cepat', { timeout: 20000 });

    // 4. Logout dari Master Admin
    await page.getByRole('button', { name: /Master Administrator/i }).click();
    await page.getByRole('button', { name: 'Keluar / Logout' }).click();
    await page.waitForURL('**/login', { timeout: 15000 });

    // 5. Login 1x menggunakan akun @piket_cepat -> harus langsung masuk ke /absen-cepat (bukan /dashboard)
    await page.getByLabel('Username Pengurus').fill(testUser);
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Piket@2026');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL('**/absen-cepat', { timeout: 25000 });
    await expect(page).toHaveURL(/\/absen-cepat/);

    // 6. Simulasikan sesi cookie Supabase habis di perangkat yang sama, lalu buka /login
    //    Akun TIDAK perlu mengetik username & sandi lagi, otomatis dipulihkan dan masuk ke /absen-cepat
    const cookies = await page.context().cookies();
    const nonPersistentCookies = cookies.filter(
      (c) => c.name === 'madin_persistent_absen_cepat'
    );
    await page.context().clearCookies();
    if (nonPersistentCookies.length > 0) {
      await page.context().addCookies(nonPersistentCookies);
    }

    await page.goto('/login');
    await page.waitForURL('**/absen-cepat', { timeout: 25000 });
    await expect(page).toHaveURL(/\/absen-cepat/);

    // 7. Pengguna menekan tombol Logout / Keluar sendiri dari perangkatnya -> sesi perangkat tetap dihapus bersih
    await page
      .getByRole('button', { name: /Petugas Piket Absen Cepat/i })
      .click();
    await page.getByRole('button', { name: 'Keluar / Logout' }).click();
    await page.waitForURL('**/login', { timeout: 15000 });

    // Pastikan vault perangkat sudah bersih setelah Logout sendiri
    const vaultAfterLogout = await page.evaluate(() =>
      window.localStorage.getItem('MADIN_PERSISTENT_ABSEN_CEPAT_VAULT_V1')
    );
    expect(vaultAfterLogout).toBeNull();

    // 8. Bersihkan akun uji & kembalikan status Saklar Keamanan seperti semula
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL('**/dashboard', { timeout: 25000 });

    await page.goto('/pengaturan?tab=akun');
    await expect(
      page.getByTestId(`btn-hapus-akun-${testUser}`)
    ).toBeVisible({ timeout: 20000 });
    await page.getByTestId(`btn-hapus-akun-${testUser}`).click();
    await page.getByTestId('btn-konfirmasi-hapus-akun').click();
    await expect(page.getByTestId(`account-card-${testUser}`)).toHaveCount(0, {
      timeout: 15000,
    });

    if (wasInitiallyNonAktif) {
      await page.getByTestId('btn-trigger-security-switch').click();
      await page.getByTestId('chk-confirm-step-1').check();
      await page.getByTestId('btn-next-step-2').click();
      await page
        .getByTestId('input-confirm-phrase')
        .fill('NONAKTIFKAN KEAMANAN');
      await page.getByTestId('btn-next-step-3').click();
      await page.getByTestId('input-security-password').fill('KunciMadina#2026');
      await page.getByTestId('btn-submit-security-toggle').click();
      await expect(
        page.getByTestId('status-badge-security-switch')
      ).toContainText('NON-AKTIF', { timeout: 20000 });
    }
  });
});
