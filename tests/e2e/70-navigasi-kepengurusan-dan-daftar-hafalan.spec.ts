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

    // Menu level atas berurutan: Beranda, Tentang Kami, Kurikulum, Muhafadzoh, Media Madin, Mutakhorijin (tanpa Kontak di header)
    await expect(desktopNav.getByRole('link', { name: 'Beranda' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Tentang Kami' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Kurikulum' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Muhafadzoh' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Media Madin' })).toBeVisible();
    await expect(desktopNav.getByRole('button', { name: 'Mutakhorijin' })).toBeVisible();
    await expect(desktopNav.getByRole('link', { name: 'Kontak' })).toHaveCount(0);

    const navOrderTexts = await desktopNav.locator('> a, > div > button').allInnerTexts();
    expect(navOrderTexts.map((t) => t.trim())).toEqual([
      'Beranda',
      'Tentang Kami',
      'Kurikulum',
      'Muhafadzoh',
      'Media Madin',
      'Mutakhorijin',
    ]);

    // Uji dropdown Mutakhorijin -> Tsuroya (Angkatan 2026)
    await desktopNav.getByRole('button', { name: 'Mutakhorijin' }).click();
    await expect(desktopNav.getByRole('menuitem', { name: /Tsuroya/i })).toBeVisible();
    await expect(desktopNav.getByText('Angkatan 2026')).toBeVisible();
    await desktopNav.getByRole('menuitem', { name: /Tsuroya/i }).click();

    await page.waitForURL('**/mutakhorijin/tsuroya-2026');
    await expect(page.getByRole('heading', { name: 'TSUROYA', exact: true })).toBeVisible();

    // Uji Kartu Pos Momen -> buka galeri layar penuh -> tombol kembali
    await page.getByRole('button', { name: /Buka Galeri Momen/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /Kembali ke Album/i }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Uji Indeks Bab drawer & tutup Escape
    await page.getByRole('button', { name: /Indeks Bab/i }).click();
    await expect(page.getByRole('dialog', { name: /Indeks Bab Album Kenangan/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // Uji dropdown Media Madin -> Kabar Berita & Galeri Sosmed
    await desktopNav.getByRole('button', { name: 'Media Madin' }).click();
    await expect(desktopNav.getByRole('menuitem', { name: /Kabar Berita/i })).toBeVisible();
    await expect(desktopNav.getByRole('menuitem', { name: /Galeri Sosmed/i })).toBeVisible();

    // Uji dropdown Kurikulum -> Waktu KBM mengaktifkan tab jadwal di landing page
    await desktopNav.getByRole('button', { name: 'Kurikulum' }).click();
    await expect(desktopNav.getByRole('menuitem', { name: /Kurikulum Kitab/i })).toBeVisible();
    await desktopNav.getByRole('menuitem', { name: /Waktu KBM/i }).click();
    await expect(page.getByText('Takror Siang (Mudzakarah & Setoran Hafalan)')).toBeVisible();

    // Uji dropdown Tentang Kami -> Kepengurusan -> Sub-menu Kepengurusan 2026-2027
    await desktopNav.getByRole('button', { name: 'Tentang Kami' }).click();
    await expect(desktopNav.getByRole('menuitem', { name: /Statistik/i })).toBeVisible();
    await expect(desktopNav.getByRole('menuitem', { name: /3 Pilar Program/i })).toBeVisible();
    await desktopNav.getByRole('button', { name: /Kepengurusan/i }).click();
    await expect(
      desktopNav.getByRole('menuitem', { name: /Kepengurusan 2026-2027/i })
    ).toBeVisible();
    await desktopNav.getByRole('menuitem', { name: /Kepengurusan 2026-2027/i }).click();

    await page.waitForURL('**/kepengurusan/2026-2027');
    await expect(
      page.getByRole('heading', { name: /Personalia Kepengurusan Putra/i })
    ).toBeVisible();
    await expect(page.getByText('KH. Ahmad Hisyam Syafaat')).toBeVisible();
    await expect(page.getByText('Ust. Cholid Asrori')).toBeVisible();

    // Klik kartu pengurus memunculkan pop-up profil & bisa ditutup dengan Escape
    await page.getByRole('button', { name: /KH\. Ahmad Hisyam Syafaat/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('heading', { name: 'PELINDUNG' })
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    // Switch ke Kepengurusan Putri & klik personel di unit multi-anggota
    await page.getByRole('tab', { name: 'Kepengurusan Putri' }).click();
    await expect(
      page.getByRole('heading', { name: /Personalia Kepengurusan Putri/i })
    ).toBeVisible();
    await expect(page.getByText('Ustdz. Khoirotun Hisan')).toBeVisible();
    await expect(page.getByText('Ustdz. Zida Nurul Ilma')).toBeVisible();

    await page.getByRole('button', { name: /Ustdz\. Khoirotun Hisan/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: /Berikutnya/i })
    ).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Tutup dialog profil pengurus' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Cek periode sebelumnya (2025-2026) via pemilih periode
    const periodeSelect = page.getByRole('combobox', { name: 'Pilih Masa Khidmah' });
    await expect(periodeSelect).toBeVisible();
    await periodeSelect.selectOption({ label: 'Kepengurusan 2025-2026' });
    await page.waitForURL('**/kepengurusan/2025-2026');
    await expect(page.getByText(/arsip kepengurusan periode sebelumnya/i)).toBeVisible();
    await page.getByRole('link', { name: /Ke Kepengurusan 2026-2027/i }).click();
    await page.waitForURL('**/kepengurusan/2026-2027');

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

  test('3. Mobile (375px): Drawer navigasi sub-menu Kepengurusan 2026-2027 & pop-up kartu tanpa overflow', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      extraHTTPHeaders: {
        'x-forwarded-host': 'localhost:3000',
      },
    });
    const page = await context.newPage();

    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Toggle Navigation Menu' }).click();
    await page.getByRole('link', { name: /Kepengurusan 2026-2027/i }).click();
    await page.waitForURL('**/kepengurusan/2026-2027');

    await expect(
      page.getByRole('heading', { name: /Personalia Kepengurusan Putra/i })
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await page.getByRole('button', { name: /KH\. Ahmad Hisyam Syafaat/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Tutup dialog profil pengurus' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();

    // Cek halaman Mutakhorijin Tsuroya di mobile 375px tanpa horizontal overflow
    await page.goto('http://localhost:3000/mutakhorijin/tsuroya-2026');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'TSUROYA', exact: true })).toBeVisible();
    const mutakhorijinOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(mutakhorijinOverflow).toBe(false);

    await context.close();
  });
});
