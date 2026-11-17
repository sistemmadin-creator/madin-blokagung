import { test, expect } from '@playwright/test';
import { openPublicContext } from './helpers/auth';

test.describe('71 - Beranda Publik Cinematic Scroll-Driven Hero', () => {
  test('1. Desktop: 3 babak hero interaktif, canvas scrubbing, navbar transparan -> solid, tanpa console error', async ({ browser }) => {
    const { context, page } = await openPublicContext(browser);
    await page.setViewportSize({ width: 1280, height: 800 });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');

    // Babak 1 tampil saat awal
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#hero canvas')).toBeVisible();

    // Navbar di atas hero transparan
    const header = page.locator('header').first();
    await expect(header).toHaveClass(/from-\[#041d14\]\/85/);

    // Klik Babak 02 Risalah -> Hadits tampil & navbar berubah solid
    await page.getByRole('button', { name: /02\s*Risalah/i }).click();
    await expect(page.getByText(/HR\. Imam Al-Baihaqi/i)).toBeVisible({ timeout: 10_000 });
    await expect(header).toHaveClass(/bg-white\/95/, { timeout: 10_000 });

    // Klik Babak 03 Khazanah -> Dawuh Pendiri & CTA muncul
    await page.getByRole('button', { name: /03\s*Khazanah/i }).click();
    await expect(page.getByText(/Openono perkoro seng ono/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /Pelajari Kurikulum/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Baca Warta Madina/i })).toBeVisible();

    // Klik Babak 01 Tradisi -> kembali ke awal
    await page.getByRole('button', { name: /01\s*Tradisi/i }).click();
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah/i })).toBeVisible({ timeout: 10_000 });

    // Klik Lewati Intro -> scroll ke #berita
    await page.getByRole('link', { name: /Lewati Intro/i }).click();
    await expect(page.locator('#berita')).toBeInViewport({ timeout: 10_000 });

    // Tidak ada horizontal overflow
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
    expect(errors).toEqual([]);

    await context.close();
  });

  test('2. Mobile (375px): Keyframe crossfade, tap target & tanpa overflow horizontal', async ({ browser }) => {
    const { context, page } = await openPublicContext(browser);
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah/i })).toBeVisible({ timeout: 15_000 });

    const btnBabak2 = page.getByRole('button', { name: /02\s*Risalah/i });
    const box = await btnBabak2.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);

    await btnBabak2.click();
    await expect(page.getByText(/HR\. Imam Al-Baihaqi/i)).toBeVisible({ timeout: 10_000 });

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    await context.close();
  });
});
