import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Madrasah Diniyyah Al-Amiriyyah Blokagung',
    short_name: 'Madin Blokagung',
    description:
      'Sistem Informasi Akademik & Presensi Madrasah Diniyyah Al-Amiriyyah Pondok Pesantren Darussalam Blokagung',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#047857',
    icons: [
      {
        src: '/logo-madin.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo-madin.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
