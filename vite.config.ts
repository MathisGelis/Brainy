/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// `base` = '/<nom-du-repo>/' pour GitHub Pages ; surchargeable via VITE_BASE.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/Brainy/',
  plugins: [
    react(),
    tailwindcss(),
    // App installable : manifest + service worker Workbox (voir ARCHITECTURE.md, « Application installable »)
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeManifestIcons: false,
      manifest: {
        id: './',
        name: 'Brainy',
        short_name: 'Brainy',
        description: 'Objectifs, notes, habitudes, todo, budget et menu.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#eceef7',
        theme_color: '#eceef7',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Coquille de l'app ; three.js (fond animé, optionnel et lourd) en cache à la demande
        // (icônes et écrans de lancement : lus par le système à l'installation, pas à mettre en précache)
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/LiquidBackground-*.js'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/LiquidBackground-[\w-]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'three', expiration: { maxEntries: 2 } },
          },
          {
            // Lectures Supabase : réseau d'abord, dernière réponse connue hors ligne
            urlPattern: ({ url, request }) =>
              request.method === 'GET' && url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-data',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 300, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Le seul bloc au-delà de 500 kB est three.js (fond animé), chargé à part et au repos.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Dépendances en blocs séparés : elles restent en cache d'un déploiement à l'autre.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/,
            },
            { name: 'supabase', test: /node_modules[\\/](@supabase|iceberg-js|tslib)[\\/]/ },
            { name: 'query', test: /node_modules[\\/]@tanstack[\\/]/ },
          ],
        },
      },
    },
  },
  // Classeurs Excel fictifs des tests, importés en ?inline
  assetsInclude: ['**/*.xlsx'],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' },
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
