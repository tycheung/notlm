import { describe, expect, it } from 'vitest';
import { buildScoreSheetsReportDocument } from '@/components/event-reports/buildScoreSheetsReportDocument';
import type { ScoreSheetsReport } from '@/api/event-reports';

const report = (): ScoreSheetsReport => ({
  report_type: 'score_sheets',
  tournament_id: 9,
  tournament_name: '2026 Liberty Open',
  event_id: 42,
  event_name: 'Team Event',
  event_format: 'teams',
  team_size: 4,
  round_id: 7,
  round_number: 1,
  game_count: 3,
  max_games_per_page: 8,
  squad_id: null,
  squad_name: null,
  layout: 'pair',
  include_individual_handicap: true,
  include_team_handicap: true,
  sheets: [
    {
      sheet_key: 'pair:19/20',
      title: 'Lanes 19/20',
      pair_label: '19/20',
      game_start: 1,
      game_end: 3,
      panels: [
        {
          panel_key: 'team:1',
          title: '1-Entry#1',
          is_team: true,
          team_id: 1,
          squad_name: '29',
          home_lane: 19,
          home_lane_label: '19',
          home_pair_label: '19/20',
          team_average: 803,
          team_handicap: 73,
          bowlers: [
            {
              display_name: 'Bronx Shaheed',
              qualifying_average: 199,
              handicap: 21,
              is_blank_row: false,
            },
            {
              display_name: 'Ada Bowler',
              qualifying_average: 180,
              handicap: 18,
              is_blank_row: false,
            },
          ],
          games: [
            { game_number: 1, lane_label: '19' },
            { game_number: 2, lane_label: '19' },
            { game_number: 3, lane_label: '20' },
          ],
        },
        {
          panel_key: 'team:3',
          title: '3-Entry#3',
          is_team: true,
          team_id: 3,
          squad_name: '29',
          home_lane: 20,
          home_lane_label: '20',
          home_pair_label: '19/20',
          team_average: 858,
          team_handicap: 40,
          bowlers: [
            {
              display_name: 'Bea Bowler',
              qualifying_average: 210,
              handicap: 10,
              is_blank_row: false,
            },
          ],
          games: [
            { game_number: 1, lane_label: '20' },
            { game_number: 2, lane_label: '20' },
            { game_number: 3, lane_label: '19' },
          ],
        },
      ],
    },
  ],
});

describe('buildScoreSheetsReportDocument', () => {
  it('renders landscape pair panels with game lanes and handicap columns', () => {
    const doc = buildScoreSheetsReportDocument(report());
    expect(doc.title).toBe('Score Sheets');
    expect(doc.html).toContain('Lanes 19/20');
    expect(doc.html).toContain('1-Entry#1');
    expect(doc.html).toContain('3-Entry#3');
    expect(doc.html).toContain('Bronx Shaheed');
    expect(doc.html).toContain('ss-g-num');
    expect(doc.html).toContain('ss-lane-row');
    expect(doc.html).toContain('ss-lane-cell');
    expect(doc.html).toContain('>19<');
    expect(doc.html).toContain('#c1121f');
    expect(doc.html).toContain('HDCP');
    expect(doc.html).not.toContain('H×');
    expect(doc.html).toContain('Handicap');
    expect(doc.html).toContain('HDCP Total');
    expect(doc.html).toContain('Approved:');
    expect(doc.html).toContain('ss-dual');
  });

  it('omits handicap columns when toggles are off', () => {
    const off = report();
    off.include_individual_handicap = false;
    off.include_team_handicap = false;
    const doc = buildScoreSheetsReportDocument(off);
    expect(doc.html).not.toContain('class="ss-hcp"');
    expect(doc.html).not.toContain('>Handicap<');
    expect(doc.html).not.toContain('>HDCP<');
  });

  it('renders RR vertical match-card columns for baker one-row games', () => {
    const rr: ScoreSheetsReport = {
      ...report(),
      layout: 'round_robin',
      is_baker: true,
      scores_per_game: 1,
      bonus_pins: { win: 30, tie: 15, loss: 0 },
      include_individual_handicap: false,
      include_team_handicap: false,
      sheets: [
        {
          sheet_key: 'team:1',
          title: 'Team Pinel',
          pair_label: null,
          game_start: 1,
          game_end: 3,
          panels: [
            {
              panel_key: 'team:1',
              title: 'Team Pinel',
              is_team: true,
              team_id: 1,
              squad_name: 'Qualifying',
              home_lane_label: '1A',
              bowlers: [],
              games: [
                { game_number: 1, lane_label: '1A' },
                { game_number: 2, lane_label: '8B' },
                { game_number: 3, lane_label: '3A' },
              ],
              match_rows: [
                {
                  game_number: 1,
                  is_game_start: true,
                  lane_label: '1A',
                  opponent_initials: 'AB',
                },
                {
                  game_number: 2,
                  is_game_start: true,
                  lane_label: '8B',
                  opponent_initials: 'CD',
                },
                {
                  game_number: 3,
                  is_game_start: true,
                  lane_label: '3A',
                  opponent_initials: 'EA',
                },
              ],
            },
          ],
        },
      ],
    };
    const doc = buildScoreSheetsReportDocument(rr);
    expect(doc.html).toContain('ss-rr-grid');
    expect(doc.html).toContain('Opponent Score');
    expect(doc.html).toContain('Bonus Pins');
    expect(doc.html).toContain('Total Score');
    expect(doc.html).toContain('+/-');
    expect(doc.html).toContain('Opponent Initials');
    expect(doc.html).toContain('Game 1');
    expect(doc.html).toContain('Lane 1A');
    expect(doc.html).toContain('Baker');
    expect(doc.html).toContain('ss-page-title-row');
    expect(doc.html).not.toContain('Bonus: Win 30');
    expect(doc.html).not.toContain('Games 1–3');
    expect(doc.html).not.toContain('ss-panel-title');
    expect(doc.html).not.toContain('>AB<');
    expect(doc.html).not.toContain('ss-lane-row');
    expect(doc.html).not.toContain('ss-dual');
  });
});
