import { test, expect } from '@playwright/test';

test.describe('Fan Pelajaran & Pengajar Fan Migration Full Verification', () => {
  test('1.0 Fan Pelajaran: Toolbar, Controls & Filter Kategori', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    // Judul halaman & Subtitle
    await expect(page.getByRole('heading', { name: /Fan Pelajaran/i })).toBeVisible();
    await expect(page.getByText('Daftar Mata Pelajaran & Konfigurasi Kelas Madin')).toBeVisible();

    // Toolbar buttons
    await expect(page.getByRole('button', { name: /Hapus/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Atur Item Fan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Atur Fan MS/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Segarkan Data/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak \/ Print/i })).toBeVisible();

    // Switch Category buttons
    const btnSemua = page.getByRole('button', { name: /Fan Pelajaran Semua/i });
    const btnReguler = page.getByRole('button', { name: /Fan Pelajaran Reguler/i });
    const btnUnggulan = page.getByRole('button', { name: /Fan Pelajaran Unggulan/i });

    await expect(btnSemua).toBeVisible();
    await expect(btnReguler).toBeVisible();
    await expect(btnUnggulan).toBeVisible();

    // Test clicking Reguler
    await btnReguler.click();
    await expect(page.getByText(/Menampilkan:.*Kelas Reguler Saja/i)).toBeVisible();

    // Test clicking Unggulan
    await btnUnggulan.click();
    await expect(page.getByText(/Menampilkan:.*Kelas Unggulan/i)).toBeVisible();

    // Test clicking Semua
    await btnSemua.click();
    await expect(page.getByText(/Menampilkan:.*Semua Kategori/i)).toBeVisible();
  });

  test('2.0 Fan Pelajaran: Matriks Kurikulum 8 Kolom & Inline Jam Input', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    // Header Dokumen Resmi
    await expect(page.getByText('DAFTAR MATA PELAJARAN KELAS')).toBeVisible();
    await expect(page.getByText('Madrasah Diniyyah Al Amiriyyah')).toBeVisible();

    // 8 Kolom Header
    await expect(page.locator('th', { hasText: 'NO' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'KLS' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'TNK' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'FAN' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'JAM' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'MATA PELAJARAN' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'PENGAJAR' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'KETERANGAN' })).toBeVisible();

    // Footer legenda
    await expect(page.getByText('*MS (Mustahiq) • MB (Munawib)')).toBeVisible();
  });

  test('3.0 Fan Pelajaran: Modal Pengaturan Item Fan (Modern Chips Builder & Dual Mode)', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    await page.getByRole('button', { name: /Atur Item Fan/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /Pengaturan Item Fan \(Mata Pelajaran\)/i })).toBeVisible();

    // Verifikasi Mode Switcher: Mode Visual (Chips) & Mode Teks Cepat
    const btnVisual = dialog.getByRole('button', { name: /Mode Visual \(Chips\)/i });
    const btnBulk = dialog.getByRole('button', { name: /Mode Teks Cepat/i });
    await expect(btnVisual).toBeVisible();
    await expect(btnBulk).toBeVisible();

    // Verifikasi Tab Jenjang Tingkat
    await expect(dialog.getByRole('button', { name: /Semua Kelas/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Tingkat ULA/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Tingkat WUSTHO/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Tingkat ULYA/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Unggulan/i })).toBeVisible();

    // Klik Tab Tingkat ULA
    await dialog.getByRole('button', { name: /Tingkat ULA/i }).click();
    await expect(dialog.getByRole('heading', { name: /1 ULA/i })).toBeVisible();

    // Uji penambahan Fan baru di kelas 1 ULA
    const inputMapel = dialog.getByPlaceholder(/Nama Kitab \/ Mata Pelajaran/i).first();
    await expect(inputMapel).toBeVisible();
    await inputMapel.fill('Mabadi Fiqih Test E2E');

    const btnTambah = dialog.getByRole('button', { name: /Tambah/i }).first();
    await expect(btnTambah).toBeVisible();
    await btnTambah.click();

    // Verifikasi chip baru muncul
    await expect(dialog.getByText('Mabadi Fiqih Test E2E')).toBeVisible();

    // Uji hapus chip baru tersebut
    const targetChip = dialog.locator('.inline-flex', { hasText: 'Mabadi Fiqih Test E2E' });
    await expect(targetChip).toBeVisible();
    await targetChip.getByTitle('Hapus mata pelajaran ini').click();
    await expect(dialog.getByText('Mabadi Fiqih Test E2E')).not.toBeVisible();

    // Uji beralih ke Mode Teks Cepat
    await btnBulk.click();
    await expect(dialog.getByPlaceholder(/Contoh: \(Fiqih\) Mabadi Fiqih/i).first()).toBeVisible();

    // Kembalikan ke Mode Visual
    await btnVisual.click();
    await expect(btnVisual).toBeVisible();

    // Tutup dialog
    await dialog.getByRole('button', { name: /Batal/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('4.0 Fan Pelajaran: Modal Atur Fan MS (Batch Setup dengan Pemisahan Cakupan Reguler vs Unggulan)', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    await page.getByRole('button', { name: /Atur Fan MS/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /Atur Fan Khusus MS \(Mustahiq\)/i })).toBeVisible();
    await expect(dialog.getByText(/1\. Tingkat Diniyyah/i)).toBeVisible();
    await expect(dialog.getByText(/2\. Din\. Kelas/i)).toBeVisible();
    await expect(dialog.getByText(/3\. Pilih Cakupan Kelas/i)).toBeVisible();

    // Verifikasi Segmented Scope Buttons
    const btnRegulerScope = dialog.getByRole('button', { name: /Kelas Reguler \(Non-Unggulan\)/i });
    const btnUnggulanScope = dialog.getByRole('button', { name: /Kelas Unggulan \(Ug\)/i });
    await expect(btnRegulerScope).toBeVisible();
    await expect(btnUnggulanScope).toBeVisible();

    // Klik tab Kelas Unggulan
    await btnUnggulanScope.click();
    await expect(dialog.getByText(/Target Bagian Unggulan/i)).toBeVisible();

    // Kembalikan ke Kelas Reguler
    await btnRegulerScope.click();
    await expect(dialog.getByText(/Centang Fan Wajib Diajar Mustahiq \(Reguler\)/i)).toBeVisible();

    // Verifikasi tombol pembersihan mandiri
    await expect(dialog.getByRole('button', { name: /Bersihkan Mustahiq Unggulan dari Reguler/i })).toBeVisible();

    // Tutup dialog
    await dialog.getByRole('button', { name: /Batal/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('5.0 Fan Pelajaran: Modal Pilih Asatidz Fan dari Kolom Pengajar', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    // Cari salah satu sel pengajar yang bisa diklik
    const pengajarCell = page.locator('td[title*="Klik untuk memilih"]').first();
    if (await pengajarCell.isVisible()) {
      await pengajarCell.click();
      await expect(page.getByRole('heading', { name: /Pilih Asatidz Pengajar/i })).toBeVisible();
      await expect(page.getByText('Kategori Asatidz (Pilih Salah Satu / Keduanya):')).toBeVisible();
      await expect(page.getByPlaceholder('Ketik nama Asatidz / NIA...')).toBeVisible();

      // Tutup dialog
      await page.getByRole('button', { name: /Batal/i }).click();
      await expect(page.getByRole('heading', { name: /Pilih Asatidz Pengajar/i })).not.toBeVisible();
    }
  });

  test('6.0 Pengajar Fan: Toolbar, Filter Bar, Badges & Grup Asal Modal', async ({ page }) => {
    await page.goto('/fan/pengajar');

    // Header & Subtitle
    await expect(page.getByRole('heading', { name: 'Pengajar Fan', exact: true })).toBeVisible();
    await expect(page.getByText('Rekapitulasi Fan Mata Pelajaran yang Diajarkan oleh Masing-Masing Asatidz')).toBeVisible();

    // Buttons
    await expect(page.getByRole('button', { name: /Grup Asal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Segarkan Data/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sinkronkan Jadwal/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Print \/ Cetak Dokumen/i })).toBeVisible();

    // Filter controls
    await expect(page.getByPlaceholder('Cari Kode / Nama / Fan / Jah...')).toBeVisible();
    await expect(page.getByText(/Keterisian Fan:/i)).toBeVisible();

    // Table Dokumen Resmi & 6 Kolom
    await expect(page.getByText('DAFTAR PENGAJAR FAN MATA PELAJARAN')).toBeVisible();
    await expect(page.locator('th', { hasText: 'KODE' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'NAMA' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'ASAL' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'JAH' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'MENGAJAR FAN' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'JML' })).toBeVisible();

    // Buka Modal Grup Asal
    await page.getByRole('button', { name: /Grup Asal/i }).click();
    await expect(page.getByRole('heading', { name: /Pengaturan Grup Asal Asatidz/i })).toBeVisible();
    await expect(page.getByText('Buat / Edit Grup Asal')).toBeVisible();
    await expect(page.getByText(/Grup Tersimpan/i)).toBeVisible();

    // Tutup Modal Grup Asal
    await page.getByRole('button', { name: /Tutup dialog/i }).click();
    await expect(page.getByRole('heading', { name: /Pengaturan Grup Asal Asatidz/i })).not.toBeVisible();
  });

  test('7.0 Pengajar Fan: Penelusuran Asatidz Mustahiq Unggulan & Verifikasi Lencana Fan', async ({ page }) => {
    await page.goto('/fan/pengajar');

    const searchInput = page.getByPlaceholder('Cari Kode / Nama / Fan / Jah...');
    await searchInput.fill('RIZQI MAULANA ACHMAD');

    // Baris tabel untuk Rizqi Maulana Achmad harus muncul
    const row = page.locator('tr', { hasText: 'RIZQI MAULANA ACHMAD' });
    await expect(row).toBeVisible();

    // Verifikasi lencana fan di baris tersebut
    // Harus memuat kelas unggulan (1 A WUSTHO Ug) dan tidak memuat kelas reguler bocor (1 WUSTHO)
    await expect(row.getByText(/1 A WUSTHO Ug/i).first()).toBeVisible();
    await expect(row.getByText(/Fiqih/i).first()).toBeVisible();
  });

  test('8.0 Pengajar Fan: Sticky Columns Freeze & Pencarian Toleran Spasi Ganda', async ({ page }) => {
    await page.goto('/fan/pengajar');

    // 1. Verifikasi tabel memiliki min-w-[850px]
    const table = page.locator('table.tabel-pengajar-fan');
    await expect(table).toBeVisible();
    await expect(table).toHaveClass(/min-w-\[850px\]/);

    // 2. Verifikasi sticky horizontal freeze pada th KODE dan NAMA
    const thKode = page.locator('th', { hasText: 'KODE' });
    const thNama = page.locator('th', { hasText: 'NAMA' });
    await expect(thKode).toHaveClass(/sticky/);
    await expect(thKode).toHaveClass(/left-0/);
    await expect(thNama).toHaveClass(/sticky/);
    await expect(thNama).toHaveClass(/left-\[60px\]/);

    // 3. Verifikasi pencarian toleran spasi berlebih
    const searchInput = page.getByPlaceholder('Cari Kode / Nama / Fan / Jah...');
    await searchInput.fill('  RIZQI   MAULANA   ');
    const row = page.locator('tr', { hasText: 'RIZQI MAULANA ACHMAD' });
    await expect(row).toBeVisible();

    // 4. Verifikasi tombol reset membersihkan pencarian
    await page.getByRole('button', { name: /Reset/i }).click();
    await expect(searchInput).toHaveValue('');
  });

  test('9.0 Pengajar Fan: Legenda Status Jadwal & Pembeda Visual Lencana (Solid Terjadwal vs Transparan/Draft)', async ({ page }) => {
    await page.goto('/fan/pengajar');

    // Tunggu hingga data selesai dimuat (tombol Segarkan Data aktif)
    const btnRefresh = page.getByRole('button', { name: /Segarkan Data/i });
    await expect(btnRefresh).toBeEnabled({ timeout: 20000 });

    // 1. Verifikasi Legenda Status Jadwal
    await expect(page.getByText('Terjadwal KBM (Reguler)')).toBeVisible();
    await expect(page.getByText('Terjadwal KBM (Unggulan)')).toBeVisible();
    await expect(page.getByText('Belum Terjadwal di KBM (Rancangan/Draft)')).toBeVisible();

    // 2. Verifikasi Lencana Fan Terjadwal (data-scheduled="true")
    const scheduledBadge = page.locator('span[data-scheduled="true"]').first();
    await expect(scheduledBadge).toBeVisible({ timeout: 15000 });
    const scheduledTitle = await scheduledBadge.getAttribute('title');
    expect(scheduledTitle).toContain('Terjadwal di KBM');

    // 3. Verifikasi Lencana Fan Draft (data-scheduled="false")
    const draftBadge = page.locator('span[data-scheduled="false"]').first();
    await expect(draftBadge).toBeVisible({ timeout: 15000 });
    await expect(draftBadge).toHaveClass(/border-dashed/);
    await expect(draftBadge).toHaveClass(/bg-slate-100/);
    await expect(draftBadge.getByText('Draft')).toBeVisible();
    const draftTitle = await draftBadge.getAttribute('title');
    expect(draftTitle).toContain('Belum masuk Jadwal KBM');
  });

  test('10.0 Pengajar Fan: Validasi Pasca-Rekonsiliasi Mustahiq (Husnia Asma Nazihah & Shidqil Adiliyah)', async ({ page }) => {
    await page.goto('/fan/pengajar');

    // Tunggu hingga data selesai dimuat
    const btnRefresh = page.getByRole('button', { name: /Segarkan Data/i });
    await expect(btnRefresh).toBeEnabled({ timeout: 20000 });

    const searchInput = page.getByPlaceholder('Cari Kode / Nama / Fan / Jah...');

    // 1. Verifikasi HUSNIA ASMA NAZIHAH
    await searchInput.fill('HUSNIA ASMA NAZIHAH');
    const husniaRow = page.locator('tr', { hasText: 'HUSNIA ASMA NAZIHAH' });
    await expect(husniaRow).toBeVisible();

    // Fan yang diampu harus 1 K WUSTHO, dan TIDAK boleh bocor 2 A WUSTHO Ug
    await expect(husniaRow.getByText(/1 K WUSTHO/i).first()).toBeVisible();
    await expect(husniaRow.getByText(/2 A WUSTHO/i)).toHaveCount(0);

    // 2. Verifikasi SHIDQIL ADILIYAH (Mustahiqoh 2 WUSTHO Ug)
    await searchInput.fill('SHIDQIL ADILIYAH');
    const shidqilRow = page.locator('tr', { hasText: 'SHIDQIL ADILIYAH' });
    await expect(shidqilRow).toBeVisible();

    // Harus memuat kelas 2 WUSTHO Ug dan tidak memuat 2 C WUSTHO
    await expect(shidqilRow.getByText(/2.*WUSTHO Ug/i).first()).toBeVisible();
    await expect(shidqilRow.getByText(/2 C WUSTHO/i)).toHaveCount(0);

    // 3. Reset pencarian
    await page.getByRole('button', { name: /Reset/i }).click();
    await expect(searchInput).toHaveValue('');
  });
});
