import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the Express backend during development
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
})
