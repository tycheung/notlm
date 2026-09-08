import { describe, expect, it } from 'vitest';
import {
  compileFormatUtterance,
  listFormatMissingRequired,
  summarizeFormatDraft,
} from '../../../src/features/director-guide/formatDraftCompiler';
import { GUIDE_IDS } from '../../../src/features/director-guide/guideIds';

describe('formatDraftCompiler', () => {
  it('NL digest builds qual → final → championship without inventing execution_order', () => {
    const r = compileFormatUtterance(
      '5-game qualifying, top half to final, pay top 3 championship',
      null
    );
    expect(r.payload.rounds.length).toBeGreaterThanOrEqual(2);
    const qual = r.payload.rounds[0] as { game_count?: number };
    expect(qual.game_count).toBe(5);
    expect(r.payload.final_nodes?.length).toBeGreaterThanOrEqual(1);
    const edges = r.payload.relationships || [];
    expect(edges.length).toBeGreaterThanOrEqual(1);
    // Single exit per source → no invented execution_order on first edge
    const multi = edges.filter((e) => (e as { execution_order?: number }).execution_order != null);
    // May still set order only for multi-exit cashers path; this utterance is single-exit
    const sources = new Map<string, number>();
    for (const e of edges) {
      const s = String((e as { source_ref?: string }).source_ref);
      sources.set(s, (sources.get(s) || 0) + 1);
    }
    for (const [src, n] of sources) {
      if (n === 1) {
        const edge = edges.find((e) => (e as { source_ref?: string }).source_ref === src) as {
          execution_order?: number;
        };
        expect(edge.execution_order).toBeUndefined();
      }
    }
    expect(r.finishRequested).toBe(false);
    expect(r.matchQuery).toBeNull();
  });

  it('does not invent carry_over on edges', () => {
    const r = compileFormatUtterance('3 game qualifying top 32 to bracket', null);
    for (const e of r.payload.relationships || []) {
      expect((e as { carry_over_enabled?: boolean }).carry_over_enabled).toBeUndefined();
    }
  });

  it('graph: add round without games → missing required games', () => {
    const r = compileFormatUtterance('Add qualifying round eliminator', null);
    expect(r.payload.rounds.length).toBe(1);
    const missing = listFormatMissingRequired(r.payload);
    expect(missing.some((m) => m.fieldGuideId === GUIDE_IDS.FORMAT_ROUND_GAMES)).toBe(true);
  });

  it('graph: add round with games then edge and final', () => {
    let r = compileFormatUtterance('Add qualifying round, 6 games, eliminator', null);
    r = compileFormatUtterance('Add championship exit, pay top 8', r.payload);
    r = compileFormatUtterance('Add edge from qualifying to championship, top 8', r.payload);
    expect(r.payload.rounds.length).toBe(1);
    expect(r.payload.final_nodes?.length).toBe(1);
    expect(r.payload.relationships.length).toBe(1);
    const edge = r.payload.relationships[0] as { advancement_count?: number };
    expect(edge.advancement_count).toBe(8);
  });

  it('multi-exit cashers sets execution_order', () => {
    const r = compileFormatUtterance(
      '5 game qualifying with cashers then advance top half to finals and pay top 3',
      null
    );
    expect(r.needsExecutionOrder || sourcesWithMulti(r.payload)).toBeTruthy();
    const bySource = new Map<string, unknown[]>();
    for (const e of r.payload.relationships || []) {
      const s = String((e as { source_ref?: string }).source_ref);
      if (!bySource.has(s)) bySource.set(s, []);
      bySource.get(s)!.push(e);
    }
    for (const [, edges] of bySource) {
      if (edges.length > 1) {
        const orders = edges.map((e) => (e as { execution_order?: number }).execution_order);
        expect(orders.some((o) => o != null)).toBe(true);
      }
    }
  });

  it('extracts match saved format query', () => {
    const r = compileFormatUtterance('use my cashers format', null);
    expect(r.matchQuery).toMatch(/cashers/i);
  });

  it('finish requested', () => {
    const draft = compileFormatUtterance('3 game qualifying top 50% to final pay top 3', null);
    const r = compileFormatUtterance('save the format', draft.payload);
    expect(r.finishRequested).toBe(true);
  });

  it('summarizeFormatDraft joins stages', () => {
    const r = compileFormatUtterance('3 game qualifying top half to final pay top 3', null);
    const s = summarizeFormatDraft(r.payload);
    expect(s.length).toBeGreaterThan(3);
  });

  it('bracket keyword sets competition_method', () => {
    const r = compileFormatUtterance('5 game qualifying cut top 32 to single elim bracket', null);
    const methods = r.payload.rounds.map((x) => (x as { competition_method?: string }).competition_method);
    expect(methods).toContain('bracket');
  });
});

function sourcesWithMulti(payload: {
  relationships?: Record<string, unknown>[];
}): boolean {
  const counts = new Map<string, number>();
  for (const e of payload.relationships || []) {
    const s = String(e.source_ref || '');
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  return [...counts.values()].some((n) => n > 1);
}
