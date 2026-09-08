/**
 * Quick API-only smoke for E1 provision + scoring (no browser).
 * Run: npx tsx tests/e2e/full-event-simulation/helpers/_smokeProvision.ts
 * Or compile via node with dynamic import after building — use playwright test instead.
 */
import { ApiClient } from './apiClient';
import { makeBundleConfig, provisionBundle } from './provision';
import { scoreQualifyingAndAdvance } from './scoring';

async function main() {
  const apiUrl = process.env.PW_E2E_API_URL || 'http://127.0.0.1:8000';
  const email = process.env.PW_E2E_TD_EMAIL || 'td@example.com';
  const password = process.env.PW_E2E_TD_PASSWORD || 'password123';
  const api = new ApiClient({ apiUrl, tdEmail: email, tdPassword: password });
  await api.login(email, password);
  console.log('logged in');
  const method = (process.env.METHOD || 'eliminator') as
    | 'eliminator'
    | 'bracket'
    | 'double_elimination'
    | 'stepladder'
    | 'round_robin'
    | 'pods';
  const config = makeBundleConfig(
    'SMOKE',
    `E2E SMOKE ${method}`,
    'singles',
    method
  );
  // Smaller smoke unless FULL=1
  if (process.env.FULL !== '1') {
    config.entrantCount = 12;
    config.advancementCount = 4;
  }
  const ctx = await provisionBundle(api, config);
  console.log('provisioned', ctx.eventId, ctx.qualRoundId, ctx.finalRoundId);
  await scoreQualifyingAndAdvance(api, ctx);
  const prize = await api.get(`/events/${ctx.eventId}/prize-distribution`);
  console.log('prize', JSON.stringify(prize).slice(0, 300));
  console.log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
