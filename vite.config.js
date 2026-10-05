import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const appBase = process.env.NODE_ENV === 'production' ? '/deckster/' : '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'deckster-card-images',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 90,
                purgeOnQuotaError: true
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Cram - Flashcard App',
        short_name: 'Cram',
        description: 'A modern flashcard application with tinder-style swiping',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: appBase,
        start_url: `${appBase}#/decks`,
        icons: [
          {
            src: `${appBase}new-icon.png`,
            sizes: '1254x1254',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${appBase}new-icon.png`,
            sizes: '1254x1254',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  base: appBase,
  server: {
    port: 5175, // bumped port number
    host: '0.0.0.0', // Allow external connections
  },
})
