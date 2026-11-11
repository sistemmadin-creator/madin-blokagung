import * as Sentry from '@sentry/nextjs';
import { sanitizeErrorData } from './lib/services/errorMonitoring';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Aktifkan hanya jika DSN tersedia
  enabled: Boolean(SENTRY_DSN),

  // Sesuaikan sample rate: 10% di production, 100% di dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Jangan flood log konsol kecuali jika debug dibutuhkan
  debug: false,

  // Sanitasi payload sebelum dikirim ke Sentry Cloud
  beforeSend(event) {
    if (event.request) {
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      if (event.request.data) {
        event.request.data = sanitizeErrorData(event.request.data);
      }
    }
    if (event.extra) {
      event.extra = sanitizeErrorData(event.extra);
    }
    return event;
  },
});
