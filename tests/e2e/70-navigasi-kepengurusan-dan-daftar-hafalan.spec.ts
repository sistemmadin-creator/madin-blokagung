import { test, expect } from '@playwright/test';

test.describe('70 - Penyederhanaan Header, Kepengurusan, & Daftar Hafalan Muhafadzoh', () => {
  test('1. Header publik terstruktur & navigasi ke Kepengurusan, Waktu KBM, Media Madin, dan Daftar Hafalan (ULA/WUSTHO/ULYA)', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-forwarded-host': 'localhost:3000',
      },
    });
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('domcontentloaded');

    const header = page.locator('header');
    const desktopNav = header.getByRole('navigation', { name: 'Navigasi Utama' });

    // Menu level atas ringkas: Beranda, Tentang Kami, Kurikulum, Media Madin, Muhafadzoh, Kontak
    await expect(desktopNav.getByRole('link', { name: 'Beranda' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Tentang Kami' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Kurikulum' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Media Madin' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Muhafadzoh' })).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: 'Kontak' })).toBeVisible();

    // Uji dropdown Media Madin -> Kabar Berita & Galeri Sosmed
    await desktopNav.getByRole('button', { name: 'Media Madin' }).click();
    await expect(desktopNav.getByRole('menuitem', { name: /Kabar Berita/i })).toBeVisible();
    await expect(desktopNav.getByRole('menuitem', { name: /Galeri Sosmed/i })).toBeVisible();

    // Uji dropdown Kurikulum -> Waktu KBM mengaktifkan tab jadwal di landing page
    await desktopNav.getByRole('button', { name: 'Kurikulum' }).click();
    await expect(desktopNav.getByRole('menuitem', { name: /Kurikulum Kitab/i })).toBeVisible();
    await desktopNav.getByRole('menuitem', { name: /Waktu KBM/i }).click();
    await expect(page.getByText('Takror Siang (Mudzakarah & Setoran Hafalan)')).toBeVisible();

    // Uji dropdown Tentang Kami -> Kepengurusan menuju halaman tersendiri
    await desktopNav.getByRole('button', { name: 'Tentang Kami' }).click();
    await expect(desktopNav.getByRole('menuitem', { name: /Statistik/i })).toBeVisible();
    await expect(desktopNav.getByRole('menuitem', { name: /3 Pilar Program/i })).toBeVisible();
    await desktopNav.getByRole('menuitem', { name: /Kepengurusan/i }).click();

    await page.waitForURL('**/kepengurusan');
    await expect(
      page.getByRole('heading', { name: /Personalia Kepengurusan Putra/i })
    ).toBeVisible();
    await expect(page.getByText('KH. Ahmad Hisyam Syafaat')).toBeVisible();
    await expect(page.getByText('Ust. Cholid Asrori')).toBeVisible();

    // Switch ke Kepengurusan Putri
    await page.getByRole('tab', { name: 'Kepengurusan Putri' }).click();
    await expect(
      page.getByRole('heading', { name: /Personalia Kepengurusan Putri/i })
    ).toBeVisible();
    await expect(page.getByText('Ustdz. Khoirotun Hisan')).toBeVisible();
    await expect(page.getByText('Ustdz. Zida Nurul Ilma')).toBeVisible();

    // Uji dropdown Muhafadzoh -> Daftar Hafalan -> ULA / WUSTHO / ULYA
    await desktopNav.getByRole('button', { name: 'Muhafadzoh' }).click();
    await expect(desktopNav.getByText('Daftar Hafalan')).toBeVisible();
    await desktopNav.getByRole('menuitem', { name: /^ULA\b/i }).click();

    await page.waitForURL('**/daftar-hafalan/ula');
    await expect(
      page.getByRole('heading', { name: /Daftar Hafalan Jenjang Ula/i })
    ).toBeVisible();
    await expect(page.getByText(/Nadhom Al-Imrithi/i)).toBeVisible();

    // Pindah ke WUSTHO dan ULYA
    await page.getByRole('link', { name: 'WUSTHO', exact: true }).click();
    await page.waitForURL('**/daftar-hafalan/wustho');
    await expect(
      page.getByRole('heading', { name: /Daftar Hafalan Jenjang Wustho/i })
    ).toBeVisible();
    await expect(page.getByText(/Al-Fiyyah 350/i)).toBeVisible();

    await page.getByRole('link', { name: 'ULYA', exact: true }).click();
    await page.waitForURL('**/daftar-hafalan/ulya');
    await expect(
      page.getByRole('heading', { name: /Daftar Hafalan Jenjang Ulya/i })
    ).toBeVisible();
    await expect(page.getByText(/Jauharul Maknun/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
    await context.close();
  });

  test('2. Dashboard Pengurus (sistem.localhost): Kelola Kepengurusan berada di bawah Kelola Galeri Sosmed', async ({
    page,
  }) => {
    const adminPassword = process.env.E2E_ADMIN_PASSWORD || '';
    test.skip(!adminPassword, 'E2E_ADMIN_PASSWORD tidak diset pada environment test');

    await page.goto('/login');
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill(adminPassword);
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL('**/dashboard**', { timeout: 25_000 });

    const sidebar = page.getByRole('complementary');
    const links = await sidebar.locator('a').allInnerTexts();
    const idxGaleri = links.findIndex((t) => t.includes('Kelola Galeri Sosmed'));
    const idxKepengurusan = links.findIndex((t) => t.includes('Kelola Kepengurusan'));
    expect(idxGaleri).toBeGreaterThan(-1);
    expect(idxKepengurusan).toBe(idxGaleri + 1);

    await sidebar.getByRole('link', { name: 'Kelola Kepengurusan' }).click();
    await page.waitForURL('**/kelola-kepengurusan');
    await expect(
      page.getByRole('heading', { name: /Kelola Kepengurusan Putra & Putri/i })
    ).toBeVisible();
  });
});
