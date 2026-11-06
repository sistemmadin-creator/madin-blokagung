import { test, expect } from '@playwright/test';

test.describe('Menu Baru Kalender Kegiatan (PKM. Kurikulum) & Sinkronisasi Absensi', () => {
  test('Menampilkan Kalender Masehi & Hijriyah (13 Bulan) default Tahun Ajaran saat ini 2026/2027, serta sinkronisasi otomatis ke Pengaturan Hari Libur Absensi', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Buka halaman Kalender Kegiatan
    await page.goto('/kalender-kegiatan', { waitUntil: 'networkidle' });

    const heading = page.getByTestId('heading-kalender-kegiatan');
    await expect(heading).toBeVisible({ timeout: 35000 });
    await expect(heading).toContainText('Kalender Kegiatan Madrasah Diniyyah');

    // 2. Pastikan sub-menu Kalender Kegiatan ada di bawah Jadwal KBM pada Sidebar
    await expect(
      page.getByRole('link', { name: 'Kalender Kegiatan' }).first()
    ).toBeVisible();

    // 3. Pastikan Tahun Ajaran default saat dibuka adalah Tahun Ajaran saat ini: 2026/2027 (1447/1448 H)
    await expect(page.getByTestId('select-tahun-ajaran-kalender')).toHaveValue(
      '2026/2027'
    );
    await expect(page.getByTestId('kpi-tahun-ajaran-aktif')).toContainText(
      '2026/2027'
    );
    await expect(page.getByTestId('poster-title-kalender')).toHaveText(
      'KALENDER MASEHI KEGIATAN'
    );
    await expect(page.getByTestId('card-bulan-masehi-2026-6')).toBeVisible();
    await expect(page.getByTestId('card-bulan-masehi-2027-6')).toBeVisible();

    // 4. Uji Tombol Switch ke Kalender Hijriyah pada TA 2026/2027 (1447/1448 H)
    await page.getByTestId('switch-kalender-hijriyah').click();
    await expect(page.getByTestId('poster-title-kalender')).toHaveText(
      'KALENDER HIJRIYAH KEGIATAN'
    );
    await expect(page.getByTestId('kpi-tahun-ajaran-aktif')).toContainText(
      '1447/1448 H'
    );
    await expect(page.getByTestId('card-bulan-hijri-1447-12')).toBeVisible();
    await expect(page.getByTestId('card-bulan-hijri-1448-9')).toBeVisible();
    await expect(page.getByTestId('card-bulan-hijri-1448-12')).toBeVisible();

    // 5. Uji beralih ke TA 2025/2026 untuk memeriksa data historis & kembali ke Mode Masehi
    await page.getByTestId('select-tahun-ajaran-kalender').selectOption('2025/2026');
    await page.getByTestId('switch-kalender-masehi').click();
    await expect(page.getByTestId('card-bulan-masehi-2025-6')).toBeVisible();

    // Pastikan kode kegiatan resmi tampil (misal 2025-09-07 = LM Libur Maulud, 2025-09-27 = UUB)
    await expect(
      page.getByTestId('cell-kalender-masehi-2025-9-2025-09-07')
    ).toContainText('LM');
    await expect(
      page.getByTestId('cell-kalender-masehi-2025-9-2025-09-27')
    ).toContainText('UUB');

    // Kembalikan ke TA 2026/2027 sebagai default aktif
    await page.getByTestId('select-tahun-ajaran-kalender').selectOption('2026/2027');
    await expect(page.getByTestId('select-tahun-ajaran-kalender')).toHaveValue(
      '2026/2027'
    );

    // 6. Uji Klik Tanggal pada Kalender 2026/2027 untuk membuka Modal Pengaturan Agenda & Libur KBM
    // Pilih kembali 2025/2026 sebentar untuk klik 2025-09-07 dan uji sinkronisasi ke Absensi
    await page.getByTestId('select-tahun-ajaran-kalender').selectOption('2025/2026');
    await page.getByTestId('cell-kalender-masehi-2025-9-2025-09-07').click();
    const modalAgenda = page.getByTestId('modal-atur-agenda-kalender');
    await expect(modalAgenda).toBeVisible();
    await expect(page.getByTestId('select-agenda-kode')).toHaveValue('LM');
    await expect(page.getByTestId('checkbox-agenda-libur-kbm')).toBeChecked();
    await page.getByTestId('btn-simpan-agenda-kalender').click();
    await expect(modalAgenda).toBeHidden();

    // 7. Pastikan Sinkronisasi Otomatis ke Halaman Absensi Asatidz (/absensi)
    await page.getByTestId('link-buka-absensi-2025-09-07').click();
    await expect(
      page.getByRole('heading', { name: 'Absensi Asatidz' })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/KBM Diliburkan: Libur Pondok/i)).toBeVisible();
    await expect(page.getByText(/\[LM\] Libur Maulud/i).first()).toBeVisible();

    // 8. Kembali ke /kalender-kegiatan dan uji responsivitas mobile 375x667 tanpa horizontal overflow
    await page.goto('/kalender-kegiatan', { waitUntil: 'domcontentloaded' });
    await page.setViewportSize({ width: 375, height: 667 });

    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          return document.documentElement.scrollWidth <= window.innerWidth + 1;
        });
      })
      .toBe(true);
  });
});
