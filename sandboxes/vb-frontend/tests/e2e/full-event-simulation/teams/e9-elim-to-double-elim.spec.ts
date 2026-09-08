import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E9 teams qualifying eliminator → double-elim (120 teams)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E9',
    label: 'E2E Teams Qual→DoubleElim',
    eventFormat: 'teams',
    finalMethod: 'double_elimination',
  });
});
