import { test, expect } from '@playwright/test';

test.describe('Modul Kirim WhatsApp & Kartu Rapor Digital Hafalan (Gabungan Gambar 1-5)', () => {
  test.setTimeout(120000);

  test('Integrasi penuh Setor Mustahiq -> 3 Riwayat Setor Terakhir -> Kartu Rapor Digital Hafalan & Nomor WA Santri', async ({
    page,
  }) => {
    // 1. Buka halaman Setor Mustahiq (Gambar 5)
    await page.goto('/setor-mustahiq');
    await expect(
      page.getByRole('heading', { name: 'Setoran Mingguan Santri (Mustahiq)' })
    ).toBeVisible({ timeout: 25000 });

    // Pastikan tombol pintasan Kirim WA Rapor ada di toolbar
    await expect(page.getByTestId('btn-shortcut-kirim-wa')).toBeVisible();

    // Beralih ke tampilan Tabel dan buka modal santri ANDIKO DWI SAPUTRA (sesuai Gambar 3)
    await page.getByRole('button', { name: 'Tabel' }).click();
    const andikoBtn = page.getByRole('button', { name: 'ANDIKO DWI SAPUTRA' }).first();
    await expect(andikoBtn).toBeVisible({ timeout: 20000 });
    await andikoBtn.click();

    // 2. Di dalam Modal Detail Setoran Santri (Gambar 3 & 4), tambahkan 4 riwayat setoran
    const modal = page.getByTestId('modal-detail-setor-mustahiq');
    await expect(modal).toBeVisible();

    const santriName = (await modal.locator('h3').first().textContent())?.trim() || '';
    expect(santriName).toBe('ANDIKO DWI SAPUTRA');

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

    // 8. Verifikasi responsivitas pada viewport HP (375x667) tanpa overflow horizontal
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
