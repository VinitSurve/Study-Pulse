import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StudyPulse',
    short_name: 'StudyPulse',
    description: 'Track your study sessions. Start fast, stay focused.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0f1117',
    theme_color: '#0f1117',
    orientation: 'portrait',
    categories: ['education', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
