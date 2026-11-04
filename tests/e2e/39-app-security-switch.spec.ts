import { test, expect } from '@playwright/test';

test.describe('Phase 3: Saklar Keamanan Aplikasi MADINA Blokagung (Konfirmasi 3x & Sandi Khusus)', () => {
  test.setTimeout(120000);

  test('Master Admin dapat menonaktifkan Keamanan Aplikasi melalui konfirmasi 3 tahap + Sandi Khusus, mengakses rute internal tanpa login, lalu mengaktifkan kembali Keamanan Aplikasi', async ({
    page,
  }) => {
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

    // Jika dari run sebelumnya status masih NON-AKTIF, aktifkan terlebih dahulu agar pengujian mulai dari kondisi AKTIF
    const initialBadgeText =
      (await page.getByTestId('status-badge-security-switch').textContent()) || '';
    if (initialBadgeText.includes('NON-AKTIF')) {
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

    // 3. Klik tombol Nonaktifkan Keamanan Aplikasi -> Buka Modal Konfirmasi 3 Tahap
    await page.getByTestId('btn-trigger-security-switch').click();

    // Tahap 1 dari 3: Centang pernyataan dampak operasional
    await expect(page.getByTestId('btn-next-step-2')).toBeDisabled();
    await page.getByTestId('chk-confirm-step-1').check();
    await expect(page.getByTestId('btn-next-step-2')).toBeEnabled();
    await page.getByTestId('btn-next-step-2').click();

    // Tahap 2 dari 3: Ketik frasa eksplisit NONAKTIFKAN KEAMANAN
    await expect(page.getByTestId('btn-next-step-3')).toBeDisabled();
    await page.getByTestId('input-confirm-phrase').fill('NONAKTIFKAN KEAMANAN');
    await expect(page.getByTestId('btn-next-step-3')).toBeEnabled();
    await page.getByTestId('btn-next-step-3').click();

    // Tahap 3 dari 3: Uji coba masukkan sandi login Master Admin (Madina@1951) -> Harus ditolak!
    await page.getByTestId('input-security-password').fill('Madina@1951');
    await page.getByTestId('btn-submit-security-toggle').click();
    await expect(page.getByTestId('security-switch-error')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId('security-switch-error')).toContainText(
      /Kata Sandi Khusus Keamanan/i
    );

    // Masukkan Kata Sandi Khusus Keamanan yang benar (KunciMadina#2026)
    await page.getByTestId('input-security-password').fill('KunciMadina#2026');
    await page.getByTestId('btn-submit-security-toggle').click();

    // Verifikasi status berubah menjadi NON-AKTIF (Mode Input Data Tanpa Login)
    await expect(page.getByTestId('status-badge-security-switch')).toContainText(
      'NON-AKTIF (Mode Input Data Tanpa Login)',
      { timeout: 20000 }
    );

    // 4. Logout dari Master Admin agar tidak ada sesi login sama sekali
    await page.getByRole('button', { name: /Master Administrator/i }).click();
    await page.getByRole('button', { name: 'Keluar / Logout' }).click();
    await page.waitForURL('**/login', { timeout: 15000 });

    // 5. Kunjungi /santri TANPA LOGIN -> Harus langsung masuk (tidak diredirect ke /login) dan mendapat akses penuh
    await page.goto('/santri');
    await expect(
      page.getByRole('heading', { name: 'Database Santri' })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /Tambah Santri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Hierarki Kamar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Hapus/i })).toBeVisible();

    // 6. Kunjungi /pengaturan?tab=akun dan Aktifkan Kembali Keamanan Aplikasi melalui Konfirmasi 3 Tahap
    await page.goto('/pengaturan?tab=akun');
    await expect(page.getByTestId('panel-app-security-switch')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByTestId('status-badge-security-switch')).toContainText(
      'NON-AKTIF (Mode Input Data Tanpa Login)',
      { timeout: 15000 }
    );
    await expect(page.getByTestId('btn-trigger-security-switch')).toBeEnabled({
      timeout: 15000,
    });
    await page.getByTestId('btn-trigger-security-switch').click();

    // Tahap 1: Centang konfirmasi
    await page.getByTestId('chk-confirm-step-1').check();
    await page.getByTestId('btn-next-step-2').click();

    // Tahap 2: Ketik AKTIFKAN KEAMANAN
    await page.getByTestId('input-confirm-phrase').fill('AKTIFKAN KEAMANAN');
    await page.getByTestId('btn-next-step-3').click();

    // Tahap 3: Masukkan Sandi Khusus Keamanan (KunciMadina#2026)
    await page.getByTestId('input-security-password').fill('KunciMadina#2026');
    await page.getByTestId('btn-submit-security-toggle').click();

    // 7. Setelah diaktifkan kembali dalam kondisi tanpa login, sistem otomatis mengunci dan mengarahkan ke /login
    await page.goto('/santri');
    await page.waitForURL('**/login?next=%2Fsantri', { timeout: 20000 });
    await expect(
      page.getByRole('heading', { name: 'Portal Pengurus MADINA' })
    ).toBeVisible();
  });
});
