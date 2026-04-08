import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    globals: true,
    fileParallelism: false,
    include: ['**/*.test.js', '**/*.test.jsx'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.*', '**/config/**', '**/data/**']
    }
  },
  resolve: {
    alias: {
      '@/src': resolve(__dirname, './src'),
      '@/models': resolve(__dirname, './src/models'),
      '@/services': resolve(__dirname, './src/services'),
      '@/controllers': resolve(__dirname, './src/controllers'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/middleware': resolve(__dirname, './src/middlewares'),
      '@/routes': resolve(__dirname, './src/routes'),
      '@/test': resolve(__dirname, './test')
    }
  }
});
