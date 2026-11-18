import { test, expect } from '@playwright/test';
import { openPublicContext } from './helpers/auth';

test.describe('71 - Beranda Publik Cinematic Scroll-Driven Hero', () => {
  test('1. Desktop: Navbar putih solid, Al-Amiriyyah 1 baris, Madin Blokagung, scroll 3 babak + Parallax, tanpa console error', async ({ browser }) => {
    const { context, page } = await openPublicContext(browser);
    await page.setViewportSize({ width: 1280, height: 800 });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');

    // Babak 1 tampil saat awal, label berganti menjadi Madin Blokagung, tanpa tombol Lewati Intro & 01-03 HUD
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Madin Blokagung', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('(MADINA) Blokagung')).toHaveCount(0);
    await expect(page.getByText(/Merawat tradisi keilmuan salafiyah/i)).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Lewati Intro/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /01\s*Tradisi/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /02\s*Risalah/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /03\s*Khazanah/i })).toHaveCount(0);
    await expect(page.getByText(/Gulir ke bawah untuk melanjutkan/i)).toBeVisible();
    await expect(page.locator('#hero canvas')).toBeVisible();

    // Tulisan Al-Amiriyyah berada dalam 1 baris utuh (single line rect)
    const alAmiriyyahRects = await page
      .locator('#hero h1 span')
      .evaluate((el) => el.getClientRects().length);
    expect(alAmiriyyahRects).toBe(1);

    // Navbar putih solid sejak awal (scrollY = 0)
    const header = page.locator('header').first();
    await expect(header).toHaveClass(/bg-white\/95/);

    // Scroll ke Babak 2 (~46% progress Hero) -> Hadits tampil
    await page.evaluate(() => {
      const hero = document.getElementById('hero');
      if (!hero) return;
      const max = Math.max(0, hero.offsetHeight - window.innerHeight);
      window.scrollTo(0, hero.offsetTop + max * 0.46);
    });
    await expect(page.getByText(/HR\. Imam Al-Baihaqi/i)).toBeVisible({ timeout: 10_000 });

    // Scroll ke Babak 3 (~86% progress Hero) -> Dawuh Pendiri & CTA muncul
    await page.evaluate(() => {
      const hero = document.getElementById('hero');
      if (!hero) return;
      const max = Math.max(0, hero.offsetHeight - window.innerHeight);
      window.scrollTo(0, hero.offsetTop + max * 0.86);
    });
    await expect(page.getByText(/Openono perkoro seng ono/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /Pelajari Kurikulum/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Baca Warta Madina/i })).toBeVisible();

    // Scroll ke awal section Parallax (#ekosistem) dan uji HUD Parallax Desktop
    await page.evaluate(() => {
      document.getElementById('ekosistem')?.scrollIntoView({ behavior: 'instant' });
    });
    await expect(page.locator('#ekosistem')).toBeInViewport({ timeout: 10_000 });

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

  test('2. Mobile (375px): Canvas scrubbing aktif saat scroll, Al-Amiriyyah 1 baris, Parallax adaptif bertingkat & tanpa overflow', async ({ browser }) => {
    const { context, page } = await openPublicContext(browser);
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Madrasah Diniyyah/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Madin Blokagung', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Gulir ke bawah untuk melanjutkan/i)).toBeVisible();

    const canvas = page.locator('#hero canvas');
    await expect(canvas).toBeVisible();

    // Tunggu frame awal siap tergambar ke canvas
    await page.waitForTimeout(400);
    const frameBefore = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL('image/jpeg', 0.4));

    const alAmiriyyahRects = await page
      .locator('#hero h1 span')
      .evaluate((el) => el.getClientRects().length);
    expect(alAmiriyyahRects).toBe(1);

    // Scroll ke tengah Hero di HP -> frame canvas harus benar-benar berubah dan Babak 2 tampil
    await page.evaluate(() => {
      const hero = document.getElementById('hero');
      if (!hero) return;
      const max = Math.max(0, hero.offsetHeight - window.innerHeight);
      window.scrollTo(0, hero.offsetTop + max * 0.5);
    });
    await expect(page.getByText(/HR\. Imam Al-Baihaqi/i)).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(400);
    const frameAfter = await canvas.evaluate((el: HTMLCanvasElement) => el.toDataURL('image/jpeg', 0.4));
    expect(frameAfter).not.toBe(frameBefore);

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
