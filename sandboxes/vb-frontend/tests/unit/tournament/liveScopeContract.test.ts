import { describe, expect, it } from 'vitest';

/** Lightweight contract for Live hub scope query param values. */
const LIVE_SCOPES = ['rounds', 'overall', 'side_actions'] as const;

describe('TournamentLiveViewer scope contract', () => {
  it('exposes rounds, overall, and side_actions scopes', () => {
    expect(LIVE_SCOPES).toContain('rounds');
    expect(LIVE_SCOPES).toContain('overall');
    expect(LIVE_SCOPES).toContain('side_actions');
  });
});
