import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      // Vite 8 prefers non-Babel path if possible
      babel: {
        plugins: []
      }
    }),
    tailwindcss(),
  ],
  esbuild: {
    // Explicitly set to avoid deprecation warnings from older plugin versions
    jsx: 'automatic',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
