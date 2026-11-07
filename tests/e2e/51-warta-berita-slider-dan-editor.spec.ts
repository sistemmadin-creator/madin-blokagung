import { test, expect, Page } from '@playwright/test';

async function gotoWithAuth(page: Page, targetPath: string) {
  await page.goto(targetPath);
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/login')) {
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL(`**${targetPath}**`, { timeout: 60000 });
  }
}

test.describe('Warta Berita MADINA - Waterfall Hero Slider, Form Editor & TikTok Widget', () => {
  test.setTimeout(60000);

  test('1. Beranda Publik: Hero Slider 60% dengan 5 berita, Sorotan Grid 2x2, dan Post Terbaru', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Pastikan seksi Warta & Publikasi Diniyyah tampil
    const sectionBerita = page.locator('#berita');
    await expect(sectionBerita).toBeVisible({ timeout: 15000 });

    // Verifikasi Judul Utama Seksi Berita
    await expect(sectionBerita.getByRole('heading', { name: /Kabar Madrasah & Khazanah Keilmuan Santri/i })).toBeVisible();

    // Verifikasi 5 Indikator Slide pada Hero Utama Kiri
    const slideIndicators = sectionBerita.locator('button[aria-label^="Pindah ke berita"]');
    await expect(slideIndicators).toHaveCount(5, { timeout: 15000 });

    // Verifikasi Kartu Berita Pertama di Hero Slider
    const heroCardFirst = sectionBerita.getByRole('heading', { 
      name: /Kuliah Umum & Penguatan Literasi Kitab Kuning/i 
    });
    await expect(heroCardFirst).toBeVisible();

    // Verifikasi Sorotan Grid 2x2 di sebelah kanan (memuat 4 berita tertumpuk)
    // Berita urutan ke-6 s/d ke-9
    await expect(sectionBerita.getByRole('heading', { name: /Pelaksanaan Takror Siang Intensif/i })).toBeVisible();
    await expect(sectionBerita.getByRole('heading', { name: /Bedah Kitab Alfiyyah Ibnu Malik/i })).toBeVisible();
    await expect(sectionBerita.getByRole('heading', { name: /Orientasi Sanad Kitab Kuning/i })).toBeVisible();
    await expect(sectionBerita.getByRole('heading', { name: /Simulasi Bahtsul Masail Kubro Internal/i })).toBeVisible();

    // Verifikasi Post Terbaru (Reguler) di baris bawah
    await expect(sectionBerita.getByRole('heading', { name: /Post Terbaru/i })).toBeVisible();
    await expect(sectionBerita.getByRole('heading', { name: /Pembagian Raport Evaluasi KBM/i })).toBeVisible();

    // Verifikasi Tombol Navigasi Manual Slider (Next / Prev)
    const nextBtn = sectionBerita.getByRole('button', { name: /Berita berikutnya/i });
    if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nextBtn.click();
    } else {
      // Jika tombol muncul saat hover
      await sectionBerita.locator('.lg\\:col-span-7').hover();
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();
    }

    // Klik tombol indikator slide ke-3
    await slideIndicators.nth(2).click();
    await expect(slideIndicators.nth(2)).toHaveClass(/bg-amber-400/);
  });

  test('2. Form Tulis Berita: Hapus Preset Foto Pesantren & Cek Input TikTok Video', async ({ page }) => {
    await gotoWithAuth(page, '/kelola-berita');

    // Pastikan judul halaman CMS manajemen berita tampil
    await expect(page.getByRole('heading', { name: /Manajemen Warta Berita Madina/i })).toBeVisible();

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

  test('4. Halaman Detail Warta: Layout 2 Kolom, Render Foto Sisipan, & Widget Video TikTok', async ({ page }) => {
    // Kunjungi artikel pertama (kuliah umum) dengan waitUntil domcontentloaded agar tidak terhambat script eksternal
    await page.goto('/berita/kuliah-umum-literasi-kitab-kuning-kelas-unggulan', { waitUntil: 'domcontentloaded' });

    // Verifikasi Judul Artikel Utama
    await expect(page.getByRole('heading', { name: /Kuliah Umum & Penguatan Literasi Kitab Kuning/i }).first()).toBeVisible();

    // Verifikasi Widget TikTok di Sisi Kanan (Sidebar)
    const widgetTikTok = page.getByText(/Video TikTok Warta/i);
    await expect(widgetTikTok).toBeVisible();
    await expect(page.getByText(/Dokumentasi Kegiatan Santri/i).first()).toBeVisible();

    // Verifikasi Pemutar / Iframe TikTok atau Tombol TikTok
    const btnTontonTikTok = page.getByRole('link', { name: /Tonton di Aplikasi TikTok/i });
    await expect(btnTontonTikTok).toBeVisible();

    // Verifikasi Widget Layanan Redaksi Pesantren
    await expect(page.getByText(/Layanan Warta Diniyyah/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Hubungi Redaksi Pesantren/i })).toBeVisible();
  });
});
