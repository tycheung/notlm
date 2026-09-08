import type {
  EventStandingsGameScore,
  EventStandingsReport,
  EventStandingsRow,
  EventStandingsSection,
  StepladderStandingsBlock,
} from '../../api/event-reports';
import { reportSuggestedFilename } from '../../utils/sideActionReportPrint';
import { rowsToCsv } from '../../utils/excelCsv';
import type { EventStandingsPrintOptions } from './buildEventStandingsReportDocument';
import {
  bowlersList,
  standingsIdentityPlainText,
} from './standingsIdentity';

function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '';
  const n = Number(value);
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

function sortedGames(games: EventStandingsGameScore[] | undefined): EventStandingsGameScore[] {
  return [...(games || [])].sort(
    (a, b) => Number(a.game_number) - Number(b.game_number)
  );
}

function maxGameNumber(report: EventStandingsReport): number {
  let max = 0;
  for (const section of report.sections || []) {
    for (const row of section.rows || []) {
      for (const g of row.games || []) {
        if (g.game_number > max) max = g.game_number;
      }
      for (const member of row.member_results || []) {
        for (const g of member.games || []) {
          if (g.game_number > max) max = g.game_number;
        }
      }
    }
    for (const match of section.stepladder?.matches || []) {
      for (const side of match.sides || []) {
        const n = (side.game_scores || []).length;
        if (n > max) max = n;
      }
    }
  }
  return max;
}

function gameCell(games: EventStandingsGameScore[] | undefined, gameNumber: number): string {
  const match = sortedGames(games).find((g) => g.game_number === gameNumber);
  if (!match) return '';
  const score = formatScore(match.score_scratch);
  if (match.dylg_dropped) return `${score} (dropped)`;
  return score;
}

function standingStatus(row: EventStandingsRow): string {
  return (row.standing_status_label || row.standing_status || '').trim();
}

export function standingsExcelFilename(report: EventStandingsReport): string {
  const eventName =
    report.scope === 'tournament'
      ? 'tournament'
      : report.sections?.[0]?.event_name || 'event';
  const basis = report.basis === 'round' && report.round_number
    ? `round_${report.round_number}`
    : 'standings';
  return `${reportSuggestedFilename(report.tournament_name, eventName, basis)}.csv`;
}

export function buildStandingsExcelCsv(
  report: EventStandingsReport,
  options: EventStandingsPrintOptions
): string {
  const gameCount = options.includeGameScores ? maxGameNumber(report) : 0;
  const headers = [
    'Tournament',
    'Event',
    'Format',
    'Basis',
    'Round',
    'Squad',
    'Row type',
    'Place',
    'Place label',
    'Name',
    'Team',
    'Bowlers',
    'Scratch',
    'Bonus',
    'Handicap',
    'Total',
    'Prize',
    'Status',
    'Cut line',
    'Match',
    'Side',
    'Seed',
    'Winner',
    ...Array.from({ length: gameCount }, (_, i) => `Game ${i + 1}`),
  ];

  const rows: Array<Array<string | number | boolean | null | undefined>> = [];
  for (const section of report.sections || []) {
    const cutAfter =
      report.show_cut_line && section.cut_line_after_index != null
        ? section.cut_line_after_index
        : null;
    (section.rows || []).forEach((row, rowIndex) => {
      rows.push(
        standingRowCells(report, section, row, options, gameCount, {
          rowType: row.is_team_row ? 'team' : 'standing',
          cutLine: cutAfter === rowIndex,
        })
      );
      if (options.showIndividualTeamScores && (row.member_results || []).length) {
        for (const member of row.member_results || []) {
          const memberRow: EventStandingsRow = {
            ...row,
            display_name: member.display_name,
            is_team_row: false,
            games: member.games,
            member_results: [],
            bowlers: [{ display_name: member.display_name }],
          };
          rows.push(
            standingRowCells(report, section, memberRow, options, gameCount, {
              rowType: 'member',
              cutLine: false,
              nameOverride: member.display_name,
            })
          );
        }
      }
    });
    appendStepladderRows(rows, report, section, section.stepladder, gameCount);
  }

  return rowsToCsv(headers, rows);
}

function standingRowCells(
  report: EventStandingsReport,
  section: EventStandingsSection,
  row: EventStandingsRow,
  options: EventStandingsPrintOptions,
  gameCount: number,
  extra: { rowType: string; cutLine: boolean; nameOverride?: string }
): Array<string | number | boolean | null | undefined> {
  const games = row.games;
  const scratch =
    extra.rowType === 'member'
      ? sortedGames(games).reduce((sum, g) => sum + Number(g.score_scratch || 0), 0)
      : row.score_scratch;
  const handicap =
    extra.rowType === 'member'
      ? sortedGames(games).reduce((sum, g) => sum + Number(g.handicap_pins || 0), 0)
      : row.handicap_pins ?? Number(row.score_handicap) - Number(row.score_scratch);
  const total =
    extra.rowType === 'member' ? scratch + handicap : row.score_handicap;
  return [
    report.tournament_name,
    section.event_name,
    section.event_format,
    section.basis_label || report.basis,
    section.round_number ?? '',
    section.squad_name || '',
    extra.rowType,
    row.place,
    row.place_label || '',
    extra.nameOverride ?? standingsIdentityPlainText(row, section, options),
    row.team_name || (row.team_number != null ? `Team ${row.team_number}` : ''),
    extra.rowType === 'member' ? extra.nameOverride || '' : bowlersList(row),
    formatScore(scratch),
    extra.rowType === 'member' ? '' : formatScore(row.bonus_pins ?? 0),
    formatScore(handicap),
    formatScore(total),
    row.prize_amount == null ? '' : row.prize_amount,
    standingStatus(row),
    extra.cutLine ? 'Yes' : '',
    '',
    '',
    '',
    '',
    ...Array.from({ length: gameCount }, (_, i) => gameCell(games, i + 1)),
  ];
}

function appendStepladderRows(
  rows: Array<Array<string | number | boolean | null | undefined>>,
  report: EventStandingsReport,
  section: EventStandingsSection,
  block: StepladderStandingsBlock | null | undefined,
  gameCount: number
): void {
  if (!block) return;
  for (const match of block.matches || []) {
    for (const side of match.sides || []) {
      const scores = side.game_scores || [];
      rows.push([
        report.tournament_name,
        section.event_name,
        section.event_format,
        section.basis_label || report.basis,
        section.round_number ?? '',
        section.squad_name || '',
        'stepladder',
        side.place ?? '',
        '',
        side.display_name || '',
        '',
        '',
        formatScore(side.match_total ?? side.qualifying_score),
        '',
        '',
        formatScore(side.match_total ?? null),
        side.prize_amount == null ? '' : side.prize_amount,
        match.status || '',
        '',
        match.match_label || '',
        side.side,
        side.seed ?? '',
        side.is_winner ? 'Yes' : side.is_tbd ? 'TBD' : '',
        ...Array.from({ length: gameCount }, (_, i) =>
          scores[i] == null ? '' : formatScore(scores[i])
        ),
      ]);
    }
  }
}
