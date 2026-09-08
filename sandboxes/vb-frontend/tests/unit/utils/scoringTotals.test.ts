import { describe, it, expect } from 'vitest';
import {
  buildHandicapEventSettings,
  calculateHandicapPinsPerGame,
  calculateTotalScore,
  computeGameHandicapValues,
  computeSeriesTotals,
  computeTeamSeriesTotalsFromMembers,
  normalizeAverage,
  resolveParticipantHandicapPins,
  sumMemberScratchForTeamGame,
} from '../../../src/utils/scoringTotals';

const base200_90 = buildHandicapEventSettings(200, 90, true)!;
const base223_90 = buildHandicapEventSettings(223, 90, true)!;

describe('scoringTotals', () => {
  it('calculateTotalScore mirrors backend utils.scoring', () => {
    expect(calculateTotalScore(200, 15)).toBe(215);
    expect(calculateTotalScore(200, null)).toBe(200);
    expect(calculateTotalScore(null, 10)).toBeNull();
  });

  it('normalizeAverage coerces string roster values', () => {
    expect(normalizeAverage('180.0')).toBe(180);
    expect(normalizeAverage('')).toBeNull();
  });

  it('calculateHandicapPinsPerGame uses event base and percentage', () => {
    expect(calculateHandicapPinsPerGame(180, base200_90)).toBe(18);
    expect(calculateHandicapPinsPerGame(200, base200_90)).toBe(0);
    expect(calculateHandicapPinsPerGame(null, base200_90)).toBe(0);
    expect(buildHandicapEventSettings(200, 0, true)).toBeNull();
  });

  it('resolveParticipantHandicapPins mirrors backend precedence', () => {
    expect(resolveParticipantHandicapPins(25, 180, base200_90)).toBe(25);
    expect(resolveParticipantHandicapPins(0, 180, base200_90)).toBe(0);
    expect(resolveParticipantHandicapPins(null, 180, base200_90)).toBe(18);
    expect(resolveParticipantHandicapPins(undefined, 180, null)).toBe(0);
  });

  it('matches tournament sample (base 223, 90%)', () => {
    expect(calculateHandicapPinsPerGame(180, base223_90)).toBe(38);
    expect(calculateHandicapPinsPerGame(226, base223_90)).toBe(0);
    expect(calculateHandicapPinsPerGame(202, base223_90)).toBe(18);
    expect(calculateHandicapPinsPerGame(214, base223_90)).toBe(8);
  });

  it('computeSeriesTotals derives handicap from qualifying average only', () => {
    const games = [
      { id: 1, game_number: 1, score: 192 },
      { id: 2, game_number: 2, score: 160 },
      { id: 3, game_number: 3, score: 181 },
      { id: 4, game_number: 4, score: 256 },
    ];
    const totals = computeSeriesTotals(games, {
      gameNumbers: [1, 2, 3, 4],
      qualifyingAverage: 180,
      handicapSettings: base223_90,
      getMergeForGame: (game) => ({ gameId: game?.id }),
    });
    expect(totals.handicapTotal).toBe(152);
    expect(totals.totalScratch).toBe(789);
    expect(totals.totalWithHandicap).toBe(941);
  });

  it('computeSeriesTotals honors manual participant handicap override', () => {
    const games = [
      { id: 1, game_number: 1, score: 200 },
      { id: 2, game_number: 2, score: 180 },
    ];
    const totals = computeSeriesTotals(games, {
      gameNumbers: [1, 2],
      qualifyingAverage: 180,
      participantHandicap: 25,
      handicapSettings: base200_90,
      getMergeForGame: (game) => ({ gameId: game?.id }),
    });
    expect(totals.handicapTotal).toBe(50);
    expect(totals.totalWithHandicap).toBe(430);
  });

  it('computeSeriesTotals honors participant handicap of 0 (force scratch)', () => {
    const games = [{ id: 1, game_number: 1, score: 200 }];
    const totals = computeSeriesTotals(games, {
      gameNumbers: [1],
      qualifyingAverage: 180,
      participantHandicap: 0,
      handicapSettings: base200_90,
      getMergeForGame: (game) => ({ gameId: game?.id }),
    });
    expect(totals.handicapTotal).toBe(0);
    expect(totals.totalWithHandicap).toBe(200);
  });

  it('ignores legacy game.handicap on the game record', () => {
    const game = { id: 1, game_number: 1, score: 200, handicap: 99, total_score: 299 };
    const { handicapPins, totalWithHandicap } = computeGameHandicapValues(
      game,
      { gameId: 1 },
      { qualifyingAverage: 180, handicapSettings: base223_90 }
    );
    expect(handicapPins).toBe(38);
    expect(totalWithHandicap).toBe(238);
  });

  it('computeGameHandicapValues uses participantHandicap over formula', () => {
    const { handicapPins, totalWithHandicap } = computeGameHandicapValues(
      { score: 200 },
      { gameId: 1 },
      {
        qualifyingAverage: 180,
        participantHandicap: 12,
        handicapSettings: base200_90,
      }
    );
    expect(handicapPins).toBe(12);
    expect(totalWithHandicap).toBe(212);
  });

  it('returns zero handicap when event settings are not provided', () => {
    const games = [{ id: 1, game_number: 1, score: 200 }];
    const totals = computeSeriesTotals(games, {
      gameNumbers: [1],
      getMergeForGame: (game) => ({ gameId: game?.id }),
    });
    expect(totals.handicapTotal).toBe(0);
    expect(totals.totalWithHandicap).toBe(200);
  });

  it('team handicap totals sum member qual-avg pins per game', () => {
    const memberA = {
      games: [
        { id: 1, game_number: 1, score: 254 },
        { id: 2, game_number: 2, score: 189 },
        { id: 3, game_number: 3, score: 216 },
        { id: 4, game_number: 4, score: 244 },
      ],
      qualifyingAverage: 226,
      handicapSettings: base223_90,
      getMergeForGame: () => undefined,
    };
    const memberB = {
      games: [
        { id: 5, game_number: 1, score: 192 },
        { id: 6, game_number: 2, score: 160 },
        { id: 7, game_number: 3, score: 181 },
        { id: 8, game_number: 4, score: 256 },
      ],
      qualifyingAverage: 180,
      handicapSettings: base223_90,
      getMergeForGame: () => undefined,
    };
    const memberC = {
      games: [
        { id: 9, game_number: 1, score: 182 },
        { id: 10, game_number: 2, score: 211 },
        { id: 11, game_number: 3, score: 216 },
        { id: 12, game_number: 4, score: 215 },
      ],
      qualifyingAverage: 215,
      handicapSettings: base223_90,
      getMergeForGame: () => undefined,
    };

    const totals = computeTeamSeriesTotalsFromMembers(
      [memberA, memberB, memberC],
      [1, 2, 3, 4]
    );
    expect(totals.totalScratch).toBe(2516);
    expect(totals.handicapTotal).toBe(152 + 7 * 4);
    expect(totals.totalWithHandicap).toBe(2696);
    expect(totals.gamesScored).toBe(4);
  });

  it('sumMemberScratchForTeamGame includes pending scratch', () => {
    const pending = new Map<number | string, number>();
    pending.set(2, 195);

    const members = [
      {
        games: [{ id: 1, game_number: 1, score: 200 }],
        getMergeForGame: (_game: unknown, gameNum: number) =>
          gameNum === 1
            ? { gameId: 1 }
            : {
                gameId: 2,
                getPendingGameValue: (id: number | string) =>
                  id === 2 ? pending.get(id) : undefined,
              },
      },
      {
        games: [{ id: 3, game_number: 1, score: 180 }],
        getMergeForGame: () => ({ gameId: 3 }),
      },
    ];

    expect(sumMemberScratchForTeamGame(members, 1)).toBe(380);
    expect(sumMemberScratchForTeamGame(members, 2)).toBe(195);
  });
});
