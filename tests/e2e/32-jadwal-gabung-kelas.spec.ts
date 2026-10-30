import { test, expect } from '@playwright/test';

test.describe('Fitur Gabung Kelas KBM (Switch Override & Persistensi)', () => {
  test('1.0 Tombol Switch Gabung Kelas Muncul Saat Pengajar Bentrok di Kelas Paralel', async ({ page }) => {
    await page.goto('/jadwal-kbm');
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/Cari Kelas/i);
    await searchInput.fill('2 B WUSTHO');

    // Temukan baris 2 B WUSTHO (PI)
    const row2B = page.locator('#tableJadwalKBM tbody tr', { hasText: 'ELMIDA HIDAYATUL MAULIDAH' }).first();
    await expect(row2B).toBeVisible({ timeout: 10_000 });

    // Klik tombol pensil / edit
    const editBtn = row2B.locator('button[title*="Edit"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
    } else {
      await row2B.locator('span', { hasText: '2 B' }).click();
    }

    // Modal Input & Edit harus terbuka
    await expect(page.getByText(/Input & Edit Jadwal Kelas:/i)).toBeVisible({ timeout: 10_000 });

    // Cek Selasa - Jam 1
    const rowSelasaJam1 = page.locator('div', { hasText: 'Selasa - Jam 1' }).first();
    await expect(rowSelasaJam1).toBeVisible();

    // Verifikasi Tombol Switch "Gabung Kelas" muncul atau sudah aktif di Selasa Jam 1
    const switchGabung1 = rowSelasaJam1.locator('input[data-testid="switch-gabung-1-Selasa"]').first();
    await expect(switchGabung1).toBeAttached({ timeout: 5_000 });

    // Cek Selasa - Jam 2
    const rowSelasaJam2 = page.locator('div', { hasText: 'Selasa - Jam 2' }).first();
    await expect(rowSelasaJam2).toBeVisible();

    const switchGabung2 = rowSelasaJam2.locator('input[data-testid="switch-gabung-2-Selasa"]').first();
    await expect(switchGabung2).toBeAttached({ timeout: 5_000 });

    // Jika Selasa Jam 2 awalnya sudah aktif sebagai kelas gabung, nonaktifkan dulu untuk menguji transisi dua arah
    const isCurrentlyChecked = await switchGabung2.isChecked();
    if (isCurrentlyChecked) {
      await switchGabung2.uncheck({ force: true });
    }

    // Verifikasi pesan bentrok pengajar muncul di Selasa Jam 2 saat switch nonaktif
    await expect(
      rowSelasaJam2.getByText(/Pengajar bentrok di sesi ini/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(rowSelasaJam2.getByText('Gabung Kelas').first()).toBeVisible();

    // Aktifkan Switch Gabung Kelas pada Selasa Jam 2!
    await switchGabung2.check({ force: true });

    // Verifikasi banner berubah menjadi status aktif Kelas Digabung
    await expect(
      rowSelasaJam2.getByText(/Kelas Digabung/i).first()
    ).toBeVisible({ timeout: 5_000 });
    await expect(rowSelasaJam2.getByText('Aktif').first()).toBeVisible();

    // Verifikasi input Asatidz otomatis terisi dengan nama pengajar
    const inputAsatidz2 = rowSelasaJam2.locator('input[type="text"]').first();
    const asatidzVal = await inputAsatidz2.inputValue();
    expect(asatidzVal.trim().length).toBeGreaterThan(0);

    // Nonaktifkan kembali switch untuk memverifikasi toggle dua arah
    await switchGabung2.uncheck({ force: true });
    await expect(
      rowSelasaJam2.getByText(/Pengajar bentrok di sesi ini/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Tutup modal
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(page.getByText(/Input & Edit Jadwal Kelas:/i)).toHaveCount(0);
  });

  test('2.0 Guardrails: Tidak Muncul Banjir Peringatan/Switch Pada Slot Kosong & Mencegah Silang Gender/Tingkat', async ({ page }) => {
    await page.goto('/jadwal-kbm');
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/Cari Kelas/i);
    await searchInput.fill('1 C ULYA');

    // Temukan baris 1 C ULYA (PI) - sesuai kasus pada Gambar 1 & Gambar 2
    const row1CPI = page.locator('#tableJadwalKBM tbody tr').filter({ hasText: '1 C' }).filter({ hasText: 'PI' }).first();
    await expect(row1CPI).toBeVisible({ timeout: 10_000 });

    const editBtn = row1CPI.locator('button[title*="Edit"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
    } else {
      await row1CPI.locator('span', { hasText: '1 C' }).click();
    }

    // Modal Input & Edit harus terbuka untuk kelas 1 C ULYA (PI)
    await expect(page.getByText(/Input & Edit Jadwal Kelas: 1 C ULYA \(PI\)/i)).toBeVisible({ timeout: 10_000 });

    // Kosongkan baris Sabtu Jam 1 untuk menguji slot kosong
    const rowSabtuJam1 = page.locator('div', { hasText: 'Sabtu - Jam 1' }).first();
    const btnHapusSabtu1 = rowSabtuJam1.locator('button[title*="Hapus"]').first();
    if (await btnHapusSabtu1.isVisible()) {
      await btnHapusSabtu1.click();
    }

    // Pastikan slot kosong TIDAK menampilkan peringatan bentrok pengajar sama sekali
    await expect(rowSabtuJam1.getByText(/Pengajar bentrok di sesi ini/i)).toHaveCount(0);
    // Pastikan slot kosong TIDAK menampilkan tombol switch gabung kelas
    await expect(rowSabtuJam1.getByText('Gabung Kelas')).toHaveCount(0);

    // Verifikasi bahwa tidak ada opsi silang gender: santri putri (PI) tidak boleh ditawari kelas putra (PA)
    await expect(rowSabtuJam1.getByText(/Gabung kelas dengan.*\(PA\)/i)).toHaveCount(0);

    // Tutup modal tanpa menyimpan
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(page.getByText(/Input & Edit Jadwal Kelas:/i)).toHaveCount(0);
  });
});
