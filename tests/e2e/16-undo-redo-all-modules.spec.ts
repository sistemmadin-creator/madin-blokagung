import { test, expect } from '@playwright/test';

test.describe('Fitur Undo & Redo (Maksimal 5 Langkah) - Modul Absensi, Santri, Asatidz, Muhafadzoh', () => {
  test.beforeEach(async ({ page }) => {
    // PROTEKSI TOTAL: Cegah mutasi ke database Supabase nyata selama pengujian otomatis
    await page.route('**/rest/v1/app_settings*', async (route) => {
      const method = route.request().method();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ success: true }]),
        });
      }
      return route.continue();
    });

    await page.route('**/rest/v1/santri*', async (route) => {
      const method = route.request().method();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ success: true }]),
        });
      }
      return route.continue();
    });

    await page.route('**/rest/v1/asatidz*', async (route) => {
      const method = route.request().method();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ success: true }]),
        });
      }
      return route.continue();
    });

    await page.route('**/rest/v1/activity_logs*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ success: true }]),
      });
    });
  });

  test('1.0 Modul Absensi Asatidz: Undo & Redo mutasi status absensi', async ({ page }) => {
    test.slow();
    await page.goto('/absensi');
    await expect(page.getByRole('heading', { name: 'Absensi Asatidz', exact: true })).toBeVisible();

    // Reset riwayat
    await page.evaluate(() => {
      const win = window as any;
      if (win.useUndoRedoStore) win.useUndoRedoStore.getState().clearHistory();
    });

    const btnUndo = page.getByRole('button', { name: /Batalkan perubahan \(Undo\)/i });
    const btnRedo = page.getByRole('button', { name: /Ulangi perubahan \(Redo\)/i });

    await expect(btnUndo).toBeDisabled();
    await expect(btnRedo).toBeDisabled();

    // Trigger mutasi absensi via store (setHariLibur)
    await page.evaluate(async () => {
      const win = window as any;
      if (win.useAbsensiStore) {
        await win.useAbsensiStore.getState().setHariLibur(
          '2026-10-27',
          {
            tanggal: '2026-10-27',
            hari: 'Selasa',
            kategori: 'Libur',
            keterangan: 'Libur E2E Test',
            waktuUpdate: '',
            diinputOleh: 'Admin',
          }
        );
      }
    });

    // Toast notifikasi muncul dan tombol Undo aktif dengan badge '1'
    await expect(btnUndo).toBeEnabled({ timeout: 10_000 });
    await expect(btnUndo).toContainText('1');
    await expect(btnRedo).toBeDisabled();

    // Eksekusi Undo lewat tombol Navbar
    await btnUndo.click();
    await expect(btnRedo).toBeEnabled({ timeout: 15_000 });
    await expect(btnRedo).toContainText('1');
    await expect(btnUndo).toBeDisabled();

    // Eksekusi Redo lewat tombol Navbar
    await btnRedo.click();
    await expect(btnRedo).toBeDisabled({ timeout: 15_000 });
    await expect(btnUndo).toBeEnabled({ timeout: 15_000 });
    await expect(btnUndo).toContainText('1');
  });

  test('2.0 Modul Data Santri: Shortcut Ctrl+Z dan Ctrl+Y untuk mutasi data santri', async ({ page }) => {
    await page.goto('/santri');
    await expect(page.getByRole('heading', { name: 'Database Santri', exact: true })).toBeVisible();

    await page.evaluate(() => {
      const win = window as any;
      if (win.useUndoRedoStore) win.useUndoRedoStore.getState().clearHistory();
    });

    const btnUndo = page.getByRole('button', { name: /Batalkan perubahan \(Undo\)/i });

    // Tambah santri simulasi via store
    await page.evaluate(async () => {
      const win = window as any;
      if (win.useSantriStore) {
        await win.useSantriStore.getState().saveSantri(
          {
            no_induk: '999999',
            nama: 'SANTRI PLAYWRIGHT TEST',
            pa_pi: 'PA',
            tingkat: 'Ula',
            din_kls: '1',
            din_bag: 'A',
          } as any,
          false
        );
      }
    });

    const toast = page.getByRole('status');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Tambah Santri: SANTRI PLAYWRIGHT TEST');
    await expect(btnUndo).toContainText('1');

    // Tekan Ctrl+Z
    await page.keyboard.press('Control+z');
    await expect(toast).toContainText('Undo berhasil: Tambah Santri: SANTRI PLAYWRIGHT TEST');

    // Tekan Ctrl+Y
    await page.keyboard.press('Control+y');
    await expect(toast).toContainText('Redo berhasil: Tambah Santri: SANTRI PLAYWRIGHT TEST');
  });

  test('3.0 Modul Data Asatidz: Undo & Redo mutasi data asatidz', async ({ page }) => {
    await page.goto('/asatidz');
    await expect(page.getByRole('heading', { name: 'Database Asatidz', exact: true })).toBeVisible();

    await page.evaluate(() => {
      const win = window as any;
      if (win.useUndoRedoStore) win.useUndoRedoStore.getState().clearHistory();
    });

    const btnUndo = page.getByRole('button', { name: /Batalkan perubahan \(Undo\)/i });

    // Tambah asatidz simulasi via store
    await page.evaluate(async () => {
      const win = window as any;
      if (win.useAsatidzStore) {
        await win.useAsatidzStore.getState().saveAsatidz(
          {
            nia: '9999',
            nama_asatidz: 'USTADZ PLAYWRIGHT TEST',
            pa_pi: 'PA',
          } as any,
          false
        );
      }
    });

    const toast = page.getByRole('status');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Tambah Asatidz: USTADZ PLAYWRIGHT TEST');
    await expect(btnUndo).toContainText('1');

    // Undo lewat klik Navbar
    await btnUndo.click();
    await expect(toast).toContainText('Undo berhasil: Tambah Asatidz: USTADZ PLAYWRIGHT TEST');
  });

  test('4.0 Modul Setoran Muhafadzoh: Floating Toast Undo Button', async ({ page }) => {
    await page.goto('/setoran');
    await expect(page.getByRole('heading', { name: 'Muhafadzoh Madin (Setoran)', exact: true })).toBeVisible();

    await page.evaluate(() => {
      const win = window as any;
      if (win.useUndoRedoStore) win.useUndoRedoStore.getState().clearHistory();
    });

    // Tambah setoran baru via store
    await page.evaluate(async () => {
      const win = window as any;
      if (win.useMuhafadzohStore) {
        await win.useMuhafadzohStore.getState().addSetoran({
          id: 'SET-TEST-E2E',
          no_induk: '111222',
          nama: 'SANTRI MUHAFADZOH TEST',
          tanggal: '2026-10-27 10:00',
          item_hafalan: 'Surah Al-Mulk',
          kategori: 'Wajib',
          penjaga: 'Ust. Penguji',
        } as any);
      }
    });

    // Floating toast muncul dengan tombol 'Batalkan (Undo)'
    const toast = page.getByRole('status');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Tambah Setoran: SANTRI MUHAFADZOH TEST (Surah Al-Mulk)');

    const btnUndoInToast = toast.getByRole('button', { name: 'Batalkan', exact: true });
    await expect(btnUndoInToast).toBeVisible();

    // Klik tombol Undo langsung di dalam Floating Toast
    await btnUndoInToast.click();

    await expect(toast).toContainText('Undo berhasil: Tambah Setoran: SANTRI MUHAFADZOH TEST (Surah Al-Mulk)');

    // Redo di Navbar sekarang aktif
    const btnRedo = page.getByRole('button', { name: /Ulangi perubahan \(Redo\)/i });
    await expect(btnRedo).toBeEnabled();
    await expect(btnRedo).toContainText('1');
  });

  test('5.0 Batasan Ring Buffer 5 Langkah: Maksimal badge tetap 5 meskipun aksi melebihi 5', async ({ page }) => {
    await page.goto('/setoran');
    await expect(page.getByRole('heading', { name: 'Muhafadzoh Madin (Setoran)', exact: true })).toBeVisible();

    await page.evaluate(() => {
      const win = window as any;
      if (win.useUndoRedoStore) win.useUndoRedoStore.getState().clearHistory();
    });

    const btnUndo = page.getByRole('button', { name: /Batalkan perubahan \(Undo\)/i });

    // Rekam 7 aksi berturut-turut
    await page.evaluate(async () => {
      const win = window as any;
      if (win.useUndoRedoStore) {
        for (let i = 1; i <= 7; i++) {
          win.useUndoRedoStore.getState().recordAction({
            module: 'muhafadzoh',
            title: `Aksi Setoran Ke-${i}`,
            undo: async () => {},
            redo: async () => {},
          });
        }
      }
    });

    // Badge undo maksimal HARUS tetap '5'
    await expect(btnUndo).toBeEnabled();
    await expect(btnUndo).toContainText('5');

    // Verifikasi di state browser stack length tepat 5
    const stackLength = await page.evaluate(() => {
      const win = window as any;
      return win.useUndoRedoStore ? win.useUndoRedoStore.getState().undoStack.length : -1;
    });
    expect(stackLength).toBe(5);

    // Verifikasi aksi pertama di stack adalah Aksi 3 (Aksi 1 & 2 terbuang)
    const oldestActionTitle = await page.evaluate(() => {
      const win = window as any;
      return win.useUndoRedoStore ? win.useUndoRedoStore.getState().undoStack[0].title : '';
    });
    expect(oldestActionTitle).toBe('Aksi Setoran Ke-3');
  });

  test('6.0 Modal Dialog Resolusi Konflik Multi-Pengguna (OCC Fase 2)', async ({ page }) => {
    await page.goto('/santri');
    await expect(page.getByRole('heading', { name: 'Database Santri', exact: true })).toBeVisible();

    // Trigger simulasi prompt konflik via useUndoRedoStore
    await page.evaluate(() => {
      const win = window as any;
      if (win.useUndoRedoStore) {
        win.useUndoRedoStore.getState().requestConflictResolution({
          title: 'Peringatan Konflik Data Santri',
          entityName: 'SANTRI E2E TEST (No. Induk: 999123)',
          message: 'Kolom [status, alamat] telah diubah oleh pengguna lain di server sejak aksi Anda disimpan.',
          currentServerState: 'status: "Boyong", alamat: "Surabaya"',
          proposedUndoState: 'status: "Aktif", alamat: "Banyuwangi"',
        });
      }
    });

    // Modal konflik harus muncul di layar
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Peringatan Konflik Data Santri');
    await expect(modal).toContainText('SANTRI E2E TEST (No. Induk: 999123)');
    await expect(modal).toContainText('Kondisi di Server Terkini:');
    await expect(modal).toContainText('Akan Dikembalikan ke (Undo):');

    // Ada dua tombol pilihan
    const btnCancelUndo = modal.getByRole('button', { name: /Batalkan Undo/i });
    const btnForceUndo = modal.getByRole('button', { name: /Paksa Undo/i });
    await expect(btnCancelUndo).toBeVisible();
    await expect(btnForceUndo).toBeVisible();

    // Klik "Batalkan Undo" -> modal tertutup
    await btnCancelUndo.click();
    await expect(modal).not.toBeVisible();
  });
});
