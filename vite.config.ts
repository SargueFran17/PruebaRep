import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new build takes over on the next launch. Safe here because the app
      // ships as a single chunk: there is no second file for an already-open
      // page to request and fail to find.
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      manifest: {
        name: 'Cadence — Habit Tracker',
        short_name: 'Cadence',
        description: 'A calm, precise habit tracker for daily practice.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // The app's own ground, so the launch screen and the status bar meet
        // the interface without a seam. Navy would frame an off-white app.
        theme_color: '#f6f6f4',
        background_color: '#f6f6f4',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Android crops up to 20% off every edge; this one keeps the mark
          // inside the safe circle.
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      workbox: {
        // The whole app is 404 KB, so everything is precached and the app opens
        // offline with no cold paths.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The plugin already precaches the manifest's own icons; without this
        // they would also be picked up by the glob and listed twice.
        globIgnores: ['icon-192.png', 'icon-512.png', 'icon-512-maskable.png'],

        // Offline equivalent of the Netlify _redirects rule: any navigation the
        // cache does not recognise is answered with the shell, and React Router
        // resolves the route from there.
        navigateFallback: '/index.html',

        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,

        runtimeCaching: [
          {
            // The stylesheet changes rarely; serve it from cache and refresh in
            // the background so a font tweak is picked up without blocking.
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The font files are immutable and hashed by Google: once cached
            // there is no reason to ever fetch them again.
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // The service worker is a production concern; leaving it off in dev keeps
      // hot reload honest and stops a stale cache masking a real change.
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
