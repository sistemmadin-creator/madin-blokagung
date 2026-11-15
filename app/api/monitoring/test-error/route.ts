import { NextRequest, NextResponse } from 'next/server';
import {
  captureAppError,
  captureAppMessage,
  sanitizeErrorData,
  isSentryConfigured,
} from '@/lib/services/errorMonitoring';
import {
  checkRateLimit,
  getUserOrClientIdentifier,
  createRateLimitResponse,
} from '@/lib/security/rateLimiter';
import { createClient } from '@/lib/supabase/server';
import { verifySameOriginRequest } from '@/lib/security/csrfGuard';

async function verifyMasterAdminAccess(): Promise<
  { authorized: true; userId: string } | { authorized: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      status: 401,
      error: 'Akses ditolak: Autentikasi Master Admin diperlukan.',
    };
  }

  const { data: userAcc } = await supabase
    .from('user_accounts')
    .select('role, username, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (userAcc && userAcc.is_active === false) {
    return {
      authorized: false,
      status: 403,
      error: 'Akses ditolak: Akun Anda sedang dinonaktifkan.',
    };
  }

  const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
  const role = String(userAcc?.role || appMeta.role || '').toLowerCase();
  const username = String(userAcc?.username || appMeta.username || '').toLowerCase();
  const isMaster =
    role === 'master_admin' ||
    username === 'admin' ||
    Boolean(user.email && user.email.toLowerCase().startsWith('admin@'));

  if (!isMaster) {
    return {
      authorized: false,
      status: 403,
      error: 'Akses ditolak: Endpoint diagnostik hanya dapat diakses oleh Master Admin.',
    };
  }

  return { authorized: true, userId: user.id };
}

export async function GET() {
  const auth = await verifyMasterAdminAccess();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    status: 'ok',
    service: 'Madin Blokagung Error Monitoring',
    sentryConfigured: isSentryConfigured(),
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const csrf = verifySameOriginRequest(req);
  if (!csrf.allowed) {
    return NextResponse.json(
      { error: csrf.reason || 'Permintaan ditolak oleh proteksi CSRF.' },
      { status: csrf.status || 403 }
    );
  }

  const auth = await verifyMasterAdminAccess();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Proteksi Rate Limiting
  const id = getUserOrClientIdentifier(req, 'monitoring_test', auth.userId);
  const rl = checkRateLimit(id, { max: 15, windowMs: 60 * 1000 });
  if (!rl.success) {
    return createRateLimitResponse(rl);
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: 'Format JSON payload tidak valid' },
        { status: 400 }
      );
    }

    const action = typeof body.action === 'string' ? body.action : '';
    const message = typeof body.message === 'string' ? body.message : '';
    const payload = (body.payload as Record<string, unknown>) || {};

    // Uji sanitasi data sensitif
    const sanitizedPayload = sanitizeErrorData(payload);

    if (action === 'capture_message') {
      const eventId = captureAppMessage(
        message || 'Uji coba pesan error monitoring',
        'info',
        sanitizedPayload
      );
      return NextResponse.json({
        success: true,
        type: 'message',
        eventId,
        sanitizedPayload,
      });
    }

    if (action === 'capture_error') {
      const dummyError = new Error(message || 'Uji coba exception monitoring');
      const eventId = captureAppError(dummyError, sanitizedPayload);
      return NextResponse.json({
        success: true,
        type: 'error',
        eventId,
        sanitizedPayload,
      });
    }

    // Default: kembalikan hasil uji sanitasi
    return NextResponse.json({
      success: true,
      sanitized: sanitizedPayload,
      sentryConfigured: isSentryConfigured(),
    });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
