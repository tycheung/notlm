import { describe, expect, it } from 'vitest';

import { TabType, buildEventDetailsTabItems } from '@/pages/events/eventDetailsTabs';

describe('EventDetails shell tabs', () => {
  it('hides capability-gated tabs when flags are false', () => {
    const tabs = buildEventDetailsTabItems({
      canParticipants: false,
      canSquads: false,
      canLanes: false,
      canGameScoring: false,
    });
    expect(tabs.map((t) => t.id)).toEqual([TabType.INFO, TabType.SIDE_ACTIONS]);
  });

  it('keeps gated tabs in the tab bar while director access is loading', () => {
    const tabs = buildEventDetailsTabItems({
      canParticipants: false,
      canSquads: false,
      canLanes: false,
      canGameScoring: false,
      accessPending: true,
    });
    expect(tabs.map((t) => t.id)).toEqual([
      TabType.INFO,
      TabType.PARTICIPANTS,
      TabType.SQUADS,
      TabType.LANE_ASSIGNMENT,
      TabType.GAME_SCORING,
      TabType.SIDE_ACTIONS,
    ]);
    expect(tabs.find((t) => t.id === TabType.PARTICIPANTS)?.disabled).toBe(true);
  });

  it('includes authorized director tabs including lane assignments', () => {
    const tabs = buildEventDetailsTabItems({
      canParticipants: true,
      canSquads: true,
      canLanes: true,
      canGameScoring: true,
    });
    expect(tabs.map((t) => t.label)).toContain('Game Scoring');
    expect(tabs.map((t) => t.label)).toContain('Participant Management');
    expect(tabs.map((t) => t.label)).toContain('Lane Assignments');
    expect(tabs.map((t) => t.label)).toContain('Side Action');
    expect(tabs.map((t) => t.id)).toContain(TabType.LANE_ASSIGNMENT);
  });

  it('always exposes side actions for directors with limited caps', () => {
    const tabs = buildEventDetailsTabItems({
      canParticipants: false,
      canSquads: true,
      canLanes: false,
      canGameScoring: false,
    });
    expect(tabs.map((t) => t.id)).toEqual([TabType.INFO, TabType.SQUADS, TabType.SIDE_ACTIONS]);
  });

  it('includes Format Editor when H2H formats are present and authorized', () => {
    const tabs = buildEventDetailsTabItems({
      canParticipants: true,
      canSquads: true,
      canLanes: true,
      canGameScoring: true,
      canFormatEditor: true,
    });
    expect(tabs.map((t) => t.label)).toContain('Format Editor');
    expect(tabs.map((t) => t.id)).toContain(TabType.FORMAT_EDITOR);
  });

  it('omits Format Editor when canFormatEditor is false', () => {
    const tabs = buildEventDetailsTabItems({
      canParticipants: true,
      canSquads: true,
      canLanes: true,
      canGameScoring: true,
      canFormatEditor: false,
    });
    expect(tabs.map((t) => t.id)).not.toContain(TabType.FORMAT_EDITOR);
  });

  it('includes Standings when canStandings is true', () => {
    const tabs = buildEventDetailsTabItems({
      canParticipants: true,
      canSquads: true,
      canLanes: true,
      canGameScoring: true,
      canStandings: true,
    });
    expect(tabs.map((t) => t.label)).toContain('Standings');
    expect(tabs.map((t) => t.id)).toContain(TabType.STANDINGS);
  });

  it('omits Standings when canStandings is false', () => {
    const tabs = buildEventDetailsTabItems({
      canParticipants: true,
      canSquads: true,
      canLanes: true,
      canGameScoring: true,
      canStandings: false,
    });
    expect(tabs.map((t) => t.id)).not.toContain(TabType.STANDINGS);
  });

  it('keeps roster scoring and side action without lanes format or standings', () => {
    const tabs = buildEventDetailsTabItems({
      canParticipants: true,
      canSquads: true,
      canLanes: false,
      canGameScoring: true,
      canFormatEditor: false,
      canStandings: false,
    });
    expect(tabs.map((t) => t.id)).toEqual([
      TabType.INFO,
      TabType.PARTICIPANTS,
      TabType.SQUADS,
      TabType.GAME_SCORING,
      TabType.SIDE_ACTIONS,
    ]);
  });
});
