import { NextRequest, NextResponse } from 'next/server';
import { WebPushServerService } from '@/lib/services/webPushServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, role, target_identifier } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Format data subscription tidak valid' },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get('user-agent') || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

    const result = await WebPushServerService.saveSubscription({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      role: role || 'wali',
      target_identifier: target_identifier || null,
      user_agent: userAgent,
      device_type: isMobile ? 'mobile' : 'desktop',
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
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint diperlukan' }, { status: 400 });
    }

    await WebPushServerService.removeSubscription(endpoint);
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
