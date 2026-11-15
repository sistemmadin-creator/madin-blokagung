import { z } from 'zod';
import { isSafeRelativeOrHttpUrl, sanitizeHttpUrl } from '@/lib/security/urlSanitizer';

const safeAssetOrTargetUrlSchema = z
  .string()
  .trim()
  .max(500, 'URL maksimal 500 karakter')
  .refine((val) => isSafeRelativeOrHttpUrl(val), {
    message:
      'URL harus berupa path relatif tunggal (contoh: /absen-cepat) atau URL HTTP/HTTPS yang valid (bukan // atau javascript:)',
  });

const safePushEndpointSchema = z
  .string()
  .trim()
  .url('Format endpoint harus berupa URL yang valid')
  .refine((val) => sanitizeHttpUrl(val) !== null, {
    message: 'Endpoint push harus menggunakan skema HTTP/HTTPS yang valid',
  });

/**
 * Skema validasi pengiriman broadcast notifikasi Web Push
 */
export const pushSendSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Judul minimal 3 karakter')
    .max(120, 'Judul maksimal 120 karakter'),
  body: z
    .string()
    .trim()
    .min(3, 'Isi pesan minimal 3 karakter')
    .max(2000, 'Isi pesan maksimal 2000 karakter'),
  url: safeAssetOrTargetUrlSchema.optional().default('/'),
  icon: safeAssetOrTargetUrlSchema.optional().default('/logo-madin.png'),
  badge: safeAssetOrTargetUrlSchema.optional().default('/logo-madin.png'),
  role: z
    .enum(['wali', 'asatidz', 'mustahiq', 'all', 'pengurus', 'santri'])
    .optional(),
  target_identifier: z
    .string()
    .trim()
    .max(100, 'Target identifier maksimal 100 karakter')
    .nullable()
    .optional(),
  endpoint: safePushEndpointSchema.optional(),
});

export type PushSendInput = z.infer<typeof pushSendSchema>;

/**
 * Skema validasi pendaftaran subscription browser Web Push
 */
export const pushSubscribeSchema = z.object({
  subscription: z.object({
    endpoint: safePushEndpointSchema,
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(10, 'Key p256dh tidak valid').max(512),
      auth: z.string().min(10, 'Key auth tidak valid').max(256),
    }),
  }),
  role: z.string().trim().max(50).optional().default('wali'),
  target_identifier: z.string().trim().max(100).nullable().optional(),
});

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

/**
 * Skema validasi penghapusan subscription Web Push
 */
export const pushDeleteSchema = z.object({
  endpoint: safePushEndpointSchema,
});

export type PushDeleteInput = z.infer<typeof pushDeleteSchema>;
