import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For DEV only:
//export default defineConfig({
//  plugins: [react()],
//  server: {
//    proxy: {
//      '/api': {
//        target: 'http://127.0.0.1:3020',
//        changeOrigin: true,
//      },
//    },
//  },
//});

// For PROD, use the following config:
export default defineConfig({
  plugins: [react()],
});

