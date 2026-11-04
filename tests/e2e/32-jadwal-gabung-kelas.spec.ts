import { test, expect } from '@playwright/test';

test.describe('Fitur Gabung Kelas KBM (Pilihan Dropdown & Tanpa Sakelar)', () => {
  test('1.0 Alur Gabung Kelas Melalui Pilihan Dropdown Asatidz (Tanpa Sakelar)', async ({ page }) => {
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

    // Pastikan seluruh sakelar/switch gabung kelas sudah dihapus dari DOM
    await expect(page.locator('input[data-testid*="switch-gabung"]')).toHaveCount(0);

    // Cek Selasa - Jam 2
    const rowSelasaJam2 = page.locator('div', { hasText: 'Selasa - Jam 2' }).first();
    await expect(rowSelasaJam2).toBeVisible();

    // Kosongkan guru di Selasa Jam 2 terlebih dahulu jika sebelumnya terisi
    const inputAsatidz2 = rowSelasaJam2.locator('input[type="text"]').first();
    await inputAsatidz2.fill('');

    // Verifikasi pesan peringatan bentrok dan petunjuk dropdown muncul
    await expect(
      rowSelasaJam2.getByText(/Pengajar bentrok di sesi ini/i).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      rowSelasaJam2.getByText(/Pilih opsi bertanda.*GABUNG KELAS/i).first()
    ).toBeVisible();

    // Verifikasi bahwa datalist memuat opsi gabung kelas
    const datalistOptions = rowSelasaJam2.locator('datalist option');
    const optionGabung = datalistOptions.filter({ hasText: /GABUNG KELAS/i }).first();
    await expect(optionGabung).toBeAttached();

    // Pilih / isi opsi gabung kelas dari dropdown
    await inputAsatidz2.fill('[GABUNG KELAS di 2 B WUSTHO (PI)] ELMIDA HIDAYATUL MAULIDAH');

    // Verifikasi bahwa input otomatis dibersihkan menjadi nama pengajar asli
    const valBersih = await inputAsatidz2.inputValue();
    expect(valBersih).toBe('ELMIDA HIDAYATUL MAULIDAH');

    // Verifikasi bahwa badge indikator ringkas Kelas Digabung muncul
    await expect(
      rowSelasaJam2.getByText(/🤝 Kelas Digabung:/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Kosongkan kembali input untuk memverifikasi pembatalan gabung kelas yang natural
    await inputAsatidz2.fill('');
    await expect(rowSelasaJam2.getByText(/🤝 Kelas Digabung:/i)).toHaveCount(0);
    await expect(
      rowSelasaJam2.getByText(/Pengajar bentrok di sesi ini/i).first()
    ).toBeVisible({ timeout: 5_000 });

    // Tutup modal
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(page.getByText(/Input & Edit Jadwal Kelas:/i)).toHaveCount(0);
  });

  test('2.0 Guardrails: Tidak Muncul Sakelar Maupun Peringatan Pada Slot Kosong & Mencegah Silang Gender/Tingkat', async ({ page }) => {
    await page.goto('/jadwal-kbm');
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible({ timeout: 15_000 });

    const searchInput = page.getByPlaceholder(/Cari Kelas/i);
    await searchInput.fill('1 C ULYA');

    // Temukan baris 1 C ULYA (PI)
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

    // Pastikan tidak ada sakelar switch sama sekali di modal
    await expect(page.locator('input[data-testid*="switch-gabung"]')).toHaveCount(0);

    // Kosongkan baris Sabtu Jam 1 untuk menguji slot kosong
    const rowSabtuJam1 = page.locator('div', { hasText: 'Sabtu - Jam 1' }).first();
    const btnHapusSabtu1 = rowSabtuJam1.locator('button[title*="Hapus"]').first();
    if (await btnHapusSabtu1.isVisible()) {
      await btnHapusSabtu1.click();
    }

    // Pastikan slot kosong TIDAK menampilkan peringatan bentrok pengajar sama sekali
    await expect(rowSabtuJam1.getByText(/Pengajar bentrok di sesi ini/i)).toHaveCount(0);
    // Pastikan tidak ada teks 'Gabung Kelas' pada tombol switch
    await expect(rowSabtuJam1.locator('input[type="checkbox"]')).toHaveCount(0);

    // Verifikasi bahwa tidak ada opsi silang gender: santri putri (PI) tidak boleh ditawari kelas putra (PA)
    await expect(rowSabtuJam1.getByText(/Gabung kelas dengan.*\(PA\)/i)).toHaveCount(0);

    // Tutup modal tanpa menyimpan
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(page.getByText(/Input & Edit Jadwal Kelas:/i)).toHaveCount(0);
  });
});
