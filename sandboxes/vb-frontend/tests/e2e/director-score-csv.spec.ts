import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

import { loginAsDirector } from './helpers/auth';
import { openParticipantsTab, uploadHiddenCsv, useAnchorDownloads } from './helpers/eventFlow';
import { getLiveSeed } from './helpers/liveSeed';

test('participants tab downloads a CSV template', async ({ page }) => {
  const seed = getLiveSeed();
  await useAnchorDownloads(page);
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
  await openParticipantsTab(page, seed.eventId);
  const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.getByRole('button', { name: 'Download template' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);
});

test('game scoring CSV download and upload updates a score', async ({ page }) => {
  test.setTimeout(90_000);
  const seed = getLiveSeed();
  await useAnchorDownloads(page);
  await loginAsDirector(page, seed.tdEmail, seed.tdPassword);

  // Qualifying is fully scored, so the workspace may default to unlocked Finals.
  // Persist the locked qualifying round before opening game scoring.
  await page.addInitScript(
    ({ eventId, roundId }) => {
      window.localStorage.setItem(`vb:round-selection:event:${eventId}`, String(roundId));
    },
    { eventId: seed.eventId, roundId: seed.roundId }
  );

  const eventLoaded = page.waitForResponse(
    (res) =>
      res.request().method() === 'GET' &&
      res.url().includes(`/api/v1/events/${seed.eventId}`) &&
      res.ok()
  );
  await page.goto(`/director/events/${seed.eventId}?tab=game_scoring`);
  await eventLoaded;

  const roundSelect = page
    .locator('select')
    .filter({ has: page.locator(`option[value="${seed.roundId}"]`) })
    .first();
  await expect(roundSelect).toBeVisible({ timeout: 20000 });
  await roundSelect.selectOption(String(seed.roundId));
  await expect(roundSelect).toHaveValue(String(seed.roundId));

  // Controls stay disabled until the locked qualifying squad is recognized.
  await expect(page.getByText('No Locked Squads Yet')).toHaveCount(0, { timeout: 45000 });
  await expect(page.getByRole('button', { name: 'Download scores CSV' })).toBeEnabled({
    timeout: 30000,
  });

  const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.getByRole('button', { name: 'Download scores CSV' }).click();
  const download = await downloadPromise;
  const tmp = path.join(os.tmpdir(), `e2e-scores-${Date.now()}.csv`);
  await download.saveAs(tmp);
  const csv = fs.readFileSync(tmp, 'utf8');
  const lines = csv.split(/\r?\n/);
  const header = lines[0] || '';
  const gameCol = header.split(',').findIndex((col) => /game_1/i.test(col));
  expect(gameCol).toBeGreaterThan(-1);
  const dataIndex = lines.findIndex((line, idx) => idx > 0 && line.includes('E2E-ALEX'));
  expect(dataIndex).toBeGreaterThan(0);
  const cols = lines[dataIndex].split(',');
  const current = Number(cols[gameCol] || '0');
  cols[gameCol] = String(Number.isFinite(current) ? current + 1 : 249);
  lines[dataIndex] = cols.join(',');
  fs.writeFileSync(tmp, lines.join('\n'));

  await uploadHiddenCsv(page, tmp);
  await expect(page.getByText(/updated|applied|imported|score/i).first()).toBeVisible({
    timeout: 30000,
  });
});
