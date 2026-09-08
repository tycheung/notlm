import { describe, expect, it } from 'vitest';
import { resolveFormatEditorEntrantCount } from '@/utils/formatEditorEntrantCount';

describe('formatEditorEntrantCount', () => {
  it('uses squad roster or pool count for bracket rounds instead of empty standings', () => {
    expect(
      resolveFormatEditorEntrantCount({
        isTeamEvent: false,
        isInitialRound: false,
        standingsParticipants: [],
        eventTeamsCount: 0,
        squadRosterParticipants: 0,
        squadRosterTeams: 0,
        poolCount: 48,
      })
    ).toBe(48);

    expect(
      resolveFormatEditorEntrantCount({
        isTeamEvent: false,
        isInitialRound: false,
        standingsParticipants: [],
        eventTeamsCount: 0,
        squadRosterParticipants: 48,
        squadRosterTeams: 0,
        poolCount: 48,
      })
    ).toBe(48);
  });

  it('prefers squad assignments over pool when both exist', () => {
    expect(
      resolveFormatEditorEntrantCount({
        isTeamEvent: false,
        isInitialRound: false,
        standingsParticipants: [],
        eventTeamsCount: 0,
        squadRosterParticipants: 40,
        squadRosterTeams: 0,
        poolCount: 48,
      })
    ).toBe(40);
  });
});
