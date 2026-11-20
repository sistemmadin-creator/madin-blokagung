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
});
