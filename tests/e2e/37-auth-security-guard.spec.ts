import { test, expect } from '@playwright/test';

test.describe('Keamanan Zona Publik & Privat (Supabase Auth + Middleware)', () => {
  test('1. Halaman publik (/) dan (/berita) dapat diakses tanpa login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: /Madrasah Diniyyah Al-Amiriyyah/i })
    ).toBeVisible();

    await page.goto('/berita');
    await expect(page).toHaveURL(/\/berita/);
  });

  test('2. Akses tanpa sesi ke rute (dashboard) diarahkan ke /login?next=...', async ({ page }) => {
    await page.goto('/santri');
    await expect(page).toHaveURL(/\/login\?next=%2Fsantri/);
    await expect(
      page.getByRole('heading', { name: 'Portal Pengurus MADINA' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Masuk ke Ruang Kerja Internal' })
    ).toBeVisible();
  });

  test('3. Validasi form login, toggle kata sandi, dan tata letak responsif mobile (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);

    const mainRegion = page.getByRole('main');

    // Submit kosong
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await expect(mainRegion.getByRole('alert')).toContainText('Username dan kata sandi wajib diisi.');

    // Toggle visibilitas kata sandi
    const passwordInput = page.getByLabel('Kata Sandi', { exact: true });
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Tampilkan kata sandi' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Sembunyikan kata sandi' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Kredensial salah
    await page.getByLabel('Username Pengurus').fill('admin');
    await passwordInput.fill('SalahSandi123');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await expect(mainRegion.getByRole('alert')).toContainText(
      'Username atau kata sandi tidak sesuai. Periksa kembali ejaan akun Anda.'
    );
  });

  test('4. Login akun Master Admin (admin), verifikasi profil Navbar, dan Keluar Sistem', async ({ page }) => {
    await page.goto('/santri');
    await expect(page).toHaveURL(/\/login\?next=%2Fsantri/);

    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();

    await page.waitForURL('**/santri', { timeout: 25_000 });
    await expect(page.getByRole('heading', { name: 'Database Santri' })).toBeVisible();

    // Buka dropdown profil di Navbar
    const profileBtn = page.getByRole('button', { name: /Master Administrator/i });
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    await expect(page.getByText('@admin')).toBeVisible();
    await expect(page.getByText('Master Admin', { exact: true }).first()).toBeVisible();

    // Klik Keluar / Logout
    await page.getByRole('button', { name: 'Keluar / Logout' }).click();
    await page.waitForURL('**/login', { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Portal Pengurus MADINA' })).toBeVisible();
  });

  test('5. Login akun PKM. Kurikulum (kurikulum) dan akses penuh menu dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Username Pengurus').fill('kurikulum');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Kurikulum@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();

    await page.waitForURL('**/dashboard', { timeout: 25_000 });

    const profileBtn = page.getByRole('button', { name: /PKM\. Kurikulum/i });
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    await expect(page.getByText('@kurikulum')).toBeVisible();

    // Tutup dropdown dengan Escape
    await page.keyboard.press('Escape');

    // Akses menu lain di dalam (dashboard)
    await page.goto('/santri');
    await expect(page).toHaveURL(/\/santri/);
    await expect(page.getByRole('heading', { name: 'Database Santri' })).toBeVisible();
  });
});
