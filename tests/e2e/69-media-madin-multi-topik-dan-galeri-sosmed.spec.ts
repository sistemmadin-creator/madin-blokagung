import { test, expect } from '@playwright/test';

test.describe('69 - Media Madin, Multi-Topik Berita (Umum + Jenjang), & Portofolio Galeri Sosmed', () => {
  test('1. Portal Publik (madinblokagung.com): Title, Brand Navbar, Menu Media Madin, Kabar Madin Blokagung, Filter Umum, & Switcher Galeri Sosmed', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
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

    // 3. Panah Ungu: Menu grup navigasi 'Media Madin'
    await expect(header.getByRole('button', { name: 'Media Madin' }).first()).toBeVisible();

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

    // 5b. Widget Kategori Pilihan: urutan 4 teratas Umum, Kegiatan, Event, Acara dalam kontainer scrollable
    const kategoriBox = beritaSection.getByLabel('Daftar Kategori Pilihan');
    await expect(kategoriBox).toBeVisible();
    const kategoriButtons = kategoriBox.locator('button');
    await expect(kategoriButtons).toHaveCount(8);
    await expect(kategoriButtons.nth(0)).toContainText('Umum');
    await expect(kategoriButtons.nth(1)).toContainText('Kegiatan');
    await expect(kategoriButtons.nth(2)).toContainText('Event');
    await expect(kategoriButtons.nth(3)).toContainText('Acara');
    const isScrollable = await kategoriBox.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(isScrollable).toBe(true);

    // 5c. Section Landing Page dinamis via useProfilKontenStore (#statistik, #program, #kurikulum)
    await expect(page.locator('#statistik').getByText('1951 M')).toBeVisible();
    await expect(page.locator('#program').getByRole('heading', { name: 'Kelas Reguler' })).toBeVisible();
    await expect(page.locator('#kurikulum').getByRole('button', { name: /Jenjang Ula/i })).toBeVisible();

    // 6. Switcher Mode ke 'Galeri Sosmed' di Beranda (layout Masonry ala /galeri-sosmed)
    const btnGaleriSosmedTab = beritaSection.getByRole('button', { name: 'Galeri Sosmed' });
    await btnGaleriSosmedTab.click();
    await expect(
      beritaSection.getByPlaceholder(/Cari karya Media Madin/i)
    ).toBeVisible();
    await expect(
      beritaSection.getByRole('button', { name: /Semua Platform/i })
    ).toBeVisible();
    await expect(beritaSection.getByText('Official Creator Studio')).toHaveCount(0);

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

    // Uji tombol filter platform (YouTube, Instagram, TikTok, Semua Platform) sesuai data aktual DB
    for (const labelPrefix of ['YouTube', 'Instagram', 'TikTok']) {
      const btnPlat = page.getByRole('button', { name: new RegExp(`^${labelPrefix}\\s+\\d+$`, 'i') });
      const text = (await btnPlat.innerText()).trim();
      const match = text.match(/(\d+)$/);
      const count = match ? Number(match[1]) : 0;
      await btnPlat.click();
      if (count > 0) {
        await expect(page.getByRole('button', { name: /^Tonton karya /i }).first()).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { name: /Tidak Ada Karya yang Sesuai Filter/i })).toBeVisible();
      }
    }
    await page.getByRole('button', { name: /Semua Platform/i }).click();

    // Uji tombol filter kategori topik & sub-kategori di Galeri Sosmed
    await page.getByRole('button', { name: 'Umum', exact: true }).click();
    await page.getByRole('button', { name: 'Kegiatan', exact: true }).click();
    await expect(page.getByRole('button', { name: /UUB/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Daur Awwal/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /EBTADIN/i }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Event', exact: true }).click();
    await expect(page.getByRole('button', { name: /Lalaran Kubro/i }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Acara', exact: true }).click();
    await expect(page.getByRole('button', { name: /APEL Daur Tsani/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Imtihan/i }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Semua Topik', exact: true }).click();

    // Klik pin karya pertama di papan Masonry untuk membuka Lightbox pemutar
    await page.getByRole('button', { name: /^Tonton karya /i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Tutup modal dengan Escape
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Verifikasi responsivitas 2-kolom mobile (375px) pada /galeri-sosmed tanpa overflow
    await page.setViewportSize({ width: 375, height: 812 });
    const sosmedOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(sosmedOverflow).toBe(false);
    await page.setViewportSize({ width: 1280, height: 800 });

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
    await expect(page.getByRole('button', { name: 'Media Madin' }).last()).toBeVisible();

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
    await expect(sidebar.getByRole('link', { name: 'Skala & Metrik Lembaga' })).toBeVisible();

    // Verifikasi urutan menu grup PKM. Media Madin: 3 menu CMS baru di atas Kelola Berita
    const sidebarLinks = await sidebar.locator('a').allInnerTexts();
    const idxMetrik = sidebarLinks.findIndex((t) => t.includes('Skala & Metrik Lembaga'));
    const idxModel = sidebarLinks.findIndex((t) => t.includes('Model Pembelajaran'));
    const idxKhazanah = sidebarLinks.findIndex((t) => t.includes('Khazanah Turats Salafiyah'));
    const idxBerita = sidebarLinks.findIndex((t) => t.includes('Kelola Berita'));
    const idxGaleri = sidebarLinks.findIndex((t) => t.includes('Kelola Galeri Sosmed'));

    expect(idxMetrik).toBeGreaterThan(-1);
    expect(idxModel).toBe(idxMetrik + 1);
    expect(idxKhazanah).toBe(idxModel + 1);
    expect(idxBerita).toBe(idxKhazanah + 1);
    expect(idxGaleri).toBe(idxBerita + 1);

    // Uji modal Atur Sub-Kategori di Kelola Berita
    await page.getByRole('button', { name: /Atur Sub-Kategori/i }).click();
    await expect(
      page.getByRole('heading', { name: /Pengaturan Sub-Kategori Media Madin/i })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Tutup pengaturan sub-kategori' }).click();

    // Uji akses ke 3 halaman CMS baru
    await sidebar.getByRole('link', { name: 'Skala & Metrik Lembaga' }).click();
    await page.waitForURL('**/kelola-metrik-lembaga');
    await expect(page.getByRole('heading', { name: /Kelola Skala & Metrik Lembaga/i })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Model Pembelajaran' }).click();
    await page.waitForURL('**/kelola-model-pembelajaran');
    await expect(page.getByRole('heading', { name: /Kelola Model Pembelajaran/i })).toBeVisible();

    await sidebar.getByRole('link', { name: 'Khazanah Turats Salafiyah' }).click();
    await page.waitForURL('**/kelola-khazanah-turats');
    await expect(page.getByRole('heading', { name: /Kelola Khazanah Turats Salafiyah/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Daftar Kitab Kuning/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Waktu KBM Pesantren/i })).toBeVisible();
  });
});
