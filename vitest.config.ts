import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['packages/core/src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        '**/loadFolder.ts',
        '**/types.ts',
        '**/dispatchDeps.ts',
      ],
      // PLAN / ci-002: core package floors ≥85% (coverage include is packages/core only).
      thresholds: {
        lines: 85,
        functions: 85,
        statements: 85,
      },
    },
  },
});
