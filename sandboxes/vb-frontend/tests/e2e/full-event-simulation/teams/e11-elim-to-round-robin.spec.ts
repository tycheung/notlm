import { test } from '@playwright/test';
import { runFullEventSimulationBundle } from '../helpers/runBundle';

test('@fullflow @full-event-sim E11 teams qualifying eliminator → round robin (120 teams)', async ({
  page,
}) => {
  await runFullEventSimulationBundle(page, {
    epicId: 'E11',
    label: 'E2E Teams Qual→RoundRobin',
    eventFormat: 'teams',
    finalMethod: 'round_robin',
  });
});
