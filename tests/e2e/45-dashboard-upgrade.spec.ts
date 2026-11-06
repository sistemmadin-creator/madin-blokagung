import { test, expect } from '@playwright/test';

test.describe('Pengembangan & Pembaharuan Dashboard MADINA Blokagung (/dashboard)', () => {
  test('Menghapus ikon bintang pada judul, menampilkan lencana Masehi/Pasaran/Hijriyah, indikator tanggal 7 Hari & 30 Hari (Pekan 1-4), serta widget Kalender, Sapras, Catatan To-Do, dan 8 Aksi Cepat', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Buka halaman Dashboard MADINA Blokagung dan tunggu hingga terhidrasi penuh
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    const mainHeading = page.getByTestId('dashboard-main-heading');
    await expect(mainHeading).toBeVisible({ timeout: 35000 });
    await expect(mainHeading).toHaveText('Dashboard MADINA Blokagung');

    // 2. Pastikan ikon bintang (Sparkles svg) di dalam judul h1 sudah dihapus bersih
    const svgCountInHeading = await mainHeading.locator('svg').count();
    expect(svgCountInHeading).toBe(0);

    // 3. Pastikan Lencana Penanggalan Terpadu (Masehi + Pasaran Jawa + Hijriyah) tampil di header
    const dateBadge = page.getByTestId('dashboard-header-date-badge');
    await expect(dateBadge).toBeVisible();
    await expect(dateBadge).toContainText('H');

    // 4. Uji Filter "7 Hari": Sumbu horizontal wajib menampilkan Nama Hari + Tanggal
    const btn7Hari = page.getByTestId('dashboard-filter-seminggu');
    await btn7Hari.click();
    await expect(btn7Hari).toHaveAttribute('aria-pressed', 'true');

    const chartBox = page.getByTestId('dashboard-attendance-chart');
    await expect(chartBox).toContainText('rentang seminggu');

    for (let i = 0; i < 6; i++) {
      const xAxisSvgText = await page
        .getByTestId(`chart-xaxis-weekly-${i}`)
        .textContent();
      expect(xAxisSvgText).toMatch(/(Sabtu|Ahad|Senin|Selasa|Rabu|Kamis)/);
      expect(xAxisSvgText).toMatch(
        /\d{2}\s+(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)/
      );

      const badge = page.getByTestId(`chart-weekly-badge-${i}`);
      await expect(badge).toBeVisible();
    }

    // 5. Uji Filter "30 Hari": Sumbu horizontal wajib menampilkan indikator tiap tanggal (30 titik) SERTA Pekan 1 s/d Pekan 4
    const btn30Hari = page.getByTestId('dashboard-filter-sebulan');
    await btn30Hari.click();
    await expect(btn30Hari).toHaveAttribute('aria-pressed', 'true');
    await expect(chartBox).toContainText('rentang sebulan');

    const monthlyDateCount = await page
      .locator('[data-testid^="chart-xaxis-monthly-date-"]')
      .count();
    expect(monthlyDateCount).toBe(30);

    for (let p = 1; p <= 4; p++) {
      const pekanGroupText = await page
        .getByTestId(`chart-pekan-group-${p}`)
        .textContent();
      expect(pekanGroupText).toContain(`Pekan ${p}`);

      const pekanBadge = page.getByTestId(`chart-pekan-badge-${p}`);
      await expect(pekanBadge).toBeVisible();
      await expect(pekanBadge).toContainText(`Pekan ${p}`);
    }

    // 6. Pastikan Widget 1: Kalender Kegiatan & Agenda tampil dan mendukung switch Masehi / Hijriyah
    const widgetKalender = page.getByTestId('dashboard-widget-kalender');
    await expect(widgetKalender).toBeVisible();
    await expect(widgetKalender).toContainText('Kalender Kegiatan & Agenda');

    const btnHijriyah = page.getByTestId('dashboard-kalender-switch-hijriyah');
    const btnMasehi = page.getByTestId('dashboard-kalender-switch-masehi');
    await btnHijriyah.click();
    await expect(widgetKalender).toContainText('Bertepatan:');
    await btnMasehi.click();

    // 7. Pastikan Widget 2: Kesehatan Sarana Kelas (PKM. Sapras) tampil lengkap
    const widgetSapras = page.getByTestId('dashboard-widget-sapras');
    await expect(widgetSapras).toBeVisible();
    await expect(widgetSapras).toContainText(
      'Kesehatan Sarana Kelas (PKM. Sapras)'
    );
    await expect(widgetSapras).toContainText('Papan Tulis');
    await expect(widgetSapras).toContainText('Meja Guru');

    // 8. Pastikan Widget 3: Catatan & To-Do List Aktif mendukung tambah tugas cepat & centang langsung di Dashboard
    const widgetCatatan = page.getByTestId('dashboard-widget-catatan');
    await expect(widgetCatatan).toBeVisible();
    await expect(widgetCatatan).toContainText('Catatan & To-Do List Aktif');

    const quickTodoInput = page.getByTestId('dashboard-quick-todo-input');
    const quickTodoSubmit = page.getByTestId('dashboard-quick-todo-submit');
    await quickTodoInput.fill('Verifikasi Sapras & Kalender dari Dashboard');
    await quickTodoSubmit.click();
    await expect(widgetCatatan).toContainText(
      'Verifikasi Sapras & Kalender dari Dashboard'
    );

    // 9. Pastikan Pintasan Setor Mustahiq & Kirim WA Rapor tampil di Muhafadzoh Widget & 8 Aksi Cepat tampil di QuickActionHub
    await expect(
      page.getByTestId('dashboard-muhafadzoh-setor-mustahiq')
    ).toBeVisible();
    await expect(
      page.getByTestId('dashboard-muhafadzoh-kirim-wa')
    ).toBeVisible();

    const quickActionHub = page.getByTestId('dashboard-quick-action-hub');
    await expect(quickActionHub).toBeVisible();
    await expect(quickActionHub).toContainText('Kalender Kegiatan');
    await expect(quickActionHub).toContainText('Inventaris & Sapras');
    await expect(quickActionHub).toContainText('Catatan & To-Do List');
  });
});
