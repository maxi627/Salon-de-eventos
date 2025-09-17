import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        // Cambiamos el puerto de 5000 a 80, que es donde escucha Traefik.
        // Como 80 es el puerto por defecto para http, puedes omitirlo.
        target: 'http://localhost', 
        changeOrigin: true,
      },
    },
  },
})