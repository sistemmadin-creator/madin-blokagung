import { test, expect, Page } from '@playwright/test';

async function gotoWithAuth(page: Page, targetPath: string) {
  await page.goto(targetPath);
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/login')) {
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill((process.env.E2E_ADMIN_PASSWORD || ''));
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL(`**${targetPath}**`, { timeout: 60000 });
  }
}

test.describe('Warta Berita MADINA - Waterfall Hero Slider, Form Editor & TikTok Widget', () => {
  test.setTimeout(60000);

  test('1. Beranda Publik: Hero Slider, Sorotan, Post Terbaru & Kategori Pilihan', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-forwarded-host': 'localhost:3000',
      },
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Pastikan seksi Warta & Publikasi Diniyyah tampil
    const sectionBerita = page.locator('#berita');
    await expect(sectionBerita).toBeVisible({ timeout: 15000 });

    // Verifikasi Judul Utama Seksi Berita terbaru
    await expect(sectionBerita.getByRole('heading', { name: /Kabar Madin Blokagung/i })).toBeVisible();

    // Verifikasi indikator slide Hero dan artikel tampil (mendukung 1+ artikel dari DB live)
    const slideIndicators = sectionBerita.locator('button[aria-label^="Pindah ke berita"]');
    const indicatorCount = await slideIndicators.count();
    expect(indicatorCount).toBeGreaterThanOrEqual(1);
    await expect(sectionBerita.locator('a[href^="/berita/"]').first()).toBeVisible({ timeout: 15000 });

    // Verifikasi Post Terbaru & Kategori Pilihan di baris bawah
    await expect(sectionBerita.getByRole('heading', { name: /Post Terbaru/i })).toBeVisible();
    await expect(sectionBerita.getByRole('heading', { name: /Kategori Pilihan/i })).toBeVisible();

    // Jika lebih dari 1 slide, uji tombol navigasi slider
    if (indicatorCount > 1) {
      const nextBtn = sectionBerita.getByRole('button', { name: /Berita berikutnya/i });
      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click();
      } else {
        await sectionBerita.locator('.lg\\:col-span-7').hover();
        await expect(nextBtn).toBeVisible();
        await nextBtn.click();
      }
      if (indicatorCount >= 3) {
        await slideIndicators.nth(2).click();
        await expect(slideIndicators.nth(2)).toHaveClass(/bg-amber-400/);
      }
    }

    await context.close();
  });

  test('2. Form Tulis Berita: Hapus Preset Foto Pesantren & Cek Input TikTok Video', async ({ page }) => {
    await gotoWithAuth(page, '/kelola-berita');

    // Pastikan judul halaman CMS manajemen berita tampil
    await expect(page.getByRole('heading', { name: /Manajemen Kabar Madin Blokagung/i })).toBeVisible();

    // Buka Modal Form Tulis Berita Baru
    const tulisBeritaBtn = page.getByRole('button', { name: /Tulis Berita Baru/i }).first();
    await expect(tulisBeritaBtn).toBeVisible();
    await tulisBeritaBtn.click();

    // Verifikasi Modal Terbuka
    const modalHeading = page.getByRole('heading', { name: /Tulis Berita Baru \(Warta Madina\)/i });
    await expect(modalHeading).toBeVisible();

    // Verifikasi Fitur "Atau Pilih Foto Pesantren:" SUDAH DIHAPUS BERSIH
    await expect(page.getByText(/Atau Pilih Foto Pesantren:/i)).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Kajian Aula & Masyayikh/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Santri Sorogan Kitab/i })).not.toBeVisible();

    // Verifikasi Input Tautan Video TikTok Tersedia
    await expect(page.getByText(/Tautan Video TikTok \(Widget Jendela Samping Kanan Berita\)/i)).toBeVisible();
    const inputTikTok = page.getByPlaceholder(/tiktok\.com\/@madinblokagung\/video/i);
    await expect(inputTikTok).toBeVisible();

    // Tutup Modal dengan tombol Batal
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(modalHeading).not.toBeVisible();
  });

  test('3. Form Editor: Klik Kanan & Toolbar Sisip Foto di Sela Paragraf Teks', async ({ page }) => {
    await gotoWithAuth(page, '/kelola-berita');

    // Buka Modal Form
    await page.getByRole('button', { name: /Tulis Berita Baru/i }).first().click();

    // Temukan Textarea Konten Berita Lengkap
    const textareaKonten = page.getByPlaceholder(/Tuliskan isi berita secara mendalam/i);
    await expect(textareaKonten).toBeVisible();

    // Masukkan teks awal
    await textareaKonten.fill('Paragraf pertama liputan santri.\n\nParagraf kedua pembahasan kitab.');

    // Verifikasi Tombol Toolbar "+ Sisip Foto"
    const btnSisipToolbar = page.getByRole('button', { name: /\+ Sisip Foto/i });
    await expect(btnSisipToolbar).toBeVisible();

    // Trigger Klik Kanan (ContextMenu) pada textarea
    await textareaKonten.click({ button: 'right' });

    // Verifikasi Floating Pop-up Kecil Muncul
    const popupSisip = page.getByText(/Sisipkan Foto di Tengah Teks/i);
    await expect(popupSisip).toBeVisible();

    // Verifikasi elemen di dalam floating popup
    await expect(page.getByRole('button', { name: /Pilih File Foto \(Komputer\)/i })).toBeVisible();
    const inputUrlSisipan = page.getByPlaceholder('https://...');
    await expect(inputUrlSisipan).toBeVisible();

    // Masukkan URL dan caption foto
    await inputUrlSisipan.fill('https://images.unsplash.com/photo-test-halaqoh.jpg');
    const inputCaption = page.getByPlaceholder(/Suasana setoran hafalan nadzom/i);
    await inputCaption.fill('Halaqoh Santri Sore di Serambi Asrama');

    // Klik tombol Sisipkan Foto
    await page.getByRole('button', { name: /Sisipkan Foto/i }).click();

    // Verifikasi Popup Menutup
    await expect(popupSisip).not.toBeVisible();

    // Verifikasi Sintaks Markdown Gambar Masuk ke dalam Textarea
    const nilaiKonten = await textareaKonten.inputValue();
    expect(nilaiKonten).toContain('![Halaqoh Santri Sore di Serambi Asrama](https://images.unsplash.com/photo-test-halaqoh.jpg)');
    expect(nilaiKonten).toContain('*Foto: Halaqoh Santri Sore di Serambi Asrama*');

    // Tutup modal
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
  });

  test('4. Halaman Detail Warta: Layout 2 Kolom, Widget Redaksi, & Widget Video TikTok', async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: {
        'x-forwarded-host': 'localhost:3000',
      },
    });
    const page = await context.newPage();

    // Kunjungi arsip berita publik dan tunggu data live selesai dimuat sebelum klik kartu pertama
    await page.goto('/berita', { waitUntil: 'networkidle' });
    const firstBeritaLink = page.locator('main a[href^="/berita/"]').first();
    await expect(firstBeritaLink).toBeVisible({ timeout: 15000 });
    await firstBeritaLink.click();
    await page.waitForURL('**/berita/**', { timeout: 15000 });

    // Verifikasi Judul Artikel Utama & Breadcrumb
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('link', { name: 'Media Madin', exact: true }).first()).toBeVisible();

    // Verifikasi Widget TikTok di Sisi Kanan (Sidebar)
    const widgetTikTok = page.getByText(/Video TikTok Warta/i);
    await expect(widgetTikTok).toBeVisible();

    // Verifikasi Widget Layanan Redaksi Pesantren
    await expect(page.getByText(/Layanan Warta Diniyyah/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Hubungi Redaksi Pesantren/i })).toBeVisible();

    await context.close();
  });
});
