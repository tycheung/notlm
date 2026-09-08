import { describe, expect, it } from 'vitest';

import { splitOwnedTournamentsForHome } from '@/pages/tournament_director/tdHomeOwnedSplit';
import type { TournamentRead } from '@/types/tournament';

function localDatePlus(days: number): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T09:00:00`;
}

function tournament(partial: Partial<TournamentRead> & { id: number; name: string }): TournamentRead {
  return {
    bowling_center_id: 1,
    location: 'Lanes',
    lanes_reserved: 8,
    is_active: true,
    ...partial,
  } as TournamentRead;
}

describe('splitOwnedTournamentsForHome', () => {
  it('keeps live and upcoming in the main list and caps recent finished at 3', () => {
    const { liveOrUpcoming, recentFinished } = splitOwnedTournamentsForHome([
      tournament({
        id: 1,
        name: 'Live',
        start_date: localDatePlus(-1),
        end_date: localDatePlus(2),
      }),
      tournament({
        id: 2,
        name: 'Oldest finished',
        start_date: localDatePlus(-40),
        end_date: localDatePlus(-38),
      }),
      tournament({
        id: 3,
        name: 'Mid finished',
        start_date: localDatePlus(-20),
        end_date: localDatePlus(-18),
      }),
      tournament({
        id: 4,
        name: 'Newest finished',
        start_date: localDatePlus(-8),
        end_date: localDatePlus(-6),
      }),
      tournament({
        id: 5,
        name: 'Also finished',
        start_date: localDatePlus(-14),
        end_date: localDatePlus(-12),
      }),
    ]);

    expect(liveOrUpcoming.map((row) => row.name)).toEqual(['Live']);
    expect(recentFinished.map((row) => row.name)).toEqual([
      'Newest finished',
      'Also finished',
      'Mid finished',
    ]);
  });
});
