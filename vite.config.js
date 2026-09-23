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
<<<<<<< HEAD
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
=======
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
>>>>>>> 816727ed9d0fc32be8b3b65a6de61ac2beb32245
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'Deckster - Flashcard App',
        short_name: 'Deckster',
        description: 'A modern flashcard application with tinder-style swiping',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: appBase,
        start_url: `${appBase}#/decks`,
        icons: [
          {
<<<<<<< HEAD
            src: `${appBase}icon.svg`,
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: `${appBase}icon.svg`,
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: `${appBase}icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
=======
            src: '/new-icon.png',
            sizes: '1254x1254',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/new-icon.png',
            sizes: '1254x1254',
            type: 'image/png',
>>>>>>> 816727ed9d0fc32be8b3b65a6de61ac2beb32245
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
