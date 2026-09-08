import { describe, expect, it } from 'vitest';

import { splitBowlerHomeTournaments } from '@/pages/dashboard/bowlerHomeTournaments';
import type { TournamentRead } from '@/types/tournament';

function localDatePlus(days: number): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  const day = String(next.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T09:00:00`;
}

function tournament(
  partial: Partial<TournamentRead> & { id: number; name: string; is_organizer?: boolean }
): TournamentRead & { is_organizer?: boolean } {
  return {
    bowling_center_id: 1,
    location: 'Lanes',
    lanes_reserved: 8,
    is_active: true,
    ...partial,
  } as TournamentRead & { is_organizer?: boolean };
}

describe('splitBowlerHomeTournaments', () => {
  it('keeps only participant tournaments and splits upcoming from completed', () => {
    const { upcoming, completed } = splitBowlerHomeTournaments([
      tournament({
        id: 1,
        name: 'Catalog Open',
        is_organizer: true,
        start_date: localDatePlus(3),
        end_date: localDatePlus(4),
      }),
      tournament({
        id: 2,
        name: 'My Next',
        is_organizer: false,
        start_date: localDatePlus(5),
        end_date: localDatePlus(6),
      }),
      tournament({
        id: 3,
        name: 'My Later',
        is_organizer: false,
        start_date: localDatePlus(20),
        end_date: localDatePlus(21),
      }),
      tournament({
        id: 4,
        name: 'My Finished',
        is_organizer: false,
        start_date: localDatePlus(-10),
        end_date: localDatePlus(-8),
      }),
    ]);

    expect(upcoming.map((row) => row.name)).toEqual(['My Next', 'My Later']);
    expect(completed.map((row) => row.name)).toEqual(['My Finished']);
  });
});
