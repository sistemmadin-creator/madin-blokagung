import { type NextRequest } from 'next/server';

const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/manifest.webmanifest',
  '/sw.js',
  '/favicon.ico',
  '/icon.png',
  '/logo-madin.png',
]);

const PUBLIC_PREFIX_PATHS = [
  '/berita',
  '/api/og/rapor-hafalan',
  '/api/monitoring',
  '/test-crash',
];

/**
 * Memeriksa apakah request ditujukan ke subdomain sistem admin.
 * Mendeteksi:
 * - Produksi: sistem.madinblokagung.com, sistem-*.madinblokagung.com
 * - Vercel Preview / Project: sistem.madinblokagung.vercel.app, sistem-*.vercel.app
 * - Lingkungan Lokal: sistem.localhost (RFC 6761)
 * - Development fallback query param: ?__subdomain=sistem
 */
export function isSistemSubdomain(request: NextRequest): boolean {
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    '';

  const hostname = rawHost.split(':')[0].toLowerCase().trim();

  if (
    hostname.startsWith('sistem.') ||
    hostname.startsWith('sistem-') ||
    hostname === 'sistem.localhost'
  ) {
    return true;
  }

  // Fallback pengujian di development tanpa custom host
  if (
    process.env.NODE_ENV === 'development' &&
    request.nextUrl.searchParams.get('__subdomain') === 'sistem'
  ) {
    return true;
  }

  return false;
}

/**
 * Mendapatkan origin URL portal publik (madinblokagung.com / www.madinblokagung.com)
 */
export function getPublicPortalOrigin(request: NextRequest): string {
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    '';

  const hostname = rawHost.split(':')[0].toLowerCase().trim();

  if (hostname.includes('localhost') || hostname === '127.0.0.1') {
    const portMatch = rawHost.match(/:(\d+)$/);
    const port = portMatch ? `:${portMatch[1]}` : ':3000';
    return `http://localhost${port}`;
  }

  // Sesuai konfigurasi Vercel: domain produksi utama adalah www.madinblokagung.com
  return process.env.NEXT_PUBLIC_PUBLIC_PORTAL_URL || 'https://www.madinblokagung.com';
}

/**
 * Mendapatkan origin URL subdomain sistem (sistem.madinblokagung.com)
 */
export function getSistemPortalOrigin(request: NextRequest): string {
  const rawHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    '';

  const hostname = rawHost.split(':')[0].toLowerCase().trim();

  if (hostname.includes('localhost') || hostname === '127.0.0.1') {
    const portMatch = rawHost.match(/:(\d+)$/);
    const port = portMatch ? `:${portMatch[1]}` : ':3000';
    return `http://sistem.localhost${port}`;
  }

  return process.env.NEXT_PUBLIC_SISTEM_PORTAL_URL || 'https://sistem.madinblokagung.com';
}

/**
 * Memeriksa apakah sebuah path diizinkan diakses pada domain publik
 */
export function isPublicPathname(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIX_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
