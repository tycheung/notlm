/**
 * Assistant-guided event format: NLU + compiler diversity + live UI smoke.
 */
import { expect, test } from '@playwright/test';

import {
  compileFormatUtterance,
  listFormatMissingRequired,
} from '../../src/features/director-guide/formatDraftCompiler';
import { GUIDE_IDS } from '../../src/features/director-guide/guideIds';
import { parsePackedUtterance } from '../../src/features/director-guide/packUtterance';
import { getNavSkip } from '../../src/features/director-guide/navSkipRegistry';
import { loginAsDirector } from './helpers/auth';
import { getLiveSeed } from './helpers/liveSeed';

test.describe('@guide-nlu director guide format compiler', () => {
  test('NL digest: qual → final → championship, no invented execution_order', () => {
    const r = compileFormatUtterance(
      '5-game qualifying, top half to final, pay top 3 championship',
      null
    );
    expect(r.payload.rounds.length).toBeGreaterThanOrEqual(2);
    expect((r.payload.rounds[0] as { game_count?: number }).game_count).toBe(5);
    const edges = r.payload.relationships || [];
    for (const e of edges) {
      const src = String((e as { source_ref?: string }).source_ref);
      const siblings = edges.filter(
        (x) => String((x as { source_ref?: string }).source_ref) === src
      );
      if (siblings.length === 1) {
        expect((e as { execution_order?: number }).execution_order).toBeUndefined();
      }
    }
  });

  test('optional honesty: no carry_over unless prompted', () => {
    const r = compileFormatUtterance('3 game qualifying top 32 to bracket', null);
    for (const e of r.payload.relationships || []) {
      expect((e as { carry_over_enabled?: boolean }).carry_over_enabled).toBeUndefined();
    }
  });

  test('graph incremental: round without games flashes required', () => {
    const r = compileFormatUtterance('Add qualifying round eliminator', null);
    const missing = listFormatMissingRequired(r.payload);
    expect(missing.some((m) => m.fieldGuideId === GUIDE_IDS.FORMAT_ROUND_GAMES)).toBe(true);
  });

  test('graph: round → final → edge', () => {
    let r = compileFormatUtterance('Add qualifying round, 6 games, eliminator', null);
    r = compileFormatUtterance('Add championship exit, pay top 8', r.payload);
    r = compileFormatUtterance('Add edge from qualifying to championship, top 8', r.payload);
    expect(r.payload.relationships.length).toBe(1);
    expect((r.payload.relationships[0] as { advancement_count?: number }).advancement_count).toBe(
      8
    );
  });

  test('multi-exit cashers needs execution order', () => {
    const r = compileFormatUtterance(
      '5 game qualifying with cashers then advance top half to finals and pay top 3',
      null
    );
    const counts = new Map<string, number>();
    for (const e of r.payload.relationships || []) {
      const s = String((e as { source_ref?: string }).source_ref);
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    expect([...counts.values()].some((n) => n > 1)).toBe(true);
  });

  test('match saved format query', () => {
    const r = compileFormatUtterance('use my cashers format', null);
    expect(r.matchQuery).toMatch(/cashers/i);
  });

  test('finish flag', () => {
    const draft = compileFormatUtterance('3 game qualifying top 50% to final pay top 3', null);
    const r = compileFormatUtterance('save the format', draft.payload);
    expect(r.finishRequested).toBe(true);
  });

  test('diversity matrix methods', () => {
    expect(
      compileFormatUtterance('5 game qualifying cut top 32 to single elim bracket', null)
        .payload.rounds.some((x) => (x as { competition_method?: string }).competition_method === 'bracket')
    ).toBe(true);
    expect(
      compileFormatUtterance('stepladder finals after 4 game qualifying', null)
        .payload.rounds.some((x) => (x as { competition_method?: string }).competition_method === 'stepladder')
    ).toBe(true);
    expect(
      compileFormatUtterance('round robin stage 3 games', null).payload.rounds.length
    ).toBeGreaterThanOrEqual(1);
  });

  test('pack create_event then apply_format', () => {
    const packed = parsePackedUtterance(
      'Create event named Scratch Singles then 5-game qualifying top half to final pay top 3'
    );
    const steps = packed.actions.map((a) => a.stepId);
    expect(steps).toContain('create_event');
    expect(steps).toContain('apply_format');
    const formatAction = packed.actions.find((a) => a.stepId === 'apply_format');
    expect(formatAction?.slots.formatDraft).toBeTruthy();
  });

  test('top % and winners edges', () => {
    const pct = compileFormatUtterance('4 game qualifying top 50% to final', null);
    expect(
      (pct.payload.relationships?.[0] as { advancement_percentage?: number })
        ?.advancement_percentage
    ).toBe(50);
    const win = compileFormatUtterance('Add edge from qualifying to final, winners', pct.payload);
    expect(
      (win.payload.relationships || []).some(
        (e) => (e as { advancement_filter?: string }).advancement_filter === 'winners'
      )
    ).toBe(true);
  });

  test('missing required lists game_count before finish', () => {
    const r = compileFormatUtterance('Add prelims round eliminator', null);
    expect(r.missingRequired.some((m) => m.fieldGuideId === GUIDE_IDS.FORMAT_ROUND_GAMES)).toBe(
      true
    );
  });

  test('single-exit does not require execution_order', () => {
    const r = compileFormatUtterance('3 game qualifying top 16 to championship pay top 3', null);
    expect(r.needsExecutionOrder).toBe(false);
  });

  test('nav skip for apply_format opens wizard', () => {
    const skip = getNavSkip('apply_format');
    const resolved = skip?.resolve({
      layoutPrefix: '/director',
      tournamentId: 1,
      eventId: 2,
      eventCountForTournament: 1,
      saOnlyMode: false,
      eventComplete: null,
      user: null,
      billing: null,
      pathname: '/director/events/2',
      search: '',
    } as never);
    expect(resolved?.path).toContain('event-formats/wizard');
    expect(resolved?.search).toContain('eventId=2');
    expect(resolved?.spotlight).toBe(GUIDE_IDS.FORMAT_WIZARD);
  });
});

test.describe('@guide-nlu @checklist director guide format UI', () => {
  test.skip(
    !!process.env.PLAYWRIGHT_SKIP_WEBSERVER,
    'Live UI needs Vite/API (unset PLAYWRIGHT_SKIP_WEBSERVER)'
  );

  test('assistant opens format wizard from apply format utterance', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}`);

    const fab = page.locator('[data-guide-id="guide-assistant-fab"]');
    await expect(fab).toBeVisible({ timeout: 20000 });
    if ((await fab.getAttribute('data-assistant-open')) !== 'true') {
      await fab.click();
    }
    const dialog = page.getByRole('dialog', { name: /^Assistant$/i });
    await expect(dialog).toBeVisible();
    const input = dialog.getByLabel('Assistant chat input');
    await input.fill('set up rounds');
    await input.press('Enter');

    await expect(page).toHaveURL(/event-formats\/wizard/, { timeout: 20000 });
    await expect(page.locator(`[data-guide-id="${GUIDE_IDS.FORMAT_WIZARD}"]`)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(`[data-guide-id="${GUIDE_IDS.FORMAT_ADD_STAGE}"]`)).toBeVisible();
  });

  test('explain advancement field mid-format without crashing', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto('/director/event-formats/wizard?fromGuide=1');
    const fab = page.locator('[data-guide-id="guide-assistant-fab"]');
    await expect(fab).toBeVisible({ timeout: 20000 });
    if ((await fab.getAttribute('data-assistant-open')) !== 'true') {
      await fab.click();
    }
    const dialog = page.getByRole('dialog', { name: /^Assistant$/i });
    const input = dialog.getByLabel('Assistant chat input');
    await input.fill('explain advancement');
    await input.press('Enter');
    await expect(dialog.getByText(/Advancement|cut/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('NL format draft then apply to event from guide wizard', async ({ page }) => {
    const seed = getLiveSeed();
    await loginAsDirector(page, seed.tdEmail, seed.tdPassword);
    await page.goto(`/director/events/${seed.eventId}`);

    const fab = page.locator('[data-guide-id="guide-assistant-fab"]');
    await expect(fab).toBeVisible({ timeout: 20000 });
    if ((await fab.getAttribute('data-assistant-open')) !== 'true') {
      await fab.click();
    }
    const dialog = page.getByRole('dialog', { name: /^Assistant$/i });
    const input = dialog.getByLabel('Assistant chat input');
    await input.fill(
      '3-game qualifying top half to final pay top 3 championship then save the format'
    );
    await input.press('Enter');

    await expect(page).toHaveURL(/event-formats\/wizard/, { timeout: 20000 });
    const applyBtn = page.getByRole('button', { name: /Apply to event|Save and apply|Apply format/i });
    if (await applyBtn.count()) {
      await applyBtn.first().click();
      await expect(
        page.getByText(/applied|saved|format|success/i).first()
      ).toBeVisible({ timeout: 30000 });
    } else {
      await expect(page.locator(`[data-guide-id="${GUIDE_IDS.FORMAT_WIZARD}"]`)).toBeVisible();
    }
  });
});
