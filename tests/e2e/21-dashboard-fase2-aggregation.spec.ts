import { test, expect } from '@playwright/test';

test.describe('Fase 2: Multi-Time Slicing & Reactive Aggregation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard MADINA Blokagung/i })).toBeVisible();
  });

  test('Hari Ini slice displays 4 KBM Jam sessions and daily deltas', async ({ page }) => {
    // Verifikasi tombol aktif Hari Ini
    const tabHariIni = page.getByRole('button', { name: /Hari Ini/i });
    await expect(tabHariIni).toBeVisible();
    await tabHariIni.click();

    // Verifikasi label sumbu X linechart adalah sesi jam (Jam 1 - Jam 4)
    await expect(page.locator('text=Jam 1').first()).toBeVisible();
    await expect(page.locator('text=Jam 2').first()).toBeVisible();
    await expect(page.locator('text=Jam 3').first()).toBeVisible();
    await expect(page.locator('text=Jam 4').first()).toBeVisible();

    // Verifikasi delta indikator harian
    await expect(page.getByText(/hari ini/i).first()).toBeVisible();
  });

  test('7 Hari slice displays 6 KBM days (Sabtu-Kamis) and weekly deltas', async ({ page }) => {
    const tab7Hari = page.getByRole('button', { name: /7 Hari/i });
    await tab7Hari.click();

    // Verifikasi 6 hari KBM madin muncul di sumbu X chart
    await expect(page.locator('text=Sabtu').first()).toBeVisible();
    await expect(page.locator('text=Ahad').first()).toBeVisible();
    await expect(page.locator('text=Senin').first()).toBeVisible();
    await expect(page.locator('text=Selasa').first()).toBeVisible();
    await expect(page.locator('text=Rabu').first()).toBeVisible();
    await expect(page.locator('text=Kamis').first()).toBeVisible();

    // Verifikasi teks delta mingguan
    await expect(page.getByText(/pekan lalu/i).first()).toBeVisible();
    await expect(page.getByText(/pekan ini/i).first()).toBeVisible();
  });

  test('30 Hari slice displays 4 week buckets and monthly deltas', async ({ page }) => {
    const tab30Hari = page.getByRole('button', { name: /30 Hari/i });
    await tab30Hari.click();

    // Verifikasi 4 pekan muncul di sumbu X chart
    await expect(page.locator('text=Pekan 1').first()).toBeVisible();
    await expect(page.locator('text=Pekan 2').first()).toBeVisible();
    await expect(page.locator('text=Pekan 3').first()).toBeVisible();
    await expect(page.locator('text=Pekan 4').first()).toBeVisible();

    // Verifikasi teks delta bulanan
    await expect(page.getByText(/bulan lalu/i).first()).toBeVisible();
    await expect(page.getByText(/sebulan/i).first()).toBeVisible();
  });

  test('1 Tahun slice displays 12 academic months and yearly deltas', async ({ page }) => {
    const tab1Tahun = page.getByRole('button', { name: /1 Tahun/i });
    await tab1Tahun.click();

    // Verifikasi nama bulan siklus madin muncul di sumbu X chart
    await expect(page.locator('text=Jul').first()).toBeVisible();
    await expect(page.locator('text=Okt').first()).toBeVisible();
    await expect(page.locator('text=Jan').first()).toBeVisible();
    await expect(page.locator('text=Jun').first()).toBeVisible();

    // Verifikasi teks delta tahunan
    await expect(page.getByText(/thn ini/i).first()).toBeVisible();
    await expect(page.getByText(/tahunan/i).first()).toBeVisible();
  });

  test('muhafadzoh progress widget shows 4 jenjang and calculated targets', async ({ page }) => {
    const widgetHeading = page.getByRole('heading', { name: /Ketuntasan Muhafadzoh Nadzom/i });
    await expect(widgetHeading).toBeVisible();

    // 4 Jenjang
    await expect(page.getByText(/Kelas Unggulan/i).first()).toBeVisible();
    await expect(page.getByText(/Tingkat Ula/i).first()).toBeVisible();
    await expect(page.getByText(/Tingkat Wustho/i).first()).toBeVisible();
    await expect(page.getByText(/Tingkat Ulya/i).first()).toBeVisible();

    // Kitab nadzom spesifik
    await expect(page.getByText(/Al-Jurumiyyah & Nadzom Imrithi/i)).toBeVisible();
    await expect(page.getByText(/Alfiyyah Ibnu Malik \(Juz 1\)/i)).toBeVisible();
    await expect(page.getByText(/Alfiyyah \(Juz 2\) & Jauharul Maknun/i)).toBeVisible();

    // Link cetak piagam
    const piagamLink = page.getByRole('link', { name: /Penerbitan Piagam/i });
    await expect(piagamLink).toBeVisible();
    await expect(piagamLink).toHaveAttribute('href', '/piagam');
  });

  test('chart point hover triggers interactive tooltip', async ({ page }) => {
    // Hover pada titik chart-point-0 di grafik
    const point = page.getByTestId('chart-point-0');
    await expect(point).toBeVisible();
    await point.hover();

    // Tooltip interaktif harus muncul dengan teks 'Tingkat Hadir:'
    await expect(page.getByText(/Tingkat Hadir:/i)).toBeVisible();
  });
});
