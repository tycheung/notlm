import { describe, expect, it } from 'vitest';
import {
  allowIndividualTeamScoresForRounds,
  isBakerOnlyStandingsRounds,
  isBakerStandingsRound,
} from '@/utils/standingsIndividualScores';

describe('standingsIndividualScores', () => {
  it('detects baker from game_style or competition_method_config', () => {
    expect(isBakerStandingsRound({ game_style: 'baker' })).toBe(true);
    expect(
      isBakerStandingsRound({
        competition_method_config: { game_style: 'baker' },
      })
    ).toBe(true);
    expect(
      isBakerStandingsRound({
        competition_method_config: { game_style: 'standard' },
      })
    ).toBe(false);
  });

  it('treats all-baker rounds as baker-only and blocks individual scores', () => {
    const rounds = [
      { competition_method_config: { game_style: 'baker' } },
      { game_style: 'baker' },
    ];
    expect(isBakerOnlyStandingsRounds(rounds)).toBe(true);
    expect(allowIndividualTeamScoresForRounds(rounds)).toBe(false);
  });

  it('allows individual scores when any round is non-baker', () => {
    const rounds = [
      { competition_method_config: { game_style: 'baker' } },
      { competition_method_config: { game_style: 'standard' } },
    ];
    expect(isBakerOnlyStandingsRounds(rounds)).toBe(false);
    expect(allowIndividualTeamScoresForRounds(rounds)).toBe(true);
  });

  it('does not treat an empty round list as baker-only', () => {
    expect(isBakerOnlyStandingsRounds([])).toBe(false);
    expect(allowIndividualTeamScoresForRounds([])).toBe(true);
  });
});
