import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // SPA fallback: serve index.html for all routes (enables React Router)
    // This is handled automatically by Vite's dev server for SPA
  },
  preview: {
    port: 4173,
  },
})
