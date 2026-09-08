import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E5 singles qualifying eliminator → round robin (120)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E5',
    label: 'E2E Singles Qual→RoundRobin',
    eventFormat: 'singles',
    finalMethod: 'round_robin',
  });
});
