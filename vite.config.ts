import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base './' = funciona en Firebase Hosting, Cloudflare Pages y GitHub Pages (subcarpeta)
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 700 }, // firebase.js (~575 kB) solo se descarga si hay claves
  plugins: [react(), tailwindcss()],
})
