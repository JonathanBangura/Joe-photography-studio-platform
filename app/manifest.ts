import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'JoeStudio Photography',
    short_name: 'JoeStudio',
    description:
      'Book photography sessions, explore JoeStudio portfolios, and access client galleries.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#171411',
    theme_color: '#c98a00',
    orientation: 'any',
    categories: ['photography', 'business', 'lifestyle'],
    icons: [
      {
        src: '/pwa-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
