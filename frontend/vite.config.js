// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND_HOST = process.env.VITE_BACKEND_HOST || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy API calls to backend during development
      '/api': {
        target: BACKEND_HOST,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
      // Socket.io endpoint will be same origin (ws) so proxy is not strictly required for websocket,
      // but this ensures websockets are proxied too.
      '/socket.io': {
        target: BACKEND_HOST,
        ws: true
      }
    }
  },
  define: {
    'process.env': {}
  }
});
