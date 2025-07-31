import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Development-specific Vite configuration
 * LUCI-011: Secure development server configuration
 */
export default defineConfig({
  base: './',
  mode: 'development',
  plugins: [react()],
  
  server: {
    port: 5155,
    host: 'localhost', // Security: Always bind to localhost in development
    open: true,
    strictPort: true,
    
    // Development-specific security headers
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    
    // Enable CORS for development API calls
    cors: {
      origin: [
        'http://localhost:5155',
        'https://summer-heart.lucianoaf8.workers.dev',
        'https://lucaverse-auth.lucianoaf8.workers.dev',
        'https://formerformfarmer.lucianoaf8.workers.dev'
      ],
      credentials: true
    }
  },
  
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  
  // Development build settings
  build: {
    sourcemap: true,
    minify: false,
    
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  
  // Development environment variables
  define: {
    __DEV__: true,
    'process.env.NODE_ENV': '"development"'
  },
  
  // Development-specific optimizations
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});