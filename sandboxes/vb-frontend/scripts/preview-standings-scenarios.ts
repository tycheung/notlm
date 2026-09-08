/**
 * One-off preview generator for standings layout scenarios.
 * Run: npx tsx scripts/preview-standings-scenarios.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { EventStandingsGameScore, EventStandingsMemberResults, EventStandingsReport, EventStandingsRow } from '../src/api/event-reports';
import { buildEventStandingsReportDocument } from '../src/components/event-reports/buildEventStandingsReportDocument';

function makeGames(count: number, base = 180) {
  return Array.from({ length: count }, (_, i) => {
    const scratch = base + ((i * 7) % 40);
    const hcp = 18;
    return {
      game_number: i + 1,
      score_scratch: scratch,
      handicap_pins: hcp,
      score_handicap: scratch + hcp,
    };
  });
}


function makeMemberResults(bowlers: string[], gamesPerBowler: number, base = 170): EventStandingsMemberResults[] {
  return bowlers.map((name, idx) => ({
    display_name: name,
    games: Array.from({ length: gamesPerBowler }, (_, i) => {
      const scratch = base + idx * 6 + ((i * 9) % 37);
      const hcp = 18;
      return {
        game_number: i + 1,
        score_scratch: scratch,
        handicap_pins: hcp,
        score_handicap: scratch + hcp,
      } satisfies EventStandingsGameScore;
    }),
  }));
}

function teamRow(opts: {
  place: number;
  teamNumber: number;
  teamName: string;
  bowlers: string[];
  games: number;
  bonus?: number;
  prize?: number | null;
  memberResults?: EventStandingsMemberResults[];
}): EventStandingsRow {
  const games = makeGames(opts.games, 190 + opts.place);
  const scratch = games.reduce((s, g) => s + g.score_scratch, 0);
  const hcp = games.reduce((s, g) => s + g.handicap_pins, 0);
  const bonus = opts.bonus ?? 0;
  return {
    place: opts.place,
    place_label: `${opts.place}${opts.place === 1 ? 'st' : opts.place === 2 ? 'nd' : opts.place === 3 ? 'rd' : 'th'} Place`,
    score_scratch: scratch,
    bonus_pins: bonus,
    handicap_pins: hcp,
    score_handicap: scratch + hcp,
    sort_score: scratch + hcp + bonus,
    prize_amount: opts.prize ?? null,
    user_id: null,
    event_participant_id: null,
    display_name: opts.teamName,
    team_id: opts.teamNumber,
    team_number: opts.teamNumber,
    team_name: opts.teamName,
    is_team_row: true,
    bowlers: opts.bowlers.map((name, i) => ({
      user_id: opts.teamNumber * 10 + i,
      event_participant_id: opts.teamNumber * 100 + i,
      display_name: name,
    })),
    games,
    member_results: opts.memberResults,
    squad_ids: [1],
  };
}

const outDir = join(process.cwd(), 'tmp-standings-previews');
mkdirSync(outDir, { recursive: true });

const scenarios: Array<{
  file: string;
  title: string;
  report: EventStandingsReport;
  options: {
    showTeamNames: boolean;
    showBowlerNames: boolean;
    includeGameScores: boolean;
  };
}> = [
  {
    file: '01-team-5-bowlers-5-games.html',
    title: 'Team · 5 bowlers · names on · 5 games',
    options: {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
    },
    report: {
      report_type: 'event_standings',
      tournament_id: 1,
      tournament_name: 'Preview Tournament',
      scope: 'event',
      basis: 'final',
      round_number: null,
      include_prizes: false,
      include_handicap: true,
      sections: [
        {
          event_id: 1,
          event_name: 'Team Event — 5 players',
          event_format: 'teams',
          basis_label: 'Final (as of Round 1)',
          round_id: 1,
          round_number: 1,
          squad_id: null,
          squad_name: null,
          is_complete: false,
          includes_bonus: false,
          note: null,
          rows: [
            teamRow({
              place: 1,
              teamNumber: 1,
              teamName: 'Alley Cats',
              bowlers: [
                'Alex Rivera',
                'Blake Nguyen',
                'Casey Ortiz',
                'Dana Patel',
                'Evan Brooks',
              ],
              games: 5,
              memberResults: makeMemberResults([
                'Fran Lopez',
                'Gray Mitchell',
                'Harper Quinn',
                'Indie Shaw',
                'Jules Tran',
              ], 5),
            }),
            teamRow({
              place: 2,
              teamNumber: 2,
              teamName: 'Pin Crushers',
              bowlers: [
                'Fran Lopez',
                'Gray Mitchell',
                'Harper Quinn',
                'Indie Shaw',
                'Jules Tran',
              ],
              games: 5,
              memberResults: makeMemberResults([
                'Kai Morgan',
                'Lee Santos',
                'Morgan Ellis',
                'Noah Price',
                'Parker Reed',
              ], 5),
            }),
            teamRow({
              place: 3,
              teamNumber: 3,
              teamName: 'Spare Change',
              bowlers: [
                'Kai Morgan',
                'Lee Santos',
                'Morgan Ellis',
                'Noah Price',
                'Parker Reed',
              ],
              games: 5,
              memberResults: makeMemberResults([
                'Alex Rivera',
                'Blake Nguyen',
                'Casey Ortiz',
                'Dana Patel',
                'Evan Brooks',
              ], 5),
            }),
          ],
        },
      ],
    },
  },
  {
    file: '02-team-name-only-16-games-bonus.html',
    title: 'Team · name only · 16 games · bonus',
    options: {
      showTeamNames: true,
      showBowlerNames: false,
      includeGameScores: true,
    },
    report: {
      report_type: 'event_standings',
      tournament_id: 1,
      tournament_name: 'Preview Tournament',
      scope: 'event',
      basis: 'final',
      round_number: null,
      include_prizes: true,
      include_handicap: true,
      sections: [
        {
          event_id: 2,
          event_name: 'Team Event — 16 games + bonus',
          event_format: 'teams',
          basis_label: 'Final (as of Round 2)',
          round_id: 2,
          round_number: 2,
          squad_id: null,
          squad_name: null,
          is_complete: false,
          includes_bonus: true,
          note: null,
          rows: [
            teamRow({
              place: 1,
              teamNumber: 4,
              teamName: 'Strike Force',
              bowlers: ['A', 'B', 'C', 'D', 'E'],
              games: 16,
              bonus: 90,
              prize: 500,
            }),
            teamRow({
              place: 2,
              teamNumber: 5,
              teamName: 'Gutter Ball Gang',
              bowlers: ['F', 'G', 'H', 'I', 'J'],
              games: 16,
              bonus: 60,
              prize: 300,
            }),
            teamRow({
              place: 3,
              teamNumber: 6,
              teamName: 'Midnight Oilers',
              bowlers: ['K', 'L', 'M', 'N', 'O'],
              games: 16,
              bonus: 30,
              prize: 150,
            }),
          ],
        },
      ],
    },
  },
  {
    file: '03-doubles-both-names-6-games.html',
    title: 'Doubles · both names · 6 games',
    options: {
      showTeamNames: true,
      showBowlerNames: true,
      includeGameScores: true,
    },
    report: {
      report_type: 'event_standings',
      tournament_id: 1,
      tournament_name: 'Preview Tournament',
      scope: 'event',
      basis: 'final',
      round_number: null,
      include_prizes: false,
      include_handicap: true,
      sections: [
        {
          event_id: 3,
          event_name: 'Doubles Event',
          event_format: 'teams',
          basis_label: 'Final (as of Round 1)',
          round_id: 3,
          round_number: 1,
          squad_id: null,
          squad_name: null,
          is_complete: true,
          includes_bonus: false,
          note: null,
          rows: [
            teamRow({
              place: 1,
              teamNumber: 7,
              teamName: 'Rivera / Nguyen',
              bowlers: ['Alex Rivera', 'Blake Nguyen'],
              games: 6,
              memberResults: makeMemberResults(['Alex Rivera', 'Blake Nguyen'], 6),
            }),
            teamRow({
              place: 2,
              teamNumber: 8,
              teamName: 'Ortiz / Patel',
              bowlers: ['Casey Ortiz', 'Dana Patel'],
              games: 6,
              memberResults: makeMemberResults(['Alex Rivera', 'Blake Nguyen'], 6),
            }),
            teamRow({
              place: 3,
              teamNumber: 9,
              teamName: 'Brooks / Lopez',
              bowlers: ['Evan Brooks', 'Fran Lopez'],
              games: 6,
              memberResults: makeMemberResults(['Alex Rivera', 'Blake Nguyen'], 6),
            }),
            teamRow({
              place: 4,
              teamNumber: 10,
              teamName: 'Mitchell / Quinn',
              bowlers: ['Gray Mitchell', 'Harper Quinn'],
              games: 6,
              memberResults: makeMemberResults(['Alex Rivera', 'Blake Nguyen'], 6),
            }),
          ],
        },
      ],
    },
  },
];

const indexLinks: string[] = [];

for (const scenario of scenarios) {
  const doc = buildEventStandingsReportDocument(scenario.report, scenario.options);
  const path = join(outDir, scenario.file);
  writeFileSync(path, doc.html, 'utf8');
  indexLinks.push(
    `<li><a href="${scenario.file}">${scenario.title}</a> — ${scenario.file}</li>`
  );
  console.log(`Wrote ${path}`);
}

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Standings layout previews</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-size: 1.35rem; }
    li { margin: 0.6rem 0; }
    a { color: #1e3a5f; }
    p { color: #4b5563; }
  </style>
</head>
<body>
  <h1>Standings layout previews</h1>
  <p>Mock data through the real print builder. Open each link, then Print if you want a PDF check.</p>
  <ol>${indexLinks.join('')}</ol>
</body>
</html>`;

writeFileSync(join(outDir, 'index.html'), indexHtml, 'utf8');
console.log(`Index: ${pathToFileURL(join(outDir, 'index.html')).href}`);
