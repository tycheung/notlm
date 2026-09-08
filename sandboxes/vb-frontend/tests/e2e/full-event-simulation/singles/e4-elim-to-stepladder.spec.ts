import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E4 singles qualifying eliminator → stepladder (120)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E4',
    label: 'E2E Singles Qual→Stepladder',
    eventFormat: 'singles',
    finalMethod: 'stepladder',
  });
});
