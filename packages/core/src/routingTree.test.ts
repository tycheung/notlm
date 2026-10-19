import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANE_MASK,
  inferPlaneHeuristic,
  laneAllowed,
  laneFromRawIntent,
  normalizeRoutingTree,
  resolveEffectivePlane,
} from './routingTree.js';

describe('routingTree', () => {
  it('masks ask away from mutation/goto', () => {
    expect(laneAllowed('ask', 'faq')).toBe(true);
    expect(laneAllowed('ask', 'goto')).toBe(false);
    expect(laneAllowed('ask', 'mutation')).toBe(false);
    expect(laneAllowed('guide', 'goto')).toBe(true);
    expect(laneAllowed('guide', 'mutation')).toBe(false);
    expect(laneAllowed('do', 'mutation_high_risk')).toBe(true);
  });

  it('resolveEffectivePlane: confident inferred wins over chrome', () => {
    const r = resolveEffectivePlane(
      { plane: 'do', probability: 0.9, source: 'heuristic' },
      'ask'
    );
    expect(r.plane).toBe('do');
    expect(r.usedChromeBias).toBe(false);
  });

  it('resolveEffectivePlane: low confidence uses chrome soft bias', () => {
    const r = resolveEffectivePlane(
      { plane: 'do', probability: 0.4, source: 'heuristic' },
      'ask'
    );
    expect(r.plane).toBe('ask');
    expect(r.usedChromeBias).toBe(true);
  });

  it('inferPlaneHeuristic: conceptual → ask; open → guide; create → do', () => {
    expect(inferPlaneHeuristic('How do I lock records?').plane).toBe('ask');
    expect(inferPlaneHeuristic('Open the checklist').plane).toBe('guide');
    expect(inferPlaneHeuristic('Create a new list named QA').plane).toBe('do');
  });

  it('laneFromRawIntent maps catalog shapes', () => {
    expect(laneFromRawIntent('faq', { faqId: 'x' })).toBe('faq');
    expect(laneFromRawIntent('goto:create_list')).toBe('goto');
    expect(
      laneFromRawIntent('mutation', { mutationId: 'td.delete_record_confirm' })
    ).toBe('mutation_high_risk');
    expect(
      laneFromRawIntent('mutation', {
        mutationId: 'td.confirm_write',
        mutationRisk: 'high',
      })
    ).toBe('mutation_high_risk');
    expect(laneFromRawIntent('mutation', { mutationId: 'td.create_item' })).toBe(
      'mutation'
    );
    expect(DEFAULT_LANE_MASK.do.length).toBeGreaterThan(
      DEFAULT_LANE_MASK.ask.length
    );
  });

  it('normalizeRoutingTree fills laneMask from remap.plane', () => {
    const n = normalizeRoutingTree({
      enabled: true,
      remap: { plane: { ask: ['faq', 'ood'], guide: ['goto'], do: ['mutation'] } },
    });
    expect(n?.laneMask?.ask).toEqual(['faq', 'ood']);
    expect(n?.laneMask?.guide).toEqual(['goto']);
  });
});
