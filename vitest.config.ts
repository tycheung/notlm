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
        // Chrome shells are covered by Playwright e2e; unit floors target helpers + fallback.
        'packages/react/src/ChatComposer.tsx',
        'packages/react/src/ChatMessages.tsx',
        'packages/react/src/ChecklistPanel.tsx',
        'packages/react/src/CommandPalette.tsx',
        'packages/react/src/NotLMContext.tsx',
        'packages/react/src/NotLMFab.tsx',
        'packages/react/src/NotLMHost.tsx',
        'packages/react/src/SpotlightOverlay.tsx',
        'packages/react/src/ThreadList.tsx',
        'packages/react/src/useDraftBridge.ts',
        'packages/react/src/useFocusTrap.ts',
        'packages/react/src/useGuideModal.ts',
        'packages/react/src/useGuideSurface.ts',
        'packages/react/src/useSpotlightController.ts',
        'packages/react/src/useWebSpeechInput.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 55,
      },
    },
  },
});
