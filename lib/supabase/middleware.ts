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

  if (pathname === '/login') {
    if (user) {
      const targetPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'));
      const redirectUrl = new URL(targetPath, request.url);
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  if (isPublicPathname(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
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
