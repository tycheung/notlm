import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E6 singles qualifying eliminator → pods (120)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E6',
    label: 'E2E Singles Qual→Pods',
    eventFormat: 'singles',
    finalMethod: 'pods',
  });
});
