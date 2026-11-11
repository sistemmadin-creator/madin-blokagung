import * as Sentry from '@sentry/nextjs';
import { sanitizeErrorData } from './lib/services/errorMonitoring';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  enabled: Boolean(SENTRY_DSN),

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  debug: false,

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
