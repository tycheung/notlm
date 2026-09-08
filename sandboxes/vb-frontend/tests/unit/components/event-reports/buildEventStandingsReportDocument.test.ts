import { describe, expect, it } from 'vitest';

import type { EventStandingsReport } from '@/api/event-reports';
import { buildEventStandingsReportDocument } from '@/components/event-reports/buildEventStandingsReportDocument';

function makeGames(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    game_number: i + 1,
    score_scratch: 200 + i,
    handicap_pins: 20,
    score_handicap: 220 + i,
  }));
}

const singlesReport = (): EventStandingsReport => ({
  report_type: 'event_standings',
  tournament_id: 1,
  tournament_name: 'Open Classic',
  scope: 'event',
  basis: 'final',
  round_number: null,
  include_prizes: true,
  include_handicap: true,
  sections: [
    {
      event_id: 10,
      event_name: 'Singles Event',
      event_format: 'singles',
      basis_label: 'Final (as of Round 1)',
      round_id: 100,
      round_number: 1,
      squad_id: null,
      squad_name: null,
      is_complete: false,
      includes_bonus: false,
      note: null,
      rows: [
        {
          place: 1,
          place_label: '1st Place',
          score_scratch: 600,
          bonus_pins: 0,
          handicap_pins: 90,
          score_handicap: 690,
          sort_score: 690,
          prize_amount: 100,
          user_id: 1,
          event_participant_id: 11,
          display_name: 'Alex One',
          team_id: null,
          team_number: null,
          team_name: null,
          is_team_row: false,
          bowlers: [{ user_id: 1, event_participant_id: 11, display_name: 'Alex One' }],
          games: makeGames(3),
          squad_ids: [1],
        },
      ],
    },
  ],
});

describe('buildEventStandingsReportDocument', () => {
  it('keeps a short header without descriptive option chrome', () => {
    const doc = buildEventStandingsReportDocument(singlesReport(), {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
      showIndividualTeamScores: false,
    });
    expect(doc.html).toContain('Open Classic · Final');
    expect(doc.html).toContain('3 Games');
    expect(doc.html).not.toContain('Lane sheet layout');
    expect(doc.html).not.toContain('Games + totals');
    expect(doc.html).not.toContain('Prizes on');
    expect(doc.html).not.toContain('Sort by handicap');
    expect(doc.html).not.toContain('In progress');
    expect(doc.html).not.toContain('Scope:');
  });

  it('puts sort total beside place and left-packs Results scores', () => {
    const doc = buildEventStandingsReportDocument(singlesReport(), {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
      showIndividualTeamScores: false,
    });
    expect(doc.html).toContain('letter portrait');
    expect(doc.html).toContain('>Results<');
    expect(doc.html).toContain('justify-content: space-between');
    expect(doc.html).toContain('ls-score');
    expect(doc.html).toContain('200');
    expect(doc.html).toContain('Alex One');
    expect(doc.html).toContain('690');
    expect(doc.html).toContain('>Scr<');
    expect(doc.html).toContain('>HCP<');
    expect(doc.html).toContain('$100.00');
    expect(doc.html).not.toContain('>G1<');
    expect(doc.html).not.toContain('>Bonus<');
    expect(doc.html).not.toContain('--ls-n:');
  });

  it('splits Results onto a second line after 10 games', () => {
    const report = singlesReport();
    report.sections[0].rows[0].games = makeGames(11);
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
    });
    expect(doc.html.match(/ls-results-line/g)?.length).toBeGreaterThanOrEqual(2);
    expect(doc.html).toContain('210');
    expect(doc.html).toMatch(/grid-template-columns:\s*repeat\(10,/);
  });

  it('bolds Results scores that are match wins', () => {
    const report = singlesReport();
    report.sections[0].rows[0].games = [
      { game_number: 1, score_scratch: 220, handicap_pins: 0, score_handicap: 220, is_win: true },
      { game_number: 2, score_scratch: 180, handicap_pins: 0, score_handicap: 180, is_win: false },
      { game_number: 3, score_scratch: 200, handicap_pins: 0, score_handicap: 200 },
    ];
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
    });
    expect(doc.html).toContain('ls-score-win');
    expect(doc.html).toMatch(/ls-score-win[^>]*>220</);
    expect(doc.html).not.toMatch(/ls-score-win[^>]*>180</);
    expect(doc.html).toContain('.ls-score-win');
  });

  it('inserts Bonus between Scr and HCP when format includes bonus', () => {
    const report = singlesReport();
    report.sections[0].includes_bonus = true;
    report.sections[0].rows[0].bonus_pins = 30;
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: false,
      showIndividualTeamScores: false,
    });
    const html = doc.html;
    const scr = html.indexOf('>Scr<');
    const bonus = html.indexOf('>Bonus<');
    const hcp = html.indexOf('>HCP<');
    const totalWithBonus = html.indexOf('>T+B<');
    expect(scr).toBeGreaterThan(-1);
    expect(bonus).toBeGreaterThan(scr);
    expect(hcp).toBeGreaterThan(bonus);
    expect(totalWithBonus).toBeGreaterThan(hcp);
    expect(html).toContain('30');
    expect(html).toContain('630');
  });

  it('stacks team bowlers and marks team rows', () => {
    const report = singlesReport();
    report.sections[0].event_format = 'teams';
    report.sections[0].event_name = 'Team Event';
    report.sections[0].rows[0] = {
      ...report.sections[0].rows[0],
      is_team_row: true,
      display_name: 'Alley Cats',
      team_id: 5,
      team_number: 5,
      team_name: 'Alley Cats',
      games: makeGames(9),
      bowlers: [
        { user_id: 1, event_participant_id: 11, display_name: 'Alex One' },
        { user_id: 2, event_participant_id: 12, display_name: 'Blake Two' },
        { user_id: 3, event_participant_id: 13, display_name: 'Casey Three' },
        { user_id: 4, event_participant_id: 14, display_name: 'Dana Four' },
        { user_id: 5, event_participant_id: 15, display_name: 'Evan Five' },
      ],
    };
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
    });
    expect(doc.html).toContain('Alley Cats');
    expect(doc.html).toContain('ls-team-row');
    expect(doc.html).toContain('Alex One');
    expect(doc.html).toContain('Evan Five');
    expect(doc.html).not.toContain('Alex One, Blake Two');
  });


  it('renders bold team names and per-bowler member results when provided', () => {
    const report = singlesReport();
    report.sections[0].event_format = 'teams';
    report.sections[0].rows[0] = {
      ...report.sections[0].rows[0],
      is_team_row: true,
      display_name: 'Alley Cats',
      team_id: 5,
      team_number: 5,
      team_name: 'Alley Cats',
      bowlers: [
        { user_id: 1, event_participant_id: 11, display_name: 'Alex One' },
        { user_id: 2, event_participant_id: 12, display_name: 'Blake Two' },
      ],
      member_results: [
        { display_name: 'Alex One', games: makeGames(6) },
        { display_name: 'Blake Two', games: makeGames(6).map((g) => ({ ...g, score_scratch: g.score_scratch + 5, score_handicap: g.score_handicap + 5 })) },
      ],
    };
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
      showIndividualTeamScores: true,
    });
    expect(doc.html).toContain('ls-team-name');
    expect(doc.html).toContain('ls-member-results');
    expect(doc.html).toContain('ls-member-label');
    expect(doc.html).toContain('Alex One');
    expect(doc.html).toContain('Blake Two');
  });

  it('omits Results when game scores are off', () => {
    const doc = buildEventStandingsReportDocument(singlesReport(), {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: false,
      showIndividualTeamScores: false,
    });
    expect(doc.html).not.toContain('>Results<');
    expect(doc.html).toContain('690');
  });

  it('falls back to team aggregate results when individual team scores are off', () => {
    const report = singlesReport();
    report.sections[0].event_format = 'teams';
    report.sections[0].rows[0] = {
      ...report.sections[0].rows[0],
      is_team_row: true,
      display_name: 'Alley Cats',
      team_id: 5,
      team_number: 5,
      team_name: 'Alley Cats',
      bowlers: [
        { user_id: 1, event_participant_id: 11, display_name: 'Alex One' },
        { user_id: 2, event_participant_id: 12, display_name: 'Blake Two' },
      ],
      member_results: [
        { display_name: 'Alex One', games: makeGames(3) },
        { display_name: 'Blake Two', games: makeGames(3) },
      ],
    };
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
      showIndividualTeamScores: false,
    });
    expect(doc.html).not.toContain('<span class="ls-member-label">Alex One</span>');
  });

  it('skips member result lines for baker sections even when individual scores are on', () => {
    const report = singlesReport();
    report.sections[0].event_format = 'teams';
    report.sections[0].is_baker = true;
    report.sections[0].rows[0] = {
      ...report.sections[0].rows[0],
      is_team_row: true,
      display_name: 'Alley Cats',
      team_id: 5,
      team_number: 5,
      team_name: 'Alley Cats',
      games: makeGames(3),
      member_results: [
        { display_name: 'Alex One', games: makeGames(3) },
        { display_name: 'Blake Two', games: makeGames(3) },
      ],
    };
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
      showIndividualTeamScores: true,
    });
    expect(doc.html).not.toContain('class="ls-member-results"');
    expect(doc.html).not.toContain('class="ls-member-label"');
    expect(doc.html).toContain('ls-results-line');
  });

  it('renders pod group headers and Advance within each pod', () => {
    const report = singlesReport();
    report.include_prizes = false;
    report.sections[0] = {
      ...report.sections[0],
      layout: 'pods',
      rows: [
        {
          place: 1,
          place_label: '1st Place',
          score_scratch: 321,
          handicap_pins: 0,
          score_handicap: 321,
          sort_score: 321,
          display_name: 'Joe',
          is_team_row: false,
          bowlers: [],
          squad_ids: [1],
          pod_index: 0,
          pod_label: 'Pod 1',
          standing_status: 'advance',
          standing_status_label: 'Advance',
        },
        {
          place: 3,
          place_label: '3rd Place',
          score_scratch: 200,
          handicap_pins: 0,
          score_handicap: 200,
          sort_score: 200,
          display_name: 'Pat',
          is_team_row: false,
          bowlers: [],
          squad_ids: [1],
          pod_index: 0,
          pod_label: 'Pod 1',
        },
        {
          place: 1,
          place_label: '1st Place',
          score_scratch: 280,
          handicap_pins: 0,
          score_handicap: 280,
          sort_score: 280,
          display_name: 'Sam',
          is_team_row: false,
          bowlers: [],
          squad_ids: [1],
          pod_index: 1,
          pod_label: 'Pod 2',
          standing_status: 'advance',
          standing_status_label: 'Advance',
        },
      ],
    };
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: false,
    });
    expect(doc.html).toContain('ls-pod-header');
    expect(doc.html).toContain('Pod 1');
    expect(doc.html).toContain('Pod 2');
    expect(doc.html).toContain('ls-advance');
  });

  it('renders stepladder climb then feeder board with Advance status', () => {
    const report = singlesReport();
    report.sections[0] = {
      ...report.sections[0],
      event_format: 'teams',
      event_name: 'Victory Baker Event',
      layout: 'stepladder_final',
      basis_label: 'Final',
      feeder_basis_label: 'Round 1 standings',
      includes_bonus: true,
      is_baker: true,
      stepladder: {
        title: 'Stepladder',
        champion_name: 'Team Carter',
        champion_prize: 5000,
        matches: [
          {
            match_series_id: 1,
            match_label: 'Ladder Match 1',
            display_order: 0,
            status: 'complete',
            winner_side: 0,
            sides: [
              {
                side: 0,
                display_name: 'Team Hawley',
                team_id: 3,
                seed: 5,
                qualifying_score: 7400,
                game_scores: [226, 242],
                match_total: 468,
                is_winner: true,
                is_tbd: false,
              },
              {
                side: 1,
                display_name: 'Team Gaither',
                team_id: 8,
                seed: 4,
                qualifying_score: 7500,
                game_scores: [203, 200],
                match_total: 403,
                is_winner: false,
                is_tbd: false,
                place: 5,
                prize_amount: 1000,
              },
            ],
          },
        ],
      },
      rows: [
        {
          place: 1,
          place_label: 'Advance',
          standing_status: 'advance',
          standing_status_label: 'Advance',
          score_scratch: 7000,
          bonus_pins: 200,
          handicap_pins: 0,
          score_handicap: 7000,
          sort_score: 7200,
          prize_amount: null,
          display_name: 'Team Carter',
          team_id: 32,
          team_number: 1,
          team_name: 'Team Carter',
          is_team_row: true,
          bowlers: [],
          games: [],
          squad_ids: [],
        },
        {
          place: 6,
          place_label: '6th Place',
          standing_status: 'prize',
          standing_status_label: '6th',
          score_scratch: 6500,
          bonus_pins: 100,
          handicap_pins: 0,
          score_handicap: 6500,
          sort_score: 6600,
          prize_amount: 500,
          display_name: 'Team Nichols',
          team_id: 40,
          team_number: 6,
          team_name: 'Team Nichols',
          is_team_row: true,
          bowlers: [],
          games: [],
          squad_ids: [],
        },
      ],
    };

    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: false,
      includeGameScores: false,
    });
    expect(doc.html).toContain('Final · Stepladder');
    expect(doc.html).toContain('Ladder Match 1');
    expect(doc.html).toContain('#5');
    expect(doc.html).toContain('Qual 7400');
    expect(doc.html).toContain('468');
    expect(doc.html).toContain('$1000.00');
    expect(doc.html).toContain('sl-prize');
    expect(doc.html).toContain('5th');
    expect(doc.html).toContain('Champion:');
    expect(doc.html).toContain('Team Carter');
    expect(doc.html).toContain('Round 1 standings');
    expect(doc.html).toContain('ls-advance');
    expect(doc.html).toContain('Advance');
    expect(doc.html).toContain('Team Nichols');
    expect(doc.html).toContain('$500.00');
  });

  it('draws a cut/cash line after the last paying place', () => {
    const report = singlesReport();
    report.show_cut_line = true;
    report.sections[0].rows = [
      { ...report.sections[0].rows[0], place: 1, prize_amount: 100 },
      {
        ...report.sections[0].rows[0],
        place: 2,
        place_label: '2nd Place',
        prize_amount: 50,
        display_name: 'Blair Two',
        event_participant_id: 12,
      },
      {
        ...report.sections[0].rows[0],
        place: 3,
        place_label: '3rd Place',
        prize_amount: null,
        display_name: 'Casey Three',
        event_participant_id: 13,
      },
    ];
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: false,
    });
    expect(doc.html).toContain('ls-cut-line');
    expect(doc.html).toMatch(/Blair Two[\s\S]*ls-cut-line|ls-cut-line[\s\S]*Blair Two/);
  });

  it('titles single-game payloads as Game Results with game number', () => {
    const report = singlesReport();
    report.report_type = 'single_game';
    report.basis = 'round';
    report.round_number = 1;
    report.game_number = 2;
    report.include_prizes = false;
    const doc = buildEventStandingsReportDocument(report, {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: false,
    });
    expect(doc.html).toContain('Game Results');
    expect(doc.html).toContain('Game 2');
    expect(doc.title).toBe('Game Results');
  });
});
