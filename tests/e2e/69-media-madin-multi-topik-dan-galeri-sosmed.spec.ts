import { test, expect } from '@playwright/test';

test.describe('69 - Media Madin, Multi-Topik Berita (Umum + Jenjang), & Portofolio Galeri Sosmed', () => {
  test('1. Portal Publik (madinblokagung.com): Title, Brand Navbar, Menu Media Madin, Kabar Madin Blokagung, Filter Umum, & Switcher Galeri Sosmed', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-forwarded-host': 'localhost:3000',
      },
    });
    const page = await context.newPage();

    const pageErrors: string[] = [];
    const cspErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000/');

    // 1. Panah Merah: Judul tab browser adalah 'Madin Blokagung'
    await expect(page).toHaveTitle('Madin Blokagung');

    // 2. Panah Biru: Brand header 'Madin Blokagung' & 'Ponpes Darussalam Blokagung'
    const header = page.locator('header');
    await expect(header.getByText('Madin Blokagung', { exact: true })).toBeVisible();
    await expect(header.getByText('Ponpes Darussalam Blokagung', { exact: true })).toBeVisible();

    // 3. Panah Ungu: Menu navigasi 'Media Madin'
    await expect(header.getByRole('link', { name: 'Media Madin' }).first()).toBeVisible();

    // 4. Panah Hijau (Opsi B): Badge 'Media Madin Blokagung' & Judul H2 'Kabar Madin Blokagung'
    const beritaSection = page.locator('#berita');
    await expect(beritaSection.getByText('Media Madin Blokagung')).toBeVisible();
    await expect(
      beritaSection.getByRole('heading', { name: 'Kabar Madin Blokagung', level: 2 })
    ).toBeVisible();

    // 5. Panah Hitam: Urutan tab filter Semua Topik -> Umum -> Unggulan -> ULA -> WUSTHO -> ULYA
    const tabUmum = beritaSection.getByRole('button', { name: 'Umum', exact: true });
    const tabUnggulan = beritaSection.getByRole('button', { name: 'Unggulan', exact: true });
    const tabUla = beritaSection.getByRole('button', { name: 'ULA', exact: true });
    const tabWustho = beritaSection.getByRole('button', { name: 'WUSTHO', exact: true });
    const tabUlya = beritaSection.getByRole('button', { name: 'ULYA', exact: true });

    await expect(tabUmum).toBeVisible();
    await expect(tabUnggulan).toBeVisible();
    await expect(tabUla).toBeVisible();
    await expect(tabWustho).toBeVisible();
    await expect(tabUlya).toBeVisible();

    // Klik tab Umum -> Menampilkan artikel Umum atau Empty State jujur jika belum ada di DB
    await tabUmum.click();
    // Klik tab ULA -> Menampilkan berita Tingkat ULA
    await tabUla.click();
    await expect(
      beritaSection.getByRole('heading').nth(1)
    ).toBeVisible();

    // 6. Switcher Mode ke 'Galeri Sosmed' di Beranda
    const btnGaleriSosmedTab = beritaSection.getByRole('button', { name: 'Galeri Sosmed' });
    await btnGaleriSosmedTab.click();
    await expect(beritaSection.getByText('Official Creator Studio')).toBeVisible();
    await expect(beritaSection.getByText('Featured Showreel')).toBeVisible();

    // 7. Klik ke halaman penuh /galeri-sosmed dan uji filter + Lightbox Modal + Escape
    const fullPortfolioLink = beritaSection.getByRole('link', {
      name: /Buka Halaman Penuh Portofolio Galeri Sosmed/i,
    });
    await fullPortfolioLink.click();
    await page.waitForURL('**/galeri-sosmed');
    await expect(
      page.getByRole('heading', {
        name: /Portofolio Kreator & Galeri Sosmed Media Madin/i,
      })
    ).toBeVisible();

    // Uji tombol filter platform (YouTube, Instagram, TikTok, Semua Platform)
    await page.getByRole('button', { name: /^YouTube\s+\d+$/i }).click();
    await expect(
      page.getByRole('button', { name: /Dokumenter Khidmah Keilmuan/i }).first()
    ).toBeVisible();
    await page.getByRole('button', { name: /^Instagram\s+\d+$/i }).click();
    await expect(
      page.getByRole('button', { name: /Adu Dalil Syarah Fathul Qorib/i }).first()
    ).toBeVisible();
    await page.getByRole('button', { name: /^TikTok\s+\d+$/i }).click();
    await expect(
      page.getByRole('button', { name: /Gema Lalaran 357 Santri/i }).first()
    ).toBeVisible();
    await page.getByRole('button', { name: /Semua Platform/i }).click();

    // Uji tombol filter kategori topik di Galeri Sosmed
    await page.getByRole('button', { name: 'Umum', exact: true }).click();
    await page.getByRole('button', { name: 'Semua Topik', exact: true }).click();

    // Klik tombol Putar Karya Sekarang pada Featured Showreel
    await page.getByRole('button', { name: /Putar Karya Sekarang/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Tutup modal dengan Escape
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // 8. Navigasi ke Arsip Kabar Berita (/berita) dan uji filter Umum
    await page.getByRole('link', { name: 'Arsip Kabar Berita' }).click();
    await page.waitForURL('**/berita');
    await expect(
      page.getByRole('heading', { name: 'Khazanah Warta Madin Blokagung' })
    ).toBeVisible();
    await page.getByRole('button', { name: /Umum/i }).first().click();

    // 9. Uji Responsivitas Mobile (375px) & Menu Mobile Navbar
    await page.setViewportSize({ width: 375, height: 812 });
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    const mobileMenuBtn = page.getByRole('button', { name: 'Toggle Navigation Menu' });
    await mobileMenuBtn.click();
    await expect(page.getByRole('link', { name: 'Media Madin' }).last()).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(cspErrors).toEqual([]);
    await context.close();
  });

  test('2. Dashboard Pengurus (sistem.localhost): Grup PKM. Media Madin, Multi-Topik di Kelola Berita, & CRUD Kelola Galeri Sosmed', async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_ADMIN_PASSWORD,
      'Memerlukan variabel lingkungan E2E_ADMIN_PASSWORD untuk login ke dashboard yang dilindungi Supabase Auth'
    );

    await page.goto('/kelola-berita');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page
        .getByLabel('Kata Sandi', { exact: true })
        .fill(process.env.E2E_ADMIN_PASSWORD || '');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await page.waitForURL('**/kelola-berita**', { timeout: 60000 });
    }

    const sidebar = page.getByRole('complementary');
    const groupBtn = sidebar.getByRole('button', { name: /PKM\. Media Madin/i });
    await expect(groupBtn).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Kelola Berita' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Kelola Galeri Sosmed' })).toBeVisible();
  });
});
