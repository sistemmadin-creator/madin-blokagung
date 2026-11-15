import * as Sentry from '@sentry/nextjs';
import { sanitizeSentryEvent } from './lib/services/errorMonitoring';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,
  enabled: Boolean(SENTRY_DSN),
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  beforeSend(event) {
    return sanitizeSentryEvent(event);
  },
});
