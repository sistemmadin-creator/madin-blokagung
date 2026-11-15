import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebPushServerService } from '@/lib/services/webPushServer';
import {
  pushSubscribeSchema,
  pushDeleteSchema,
} from '@/lib/validations/pushNotificationSchema';
import {
  checkRateLimit,
  getUserOrClientIdentifier,
  createRateLimitResponse,
  RATE_LIMIT_PROFILES,
} from '@/lib/security/rateLimiter';
import { verifySameOriginRequest } from '@/lib/security/csrfGuard';

export async function POST(req: NextRequest) {
  // 0. CSRF Origin & Content-Type Guard
  const csrf = verifySameOriginRequest(req);
  if (!csrf.allowed) {
    return NextResponse.json(
      { error: csrf.reason || 'Permintaan ditolak oleh proteksi CSRF.' },
      { status: csrf.status || 403 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    // 1. Proteksi Rate Limiting (Maksimal 20 pendaftaran per menit per akun/IP)
    const rl = checkRateLimit(
      getUserOrClientIdentifier(req, 'push_sub', user.id),
      RATE_LIMIT_PROFILES.PUSH_SUBSCRIBE
    );
    if (!rl.success) {
      return createRateLimitResponse(rl);
    }

    let bodyRaw: unknown;
    try {
      bodyRaw = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Format JSON payload tidak valid atau corrupt' },
        { status: 400 }
      );
    }

    // 2. Validasi Skema Zod
    const parseResult = pushSubscribeSchema.safeParse(bodyRaw);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || 'Format data subscription tidak valid';
      return NextResponse.json(
        { error: `Validasi gagal: ${firstError}`, details: errors },
        { status: 400 }
      );
    }

    const { subscription, role: requestedRole, target_identifier } = parseResult.data;

    // 3. Verifikasi role asli dari user_accounts untuk mencegah spoofing role/target_identifier
    const { data: userAcc } = await supabase
      .from('user_accounts')
      .select('role, username, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (userAcc && userAcc.is_active === false) {
      return NextResponse.json(
        { error: 'Akses ditolak: Akun Anda sedang dinonaktifkan.' },
        { status: 403 }
      );
    }

    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
    const actualRole = String(userAcc?.role || appMeta.role || '').toLowerCase();
    const actualUsername = String(userAcc?.username || appMeta.username || '').toLowerCase();
    const isMaster =
      actualRole === 'master_admin' ||
      actualUsername === 'admin' ||
      Boolean(user.email && user.email.toLowerCase().startsWith('admin@'));

    const resolvedRole = isMaster
      ? requestedRole || actualRole || 'master_admin'
      : actualRole || requestedRole || 'wali';

    const resolvedIdentifier = isMaster
      ? target_identifier || user.id
      : user.id;

    const userAgent = req.headers.get('user-agent') || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

    const result = await WebPushServerService.saveSubscription({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      role: resolvedRole,
      target_identifier: resolvedIdentifier,
      user_agent: userAgent,
      device_type: isMobile ? 'mobile' : 'desktop',
      dbClient: supabase,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error di /api/push/subscribe (POST):', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan langganan notifikasi' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // 0. CSRF Origin & Content-Type Guard
  const csrf = verifySameOriginRequest(req);
  if (!csrf.allowed) {
    return NextResponse.json(
      { error: csrf.reason || 'Permintaan ditolak oleh proteksi CSRF.' },
      { status: csrf.status || 403 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    // 1. Proteksi Rate Limiting
    const rl = checkRateLimit(
      getUserOrClientIdentifier(req, 'push_sub_del', user.id),
      RATE_LIMIT_PROFILES.PUSH_SUBSCRIBE
    );
    if (!rl.success) {
      return createRateLimitResponse(rl);
    }

    let bodyRaw: unknown;
    try {
      bodyRaw = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Format JSON payload tidak valid atau corrupt' },
        { status: 400 }
      );
    }

    // 2. Validasi Skema Zod
    const parseResult = pushDeleteSchema.safeParse(bodyRaw);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || 'Endpoint diperlukan';
      return NextResponse.json(
        { error: `Validasi gagal: ${firstError}`, details: errors },
        { status: 400 }
      );
    }

    const { endpoint } = parseResult.data;

    // 3. Proteksi BOLA / IDOR Fail-Closed: Cegah pengguna menghapus langganan akun lain
    //    (termasuk ketika target_identifier bernilai null)
    const { data: userAcc } = await supabase
      .from('user_accounts')
      .select('role, username')
      .eq('id', user.id)
      .maybeSingle();

    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
    const userRole = String(userAcc?.role || appMeta.role || '').toLowerCase();
    const username = String(userAcc?.username || appMeta.username || '').toLowerCase();
    const isMaster =
      userRole === 'master_admin' ||
      username === 'admin' ||
      Boolean(user.email && user.email.toLowerCase().startsWith('admin@'));

    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, target_identifier')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json(
        { error: 'Data langganan notifikasi tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (!isMaster) {
      const isOwnerByUserId = Boolean(sub.user_id && sub.user_id === user.id);
      const isOwnerByIdentifier =
        !sub.user_id &&
        Boolean(
          sub.target_identifier &&
            (sub.target_identifier === user.id || sub.target_identifier === user.email)
        );

      if (!isOwnerByUserId && !isOwnerByIdentifier) {
        return NextResponse.json(
          {
            error:
              'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus langganan akun lain.',
          },
          { status: 403 }
        );
      }
    }

    await WebPushServerService.removeSubscription(endpoint, supabase);
    return NextResponse.json({ success: true, message: 'Langganan notifikasi berhasil dihapus' });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error di /api/push/subscribe (DELETE):', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus langganan notifikasi' },
      { status: 500 }
    );
  }
}
