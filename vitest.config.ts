import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx', 'tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['packages/core/src/**/*.ts', 'packages/react/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.ts',
        '**/headless.ts',
        '**/styles.ts',
        '**/internal.ts',
        '**/loadFolder.ts',
        '**/types.ts',
        '**/dispatchDeps.ts',
        '**/chromeTypes.ts',
      ],
      thresholds: {
        lines: 40,
        functions: 40,
        statements: 40,
      },
    },
  },
});
