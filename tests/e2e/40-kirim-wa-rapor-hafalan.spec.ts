import { test, expect } from '@playwright/test';

test.describe('Modul Kirim WhatsApp & Kartu Rapor Digital Hafalan (Gabungan Gambar 1-5)', () => {
  test.setTimeout(120000);

  test('Integrasi penuh Setor Mustahiq -> 3 Riwayat Setor Terakhir -> Kartu Rapor Digital Hafalan & Nomor WA Santri', async ({
    page,
  }) => {
    // 0. Pastikan endpoint /api/og/rapor-hafalan dapat diakses tanpa sesi login (tidak terkena 401)
    const unauthOgRes = await page.request.get(
      '/api/og/rapor-hafalan?nama=ARYA%20PRATAMA&nis=12345'
    );
    expect(unauthOgRes.status()).toBe(200);
    expect(unauthOgRes.headers()['content-type']).toContain('image/png');

    // 1. Buka halaman Setor Mustahiq (Gambar 5)
    await page.goto('/setor-mustahiq');
    await page.waitForLoadState('domcontentloaded');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await page.waitForURL('**/setor-mustahiq**', { timeout: 60000 });
    }

    await expect(
      page.getByRole('heading', { name: 'Setoran Mingguan Santri (Mustahiq)' })
    ).toBeVisible({ timeout: 45000 });

    // Pastikan tombol pintasan Kirim WA Rapor ada di toolbar
    await expect(page.getByTestId('btn-shortcut-kirim-wa')).toBeVisible();

    // Beralih ke tampilan Tabel dan buka modal santri ARYA PRATAMA (sesuai Gambar 1 & 2)
    await page.getByRole('button', { name: 'Tabel' }).click();
    const targetSantriBtn = page
      .getByRole('button', { name: /ARYA PRATAMA|ANDIKO DWI SAPUTRA/ })
      .first();
    await expect(targetSantriBtn).toBeVisible({ timeout: 20000 });
    await targetSantriBtn.click();

    // 2. Di dalam Modal Detail Setoran Santri, tambahkan 4 riwayat setoran
    const modal = page.getByTestId('modal-detail-setor-mustahiq');
    await expect(modal).toBeVisible();

    const santriName = (await modal.locator('h3').first().textContent())?.trim() || '';
    expect(santriName.length).toBeGreaterThan(0);

    // Input 4 catatan setoran berturut-turut agar menguji pemotongan 3 riwayat terakhir
    const isNumericInput = await page.getByTestId('input-tambah-angka').isVisible();
    const submitBtn = page.getByTestId('btn-simpan-setoran-mustahiq');
    for (let i = 1; i <= 4; i++) {
      await expect(submitBtn).toBeEnabled({ timeout: 10000 });
      if (isNumericInput) {
        await page.getByTestId('input-tambah-angka').fill('10');
      } else {
        await page.getByTestId('select-kalimat-setor').selectOption({ index: i - 1 });
      }
      await page.getByTestId('input-catatan-setor').fill(`Setoran Uji Ke-${i}`);
      await submitBtn.click();
      await expect(modal.getByText(`Setoran Uji Ke-${i}`).first()).toBeVisible({ timeout: 10000 });
      await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    }

    // 3. Klik tombol pintasan "Kirim WA Rapor" di dalam modal untuk menuju /kirim-wa?santri=...
    const btnJumpWa = page.getByTestId('btn-modal-kirim-wa-santri');
    await expect(btnJumpWa).toBeVisible();
    await btnJumpWa.click();

    await page.waitForURL('**/kirim-wa**', { timeout: 20000 });
    await expect(
      page.getByRole('heading', { name: 'Kirim WhatsApp Rapor Hafalan' })
    ).toBeVisible({ timeout: 20000 });

    // 4. Verifikasi elemen-elemen Header Gateway (Gambar 1)
    await expect(page.getByTestId('btn-status-waha')).toBeVisible();
    await expect(page.getByTestId('btn-open-draf-pesan')).toBeVisible();
    await expect(page.getByTestId('btn-open-gateway-settings')).toBeVisible();

    // 5. Verifikasi Pratinjau Kartu Rapor Digital menampilkan gabungan Gambar 3 & 3 Riwayat Setor Terakhir (Gambar 4)
    const previewCard = page.getByTestId('kartu-rapor-digital-preview');
    await expect(previewCard).toBeVisible();
    await expect(page.getByTestId('preview-santri-nama')).toHaveText(santriName);
    await expect(page.getByTestId('preview-target-hafalan')).toBeVisible();
    await expect(page.getByTestId('preview-capaian-hafalan')).toBeVisible();

    // Tabel riwayat pada Kartu Rapor Digital hanya menampilkan tepat 3 riwayat terakhir secara kronologis (Ke-2, Ke-3, Ke-4)
    const historyTable = page.getByTestId('preview-table-riwayat-3');
    await expect(historyTable).toBeVisible();
    const rowsCount = await historyTable.locator('tbody tr').count();
    expect(rowsCount).toBe(3);

    await expect(historyTable).not.toContainText('Setoran Uji Ke-1');
    await expect(historyTable.locator('tbody tr').nth(0)).toContainText('Setoran Uji Ke-2');
    await expect(historyTable.locator('tbody tr').nth(1)).toContainText('Setoran Uji Ke-3');
    await expect(historyTable.locator('tbody tr').nth(2)).toContainText('Setoran Uji Ke-4');

    // 6. Verifikasi Edge API /api/og/rapor-hafalan merender gambar PNG (status 200 & content-type image/png)
    const imgSrc = await page
      .locator('#panel-pratinjau-rapor img, [data-testid="panel-pratinjau-rapor"] img')
      .first()
      .getAttribute('src');
    expect(imgSrc).toBeTruthy();
    const ogRes = await page.request.get(imgSrc!);
    expect(ogRes.status()).toBe(200);
    expect(ogRes.headers()['content-type']).toContain('image/png');

    // 7. Uji buka Modal Draf Pesan & Modal Pengaturan Gateway
    await page.getByTestId('btn-open-draf-pesan').click();
    const modalDraf = page.getByTestId('modal-draf-pesan-wa');
    await expect(modalDraf).toBeVisible();
    await modalDraf.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(modalDraf).toBeHidden();

    await page.getByTestId('btn-open-gateway-settings').click();
    const modalGateway = page.getByTestId('modal-gateway-waha');
    await expect(modalGateway).toBeVisible();
    await modalGateway.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(modalGateway).toBeHidden();

    // 8. Uji Pengiriman Broadcast & Penanganan Kegagalan vs Keberhasilan (Koreksi Gambar 1 & Gambar 2)
    let simulateSendSuccess = false;
    let capturedImagePayloadUrl = '';

    await page.route('**/api/sessions/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'default',
          status: 'WORKING',
          me: { id: '6281958426856@c.us', pushName: 'Madin Blokagung' },
        }),
      });
    });

    await page.route('**/api/sendImage', async (route) => {
      const postBody = route.request().postDataJSON();
      capturedImagePayloadUrl = postBody?.file?.url || '';
      if (!simulateSendSuccess) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Nomor 6285289039180 tidak terdaftar atau tidak aktif di WhatsApp.',
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg_test_success_1',
          status: 'success',
        }),
      });
    });

    // Klik tombol status WAHA untuk menyegarkan status menjadi Online
    await page.getByTestId('btn-status-waha').click();
    await expect(page.getByTestId('btn-status-waha')).toContainText('WAHA Aktif');

    // Pastikan santri terpilih memiliki nomor telepon (jika belum, isi melalui modal cepat)
    const activeRow = page
      .locator('[data-testid^="wa-row-"]')
      .filter({ hasText: santriName })
      .first();
    await expect(activeRow).toBeVisible();

    if (await activeRow.getByText('Belum Ada (Isi Nomor)').isVisible()) {
      await activeRow.getByText('Belum Ada (Isi Nomor)').click();
      const phoneModal = page.getByTestId('modal-edit-phone-santri');
      await expect(phoneModal).toBeVisible();
      await page.getByTestId('input-quick-phone-santri').fill('085289039180');
      await page.getByTestId('btn-save-quick-phone').click();
      await expect(phoneModal).toBeHidden({ timeout: 15000 });
    }

    // Centang baris santri tersebut untuk Broadcast
    const rowCheckbox = activeRow.getByRole('checkbox');
    if (!(await rowCheckbox.isChecked())) {
      await rowCheckbox.check();
    }

    // Skenario A (Gambar 2): Broadcast gagal -> Panel TIDAK langsung hilang, menampilkan ringkasan gagal & badge Gagal Kirim
    simulateSendSuccess = false;
    await page.getByTestId('btn-start-broadcast-wa').click();

    const broadcastPanel = page.getByTestId('panel-broadcast-progress');
    await expect(broadcastPanel).toBeVisible();
    await expect(broadcastPanel).toContainText('Broadcast Gagal Terkirim (1 Gagal)', {
      timeout: 15000,
    });
    await expect(page.getByTestId('broadcast-logs-container')).toContainText(
      'tidak terdaftar atau tidak aktif di WhatsApp'
    );
    expect(capturedImagePayloadUrl.startsWith('data:image/png;base64,')).toBe(true);
    await expect(activeRow.getByTestId('badge-wa-gagal')).toBeVisible();

    // Tutup panel log broadcast
    await page.getByTestId('btn-close-broadcast-log').click();
    await expect(broadcastPanel).toBeHidden();

    // Skenario B: Broadcast berhasil -> Panel menampilkan Broadcast Selesai (1 Berhasil Terkirim) & badge Terkirim
    simulateSendSuccess = true;
    await page.getByTestId('btn-start-broadcast-wa').click();
    await expect(broadcastPanel).toBeVisible();
    await expect(broadcastPanel).toContainText('Broadcast Selesai (1 Berhasil Terkirim)', {
      timeout: 15000,
    });
    await expect(activeRow.getByTestId('badge-wa-terkirim')).toBeVisible();
    await page.getByTestId('btn-close-broadcast-log').click();

    // 9. Verifikasi responsivitas pada viewport HP (375x667) tanpa overflow horizontal
    await page.setViewportSize({ width: 375, height: 667 });
    await expect
      .poll(
        async () => {
          return await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
          });
        },
        { timeout: 3000 }
      )
      .toBe(false);
  });
});
