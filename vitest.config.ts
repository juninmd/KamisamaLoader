/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}', 'tests/integration.spec.ts'],
    exclude: ['tests/electron.spec.ts', 'tests/full_system.spec.ts', 'node_modules', 'dist'],
    environment: 'node', // Default to node for backend/integration
    environmentMatchGlobs: [
        ['tests/unit/components/**', 'happy-dom'],
        ['src/**', 'happy-dom']
    ],
    testTimeout: 20000,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['electron/**/*.ts', 'src/**/*.{ts,tsx}'],
        exclude: [
            '**/*.d.ts',
            '**/*.test.ts',
            '**/*.spec.ts',
            'electron/preload.ts',
            'electron/main.ts',
            'src/main.tsx',
            'src/vite-env.d.ts',
            'vite.config.ts',
            'vitest.config.ts',
            'playwright.config.ts',
            'postcss.config.js',
            'tailwind.config.js',
            'eslint.config.js',
            'src/types.ts',
            'electron/shared-types.ts',
            'src/pages/**'
        ],
        all: true,
        thresholds: {
            lines: 85,
            functions: 85,
            branches: 75,
            statements: 85
        }
    }
  },
});
