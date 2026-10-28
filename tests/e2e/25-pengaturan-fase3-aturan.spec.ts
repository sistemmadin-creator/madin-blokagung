import { test, expect } from '@playwright/test';

test.describe('Fase 3: Hub Aturan Terpadu (Aturan KBM, Target Muhafadzoh, & Template Piagam)', () => {
  test('1. Pengaturan Aturan KBM & Manajemen Kalender Libur Madin', async ({ page }) => {
    await page.goto('/pengaturan?tab=akademik');
    await expect(page.getByTestId('card-aturan-akademik')).toBeVisible();

    // 1. Verifikasi header aturan KBM
    await expect(
      page.getByRole('heading', { name: /Aturan Hari Aktif & Sesi Pembelajaran KBM/i })
    ).toBeVisible();

    // 2. Klik toggle hari aktif KBM (Senin)
    const btnSenin = page.getByTestId('btn-day-senin');
    await expect(btnSenin).toBeVisible();
    await btnSenin.click(); // nonaktifkan
    await btnSenin.click(); // aktifkan kembali

    // 3. Verifikasi Jumat tidak bisa diubah (libur tetap pondok)
    const btnJumat = page.getByTestId('btn-day-jumat');
    await btnJumat.click();
    await expect(page.getByText(/Hari Jumat merupakan hari libur mingguan tetap/i)).toBeVisible();

    // 4. Ubah toleransi keterlambatan
    const inputToleransi = page.getByTestId('input-toleransi-menit');
    await inputToleransi.fill('20');

    // 5. Simpan Aturan Operasional KBM
    const btnSaveKbm = page.getByTestId('btn-save-operational-rules');
    await btnSaveKbm.click();
    await expect(
      page.getByText(/Aturan operasional KBM, jam sesi, dan toleransi berhasil diperbarui/i)
    ).toBeVisible();

    // 6. Daftarkan Hari Libur Baru
    const testDate = '2026-11-20';
    await page.getByTestId('input-tgl-libur').fill(testDate);
    await page.getByTestId('select-kategori-libur').selectOption('Ujian / Ikhtibar');
    await page.getByTestId('input-keterangan-libur').fill('Ikhtibar Cawu Ganjil');

    await page.getByTestId('btn-add-libur').click();
    await expect(
      page.getByText(new RegExp(`Hari libur pada tanggal ${testDate} berhasil didaftarkan`, 'i'))
    ).toBeVisible();

    // Verifikasi entri libur muncul di tabel daftar
    const rowLibur = page.getByTestId(`row-libur-${testDate}`);
    await expect(rowLibur).toBeVisible();
    await expect(rowLibur.getByText('Ujian / Ikhtibar')).toBeVisible();

    // 7. Hapus Hari Libur
    page.once('dialog', (dialog) => dialog.accept());
    const deleteBtn = page.getByTestId(`btn-delete-libur-${testDate}`);
    await deleteBtn.click();
    await expect(
      page.getByText(new RegExp(`Tanggal libur ${testDate} berhasil dihapus`, 'i'))
    ).toBeVisible();
  });

  test('2. Pengaturan Target Muhafadzoh Nadzom & Otorisasi Mustahiq Penjaga', async ({ page }) => {
    await page.goto('/pengaturan?tab=muhafadzoh');
    await expect(page.getByTestId('card-aturan-muhafadzoh')).toBeVisible();

    // 1. Verifikasi header aturan muhafadzoh
    await expect(
      page.getByRole('heading', { name: /Target Hafalan Nadzom Wajib Per Tingkatan Kelas/i })
    ).toBeVisible();

    // 2. Ubah target kitab wajib pada ULA_1
    const inputKitabUla1 = page.getByTestId('input-kitab-ula_1');
    await expect(inputKitabUla1).toBeVisible();
    await inputKitabUla1.fill("Juz Amma' (An-Naas - Adh-Dhuha), Aqidatul Awam");

    // 3. Tambah Penjaga Bebas / Mustahiq Baru
    const newPenjaga = 'Ust. Abdul Wahab Hasbullah';
    await page.getByTestId('input-new-penjaga').fill(newPenjaga);
    await page.getByTestId('btn-add-penjaga').click();

    // Tag penjaga baru muncul
    const tagPenjaga = page.getByTestId(
      `tag-penjaga-${newPenjaga.replace(/\s+/g, '-').toLowerCase()}`
    );
    await expect(tagPenjaga).toBeVisible();

    // 4. Ubah ambang batas minimum bait piagam
    const inputMinBait = page.getByTestId('input-min-bait-piagam');
    await inputMinBait.fill('150');

    // 5. Simpan seluruh aturan muhafadzoh
    const btnSaveMuhafadzoh = page.getByTestId('btn-save-aturan-muhafadzoh');
    await btnSaveMuhafadzoh.click();
    await expect(
      page.getByText(/Aturan target hafalan & daftar Mustahiq berhasil disimpan ke Supabase/i)
    ).toBeVisible();
  });

  test('3. Pengaturan Tipografi, Orientasi, & Penandatangan Piagam', async ({ page }) => {
    await page.goto('/pengaturan?tab=piagam');
    await expect(page.getByTestId('card-aturan-piagam')).toBeVisible();

    // 1. Verifikasi header
    await expect(
      page.getByRole('heading', { name: /Standar Desain & Tipografi Piagam Nadzom/i })
    ).toBeVisible();

    // 2. Pilih font piagam
    const fontSelect = page.getByTestId('select-font-piagam');
    await fontSelect.selectOption('Playfair Display');

    // 3. Ubah orientasi ke Portrait lalu Landscape
    const btnPortrait = page.getByTestId('btn-orientation-portrait');
    await btnPortrait.click();

    const btnLandscape = page.getByTestId('btn-orientation-landscape');
    await btnLandscape.click();

    // 4. Ubah nama penandatangan
    const inputKepala = page.getByTestId('input-kepala-madin');
    await inputKepala.fill('KH. Ahmad Munir, S.Pd.I, M.Pd');

    const inputKetua = page.getByTestId('input-ketua-muhafadzoh');
    await inputKetua.fill('Ust. M. Hasyim Asyari, M.Ag');

    // 5. Simpan template piagam
    const savePiagamBtn = page.getByTestId('btn-save-piagam-template');
    await savePiagamBtn.click();
    await expect(
      page.getByText(/Template piagam ".*" berhasil disimpan ke sistem!|Pengaturan piagam diperbarui/i)
    ).toBeVisible();
  });

  test('4. Navigasi Pintasan dari Tab Tinjauan (Overview) ke Setiap Pilar Pengaturan', async ({ page }) => {
    await page.goto('/pengaturan?tab=overview');

    // Klik Kelola KBM & Libur dari overview card
    const linkKbm = page.getByRole('button', { name: /Kelola KBM & Libur/i });
    await linkKbm.click();
    await page.waitForURL('**/pengaturan?tab=akademik');
    await expect(page.getByTestId('card-aturan-akademik')).toBeVisible();

    // Kembali ke overview lalu ke Muhafadzoh
    await page.getByTestId('tab-overview').click();
    const linkMuhafadzoh = page.getByRole('button', { name: /Kelola Muhafadzoh/i });
    await linkMuhafadzoh.click();
    await page.waitForURL('**/pengaturan?tab=muhafadzoh');
    await expect(page.getByTestId('card-aturan-muhafadzoh')).toBeVisible();

    // Kembali ke overview lalu ke Piagam
    await page.getByTestId('tab-overview').click();
    const linkPiagam = page.getByRole('button', { name: /Kelola Piagam/i });
    await linkPiagam.click();
    await page.waitForURL('**/pengaturan?tab=piagam');
    await expect(page.getByTestId('card-aturan-piagam')).toBeVisible();
  });
});
