import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5155,
    host: true,
    open: true,
  },
  preview: {
    port: 5155,
    host: true,
    open: true,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  }
});
