import { test, expect } from '@playwright/test';
import { openPublicContext } from './helpers/auth';

test.describe('71 - Beranda Publik Cinematic Scroll-Driven Hero', () => {
  test('1. Desktop: Navbar putih solid, Al-Amiriyyah 1 baris, 3 babak hero interaktif, tanpa console error', async ({ browser }) => {
    const { context, page } = await openPublicContext(browser);
    await page.setViewportSize({ width: 1280, height: 800 });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');

    // Babak 1 tampil saat awal, tanpa subjudul lama yang dihapus
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Merawat tradisi keilmuan salafiyah/i)).toHaveCount(0);
    await expect(page.locator('#hero canvas')).toBeVisible();

    // Tulisan Al-Amiriyyah berada dalam 1 baris utuh (single line rect)
    const alAmiriyyahRects = await page
      .locator('#hero h1 span')
      .evaluate((el) => el.getClientRects().length);
    expect(alAmiriyyahRects).toBe(1);

    // Navbar putih solid sejak awal (scrollY = 0)
    const header = page.locator('header').first();
    await expect(header).toHaveClass(/bg-white\/95/);

    // Klik Babak 02 Risalah -> Hadits tampil
    await page.getByRole('button', { name: /02\s*Risalah/i }).click();
    await expect(page.getByText(/HR\. Imam Al-Baihaqi/i)).toBeVisible({ timeout: 10_000 });

    // Klik Babak 03 Khazanah -> Dawuh Pendiri & CTA muncul
    await page.getByRole('button', { name: /03\s*Khazanah/i }).click();
    await expect(page.getByText(/Openono perkoro seng ono/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /Pelajari Kurikulum/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Baca Warta Madina/i })).toBeVisible();

    // Klik Babak 01 Tradisi -> kembali ke awal
    await page.getByRole('button', { name: /01\s*Tradisi/i }).click();
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah/i })).toBeVisible({ timeout: 10_000 });

    // Klik Lewati Intro -> scroll ke awal section Parallax (#ekosistem)
    await page.getByRole('link', { name: /Lewati Intro/i }).click();
    await expect(page.locator('#ekosistem')).toBeInViewport({ timeout: 10_000 });

    // Uji interaksi HUD Parallax Desktop (02 Majelis & 03 Kompleks) + tombol Lanjut ke Warta Madina
    await page.getByRole('button', { name: /02\s*Majelis/i }).click();
    await expect(page.getByText(/Bimbingan Terpadu Asatidz/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /03\s*Kompleks/i }).click();
    await expect(page.getByText(/Ribuan Santri dalam Satu Tata Kelola/i)).toBeVisible({ timeout: 10_000 });

    await page.locator('#ekosistem').getByRole('link', { name: /Lanjut ke Warta Madina/i }).click();
    await expect(page.locator('#berita')).toBeInViewport({ timeout: 10_000 });

    // Tidak ada horizontal overflow
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);
    expect(errors).toEqual([]);

    await context.close();
  });

  test('2. Mobile (375px): Keyframe crossfade, Al-Amiriyyah 1 baris, Parallax adaptif bertingkat, tap target >=44px & tanpa overflow', async ({ browser }) => {
    const { context, page } = await openPublicContext(browser);
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah/i })).toBeVisible({ timeout: 15_000 });

    const alAmiriyyahRects = await page
      .locator('#hero h1 span')
      .evaluate((el) => el.getClientRects().length);
    expect(alAmiriyyahRects).toBe(1);

    const btnBabak2 = page.getByRole('button', { name: /02\s*Risalah/i });
    const box = await btnBabak2.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);

    await btnBabak2.click();
    await expect(page.getByText(/HR\. Imam Al-Baihaqi/i)).toBeVisible({ timeout: 10_000 });

    // Verifikasi Parallax adaptif mobile (#ekosistem) tampil sebagai 3 kartu vertikal utuh
    await expect(page.locator('#ekosistem article')).toHaveCount(3);
    const parallaxCta = page.locator('#ekosistem').getByRole('link', { name: /Lanjut ke Warta Madina/i });
    const ctaBox = await parallaxCta.boundingBox();
    expect(ctaBox?.height || 0).toBeGreaterThanOrEqual(44);

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    await context.close();
  });
});
