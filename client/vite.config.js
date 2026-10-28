import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig(({ command }) => {
  const serverConfig = {
    port: 5173,
    strictPort: false,
  };

  // Only enable HTTPS when running the local dev server.
  // Vercel runs the 'build' command, so this block is skipped in production.
  if (command === 'serve') {
    try {
      serverConfig.https = {
        key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
      };
    } catch (e) {
      console.error('SSL certs not found, starting dev server in HTTP. Run "mkcert localhost" to create them.');
    }
  }

  return {
    plugins: [react()],
    server: serverConfig,

    build: {
      // Target modern browsers — eliminates legacy polyfills, smaller output
      target: 'es2020',

      rollupOptions: {
        output: {
          manualChunks: {
            // ── Vendor chunks (long-cached, rarely change) ──────────────────
            // React core — tiny, everything depends on this
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],

            // Framer Motion — only needed on authenticated pages
            'vendor-motion': ['framer-motion'],

            // Mapbox — heavy (>500KB), only needed on /explore
            // Note: react-map-gl excluded here due to non-standard package.json exports;
            // it will naturally bundle into the ExplorePage lazy chunk instead.
            'vendor-map': ['mapbox-gl'],

            // i18n — loaded on every page but isolated for cache longevity
            'vendor-i18n': [
              'i18next',
              'react-i18next',
              'i18next-browser-languagedetector',
              'i18next-http-backend',
            ],

            // react-icons — large set, isolated so icon updates don't bust other caches
            'vendor-icons': ['react-icons'],

            // ── Feature chunks (grouped by domain) ─────────────────────────
            // Auth pages share one small chunk — they're all tiny
            'chunk-auth': [
              './src/pages/LoginPage/Login',
              './src/pages/LoginPage/Register',
              './src/pages/LoginPage/ForgotPassword',
              './src/pages/LoginPage/ResetPassword',
              './src/pages/LoginPage/VerifyEmail',
            ],

            // Trip pages grouped — they share utility functions and CSS
            'chunk-trip': [
              './src/pages/TripPage/Details',
              './src/pages/TripPage/EditTrip',
            ],

            // Chat pages grouped — share socket logic and message utilities
            'chunk-chat': [
              './src/pages/ChatAssistantPage/AIAssistant',
              './src/pages/ChatAssistantPage/GroupMessenger',
            ],
          },
        },
      },
    },
  };
});