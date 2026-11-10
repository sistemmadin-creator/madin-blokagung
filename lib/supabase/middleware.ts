import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeNextPath } from '@/lib/utils/authHelper';
import {
  isSistemSubdomain,
  isPublicPathname,
  getPublicPortalOrigin,
} from '@/lib/utils/subdomainHelper';

// Re-export untuk kompatibilitas jika modul lain mengimpor langsung
export { isPublicPathname };

export async function updateSession(request: NextRequest) {
  const isSistem = isSistemSubdomain(request);
  const { pathname, search } = request.nextUrl;

  // =========================================================================
  // KASUS 1: DOMAIN UTAMA / PUBLIK (madinblokagung.com, www.madinblokagung.com)
  // =========================================================================
  if (!isSistem) {
    // 1. Path publik yang sah (Landing Page "/", Berita, OG Image, Manifest, Icon)
    if (isPublicPathname(pathname)) {
      return NextResponse.next({
        request,
      });
    }

    // 2. Akses ke path internal / login / admin menu melalui domain publik:
    // Sesuai Pilihan 2 (Stealth / Privasi Maksimal): Kirimkan respon 404 Not Found
    // seolah-olah halaman admin sama sekali tidak ada di domain utama.
    const notFoundUrl = new URL('/_not-found', request.url);
    return NextResponse.rewrite(notFoundUrl, {
      status: 404,
      headers: {
        'x-middleware-status': '404',
      },
    });
  }

  // =========================================================================
  // KASUS 2: SUBDOMAIN SISTEM (sistem.madinblokagung.com, sistem.localhost)
  // =========================================================================

  // 1. Jika pengguna di subdomain sistem membuka halaman berita publik,
  // alihkan (308 Permanent) ke portal publik utama agar subdomain fokus untuk operasional.
  if (pathname.startsWith('/berita')) {
    const publicOrigin = getPublicPortalOrigin(request);
    const targetUrl = new URL(`${pathname}${search || ''}`, publicOrigin);
    return NextResponse.redirect(targetUrl, 308);
  }

  // File publik / manifest / worker yang diizinkan di subdomain sistem
  if (
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname === '/icon.png' ||
    pathname === '/logo-madin.png'
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Always use getUser() in server middleware to revalidate the JWT with Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasPersistentCookie =
    request.cookies.get('madin_persistent_absen_cepat')?.value === '1';

  const appMeta = (user?.app_metadata || {}) as Record<string, unknown>;
  const specialAuth = (appMeta.special_authorities || {}) as Record<
    string,
    unknown
  >;
  const isUserPersistentAbsenCepat =
    specialAuth.persistent_absen_cepat === true || hasPersistentCookie;

  // 2. ROOT SUBDOMAIN ("sistem.madinblokagung.com/"):
  // Secara default ketika mengakses root subdomain maka otomatis akan mengarah
  // ke login (jika belum login) atau dashboard (jika sudah login).
  if (pathname === '/') {
    if (!user) {
      if (hasPersistentCookie) {
        const restoreUrl = new URL('/login?next=%2Fabsen-cepat', request.url);
        return NextResponse.redirect(restoreUrl);
      }
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl, 307);
    }

    const targetPath = isUserPersistentAbsenCepat
      ? '/absen-cepat'
      : '/dashboard';
    const redirectUrl = new URL(targetPath, request.url);
    return NextResponse.redirect(redirectUrl, 307);
  }

  // 3. HALAMAN LOGIN ("sistem.madinblokagung.com/login"):
  if (pathname === '/login') {
    if (user) {
      const rawNext = request.nextUrl.searchParams.get('next');
      const targetPath = isUserPersistentAbsenCepat
        ? rawNext && rawNext !== '/dashboard'
          ? sanitizeNextPath(rawNext)
          : '/absen-cepat'
        : sanitizeNextPath(rawNext);
      const redirectUrl = new URL(targetPath, request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // 4. SELURUH RUTE INTERNAL SISTEM ADMIN & API INTERNAL:
  if (!user) {
    // Periksa apakah Saklar Keamanan Aplikasi MADINA sedang dinonaktifkan oleh Master Admin
    const { data: isSecurityEnabled } = await supabase.rpc('is_app_security_enabled');
    if (isSecurityEnabled === false) {
      return supabaseResponse;
    }

    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    const intendedTarget = `${pathname}${search || ''}`;
    loginUrl.search = `?next=${encodeURIComponent(intendedTarget)}`;
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
