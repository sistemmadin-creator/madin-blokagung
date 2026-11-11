import webpush from 'web-push';
import { createClient as createServerClient } from '@/lib/supabase/server';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@madinblokagung.com';

let isVapidConfigured = false;

/**
 * Memastikan konfigurasi VAPID diinisialisasi hanya jika environment variable tersedia.
 * Tidak ada fallback kunci rahasia (private key) yang ter-hardcode di dalam source code.
 */
export function ensureVapidConfigured(): boolean {
  if (isVapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.warn(
      '[WebPushServer] VAPID credentials belum lengkap di environment server (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).'
    );
    return false;
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
    isVapidConfigured = true;
    return true;
  } catch (err) {
    console.error('[WebPushServer] Gagal menginisialisasi VAPID details webpush:', err);
    return false;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
}

export interface PushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
  role?: string;
  target_identifier?: string;
  user_agent?: string;
  device_type?: string;
}

type SupabaseServerClient = ReturnType<typeof createServerClient>;

function resolveClient(passedClient?: SupabaseServerClient): SupabaseServerClient {
  if (passedClient) return passedClient;
  return createServerClient();
}

export const WebPushServerService = {
  /**
   * Menyimpan atau memperbarui data langganan push (upsert)
   */
  async saveSubscription(data: PushSubscriptionRecord & { dbClient?: SupabaseServerClient }) {
    const { endpoint, p256dh, auth, role, target_identifier, user_agent, device_type, dbClient } = data;
    const client = resolveClient(dbClient);

    const { data: existing, error: findError } = await client
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (findError) {
      console.error('Error mencari push_subscriptions:', findError);
    }

    if (existing?.id) {
      const { error: updateError } = await client
        .from('push_subscriptions')
        .update({
          p256dh,
          auth,
          role: role || 'wali',
          target_identifier: target_identifier || null,
          user_agent: user_agent || null,
          device_type: device_type || 'mobile',
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
      return { id: existing.id, updated: true };
    }

    const { data: inserted, error: insertError } = await client
      .from('push_subscriptions')
      .insert({
        endpoint,
        p256dh,
        auth,
        role: role || 'wali',
        target_identifier: target_identifier || null,
        user_agent: user_agent || null,
        device_type: device_type || 'mobile',
        is_active: true,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    return { id: inserted.id, inserted: true };
  },

  /**
   * Menghapus langganan push dari database jika dinonaktifkan
   */
  async removeSubscription(endpoint: string, dbClient?: SupabaseServerClient) {
    const client = resolveClient(dbClient);
    const { error } = await client
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (error) {
      console.error('Error saat menghapus subscription:', error);
      throw error;
    }
    return { success: true };
  },

  /**
   * Mengirim payload notifikasi ke satu subscription spesifik
   */
  async sendToSubscription(
    sub: { endpoint: string; p256dh: string; auth: string },
    payload: PushNotificationPayload,
    dbClient?: SupabaseServerClient
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    if (!ensureVapidConfigured()) {
      return {
        success: false,
        error: 'VAPID credentials belum dikonfigurasi di environment server.',
      };
    }

    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    let safeBody = payload.body || '';
    if (safeBody.length > 2000) {
      safeBody = safeBody.slice(0, 1950) + '\n\n... (Buka web untuk melihat laporan lengkap)';
    }

    const notificationData = JSON.stringify({
      title: payload.title || 'Madin Blokagung',
      body: safeBody,
      icon: payload.icon || '/logo-madin.png',
      badge: payload.badge || '/logo-madin.png',
      image: payload.image,
      url: payload.url || '/',
      tag: payload.tag || 'madin-' + Date.now(),
    });

    try {
      const response = await webpush.sendNotification(pushSubscription, notificationData);
      return { success: true, statusCode: response.statusCode };
    } catch (err: unknown) {
      const errorObj = err as { statusCode?: number; message?: string };
      console.warn(`WebPush send gagal untuk endpoint: ${sub.endpoint.slice(0, 40)}...`, errorObj.message);

      // Jika endpoint sudah tidak valid / expired (404 / 410 Gone)
      if (errorObj.statusCode === 404 || errorObj.statusCode === 410) {
        try {
          const client = resolveClient(dbClient);
          await client
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('endpoint', sub.endpoint);
        } catch {
          // ignore
        }
      }

      return {
        success: false,
        statusCode: errorObj.statusCode,
        error: errorObj.message || 'Unknown push error',
      };
    }
  },

  /**
   * Mengirim notifikasi siaran (broadcast) atau tertarget
   */
  async dispatchPushNotification(params: {
    payload: PushNotificationPayload;
    endpoint?: string;
    role?: string;
    targetIdentifier?: string;
    dbClient?: SupabaseServerClient;
  }) {
    if (!ensureVapidConfigured()) {
      return {
        totalTarget: 0,
        sentCount: 0,
        failedCount: 0,
        message: 'VAPID credentials belum dikonfigurasi di environment server.',
      };
    }

    const client = resolveClient(params.dbClient);
    let query = client
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('is_active', true);

    if (params.endpoint) {
      query = query.eq('endpoint', params.endpoint);
    } else {
      if (params.role) {
        query = query.eq('role', params.role);
      }
      if (params.targetIdentifier) {
        query = query.eq('target_identifier', params.targetIdentifier);
      }
    }

    const { data: subscribers, error } = await query;
    if (error) {
      throw new Error(`Gagal mengambil data subscribers: ${error.message}`);
    }

    if (!subscribers || subscribers.length === 0) {
      return { sentCount: 0, failedCount: 0, message: 'Tidak ada subscriber yang cocok.' };
    }

    let sentCount = 0;
    let failedCount = 0;

    await Promise.all(
      subscribers.map(async (sub) => {
        const res = await this.sendToSubscription(sub, params.payload);
        if (res.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      })
    );

    return {
      sentCount,
      failedCount,
      totalSubscribers: subscribers.length,
    };
  },
};
