import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './utils/test-setup.js',
    css: true,
    include: ['unit-tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: [
      'node_modules/',
      'tests/gui-tests/',
      'tests/integration-tests/',
      'lucaverse-auth/',
      '**/*.config.js',
      '**/*.config.ts',
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'output_reports/coverage',
      exclude: [
        'node_modules/',
        'tests/gui-tests/',
        'tests/integration-tests/',
        'lucaverse-auth/',
        '**/*.config.js',
        '**/*.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '../src',
    },
  },
})