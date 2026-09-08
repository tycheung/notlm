/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (id.includes('@tanstack/react-query')) return 'react-query';
          if (
            id.includes('@fortawesome') ||
            id.includes('@heroicons') ||
            id.includes('react-icons')
          ) {
            return 'icons';
          }
          if (id.includes('react-router')) return 'router';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
        },
      },
    },
  },
  test: {
    globals: false,
    environment: 'happy-dom',
    setupFiles: ['./tests/setupTests.ts'],
    env: {
      VITE_LIVE_SCORES_CDN: '1',
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/api/payloadNormalization.ts',
        'src/utils/advancementCalculator.ts',
        'src/utils/finalNodePoolValidation.ts',
        'src/utils/roleBasedRouting.ts',
        'src/utils/directorAccessUi.ts',
        'src/utils/tournamentStatus.ts',
        'src/utils/breadcrumbBuilders.ts',
        'src/utils/pendingGameScoreSave.ts',
        'src/utils/eventRound/buildIndividualAssignmentSavePlan.ts',
        'src/utils/eventRound/workspaceSaveHelpers.ts',
        'src/pages/tournament_director/tournamentManagementUtils.ts',
        'src/pages/tournament_director/actionsNeededUtils.ts',
        'src/pages/tournament_director/tdHomeEventWindows.ts',
        'src/pages/tournament_director/tdHomeEventStage.ts',
        'src/pages/tournament_director/tdHomePendingLinks.ts',
        'src/pages/tournament_director/tdHomeOwnedSplit.ts',
        'src/pages/dashboard/bowlerHomeTournaments.ts',
        'src/pages/dashboard/bowlerStatDisplay.ts',
        'src/pages/dashboard/bowlerStatsEventGrid.ts',
        'src/pages/tournament_director/bowlingCenterManagementUtils.ts',
        'src/features/rounds/usePersistedRoundSelection.ts',
        'src/features/rounds/roundRelevance.ts',
        'src/features/side-actions/shared/effectivePoolPresentation.ts',
        'src/components/side_actions/reports/buildPayoutReportDocument.ts',
        'src/routes/routes.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      thresholds: {
        lines: 70,
        functions: 65,
        branches: 55,
        statements: 70,
      },
    },
  },
});
