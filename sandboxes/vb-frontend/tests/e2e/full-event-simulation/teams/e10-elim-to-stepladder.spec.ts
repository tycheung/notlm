import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E10 teams qualifying eliminator → stepladder (120 teams)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E10',
    label: 'E2E Teams Qual→Stepladder',
    eventFormat: 'teams',
    finalMethod: 'stepladder',
  });
});
