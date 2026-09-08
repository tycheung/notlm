import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E1 singles qualifying eliminator → eliminator final (120)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E1',
    label: 'E2E Singles Qual→Elim',
    eventFormat: 'singles',
    finalMethod: 'eliminator',
  });
});
