import { describe, it, expect } from 'vitest';
import { gameRowKeyForMerge } from '../../../src/hooks/useGameChanges';
import type { GameRead } from '../../../src/types/game';

/** Mirror merge logic in useGameChanges (kept in sync for unit testing). */
function mergeSquadAndRoundGames(
  fromSquads: GameRead[],
  fromRound: GameRead[] | undefined
): GameRead[] {
  if (!fromRound || fromRound.length === 0) {
    return fromSquads;
  }
  if (fromSquads.length === 0) {
    return fromRound;
  }
  const map = new Map<string, GameRead>();
  for (const g of fromSquads) {
    map.set(gameRowKeyForMerge(g), g);
  }
  for (const g of fromRound) {
    const k = gameRowKeyForMerge(g);
    if (!map.has(k)) {
      map.set(k, g);
    }
  }
  return Array.from(map.values());
}

describe('useGameChanges game merge (bracket / match-play)', () => {
  it('includes round-fetched match-play games when squad_id is null', () => {
    const squad: GameRead[] = [
      {
        id: 1,
        game_number: 1,
        squad_id: 10,
        event_participant_id: 1,
        score: 100,
        round_id: 7,
      } as GameRead,
    ];
    const round: GameRead[] = [
      {
        id: 2,
        game_number: 1,
        squad_id: null,
        event_participant_id: 2,
        score: 200,
        match_series_id: 106,
        match_game_index: 1,
        round_id: 7,
      } as GameRead,
    ];
    const merged = mergeSquadAndRoundGames(squad, round);
    const byId = new Map(merged.map((g) => [g.id, g]));
    expect(byId.get(1)?.score).toBe(100);
    expect(byId.get(2)?.squad_id).toBeNull();
    expect(byId.get(2)?.match_series_id).toBe(106);
    expect(merged).toHaveLength(2);
  });

  it('dedupes the same game id from squad and round fetches', () => {
    const g: GameRead = {
      id: 5,
      game_number: 1,
      squad_id: 10,
      score: 150,
      round_id: 3,
    } as GameRead;
    const merged = mergeSquadAndRoundGames([g], [{ ...g, score: 200 } as GameRead]);
    expect(merged).toHaveLength(1);
    expect(merged[0].score).toBe(150);
  });

  it('gameRowKeyForMerge uses id when present', () => {
    expect(
      gameRowKeyForMerge({ id: 42, match_series_id: 1 } as GameRead)
    ).toBe('id:42');
  });
});
