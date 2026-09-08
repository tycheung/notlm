import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E3 singles qualifying eliminator → double-elim bracket (120)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E3',
    label: 'E2E Singles Qual→DoubleElim',
    eventFormat: 'singles',
    finalMethod: 'double_elimination',
  });
});
