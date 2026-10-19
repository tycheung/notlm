import { describe, expect, it } from 'vitest';
import {
  actionRiskFromIntent,
  actionRiskFromParsed,
  isActionGated,
  shouldDeferAction,
} from './actionRisk.js';
import { CONFIDENCE_HIGH_MIN } from './confidenceBands.js';

describe('actionRisk', () => {
  it('classifies FAQ / help as answer (not gated)', () => {
    expect(actionRiskFromIntent('faq')).toBe('answer');
    expect(actionRiskFromIntent('help')).toBe('answer');
    expect(isActionGated('answer')).toBe(false);
  });

  it('classifies goto: and openSurface as navigate (gated)', () => {
    expect(actionRiskFromIntent('goto:createTournament')).toBe('navigate');
    expect(
      actionRiskFromParsed({
        rawIntent: 'faq',
        openSurface: 'createTournament',
      })
    ).toBe('navigate');
    expect(isActionGated('navigate')).toBe(true);
  });

  it('classifies mutation catalog head and delete: as mutate', () => {
    expect(actionRiskFromParsed({ rawIntent: null, mutationId: 'm1' })).toBe(
      'mutate'
    );
    expect(actionRiskFromIntent('delete:tournament')).toBe('mutate');
    expect(actionRiskFromIntent('apply:format')).toBe('mutate');
    expect(isActionGated('mutate')).toBe(true);
  });

  it('classifies ambiguous / unknown / ood', () => {
    expect(actionRiskFromIntent('ambiguous')).toBe('clarify');
    expect(actionRiskFromIntent('unknown')).toBe('clarify');
    expect(actionRiskFromIntent('ood')).toBe('refuse');
  });

  it('instructOnly + openSurface stays answer', () => {
    expect(
      actionRiskFromParsed({
        rawIntent: 'goto:x',
        openSurface: 'sideActions',
        instructOnly: true,
      })
    ).toBe('answer');
  });

  it('shouldDeferAction: high navigate allowed; low/mid gated', () => {
    expect(
      shouldDeferAction('navigate', 'high', CONFIDENCE_HIGH_MIN, null)
    ).toBe(false);
    expect(shouldDeferAction('navigate', 'low', 0.2, null)).toBe(true);
    expect(shouldDeferAction('answer', 'low', 0.2, null)).toBe(false);
  });

  it('shouldDeferAction: treatMidAsLowForActions defers mid mutate only', () => {
    const cfg = { treatMidAsLowForActions: true };
    expect(shouldDeferAction('mutate', 'mid', 0.7, cfg)).toBe(true);
    expect(shouldDeferAction('answer', 'mid', 0.7, cfg)).toBe(false);
    expect(shouldDeferAction('mutate', 'high', 0.95, cfg)).toBe(false);
  });

  it('shouldDeferAction: mid without probability only defers when treatMidAsLow', () => {
    expect(shouldDeferAction('navigate', 'mid', undefined, null)).toBe(false);
    expect(
      shouldDeferAction('navigate', 'mid', undefined, {
        treatMidAsLowForActions: true,
      })
    ).toBe(true);
  });

  it('allows intentMap exact override without host brand in defaults', () => {
    expect(
      actionRiskFromIntent('custom_meta', {
        intentMap: { exact: { custom_meta: 'mutate' } },
      })
    ).toBe('mutate');
  });
});
