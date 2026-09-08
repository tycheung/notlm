import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E7 teams qualifying eliminator → eliminator final (120 teams)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E7',
    label: 'E2E Teams Qual→Elim',
    eventFormat: 'teams',
    finalMethod: 'eliminator',
  });
});
