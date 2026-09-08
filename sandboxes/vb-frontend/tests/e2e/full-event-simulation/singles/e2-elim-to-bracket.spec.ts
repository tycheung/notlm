import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E2 singles qualifying eliminator → single-elim bracket (120)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E2',
    label: 'E2E Singles Qual→Bracket',
    eventFormat: 'singles',
    finalMethod: 'bracket',
    uiScoreSave: true,
  });
});
