import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// Bungkus konfigurasi Next.js dengan Sentry Webpack Plugin
export default withSentryConfig(nextConfig, {
  // Organisasi & Proyek Sentry (opsional dari env)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Jangan tampilkan log verbose saat build
  silent: true,

  // Sembunyikan source map dari public bundle untuk keamanan kode
  hideSourceMaps: true,

  // Nonaktifkan Sentry CLI logging otomatis di console
  disableLogger: true,

  // Otomatisasi monitor Vercel dimatikan bila tidak digunakan
  automaticVercelMonitors: false,
});
