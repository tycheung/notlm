import { describe, expect, it } from 'vitest';

import {
  adminBowlerPath,
  adminEventScoringPath,
  adminEventStandingsPath,
  adminTournamentLivePath,
  adminTournamentPath,
  eventCompletedLabel,
  scoresPostedLabel,
  snapshotFromReport,
} from '@/pages/admin/abuseReportReview';

describe('abuse report review helpers', () => {
  it('builds admin deep links', () => {
    expect(adminEventStandingsPath(21)).toBe('/admin/events/21?tab=standings');
    expect(adminEventScoringPath(21)).toBe('/admin/events/21?tab=game_scoring');
    expect(adminTournamentPath(9)).toBe('/admin/tournaments/9');
    expect(adminTournamentLivePath(9, 21)).toBe(
      '/admin/tournaments/9?tab=live&eventId=21'
    );
    expect(adminBowlerPath(3)).toBe('/admin/bowlers/3');
  });

  it('describes the submit snapshot', () => {
    expect(scoresPostedLabel(0)).toBe(
      '0 scores were posted on this event at submit.'
    );
    expect(scoresPostedLabel(1)).toBe(
      '1 score was posted on this event at submit.'
    );
    expect(scoresPostedLabel(12)).toBe(
      '12 scores were posted on this event at submit.'
    );
    expect(eventCompletedLabel(null)).toBe(
      'Event was not marked complete at submit.'
    );
    expect(eventCompletedLabel('2026-08-01T12:00:00')).toBe(
      'Event was already complete at submit.'
    );
  });

  it('reads games_scores_count from the stored snapshot', () => {
    expect(
      snapshotFromReport({ snapshot: { games_scores_count: 4 } }).games_scores_count
    ).toBe(4);
    expect(snapshotFromReport({ snapshot: null }).games_scores_count).toBeUndefined();
  });
});
