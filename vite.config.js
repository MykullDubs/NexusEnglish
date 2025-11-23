import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({ 
      registerType: 'autoUpdate',
      // Explicitly cache the icon so it works offline immediately
      includeAssets: ['pwa-512x512.png'], 
      manifest: {
        name: 'Family Health Status',
        short_name: 'FamilyHealth',
        description: 'Track health and nutrition for your family and pets',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            // We use the same 512px image for the 192px slot. 
            // Browsers will resize it automatically.
            src: '/pwa-512x512.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable' // CRITICAL for Android: Allows it to crop the icon into a circle
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // CRITICAL for Android
          }
        ]
      }
    })
  ],
})
