import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages는 https://<user>.github.io/gym-app/ 아래에서 서비스되므로 빌드 때만 경로를 붙인다
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/gym-app/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'nextrep',
        short_name: 'nextrep',
        description: 'nextrep — 기록하면 다음 무게를 알려주는 운동 기록 앱',
        lang: 'ko',
        display: 'standalone',
        start_url: './',
        scope: './',
        theme_color: '#1B1F3B',
        background_color: '#1B1F3B',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,ico,json}'] },
    }),
  ],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
}))
