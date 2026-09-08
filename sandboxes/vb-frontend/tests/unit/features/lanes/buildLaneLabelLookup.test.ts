import { describe, expect, it } from 'vitest';
import { buildLaneLabelLookup, resolveLaneLabelForGame } from '@/features/lanes/buildLaneLabelLookup';

describe('buildLaneLabelLookup', () => {
  it('maps squad participant and game number to lane labels', () => {
    const lookup = buildLaneLabelLookup([
      {
        event_participant_id: 1,
        squad_participant_id: 10,
        squad_id: 2,
        game_number: 1,
        assigned_lane: 3,
        lane_label: '3A',
        display_name: 'Pat',
      },
    ]);
    expect(resolveLaneLabelForGame(lookup, 10, 1)).toBe('3A');
    expect(resolveLaneLabelForGame(lookup, 10, 2)).toBeNull();
  });
});
