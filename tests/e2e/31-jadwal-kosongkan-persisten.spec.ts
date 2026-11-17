import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/auth';

test.describe('Verifikasi Persistensi Kosongkan Jadwal & Feedback Bentrok Asatidz', () => {
  test('1.0 Verifikasi Kelas 1 A ULA Bersih Kosong & Persisten Setelah Pembersihan Database', async ({ page }) => {
    await gotoWithAuth(page, '/jadwal-kbm');
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/Cari Kelas/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('1 A ULA');

    // Baris 1 A ULA PA
    const row1A = page.locator('#tableJadwalKBM tbody tr', { hasText: 'FIKRUL UMAM AL HANIF' }).first();
    await expect(row1A).toBeVisible({ timeout: 10_000 });

    // Pastikan seluruh sel jam mengajar kosong (-) dan tidak ada lagi guru/fan lama
    await expect(row1A.getByText('TAJWID')).toHaveCount(0);
    await expect(row1A.getByText('AKHLAQ')).toHaveCount(0);
    await expect(row1A.getByText('TAUHID')).toHaveCount(0);
  });

  test('2.0 Feedback Bentrok Pengajar di Modal Input (Kasus UST. AHMAD DIMYATI di 2 B WUSTHO)', async ({ page }) => {
    // Seed jadwal sementara melalui endpoint relasional jadwal_kbm_slots karena DB kosong
    await page.route('**/rest/v1/jadwal_kbm_slots*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          headers: {
            'access-control-allow-origin': '*',
          },
          contentType: 'application/json; charset=utf-8',
          body: JSON.stringify([
            {
              nama_asatidz: 'UST. AHMAD DIMYATI',
              hari: 'Selasa',
              jam: 1,
              fan: 'Hadits',
              lokasi: '2 A WUSTHO (PI) (Lokal)',
              kelas_lengkap: '2 A WUSTHO (PI)',
              raw_slot: 'Jam 1 | Hadits | 2 A WUSTHO (PI) (Lokal)',
            },
          ]),
        });
        return;
      }
      await route.continue();
    });

    await gotoWithAuth(page, '/jadwal-kbm');
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/Cari Kelas/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('2 B WUSTHO');

    // Temukan baris 2 B WUSTHO (PI)
    const row2B = page.locator('#tableJadwalKBM tbody tr', { hasText: 'ELMIDA HIDAYATUL MAULIDAH' }).first();
    await expect(row2B).toBeVisible({ timeout: 10_000 });

    // Klik tombol edit (pensil) pada kolom KLS
    const editBtn = row2B.locator('button[title*="Edit"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
    } else {
      // Klik nama kelas untuk membuka modal
      await row2B.locator('span', { hasText: '2 B' }).click();
    }

    // Modal Input & Edit harus terbuka
    await expect(page.getByText(/Input & Edit Jadwal Kelas:/i)).toBeVisible({ timeout: 10_000 });

    // Cek Selasa Jam 1: pilih Fan Hadits dan pastikan input Asatidz kosong agar bentrok tampil
    const rowSelasaJam1 = page.locator('div').filter({ has: page.getByText('Selasa - Jam 1', { exact: true }) }).last();
    await expect(rowSelasaJam1).toBeVisible();
    const fanInput1 = rowSelasaJam1.locator('input[list^="dl_fan_"]');
    await fanInput1.fill('Hadits');
    const asatidzInput1 = rowSelasaJam1.locator('input[list^="dl_asatidz_"]');
    await asatidzInput1.fill('');

    // Verifikasi badge peringatan bentrok di bawah input Asatidz muncul
    await expect(
      rowSelasaJam1.getByText(/Pengajar bentrok di sesi ini.*UST\. AHMAD DIMYATI.*2 A WUSTHO/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // Verifikasi datalist memiliki keterangan bentrok untuk UST. AHMAD DIMYATI
    const datalist = page.locator('#dl_asatidz_1_Selasa');
    const optionDimyati = datalist.locator('option[value*="UST. AHMAD DIMYATI"]');
    await expect(optionDimyati).toHaveAttribute('value', /2 A WUSTHO \(PI\)/, { timeout: 10_000 });

    // Tutup modal
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
  });

  test('3.0 Kosongkan Jadwal Kelas, Pindah Halaman & Kembali: Menjamin Zero Zombie Resurrect', async ({ page }) => {
    await gotoWithAuth(page, '/jadwal-kbm');
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible({ timeout: 15_000 });

    // Pindah ke halaman formasi
    await gotoWithAuth(page, '/formasi');
    await expect(page.getByRole('heading', { name: /Formasi Kelas Madin/i })).toBeVisible({ timeout: 15_000 });

    // Kembali ke /jadwal-kbm
    await gotoWithAuth(page, '/jadwal-kbm');
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible({ timeout: 15_000 });

    // Pastikan 1 A ULA tetap kosong dan tidak bangkit kembali!
    const searchInput = page.getByPlaceholder(/Cari Kelas/i);
    await searchInput.fill('1 A ULA');
    const row1A = page.locator('#tableJadwalKBM tbody tr', { hasText: 'FIKRUL UMAM AL HANIF' }).first();
    await expect(row1A).toBeVisible({ timeout: 10_000 });

    await expect(row1A.getByText('TAJWID')).toHaveCount(0);
    await expect(row1A.getByText('AKHLAQ')).toHaveCount(0);
    await expect(row1A.getByText('TAUHID')).toHaveCount(0);
  });
});
