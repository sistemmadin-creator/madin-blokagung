import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebPushServerService } from '@/lib/services/webPushServer';
import { pushSendSchema } from '@/lib/validations/pushNotificationSchema';
import {
  checkRateLimit,
  getUserOrClientIdentifier,
  createRateLimitResponse,
  RATE_LIMIT_PROFILES,
} from '@/lib/security/rateLimiter';
import { verifySameOriginRequest } from '@/lib/security/csrfGuard';

const ALLOWED_BROADCAST_ROLES = new Set([
  'master_admin',
  'admin',
  'pkm_kurikulum',
  'ketua_madin',
  'pimpinan',
  'pengurus',
  'dewan_guru',
  'asatidz',
  'wali_kelas',
  'mustahiq',
  'custom_user',
]);

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
        { error: 'Akses ditolak. Anda harus login sebagai pengurus untuk mengirim notifikasi.' },
        { status: 401 }
      );
    }

    // 1. Proteksi Beban & Rate Limiting (Maksimal 10 broadcast per menit per akun/IP)
    const identifier = getUserOrClientIdentifier(req, 'push_send', user.id);
    const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_PROFILES.PUSH_SEND);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Verifikasi Otoritas Peran Pengguna secara Fail-Closed dari Tabel user_accounts
    const { data: userAcc } = await supabase
      .from('user_accounts')
      .select('role, username, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (userAcc && userAcc.is_active === false) {
      return NextResponse.json(
        { error: 'Akses ditolak: Akun pengurus Anda sedang dinonaktifkan.' },
        { status: 403 }
      );
    }

    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
    const userRole = String(userAcc?.role || appMeta.role || '').toLowerCase();
    const username = String(userAcc?.username || appMeta.username || '').toLowerCase();
    const isMaster =
      userRole === 'master_admin' ||
      username === 'admin' ||
      Boolean(user.email && user.email.toLowerCase().startsWith('admin@'));

    // Fail-closed: tolak jika bukan Master Admin dan userRole kosong atau tidak ada di ALLOWED_BROADCAST_ROLES
    if (!isMaster && !ALLOWED_BROADCAST_ROLES.has(userRole)) {
      return NextResponse.json(
        {
          error:
            'Akses ditolak: Peran akun Anda tidak memiliki hak akses untuk menyiarkan notifikasi push.',
        },
        { status: 403 }
      );
    }

    // 3. Validasi Skema Input Ketat menggunakan Zod
    let bodyRaw: unknown;
    try {
      bodyRaw = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Format JSON payload tidak valid atau corrupt' },
        { status: 400 }
      );
    }

    const parseResult = pushSendSchema.safeParse(bodyRaw);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      const firstError =
        Object.values(errors)[0]?.[0] || 'Validasi skema input tidak terpenuhi.';
      return NextResponse.json(
        {
          error: `Validasi gagal: ${firstError}`,
          details: errors,
        },
        { status: 400 }
      );
    }

    const {
      title,
      body: content,
      url,
      icon,
      badge,
      role,
      target_identifier,
      endpoint,
    } = parseResult.data;

    const payload = {
      title,
      body: content,
      url: url || '/',
      icon: icon || '/logo-madin.png',
      badge: badge || '/logo-madin.png',
      tag: 'madin-' + Date.now(),
    };

    const result = await WebPushServerService.dispatchPushNotification({
      payload,
      endpoint,
      role,
      targetIdentifier: target_identifier || undefined,
      dbClient: supabase,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error di /api/push/send (POST):', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mengirim notifikasi push' },
      { status: 500 }
    );
  }
}
