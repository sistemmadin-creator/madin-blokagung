import dns from 'node:dns/promises';
import net from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkRateLimit,
  createRateLimitResponse,
  getUserOrClientIdentifier,
  RATE_LIMIT_PROFILES,
} from '@/lib/security/rateLimiter';
import { verifySameOriginRequest } from '@/lib/security/csrfGuard';

/**
 * Server-Side Proxy BFF untuk WAHA WhatsApp Gateway.
 * - Meneruskan request dari browser (HTTPS) ke WAHA Gateway (VPS / Tunnel / Localhost Dev).
 * - Menyuntikkan WAHA_API_KEY secara server-side tanpa mengeksposnya ke browser produksi.
 * - Menerapkan autentikasi ketat (fail-closed), otorisasi RBAC halaman 'kirim-wa',
 *   CSRF guard, allowlist endpoint/method, rate limiting terpisah (GET vs POST),
 *   serta validasi anti-SSRF (termasuk resolusi DNS).
 */

const ALLOWED_LOCAL_PORTS = new Set(['3000', '3001', '3008', '8080']);

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // Link-local / Cloud Metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT / Tailscale internal
  if (a >= 224) return true; // Multicast & Reserved
  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  if (!normalized) return true;

  if (normalized.startsWith('::ffff:')) {
    const mappedV4 = normalized.slice('::ffff:'.length);
    if (net.isIPv4(mappedV4)) {
      return isPrivateOrReservedIpv4(mappedV4);
    }
  }

  const version = net.isIP(normalized);
  if (version === 4) {
    return isPrivateOrReservedIpv4(normalized);
  }
  if (version === 6) {
    if (
      normalized === '::1' ||
      normalized === '::' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }
    return false;
  }
  return true;
}

function getAllowedTargetPatterns(): RegExp[] {
  const patterns: RegExp[] = [
    /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.trycloudflare\.com$/i,
    /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.ngrok-free\.app$/i,
    /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.ngrok\.io$/i,
    /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.loca\.lt$/i,
  ];

  const envTarget = process.env.WAHA_BASE_URL || process.env.NEXT_PUBLIC_WAHA_BASE_URL;
  if (envTarget) {
    try {
      const parsed = new URL(envTarget);
      const escapedOrigin = parsed.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      patterns.push(new RegExp(`^${escapedOrigin}$`, 'i'));
    } catch {
      // Abaikan jika format env URL tidak valid
    }
  }

  const extraHosts = process.env.WAHA_ALLOWED_HOSTS;
  if (extraHosts) {
    extraHosts
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
      .forEach((host) => {
        const escapedHost = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        patterns.push(new RegExp(`^https?:\\/\\/${escapedHost}(:\\d+)?$`, 'i'));
      });
  }

  return patterns;
}

function validateWahaTargetUrl(rawUrl: string): { valid: boolean; sanitizedOrigin?: string; hostname?: string; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'Format URL target WAHA tidak valid.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Protokol URL harus http atau https.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isProd = process.env.NODE_ENV === 'production';

  // Blokir akses ke Cloud Metadata & Link-Local di semua environment
  if (
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname.startsWith('169.254.')
  ) {
    return { valid: false, reason: 'Target host masuk daftar terlarang (SSRF Protection).' };
  }

  // Izinkan localhost / 127.0.0.1 HANYA di environment non-production dengan port terbatas
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (isProd) {
      return { valid: false, reason: 'Loopback localhost tidak diizinkan di server produksi.' };
    }
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    if (!ALLOWED_LOCAL_PORTS.has(port)) {
      return {
        valid: false,
        reason: `Port lokal ${port} tidak diizinkan. Gunakan port standar WAHA (3008/3000/3001/8080).`,
      };
    }
    return { valid: true, sanitizedOrigin: parsed.origin, hostname };
  }

  // Blokir IP literal privat/loopback/reserved
  if (net.isIP(hostname) !== 0 && isPrivateOrReservedIp(hostname)) {
    return { valid: false, reason: 'IP jaringan internal/privat tidak diizinkan (SSRF Protection).' };
  }

  // Di production, wajib HTTPS untuk domain publik/tunnel
  if (isProd && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Target WAHA eksternal wajib menggunakan HTTPS di produksi.' };
  }

  // Periksa terhadap daftar pola domain yang diizinkan
  const allowedPatterns = getAllowedTargetPatterns();
  const isAllowed = allowedPatterns.some((pattern) => pattern.test(parsed.origin));

  if (!isAllowed) {
    return {
      valid: false,
      reason: 'Domain target WAHA tidak terdaftar dalam whitelist server.',
    };
  }

  return { valid: true, sanitizedOrigin: parsed.origin, hostname };
}

async function assertSafeTargetHost(hostname: string): Promise<{ safe: boolean; reason?: string }> {
  const normalized = hostname.trim().toLowerCase();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd && (normalized === 'localhost' || normalized === '127.0.0.1')) {
    return { safe: true };
  }

  if (net.isIP(normalized) !== 0) {
    if (isPrivateOrReservedIp(normalized)) {
      return { safe: false, reason: 'Target IP masuk jaringan privat/internal (SSRF Protection).' };
    }
    return { safe: true };
  }

  try {
    const records = await dns.lookup(normalized, { all: true });
    if (!records || records.length === 0) {
      return { safe: false, reason: 'Gagal meresolusi DNS host gateway WhatsApp.' };
    }
    for (const record of records) {
      if (isPrivateOrReservedIp(record.address)) {
        return {
          safe: false,
          reason: 'DNS host gateway mengarah ke IP internal/privat terlarang (DNS Rebinding Protection).',
        };
      }
    }
    return { safe: true };
  } catch {
    return { safe: false, reason: 'Tidak dapat memverifikasi DNS host gateway WhatsApp.' };
  }
}

function isAllowedWahaSubPath(method: string, subPath: string): boolean {
  const clean = subPath.replace(/^\/+|\/+$/g, '');
  if (!clean || clean.includes('..')) return false;

  if (method === 'GET') {
    if (clean === 'sessions') return true;
    if (/^sessions\/[a-zA-Z0-9_-]{1,32}(\/auth\/qr)?$/.test(clean)) return true;
    return false;
  }

  if (method === 'POST') {
    if (clean === 'sendImage' || clean === 'sendText') return true;
    if (/^sessions\/[a-zA-Z0-9_-]{1,32}\/logout$/.test(clean)) return true;
    return false;
  }

  return false;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxyRequest(req, resolvedParams.path, 'GET');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxyRequest(req, resolvedParams.path, 'POST');
}

async function handleProxyRequest(req: NextRequest, pathSegments: string[], method: string) {
  try {
    // 0. CSRF Origin Guard untuk mutasi POST
    if (method === 'POST') {
      const csrf = verifySameOriginRequest(req, { requireJsonContentType: false });
      if (!csrf.allowed) {
        return NextResponse.json(
          { online: false, status: 'FORBIDDEN', error: csrf.reason || 'Permintaan ditolak oleh proteksi CSRF.' },
          { status: csrf.status || 403 }
        );
      }
      const contentLength = Number(req.headers.get('content-length') || '0');
      const contentType = (req.headers.get('content-type') || '').toLowerCase();
      if (contentLength > 0 && !contentType.includes('application/json')) {
        return NextResponse.json(
          { online: false, status: 'BAD_REQUEST', error: 'Content-Type harus application/json.' },
          { status: 415 }
        );
      }
    }

    // 1. Autentikasi Sesi Ketat (Fail-Closed, tanpa bypass is_app_security_enabled)
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          online: false,
          status: 'UNAUTHORIZED',
          error: 'Akses ditolak: Anda harus login untuk menggunakan gateway WhatsApp.',
        },
        { status: 401 }
      );
    }

    // 2. Otorisasi RBAC Akun & Halaman 'kirim-wa'
    const { data: userAcc } = await supabase
      .from('user_accounts')
      .select('role, username, is_active, page_permissions')
      .eq('id', user.id)
      .maybeSingle();

    if (userAcc && userAcc.is_active === false) {
      return NextResponse.json(
        {
          online: false,
          status: 'FORBIDDEN',
          error: 'Akun Anda sedang dinonaktifkan oleh Administrator.',
        },
        { status: 403 }
      );
    }

    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
    const effectiveRole = String(userAcc?.role || appMeta.role || '').toLowerCase();
    const effectiveUsername = String(userAcc?.username || appMeta.username || '').toLowerCase();
    const isMaster =
      effectiveRole === 'master_admin' ||
      effectiveUsername === 'admin' ||
      Boolean(user.email && user.email.toLowerCase().startsWith('admin@'));

    if (!isMaster) {
      const perms = (userAcc?.page_permissions || appMeta.page_permissions || {}) as Record<string, string>;
      const kirimWaPerm = perms['kirim-wa'];
      if (method === 'GET' && kirimWaPerm === 'sembunyikan') {
        return NextResponse.json(
          {
            online: false,
            status: 'FORBIDDEN',
            error: 'Anda tidak memiliki izin melihat status layanan Kirim WA.',
          },
          { status: 403 }
        );
      }
      if (method === 'POST' && kirimWaPerm && kirimWaPerm !== 'edit') {
        return NextResponse.json(
          {
            online: false,
            status: 'FORBIDDEN',
            error: 'Anda memerlukan hak akses Edit pada halaman Kirim WA untuk mengirim pesan.',
          },
          { status: 403 }
        );
      }
    }

    // 3. Validasi Allowlist SubPath & Method
    const subPath = (pathSegments || []).join('/');
    if (!isAllowedWahaSubPath(method, subPath)) {
      return NextResponse.json(
        {
          online: false,
          status: 'FORBIDDEN',
          error: 'Endpoint atau metode gateway WhatsApp tidak diizinkan.',
        },
        { status: 403 }
      );
    }

    // 4. Rate Limiting Terpisah (GET Status vs POST Pengiriman) berbasis User ID
    const rateProfile =
      method === 'GET' ? RATE_LIMIT_PROFILES.WAHA_STATUS : RATE_LIMIT_PROFILES.WAHA_SEND;
    const rateKeyPrefix = method === 'GET' ? 'waha_status' : 'waha_send';
    const rateLimit = checkRateLimit(
      getUserOrClientIdentifier(req, rateKeyPrefix, user.id),
      rateProfile
    );

    if (!rateLimit.success) {
      return createRateLimitResponse(rateLimit);
    }

    // 5. Resolusi Target URL & Kunci Rahasia Server-Side
    const isProd = process.env.NODE_ENV === 'production';
    const serverBaseUrl = (
      process.env.WAHA_BASE_URL ||
      process.env.WAHA_API_URL ||
      process.env.NEXT_PUBLIC_WAHA_BASE_URL ||
      ''
    ).trim();
    const serverApiKey = (process.env.WAHA_API_KEY || '').trim();

    // Jika di produksi server WAHA belum disiapkan (kosong atau diset 'disabled'/'dummy'),
    // kembalikan respons OFFLINE yang bersih (200 untuk pengecekan status sesi agar tidak memicu error console,
    // 503 untuk pengiriman otomatis) sehingga Mode Kirim Manual (wa.me) tetap berjalan 100% normal.
    if (
      isProd &&
      (!serverBaseUrl ||
        !serverApiKey ||
        serverBaseUrl.toLowerCase() === 'disabled' ||
        serverBaseUrl.toLowerCase() === 'dummy')
    ) {
      return NextResponse.json(
        {
          online: false,
          status: 'OFFLINE',
          error:
            'Server WAHA Gateway belum diaktifkan. Silakan gunakan Mode Kirim Manual (wa.me).',
        },
        { status: method === 'GET' ? 200 : 503 }
      );
    }

    const clientHeaderTarget = (req.headers.get('x-waha-target') || '').trim();
    const ignoreClientTarget =
      !clientHeaderTarget ||
      clientHeaderTarget === 'server-default' ||
      (isProd && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(clientHeaderTarget));

    const requestedTarget = ignoreClientTarget
      ? serverBaseUrl || 'http://localhost:3008'
      : clientHeaderTarget;

    const validation = validateWahaTargetUrl(requestedTarget);
    if (!validation.valid || !validation.sanitizedOrigin || !validation.hostname) {
      return NextResponse.json(
        {
          online: false,
          status: 'FORBIDDEN_TARGET',
          error: validation.reason || 'Target URL WAHA ditolak oleh kebijakan keamanan.',
        },
        { status: 403 }
      );
    }

    // 6. Verifikasi Anti-SSRF DNS Rebinding
    const hostSafety = await assertSafeTargetHost(validation.hostname);
    if (!hostSafety.safe) {
      return NextResponse.json(
        {
          online: false,
          status: 'FORBIDDEN_TARGET',
          error: hostSafety.reason || 'Host target WAHA tidak lulus verifikasi keamanan jaringan.',
        },
        { status: 403 }
      );
    }

    const targetUrl = `${validation.sanitizedOrigin}/api/${subPath}`;

    // Di production, hanya gunakan WAHA_API_KEY milik server (abaikan header x-api-key dari browser)
    const apiKey = isProd
      ? serverApiKey
      : serverApiKey || (req.headers.get('x-api-key') || '').trim();

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'Bypass-Tunnel-Reminder': 'true',
    };

    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    let body: string | undefined = undefined;
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
      try {
        const json = await req.json();
        body = JSON.stringify(json);
      } catch {
        // Biarkan kosong jika request POST tanpa body (misal /logout)
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: 'error',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal terhubung ke server WAHA';
    return NextResponse.json(
      {
        online: false,
        status: 'OFFLINE',
        error: message,
      },
      { status: 502 }
    );
  }
}
