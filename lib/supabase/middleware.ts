import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { sanitizeNextPath } from '@/lib/utils/authHelper';

const PUBLIC_EXACT_PATHS = new Set(['/', '/login', '/manifest.webmanifest']);
const PUBLIC_PREFIX_PATHS = ['/berita'];

export function isPublicPathname(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIX_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function updateSession(request: NextRequest) {
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

  const { pathname, search } = request.nextUrl;
  const hasPersistentCookie =
    request.cookies.get('madin_persistent_absen_cepat')?.value === '1';

  const appMeta = (user?.app_metadata || {}) as Record<string, unknown>;
  const specialAuth = (appMeta.special_authorities || {}) as Record<
    string,
    unknown
  >;
  const isUserPersistentAbsenCepat =
    specialAuth.persistent_absen_cepat === true || hasPersistentCookie;

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

  // Jika pengguna di perangkat dengan Otoritas Spesial Absen Cepat membuka URL utama "/" (tanpa ?public=1)
  if (
    pathname === '/' &&
    request.nextUrl.searchParams.get('public') !== '1' &&
    isUserPersistentAbsenCepat
  ) {
    if (user) {
      const redirectUrl = new URL('/absen-cepat', request.url);
      return NextResponse.redirect(redirectUrl);
    }
    if (hasPersistentCookie) {
      const restoreUrl = new URL('/login?next=%2Fabsen-cepat', request.url);
      return NextResponse.redirect(restoreUrl);
    }
  }

  if (isPublicPathname(pathname)) {
    return supabaseResponse;
  }

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
