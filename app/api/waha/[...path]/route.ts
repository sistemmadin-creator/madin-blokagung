import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BLOCKED_HOSTNAMES = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.google',
  'instance-data',
  '100.100.100.200',
  'fd00:ec2::254',
]);

const DANGEROUS_PORTS = new Set([
  21, 22, 23, 25, 53, 110, 143, 3306, 5432, 6379, 11211, 27017, 9200,
]);

/**
 * Validasi target base URL untuk mencegah Server-Side Request Forgery (SSRF).
 */
function validateTargetBaseUrl(
  requestedTarget?: string | null
): { url?: string; error?: string; status?: number } {
  const defaultTarget = process.env.WAHA_BASE_URL || 'http://localhost:3008';

  // Jika tidak ada target khusus dari client, pakai default server yang aman
  if (!requestedTarget || requestedTarget.trim() === '') {
    return { url: defaultTarget.replace(/\/+$/, '') };
  }

  let parsed: URL;
  try {
    parsed = new URL(requestedTarget);
  } catch {
    return { error: 'Format target URL tidak valid.', status: 400 };
  }

  // Hanya http dan https yang diizinkan
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { error: 'Protokol URL target harus http atau https.', status: 400 };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 1. Blokir Cloud Metadata IP & hostname berbahaya (SSRF)
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.metadata.google.internal')) {
    return { error: 'Akses ke alamat metadata cloud diblokir (SSRF Protection).', status: 403 };
  }

  // 2. Blokir port jaringan sensitif (SSH, DB, SMTP, Redis)
  const port = parsed.port
    ? parseInt(parsed.port, 10)
    : parsed.protocol === 'https:'
    ? 443
    : 80;

  if (DANGEROUS_PORTS.has(port)) {
    return { error: `Akses ke port ${port} dilarang (SSRF Protection).`, status: 403 };
  }

  // 3. Whitelist check
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOriginsEnv = process.env.ALLOWED_WAHA_ORIGINS;

  if (isProduction) {
    const allowedSet = new Set<string>();
    try {
      allowedSet.add(new URL(defaultTarget).origin);
    } catch {
      // ignore
    }
    if (allowedOriginsEnv) {
      for (const originStr of allowedOriginsEnv.split(',')) {
        try {
          allowedSet.add(new URL(originStr.trim()).origin);
        } catch {
          // ignore
        }
      }
    }

    if (!allowedSet.has(parsed.origin)) {
      return {
        error: `Target origin ${parsed.origin} tidak terdaftar dalam whitelist server produksi.`,
        status: 403,
      };
    }
  } else {
    // Di lingkungan development / testing: Izinkan localhost, 127.0.0.1, tunnel atau default origin
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const isTunnel =
      hostname.endsWith('.trycloudflare.com') ||
      hostname.endsWith('.ngrok-free.app') ||
      hostname.endsWith('.ngrok.io') ||
      hostname.endsWith('.loca.lt');

    let isDefaultOrigin = false;
    try {
      isDefaultOrigin = parsed.origin === new URL(defaultTarget).origin;
    } catch {
      // ignore
    }

    if (!isLocal && !isTunnel && !isDefaultOrigin) {
      return {
        error: `Target host ${hostname} tidak diizinkan di lingkungan ini.`,
        status: 403,
      };
    }
  }

  return { url: parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '')) };
}

/**
 * Validasi path segments untuk mencegah path traversal.
 */
function validatePathSegments(pathSegments: string[]): { path?: string; error?: string } {
  if (!pathSegments || pathSegments.length === 0) {
    return { path: '' };
  }

  for (const segment of pathSegments) {
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return { error: 'Path segment corrupt atau encoding tidak valid.' };
    }

    if (
      segment.includes('..') ||
      segment.includes('/') ||
      segment.includes('\\') ||
      decoded.includes('..')
    ) {
      return { error: 'Path mengandung karakter berbahaya (Path Traversal Protection).' };
    }
  }

  return { path: pathSegments.join('/') };
}

/**
 * Next.js API Proxy untuk WhatsApp Gateway (WAHA / Baileys)
 * Menjembatani request dari aplikasi ke endpoint WAHA lokal atau tunnel
 * dengan perlindungan Autentikasi, SSRF, dan Path Traversal.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(req, params.path, 'GET');
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleProxy(req, params.path, 'POST');
}

async function handleProxy(
  req: NextRequest,
  pathSegments: string[],
  method: 'GET' | 'POST'
) {
  // 1. Verifikasi Autentikasi Pengguna di Sisi Server
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let isSecurityEnabled = true;
    try {
      const { data } = await supabase.rpc('is_app_security_enabled');
      if (data === false) isSecurityEnabled = false;
    } catch {
      // Abaikan jika RPC tidak ada
    }

    if (isSecurityEnabled && !user) {
      return NextResponse.json(
        {
          online: false,
          status: 'UNAUTHORIZED',
          error: 'Akses ditolak. Silakan login terlebih dahulu untuk mengakses gateway WhatsApp.',
        },
        { status: 401 }
      );
    }
  } catch (authErr) {
    console.error('Error saat verifikasi autentikasi WAHA proxy:', authErr);
    return NextResponse.json(
      {
        online: false,
        status: 'UNAUTHORIZED',
        error: 'Gagal memverifikasi sesi autentikasi.',
      },
      { status: 401 }
    );
  }

  // 2. Proteksi Path Traversal
  const pathValidation = validatePathSegments(pathSegments);
  if (pathValidation.error) {
    return NextResponse.json(
      { online: false, status: 'BAD_REQUEST', error: pathValidation.error },
      { status: 400 }
    );
  }
  const subPath = pathValidation.path || '';

  // 3. Proteksi SSRF pada Target URL
  const rawTarget =
    req.headers.get('x-waha-target') || req.nextUrl.searchParams.get('targetUrl');
  const targetValidation = validateTargetBaseUrl(rawTarget);

  if (targetValidation.error) {
    return NextResponse.json(
      { online: false, status: 'FORBIDDEN', error: targetValidation.error },
      { status: targetValidation.status || 403 }
    );
  }

  const cleanBase = targetValidation.url!;
  const targetUrl = `${cleanBase}/api/${subPath}`;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    // Prioritaskan server-side environment key untuk melindungi secret
    const serverApiKey = process.env.WAHA_API_KEY;
    const clientApiKey = req.headers.get('x-api-key');
    if (serverApiKey) {
      headers['X-Api-Key'] = serverApiKey;
    } else if (clientApiKey) {
      headers['X-Api-Key'] = clientApiKey.trim();
    }

    let bodyData: string | undefined = undefined;
    if (method === 'POST') {
      try {
        bodyData = await req.text();
        headers['Content-Type'] = 'application/json';
      } catch {
        // Abaikan jika body kosong
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const upstreamRes = await fetch(targetUrl, {
      method,
      headers,
      body: bodyData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await upstreamRes.text();
    return new NextResponse(data, {
      status: upstreamRes.status,
      headers: {
        'Content-Type':
          upstreamRes.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return NextResponse.json(
      {
        online: false,
        status: 'OFFLINE',
        error: `Gagal menghubungi server gateway WhatsApp: ${msg}`,
      },
      { status: 502 }
    );
  }
}
