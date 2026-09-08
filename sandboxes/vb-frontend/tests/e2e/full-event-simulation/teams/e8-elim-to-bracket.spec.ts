import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E8 teams qualifying eliminator → single-elim bracket (120 teams)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E8',
    label: 'E2E Teams Qual→Bracket',
    eventFormat: 'teams',
    finalMethod: 'bracket',
  });
});
