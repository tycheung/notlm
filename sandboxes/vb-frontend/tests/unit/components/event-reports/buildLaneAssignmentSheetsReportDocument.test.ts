import { describe, expect, it } from 'vitest';
import { buildLaneAssignmentSheetsReportDocument } from '@/components/event-reports/buildLaneAssignmentSheetsReportDocument';
import type { LaneAssignmentSheetsReport } from '@/api/event-reports';

const report = (): LaneAssignmentSheetsReport => ({
  report_type: 'lane_assignment_sheets',
  tournament_id: 4,
  tournament_name: 'Victory Baker Test',
  event_id: 5,
  event_name: 'Victory Baker Event',
  event_format: 'teams',
  team_size: 5,
  round_id: 10,
  round_number: 1,
  game_count: 3,
  max_games_per_page: 12,
  squad_id: null,
  squad_name: null,
  position_round_game: 3,
  movement_label: 'League (USBC-style, 32 teams)',
  sheets: [
    {
      sheet_key: 'lanes:g1-3',
      title: 'Round 1 lane assignments',
      game_start: 1,
      game_end: 3,
      units: [
        {
          unit_key: 'team:1',
          title: 'Team Pinel',
          is_team: true,
          team_id: 1,
          home_lane_label: '1A',
          games: [
            { game_number: 1, lane_label: '1A' },
            { game_number: 2, lane_label: '24B' },
            { game_number: 3, lane_label: null, is_position_round: true },
          ],
        },
      ],
    },
  ],
});

describe('buildLaneAssignmentSheetsReportDocument', () => {
  it('renders team × games lane grid with home and position note', () => {
    const doc = buildLaneAssignmentSheetsReportDocument(report());
    expect(doc.title).toBe('Lane Assignments');
    expect(doc.html).toContain('Team Pinel');
    expect(doc.html).toContain('1A');
    expect(doc.html).toContain('24B');
    expect(doc.html).toContain('G1');
    expect(doc.html).toContain('G3*');
    expect(doc.html).toContain('position round');
    expect(doc.html).toContain('League (USBC-style, 32 teams)');
    expect(doc.html).toContain('la-grid');
  });
});
