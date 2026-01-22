/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.{test,spec}.ts', 'tests/integration.spec.ts'],
    exclude: ['tests/electron.spec.ts', 'tests/full_system.spec.ts', 'node_modules', 'dist'],
    environment: 'node',
    testTimeout: 20000, // Increase timeout for integration tests
  },
});
