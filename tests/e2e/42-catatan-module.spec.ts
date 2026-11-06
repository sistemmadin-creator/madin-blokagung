import { test, expect } from '@playwright/test';

test.describe('Menu Catatan & To-Do List Terpadu (/catatan)', () => {
  test.setTimeout(120000);

  test('Menampilkan Catatan Awal Panduan Keamanan & Pembaruan Protokol WAHA Gateway serta Fitur To-Do List Interaktif', async ({
    page,
  }) => {
    // 1. Buka halaman /catatan
    await page.goto('/catatan');
    await expect(page.getByTestId('heading-catatan-module')).toBeVisible({
      timeout: 25000,
    });

    // Pastikan menu Catatan tampil di Sidebar Desktop di bawah grup Utama
    await expect(
      page.locator('aside').getByRole('link', { name: 'Catatan' })
    ).toBeVisible();

    // 2. Verifikasi Catatan Awal "Panduan Keamanan Sesi & Pembaruan Protokol WhatsApp Gateway (WAHA Lokal)" terpilih dan menampilkan Bagian 1 & Bagian 2
    const wahaCard = page.getByTestId('catatan-card-note-panduan-waha-gateway');
    await expect(wahaCard).toBeVisible();

    const detailPanel = page.getByTestId('catatan-detail-panel');
    await expect(page.getByTestId('detail-note-title')).toContainText(
      'Panduan Keamanan Sesi & Pembaruan Protokol WhatsApp Gateway (WAHA Lokal)'
    );

    const detailBody = page.getByTestId('detail-note-body');
    await expect(detailBody).toContainText(
      'Bagian 1: Cara Mengatasi Risiko Keamanan Sesi WhatsApp Lokal (waha-gateway/auth_info_baileys)'
    );
    await expect(detailBody).toContainText(
      'Bagian 2: Cara Mengatasi Risiko Pembaruan Protokol WhatsApp Sewaktu-waktu'
    );
    await expect(detailBody).toContainText(
      'npm install @whiskeysockets/baileys@latest'
    );

    // 3. Uji Fitur To-Do List Interaktif pada Catatan tersebut
    const todoSection = detailPanel.getByTestId('catatan-todo-section');
    await expect(todoSection).toBeVisible();
    await expect(detailPanel.getByTestId('todo-progress-badge')).toContainText(
      '1 / 3 Selesai'
    );

    // Tambah item To-Do baru secara langsung
    await detailPanel
      .getByTestId('input-new-todo')
      .fill('Uji coba backup sesi WAHA mingguan');
    await detailPanel.getByTestId('btn-add-todo').click();

    await expect(todoSection).toContainText('Uji coba backup sesi WAHA mingguan');
    await expect(detailPanel.getByTestId('todo-progress-badge')).toContainText(
      '1 / 4 Selesai'
    );

    // Centang item To-Do kedua
    await detailPanel.getByTestId('checkbox-todo-todo-waha-2').click();
    await expect(detailPanel.getByTestId('todo-progress-badge')).toContainText(
      '2 / 4 Selesai'
    );

    // 4. Uji Buat Catatan Baru lewat Modal
    await page.getByTestId('btn-buat-catatan-baru').click();
    const formModal = page.getByTestId('modal-form-catatan');
    await expect(formModal).toBeVisible();

    await page
      .getByTestId('input-judul-catatan')
      .fill('Notulensi Rapat Koordinasi Asatidz');
    await page
      .getByTestId('input-isi-catatan')
      .fill('Pembahasan persiapan evaluasi nadzom semester genap.');
    await page
      .getByTestId('input-modal-todo-draft')
      .fill('Siapkan lembar absensi penguji');
    await page.getByTestId('btn-modal-add-todo-draft').click();
    await page.getByTestId('btn-simpan-catatan').click();

    await expect(formModal).toBeHidden();
    await expect(page.getByTestId('detail-note-title')).toHaveText(
      'Notulensi Rapat Koordinasi Asatidz'
    );
    await expect(detailPanel.getByTestId('catatan-todo-section')).toContainText(
      'Siapkan lembar absensi penguji'
    );

    // 5. Uji Responsivitas Mobile (375x667) tanpa overflow horizontal
    await page.setViewportSize({ width: 375, height: 667 });
    await expect
      .poll(
        async () => {
          return await page.evaluate(() => {
            return (
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth + 2
            );
          });
        },
        { timeout: 3000 }
      )
      .toBe(false);
  });
});
