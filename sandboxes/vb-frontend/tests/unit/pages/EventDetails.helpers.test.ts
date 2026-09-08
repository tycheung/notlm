import { describe, expect, it } from 'vitest';

import {
  hasEventFlowStructure,
  hasEventOperationalProgress,
  normalizeLegacyEventTabSearchParams,
  normalizeRoundsTabSearchParams,
  resolveEventDetailsTab,
  shouldConfirmApplyEventFormat,
  shouldRedirectUnauthorizedEventDetailsTab,
  TabType,
} from '../../../src/pages/events/eventDetailsTabs';

describe('EventDetails helper logic', () => {
  it('treats locked-in rounds as operational progress', () => {
    const eventLike = {
      rounds: [
        {
          locked_in: true,
          status: 'scheduled',
          squads: [{ status: 'scheduled', start_lane: null, end_lane: null }],
        },
      ],
    } as any;
    expect(hasEventOperationalProgress(eventLike)).toBe(true);
  });

  it('treats in-progress rounds as operational progress', () => {
    const eventLike = {
      rounds: [{ locked_in: false, status: 'in_progress', squads: [] }],
    } as any;
    expect(hasEventOperationalProgress(eventLike)).toBe(true);
  });

  it('treats completed rounds as operational progress', () => {
    const eventLike = {
      rounds: [{ locked_in: false, status: 'completed', squads: [] }],
    } as any;
    expect(hasEventOperationalProgress(eventLike)).toBe(true);
  });

  it('treats squad-level in-progress status as operational progress', () => {
    const eventLike = {
      rounds: [
        {
          locked_in: false,
          status: 'scheduled',
          squads: [{ status: 'in_progress', start_lane: null, end_lane: null }],
        },
      ],
    } as any;
    expect(hasEventOperationalProgress(eventLike)).toBe(true);
  });

  it('treats squad-level completed status as operational progress', () => {
    const eventLike = {
      rounds: [
        {
          locked_in: false,
          status: 'scheduled',
          squads: [{ status: 'completed', start_lane: null, end_lane: null }],
        },
      ],
    } as any;
    expect(hasEventOperationalProgress(eventLike)).toBe(true);
  });

  it('treats lane assignment as operational progress', () => {
    const eventLike = {
      rounds: [
        {
          locked_in: false,
          status: 'scheduled',
          squads: [{ status: 'scheduled', start_lane: 1, end_lane: 2 }],
        },
      ],
    } as any;

    expect(hasEventOperationalProgress(eventLike)).toBe(true);
  });

  it('returns false when no progress artifacts exist', () => {
    const eventLike = {
      rounds: [
        {
          locked_in: false,
          status: 'scheduled',
          squads: [{ status: 'scheduled', start_lane: null, end_lane: null }],
        },
      ],
    } as any;

    expect(hasEventOperationalProgress(eventLike)).toBe(false);
  });

  it('detects flow structure from rounds or final nodes', () => {
    expect(hasEventFlowStructure({ rounds: [], final_nodes: [] } as any)).toBe(false);
    expect(hasEventFlowStructure({ rounds: [{ id: 1 }], final_nodes: [] } as any)).toBe(true);
    expect(hasEventFlowStructure({ rounds: [], final_nodes: [{ id: 1 }] } as any)).toBe(true);
  });

  it('requires format confirmation when structure or operational progress exists', () => {
    expect(
      shouldConfirmApplyEventFormat({
        rounds: [],
        final_nodes: [],
      } as any)
    ).toBe(false);
    expect(
      shouldConfirmApplyEventFormat({
        rounds: [{ id: 1, locked_in: false, status: 'scheduled', squads: [] }],
        final_nodes: [],
      } as any)
    ).toBe(true);
    expect(
      shouldConfirmApplyEventFormat({
        rounds: [{ locked_in: true, status: 'scheduled', squads: [] }],
        final_nodes: [],
      } as any)
    ).toBe(true);
  });

  it('normalizes legacy tab=rounds by removing tab param', () => {
    const current = new URLSearchParams('tab=rounds&foo=bar');
    const next = normalizeRoundsTabSearchParams('rounds', current);
    expect(next).toBeTruthy();
    expect(next?.get('tab')).toBeNull();
    expect(next?.get('foo')).toBe('bar');
  });

  it('does not normalize when tab is not rounds', () => {
    const current = new URLSearchParams('tab=participants');
    const next = normalizeRoundsTabSearchParams('participants', current);
    expect(next).toBeNull();
  });

  it('normalizes legacy tab=squads_games to tab=squads', () => {
    const current = new URLSearchParams('tab=squads_games&foo=bar');
    const next = normalizeLegacyEventTabSearchParams('squads_games', current);
    expect(next).toBeTruthy();
    expect(next?.get('tab')).toBe('squads');
    expect(next?.get('foo')).toBe('bar');
  });

  it('resolves legacy and current tab aliases consistently', () => {
    expect(resolveEventDetailsTab('squads_games')).toBe('squads');
    expect(resolveEventDetailsTab('squads')).toBe('squads');
    expect(resolveEventDetailsTab('lane_assignment')).toBe('lane_assignment');
    expect(resolveEventDetailsTab('game_scoring')).toBe('game_scoring');
    expect(resolveEventDetailsTab('participants')).toBe('participants');
    expect(resolveEventDetailsTab('standings')).toBe('standings');
    expect(resolveEventDetailsTab('unknown')).toBe('info');
    expect(resolveEventDetailsTab(null, { shellMode: 'saDesk' })).toBe('participants');
    expect(resolveEventDetailsTab('unknown', { shellMode: 'saDesk' })).toBe('participants');
  });

  it('does not redirect before event payload is ready', () => {
    expect(
      shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: false,
        activeTab: TabType.SQUADS,
        canParticipants: false,
        canSquads: false,
        canLanes: false,
        canGameScoring: false,
      })
    ).toBe(false);
  });

  it('redirects from squads tab when user lacks squads capability', () => {
    expect(
      shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: true,
        activeTab: TabType.SQUADS,
        canParticipants: true,
        canSquads: false,
        canLanes: true,
        canGameScoring: true,
      })
    ).toBe(true);
  });

  it('redirects from participants tab when user lacks participants capability', () => {
    expect(
      shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: true,
        activeTab: TabType.PARTICIPANTS,
        canParticipants: false,
        canSquads: true,
        canLanes: true,
        canGameScoring: true,
      })
    ).toBe(true);
  });

  it('redirects from format editor when not available', () => {
    expect(
      shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: true,
        activeTab: TabType.FORMAT_EDITOR,
        canParticipants: true,
        canSquads: true,
        canLanes: true,
        canGameScoring: true,
        canFormatEditor: false,
      })
    ).toBe(true);
  });

  it('redirects from standings tab when EVENT_INFO capability is missing', () => {
    expect(
      shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: true,
        activeTab: TabType.STANDINGS,
        canParticipants: true,
        canSquads: true,
        canLanes: true,
        canGameScoring: true,
        canStandings: false,
      })
    ).toBe(true);
  });

  it('does not redirect standings tab when EVENT_INFO capability is granted', () => {
    expect(
      shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: true,
        activeTab: TabType.STANDINGS,
        canParticipants: true,
        canSquads: true,
        canLanes: true,
        canGameScoring: true,
        canStandings: true,
      })
    ).toBe(false);
  });

  it('does not redirect info tab when caps are missing', () => {
    expect(
      shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: true,
        activeTab: TabType.INFO,
        canParticipants: false,
        canSquads: false,
        canLanes: false,
        canGameScoring: false,
      })
    ).toBe(false);
  });

  it('does not redirect lanes tab when lane capability is granted', () => {
    expect(
      shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: true,
        activeTab: TabType.LANE_ASSIGNMENT,
        canParticipants: true,
        canSquads: true,
        canLanes: true,
        canGameScoring: true,
      })
    ).toBe(false);
  });

  it('redirects lanes tab when lane capability is missing', () => {
    expect(
      shouldRedirectUnauthorizedEventDetailsTab({
        eventCompleteLoaded: true,
        activeTab: TabType.LANE_ASSIGNMENT,
        canParticipants: true,
        canSquads: true,
        canLanes: false,
        canGameScoring: true,
      })
    ).toBe(true);
  });
});
