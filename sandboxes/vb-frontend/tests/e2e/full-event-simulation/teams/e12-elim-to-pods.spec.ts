import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E12 teams qualifying eliminator → pods (120 teams)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E12',
    label: 'E2E Teams Qual→Pods',
    eventFormat: 'teams',
    finalMethod: 'pods',
  });
});
