import { test, expect } from '@playwright/test';
import { gotoWithAuth, loginViaForm } from './helpers/auth';

test.describe('E2E: Switch Silabus, Liburan Global, Minggu Kalender & Target Mingguan', () => {
  test.setTimeout(120_000);

  test('1. Login admin: Switch 2 mode (Matriks Setoran | Silabus), minggu kalender dinamis (4/5 minggu), dan filter bulan', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/linimasa-setor');

    await expect(
      page.getByRole('heading', { name: 'Linimasa Setor Santri' })
    ).toBeVisible({ timeout: 25_000 });

    const btnMatriks = page.getByRole('button', { name: 'Matriks Setoran', exact: true });
    const btnSilabus = page.getByRole('button', { name: 'Silabus', exact: true });

    await expect(btnMatriks).toBeVisible();
    await expect(btnSilabus).toBeVisible();
    await expect(btnMatriks).toHaveAttribute('aria-pressed', 'true');

    // Klik switch mode Silabus
    await btnSilabus.click();
    await expect(btnSilabus).toHaveAttribute('aria-pressed', 'true');

    // Verifikasi strip & kartu jadwal silabus tampil
    await expect(page.getByText(/Jadwal Silabus Aktif/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/SILABUS MUHAFADZOH KELAS/i).first()).toBeVisible();

    // Verifikasi jumlah minggu kalender dinamis (Juli 4 Mg, Agustus 5 Mg)
    await expect(page.getByText(/4 Mg · 2026/).first()).toBeVisible();
    await expect(page.getByText(/5 Mg · 2026/).first()).toBeVisible();
    await expect(page.getByText('Minggu 5').first()).toBeVisible();

    // Verifikasi tombol Export berubah menjadi Export Silabus
    await expect(page.getByRole('button', { name: /Export Silabus/i })).toBeVisible();

    // Uji filter tingkat ULA
    await page.getByRole('button', { name: /^ULA\b/i }).click();
    await expect(page.getByText(/SILABUS MUHAFADZOH KELAS .*ULA/i).first()).toBeVisible();

    // Uji filter Bulan Ini
    await page.getByRole('button', { name: /Bulan \(\d+\/12\)/i }).click();
    await page.getByRole('button', { name: /Bulan Ini/i }).click();
    await expect(page.getByRole('button', { name: /Bulan \(1\/12\)/i })).toBeVisible();

    // Kembalikan ke 12 bulan & Matriks Setoran
    await page.getByRole('button', { name: /Semua \(12 Bulan\)/i }).click();
    await page.getByRole('button', { name: /^Semua Tingkat/i }).click();
    await btnMatriks.click();
    await expect(page.getByText('Menampilkan 3 Kelas:')).toBeVisible();
  });

  test('2. Modal Atur Silabus: Target mingguan numeric, lanjutan kumulatif, rincian mingguan, dan setting Liburan', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/linimasa-setor');

    await page.getByRole('button', { name: /Atur Silabus/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // Cek sub-tab Materi & Target (aktif default) dan Pengaturan Liburan
    const tabMateri = dialog.getByRole('button', { name: /Materi & Target/i });
    const tabLiburan = dialog.getByRole('button', { name: /Pengaturan Liburan/i });
    await expect(tabMateri).toBeVisible();
    await expect(tabLiburan).toBeVisible();

    // Buka Tingkat WUSTHO untuk melihat materi numeric (Al-Fiyyah 350 / 500)
    await dialog.getByRole('button', { name: /Tingkat WUSTHO/i }).click();
    await expect(
      dialog.getByText(/Pengaturan Target Mingguan \(Nadzom \/ Bait \/ Baris\)/i).first()
    ).toBeVisible();
    await expect(dialog.getByText(/Lanjutkan angka kumulatif/i).first()).toBeVisible();

    // Buka Rincian Mingguan pada item numeric pertama
    await dialog.getByRole('button', { name: /Rincian Mingguan/i }).first().click();
    await expect(dialog.getByText(/Preview jadwal per minggu kalender/i)).toBeVisible();

    // Pindah ke sub-tab Pengaturan Liburan
    await tabLiburan.click();
    await expect(dialog.getByText(/Kalender Liburan Silabus/i)).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /Sinkronkan Kalender Kegiatan/i })
    ).toBeVisible();

    // Uji toggle 1 minggu liburan sementara pada Juni Minggu 4 lalu kembalikan lagi agar DB bersih
    const m4Btn = dialog.getByRole('button', { name: /M4 \d{2}\/06/i }).first();
    await expect(m4Btn).toBeVisible();
    const beforeText = (await m4Btn.textContent()) || '';

    await m4Btn.click();
    await expect(m4Btn).not.toHaveText(beforeText);
    await expect(m4Btn).toContainText(/LIBURAN/i);

    // Kembalikan state semula sebelum tutup
    await m4Btn.click();
    await expect(m4Btn).toHaveText(beforeText);

    await dialog.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('3. Login kurikulum: dapat mengakses Linimasa Setor Santri dan mode Silabus', async ({
    page,
  }) => {
    await loginViaForm(page, 'kurikulum', '12kurikulum34');

    await page.goto('/linimasa-setor');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: 'Linimasa Setor Santri' })
    ).toBeVisible({ timeout: 25_000 });

    const btnSilabus = page.getByRole('button', { name: 'Silabus', exact: true });
    await expect(btnSilabus).toBeVisible();
    await btnSilabus.click();
    await expect(page.getByText(/Jadwal Silabus Aktif/i)).toBeVisible({ timeout: 20_000 });
  });

  test('4. Zoom bar (3-12 Bln), jumlah kelas dinamis, dan minimize minggu bulan (Agus (26))', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/linimasa-setor');

    await expect(
      page.getByRole('heading', { name: 'Linimasa Setor Santri' })
    ).toBeVisible({ timeout: 25_000 });

    // 1. Zoom Bar presets (3 Bln | 6 Bln | 9 Bln | 12 Bln) & Zoom Out/In buttons
    const btn3Bln = page.getByRole('button', { name: '3 Bln', exact: true });
    const btn12Bln = page.getByRole('button', { name: '12 Bln', exact: true });
    const btnZoomOut = page.getByRole('button', { name: 'Zoom Out tabel', exact: true });
    const btnZoomIn = page.getByRole('button', { name: 'Zoom In tabel', exact: true });

    await expect(btn3Bln).toHaveAttribute('aria-pressed', 'true');
    await btnZoomOut.click();
    await expect(page.getByRole('button', { name: '6 Bln', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await btn12Bln.click();
    await expect(btn12Bln).toHaveAttribute('aria-pressed', 'true');

    // Reset zoom back to 3 Bln via Zoom In -> 9 -> 6 -> 3
    await btnZoomIn.click();
    await expect(page.getByRole('button', { name: '9 Bln', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await btn3Bln.click();
    await expect(btn3Bln).toHaveAttribute('aria-pressed', 'true');

    // 2. Dynamic Classes Per View: default Menampilkan 3 Kelas -> edit to 6 -> back to 3
    const btnEditClasses = page.getByRole('button', { name: /Menampilkan 3 Kelas:/i });
    await expect(btnEditClasses).toBeVisible();
    await btnEditClasses.click();

    const inputClasses = page.getByLabel('Jumlah kelas yang ditampilkan');
    await expect(inputClasses).toBeVisible();
    await inputClasses.fill('6');
    await page.getByRole('button', { name: 'Terapkan jumlah kelas' }).click();

    await expect(
      page.getByRole('button', { name: /Menampilkan (6|\d+) Kelas:/i })
    ).toBeVisible();

    // Restore back to 3 kelas
    await page.getByRole('button', { name: /Menampilkan \d+ Kelas:/i }).click();
    await page.getByRole('button', { name: '3', exact: true }).click();
    await expect(page.getByRole('button', { name: /Menampilkan 3 Kelas:/i })).toBeVisible();

    // 3. Minimize weeks on Agustus -> label becomes 'Agus (26)' -> clicking minimized cell opens modal on Agustus
    const btnMinimizeAgustus = page.getByRole('button', {
      name: /Minimize minggu bulan AGUSTUS 2026/i,
    });
    await expect(btnMinimizeAgustus).toBeVisible();
    await btnMinimizeAgustus.click();

    const btnExpandAgustus = page.getByRole('button', {
      name: /Tampilkan minggu bulan AGUSTUS 2026/i,
    });
    await expect(btnExpandAgustus).toBeVisible();
    await expect(btnExpandAgustus).toContainText('Agus (26)');

    // Click first cell in the minimized AGUSTUS 2026 column ('Agus (26)')
    const agustusCell = page.locator('tbody td[title^="Agus (26)"]').first();
    await expect(agustusCell).toBeVisible();
    await agustusCell.click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Detail Setoran Hafalan Santri' })
    ).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText(/Aktif:\s*2026-08-/)).toBeVisible();

    // Close modal & expand AGUSTUS 2026 back
    await dialog.locator('button').filter({ has: page.locator('svg') }).first().click();
    await expect(dialog).toBeHidden();

    await btnExpandAgustus.click();
    await expect(btnMinimizeAgustus).toBeVisible();
  });
});
