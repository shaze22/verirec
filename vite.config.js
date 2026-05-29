import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'VeriRec — Platform Rakaman Temuduga Profesional',
        short_name: 'VeriRec',
        description: 'Platform rakaman dan analitik temuduga profesional untuk Malaysia',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/dashboard',
        lang: 'ms',
        categories: ['productivity', 'business'],
        icons: [
          {
            src: 'pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'maskable-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cache all static assets from the build
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2,ttf,eot}'],
        // Serve index.html for all navigation requests (SPA fallback)
        navigateFallback: '/index.html',
        // Never intercept API or Supabase requests
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // Google Fonts CSS — stale-while-revalidate
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          // Google Fonts files — cache-first, 1 year
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Never cache Supabase API calls — always need fresh data
          {
            urlPattern: /supabase\.co/,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        // Enable in dev so we can test offline banner without building
        enabled: false,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const pkg = id.match(/node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/)?.[1];
          if (!pkg) return;
          if (['react', 'react-dom', 'react-router-dom', 'react-router'].includes(pkg)) return 'react-vendor';
          if (pkg.startsWith('@supabase/'))  return 'supabase';
          if (pkg === 'date-fns')            return 'date-vendor';
          if (pkg.startsWith('@sentry/'))    return 'sentry';
          if (['react-hot-toast', 'react-helmet-async', 'zustand', 'clsx'].includes(pkg)) return 'ui-vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
