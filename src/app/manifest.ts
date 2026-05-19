import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'avaia - Gestionale',
    short_name: 'avaia',
    description: 'Gestione multi-aziendale - prodotti, vendite, magazzino',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f9fafb',
    theme_color: '#16a34a',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  }
}
