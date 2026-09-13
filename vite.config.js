import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-512.svg'],
      manifest: {
        name: 'OneBeyond Vault',
        short_name: 'OB Vault',
        description: 'Scalable Enterprise Stock Audit',
        theme_color: '#004aad',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-512.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      devOptions: {
        enabled: true
      }
    })
  ],
})