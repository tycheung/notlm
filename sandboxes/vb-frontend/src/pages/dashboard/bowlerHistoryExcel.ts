import { formatDateNaive } from '../../utils/dateUtils';
import { rowsToCsv } from '../../utils/excelCsv';
import {
  entryFeeDisplay,
  formatMoney,
  sideActionEnteredDisplay,
  teamSideActionEnteredDisplay,
  teamSideActionWonDisplay,
  type BowlerFinancialEvent,
} from './bowlerFinancialEvents';
import {
  formatHandicap,
  formatPinfall,
  formatPlace,
  gameScoreColumnNumbers,
  scoresForGameNumber,
  type BowlerBowledEvent,
} from './bowlerStatsEventGrid';

export function buildBowlerScoresExcelCsv(events: BowlerBowledEvent[]): string {
  const gameColumns = gameScoreColumnNumbers(events);
  const headers = [
    'Event',
    'Tournament',
    'Date',
    'Place',
    'Pinfall',
    'HCP',
    ...gameColumns.map((n) => `Game ${n}`),
  ];
  const rows = events.map((event) => [
    event.event_name,
    event.tournament_name,
    formatDateNaive(event.start_date),
    formatPlace(event.place),
    formatPinfall(event.pinfall),
    formatHandicap(event.handicap),
    ...gameColumns.map((n) => scoresForGameNumber(event, n)),
  ]);
  return rowsToCsv(headers, rows);
}

export function buildBowlerFinancialsExcelCsv(events: BowlerFinancialEvent[]): string {
  const headers = [
    'Event',
    'Tournament',
    'Date',
    'Entry fee',
    'Prize fund',
    'SA entered',
    'SA won',
    'Team SA entered',
    'Team SA won',
  ];
  const rows = events.map((row) => [
    row.event_name,
    row.tournament_name,
    formatDateNaive(row.start_date),
    entryFeeDisplay(row),
    formatMoney(row.prize_fund),
    sideActionEnteredDisplay(row),
    row.side_action_winnings > 0 ? formatMoney(row.side_action_winnings) : '—',
    teamSideActionEnteredDisplay(row),
    teamSideActionWonDisplay(row),
  ]);
  return rowsToCsv(headers, rows);
}
