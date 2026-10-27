import { test, expect } from '@playwright/test';

test.describe('Jadwal KBM Per Kelas & Hari KBM Full Migration Verification', () => {
  test('1.0 Jadwal KBM Per Kelas: Toolbar, Mode Switcher, & Filter', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    // Judul halaman & Subtitle
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible();
    await expect(page.getByText('Struktur jadwal pembelajaran terintegrasi berbasis kelas Diniyyah')).toBeVisible();

    // Toolbar buttons
    await expect(page.getByRole('button', { name: /Segarkan Data/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak \/ Print/i })).toBeVisible();

    // Mode Switcher buttons
    const btnSemua = page.getByRole('button', { name: /Jadwal KBM Semua/i });
    const btnReguler = page.getByRole('button', { name: /Jadwal KBM Reguler/i });
    const btnUnggulan = page.getByRole('button', { name: /Jadwal KBM Unggulan/i });

    await expect(btnSemua).toBeVisible();
    await expect(btnReguler).toBeVisible();
    await expect(btnUnggulan).toBeVisible();

    // Switch to Reguler
    await btnReguler.click();
    await expect(page.getByText(/Kategori:.*Kelas Reguler Saja/i)).toBeVisible();

    // Switch to Unggulan
    await btnUnggulan.click();
    await expect(page.getByText(/Kategori:.*Kelas Unggulan/i)).toBeVisible();

    // Switch back to Semua
    await btnSemua.click();
    await expect(page.getByText(/Kategori:.*Semua Kelas/i)).toBeVisible();

    // Filter controls
    await expect(page.getByText('Tingkat Diniyyah:')).toBeVisible();
    await expect(page.getByText('Putra / Putri (PA/PI):')).toBeVisible();
    await expect(page.getByPlaceholder(/Cari Kelas/i)).toBeVisible();
  });

  test('2.0 Jadwal KBM Per Kelas: Tabel Matriks Resmi, Header 12 Sub-Kolom Hari & Sorting ULA', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    // Header Dokumen Resmi
    await expect(page.getByText('JADWAL KBM MADRASAH DINIYYAH AL AMIRIYYAH')).toBeVisible();
    await expect(page.getByText(/TAHUN AJARAN \d{4}-\d{4} M \/ \d{4}-\d{4} H/i)).toBeVisible();

    // Tabel Matriks
    const table = page.locator('#tableJadwalKBM');
    await expect(table).toBeVisible();

    // Header utama
    await expect(table.locator('th', { hasText: 'NO' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'KLS' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'PI/PA' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'TINGKAT' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'JAM' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'HARI' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'MUSTAHIQ' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'LOKAL' })).toBeVisible();

    // Sub-kolom hari
    await expect(table.locator('th', { hasText: 'SABTU' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'AHAD' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'SENIN' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'SELASA' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'RABU' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'KAMIS' })).toBeVisible();

    // Verifikasi baris pertama diurutkan mulai dari ULA (bukan Isti'dad)
    const firstRowTingkat = table.locator('tbody tr').first().locator('.badge-tingkat-ula');
    await expect(firstRowTingkat).toBeVisible();
  });

  test('2.1 Urutan Default Baris Tabel: Kelas 1 Putra sebelum Kelas 1 Putri sebelum Kelas 2', async ({ page }) => {
    await page.goto('/jadwal-kbm');
    const table = page.locator('#tableJadwalKBM');
    await expect(table).toBeVisible({ timeout: 15_000 });
    // Tunggu hingga baris data pertama selesai dirender
    await expect(table.locator('tbody tr td.cell-klik-kelas').first()).toBeVisible({ timeout: 15_000 });

    const classRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#tbodyJadwalKBM tr'));
      const data: Array<{ kls: string; papi: string; tingkat: string }> = [];
      rows.forEach((r) => {
        const cells = r.querySelectorAll('td');
        if (cells.length > 5 && cells[0].hasAttribute('rowspan')) {
          const kls = cells[1]?.textContent?.trim() || '';
          const papi = cells[2]?.textContent?.trim() || '';
          const tingkat = cells[3]?.textContent?.trim() || '';
          data.push({ kls, papi, tingkat });
        }
      });
      return data;
    });

    expect(classRows.length).toBeGreaterThan(0);
    expect(classRows[0].kls).toContain('1 A');
    expect(classRows[0].papi).toBe('PA');
    expect(classRows[0].tingkat).toBe('ULA');

    const idxFirst1PA = classRows.findIndex((c) => c.kls.startsWith('1') && c.papi === 'PA');
    const idxFirst1PI = classRows.findIndex((c) => c.kls.startsWith('1') && c.papi === 'PI');
    const idxFirst2PA = classRows.findIndex((c) => c.kls.startsWith('2') && c.papi === 'PA');
    const idxFirst2PI = classRows.findIndex((c) => c.kls.startsWith('2') && c.papi === 'PI');

    if (idxFirst1PA !== -1 && idxFirst1PI !== -1) {
      expect(idxFirst1PA).toBeLessThan(idxFirst1PI);
    }
    if (idxFirst1PI !== -1 && idxFirst2PA !== -1) {
      expect(idxFirst1PI).toBeLessThan(idxFirst2PA);
    }
    if (idxFirst2PA !== -1 && idxFirst2PI !== -1) {
      expect(idxFirst2PA).toBeLessThan(idxFirst2PI);
    }
  });

  test('3.0 Jadwal KBM Per Kelas: Modal Detail Kelas KBM', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    // Klik nomor kelas atau nama kelas pertama di tabel
    const cellKls = page.locator('tbody tr td.cell-klik-kelas').first();
    await expect(cellKls).toBeVisible({ timeout: 15_000 });
    await cellKls.click();

    // Modal Detail Kelas KBM terbuka
    await expect(page.getByText(/Detail Kelas:/i)).toBeVisible();
    await expect(page.getByText('Data Mustahiq / Wali Kelas')).toBeVisible();
    await expect(page.getByText('Daftar Asatidz Mengajar di Kelas Ini')).toBeVisible();
    await expect(page.getByText('Jadwal Pelajaran Mingguan (Sabtu s/d Kamis)')).toBeVisible();

    // Tombol Edit Jam 1 dan Jam 2
    await expect(page.getByRole('button', { name: /Edit Jam 1/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Edit Jam 2/i })).toBeVisible();

    // Tombol Tutup
    const btnTutup = page.getByRole('button', { name: 'Tutup', exact: true });
    await expect(btnTutup).toBeVisible();
    await btnTutup.click();
    await expect(page.getByText('Data Mustahiq / Wali Kelas')).not.toBeVisible();
  });

  test('4.0 Jadwal KBM Per Kelas: Modal Input Jadwal Kelas & Editor Dual Kolom', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    // Klik tombol pensil di sel kelas
    const btnPencil = page.locator('tbody tr td button[title="Edit Jadwal Kelas Ini"]').first();
    await expect(btnPencil).toBeVisible({ timeout: 15_000 });
    await btnPencil.click();

    // Modal Input & Edit Jadwal Kelas terbuka
    await expect(page.getByText(/Input & Edit Jadwal Kelas:/i)).toBeVisible();
    await expect(page.getByText(/Sesi Jam Ke-1/i)).toBeVisible();
    await expect(page.getByText(/Sesi Jam Ke-2/i)).toBeVisible();

    // Verifikasi hari Sabtu - Kamis tersedia di kedua kolom
    await expect(page.getByText('Sabtu - Jam 1')).toBeVisible();
    await expect(page.getByText('Sabtu - Jam 2')).toBeVisible();
    await expect(page.getByText('Kamis - Jam 1')).toBeVisible();
    await expect(page.getByText('Kamis - Jam 2')).toBeVisible();

    // Tombol aksi modal
    await expect(page.getByRole('button', { name: /Simpan Jadwal Kelas/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kosongkan Semua/i })).toBeVisible();

    // Tutup modal
    const btnBatal = page.getByRole('button', { name: 'Batal', exact: true });
    await expect(btnBatal).toBeVisible();
    await btnBatal.click();
    await expect(page.getByText(/Input & Edit Jadwal Kelas:/i)).not.toBeVisible();
  });

  test('5.0 Jadwal KBM Per Kelas: Context Menu KG & Mode Pindah (Cut & Paste)', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    // Temukan sel KG yang memiliki teks guru (bukan '-')
    let cellKg = page.locator('tbody tr td.cell-kg-clickable').filter({ hasNotText: '-' }).first();
    if ((await cellKg.count()) === 0) {
      cellKg = page.locator('tbody tr td.cell-kg-clickable').first();
    }
    await expect(cellKg).toBeVisible({ timeout: 15_000 });

    // Klik kanan pada sel KG
    await cellKg.click({ button: 'right' });

    // Menu konteks harus muncul
    const btnIsi = page.getByRole('button', { name: /Isi \/ Ganti Slot Ini|Isi Slot Ini/i });
    await expect(btnIsi).toBeVisible();

    const btnCut = page.getByRole('button', { name: /^Pindah Ke/i });
    if (await btnCut.isVisible()) {
      // Klik Pindah Ke (Cut)
      await btnCut.click();

      // Floating bar Cut harus muncul di bawah layar
      const floatingBar = page.locator('#floatingBarClipboardKG');
      await expect(floatingBar).toBeVisible();
      await expect(floatingBar.getByText('CUT')).toBeVisible();
      await expect(floatingBar.getByText(/Mode Pindah:/i)).toBeVisible();

      // Klik tombol Batal (Esc)
      const btnBatalCut = floatingBar.getByRole('button', { name: /Batal/i });
      await expect(btnBatalCut).toBeVisible();
      await btnBatalCut.click();

      // Floating bar harus hilang
      await expect(floatingBar).not.toBeVisible();
    }
  });

  test('6.0 Hari KBM: 7 Kolom Resmi, Grouping Blok Kelas, & Switch Hari', async ({ page }) => {
    await page.goto('/hari-kbm');

    // Judul Halaman
    await expect(page.getByRole('heading', { name: 'Hari KBM', exact: true })).toBeVisible();
    await expect(page.getByText('Monitoring penugasan mengajar & lokasi asatidz per hari aktif')).toBeVisible();

    // Tab switcher hari (Sabtu s/d Kamis)
    const tabSabtu = page.getByRole('button', { name: 'Sabtu', exact: true });
    const tabAhad = page.getByRole('button', { name: 'Ahad', exact: true });
    const tabSenin = page.getByRole('button', { name: 'Senin', exact: true });
    const tabSelasa = page.getByRole('button', { name: 'Selasa', exact: true });
    const tabRabu = page.getByRole('button', { name: 'Rabu', exact: true });
    const tabKamis = page.getByRole('button', { name: 'Kamis', exact: true });

    await expect(tabSabtu).toBeVisible();
    await expect(tabAhad).toBeVisible();
    await expect(tabSenin).toBeVisible();
    await expect(tabSelasa).toBeVisible();
    await expect(tabRabu).toBeVisible();
    await expect(tabKamis).toBeVisible();

    // Klik tab Ahad
    await tabAhad.click();
    await expect(page.getByText(/Hari Aktif:.*Ahad/i)).toBeVisible();

    // Kembalikan ke Sabtu
    await tabSabtu.click();
    await expect(page.getByText(/Hari Aktif:.*Sabtu/i)).toBeVisible();

    // 7 Kolom Header Resmi
    const table = page.locator('#tableHariKBM');
    await expect(table).toBeVisible();
    await expect(table.locator('th', { hasText: 'NO' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'KODE' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'ASATIDZ' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'JAH' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'MENGAJAR (JAM & FAN)' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'KELAS & MUSTAHIQ' })).toBeVisible();
    await expect(table.locator('th', { hasText: 'LOKASI DINIYYAH' })).toBeVisible();

    // Grouping Blok: Banner pemisah blok harus muncul (contoh: BLOK INDUK, BLOK 1, dll) jika ada data
    const blockBanner = table.locator('tr.table-group-divider').first();
    if (await blockBanner.isVisible()) {
      await expect(blockBanner.locator('.badge', { hasText: /Asatidz/i })).toBeVisible();
    } else {
      await expect(table.getByText(/Tidak ada data Asatidz mengajar/i)).toBeVisible();
    }
  });

  test('7.0 Hari KBM: Card View Mode Switch & Navigasi Interaktif', async ({ page }) => {
    await page.goto('/hari-kbm');

    // Toggle ke Card View
    const btnCard = page.locator('button[title="Tampilan Kartu"]');
    await expect(btnCard).toBeVisible();
    await btnCard.click();

    // Card View Wrapper terlihat
    const cardWrap = page.locator('#cardHariKBMWrapper');
    await expect(cardWrap).toBeVisible();

    // Toggle kembali ke Table View
    const btnTable = page.locator('button[title="Tampilan Tabel"]');
    await expect(btnTable).toBeVisible();
    await btnTable.click();

    const table = page.locator('#tableHariKBM');
    await expect(table).toBeVisible();

    // Klik nama kelas pada kolom KELAS & MUSTAHIQ -> membuka ModalDetailKelasKBM
    const cellKelas = table.locator('tbody tr td div[title*="Klik untuk melihat Detail Kelas"]').first();
    if (await cellKelas.isVisible()) {
      await cellKelas.click();
      await expect(page.getByText(/Detail Kelas:/i)).toBeVisible();
      const btnTutup = page.getByRole('button', { name: 'Tutup', exact: true });
      await btnTutup.click();
    }
  });

  test('8.0 Jadwal KBM Per Kelas: Isolasi Gender PA vs PI pada Matriks Kelas', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    const table = page.locator('#tableJadwalKBM');
    await expect(table).toBeVisible({ timeout: 15_000 });
    await expect(table.locator('tbody tr td.cell-klik-kelas').first()).toBeVisible({ timeout: 15_000 });

    // Memverifikasi baris kelas PA (dimulai 1A PA, 1B PA) dan kelas PI terpisah secara tepat
    const row01 = table.locator('tbody tr').filter({ hasText: '01' }).first();
    const row02 = table.locator('tbody tr').filter({ hasText: '02' }).first();

    await expect(row01).toBeVisible({ timeout: 15_000 });
    await expect(row02).toBeVisible({ timeout: 15_000 });

    // Baris 01 dan 02 adalah seluruh kelas Putra (PA) berurutan (1A PA, 1B PA)
    await expect(row01.locator('td', { hasText: /^PA$/ })).toBeVisible();
    await expect(row02.locator('td', { hasText: /^PA$/ })).toBeVisible();

    // Baris kelas Putri (PI) juga ada di tabel setelah kelompok kelas Putra
    const rowPI = table.locator('tbody tr', { hasText: 'PI' }).first();
    await expect(rowPI).toBeVisible();
  });
});
