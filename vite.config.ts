import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Precache the app shell. Data lives in the API (/api), which must
        // always go to the network — never served from the SW cache or
        // answered with the SPA's index.html.
        globPatterns: ['**/*.{js,css,html,svg}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
      manifest: {
        name: 'GB PDI',
        short_name: 'GB PDI',
        description: 'Plano de Desenvolvimento Individual',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // `npm run dev:api` serves the API on :3000; the SPA calls it same-origin.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
