import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['html2canvas', 'jspdf', 'xlsx'],
    // canvg (a jspdf dep) pulls in core-js which has a broken local install.
    // Mark them external so esbuild skips them — SVG-in-PDF is not needed.
    esbuildOptions: {
      external: ['canvg', 'dompurify', 'core-js'],
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy /api requests to backend during development
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
