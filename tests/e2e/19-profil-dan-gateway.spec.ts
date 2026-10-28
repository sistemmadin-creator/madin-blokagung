import { test, expect } from '@playwright/test';

test.describe('19 - SPA Profil Madrasah (Clean Public Profile)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1.0: Beranda Profil: Navbar Bersih, Brand MADINA 1951 M, Hadits, Dawuh Pendiri & CTA Kurikulum', async ({ page }) => {
    // 1. Navbar brand
    await expect(page.locator('header').getByText('MADINA')).toBeVisible();
    await expect(page.locator('header').getByText('1951 M')).toBeVisible();

    // 2. Tombol Masuk Sistem KBM di navbar telah dihilangkan
    await expect(page.locator('header').getByRole('link', { name: /Masuk Sistem KBM/i })).toHaveCount(0);

    // 3. Hero Section
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah Al-Amiriyyah/i })).toBeVisible();
    await expect(page.getByText('Pusat Tafaqquh Fiddin & Kaderisasi Ulama Berakhlak Mulia')).toBeVisible();

    // 4. Pill badge panjang di atas Hadits telah dihilangkan
    await expect(page.getByText('Pondok Pesantren Darussalam Blokagung – Banyuwangi • Sejak 1951 M')).toHaveCount(0);

    // 5. Hadits Nabi SAW
    await expect(page.getByText('إِنَّمَا بُعِثْتُ لِأُتَمِّمَ مَكَارِمَ الْأَخْلَاقِ')).toBeVisible();
    await expect(page.getByText(/HR\. Imam Al-Baihaqi/i)).toBeVisible();

    // 6. Dawuh Almaghfurlah KH. Mukhtar Syafa'at
    await expect(page.getByText(/Openono perkoro seng ono/i)).toBeVisible();

    // 7. Hero Action Button terpusat ke Kurikulum
    await expect(page.getByRole('link', { name: /Pelajari Kurikulum & Khazanah Kitab/i })).toBeVisible();
  });

  test('2.0: Statistik Lembaga 4 Metrik & 3 Pilar Program Pendidikan (Tanpa Kotak Legalitas)', async ({ page }) => {
    const section = page.locator('#statistik');
    await expect(section).toBeVisible();

    // 4 Metrik statistik
    await expect(section.getByText('1951 M')).toBeVisible();
    await expect(section.getByText('± 5.400')).toBeVisible();
    await expect(section.getByText('161+')).toBeVisible();
    await expect(section.getByText('367+')).toBeVisible();

    // 3 Pilar program
    await expect(page.getByRole('heading', { name: 'Kelas Reguler' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Kelas Unggulan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Program Akselerasi & IHFAD' })).toBeVisible();

    // Kotak Legalitas di bawah statistik telah dihilangkan
    await expect(page.getByText('Legalitas & Pengakuan Resmi Lembaga')).toHaveCount(0);
  });

  test('3.0: Khazanah Kitab Kuning Interaktif & Tab Jenjang (Isti\'dad s/d Ulya)', async ({ page }) => {
    const kurikulumSection = page.locator('#kurikulum');
    await expect(kurikulumSection).toBeVisible();

    // Tab default: Jenjang Ula
    await expect(kurikulumSection.getByRole('button', { name: /Jenjang Ula/i })).toBeVisible();
    await expect(kurikulumSection.getByText('Tingkat Ula (Dasar Salaf)')).toBeVisible();
    await expect(kurikulumSection.getByRole('heading', { name: /Jurumiyyah Al-Bayan/i })).toBeVisible();

    // Pindah ke Jenjang Wustho
    const wusthoTab = kurikulumSection.getByRole('button', { name: /Jenjang Wustho/i });
    await wusthoTab.click();
    await expect(kurikulumSection.getByText('Tingkat Wustho (Menengah Salaf)')).toBeVisible();
    await expect(kurikulumSection.getByRole('heading', { name: /Alfiyyah Ibnu Malik/i })).toBeVisible();
    await expect(kurikulumSection.getByRole('heading', { name: /Syarah Fathul Qorib/i })).toBeVisible();

    // Pindah ke Jenjang Ulya
    const ulyaTab = kurikulumSection.getByRole('button', { name: /Jenjang Ulya/i });
    await ulyaTab.click();
    await expect(kurikulumSection.getByText('Tingkat Ulya (Tinggi & Kader Ulama)')).toBeVisible();
    await expect(kurikulumSection.getByRole('heading', { name: /Fathul Mu'in/i })).toBeVisible();
    await expect(kurikulumSection.getByRole('heading', { name: /Al-Jauharul Maknun/i })).toBeVisible();

    // Pindah ke Jenjang Isti'dad
    const istidadTab = kurikulumSection.getByRole('button', { name: /Jenjang Isti'dad/i });
    await istidadTab.click();
    await expect(kurikulumSection.getByText('Tingkat Isti\'dad (Persiapan)')).toBeVisible();
    await expect(kurikulumSection.getByRole('heading', { name: /Mabadi'ul Fiqhiyyah/i })).toBeVisible();
  });

  test('4.0: Waktu KBM Pesantren: Toggle Takror Siang & Diniyyah Malam', async ({ page }) => {
    const kurikulumSection = page.locator('#kurikulum');

    // Klik tombol switch "Waktu KBM Pesantren"
    const waktuKbmBtn = kurikulumSection.getByRole('button', { name: /Waktu KBM Pesantren/i });
    await waktuKbmBtn.click();

    // Verifikasi Takror Siang (13.30 – 15.00 WIB)
    await expect(page.getByText('Takror Siang (Mudzakarah & Setoran Hafalan)')).toBeVisible();
    await expect(page.getByText('Pukul 13.30 – 15.00 WIB')).toBeVisible();
    await expect(page.getByText('3 sesi takror 6 kelompok')).toBeVisible();

    // Verifikasi Diniyyah Malam (19.55 – 22.30 WIB)
    await expect(page.getByText('Diniyyah Malam (KBM Pokok & Sorogan)')).toBeVisible();
    await expect(page.getByText('Pukul 19.55 – 22.30 WIB')).toBeVisible();
    await expect(page.getByText('Bel tanda masuk & pencegatan Tim Oprak-Oprak (TOP)')).toBeVisible();
  });

  test('5.0: Profil Bersih Tanpa Banner Gateway & Sidebar Sistem Memiliki Tautan Balik', async ({ page }) => {
    // 1. Verifikasi Section Gateway telah dihilangkan dari halaman profil
    await expect(page.locator('#gateway')).toHaveCount(0);
    await expect(page.getByText('Pusat Kendali Akademik & Sistem KBM MADINA')).toHaveCount(0);

    // 2. Verifikasi Kolom "Sistem KBM" di footer telah dihilangkan
    await expect(page.locator('footer').getByText('Sistem KBM')).toHaveCount(0);

    // 3. Masuk ke halaman Sistem KBM secara langsung
    await page.goto('/jadwal-kbm');
    await expect(page).toHaveURL(/\/jadwal-kbm/);

    // 4. Verifikasi Tautan Balik di Sidebar Desktop
    const sidebarBackLink = page.getByRole('complementary').getByRole('link', { name: /Profil Madrasah/i });
    await expect(sidebarBackLink).toBeVisible();

    // 5. Klik Tautan Balik untuk Kembali ke Profil Madrasah
    await sidebarBackLink.click();
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah Al-Amiriyyah/i })).toBeVisible();
  });
});
