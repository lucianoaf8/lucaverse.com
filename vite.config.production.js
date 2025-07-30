import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Production-specific Vite configuration
 * LUCI-011: Secure production server configuration
 */
export default defineConfig({
  base: './',
  mode: 'production',
  plugins: [react()],
  
  // Preview server configuration (production-like)
  preview: {
    port: 5155,
    host: 'localhost', // Security: Always bind to localhost unless explicitly overridden
    open: false, // Don't auto-open for security
    strictPort: true,
    
    // Production-like security headers
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  },
  
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  
  // Production build settings
  build: {
    sourcemap: false, // Security: No source maps in production
    minify: 'esbuild',
    target: 'esnext',
    
    rollupOptions: {
      output: {
        // Security: Obscure chunk names
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['./src/utils/logger.js', './src/utils/securityHeaders.js']
        }
      }
    },
    
    // Security optimizations
    reportCompressedSize: false, // Disable for faster builds
    chunkSizeWarningLimit: 1000
  },
  
  // Production environment variables
  define: {
    __DEV__: false,
    'process.env.NODE_ENV': '"production"'
  },
  
  // Production optimizations
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  
  // Security: Prevent information disclosure
  experimental: {
    renderBuiltUrl() {
      return { relative: true };
    }
  }
});