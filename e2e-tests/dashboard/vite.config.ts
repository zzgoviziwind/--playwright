import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3200',
      '/ws': {
        target: 'ws://localhost:3200',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
