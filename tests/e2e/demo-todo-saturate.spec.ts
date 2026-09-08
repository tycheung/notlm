import { expect, test, type Request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { answerSlotAsk, openChat, sendUtterance } from './helpers/chat';

test.describe('@guide-saturate @guide-nlu demo-todo saturation pool', () => {
  function assertNoProductApi(request: Request) {
    const url = request.url();
    let pathname = url;
    try {
      pathname = new URL(url).pathname;
    } catch {
      /* keep raw */
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      throw new Error(`Unexpected product API request: ${url}`);
    }
  }

  const scenariosPath = join(
    process.cwd(),
    'packs/demo-todo/.uipilot/scenarios.json'
  );
  const scenarios = JSON.parse(readFileSync(scenariosPath, 'utf8')) as Array<{
    id: string;
    utterance: string;
    expect: { stepId?: string | null; rawIntent?: string; goBack?: boolean };
  }>;

  test('typed utterances from scenario pool do not hit /api', async ({ page }) => {
    page.on('request', assertNoProductApi);
    await page.goto('/');
    await openChat(page);

    const sample = scenarios.filter((s) =>
      ['s1-create-list', 's3-add-item', 's7-whats-next', 's9-negative'].includes(s.id)
    );
    expect(sample.length).toBeGreaterThanOrEqual(3);

    for (const s of sample) {
      await sendUtterance(page, s.utterance);
      if (s.expect.stepId === 'create_list') {
        await answerSlotAsk(page, /name the list/i, 'Shopping');
      }
    }

    await expect(page.getByRole('listitem').filter({ hasText: 'Shopping' })).toBeVisible();
  });

  test('custom ChatHeader slot is mounted (chrome personalization)', async ({ page }) => {
    page.on('request', assertNoProductApi);
    await page.goto('/');
    await openChat(page);
    await expect(page.getByTestId('demo-coach-header')).toBeVisible();
    await expect(page.getByTestId('demo-coach-header')).toContainText('demo-todo');
  });

  test('appearance accent token paints FAB (teal brand)', async ({ page }) => {
    page.on('request', assertNoProductApi);
    await page.goto('/');
    await expect(page.getByTestId('uipilot-fab')).toHaveCSS(
      'background-color',
      'rgb(15, 118, 110)'
    );
  });
});
