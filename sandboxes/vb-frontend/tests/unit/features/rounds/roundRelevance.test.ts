import { describe, expect, it } from 'vitest';

import { getMostRelevantRound } from '@/features/rounds/roundRelevance';

const rounds = [
  { id: 1, round_number: 1 },
  { id: 2, round_number: 2 },
  { id: 3, round_number: 3 },
];

describe('getMostRelevantRound', () => {
  it('prefers in-progress rounds over upcoming rounds', () => {
    const result = getMostRelevantRound({
      rounds,
      allSquads: [
        { round_id: 1, start_datetime: '2026-04-08T09:00:00' },
        { round_id: 2, start_datetime: '2026-04-08T13:00:00' },
      ],
      roundStatusData: {
        1: { round_id: 1, status: 'IN_PROGRESS', total_games: 10, scored_games: 4, pending_games: 6, all_scored: false, total_expected_games: 10, completed_games: 4, in_progress_games: 6 },
        2: { round_id: 2, status: 'NOT STARTED', total_games: 0, scored_games: 0, pending_games: 0, all_scored: false, total_expected_games: 0, completed_games: 0, in_progress_games: 0 },
      },
      now: new Date('2026-04-08T10:00:00'),
    });

    expect(result.roundId).toBe(1);
    expect(result.reason).toBe('in_progress');
  });

  it('falls back to upcoming when nothing is in progress', () => {
    const result = getMostRelevantRound({
      rounds,
      allSquads: [
        { round_id: 2, start_datetime: '2026-04-08T13:00:00' },
        { round_id: 3, start_datetime: '2026-04-08T15:00:00' },
      ],
      roundStatusData: {},
      now: new Date('2026-04-08T10:00:00'),
    });

    expect(result.roundId).toBe(2);
    expect(result.reason).toBe('upcoming');
  });

  it('prioritizes the earliest uncompleted round, skipping earlier completed rounds', () => {
    const result = getMostRelevantRound({
      rounds,
      allSquads: [
        { round_id: 1, start_datetime: '2026-04-08T09:00:00' },
        { round_id: 2, start_datetime: '2026-04-08T11:00:00' },
        { round_id: 3, start_datetime: '2026-04-08T13:00:00' },
      ],
      roundStatusData: {
        1: { round_id: 1, status: 'COMPLETE', total_games: 10, scored_games: 10, pending_games: 0, all_scored: true, total_expected_games: 10, completed_games: 10, in_progress_games: 0 },
        2: { round_id: 2, status: 'IN_PROGRESS', total_games: 10, scored_games: 3, pending_games: 7, all_scored: false, total_expected_games: 10, completed_games: 3, in_progress_games: 7 },
        3: { round_id: 3, status: 'NOT STARTED', total_games: 0, scored_games: 0, pending_games: 0, all_scored: false, total_expected_games: 0, completed_games: 0, in_progress_games: 0 },
      },
      now: new Date('2026-04-08T12:00:00'),
    });

    expect(result.roundId).toBe(2);
    expect(result.reason).toBe('in_progress');
  });

  it('uses all-complete fallback when every candidate is complete', () => {
    const result = getMostRelevantRound({
      rounds,
      allSquads: [
        { round_id: 1, start_datetime: '2026-04-08T09:00:00' },
        { round_id: 2, start_datetime: '2026-04-08T10:00:00' },
      ],
      roundStatusData: {
        1: { round_id: 1, status: 'COMPLETE', total_games: 10, scored_games: 10, pending_games: 0, all_scored: true, total_expected_games: 10, completed_games: 10, in_progress_games: 0 },
        2: { round_id: 2, status: 'COMPLETE', total_games: 8, scored_games: 8, pending_games: 0, all_scored: true, total_expected_games: 8, completed_games: 8, in_progress_games: 0 },
      },
      now: new Date('2026-04-08T11:00:00'),
    });

    expect(result.roundId).toBe(1);
    expect(result.reason).toBe('all_completed_fallback');
  });

  it('excludes rounds without squads from candidates', () => {
    const result = getMostRelevantRound({
      rounds,
      allSquads: [{ round_id: 3, start_datetime: '2026-04-08T09:00:00' }],
      roundStatusData: {},
      now: new Date('2026-04-08T09:30:00'),
    });

    expect(result.orderedRoundIds).toEqual([3]);
    expect(result.roundId).toBe(3);
  });
});
