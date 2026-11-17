import { Browser, BrowserContext, expect, Locator, Page } from '@playwright/test';

/**
 * Menavigasi ke rute dashboard terproteksi, dan otomatis login sebagai Master Admin
 * apabila diarahkan oleh middleware ke `/login`.
 */
export async function gotoWithAuth(page: Page, targetPath: string): Promise<void> {
  await page.goto(targetPath);
  await page.waitForLoadState('domcontentloaded');

  if (page.url().includes('/login')) {
    await page.getByLabel('Username Pengurus').fill('admin');
    await page
      .getByLabel('Kata Sandi', { exact: true })
      .fill(process.env.E2E_ADMIN_PASSWORD || '');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 60_000,
    });

    if (!page.url().includes(targetPath.split('?')[0])) {
      await page.goto(targetPath);
      await page.waitForLoadState('domcontentloaded');
    }
  }
}

/**
 * Login eksplisit via halaman `/login` dengan kredensial tertentu, lalu menunggu
 * redirect pasca-login selesai meninggalkan `/login`.
 */
export async function loginViaForm(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/login')) {
    await page.getByLabel('Username Pengurus').fill(username);
    await page.getByLabel('Kata Sandi', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
      timeout: 60_000,
    });
  }
}

/**
 * Membuka grup akordion di Sidebar Desktop bila saat ini masih tertutup.
 */
export async function expandSidebarGroup(
  page: Page,
  groupName: string | RegExp
): Promise<Locator> {
  const sidebar = page.getByRole('complementary');
  const groupBtn = sidebar.getByRole('button', { name: groupName }).first();
  await expect(groupBtn).toBeVisible({ timeout: 20_000 });
  await expect(async () => {
    if ((await groupBtn.getAttribute('aria-expanded')) !== 'true') {
      await groupBtn.click();
    }
    await expect(groupBtn).toHaveAttribute('aria-expanded', 'true', { timeout: 1_500 });
  }).toPass({ timeout: 15_000 });
  return sidebar;
}

/**
 * Membuka sub-menu akordion di dalam Sidebar Desktop bila link anaknya belum tampil.
 */
export async function expandSidebarSubmenu(
  page: Page,
  submenuName: string | RegExp,
  expectedChildLinkName: string | RegExp
): Promise<void> {
  const sidebar = page.getByRole('complementary');
  const childLink = sidebar.getByRole('link', { name: expectedChildLinkName }).first();
  const submenuBtn = sidebar.getByRole('button', { name: submenuName }).first();
  await expect(submenuBtn).toBeVisible({ timeout: 15_000 });
  await expect(async () => {
    if (!(await childLink.isVisible().catch(() => false))) {
      await submenuBtn.click();
    }
    await expect(childLink).toBeVisible({ timeout: 1_500 });
  }).toPass({ timeout: 15_000 });
}

/**
 * Membuka BrowserContext terpisah yang mengarah ke host portal publik (`localhost:3000`)
 * agar tidak terkena redirect subdomain `sistem.localhost:3000`.
 */
export async function openPublicContext(browser: Browser): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      'x-forwarded-host': 'localhost:3000',
    },
  });
  const page = await context.newPage();
  return { context, page };
}
