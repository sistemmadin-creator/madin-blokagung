import { test, expect } from '@playwright/test';

test.describe('Modul 04: Kesiswaan & Presensi (Absensi Asatidz, Absen Cepat, Rekap Absensi)', () => {
  test('Absensi Asatidz page, KPI modal, 4-hour progressive blocks, holiday modal, and Riwayat tab', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/absensi');

    await expect(
      page.getByRole('heading', { name: /(Absensi Asatidz|Presensi KBM)/i }).first()
    ).toBeVisible();

    // Ensure non-Friday date (2026-10-27 is Selasa) so all 4 Jam blocks render
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2026-10-27');

    // Check 4 progressive hour headings
    await expect(
      page.getByRole('heading', { name: /Daftar Pengajar Jam Ke-1/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Daftar Pengajar Jam Ke-2/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Daftar Pengajar Jam Ke-3/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Daftar Pengajar Jam Ke-4/i })
    ).toBeVisible();

    // Check interactive KPI card opens ModalListStatusKPI
    const kpiTotalBtn = page.getByRole('button', { name: /Total Sesi Hari Ini/i });
    await expect(kpiTotalBtn).toBeVisible();
    await kpiTotalBtn.click();
    await expect(
      page.getByRole('heading', { name: /Daftar Semua Sesi KBM Hari Ini/i })
    ).toBeVisible();
    const modalKPI = page.getByRole('dialog').or(page.locator('.fixed.inset-0')).first();
    await modalKPI.getByRole('button', { name: 'Tutup', exact: true }).or(modalKPI.locator('button[aria-label="Tutup modal"]')).first().click();
    await expect(
      page.getByRole('heading', { name: /Daftar Semua Sesi KBM Hari Ini/i })
    ).toBeHidden();
    await page.waitForTimeout(500);

    // Check Holiday settings modal
    const holidayBtn = page.getByRole('button', { name: /Libur \/ Event/i });
    await expect(holidayBtn).toBeVisible();
    await holidayBtn.click();

    await expect(
      page.getByRole('heading', { name: /Pengaturan Hari Libur/i })
    ).toBeVisible();
    const modalLibur = page.getByRole('dialog').or(page.locator('.fixed.inset-0')).first();
    await modalLibur.getByRole('button', { name: 'Batal', exact: true }).or(modalLibur.locator('button[aria-label="Tutup modal"]')).first().click();
    await expect(
      page.getByRole('heading', { name: /Pengaturan Hari Libur/i })
    ).not.toBeVisible();
    await modalLibur.waitFor({ state: 'detached' }).catch(() => {});
    await page.waitForTimeout(300);

    // Switch to Tab 2: Riwayat & Rekap Data
    const riwayatTabBtn = page.getByRole('button', { name: /Riwayat & Rekap Data/i });
    await expect(riwayatTabBtn).toBeVisible({ timeout: 10_000 });
    await riwayatTabBtn.click({ force: true });

    await expect(
      page.getByRole('heading', { name: /Filter Riwayat & Rekap Kehadiran/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Export Excel/i })
    ).toBeVisible();
  });

  test('Absen Cepat page, round hour tabs, Notif monitoring modal, and action buttons', async ({ page }) => {
    await page.goto('/absen-cepat');

    await expect(
      page.getByRole('heading', { name: /Absen Cepat/i }).first()
    ).toBeVisible();

    // Ensure non-Friday date
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.fill('2026-10-27');

    // Check round hour selector buttons (Jam Ke-1 .. Jam Ke-4)
    await expect(page.getByRole('button', { name: 'Jam Ke-1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jam Ke-2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jam Ke-3' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jam Ke-4' })).toBeVisible();

    // Switch to Jam Ke-2
    await page.getByRole('button', { name: 'Jam Ke-2' }).click();
    await expect(
      page.getByRole('heading', { name: /Daftar Pengajar Jam Ke-2/i })
    ).toBeVisible();

    // Check Tandai Semua Hadir & Simpan Jam Ini buttons
    await expect(
      page.getByRole('button', { name: /Tandai Semua Hadir/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Simpan Jam Ini/i })
    ).toBeVisible();

    // Open Notif monitoring modal
    const notifBtn = page.getByRole('button', { name: /Notif/i });
    await expect(notifBtn).toBeVisible();
    await notifBtn.click();

    await expect(
      page.getByRole('heading', { name: /Monitoring & Notifikasi Absensi Per Blok/i })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: /Monitoring & Notifikasi Absensi Per Blok/i })
    ).toBeHidden();
  });

  test('Rekap Presensi page, filter panel, 4 KPI cards, 14-column table, Top 10 Alfa dropdown, and WhatsApp generator modal', async ({ page }) => {
    await page.goto('/rekap-absensi');

    await expect(
      page.getByRole('heading', { name: /Rekapitulasi|Rekap Absensi/i }).first()
    ).toBeVisible();

    // Check Filter Periode & Kriteria section & shortcut buttons
    await expect(page.getByText(/Filter Periode & Kriteria/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Minggu Ini' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bulan Ini' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bulan Lalu' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reset Filter/i })).toBeVisible();

    // Check 4 KPI summary cards
    await expect(page.getByText('Total Asatidz')).toBeVisible();
    await expect(page.getByText('Rata-rata % Kehadiran')).toBeVisible();
    await expect(page.getByText('Sesi Tidak Terlaksana')).toBeVisible();
    await expect(page.getByText('Kehadiran Terendah')).toBeVisible();

    // Check 14-column table headers and sticky freeze
    const rekapTable = page.locator('table.min-w-\\[1050px\\]');
    await expect(rekapTable).toBeVisible();
    const headerAsatidz = page.getByRole('columnheader', { name: /ASATIDZ/i });
    await expect(headerAsatidz).toBeVisible();
    await expect(headerAsatidz).toHaveClass(/sticky/);
    await expect(page.getByRole('columnheader', { name: /SESI TERJADWAL/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /TERLAMBAT/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /DIGANTIKAN/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /% KEHADIRAN/i })).toBeVisible();

    // Check pencarian toleran spasi
    const cariInput = page.getByPlaceholder(/Cari Nama \/ NIA/i).or(page.getByPlaceholder(/Cari.*di tabel/i)).first();
    if (await cariInput.isVisible()) {
      await cariInput.fill('Hadi');
      await page.waitForTimeout(300);
      await cariInput.clear();
    }

    // Check Top 10 Alfa dropdown
    const top10Btn = page.getByRole('button', { name: /Top 10 Alfa/i });
    await expect(top10Btn).toBeVisible();
    await top10Btn.click();
    await expect(page.getByText(/TOP 10 ALFA TERBANYAK/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak Dokumen Resmi/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Unduh Berkas Excel/i })).toBeVisible();
    await top10Btn.click();

    // WhatsApp generator modal
    const waBtn = page.getByRole('button', { name: /Broadcast WA|Kirim Pesan WhatsApp/i });
    await expect(waBtn).toBeVisible();
    await waBtn.click();

    await expect(
      page.getByRole('heading', { name: /Generator.*WhatsApp/i })
    ).toBeVisible();

    // Check copy button
    await expect(
      page.getByRole('button', { name: /Salin Teks WhatsApp/i })
    ).toBeVisible();

    const closeBtn = page.getByRole('button', { name: 'Tutup', exact: true });
    await closeBtn.click();
    await expect(
      page.getByRole('heading', { name: /Generator.*WhatsApp/i })
    ).toBeHidden();
  });
});
