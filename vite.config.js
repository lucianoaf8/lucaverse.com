import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Environment-specific configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const isPreview = process.env.npm_lifecycle_event === 'preview';

export default defineConfig({
  base: './',
  plugins: [react()],
  
  // Development server configuration
  server: {
    port: 5155,
    // Security: Bind to localhost only in development unless explicitly overridden
    host: process.env.VITE_HOST === 'true' ? true : 'localhost',
    open: isDevelopment,
    
    // Security headers for development
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },
  
  // Preview server configuration
  preview: {
    port: 5155,
    // More restrictive for preview (production-like)
    host: isPreview && process.env.VITE_PREVIEW_HOST === 'true' ? true : 'localhost',
    open: false, // Don't auto-open for security
    
    // Production-like security headers
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block'
    }
  },
  
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  
  // Build configuration
  build: {
    // Production security settings
    sourcemap: isDevelopment,
    minify: !isDevelopment,
    
    rollupOptions: {
      output: {
        // Ensure consistent file naming
        manualChunks: undefined
      }
    }
  },
  
  // Environment variables configuration
  define: {
    // Only expose necessary environment variables
    __DEV__: isDevelopment
  }
});
