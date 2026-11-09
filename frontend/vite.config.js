import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import mockApi from './dev/mockApi.js';

export default defineConfig(({ mode }) => ({
  // En modo mock la API se simula en el propio servidor de desarrollo (ver dev/mockApi.js).
  plugins: mode === 'mock' ? [react(), mockApi()] : [react()],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    }
  },
  server: mode === 'mock' ? {} : {
    proxy: {
      '/api': {
        // Apuntamos a localhost (donde está Traefik) y forzamos el Host header
        target: 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
