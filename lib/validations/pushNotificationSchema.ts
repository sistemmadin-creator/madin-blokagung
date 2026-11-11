import { z } from 'zod';

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
  url: z
    .string()
    .trim()
    .refine(
      (val) => !val || val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
      { message: 'URL harus berupa path relatif (contoh: /absen-cepat) atau URL HTTP/HTTPS yang valid' }
    )
    .optional()
    .default('/'),
  icon: z.string().trim().optional().default('/logo-madin.png'),
  badge: z.string().trim().optional().default('/logo-madin.png'),
  role: z
    .enum(['wali', 'asatidz', 'mustahiq', 'all', 'pengurus', 'santri'])
    .optional(),
  target_identifier: z
    .string()
    .trim()
    .max(100, 'Target identifier maksimal 100 karakter')
    .nullable()
    .optional(),
  endpoint: z
    .string()
    .trim()
    .url('Format endpoint push tidak valid')
    .optional(),
});

export type PushSendInput = z.infer<typeof pushSendSchema>;

/**
 * Skema validasi pendaftaran subscription browser Web Push
 */
export const pushSubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url('Endpoint harus berupa URL yang valid'),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(10, 'Key p256dh tidak valid'),
      auth: z.string().min(10, 'Key auth tidak valid'),
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
  endpoint: z
    .string()
    .trim()
    .url('Format endpoint harus berupa URL yang valid'),
});

export type PushDeleteInput = z.infer<typeof pushDeleteSchema>;
